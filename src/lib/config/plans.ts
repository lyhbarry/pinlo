export type PlanId = "free" | "pro";

export type PlanLimits = {
  maxContacts: number;
  maxUsers: number;
  maxQuickReplies: number;
  maxActiveReminders: number;
  canUseTemplates: string[];
  canCustomisePipeline: boolean;
  canSendMessages: boolean;
  monthlyMessageLimit: number;
};

export const PLANS: Record<PlanId, { name: string } & PlanLimits> = {
  free: {
    name: "Free",
    maxContacts: 50,
    maxUsers: 5,
    maxQuickReplies: Infinity,
    maxActiveReminders: 5,
    canUseTemplates: ["generic_crm", "property_agent", "retail_fnb", "contractor_trades"],
    canCustomisePipeline: false,
    canSendMessages: true,
    monthlyMessageLimit: 1000,
  },
  pro: {
    name: "Pro",
    maxContacts: Infinity,
    maxUsers: Infinity,
    maxQuickReplies: Infinity,
    maxActiveReminders: Infinity,
    canUseTemplates: ["generic_crm", "property_agent", "retail_fnb", "contractor_trades"],
    canCustomisePipeline: true,
    canSendMessages: true,
    monthlyMessageLimit: Infinity,
  },
};

export const PRICING = {
  monthly: {
    amount: 1000,
    currency: "SGD",
    label: "S$10/mo",
    priceEnvKey: "STRIPE_PRICE_ID_MONTHLY",
  },
  annual: {
    amount: 9600,
    currency: "SGD",
    label: "S$96/yr",
    priceEnvKey: "STRIPE_PRICE_ID_ANNUAL",
  },
};

export const FREE_PLAN_FEATURES = [
  "50 contacts",
  "1,000 messages / month",
  "Quick replies",
  "All pipeline templates",
  "Up to 5 users",
];

export const PRO_PLAN_FEATURES = [
  "Unlimited contacts",
  "Unlimited messages",
  "Unlimited team members",
  "Pipeline customisation",
];
