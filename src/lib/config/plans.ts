export type PlanId = "free" | "pro";

export type PlanLimits = {
  maxContacts: number;
  maxUsers: number;
  maxQuickReplies: number;
  maxActiveReminders: number;
  canUseTemplates: string[];
  canCustomisePipeline: boolean;
  canViewAnalytics: boolean;
  canSendMessages: boolean;
  monthlyMessageLimit: number;
};

export const PLANS: Record<PlanId, { name: string } & PlanLimits> = {
  free: {
    name: "Free",
    maxContacts: 50,
    maxUsers: 1,
    maxQuickReplies: Infinity,
    maxActiveReminders: 5,
    canUseTemplates: ["generic_crm", "property_agent", "retail_fnb", "contractor_trades"],
    canCustomisePipeline: false,
    canViewAnalytics: false,
    canSendMessages: true,
    monthlyMessageLimit: 100,
  },
  pro: {
    name: "Pro",
    maxContacts: Infinity,
    maxUsers: 5,
    maxQuickReplies: Infinity,
    maxActiveReminders: Infinity,
    canUseTemplates: ["generic_crm", "property_agent", "retail_fnb", "contractor_trades"],
    canCustomisePipeline: true,
    canViewAnalytics: true,
    canSendMessages: true,
    monthlyMessageLimit: Infinity,
  },
};

export const PRICING = {
  monthly: {
    amount: 2900,
    currency: "SGD",
    label: "S$29/mo",
    priceEnvKey: "STRIPE_PRICE_ID_MONTHLY",
  },
  annual: {
    amount: 27600,
    currency: "SGD",
    label: "S$276/yr",
    priceEnvKey: "STRIPE_PRICE_ID_ANNUAL",
  },
};

export const FREE_PLAN_FEATURES = [
  "50 contacts",
  "100 messages / month",
  "Quick replies",
  "All pipeline templates",
  "1 user",
];

export const PRO_PLAN_FEATURES = [
  "Unlimited contacts",
  "Unlimited messages",
  "Up to 5 team members",
  "Pipeline customisation",
  "Analytics",
];
