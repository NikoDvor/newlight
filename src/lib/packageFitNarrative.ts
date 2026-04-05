// ── Package Fit Narrative Generator ──
// Generates a strategic explanation of why selected modules fit this business.

import type { WorkspaceProfile } from "@/lib/workspaceProfileTypes";
import { NICHE_REGISTRY } from "@/lib/workspaceNiches";
import { resolveOperationType, BUSINESS_OPERATION_TYPES, isFinancialFirm } from "@/lib/businessOperationTypes";
import { INDUSTRY_CATEGORIES } from "@/lib/workspaceProfileTypes";

export interface PackageFitNarrative {
  headline: string;
  opportunity: string;
  prioritySystems: string;
  bottlenecks: string;
  moduleRationale: string;
}

const OP_TYPE_OPPORTUNITIES: Record<string, string> = {
  field_service: "reducing no-shows and automating dispatch-to-invoice cycles",
  appointment_local: "filling calendar gaps and converting walk-ins to loyal repeat clients",
  consultative_sales: "shortening close cycles and increasing proposal-to-contract conversion rates",
  membership_recurring: "reducing churn and maximizing lifetime value per member",
  project_service: "improving project pipeline velocity and increasing average project value",
  custom_hybrid: "unifying multiple revenue channels into a single growth system",
};

const OP_TYPE_BOTTLENECKS: Record<string, string> = {
  field_service: "manual scheduling, missed follow-ups, and inconsistent review collection after service visits",
  appointment_local: "low online visibility, poor post-appointment nurture, and lack of reactivation for dormant clients",
  consultative_sales: "long sales cycles, untracked proposal engagement, and manual follow-up sequences",
  membership_recurring: "member disengagement, lack of automated retention campaigns, and inconsistent upsell timing",
  project_service: "project scope creep without revenue capture, inconsistent lead-to-project handoff, and weak referral generation",
  custom_hybrid: "fragmented systems, inconsistent client experience across service lines, and poor cross-sell automation",
};

export function generatePackageFitNarrative(
  profile: WorkspaceProfile,
  selectedModules: string[]
): PackageFitNarrative {
  const niche = profile.niche ? NICHE_REGISTRY.find(n => n.id === profile.niche) : undefined;
  const industry = INDUSTRY_CATEGORIES.find(c => c.value === profile.industry);
  const opType = resolveOperationType(profile.archetype, profile.industry);
  const opLabel = BUSINESS_OPERATION_TYPES.find(b => b.value === opType)?.label ?? opType;
  const financial = isFinancialFirm(profile.industry);

  const businessLabel = niche?.label ?? industry?.label ?? "this business";

  const headline = financial
    ? `A compliance-ready growth system built for ${businessLabel}`
    : `A tailored growth system designed for ${businessLabel}`;

  const opportunity = OP_TYPE_OPPORTUNITIES[opType] ?? "accelerating growth and improving operational efficiency";

  const moduleLabels: Record<string, string> = {
    paid_ads: "Paid Ads drives immediate lead volume",
    seo: "SEO builds compounding organic visibility",
    website_management: "Website System ensures every visitor converts",
    crm_automation: "CRM Automation captures and nurtures every lead",
    lifecycle_nurture: "Lifecycle Nurture reactivates dormant revenue",
    reputation_reviews: "Reputation System builds trust and local authority",
    tracking_attribution: "Tracking + Attribution proves ROI on every channel",
    financial_compliance: "Financial Compliance ensures regulatory safety",
  };

  const rationales = selectedModules
    .filter(m => moduleLabels[m])
    .map(m => moduleLabels[m]);

  const moduleRationale = rationales.length > 0
    ? rationales.join(". ") + "."
    : "Selected modules address the core growth levers for this business model.";

  const bottlenecks = OP_TYPE_BOTTLENECKS[opType] ?? "manual processes, missed follow-ups, and untracked revenue opportunities";

  const prioritySystems = niche
    ? Object.entries(niche.modulePriority)
        .filter(([, v]) => v >= 4)
        .map(([k]) => k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()))
        .join(", ") || "CRM, Automation"
    : "CRM, Automation";

  return {
    headline,
    opportunity: `The primary growth opportunity is ${opportunity}.`,
    prioritySystems: `Priority systems: ${prioritySystems}.`,
    bottlenecks: `Key bottlenecks to solve: ${bottlenecks}.`,
    moduleRationale,
  };
}
