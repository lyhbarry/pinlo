import { META_GRAPH_BASE_URL as GRAPH } from "@/lib/meta";

export async function registerWebhook({
  wabaId,
  accessToken,
}: {
  wabaId: string;
  accessToken: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;
  const appToken = `${appId}|${appSecret}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    return { ok: false, error: "WHATSAPP_VERIFY_TOKEN is not set" };
  }
  if (!appUrl) {
    return { ok: false, error: "NEXT_PUBLIC_APP_URL is not set" };
  }

  // Subscribe the WABA to the app
  const subRes = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const subData = await subRes.json();
  console.log("[WA] subscribed_apps:", JSON.stringify(subData));

  if (!subRes.ok) {
    const msg = (subData as { error?: { message?: string } }).error?.message ?? "subscribed_apps failed";
    return { ok: false, error: msg };
  }

  // Register/update the webhook on the app (triggers immediate GET verification by Meta)
  const webhookRes = await fetch(`${GRAPH}/${appId}/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      object: "whatsapp_business_account",
      callback_url: `${appUrl}/api/webhooks/whatsapp`,
      verify_token: verifyToken,
      fields: "messages",
      access_token: appToken,
    }),
  });
  const webhookData = await webhookRes.json() as { success?: boolean; error?: { message?: string } };
  console.log("[WA] app subscriptions:", JSON.stringify(webhookData));

  if (!webhookRes.ok || webhookData.success === false) {
    const msg = webhookData.error?.message ?? "Webhook subscription failed";
    return { ok: false, error: msg };
  }

  return { ok: true };
}
