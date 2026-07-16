// Shared core-module registry.
// Kept in sync with the 8 core modules used by ProposalOfferBuilder.

export interface CoreModuleDef {
  key: string;
  label: string;
  desc: string;
}

export const CORE_MODULES: CoreModuleDef[] = [
  { key: "paid_ads", label: "Paid Ads System", desc: "Google & Meta ad management with attribution" },
  { key: "seo", label: "SEO System", desc: "Organic search optimization & local rankings" },
  { key: "website_management", label: "Website System", desc: "Conversion-optimized website management" },
  { key: "crm_automation", label: "CRM Automation", desc: "Pipeline, contact management & lead scoring" },
  { key: "lifecycle_nurture", label: "Lifecycle Nurture", desc: "Automated nurture + dormant client reactivation" },
  { key: "reputation_reviews", label: "Reputation + Reviews", desc: "Review generation, monitoring & response" },
  { key: "tracking_attribution", label: "Tracking + Attribution", desc: "Call tracking, analytics & channel attribution" },
  { key: "financial_compliance", label: "Financial Compliance", desc: "Compliance workflow & regulatory tracking" },
];
