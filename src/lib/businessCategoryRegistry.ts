// ── Business Category + Workspace Profile Registry ──
// New structured source of truth for client setup.
// Categories map to pricing families; niches refine within each category.

import type { IndustryCategory, BusinessArchetype, ZoomTier } from "@/lib/workspaceProfileTypes";

// ── Business Categories ──
export interface BusinessCategory {
  id: string;
  label: string;
  helper: string;
  /** Maps to IndustryCategory values used by niche registry */
  industryKeys: IndustryCategory[];
  /** Default archetype when no niche is selected */
  defaultArchetype: BusinessArchetype;
  /** Default zoom tier */
  defaultZoomTier: ZoomTier;
  /** Legacy pricing family string */
  pricingFamily: string;
  /** Legacy profile type for provisioner */
  legacyProfile: string;
  /** Legacy industry string for provisioner */
  legacyIndustry: string;
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  {
    id: "ria",
    label: "Registered Investment Adviser (RIA)",
    helper: "Independent and hybrid RIAs",
    industryKeys: ["ria"],
    defaultArchetype: "high_ticket_recurring",
    defaultZoomTier: "z2",
    pricingFamily: "consultative_sales",
    legacyProfile: "consultative_sales",
    legacyIndustry: "financial services",
  },
  {
    id: "wealth_management",
    label: "Wealth Management",
    helper: "Wealth managers, financial planners, multi-family offices",
    industryKeys: ["wealth_management"],
    defaultArchetype: "high_ticket_recurring",
    defaultZoomTier: "z2",
    pricingFamily: "consultative_sales",
    legacyProfile: "consultative_sales",
    legacyIndustry: "financial services",
  },
  {
    id: "hedge_fund",
    label: "Hedge Fund",
    helper: "Hedge funds and alternative investment managers",
    industryKeys: ["hedge_fund"],
    defaultArchetype: "enterprise_accounts",
    defaultZoomTier: "z2",
    pricingFamily: "consultative_sales",
    legacyProfile: "consultative_sales",
    legacyIndustry: "financial services",
  },
  {
    id: "private_equity_vc",
    label: "Private Equity & Venture Capital",
    helper: "PE firms, VC firms, fund managers",
    industryKeys: ["private_equity_vc"],
    defaultArchetype: "enterprise_accounts",
    defaultZoomTier: "z2",
    pricingFamily: "consultative_sales",
    legacyProfile: "consultative_sales",
    legacyIndustry: "financial services",
  },
  {
    id: "financial_insurance",
    label: "Financial Insurance",
    helper: "Life, annuity and financial insurance firms",
    industryKeys: ["financial_insurance"],
    defaultArchetype: "retainers",
    defaultZoomTier: "z2",
    pricingFamily: "consultative_sales",
    legacyProfile: "consultative_sales",
    legacyIndustry: "financial services",
  },
];

// ── Lookup helpers ──

export function getCategoryById(id: string): BusinessCategory | undefined {
  return BUSINESS_CATEGORIES.find((c) => c.id === id);
}

// ── Structured Workspace Profile ──

export interface StructuredWorkspaceProfile {
  version: 2;
  category: string;
  nichePreset: string | null;
  archetype: string;
  zoomTier: string;
  demoModel: string;
  dashboard: {
    emphasis: string;
    gating: string[];
  };
  pricing: {
    family: string;
    bracket: string;
  };
  twilioPlaybook: string;
  appStoreTier: string;
  onboardingPreset: string;
  modulePreset: string;
  proposalPreset: string;
  contractPreset: string;
  legacy: {
    industry: string;
    provisional_profile: string;
  };
}

/** Build the new structured workspace profile from category + optional niche */
export function buildStructuredProfile(
  categoryId: string,
  _legacyNicheArg: null = null
): StructuredWorkspaceProfile {
  const cat = getCategoryById(categoryId) ?? getCategoryById("ria");
  categoryId = cat?.id ?? "ria";

  // Fallback defaults when no category matches
  const fallbackLegacyIndustry = "financial services";
  const fallbackLegacyProfile = "consultative_sales";
  const fallbackPricingFamily = "consultative_sales";
  const fallbackArchetype = "high_ticket_recurring";

  const archetype = cat?.defaultArchetype ?? fallbackArchetype;
  const zoomTier = cat?.defaultZoomTier ?? "z2";
  const pricingFamily = cat?.pricingFamily ?? fallbackPricingFamily;
  const legacyIndustry = cat?.legacyIndustry ?? fallbackLegacyIndustry;
  const legacyProfile = cat?.legacyProfile ?? fallbackLegacyProfile;

  // Derive emphasis from archetype
  const emphasisMap: Record<string, string> = {
    appointments: "bookings_revenue",
    projects: "deliverables_timeline",
    retainers: "retention_growth",
    transactions: "volume_traffic",
    ecommerce: "orders_revenue",
    subscription_saas: "mrr_churn",
    high_ticket_recurring: "pipeline_close",
    enterprise_accounts: "pipeline_close",
  };

  // Derive pricing bracket from category
  const bracketFromCategory: Record<string, string> = {
    ria: "premium_financial",
    wealth_management: "premium_financial",
    hedge_fund: "premium_financial",
    private_equity_vc: "premium_financial",
    financial_insurance: "premium_financial",
  };
  const bracketMap = bracketFromCategory;

  return {
    version: 2,
    category: categoryId,
    nichePreset: null,
    archetype,
    zoomTier,
    demoModel: `category_${categoryId}`,
    dashboard: {
      emphasis: emphasisMap[archetype] || "bookings_revenue",
      gating: [], // populated later by gating engine
    },
    pricing: {
      family: pricingFamily,
      bracket: bracketMap[categoryId] || "premium_financial",
    },
    twilioPlaybook: `${archetype}_default`,
    appStoreTier: "premium",
    onboardingPreset: `${archetype}_onboarding`,
    modulePreset: `${archetype}_modules`,
    proposalPreset: `${archetype}_proposal`,
    contractPreset: `${archetype}_contract`,
    legacy: {
      industry: legacyIndustry,
      provisional_profile: legacyProfile,
    },
  };
}
