import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const ACTIVE_STATUSES = ["active", "trialing"] as const;

export function isSubscriptionActive(status: string | null | undefined) {
  return ACTIVE_STATUSES.includes(status as typeof ACTIVE_STATUSES[number]);
}
