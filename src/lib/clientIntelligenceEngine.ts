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

// ── Niche-specific opportunity summaries ──
const NICHE_OPPORTUNITY: Record<string, { summary: string; lever: string; urgency: string }> = {
  med_spa: {
    summary: "High-ticket consultations with long client lifetime value make automation and reactivation extremely profitable",
    lever: "Automated consultation booking + dormant client reactivation",
    urgency: "Every week without follow-up automation costs 3–5 lost rebookings",
  },
  dentist: {
    summary: "Consistent local search demand and repeat visit patterns create reliable revenue when captured correctly",
    lever: "Local SEO dominance + automated recall/reactivation system",
    urgency: "Patients searching 'dentist near me' are choosing competitors with stronger online presence",
  },
  financial_advisor: {
    summary: "Long sales cycles and high AUM make every qualified lead extremely valuable — CRM discipline is critical",
    lever: "Compliance-safe CRM + automated nurture sequences",
    urgency: "Manual follow-up at scale causes compliance risk and lost high-value prospects",
  },
  wealth_management: {
    summary: "Ultra-high-value client relationships require institutional-grade tracking and communication workflows",
    lever: "Enterprise CRM + advisor workflow automation + compliance tracking",
    urgency: "A single missed follow-up could mean six-figure AUM lost to competitors",
  },
  law_firm_general: {
    summary: "Case intake velocity and consultation-to-retainer conversion drive firm growth most directly",
    lever: "Intake automation + consultation booking + pipeline tracking",
    urgency: "Untracked leads from web and referrals are converting at competitors",
  },
  personal_injury_law: {
    summary: "Extreme case values justify aggressive lead acquisition — tracking and attribution are essential",
    lever: "Paid ads + call tracking + intake attribution system",
    urgency: "Without attribution, ad spend on high-value cases is unoptimized",
  },
  hvac: {
    summary: "Seasonal demand spikes and emergency calls create predictable lead patterns that automation captures best",
    lever: "Local SEO + paid ads + missed call follow-up automation",
    urgency: "Every missed call during peak season is a $500–$2,000 lost job",
  },
  plumbing: {
    summary: "Emergency and routine service calls create consistent demand — speed to respond wins the job",
    lever: "SEO + speed-to-lead automation + review generation",
    urgency: "Homeowners call the first 3 results — without SEO and reviews you're invisible",
  },
  roofing: {
    summary: "High-ticket projects with long decision cycles need pipeline tracking and systematic follow-up",
    lever: "Lead tracking + proposal automation + review credibility",
    urgency: "Proposals sent without follow-up automation close at half the rate",
  },
  marketing_agency: {
    summary: "Pipeline clarity and proposal velocity directly impact revenue — most agencies leak deals in follow-up",
    lever: "CRM pipeline + proposal automation + client reporting",
    urgency: "Agencies losing 20%+ of qualified leads to slow proposal turnaround",
  },
  consulting_firm: {
    summary: "High-value engagements require trust-building content and systematic relationship nurture",
    lever: "CRM + content-driven nurture + consultation booking",
    urgency: "Long sales cycles without automated touchpoints result in prospect drift",
  },
  creative_agency: {
    summary: "Project-based revenue needs consistent pipeline flow — most creative agencies feast or famine",
    lever: "Lead generation + CRM pipeline + portfolio website optimization",
    urgency: "Gaps between projects erode profitability and team stability",
  },
  fitness_gym: {
    summary: "Member acquisition cost is high — retention and reactivation of lapsed members is the highest-ROI activity",
    lever: "Membership reactivation + review generation + local ads",
    urgency: "Dormant members who don't hear from you in 30 days rarely return organically",
  },
  real_estate_agent: {
    summary: "Relationship-driven business where systematic follow-up separates top producers from average agents",
    lever: "CRM automation + lead nurture + review credibility",
    urgency: "Speed-to-lead response time determines who wins the listing appointment",
  },
  shopify_brand: {
    summary: "Conversion rate optimization and repeat purchase automation drive profitability more than raw traffic",
    lever: "Paid ads + website optimization + lifecycle email automation",
    urgency: "Customer acquisition costs are rising — repeat purchase rate is the profit lever",
  },
  chiropractor: {
    summary: "Appointment-based revenue with high repeat visit potential makes reactivation extremely valuable",
    lever: "SEO + appointment booking + patient reactivation",
    urgency: "Patients who miss 2+ visits without contact rarely return without outreach",
  },
  cpa_accounting: {
    summary: "Seasonal peaks and ongoing retainer relationships benefit from systematic client communication",
    lever: "CRM + client lifecycle nurture + referral automation",
    urgency: "Tax season prospecting without automation misses the annual window",
  },
  insurance_agency: {
    summary: "Policy renewals and cross-sell timing are predictable — automation captures revenue that manual tracking misses",
    lever: "CRM + lifecycle nurture + cross-sell automation",
    urgency: "Renewal reminders sent manually have 40% lower retention than automated sequences",
  },
  web_design_agency: {
    summary: "Project pipeline gaps are the #1 revenue killer — consistent lead flow prevents feast-or-famine cycles",
    lever: "SEO + portfolio website + CRM pipeline management",
    urgency: "Without inbound lead systems, agencies rely on referrals which are unpredictable",
  },
  it_services: {
    summary: "Managed service contracts have high LTV — winning the initial assessment is the growth bottleneck",
    lever: "CRM + automated assessment booking + client portal",
    urgency: "IT decision-makers research heavily — without content and reviews, you lose to larger MSPs",
  },
  landscaping: {
    summary: "Seasonal demand and neighborhood-based referrals create compounding growth when reviews and SEO are active",
    lever: "Local SEO + review generation + seasonal reactivation",
    urgency: "Spring booking windows close fast — late marketing means lost season revenue",
  },
  cleaning_company: {
    summary: "Repeat service revenue and referral potential make customer experience automation highly profitable",
    lever: "Booking automation + review requests + reactivation campaigns",
    urgency: "Customers who don't rebook within 60 days switch to competitors at 3x the rate",
  },
  general_contractor: {
    summary: "High-value projects with multi-month timelines require disciplined pipeline management and trust signals",
    lever: "CRM pipeline + review credibility + proposal tracking",
    urgency: "Homeowners check reviews and portfolios — weak online presence kills high-ticket leads",
  },
  business_coaching: {
    summary: "Authority positioning and consultation booking velocity determine growth rate for coaching businesses",
    lever: "Content marketing + booking system + CRM automation",
    urgency: "Without systematic nurture, discovery call no-shows waste your most valuable asset — time",
  },
  plastic_surgery: {
    summary: "Ultra-high-ticket procedures with long consideration phases require sophisticated nurture and trust-building",
    lever: "Paid ads + consultation booking + reputation management",
    urgency: "Patients research for months — the practice that stays top-of-mind wins the procedure",
  },
  dermatology: {
    summary: "Mix of medical necessity and elective procedures creates dual revenue streams that benefit from segmented marketing",
    lever: "Segmented ads + SEO + patient reactivation",
    urgency: "Cosmetic dermatology patients are highly influenced by reviews and before/after content",
  },
};

// ── Fallback opportunity logic by operation type ──
const OP_TYPE_DEFAULTS: Record<string, { summary: string; lever: string; urgency: string }> = {
  field_service: {
    summary: "Service-based businesses with recurring demand benefit most from local visibility and dispatch efficiency",
    lever: "Local SEO + CRM + automated scheduling",
    urgency: "Every missed call or delayed response sends revenue to the next search result",
  },
  appointment_local: {
    summary: "Appointment-driven revenue scales with booking volume and client retention rates",
    lever: "Online booking + reactivation automation + review generation",
    urgency: "Dormant clients who don't hear from you within 30 days rarely return",
  },
  consultative_sales: {
    summary: "High-value engagements require systematic pipeline management and trust-building throughout long cycles",
    lever: "CRM pipeline + automated nurture + proposal velocity",
    urgency: "Slow follow-up on qualified leads costs more per lost deal than any other business type",
  },
  membership_recurring: {
    summary: "Recurring revenue businesses live or die by churn rate — retention automation is the highest-ROI investment",
    lever: "Member engagement + churn prevention + reactivation campaigns",
    urgency: "Every 1% reduction in monthly churn compounds to significant annual revenue",
  },
  project_service: {
    summary: "Project-based businesses need consistent pipeline flow to prevent revenue gaps between engagements",
    lever: "Lead generation + pipeline tracking + proposal automation",
    urgency: "Most project businesses have 2–3 month lead-to-close cycles — empty pipeline now means no revenue in Q3",
  },
  custom_hybrid: {
    summary: "Multi-channel businesses benefit from unified systems that prevent lead leakage across service lines",
    lever: "Unified CRM + cross-sell automation + attribution tracking",
    urgency: "Fragmented systems cause 15–30% of cross-sell opportunities to go undetected",
  },
};

export function generateClientIntelligence(profile: WorkspaceProfile): ClientIntelligenceOutput {
  const niche: NicheDefinition | undefined = profile.niche
    ? NICHE_REGISTRY.find((n) => n.id === profile.niche)
    : undefined;

  const zm = ZOOM_MULTIPLIER[profile.zoomTier];
  const opType = resolveOperationType(profile.archetype, profile.industry);
  const financial = isFinancialFirm(profile.industry);

  // Revenue opportunity — use niche-aware ranges with zoom scaling
  const baseRange = niche?.demoDataProfile?.startingRevenueRange ?? [80_000, 250_000];
  // Add a believability boost for higher-tier niches
  const tierBoost = niche?.ticketSize === "very_high" ? 1.3 : niche?.ticketSize === "high" ? 1.15 : 1.0;
  const low = Math.round(baseRange[0] * zm * tierBoost);
  const high = Math.round(baseRange[1] * zm * tierBoost);
  const revenueOpportunity = `${formatRevenue(low)} – ${formatRevenue(high)}`;

  // Insights — more for complex/regulated niches
  const complexityBonus = niche?.complexityLevel === "enterprise" ? 12 : niche?.complexityLevel === "high" ? 8 : niche?.complexityLevel === "medium" ? 4 : 2;
  const complianceBonus = niche?.complianceLevel === "high" ? 5 : niche?.complianceLevel === "moderate" ? 2 : 0;
  const insightsGenerated = Math.round((6 + complexityBonus + complianceBonus) * zm);

  // Automations — more for automation-heavy niches
  const baseAutomations = niche
    ? (niche.modulePriority.automation >= 5 ? 18 : niche.modulePriority.automation >= 4 ? 14 : 9)
    : 10;
  const automationsSuggested = Math.round(baseAutomations * zm);

  // Growth % — calibrated by niche characteristics
  const baseGrowth = financial ? 38
    : niche?.ticketSize === "very_high" ? 35
    : opType === "consultative_sales" ? 32
    : opType === "membership_recurring" ? 28
    : 25;
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

  // Niche-specific narrative
  const nicheKey = profile.niche ?? "";
  const nicheData = NICHE_OPPORTUNITY[nicheKey] ?? OP_TYPE_DEFAULTS[opType] ?? OP_TYPE_DEFAULTS.custom_hybrid;

  return {
    revenueOpportunity,
    insightsGenerated,
    automationsSuggested,
    growthPotentialPct,
    moduleEmphasis,
    businessComplexityLabel,
    complianceSensitivityLabel,
    estimateLabel: "Estimated opportunity until final setup",
    nicheOpportunitySummary: nicheData.summary,
    primaryGrowthLever: nicheData.lever,
    urgencySignal: nicheData.urgency,
  };
}
