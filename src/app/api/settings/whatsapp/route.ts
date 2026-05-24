import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });
  if (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const { code, phoneNumberId } = await req.json();
  if (!code || !phoneNumberId) return new Response("Bad Request", { status: 400 });

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    return Response.json({ error: "Facebook app not configured on server." }, { status: 500 });
  }

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

  await db
    .from("Tenant")
    .update({
      whatsappPhoneNumberId: phoneNumberId,
      whatsappAccessToken: accessToken,
    })
    .eq("id", dbUser.tenantId);

  return new Response("OK", { status: 200 });
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
