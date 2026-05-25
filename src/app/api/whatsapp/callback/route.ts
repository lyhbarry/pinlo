import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";
import { META_GRAPH_BASE_URL as GRAPH } from "@/lib/meta";
import { registerWebhook } from "@/lib/whatsapp/register-webhook";

export async function POST(req: NextRequest) {
  console.log("[WA] callback hit");
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });
  if (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await req.json() as {
    code: string;
    phoneNumberId?: string;
    wabaId?: string;
    redirectUri?: string;
  };
  const { code, redirectUri = "" } = body;
  let { phoneNumberId, wabaId } = body;

  if (!code) {
    return Response.json({ error: "Missing required field: code" }, { status: 400 });
  }

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID?.trim();
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();

  console.log("[WA] env | appId:", appId, "| secretLen:", appSecret?.length, "| secretStart:", appSecret?.slice(0, 6));

  if (!appId || !appSecret) {
    return Response.json({ error: "Facebook app not configured on server." }, { status: 500 });
  }

  // 1. Exchange code for short-lived token
  // redirect_uri must exactly match the XD Arbiter URL the FB SDK used in the popup
  console.log("[WA] exchanging code | redirectUri:", redirectUri.slice(0, 80));
  const tokenBody: Record<string, string> = { client_id: appId, client_secret: appSecret, code };
  if (redirectUri) tokenBody.redirect_uri = redirectUri;

  const tokenRes = await fetch(`${GRAPH}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(tokenBody),
  });
  const tokenData = await tokenRes.json() as { access_token?: string; error?: { message: string } };
  console.log("[WA] token exchange:", JSON.stringify(tokenData));

  if (!tokenRes.ok || !tokenData.access_token) {
    const msg = tokenData.error?.message ?? "Failed to exchange authorization code.";
    return Response.json({ error: `Token exchange failed: ${msg}`, detail: tokenData }, { status: 502 });
  }

  const shortLivedToken = tokenData.access_token;

  // 2. Exchange short-lived token for long-lived token (60 days)
  const llRes = await fetch(`${GRAPH}/oauth/access_token?` + new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  }));
  const llData = await llRes.json() as { access_token?: string; error?: { message: string } };
  console.log("[WA] long-lived token:", JSON.stringify({ ok: llRes.ok, hasToken: !!llData.access_token }));

  const accessToken = llData.access_token ?? shortLivedToken;

  // 3. Discover WABA and phone number if not provided by client
  if (!wabaId || !phoneNumberId) {
    console.log("[WA] discovering WABA via debug_token");

    const debugRes = await fetch(`${GRAPH}/debug_token?` + new URLSearchParams({
      input_token: accessToken,
      access_token: `${appId}|${appSecret}`,
    }));
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

  // 4. Subscribe app to WABA
  const subRes = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log("[WA] subscribed_apps:", JSON.stringify(await subRes.json()));

  // 6. Register webhook
  try {
    await registerWebhook({ wabaId, accessToken });
  } catch (err) {
    console.error("[WA] registerWebhook failed:", err);
  }

  // 7. Persist to DB
  await db
    .from("Tenant")
    .update({ whatsappPhoneNumberId: phoneNumberId, whatsappAccessToken: accessToken })
    .eq("id", dbUser.tenantId);

  return Response.json({ phoneNumberId, wabaId });
}
