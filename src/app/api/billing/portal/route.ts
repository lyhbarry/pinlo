import { requireAuth } from "@/lib/session";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const dbUser = await requireAuth();
  if (!dbUser?.tenant.stripeCustomerId) {
    return new Response("No billing account found", { status: 404 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: dbUser.tenant.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
  });

  return Response.json({ url: session.url });
}
