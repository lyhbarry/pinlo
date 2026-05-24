import { requireAuth } from "@/lib/session";
import { stripe } from "@/lib/stripe";

export async function GET() {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  let currentPeriodEnd: string | null = null;
  let price: { amount: number; currency: string; interval: string } | null = null;

  if (dbUser.tenant.stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(dbUser.tenant.stripeSubscriptionId, {
        expand: ["items.data.price"],
      });
      const periodEnd = (sub as unknown as { current_period_end: number }).current_period_end;
      currentPeriodEnd = new Date(periodEnd * 1000).toISOString();

      const item = sub.items.data[0];
      if (item?.price) {
        price = {
          amount: item.price.unit_amount ?? 0,
          currency: item.price.currency,
          interval: item.price.recurring?.interval ?? "month",
        };
      }
    } catch {
      // subscription may have been deleted
    }
  }

  return Response.json({
    status: dbUser.tenant.stripeSubscriptionStatus,
    currentPeriodEnd,
    price,
  });
}
