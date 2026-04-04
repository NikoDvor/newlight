// ── Client-Facing Demo Intelligence Engine ──
// Generates opportunity-framing metrics from the workspace profile.
// NO pricing is ever exposed from this engine.

import type { WorkspaceProfile, ZoomTier } from "@/lib/workspaceProfileTypes";
import { NICHE_REGISTRY, type NicheDefinition } from "@/lib/workspaceNiches";
import { resolveOperationType, isFinancialFirm } from "@/lib/businessOperationTypes";

export interface ClientIntelligenceOutput {
  revenueOpportunity: string;
  insightsGenerated: number;
  automationsSuggested: number;
  growthPotentialPct: number;
  moduleEmphasis: Record<string, number>;
  businessComplexityLabel: string;
  complianceSensitivityLabel: string;
  estimateLabel: string;
}

const ZOOM_MULTIPLIER: Record<ZoomTier, number> = {
  z1: 0.6, z2: 1.0, z3: 1.6, z4: 2.4, z5: 3.5,
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

export function generateClientIntelligence(profile: WorkspaceProfile): ClientIntelligenceOutput {
  const niche: NicheDefinition | undefined = profile.niche
    ? NICHE_REGISTRY.find((n) => n.id === profile.niche)
    : undefined;

  const zm = ZOOM_MULTIPLIER[profile.zoomTier];
  const opType = resolveOperationType(profile.archetype, profile.industry);
  const financial = isFinancialFirm(profile.industry);

  // Revenue opportunity from demo data profile
  const baseRange = niche?.demoDataProfile?.startingRevenueRange ?? [80_000, 250_000];
  const low = Math.round(baseRange[0] * zm);
  const high = Math.round(baseRange[1] * zm);
  const revenueOpportunity = `${formatRevenue(low)} – ${formatRevenue(high)}`;

  // Insights count
  const complexityBonus = niche?.complexityLevel === "enterprise" ? 8 : niche?.complexityLevel === "high" ? 5 : 2;
  const insightsGenerated = Math.round((6 + complexityBonus) * zm);

  // Automations
  const baseAutomations = niche ? (niche.modulePriority.automation >= 4 ? 12 : 7) : 8;
  const automationsSuggested = Math.round(baseAutomations * zm);

  // Growth %
  const baseGrowth = financial ? 35 : opType === "consultative_sales" ? 30 : 25;
  const growthPotentialPct = Math.min(95, Math.round(baseGrowth * zm));

  // Module emphasis (1-5 scale from niche or defaults)
  const mp = niche?.modulePriority ?? { crm: 4, ads: 3, seo: 3, website: 3, automation: 4, aiInsights: 3 };
  const moduleEmphasis: Record<string, number> = {
    CRM: mp.crm,
    "Paid Ads": mp.ads,
    SEO: mp.seo,
    Website: mp.website,
    Automation: mp.automation,
    "AI Insights": mp.aiInsights,
  };

  const businessComplexityLabel = COMPLEXITY_LABELS[niche?.complexityLevel ?? profile.metadata.complexityLevel] ?? "Moderate";
  const complianceSensitivityLabel = COMPLIANCE_LABELS[niche?.complianceLevel ?? profile.metadata.complianceLevel] ?? "Standard";

  return {
    revenueOpportunity,
    insightsGenerated,
    automationsSuggested,
    growthPotentialPct,
    moduleEmphasis,
    businessComplexityLabel,
    complianceSensitivityLabel,
    estimateLabel: "Estimated opportunity until final setup",
  };
}
