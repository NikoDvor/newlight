// ── Client-Facing Demo Intelligence Engine ──
// Generates opportunity-framing metrics from the workspace profile.
// Single vertical: financial firms. NO pricing is ever exposed from this engine.

import type { WorkspaceProfile, ZoomTier } from "@/lib/workspaceProfileTypes";

export interface ClientIntelligenceOutput {
  revenueOpportunity: string;
  insightsGenerated: number;
  automationsSuggested: number;
  growthPotentialPct: number;
  moduleEmphasis: Record<string, number>;
  businessComplexityLabel: string;
  complianceSensitivityLabel: string;
  estimateLabel: string;
  nicheOpportunitySummary: string;
  primaryGrowthLever: string;
  urgencySignal: string;
}

const ZOOM_MULTIPLIER: Record<ZoomTier, number> = {
  z1: 0.7, z2: 1.0, z3: 1.5, z4: 2.2, z5: 3.2,
};

const COMPLEXITY_LABELS: Record<string, string> = {
  low: "Streamlined",
  medium: "Moderate",
  high: "Advanced",
  enterprise: "Enterprise-Grade",
};

const COMPLIANCE_LABELS: Record<string, string> = {
  none: "Standard",
  moderate: "Regulated",
  high: "Highly Regulated",
};

function formatRevenue(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

// ── Financial firm opportunity framing (single vertical) ──
const FINANCIAL_FIRM_OPPORTUNITY = {
  summary:
    "Long sales cycles and high AUM make every qualified prospect extremely valuable — CRM discipline and compliance-safe follow-up are the growth levers",
  lever: "Compliance-safe CRM + automated prospect nurture + referral attribution",
  urgency:
    "Manual follow-up at scale creates compliance risk and quietly loses high-value prospects to competitors",
};

/** Revenue opportunity baseline for a financial firm before zoom scaling. */
const FINANCIAL_REVENUE_RANGE: [number, number] = [120_000, 400_000];

/** Module emphasis defaults for a financial firm (1–5). */
const FINANCIAL_MODULE_EMPHASIS = {
  crm: 5, ads: 3, seo: 4, website: 4, automation: 5, aiInsights: 4,
};

export function generateClientIntelligence(profile: WorkspaceProfile): ClientIntelligenceOutput {
  const zm = ZOOM_MULTIPLIER[profile.zoomTier] ?? 1;

  const low = Math.round(FINANCIAL_REVENUE_RANGE[0] * zm);
  const high = Math.round(FINANCIAL_REVENUE_RANGE[1] * zm);
  const revenueOpportunity = `${formatRevenue(low)} – ${formatRevenue(high)}`;

  // Financial firms are complex and highly regulated by definition
  const insightsGenerated = Math.round((6 + 8 + 5) * zm);
  const automationsSuggested = Math.round(18 * zm);
  const growthPotentialPct = Math.min(95, Math.round(38 * zm));

  const mp = FINANCIAL_MODULE_EMPHASIS;
  const moduleEmphasis: Record<string, number> = {
    CRM: mp.crm,
    "Paid Ads": mp.ads,
    SEO: mp.seo,
    Website: mp.website,
    Automation: mp.automation,
    "AI Insights": mp.aiInsights,
  };

  const businessComplexityLabel = COMPLEXITY_LABELS[profile.metadata?.complexityLevel ?? "high"] ?? "Advanced";
  const complianceSensitivityLabel = COMPLIANCE_LABELS[profile.metadata?.complianceLevel ?? "high"] ?? "Highly Regulated";

  return {
    revenueOpportunity,
    insightsGenerated,
    automationsSuggested,
    growthPotentialPct,
    moduleEmphasis,
    businessComplexityLabel,
    complianceSensitivityLabel,
    estimateLabel: "Estimated opportunity until final setup",
    nicheOpportunitySummary: FINANCIAL_FIRM_OPPORTUNITY.summary,
    primaryGrowthLever: FINANCIAL_FIRM_OPPORTUNITY.lever,
    urgencySignal: FINANCIAL_FIRM_OPPORTUNITY.urgency,
  };
}
