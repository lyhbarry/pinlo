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

  const { code, phoneNumberId, wabaId } = await req.json() as {
    code: string;
    phoneNumberId: string;
    wabaId: string;
  };

  if (!code || !phoneNumberId || !wabaId) {
    return Response.json({ error: "Missing required fields: code, phoneNumberId, wabaId" }, { status: 400 });
  }

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appId || !appSecret || !appUrl) {
    return Response.json({ error: "Meta app not configured on server." }, { status: 500 });
  }

  // 1. Exchange code for short-lived token
  const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", appId);
  tokenUrl.searchParams.set("client_secret", appSecret);
  tokenUrl.searchParams.set("code", code);
  tokenUrl.searchParams.set("redirect_uri", `${appUrl}/api/whatsapp/callback`);

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
