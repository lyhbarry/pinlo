import { db } from "@/lib/db";
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
  const { data } = await db
    .from("Tenant")
    .select("stripeSubscriptionStatus")
    .eq("id", tenantId)
    .single();
  return getPlanId((data as { stripeSubscriptionStatus: string | null } | null)?.stripeSubscriptionStatus);
}

export function getRemainingTrialDays(trialEndsAt: Date | string | null | undefined): number {
  if (!trialEndsAt) return 0;
  const date = typeof trialEndsAt === "string" ? new Date(trialEndsAt) : trialEndsAt;
  const ms = date.getTime() - Date.now();
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
  key: LimitCheckKey,
  knownPlan?: PlanId
): Promise<LimitCheckResult> {
  const plan = knownPlan ?? await getTenantPlan(tenantId);
  const limits = getPlanLimits(plan);
  const limit = limits[key as keyof PlanLimits] as number;

  if (limit === Infinity) return { allowed: true, current: 0, limit: Infinity };

  let current = 0;

  switch (key) {
    case "maxContacts": {
      const { count } = await db
        .from("Contact")
        .select("*", { count: "exact", head: true })
        .eq("tenantId", tenantId);
      current = count ?? 0;
      break;
    }
    case "monthlyMessageLimit": {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { data: convs } = await db
        .from("Conversation")
        .select("id")
        .eq("tenantId", tenantId);
      const convIds = (convs ?? []).map((c: { id: string }) => c.id);
      if (convIds.length === 0) { current = 0; break; }
      const { count } = await db
        .from("Message")
        .select("*", { count: "exact", head: true })
        .eq("direction", "OUTBOUND")
        .gte("timestamp", startOfMonth.toISOString())
        .in("conversationId", convIds);
      current = count ?? 0;
      break;
    }
    case "maxQuickReplies": {
      const { count } = await db
        .from("QuickReply")
        .select("*", { count: "exact", head: true })
        .eq("tenantId", tenantId);
      current = count ?? 0;
      break;
    }
    case "maxUsers": {
      const { count } = await db
        .from("User")
        .select("*", { count: "exact", head: true })
        .eq("tenantId", tenantId);
      current = count ?? 0;
      break;
    }
  }

  return { allowed: current < limit, current, limit };
}
