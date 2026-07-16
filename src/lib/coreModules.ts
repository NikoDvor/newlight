// Shared core-module registry + niche-based recommendation logic.
// Kept in sync with the 8 core modules used by ProposalOfferBuilder.
import type { NicheDefinition } from "@/lib/workspaceNiches";

export interface CoreModuleDef {
  key: string;
  label: string;
  desc: string;
}

export const CORE_MODULES: CoreModuleDef[] = [
  { key: "paid_ads", label: "Paid Ads System", desc: "Google & Meta ad management with attribution" },
  { key: "seo", label: "SEO System", desc: "Organic search optimization & local rankings" },
  { key: "website_management", label: "Website System", desc: "Conversion-optimized website management" },
  { key: "crm_automation", label: "CRM Automation", desc: "Pipeline, contact management & lead scoring" },
  { key: "lifecycle_nurture", label: "Lifecycle Nurture", desc: "Automated nurture + dormant client reactivation" },
  { key: "reputation_reviews", label: "Reputation + Reviews", desc: "Review generation, monitoring & response" },
  { key: "tracking_attribution", label: "Tracking + Attribution", desc: "Call tracking, analytics & channel attribution" },
  { key: "financial_compliance", label: "Financial Compliance", desc: "Compliance workflow & regulatory tracking" },
];

/**
 * Compute recommended module keys for a niche using its modulePriority
 * (priority >= 4 = recommended). Mirrors the logic in ProposalOfferBuilder.tsx.
 */
export function getRecommendedModulesForNiche(niche: NicheDefinition | null | undefined): string[] {
  if (!niche) return [];
  const p = niche.modulePriority;
  const map: Record<string, number> = {
    paid_ads: p.ads,
    seo: p.seo,
    website_management: p.website,
    crm_automation: p.crm,
    lifecycle_nurture: p.automation,
    reputation_reviews: 3,
    tracking_attribution: 3,
    financial_compliance: niche.complianceLevel === "high" ? 5 : niche.complianceLevel === "moderate" ? 3 : 1,
  };
  return Object.entries(map).filter(([, v]) => v >= 4).map(([k]) => k);
}
