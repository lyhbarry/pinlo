const GRAPH = "https://graph.facebook.com/v19.0";

export async function registerWebhook({
  wabaId,
  accessToken,
}: {
  wabaId: string;
  accessToken: string;
}): Promise<void> {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;
  const appToken = `${appId}|${appSecret}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN!;

  // Subscribe the WABA to the app
  const subRes = await fetch(`${GRAPH}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const subData = await subRes.json();
  console.log("[WA] subscribed_apps:", JSON.stringify(subData));

  // Register the webhook on the app
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
  const webhookData = await webhookRes.json();
  console.log("[WA] app subscriptions:", JSON.stringify(webhookData));
}
