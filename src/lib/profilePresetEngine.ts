// ── Profile Preset Engine ──
// Translates StructuredWorkspaceProfile into module, proposal, contract,
// dashboard, app-store, and onboarding presets.
// Consumes businessCategoryRegistry — does NOT duplicate it.

import type { StructuredWorkspaceProfile } from "@/lib/businessCategoryRegistry";
import type { BusinessOperationType } from "@/lib/businessOperationTypes";

// ═══════════════════════════════════════════════
// Pricing Bracket Definitions
// ═══════════════════════════════════════════════

export type PricingBracket =
  | "premium_financial"
  | "high_local"
  | "standard_field"
  | "standard_local"
  | "standard_consultative"
  | "real_estate_consultative"
  | "standard_membership"
  | "safe_default_retail"
  | "saas_recurring"
  | "standard_project"
  | "standard"; // fallback

export interface ResolvedPricing {
  family: BusinessOperationType;
  bracket: PricingBracket;
  isFinancialPremium: boolean;
}

const CATEGORY_PRICING: Record<string, ResolvedPricing> = {
  financial_compliance:     { family: "consultative_sales",   bracket: "premium_financial",        isFinancialPremium: true },
  aesthetics_wellness:      { family: "appointment_local",    bracket: "high_local",               isFinancialPremium: false },
  field_local_service:      { family: "field_service",        bracket: "standard_field",           isFinancialPremium: false },
  food_hospitality:         { family: "appointment_local",    bracket: "standard_local",           isFinancialPremium: false },
  professional_consultative:{ family: "consultative_sales",   bracket: "standard_consultative",    isFinancialPremium: false },
  real_estate:              { family: "consultative_sales",   bracket: "real_estate_consultative",  isFinancialPremium: false },
  membership_recurring:     { family: "membership_recurring", bracket: "standard_membership",      isFinancialPremium: false },
  retail_ecommerce:         { family: "appointment_local",    bracket: "safe_default_retail",      isFinancialPremium: false },
  technology_saas:          { family: "membership_recurring", bracket: "saas_recurring",           isFinancialPremium: false },
  project_delivery:         { family: "project_service",      bracket: "standard_project",         isFinancialPremium: false },
};

export function resolvePricing(profile: StructuredWorkspaceProfile): ResolvedPricing {
  return CATEGORY_PRICING[profile.category] ?? {
    family: (profile.pricing?.family as BusinessOperationType) ?? "custom_hybrid",
    bracket: (profile.pricing?.bracket as PricingBracket) ?? "standard",
    isFinancialPremium: false,
  };
}

// ═══════════════════════════════════════════════
// Module Presets
// ═══════════════════════════════════════════════

export interface ModulePreset {
  priority: string[];
  secondary: string[];
  optional: string[];
}

const MODULE_PRESETS: Record<string, ModulePreset> = {
  financial_compliance: {
    priority: ["crm_automation", "seo", "lifecycle_nurture", "tracking_attribution"],
    secondary: ["website_management"],
    optional: ["financial_compliance", "paid_ads"],
  },
  aesthetics_wellness: {
    priority: ["paid_ads", "crm_automation", "reputation_reviews", "lifecycle_nurture", "website_management"],
    secondary: ["seo"],
    optional: ["tracking_attribution"],
  },
  field_local_service: {
    priority: ["seo", "crm_automation", "reputation_reviews", "paid_ads"],
    secondary: ["website_management"],
    optional: ["lifecycle_nurture", "tracking_attribution"],
  },
  food_hospitality: {
    priority: ["reputation_reviews", "crm_automation", "paid_ads", "website_management"],
    secondary: ["seo"],
    optional: ["lifecycle_nurture"],
  },
  professional_consultative: {
    priority: ["crm_automation", "website_management", "seo", "lifecycle_nurture", "tracking_attribution"],
    secondary: ["paid_ads"],
    optional: ["reputation_reviews"],
  },
  real_estate: {
    priority: ["crm_automation", "website_management", "lifecycle_nurture", "tracking_attribution", "paid_ads"],
    secondary: ["seo"],
    optional: ["reputation_reviews"],
  },
  membership_recurring: {
    priority: ["crm_automation", "lifecycle_nurture", "paid_ads", "website_management", "tracking_attribution"],
    secondary: ["reputation_reviews"],
    optional: ["seo"],
  },
  retail_ecommerce: {
    priority: ["website_management", "paid_ads", "crm_automation", "lifecycle_nurture", "tracking_attribution"],
    secondary: ["seo"],
    optional: ["reputation_reviews"],
  },
  technology_saas: {
    priority: ["crm_automation", "lifecycle_nurture", "tracking_attribution", "website_management"],
    secondary: ["paid_ads"],
    optional: ["seo"],
  },
  project_delivery: {
    priority: ["crm_automation", "website_management", "tracking_attribution", "lifecycle_nurture"],
    secondary: ["seo", "paid_ads"],
    optional: ["reputation_reviews"],
  },
};

export function resolveModulePreset(profile: StructuredWorkspaceProfile): ModulePreset {
  return MODULE_PRESETS[profile.category] ?? MODULE_PRESETS.professional_consultative;
}

/** Get all recommended module keys (priority + secondary) */
export function getRecommendedModules(profile: StructuredWorkspaceProfile): string[] {
  const preset = resolveModulePreset(profile);
  return [...preset.priority, ...preset.secondary];
}

/** Get priority-only module keys */
export function getPriorityModules(profile: StructuredWorkspaceProfile): string[] {
  return resolveModulePreset(profile).priority;
}

// ═══════════════════════════════════════════════
// Dashboard Emphasis
// ═══════════════════════════════════════════════

export type DashboardEmphasis = string;

const DASHBOARD_EMPHASIS: Record<string, DashboardEmphasis[]> = {
  financial_compliance:      ["pipeline", "compliance", "attribution", "revenue"],
  aesthetics_wellness:       ["appointments", "reactivation", "reviews", "revenue"],
  field_local_service:       ["pipeline", "speed-to-lead", "reviews", "automation"],
  food_hospitality:          ["reviews", "foot-traffic", "reactivation", "revenue"],
  professional_consultative: ["proposals", "pipeline", "attribution", "revenue"],
  real_estate:               ["pipeline", "nurture", "attribution", "revenue"],
  membership_recurring:      ["retention", "renewals", "automation", "revenue"],
  retail_ecommerce:          ["orders", "traffic", "attribution", "revenue"],
  technology_saas:           ["retention", "automation", "attribution", "revenue"],
  project_delivery:          ["pipeline", "onboarding", "milestones", "attribution"],
};

export function resolveDashboardEmphasis(profile: StructuredWorkspaceProfile): DashboardEmphasis[] {
  return DASHBOARD_EMPHASIS[profile.category] ?? ["pipeline", "revenue", "automation", "attribution"];
}

// ═══════════════════════════════════════════════
// Proposal Presets
// ═══════════════════════════════════════════════

export interface ProposalPresetConfig {
  presetKey: string;
  narrativeTone: string;
  opportunityLanguage: string;
  focusOutcomes: string[];
  recommendedUpsells: string[];
  appStorePositioning: string;
  complianceLanguage: string | null;
}

const PROPOSAL_PRESETS: Record<string, ProposalPresetConfig> = {
  financial_compliance: {
    presetKey: "financial_compliance",
    narrativeTone: "compliance-first, trust-building, institutional",
    opportunityLanguage: "higher revenue-at-risk, compliance-heavy opportunity framing",
    focusOutcomes: [
      "Compliance-safe CRM pipeline with full audit trail",
      "Automated prospect nurture meeting regulatory requirements",
      "Attribution tracking across all advisor touchpoints",
      "Financial Compliance Workflow with regulatory safeguards",
    ],
    recommendedUpsells: ["financial_compliance", "tracking_attribution"],
    appStorePositioning: "Financial Firms Premium tier — compliance-ready mobile experience",
    complianceLanguage: "All communications and workflows are designed to meet financial industry regulatory requirements. Compliance audit trails are maintained automatically.",
  },
  appointment_growth: {
    presetKey: "appointment_growth",
    narrativeTone: "results-driven, booking-focused, reactivation-centric",
    opportunityLanguage: "appointments/rebookings/reactivation emphasis with revenue-per-visit framing",
    focusOutcomes: [
      "Automated consultation booking with pre-qualification",
      "Dormant client reactivation generating 15–30% rebookings",
      "Review generation reaching 4.8+ average rating",
      "Post-appointment follow-up sequences increasing retention",
    ],
    recommendedUpsells: ["lifecycle_nurture", "reputation_reviews"],
    appStorePositioning: "Appointment / Local tier — booking-optimized mobile experience",
    complianceLanguage: null,
  },
  field_service_growth: {
    presetKey: "field_service_growth",
    narrativeTone: "speed-focused, efficiency-driven, territory-centric",
    opportunityLanguage: "missed lead / speed-to-response emphasis with job-value framing",
    focusOutcomes: [
      "Missed call auto-response recovering 40%+ of lost calls",
      "Local SEO ranking for high-intent service searches",
      "Automated estimate follow-up sequences",
      "Review credibility building trust in service area",
    ],
    recommendedUpsells: ["seo", "reputation_reviews"],
    appStorePositioning: "Field Service tier — dispatch-ready mobile experience",
    complianceLanguage: null,
  },
  foot_traffic_growth: {
    presetKey: "foot_traffic_growth",
    narrativeTone: "community-driven, visibility-focused, loyalty-centric",
    opportunityLanguage: "foot traffic / repeat visit / local visibility emphasis",
    focusOutcomes: [
      "Local visibility driving walk-in and online traffic",
      "Review volume growth outpacing local competitors",
      "Reactivation campaigns for lapsed customers",
      "Community presence through targeted local ads",
    ],
    recommendedUpsells: ["reputation_reviews", "paid_ads"],
    appStorePositioning: "Appointment / Local tier — customer engagement mobile app",
    complianceLanguage: null,
  },
  consultative_growth: {
    presetKey: "consultative_growth",
    narrativeTone: "strategic, pipeline-focused, trust-building",
    opportunityLanguage: "proposal turnaround / pipeline leakage emphasis with deal-value framing",
    focusOutcomes: [
      "Sales pipeline clarity with deal stage tracking",
      "Proposal automation reducing turnaround to hours",
      "Automated lead nurture between sales touchpoints",
      "Full-funnel attribution proving marketing ROI",
    ],
    recommendedUpsells: ["tracking_attribution", "website_management"],
    appStorePositioning: "Consultative Sales tier — client-facing branded experience",
    complianceLanguage: null,
  },
  real_estate_growth: {
    presetKey: "real_estate_growth",
    narrativeTone: "relationship-driven, speed-focused, market-aware",
    opportunityLanguage: "speed-to-lead / sphere nurture emphasis with listing/deal framing",
    focusOutcomes: [
      "Speed-to-lead response within 60 seconds",
      "Sphere-of-influence automated nurture campaigns",
      "Listing marketing automation with attribution",
      "Post-close review collection and referral triggers",
    ],
    recommendedUpsells: ["paid_ads", "lifecycle_nurture"],
    appStorePositioning: "Consultative Sales tier — branded agent/team app",
    complianceLanguage: null,
  },
  membership_growth: {
    presetKey: "membership_growth",
    narrativeTone: "retention-focused, community-building, lifecycle-driven",
    opportunityLanguage: "retention / churn / recurring revenue emphasis with LTV framing",
    focusOutcomes: [
      "Member engagement automation reducing churn",
      "Lapsed member reactivation campaigns",
      "Trial-to-membership conversion optimization",
      "Lifecycle nurture building long-term member value",
    ],
    recommendedUpsells: ["lifecycle_nurture", "tracking_attribution"],
    appStorePositioning: "Membership / Recurring tier — member engagement mobile app",
    complianceLanguage: null,
  },
  retail_growth: {
    presetKey: "retail_growth",
    narrativeTone: "conversion-focused, omnichannel, data-driven",
    opportunityLanguage: "conversion rate / repeat purchase / attribution emphasis",
    focusOutcomes: [
      "Website conversion rate optimization",
      "Paid ad optimization with full-funnel attribution",
      "Repeat purchase automation increasing LTV",
      "Customer lifecycle email flows",
    ],
    recommendedUpsells: ["paid_ads", "tracking_attribution"],
    appStorePositioning: "Standard tier — branded shopping/loyalty app",
    complianceLanguage: null,
  },
  saas_growth: {
    presetKey: "saas_growth",
    narrativeTone: "metrics-driven, retention-focused, product-led",
    opportunityLanguage: "MRR / churn / product adoption emphasis with SaaS metrics framing",
    focusOutcomes: [
      "CRM automation for trial-to-paid conversion",
      "Churn prevention with automated engagement triggers",
      "Attribution tracking across acquisition channels",
      "Lifecycle nurture for user onboarding and expansion",
    ],
    recommendedUpsells: ["lifecycle_nurture", "tracking_attribution"],
    appStorePositioning: "Membership / Recurring tier — SaaS companion app",
    complianceLanguage: null,
  },
  project_delivery_growth: {
    presetKey: "project_delivery_growth",
    narrativeTone: "milestone-driven, efficiency-focused, trust-building",
    opportunityLanguage: "pipeline velocity / project handoff emphasis with project-value framing",
    focusOutcomes: [
      "Project pipeline management preventing revenue gaps",
      "Milestone tracking with client communication automation",
      "Lead-to-project conversion optimization",
      "Review credibility building trust for high-value projects",
    ],
    recommendedUpsells: ["website_management", "tracking_attribution"],
    appStorePositioning: "Project / Delivery tier — client portal mobile app",
    complianceLanguage: null,
  },
};

const CATEGORY_TO_PROPOSAL_PRESET: Record<string, string> = {
  financial_compliance: "financial_compliance",
  aesthetics_wellness: "appointment_growth",
  field_local_service: "field_service_growth",
  food_hospitality: "foot_traffic_growth",
  professional_consultative: "consultative_growth",
  real_estate: "real_estate_growth",
  membership_recurring: "membership_growth",
  retail_ecommerce: "retail_growth",
  technology_saas: "saas_growth",
  project_delivery: "project_delivery_growth",
};

export function resolveProposalPreset(profile: StructuredWorkspaceProfile): ProposalPresetConfig {
  const key = CATEGORY_TO_PROPOSAL_PRESET[profile.category] ?? "consultative_growth";
  return PROPOSAL_PRESETS[key] ?? PROPOSAL_PRESETS.consultative_growth;
}

// ═══════════════════════════════════════════════
// Contract Presets
// ═══════════════════════════════════════════════

export interface ContractPresetConfig {
  presetKey: string;
  defaultPackageName: string;
  defaultTerm: string;
  defaultIncludedModules: string[];
  complianceWording: string | null;
  appStoreLanguage: string;
}

const CONTRACT_PRESETS: Record<string, ContractPresetConfig> = {
  financial_compliance: {
    presetKey: "financial_compliance",
    defaultPackageName: "Financial Growth & Compliance System",
    defaultTerm: "12 months",
    defaultIncludedModules: ["crm_automation", "seo", "lifecycle_nurture", "tracking_attribution", "financial_compliance"],
    complianceWording: "This agreement includes compliance-sensitive workflow configurations. All automated communications are designed to meet applicable financial industry regulations. Client is responsible for ensuring compliance with their specific regulatory requirements.",
    appStoreLanguage: "Financial Firms Premium App Store Launch — includes compliance-grade mobile experience with secure client portal.",
  },
  appointment_growth: {
    presetKey: "appointment_growth",
    defaultPackageName: "Appointment Growth System",
    defaultTerm: "6 months",
    defaultIncludedModules: ["paid_ads", "crm_automation", "reputation_reviews", "lifecycle_nurture"],
    complianceWording: null,
    appStoreLanguage: "Appointment / Local App Store Launch — booking-optimized branded mobile app.",
  },
  field_service_growth: {
    presetKey: "field_service_growth",
    defaultPackageName: "Field Service Growth System",
    defaultTerm: "6 months",
    defaultIncludedModules: ["seo", "crm_automation", "reputation_reviews", "paid_ads"],
    complianceWording: null,
    appStoreLanguage: "Field Service App Store Launch — dispatch-ready branded mobile app.",
  },
  foot_traffic_growth: {
    presetKey: "foot_traffic_growth",
    defaultPackageName: "Local Visibility & Traffic System",
    defaultTerm: "6 months",
    defaultIncludedModules: ["reputation_reviews", "crm_automation", "paid_ads", "website_management"],
    complianceWording: null,
    appStoreLanguage: "Local Business App Store Launch — customer engagement mobile app.",
  },
  consultative_growth: {
    presetKey: "consultative_growth",
    defaultPackageName: "Consultative Growth System",
    defaultTerm: "6 months",
    defaultIncludedModules: ["crm_automation", "website_management", "seo", "lifecycle_nurture", "tracking_attribution"],
    complianceWording: null,
    appStoreLanguage: "Consultative Sales App Store Launch — branded client-facing mobile app.",
  },
  real_estate_growth: {
    presetKey: "real_estate_growth",
    defaultPackageName: "Real Estate Growth System",
    defaultTerm: "6 months",
    defaultIncludedModules: ["crm_automation", "website_management", "lifecycle_nurture", "tracking_attribution", "paid_ads"],
    complianceWording: null,
    appStoreLanguage: "Real Estate App Store Launch — branded agent/team mobile app.",
  },
  membership_growth: {
    presetKey: "membership_growth",
    defaultPackageName: "Membership & Retention System",
    defaultTerm: "6 months",
    defaultIncludedModules: ["crm_automation", "lifecycle_nurture", "paid_ads", "website_management", "tracking_attribution"],
    complianceWording: null,
    appStoreLanguage: "Membership App Store Launch — member engagement mobile app.",
  },
  retail_growth: {
    presetKey: "retail_growth",
    defaultPackageName: "Retail & Ecommerce Growth System",
    defaultTerm: "6 months",
    defaultIncludedModules: ["website_management", "paid_ads", "crm_automation", "lifecycle_nurture", "tracking_attribution"],
    complianceWording: null,
    appStoreLanguage: "Retail App Store Launch — branded shopping/loyalty mobile app.",
  },
  saas_growth: {
    presetKey: "saas_growth",
    defaultPackageName: "SaaS Growth & Retention System",
    defaultTerm: "6 months",
    defaultIncludedModules: ["crm_automation", "lifecycle_nurture", "tracking_attribution", "website_management"],
    complianceWording: null,
    appStoreLanguage: "SaaS App Store Launch — product companion mobile app.",
  },
  project_delivery_growth: {
    presetKey: "project_delivery_growth",
    defaultPackageName: "Project Delivery Growth System",
    defaultTerm: "6 months",
    defaultIncludedModules: ["crm_automation", "website_management", "tracking_attribution", "lifecycle_nurture"],
    complianceWording: null,
    appStoreLanguage: "Project Delivery App Store Launch — client portal mobile app.",
  },
};

export function resolveContractPreset(profile: StructuredWorkspaceProfile): ContractPresetConfig {
  const key = CATEGORY_TO_PROPOSAL_PRESET[profile.category] ?? "consultative_growth";
  return CONTRACT_PRESETS[key] ?? CONTRACT_PRESETS.consultative_growth;
}

// ═══════════════════════════════════════════════
// App Store Tier
// ═══════════════════════════════════════════════

export interface AppStoreTierConfig {
  tierKey: string;
  tierLabel: string;
  isCustomQuote: true; // App Store pricing is always custom-quoted
}

const APP_STORE_TIERS: Record<string, AppStoreTierConfig> = {
  field_service:        { tierKey: "field_service",        tierLabel: "Field Service" },
  appointment_local:    { tierKey: "appointment_local",    tierLabel: "Appointment / Local" },
  consultative_sales:   { tierKey: "consultative_sales",   tierLabel: "Consultative Sales" },
  premium_financial:    { tierKey: "premium_financial",    tierLabel: "Financial Firms Premium" },
  membership_recurring: { tierKey: "membership_recurring", tierLabel: "Membership / Recurring" },
  project_service:      { tierKey: "project_service",      tierLabel: "Project / Delivery" },
  custom_hybrid:        { tierKey: "custom_hybrid",        tierLabel: "Custom / Hybrid" },
};

export function resolveAppStoreTier(profile: StructuredWorkspaceProfile): AppStoreTierConfig {
  const pricing = resolvePricing(profile);
  if (pricing.isFinancialPremium) return APP_STORE_TIERS.premium_financial;
  return APP_STORE_TIERS[pricing.family] ?? APP_STORE_TIERS.custom_hybrid;
}

// ═══════════════════════════════════════════════
// Onboarding Presets
// ═══════════════════════════════════════════════

export interface OnboardingPresetConfig {
  presetKey: string;
  emphasizedSteps: string[];
  description: string;
}

const ONBOARDING_PRESETS: Record<string, OnboardingPresetConfig> = {
  financial_compliance: {
    presetKey: "financial_compliance",
    emphasizedSteps: ["crm", "compliance_review", "approvals", "attribution", "branding"],
    description: "CRM pipeline, compliance review structure, approval workflows, and attribution setup",
  },
  aesthetics_wellness: {
    presetKey: "aesthetics_wellness",
    emphasizedSteps: ["calendars", "reminders", "reviews", "nurture", "branding"],
    description: "Calendar setup, reminder configuration, review automation, and client nurture",
  },
  field_local_service: {
    presetKey: "field_local_service",
    emphasizedSteps: ["routing", "speed_to_lead", "dispatch", "missed_call_textback", "reviews"],
    description: "Service routing, speed-to-lead setup, dispatch configuration, and review automation",
  },
  food_hospitality: {
    presetKey: "food_hospitality",
    emphasizedSteps: ["reviews", "local_ads", "reactivation", "branding", "website"],
    description: "Review generation, local advertising, customer reactivation, and branding",
  },
  professional_consultative: {
    presetKey: "professional_consultative",
    emphasizedSteps: ["pipeline", "proposals", "nurture", "attribution", "website"],
    description: "Pipeline setup, proposal system, lead nurture, and attribution tracking",
  },
  real_estate: {
    presetKey: "real_estate",
    emphasizedSteps: ["crm", "speed_to_lead", "nurture", "attribution", "website"],
    description: "CRM configuration, speed-to-lead, sphere nurture, and attribution",
  },
  membership_recurring: {
    presetKey: "membership_recurring",
    emphasizedSteps: ["retention", "nurture", "automations", "billing_visibility", "website"],
    description: "Retention systems, member nurture, automation setup, and billing visibility",
  },
  retail_ecommerce: {
    presetKey: "retail_ecommerce",
    emphasizedSteps: ["website", "ads", "attribution", "lifecycle", "crm"],
    description: "Website optimization, ad setup, attribution tracking, and lifecycle automation",
  },
  technology_saas: {
    presetKey: "technology_saas",
    emphasizedSteps: ["crm", "lifecycle", "attribution", "automations", "nurture"],
    description: "CRM pipeline, lifecycle automation, attribution, and engagement flows",
  },
  project_delivery: {
    presetKey: "project_delivery",
    emphasizedSteps: ["kickoff", "milestones", "delivery_comms", "pipeline", "website"],
    description: "Project kickoff, milestone tracking, delivery communication, and pipeline management",
  },
};

export function resolveOnboardingPreset(profile: StructuredWorkspaceProfile): OnboardingPresetConfig {
  return ONBOARDING_PRESETS[profile.category] ?? ONBOARDING_PRESETS.professional_consultative;
}

// ═══════════════════════════════════════════════
// Demo Model / Intelligence Presets
// ═══════════════════════════════════════════════

export interface DemoModelConfig {
  emphasisLabels: string[];
  opportunityTone: string;
  estimatePrefix: string;
}

const DEMO_MODELS: Record<string, DemoModelConfig> = {
  financial_compliance: {
    emphasisLabels: ["Revenue at Risk", "Compliance Gaps", "Pipeline Leakage", "Attribution Blind Spots"],
    opportunityTone: "higher revenue-at-risk, compliance-heavy opportunity language",
    estimatePrefix: "Estimated compliance-safe revenue opportunity",
  },
  aesthetics_wellness: {
    emphasisLabels: ["Missed Rebookings", "Dormant Clients", "Reactivation Revenue", "Review Growth"],
    opportunityTone: "appointments/rebookings/reactivation emphasis",
    estimatePrefix: "Estimated appointment & reactivation revenue",
  },
  field_local_service: {
    emphasisLabels: ["Missed Calls", "Response Time Gaps", "Unbooked Estimates", "Review Deficit"],
    opportunityTone: "missed lead / speed-to-response emphasis",
    estimatePrefix: "Estimated service revenue at risk",
  },
  food_hospitality: {
    emphasisLabels: ["Foot Traffic Gap", "Review Deficit", "Lapsed Customers", "Local Visibility"],
    opportunityTone: "foot traffic / repeat visit emphasis",
    estimatePrefix: "Estimated local traffic revenue opportunity",
  },
  professional_consultative: {
    emphasisLabels: ["Proposal Delays", "Pipeline Leakage", "Follow-Up Gaps", "Attribution Blind Spots"],
    opportunityTone: "proposal turnaround / pipeline leakage emphasis",
    estimatePrefix: "Estimated pipeline recovery opportunity",
  },
  real_estate: {
    emphasisLabels: ["Lead Response Time", "Sphere Neglect", "Listing Gaps", "Attribution Blind Spots"],
    opportunityTone: "speed-to-lead / sphere nurture emphasis",
    estimatePrefix: "Estimated deal & listing revenue opportunity",
  },
  membership_recurring: {
    emphasisLabels: ["Churn Rate", "Lapsed Members", "Renewal Gaps", "Engagement Drop"],
    opportunityTone: "retention / churn / recurring revenue emphasis",
    estimatePrefix: "Estimated retention & expansion revenue",
  },
  retail_ecommerce: {
    emphasisLabels: ["Conversion Rate", "Repeat Purchase", "Attribution Gaps", "Cart Abandonment"],
    opportunityTone: "conversion / repeat purchase emphasis",
    estimatePrefix: "Estimated ecommerce revenue opportunity",
  },
  technology_saas: {
    emphasisLabels: ["MRR Growth", "Churn Prevention", "Product Adoption", "Attribution Gaps"],
    opportunityTone: "MRR / churn / product adoption emphasis",
    estimatePrefix: "Estimated SaaS revenue opportunity",
  },
  project_delivery: {
    emphasisLabels: ["Pipeline Gaps", "Project Handoff", "Milestone Delays", "Attribution Blind Spots"],
    opportunityTone: "pipeline velocity / project handoff emphasis",
    estimatePrefix: "Estimated project pipeline opportunity",
  },
};

export function resolveDemoModel(profile: StructuredWorkspaceProfile): DemoModelConfig {
  return DEMO_MODELS[profile.category] ?? DEMO_MODELS.professional_consultative;
}

// ═══════════════════════════════════════════════
// Master resolver — one call to get everything
// ═══════════════════════════════════════════════

export interface ResolvedPresets {
  pricing: ResolvedPricing;
  modules: ModulePreset;
  dashboardEmphasis: DashboardEmphasis[];
  proposal: ProposalPresetConfig;
  contract: ContractPresetConfig;
  appStore: AppStoreTierConfig;
  onboarding: OnboardingPresetConfig;
  demoModel: DemoModelConfig;
  twilioPlaybook: string;
}

export function resolveAllPresets(profile: StructuredWorkspaceProfile): ResolvedPresets {
  // Import inline to avoid circular deps at module scope
  const playbookMap: Record<string, string> = {
    financial_compliance: "financial_compliance_nurture",
    aesthetics_wellness: "appointment_reactivation",
    field_local_service: "speed_to_lead_field_service",
    food_hospitality: "foot_traffic_loyalty",
    professional_consultative: "consultative_followup",
    real_estate: "consultative_followup",
    membership_recurring: "recurring_retention",
    retail_ecommerce: "retail_safe_default",
    technology_saas: "recurring_retention",
    project_delivery: "project_milestone_updates",
  };

  return {
    pricing: resolvePricing(profile),
    modules: resolveModulePreset(profile),
    dashboardEmphasis: resolveDashboardEmphasis(profile),
    proposal: resolveProposalPreset(profile),
    contract: resolveContractPreset(profile),
    appStore: resolveAppStoreTier(profile),
    onboarding: resolveOnboardingPreset(profile),
    demoModel: resolveDemoModel(profile),
    twilioPlaybook: playbookMap[profile.category] ?? "consultative_followup",
  };
}
