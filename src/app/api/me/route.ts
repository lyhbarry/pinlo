import { requireAuth } from "@/lib/session";
import { getPlanId, getRemainingTrialDays } from "@/lib/plan";

export async function GET() {
  const dbUser = await requireAuth();
  if (!dbUser) return new Response("Unauthorized", { status: 401 });

  const plan = getPlanId(dbUser.tenant.stripeSubscriptionStatus);
  const trialDaysLeft = getRemainingTrialDays(dbUser.tenant.stripeTrialEndsAt);

  return Response.json({
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    plan,
    trialDaysLeft,
    tenant: {
      id: dbUser.tenant.id,
      name: dbUser.tenant.name,
      slug: dbUser.tenant.slug,
      template: dbUser.tenant.template,
      whatsappPhoneNumberId: dbUser.tenant.whatsappPhoneNumberId,
      stripeCustomerId: dbUser.tenant.stripeCustomerId,
      stripeSubscriptionStatus: dbUser.tenant.stripeSubscriptionStatus,
    },
  });
}
