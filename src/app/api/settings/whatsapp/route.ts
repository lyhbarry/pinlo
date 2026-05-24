import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });
  if (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const { code } = await req.json();
  if (!code) return new Response("Bad Request", { status: 400 });

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    return Response.json({ error: "Facebook app not configured on server." }, { status: 500 });
  }

  // 1. Exchange code for access token
  const tokenUrl = new URL("https://graph.facebook.com/v19.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl.toString());
  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    console.error("[whatsapp] token exchange failed:", JSON.stringify(err));
    return Response.json({ error: "Failed to exchange authorization code." }, { status: 502 });
  }

  const { access_token: accessToken } = await tokenRes.json() as { access_token: string };

  // 2. Use debug_token to find the WABA IDs granted to this token
  const debugUrl = new URL("https://graph.facebook.com/debug_token");
  debugUrl.searchParams.set("input_token", accessToken);
  debugUrl.searchParams.set("access_token", `${appId}|${appSecret}`);

  const debugRes = await fetch(debugUrl.toString());
  const debugData = await debugRes.json() as {
    data?: { granular_scopes?: { scope: string; target_ids?: string[] }[] };
  };
  console.log("[whatsapp] debug_token:", JSON.stringify(debugData));

  const wabaIds: string[] =
    debugData.data?.granular_scopes
      ?.find((s) => s.scope === "whatsapp_business_management")
      ?.target_ids ?? [];

  if (!wabaIds.length) {
    return Response.json({ error: "No WhatsApp Business Account found. Make sure you selected one during setup." }, { status: 400 });
  }

  // 3. Get phone numbers from the first WABA
  const phonesRes = await fetch(
    `https://graph.facebook.com/v19.0/${wabaIds[0]}/phone_numbers?access_token=${accessToken}`
  );
  const phonesData = await phonesRes.json() as { data?: { id: string }[] };
  console.log("[whatsapp] phone_numbers:", JSON.stringify(phonesData));

  const phoneNumberId = phonesData.data?.[0]?.id;
  if (!phoneNumberId) {
    return Response.json({ error: "No phone numbers found in your WhatsApp Business Account." }, { status: 400 });
  }

  await db
    .from("Tenant")
    .update({ whatsappPhoneNumberId: phoneNumberId, whatsappAccessToken: accessToken })
    .eq("id", dbUser.tenantId);

  return Response.json({ phoneNumberId });
}

export async function PATCH(req: NextRequest) {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });
  if (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const { phoneNumberId, accessToken } = await req.json();

  await db
    .from("Tenant")
    .update({
      whatsappPhoneNumberId: phoneNumberId?.trim() || null,
      whatsappAccessToken: accessToken?.trim() || null,
    })
    .eq("id", dbUser.tenantId);

  return new Response("OK", { status: 200 });
}
