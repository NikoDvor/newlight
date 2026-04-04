// ── Workspace Profile Foundation ──
// This is the new structured profile system that will eventually
// control demo numbers, pricing, and module emphasis.

// ── Industry Categories ──
export const INDUSTRY_CATEGORIES = [
  {
    value: "healthcare_wellness",
    label: "Healthcare & Wellness",
    examples: "Med spa, dental, chiropractic, fitness, mental health",
  },
  {
    value: "financial_legal",
    label: "Financial & Legal",
    examples: "Accounting, wealth management, insurance, law firms",
  },
  {
    value: "agencies_professional",
    label: "Agencies & Professional Services",
    examples: "Marketing agencies, consulting, staffing, IT services",
  },
  {
    value: "ecommerce_retail",
    label: "Ecommerce & Retail",
    examples: "Online stores, DTC brands, retail chains",
  },
  {
    value: "home_services",
    label: "Home Services & Contractors",
    examples: "HVAC, plumbing, roofing, cleaning, landscaping",
  },
  {
    value: "real_estate",
    label: "Real Estate",
    examples: "Brokerages, property management, mortgage",
  },
  {
    value: "hospitality_local",
    label: "Restaurants, Hospitality & Local Foot Traffic",
    examples: "Restaurants, hotels, salons, barbershops, auto shops",
  },
  {
    value: "saas_tech",
    label: "SaaS, Tech & Digital Products",
    examples: "Software companies, app builders, digital platforms",
  },
  {
    value: "logistics_industrial",
    label: "Logistics, Industrial & Manufacturing",
    examples: "Supply chain, warehousing, manufacturing, distribution",
  },
  {
    value: "education_coaching",
    label: "Education, Coaching & Training",
    examples: "Online courses, coaching programs, tutoring, academies",
  },
  {
    value: "nonprofit_community",
    label: "Nonprofit & Community Organizations",
    examples: "Nonprofits, religious orgs, community groups, advocacy",
  },
  {
    value: "other",
    label: "Other / Custom",
    examples: "Doesn't fit a category above",
  },
] as const;

export type IndustryCategory = (typeof INDUSTRY_CATEGORIES)[number]["value"];

// ── Business Model Archetypes ──
export const BUSINESS_ARCHETYPES = [
  {
    value: "appointments",
    label: "Appointments",
    description: "Revenue tied to scheduled sessions or visits",
    icon: "calendar",
  },
  {
    value: "projects",
    label: "Projects",
    description: "Scoped deliverables with milestones and deadlines",
    icon: "folder",
  },
  {
    value: "retainers",
    label: "Retainers",
    description: "Ongoing monthly service agreements",
    icon: "repeat",
  },
  {
    value: "transactions",
    label: "Transactions",
    description: "One-time purchases or point-of-sale activity",
    icon: "credit-card",
  },
  {
    value: "ecommerce",
    label: "Ecommerce",
    description: "Online product sales with carts and fulfillment",
    icon: "shopping-bag",
  },
  {
    value: "subscription_saas",
    label: "Subscription / SaaS",
    description: "Recurring digital subscriptions or platform access",
    icon: "zap",
  },
  {
    value: "high_ticket_recurring",
    label: "High-Ticket Recurring",
    description: "Premium services billed monthly or quarterly",
    icon: "trending-up",
  },
  {
    value: "enterprise_accounts",
    label: "Enterprise Accounts",
    description: "Large contracts with multi-stakeholder sales cycles",
    icon: "building",
  },
] as const;

export type BusinessArchetype = (typeof BUSINESS_ARCHETYPES)[number]["value"];

// ── Zoom Tiers ──
export const ZOOM_TIERS = [
  { value: "z1", label: "Z1 — Solo / Micro", seats: "1–2", description: "Owner-operator or freelancer" },
  { value: "z2", label: "Z2 — Small Business", seats: "3–10", description: "Small team with defined roles" },
  { value: "z3", label: "Z3 — Growing Business", seats: "11–50", description: "Scaling with departments" },
  { value: "z4", label: "Z4 — Mid-Market", seats: "51–200", description: "Multi-location or divisional" },
  { value: "z5", label: "Z5 — Enterprise", seats: "200+", description: "Large org with complex operations" },
] as const;

export type ZoomTier = (typeof ZOOM_TIERS)[number]["value"];

// ── Workspace Profile Object ──
export interface WorkspaceProfile {
  industry: IndustryCategory;
  archetype: BusinessArchetype;
  zoomTier: ZoomTier;
  /** Preserved mapping to old profile system */
  legacyProfileType: string;
  /** Preserved mapping to old industry dropdown value */
  legacyIndustryValue: string;
}

// ── Legacy Mapping Helpers ──
import type { ProfileType } from "@/lib/profileEngine";

/** Map new industry category → best-fit legacy ProfileType */
export function mapIndustryToLegacyProfile(industry: IndustryCategory): ProfileType {
  const map: Record<IndustryCategory, ProfileType> = {
    healthcare_wellness: "appointment_local",
    financial_legal: "consultative_sales",
    agencies_professional: "consultative_sales",
    ecommerce_retail: "membership_recurring",
    home_services: "field_service",
    real_estate: "consultative_sales",
    hospitality_local: "appointment_local",
    saas_tech: "membership_recurring",
    logistics_industrial: "project_service",
    education_coaching: "membership_recurring",
    nonprofit_community: "custom_hybrid",
    other: "custom_hybrid",
  };
  return map[industry] ?? "custom_hybrid";
}

/** Map new archetype → best-fit legacy ProfileType (overrides industry if more specific) */
export function mapArchetypeToLegacyProfile(archetype: BusinessArchetype): ProfileType {
  const map: Record<BusinessArchetype, ProfileType> = {
    appointments: "appointment_local",
    projects: "project_service",
    retainers: "consultative_sales",
    transactions: "appointment_local",
    ecommerce: "membership_recurring",
    subscription_saas: "membership_recurring",
    high_ticket_recurring: "consultative_sales",
    enterprise_accounts: "consultative_sales",
  };
  return map[archetype] ?? "custom_hybrid";
}

/** Build a complete WorkspaceProfile with legacy mappings */
export function buildWorkspaceProfile(
  industry: IndustryCategory,
  archetype: BusinessArchetype,
  zoomTier: ZoomTier
): WorkspaceProfile {
  const legacyFromArchetype = mapArchetypeToLegacyProfile(archetype);
  const industryLabel = INDUSTRY_CATEGORIES.find((c) => c.value === industry)?.label ?? "";

  return {
    industry,
    archetype,
    zoomTier,
    legacyProfileType: legacyFromArchetype,
    legacyIndustryValue: industryLabel.toLowerCase(),
  };
}

/** Default empty profile */
export const DEFAULT_WORKSPACE_PROFILE: WorkspaceProfile = {
  industry: "other",
  archetype: "appointments",
  zoomTier: "z2",
  legacyProfileType: "custom_hybrid",
  legacyIndustryValue: "",
};
