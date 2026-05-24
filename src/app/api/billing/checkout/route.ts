import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/session";
import { stripe } from "@/lib/stripe";
import { PRICING } from "@/lib/config/plans";

export async function POST(req: NextRequest) {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const { tenant } = dbUser;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const body = await req.json().catch(() => ({}));
  const interval: "monthly" | "annual" = body.interval === "annual" ? "annual" : "monthly";
  const priceId = process.env[PRICING[interval].priceEnvKey];
  if (!priceId) return new Response("Price not configured", { status: 500 });

  const isFirstSubscription = !tenant.stripeCustomerId;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ...(tenant.stripeCustomerId
        ? { customer: tenant.stripeCustomerId }
        : { customer_email: dbUser.email }),
      line_items: [{ price: priceId, quantity: 1 }],
      ...(isFirstSubscription && {
        subscription_data: { trial_period_days: 14 },
      }),
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/billing`,
      metadata: {
        tenantId: tenant.id,
        userId: dbUser.id,
      },
    });

    return Response.json({ url: session.url });
  } catch (e: unknown) {
    const err = e as { message?: string; statusCode?: number };
    console.error("[checkout] Stripe error:", err.message);
    return Response.json({ error: err.message }, { status: err.statusCode ?? 500 });
  }
}
