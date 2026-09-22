// ── Package Fit Narrative Generator ──
// Generates a strategic explanation of why selected modules fit this business.
// Single vertical: financial firms.

import type { WorkspaceProfile } from "@/lib/workspaceProfileTypes";

export interface PackageFitNarrative {
  headline: string;
  opportunity: string;
  prioritySystems: string;
  bottlenecks: string;
  moduleRationale: string;
  next90Days: string;
  focusOutcomes: string[];
  whyThisPackage: string;
  whatItSolves: string;
  afterActivation: string;
}

// ── Financial firm specific copy (preserved from the niche registry) ──
const FINANCIAL_BOTTLENECKS =
  "compliance-risky manual outreach, slow prospect nurture, fragmented client communication, and untracked referral pipelines";

const FINANCIAL_OPPORTUNITY =
  "shortening close cycles, increasing proposal-to-contract conversion, and systematizing compliant follow-up at scale";

const FINANCIAL_90_DAY =
  "Implement a compliance-safe CRM, launch automated prospect nurture, systematize referral source tracking, and establish audit-ready client touchpoints";

const FINANCIAL_FOCUS_OUTCOMES = [
  "Compliance-safe automated prospect nurture sequences",
  "CRM pipeline tracking every prospect from referral to AUM",
  "Automated review scheduling and client touchpoint cadence",
  "Referral and marketing attribution with an audit trail",
];

const FINANCIAL_PRIORITY_SYSTEMS = "CRM, Automation, AI Insights, Website";

const MODULE_RATIONALE: Record<string, string> = {
  paid_ads: "Paid Ads drives immediate qualified lead volume with measurable ROI",
  seo: "SEO builds compounding organic visibility that reduces long-term acquisition costs",
  website_management: "Website System ensures every visitor encounters a conversion-optimized experience",
  crm_automation: "CRM Automation captures, scores, and nurtures every lead without manual effort",
  lifecycle_nurture: "Lifecycle Nurture reactivates dormant clients — your highest-ROI revenue source",
  reputation_reviews: "Reputation System builds the trust and social proof that closes deals before your team speaks",
  tracking_attribution: "Tracking + Attribution proves ROI on every channel and eliminates wasted spend",
  financial_compliance: "Financial Compliance ensures every client interaction meets regulatory requirements",
};

export function generatePackageFitNarrative(
  _profile: WorkspaceProfile,
  selectedModules: string[]
): PackageFitNarrative {
  const businessLabel = "financial firms";

  const rationales = selectedModules
    .filter((m) => MODULE_RATIONALE[m])
    .map((m) => MODULE_RATIONALE[m]);

  const moduleRationale = rationales.length > 0
    ? rationales.join(". ") + "."
    : "Selected modules address the core growth levers for a financial firm.";

  return {
    headline: "A compliance-ready growth system built for financial firms",
    opportunity: `The primary growth opportunity is ${FINANCIAL_OPPORTUNITY}.`,
    prioritySystems: `Priority systems: ${FINANCIAL_PRIORITY_SYSTEMS}.`,
    bottlenecks: `Key bottlenecks to solve: ${FINANCIAL_BOTTLENECKS}.`,
    moduleRationale,
    next90Days: FINANCIAL_90_DAY,
    focusOutcomes: FINANCIAL_FOCUS_OUTCOMES,
    whyThisPackage:
      "This package was designed specifically for financial firms. It includes compliance-grade workflows and audit-ready tracking that regulated advisory practices require.",
    whatItSolves: `The primary challenges for ${businessLabel} are ${FINANCIAL_BOTTLENECKS}. This system addresses each of these directly with purpose-built automation and intelligence.`,
    afterActivation:
      "After activation, your team gets immediate access to a fully configured growth system. Within the first 30 days, core automations go live. By day 60, lead flow and tracking are established. By day 90, you'll have data-driven insights guiding every growth decision.",
  };
}
