import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";
import { registerWebhook } from "@/lib/whatsapp/register-webhook";

const GRAPH = "https://graph.facebook.com/v19.0";

export async function POST(req: NextRequest) {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });
  if (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await req.json() as { code: string; phoneNumberId?: string; wabaId?: string };
  const { code } = body;
  let { phoneNumberId, wabaId } = body;

  if (!code) {
    return Response.json({ error: "Missing required field: code" }, { status: 400 });
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    return Response.json({ error: "Facebook app not configured on server." }, { status: 500 });
  }

  // 1. Exchange code for short-lived token
  const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl.toString());
  const tokenData = await tokenRes.json() as { access_token?: string; error?: { message: string } };
  console.log("[WA] token exchange:", JSON.stringify(tokenData));

  if (!tokenRes.ok || !tokenData.access_token) {
    const msg = tokenData.error?.message ?? "Failed to exchange authorization code.";
    return Response.json({ error: msg }, { status: 502 });
  }

  const shortLivedToken = tokenData.access_token;

  // 2. Exchange short-lived token for long-lived token (60 days)
  const llUrl = new URL(`${GRAPH}/oauth/access_token`);
  llUrl.searchParams.set("grant_type", "fb_exchange_token");
  llUrl.searchParams.set("client_id", appId);
  llUrl.searchParams.set("client_secret", appSecret);
  llUrl.searchParams.set("fb_exchange_token", shortLivedToken);

  const llRes = await fetch(llUrl.toString());
  const llData = await llRes.json() as { access_token?: string; error?: { message: string } };
  console.log("[WA] long-lived token exchange:", JSON.stringify({ ok: llRes.ok, hasToken: !!llData.access_token }));

  const accessToken = llData.access_token ?? shortLivedToken;

  // 2b. If client didn't provide WABA/phone (FINISH event never fired), discover via debug_token
  if (!wabaId || !phoneNumberId) {
    console.log("[WA] no wabaId/phoneNumberId from client — using debug_token to discover");

    const debugUrl = new URL(`${GRAPH}/debug_token`);
    debugUrl.searchParams.set("input_token", accessToken);
    debugUrl.searchParams.set("access_token", `${appId}|${appSecret}`);
    const debugRes = await fetch(debugUrl.toString());
    const debugData = await debugRes.json() as {
      data?: { granular_scopes?: { scope: string; target_ids?: string[] }[] };
      error?: { message: string };
    };
    console.log("[WA] debug_token:", JSON.stringify(debugData));

    const wabaIds = debugData.data?.granular_scopes
      ?.find((s) => s.scope === "whatsapp_business_management")
      ?.target_ids ?? [];

    if (!wabaIds.length) {
      return Response.json({ error: "No WhatsApp Business Account found. Make sure you selected one during setup." }, { status: 400 });
    }
    wabaId = wabaIds[0];

    if (!phoneNumberId) {
      const phonesRes = await fetch(`${GRAPH}/${wabaId}/phone_numbers?access_token=${accessToken}`);
      const phonesData = await phonesRes.json() as { data?: { id: string }[]; error?: { message: string } };
      console.log("[WA] phone_numbers:", JSON.stringify(phonesData));

      const firstPhone = phonesData.data?.[0]?.id;
      if (!firstPhone) {
        return Response.json({ error: "No phone numbers found in your WhatsApp Business Account." }, { status: 400 });
      }
      phoneNumberId = firstPhone;
    }
  }

  // 3. Subscribe app to WABA
  const subWabaRes = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const subWabaData = await subWabaRes.json();
  console.log("[WA] subscribed_apps:", JSON.stringify(subWabaData));

  // 4. Register the phone number
  const registerRes = await fetch(`${GRAPH}/${phoneNumberId}/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", pin: "000000" }),
  });
  const registerData = await registerRes.json() as { error?: { message: string } };
  console.log("[WA] register phone:", JSON.stringify(registerData));

  if (!registerRes.ok && registerData.error) {
    return Response.json({ error: registerData.error.message }, { status: 502 });
  }

  // 5. Register webhook
  try {
    await registerWebhook({ wabaId, accessToken });
  } catch (err) {
    console.error("[WA] registerWebhook failed:", err);
  }

  // 6. Persist to DB
  await db
    .from("Tenant")
    .update({
      whatsappPhoneNumberId: phoneNumberId,
      whatsappAccessToken: accessToken,
    })
    .eq("id", dbUser.tenantId);

  return Response.json({ phoneNumberId, wabaId });
}
