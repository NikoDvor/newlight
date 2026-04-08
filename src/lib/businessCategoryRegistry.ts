// ── Business Category + Workspace Profile Registry ──
// New structured source of truth for client setup.
// Categories map to pricing families; niches refine within each category.

import type { IndustryCategory, BusinessArchetype, ZoomTier } from "@/lib/workspaceProfileTypes";
import type { NicheDefinition } from "@/lib/workspaceNiches";
import { NICHE_REGISTRY } from "@/lib/workspaceNiches";

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
    id: "financial_compliance",
    label: "Financial & Compliance",
    helper: "Financial firms, CPA firms, and more",
    industryKeys: ["financial_legal"],
    defaultArchetype: "high_ticket_recurring",
    defaultZoomTier: "z2",
    pricingFamily: "consultative_sales",
    legacyProfile: "consultative_sales",
    legacyIndustry: "financial services",
  },
  {
    id: "aesthetics_wellness",
    label: "Aesthetics, Wellness & Appointments",
    helper: "Med spas, barber shops, and more",
    industryKeys: ["healthcare_wellness"],
    defaultArchetype: "appointments",
    defaultZoomTier: "z2",
    pricingFamily: "appointment_local",
    legacyProfile: "appointment_local",
    legacyIndustry: "healthcare",
  },
  {
    id: "field_local_service",
    label: "Field & Local Service",
    helper: "Window washing, HVAC, and more",
    industryKeys: ["home_services"],
    defaultArchetype: "appointments",
    defaultZoomTier: "z2",
    pricingFamily: "field_service",
    legacyProfile: "field_service",
    legacyIndustry: "construction",
  },
  {
    id: "food_hospitality",
    label: "Food, Hospitality & Foot Traffic",
    helper: "Restaurants, cafes, and more",
    industryKeys: ["hospitality_local"],
    defaultArchetype: "transactions",
    defaultZoomTier: "z2",
    pricingFamily: "appointment_local",
    legacyProfile: "appointment_local",
    legacyIndustry: "restaurant",
  },
  {
    id: "professional_consultative",
    label: "Professional & Consultative",
    helper: "Marketing agencies, consultants, and more",
    industryKeys: ["agencies_professional"],
    defaultArchetype: "retainers",
    defaultZoomTier: "z2",
    pricingFamily: "consultative_sales",
    legacyProfile: "consultative_sales",
    legacyIndustry: "agency",
  },
  {
    id: "real_estate",
    label: "Real Estate & Property",
    helper: "Real estate teams, brokerages, and more",
    industryKeys: ["real_estate"],
    defaultArchetype: "high_ticket_recurring",
    defaultZoomTier: "z2",
    pricingFamily: "consultative_sales",
    legacyProfile: "consultative_sales",
    legacyIndustry: "real estate",
  },
  {
    id: "membership_recurring",
    label: "Membership & Recurring Revenue",
    helper: "Gyms, coaching programs, and more",
    industryKeys: ["education_coaching"],
    defaultArchetype: "retainers",
    defaultZoomTier: "z2",
    pricingFamily: "membership_recurring",
    legacyProfile: "membership_recurring",
    legacyIndustry: "fitness",
  },
  {
    id: "retail_ecommerce",
    label: "Retail, Ecommerce & Product Sales",
    helper: "Retail stores, ecommerce brands, and more",
    industryKeys: ["ecommerce_retail"],
    defaultArchetype: "ecommerce",
    defaultZoomTier: "z2",
    pricingFamily: "appointment_local",
    legacyProfile: "membership_recurring",
    legacyIndustry: "e-commerce",
  },
  {
    id: "technology_saas",
    label: "Technology & SaaS",
    helper: "SaaS companies, software firms, and more",
    industryKeys: ["saas_tech"],
    defaultArchetype: "subscription_saas",
    defaultZoomTier: "z3",
    pricingFamily: "membership_recurring",
    legacyProfile: "membership_recurring",
    legacyIndustry: "e-commerce",
  },
  {
    id: "project_delivery",
    label: "Project / Delivery Businesses",
    helper: "Contractors, builders, and more",
    industryKeys: ["logistics_industrial"],
    defaultArchetype: "projects",
    defaultZoomTier: "z2",
    pricingFamily: "project_service",
    legacyProfile: "project_service",
    legacyIndustry: "construction",
  },
];

// ── Lookup helpers ──

export function getCategoryById(id: string): BusinessCategory | undefined {
  return BUSINESS_CATEGORIES.find((c) => c.id === id);
}

/** Get niches filtered by a business category */
export function getNichesForCategory(categoryId: string): NicheDefinition[] {
  const cat = getCategoryById(categoryId);
  if (!cat) return [];
  return NICHE_REGISTRY.filter((n) => cat.industryKeys.includes(n.industry));
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
  niche: NicheDefinition | null
): StructuredWorkspaceProfile {
  const cat = getCategoryById(categoryId);

  // Fallback defaults when no category matches
  const fallbackLegacyIndustry = "other";
  const fallbackLegacyProfile = "custom_hybrid";
  const fallbackPricingFamily = "custom_hybrid";
  const fallbackArchetype = "appointments";

  const archetype = niche?.archetype ?? cat?.defaultArchetype ?? fallbackArchetype;
  const zoomTier = niche?.defaultZoomTier ?? cat?.defaultZoomTier ?? "z2";
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

  // Derive pricing bracket from niche or category
  const bracketMap: Record<string, string> = {
    appointment_local: "standard",
    field_service: "standard",
    consultative_sales: "premium",
    membership_recurring: "standard",
    project_service: "standard",
    custom_hybrid: "standard",
  };

  return {
    version: 2,
    category: categoryId,
    nichePreset: niche?.id ?? null,
    archetype,
    zoomTier,
    demoModel: niche ? `niche_${niche.id}` : `category_${categoryId}`,
    dashboard: {
      emphasis: emphasisMap[archetype] || "bookings_revenue",
      gating: [], // populated later by gating engine
    },
    pricing: {
      family: pricingFamily,
      bracket: bracketMap[legacyProfile] || "standard",
    },
    twilioPlaybook: `${archetype}_default`,
    appStoreTier: niche?.pricingProfile?.setupTier === "premium" ? "premium" : "standard",
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
