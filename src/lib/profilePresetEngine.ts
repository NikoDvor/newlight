// ── Profile Preset Engine ──
// Translates StructuredWorkspaceProfile into module, proposal, contract,
// dashboard, app-store, and onboarding presets.
// Consumes businessCategoryRegistry — does NOT duplicate it.

import type { StructuredWorkspaceProfile } from "@/lib/businessCategoryRegistry";
import { FINANCIAL_FIRM_OPERATION_TYPE, type BusinessOperationType } from "@/lib/businessOperationTypes";

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
  financial_compliance:     { family: "financial_firm",   bracket: "premium_financial",        isFinancialPremium: true },
};

export function resolvePricing(profile: StructuredWorkspaceProfile): ResolvedPricing {
  void profile;
  return CATEGORY_PRICING.financial_compliance;
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
};

export function resolveModulePreset(profile: StructuredWorkspaceProfile): ModulePreset {
  return MODULE_PRESETS.financial_compliance;
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
};

export function resolveDashboardEmphasis(profile: StructuredWorkspaceProfile): DashboardEmphasis[] {
  return DASHBOARD_EMPHASIS.financial_compliance;
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
};

const CATEGORY_TO_PROPOSAL_PRESET: Record<string, string> = {
  financial_compliance: "financial_compliance",
};

export function resolveProposalPreset(profile: StructuredWorkspaceProfile): ProposalPresetConfig {
  void profile;
  return PROPOSAL_PRESETS.financial_compliance;
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
};

export function resolveContractPreset(profile: StructuredWorkspaceProfile): ContractPresetConfig {
  void profile;
  return CONTRACT_PRESETS.financial_compliance;
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
  premium_financial:    { tierKey: "premium_financial",    tierLabel: "Financial Firms Premium",   isCustomQuote: true },
  consultative_sales:   { tierKey: "consultative_sales",   tierLabel: "Consultative Sales",       isCustomQuote: true },
};

export function resolveAppStoreTier(profile: StructuredWorkspaceProfile): AppStoreTierConfig {
  const pricing = resolvePricing(profile);
  if (pricing.isFinancialPremium) return APP_STORE_TIERS.premium_financial;
  return APP_STORE_TIERS[pricing.family] ?? APP_STORE_TIERS.premium_financial;
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
};

export function resolveOnboardingPreset(profile: StructuredWorkspaceProfile): OnboardingPresetConfig {
  return ONBOARDING_PRESETS.financial_compliance;
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
};

export function resolveDemoModel(profile: StructuredWorkspaceProfile): DemoModelConfig {
  return DEMO_MODELS.financial_compliance;
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
    twilioPlaybook: playbookMap.financial_compliance,
  };
}
