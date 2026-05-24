import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { tenant: true },
  });
  if (!dbUser?.tenant.stripeCustomerId) {
    return new Response("No billing account found", { status: 404 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: dbUser.tenant.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
  });

  return Response.json({ url: session.url });
}
