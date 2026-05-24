import { type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import type Stripe from "stripe";

async function syncSubscription(tenantId: string, sub: Stripe.Subscription) {
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;

  await db
    .from("Tenant")
    .update({ stripeSubscriptionStatus: sub.status, stripeTrialEndsAt: trialEnd })
    .eq("id", tenantId);

  const { data: owner } = await db
    .from("User")
    .select("id")
    .eq("tenantId", tenantId)
    .eq("role", "OWNER")
    .single();

  if (owner) {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById((owner as { id: string }).id, {
      user_metadata: { subscription_status: sub.status },
    });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { tenantId, userId } = session.metadata ?? {};
      if (!tenantId || !userId) break;

      const subscriptionId = session.subscription as string;
      const customerId = session.customer as string;

      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;

      await db
        .from("Tenant")
        .update({
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          stripeSubscriptionStatus: sub.status,
          stripeTrialEndsAt: trialEnd,
        })
        .eq("id", tenantId);

      const admin = createAdminClient();
      await admin.auth.admin.updateUserById(userId, {
        user_metadata: { subscription_status: sub.status },
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: tenant } = await db
        .from("Tenant")
        .select("id")
        .eq("stripeSubscriptionId", sub.id)
        .single();
      if (!tenant) break;
      await syncSubscription((tenant as { id: string }).id, sub);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: tenant } = await db
        .from("Tenant")
        .select("id")
        .eq("stripeSubscriptionId", sub.id)
        .single();
      if (!tenant) break;
      await syncSubscription((tenant as { id: string }).id, sub);
      break;
    }
  }

  return new Response("OK", { status: 200 });
}
