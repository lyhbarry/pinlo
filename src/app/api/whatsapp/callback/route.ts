import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";
import { META_GRAPH_BASE_URL as GRAPH } from "@/lib/meta";
import { registerWebhook } from "@/lib/whatsapp/register-webhook";

export type PhoneOption = {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName: string;
};

export async function POST(req: NextRequest) {
  console.log("[WA] callback hit");
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });
  if (dbUser.role !== "OWNER" && dbUser.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await req.json() as {
    code?: string;
    accessToken?: string;
    phoneNumberId?: string;
    wabaId?: string;
    redirectUri?: string;
  };
  const { code, redirectUri = "", accessToken: bodyAccessToken } = body;
  let { phoneNumberId, wabaId } = body;

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID?.trim();
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();

  if (!appId || !appSecret) {
    return Response.json({ error: "Facebook app not configured on server." }, { status: 500 });
  }

  let accessToken: string;

  if (bodyAccessToken) {
    // Second step: user selected a phone number, skip token exchange
    accessToken = bodyAccessToken;
  } else {
    if (!code) {
      return Response.json({ error: "Missing required field: code" }, { status: 400 });
    }

    console.log("[WA] env | appId:", appId, "| secretLen:", appSecret?.length);
    console.log("[WA] exchanging code | redirectUri:", redirectUri.slice(0, 80));

    // 1. Exchange code for short-lived token
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

    accessToken = llData.access_token ?? shortLivedToken;
  }

  // 3. Discover WABA and phone number if not provided
  if (!wabaId || !phoneNumberId) {
    console.log("[WA] discovering WABAs via debug_token");

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

    // Collect all phone numbers across all WABAs
    const options: PhoneOption[] = [];
    for (const wId of wabaIds) {
      const phonesRes = await fetch(
        `${GRAPH}/${wId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${accessToken}`
      );
      const phonesData = await phonesRes.json() as {
        data?: { id: string; display_phone_number?: string; verified_name?: string }[];
      };
      console.log("[WA] phone_numbers for", wId, ":", JSON.stringify(phonesData));
      for (const p of phonesData.data ?? []) {
        options.push({
          wabaId: wId,
          phoneNumberId: p.id,
          displayPhoneNumber: p.display_phone_number ?? p.id,
          verifiedName: p.verified_name ?? "",
        });
      }
    }

    if (options.length === 0) {
      return Response.json({ error: "No phone numbers found in your WhatsApp Business Account." }, { status: 400 });
    }

    // More than one option — ask the client to pick
    if (options.length > 1) {
      console.log("[WA] multiple options, returning for selection:", options.length);
      return Response.json({ needsSelection: true, options, accessToken });
    }

    wabaId = options[0].wabaId;
    phoneNumberId = options[0].phoneNumberId;
  }

  // 4. Subscribe app to WABA
  const subRes = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log("[WA] subscribed_apps:", JSON.stringify(await subRes.json()));

  // 5. Register webhook
  try {
    await registerWebhook({ wabaId, accessToken });
  } catch (err) {
    console.error("[WA] registerWebhook failed:", err);
  }

  // 6. Persist to DB
  await db
    .from("Tenant")
    .update({ whatsappPhoneNumberId: phoneNumberId, whatsappAccessToken: accessToken })
    .eq("id", dbUser.tenantId);

  return Response.json({ phoneNumberId, wabaId });
}
