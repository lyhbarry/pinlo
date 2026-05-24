export type TemplateId =
  | "generic_crm"
  | "property_agent"
  | "retail_fnb"
  | "contractor_trades";

export type ContactFieldDef = {
  name: string;
  label: string;
  type: "text" | "select" | "date";
  options?: string[];
};

export type Template = {
  id: TemplateId;
  label: string;
  description: string;
  emoji: string;
  popular?: boolean;
  stages: string[];
  quickReplies: { title: string; body: string }[];
  contactFields: ContactFieldDef[];
};

export const TEMPLATES: Record<TemplateId, Template> = {
  generic_crm: {
    id: "generic_crm",
    label: "Generic CRM",
    description: "A flexible setup for any sales or support team.",
    emoji: "🗂️",
    popular: true,
    stages: ["New", "Contacted", "Qualified", "Proposal", "Closed Won", "Closed Lost"],
    quickReplies: [
      { title: "Greeting", body: "Hi! Thanks for reaching out. How can I help you today?" },
      { title: "Follow-up", body: "Hi, just following up on our last conversation. Do you have any questions I can help with?" },
      { title: "Be right back", body: "Thanks for your message! I'll get back to you shortly." },
      { title: "Thank you", body: "Thank you for your time today. It was great speaking with you!" },
      { title: "Check-in", body: "Hi! Just checking in — is there anything I can help you with?" },
    ],
    contactFields: [
      { name: "company", label: "Company", type: "text" },
      { name: "source", label: "Lead Source", type: "select", options: ["Website", "Referral", "Social Media", "Event", "Other"] },
    ],
  },

  property_agent: {
    id: "property_agent",
    label: "Property Agent",
    description: "Track leads, viewings, and closings for real estate.",
    emoji: "🏠",
    stages: ["New Lead", "Viewing Scheduled", "Offer Made", "Under Contract", "Closed", "Lost"],
    quickReplies: [
      { title: "Greeting", body: "Hi! Thanks for reaching out. How can I help you today?" },
      { title: "Follow-up", body: "Hi, just following up on our last conversation. Do you have any questions I can help with?" },
      { title: "Be right back", body: "Thanks for your message! I'll get back to you shortly." },
      { title: "Thank you", body: "Thank you for your time today. It was great speaking with you!" },
      { title: "Check-in", body: "Hi! Just checking in — is there anything I can help you with?" },
    ],
    contactFields: [
      { name: "budget", label: "Budget (USD)", type: "text" },
      { name: "property_type", label: "Property Type", type: "select", options: ["HDB", "Condo", "Landed", "Commercial"] },
      { name: "timeline", label: "Move-in Timeline", type: "select", options: ["ASAP", "1–3 months", "3–6 months", "6+ months"] },
    ],
  },

  retail_fnb: {
    id: "retail_fnb",
    label: "Retail / F&B",
    description: "Handle orders, inquiries, and customer follow-ups.",
    emoji: "🛍️",
    stages: ["New", "Inquiry", "Order Confirmed", "Preparing", "Ready", "Completed"],
    quickReplies: [
      { title: "Greeting", body: "Hi! Thanks for reaching out. How can I help you today?" },
      { title: "Follow-up", body: "Hi, just following up on our last conversation. Do you have any questions I can help with?" },
      { title: "Be right back", body: "Thanks for your message! I'll get back to you shortly." },
      { title: "Thank you", body: "Thank you for your time today. It was great speaking with you!" },
      { title: "Check-in", body: "Hi! Just checking in — is there anything I can help you with?" },
    ],
    contactFields: [
      { name: "preferred_products", label: "Preferred Products", type: "text" },
      { name: "loyalty_tier", label: "Loyalty Tier", type: "select", options: ["Standard", "Silver", "Gold", "Platinum"] },
    ],
  },

  contractor_trades: {
    id: "contractor_trades",
    label: "Contractor / Trades",
    description: "Quotes, site visits, and job tracking for trade businesses.",
    emoji: "🔧",
    stages: ["New Enquiry", "Site Visit", "Quote Sent", "Accepted", "In Progress", "Completed"],
    quickReplies: [
      { title: "Greeting", body: "Hi! Thanks for reaching out. How can I help you today?" },
      { title: "Follow-up", body: "Hi, just following up on our last conversation. Do you have any questions I can help with?" },
      { title: "Be right back", body: "Thanks for your message! I'll get back to you shortly." },
      { title: "Thank you", body: "Thank you for your time today. It was great speaking with you!" },
      { title: "Check-in", body: "Hi! Just checking in — is there anything I can help you with?" },
    ],
    contactFields: [
      { name: "job_type", label: "Job Type", type: "text" },
      { name: "location", label: "Location / Address", type: "text" },
      { name: "budget", label: "Budget (USD)", type: "text" },
    ],
  },
};

export const TEMPLATE_LIST = [
  TEMPLATES.generic_crm,
  TEMPLATES.property_agent,
  TEMPLATES.contractor_trades,
  TEMPLATES.retail_fnb,
];
