import { prisma } from "@/lib/prisma/client";
import { PLANS, type PlanId, type PlanLimits } from "@/lib/config/plans";

export function getPlanId(stripeSubscriptionStatus: string | null | undefined): PlanId {
  return stripeSubscriptionStatus === "active" || stripeSubscriptionStatus === "trialing"
    ? "pro"
    : "free";
}

export function getPlanLimits(plan: PlanId): typeof PLANS[PlanId] {
  return PLANS[plan];
}

export async function getTenantPlan(tenantId: string): Promise<PlanId> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { stripeSubscriptionStatus: true },
  });
  return getPlanId(tenant?.stripeSubscriptionStatus);
}

export function getRemainingTrialDays(trialEndsAt: Date | null | undefined): number {
  if (!trialEndsAt) return 0;
  const ms = trialEndsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

type LimitCheckKey =
  | "maxContacts"
  | "monthlyMessageLimit"
  | "maxQuickReplies"
  | "maxUsers";

type LimitCheckResult = { allowed: boolean; current: number; limit: number };

export async function checkLimit(
  tenantId: string,
  key: LimitCheckKey
): Promise<LimitCheckResult> {
  const plan = await getTenantPlan(tenantId);
  const limits = getPlanLimits(plan);
  const limit = limits[key as keyof PlanLimits] as number;

  if (limit === Infinity) return { allowed: true, current: 0, limit: Infinity };

  let current = 0;

  switch (key) {
    case "maxContacts": {
      current = await prisma.contact.count({ where: { tenantId } });
      break;
    }
    case "monthlyMessageLimit": {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      current = await prisma.message.count({
        where: {
          direction: "OUTBOUND",
          timestamp: { gte: startOfMonth },
          conversation: { tenantId },
        },
      });
      break;
    }
    case "maxQuickReplies": {
      current = await prisma.quickReply.count({ where: { tenantId } });
      break;
    }
    case "maxUsers": {
      current = await prisma.user.count({ where: { tenantId } });
      break;
    }
  }

  return { allowed: current < limit, current, limit };
}
