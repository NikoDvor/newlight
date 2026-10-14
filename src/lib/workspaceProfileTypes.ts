// ── Workspace Profile Foundation ──
// This is the new structured profile system that will eventually
// control demo numbers, pricing, and module emphasis.

// ── Industry Categories ──
export const INDUSTRY_CATEGORIES = [
  { value: "ria", label: "Registered Investment Adviser (RIA)", examples: "Independent and hybrid RIAs" },
  { value: "wealth_management", label: "Wealth Management", examples: "Wealth managers, financial planners, multi-family offices" },
  { value: "hedge_fund", label: "Hedge Fund", examples: "Hedge funds and alternative investment managers" },
  { value: "private_equity_vc", label: "Private Equity & Venture Capital", examples: "PE firms, VC firms, fund managers" },
  { value: "financial_insurance", label: "Financial Insurance", examples: "Life, annuity and financial insurance firms" },
] as const;

export type IndustryCategory = (typeof INDUSTRY_CATEGORIES)[number]["value"];

// ── Business Model Archetypes ──
export const BUSINESS_ARCHETYPES = [
  {
    value: "high_ticket_recurring",
    label: "High-Ticket Recurring",
    description: "AUM or advisory-fee based recurring client relationships",
    icon: "trending-up",
  },
  {
    value: "retainers",
    label: "Retainers",
    description: "Retainer or flat-fee advisory engagements",
    icon: "repeat",
  },
  {
    value: "enterprise_accounts",
    label: "Enterprise Accounts",
    description: "Institutional accounts with multi-stakeholder relationships",
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

// ── Niche Metadata (embedded in profile) ──
export interface NicheMetadata {
  revenueModel: string;
  salesCycle: string;
  ticketSize: string;
  complexityLevel: string;
  complianceLevel: string;
}

// ── Workspace Profile Object ──
export interface WorkspaceProfile {
  industry: IndustryCategory;
  /** Selected niche id from the registry (null = no niche chosen) */
  niche: string | null;
  archetype: BusinessArchetype;
  zoomTier: ZoomTier;
  /** Preserved mapping to old profile system */
  legacyProfileType: string;
  /** Preserved mapping to old industry dropdown value */
  legacyIndustryValue: string;
  /** Behavior metadata derived from niche (or defaults) */
  metadata: NicheMetadata;
}

// ── Legacy Mapping Helpers ──
import type { ProfileType } from "@/lib/profileEngine";

/** Map new industry category → best-fit legacy ProfileType */
export function mapIndustryToLegacyProfile(industry: IndustryCategory): ProfileType {
  void industry;
  return "consultative_sales";
}

/** Map new archetype → best-fit legacy ProfileType (overrides industry if more specific) */
export function mapArchetypeToLegacyProfile(archetype: BusinessArchetype): ProfileType {
  void archetype;
  return "consultative_sales";
}

/** Build a complete WorkspaceProfile with legacy mappings */
export function buildWorkspaceProfile(
  industry: IndustryCategory,
  archetype: BusinessArchetype,
  zoomTier: ZoomTier,
  nicheId?: string | null,
  nicheMetadata?: NicheMetadata | null
): WorkspaceProfile {
  const legacyFromArchetype = mapArchetypeToLegacyProfile(archetype);
  const industryLabel = INDUSTRY_CATEGORIES.find((c) => c.value === industry)?.label ?? "";

  return {
    industry,
    niche: nicheId ?? null,
    archetype,
    zoomTier,
    legacyProfileType: legacyFromArchetype,
    legacyIndustryValue: industryLabel.toLowerCase(),
    metadata: nicheMetadata ?? {
      revenueModel: "lead_gen",
      salesCycle: "medium",
      ticketSize: "medium",
      complexityLevel: "medium",
      complianceLevel: "none",
    },
  };
}

/** Default empty profile */
export const DEFAULT_WORKSPACE_PROFILE: WorkspaceProfile = {
  industry: "ria",
  niche: null,
  archetype: "high_ticket_recurring",
  zoomTier: "z2",
  legacyProfileType: "consultative_sales",
  legacyIndustryValue: "registered investment adviser (ria)",
  metadata: {
    revenueModel: "lead_gen",
    salesCycle: "medium",
    ticketSize: "medium",
    complexityLevel: "medium",
    complianceLevel: "none",
  },
};
