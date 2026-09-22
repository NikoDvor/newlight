// ── Admin-Only Internal Quote Engine ──
// Computes pricing for proposals and internal review.
// pricingVisibility is ALWAYS "admin_only" — never client-facing.

import type { WorkspaceProfile } from "@/lib/workspaceProfileTypes";
import { resolveOperationType, isFinancialFirm, type BusinessOperationType } from "@/lib/businessOperationTypes";

// ═══════════════════════════════════════════════
// Platform Pricing (INTERNAL) — financial firms only
// ═══════════════════════════════════════════════

/** $7,997 setup, then a flat $3,000/mo retainer (or commission billing instead). */
export const FINANCIAL_FIRM_PRICING = { setup: 7997, monthly: 3000 };

/** Billing model offered alongside the setup fee. */
export type PricingModel = "retainer" | "commission";

/** Commission billing: 25% of client revenue in year one, 10% every year after. */
export const COMMISSION_DEFAULTS = { yearOneRate: 25, ongoingRate: 10 };

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

const FINANCIAL_APP_STORE_ADDON = 2000;

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
  appStoreCustomAmount?: number | null;
  /** Billing model: flat retainer (default) or commission on client revenue */
  pricingModel?: PricingModel;
  /** Year-one commission rate (% of client revenue). Defaults to 25. */
  commissionYearOneRate?: number | null;
  /** Year-two-and-after commission rate (%). Defaults to 10. */
  commissionOngoingRate?: number | null;
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
  /** Which billing model this quote represents */
  pricingModel: PricingModel;
  /** Flat retainer amount for the retainer model ($3,000). 0 under commission. */
  retainerMonthly: number;
  /** Commission rates (always populated so a rep can show both options) */
  commissionYearOneRate: number;
  commissionOngoingRate: number;
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

  const pricingModel: PricingModel = input.pricingModel ?? "retainer";
  const commissionYearOneRate = input.commissionYearOneRate ?? COMMISSION_DEFAULTS.yearOneRate;
  const commissionOngoingRate = input.commissionOngoingRate ?? COMMISSION_DEFAULTS.ongoingRate;

  // ── Platform pricing (financial firms only) ──
  const platformBase = FINANCIAL_FIRM_PRICING;
  let platformSetup = platformBase.setup;
  const retainerMonthly = platformBase.monthly;
  const platformMonthly = pricingModel === "commission" ? 0 : retainerMonthly;

  const lineItems: QuoteLineItem[] = [];
  const hardCostNotes: string[] = [];

  // ── App Store Launch Upgrade (folded into Platform Setup) ──
  let appStoreLaunchFee = 0;
  if (includeAppStoreLaunchUpgrade) {
    const customAmt = input.appStoreCustomAmount ?? null;
    const hasCustomPrice = typeof customAmt === "number" && customAmt > 0;
    appStoreLaunchFee = hasCustomPrice ? customAmt : FINANCIAL_APP_STORE_ADDON;
    platformSetup += appStoreLaunchFee;
  }

  lineItems.push({
    category: "platform",
    label: "Platform Setup — Financial Firms",
    upfront: platformSetup,
    monthly: platformMonthly,
    notes: pricingModel === "commission"
      ? `Commission billing: ${commissionYearOneRate}% of revenue in year one, ${commissionOngoingRate}% each year after (no flat retainer).`
      : `Flat retainer: $${retainerMonthly.toLocaleString()}/mo.`,
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

  const totalUpfront = platformSetup + moduleActivationTotal + websiteBuildFee;
  const totalMonthly = platformMonthly + moduleMonthlyTotal;

  return {
    businessOperationType: opType,
    isFinancial: financial,
    pricingModel,
    retainerMonthly,
    commissionYearOneRate,
    commissionOngoingRate,
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
    pricingSummary: pricingModel === "commission"
      ? `Setup: $${totalUpfront.toLocaleString()} | Commission: ${commissionYearOneRate}% year one, ${commissionOngoingRate}% after${moduleMonthlyTotal > 0 ? ` | Modules: $${moduleMonthlyTotal.toLocaleString()}/mo` : ""}`
      : `Setup: $${totalUpfront.toLocaleString()} | Monthly: $${totalMonthly.toLocaleString()}/mo`,
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
