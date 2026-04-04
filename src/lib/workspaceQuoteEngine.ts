// ── Admin-Only Internal Quote Engine ──
// Computes pricing for proposals and internal review.
// pricingVisibility is ALWAYS "admin_only" — never client-facing.

import type { WorkspaceProfile } from "@/lib/workspaceProfileTypes";
import { resolveOperationType, isFinancialFirm, type BusinessOperationType } from "@/lib/businessOperationTypes";

// ═══════════════════════════════════════════════
// Platform Pricing Tables (INTERNAL)
// ═══════════════════════════════════════════════

const PLATFORM_PRICING: Record<BusinessOperationType, { setup: number; monthly: number }> = {
  field_service:       { setup: 4997,  monthly: 397 },
  appointment_local:   { setup: 6997,  monthly: 497 },
  consultative_sales:  { setup: 7997,  monthly: 597 },
  membership_recurring:{ setup: 6997,  monthly: 497 },
  project_service:     { setup: 5997,  monthly: 447 },
  custom_hybrid:       { setup: 9997,  monthly: 697 },
};

const FINANCIAL_FIRM_PRICING = { setup: 14997, monthly: 797 };

// ═══════════════════════════════════════════════
// Growth Module Pricing Tables (INTERNAL)
// ═══════════════════════════════════════════════

export interface ModulePricing {
  label: string;
  activationFee: number;
  monthlyFee: number;
  hardCostNotes?: string;
}

const MODULE_PRICING: Record<string, ModulePricing> = {
  paid_ads: {
    label: "Paid Ads System",
    activationFee: 997,
    monthlyFee: 497,
    hardCostNotes: "Ad spend is billed directly by the platform (Google/Meta). SMS/telephony usage billed at cost.",
  },
  seo: {
    label: "SEO System",
    activationFee: 997,
    monthlyFee: 397,
  },
  website_management: {
    label: "Website System (Management)",
    activationFee: 497,
    monthlyFee: 297,
  },
  crm_automation: {
    label: "CRM Automation System",
    activationFee: 797,
    monthlyFee: 397,
  },
  lifecycle_nurture: {
    label: "Lifecycle Nurture + Reactivation",
    activationFee: 597,
    monthlyFee: 297,
    hardCostNotes: "SMS/telephony usage billed at cost.",
  },
  reputation_reviews: {
    label: "Reputation + Reviews System",
    activationFee: 497,
    monthlyFee: 197,
  },
  tracking_attribution: {
    label: "Tracking + Attribution System",
    activationFee: 497,
    monthlyFee: 197,
    hardCostNotes: "Call tracking numbers billed at cost.",
  },
  financial_compliance: {
    label: "Financial Compliance Workflow Add-On",
    activationFee: 1497,
    monthlyFee: 297,
  },
};

// ═══════════════════════════════════════════════
// Website Build Fee Table (INTERNAL)
// ═══════════════════════════════════════════════

export const WEBSITE_BUILD_FEES: Record<string, { label: string; fee: number }> = {
  starter:    { label: "Starter (1–3 pages)",   fee: 1497 },
  standard:   { label: "Standard (4–7 pages)",  fee: 2997 },
  premium:    { label: "Premium (8–15 pages)",  fee: 4997 },
  enterprise: { label: "Enterprise (15+ pages)", fee: 7997 },
};

// ═══════════════════════════════════════════════
// App Store Launch Upgrade (INTERNAL)
// ═══════════════════════════════════════════════

const APP_STORE_PRICING: Record<BusinessOperationType, number> = {
  field_service:        9997,
  appointment_local:   14997,
  consultative_sales:  17997,
  membership_recurring:14997,
  project_service:     11997,
  custom_hybrid:       19997,
};

const FINANCIAL_APP_STORE_PRICE = 24997;

// Proposals + Content Planner are included at $0
const INCLUDED_MODULES = ["proposals", "content_planner"];

// ═══════════════════════════════════════════════
// Quote Input / Output Types
// ═══════════════════════════════════════════════

export interface QuoteInput {
  workspaceProfile: WorkspaceProfile;
  selectedModules: string[];
  hasPurchasedPlatformSetup: boolean;
  includeWebsiteBuild?: string | null;
  includeAppStoreLaunchUpgrade?: boolean;
}

export interface QuoteLineItem {
  category: "platform" | "module" | "website" | "app_store" | "included";
  label: string;
  upfront: number;
  monthly: number;
  notes?: string;
}

export interface QuoteOutput {
  businessOperationType: BusinessOperationType;
  isFinancial: boolean;
  platformSetup: number;
  platformMonthly: number;
  moduleActivationFees: number;
  moduleMonthlyFees: number;
  websiteBuildFee: number;
  appStoreLaunchFee: number;
  hardCostNotes: string[];
  totalUpfront: number;
  totalMonthly: number;
  lineItems: QuoteLineItem[];
  pricingSummary: string;
  pricingVisibility: "admin_only";
}

// ═══════════════════════════════════════════════
// Quote Computation
// ═══════════════════════════════════════════════

export function computeQuote(input: QuoteInput): QuoteOutput {
  const { workspaceProfile, selectedModules, hasPurchasedPlatformSetup, includeWebsiteBuild, includeAppStoreLaunchUpgrade } = input;

  const opType = resolveOperationType(workspaceProfile.archetype, workspaceProfile.industry);
  const financial = isFinancialFirm(workspaceProfile.industry);

  // ── Platform pricing ──
  const platformBase = financial ? FINANCIAL_FIRM_PRICING : PLATFORM_PRICING[opType];
  const platformSetup = platformBase.setup;
  const platformMonthly = platformBase.monthly;

  const lineItems: QuoteLineItem[] = [];
  const hardCostNotes: string[] = [];

  lineItems.push({
    category: "platform",
    label: `Platform Setup — ${financial ? "Financial Firms (Premium)" : opType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`,
    upfront: platformSetup,
    monthly: platformMonthly,
  });

  // ── Included modules ──
  for (const inc of INCLUDED_MODULES) {
    lineItems.push({ category: "included", label: `${inc.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} (Included)`, upfront: 0, monthly: 0 });
  }

  // ── Growth modules ──
  let moduleActivationTotal = 0;
  let moduleMonthlyTotal = 0;

  for (const modKey of selectedModules) {
    const mod = MODULE_PRICING[modKey];
    if (!mod) continue;
    const activation = hasPurchasedPlatformSetup ? 0 : mod.activationFee;
    moduleActivationTotal += activation;
    moduleMonthlyTotal += mod.monthlyFee;
    lineItems.push({
      category: "module",
      label: mod.label,
      upfront: activation,
      monthly: mod.monthlyFee,
      notes: hasPurchasedPlatformSetup ? "Activation fee waived (platform setup purchased)" : undefined,
    });
    if (mod.hardCostNotes) hardCostNotes.push(mod.hardCostNotes);
  }

  // ── Website build ──
  let websiteBuildFee = 0;
  if (includeWebsiteBuild && WEBSITE_BUILD_FEES[includeWebsiteBuild]) {
    const wb = WEBSITE_BUILD_FEES[includeWebsiteBuild];
    websiteBuildFee = wb.fee;
    lineItems.push({ category: "website", label: `Website Build — ${wb.label}`, upfront: wb.fee, monthly: 0 });
  }

  // ── App Store Launch Upgrade ──
  let appStoreLaunchFee = 0;
  if (includeAppStoreLaunchUpgrade) {
    appStoreLaunchFee = financial ? FINANCIAL_APP_STORE_PRICE : APP_STORE_PRICING[opType];
    lineItems.push({
      category: "app_store",
      label: "App Store Launch Upgrade (Elite Add-On)",
      upfront: appStoreLaunchFee,
      monthly: 0,
      notes: "One-time fee. Developer account costs paid directly by client.",
    });
  }

  const totalUpfront = platformSetup + moduleActivationTotal + websiteBuildFee + appStoreLaunchFee;
  const totalMonthly = platformMonthly + moduleMonthlyTotal;

  return {
    businessOperationType: opType,
    isFinancial: financial,
    platformSetup,
    platformMonthly,
    moduleActivationFees: moduleActivationTotal,
    moduleMonthlyFees: moduleMonthlyTotal,
    websiteBuildFee,
    appStoreLaunchFee,
    hardCostNotes,
    totalUpfront,
    totalMonthly,
    lineItems,
    pricingSummary: `Setup: $${totalUpfront.toLocaleString()} | Monthly: $${totalMonthly.toLocaleString()}/mo`,
    pricingVisibility: "admin_only",
  };
}

// ═══════════════════════════════════════════════
// Proposal-Ready Quote Object
// ═══════════════════════════════════════════════

export interface ProposalQuote {
  workspaceProfileSummary: {
    industry: string;
    niche: string | null;
    archetype: string;
    zoomTier: string;
    operationType: string;
  };
  quote: QuoteOutput;
  waiverFlags: {
    activationFeesWaived: boolean;
  };
  proposalNotes: string[];
  createdAt: string;
}

export function buildProposalQuote(input: QuoteInput): ProposalQuote {
  const quote = computeQuote(input);

  return {
    workspaceProfileSummary: {
      industry: input.workspaceProfile.industry,
      niche: input.workspaceProfile.niche,
      archetype: input.workspaceProfile.archetype,
      zoomTier: input.workspaceProfile.zoomTier,
      operationType: quote.businessOperationType,
    },
    quote,
    waiverFlags: {
      activationFeesWaived: input.hasPurchasedPlatformSetup,
    },
    proposalNotes: [
      "Pricing revealed during final meeting only.",
      ...quote.hardCostNotes.map((n) => `Hard cost: ${n}`),
      ...(input.includeAppStoreLaunchUpgrade
        ? ["Includes Apple App Store + Google Play submission, branding, configuration, approval handling, testing, and launch."]
        : []),
    ],
    createdAt: new Date().toISOString(),
  };
}
