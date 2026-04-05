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
  next90Days: string;
  focusOutcomes: string[];
  whyThisPackage: string;
  whatItSolves: string;
  afterActivation: string;
}

// ── Niche-specific bottlenecks ──
const NICHE_BOTTLENECKS: Record<string, string> = {
  med_spa: "lost reactivation revenue from dormant clients, low consultation show rates, and inconsistent post-treatment follow-up",
  dentist: "weak local search visibility, manual recall systems, and low review volume compared to competitors",
  financial_advisor: "compliance-risky manual outreach, slow prospect nurture, and untracked referral pipelines",
  wealth_management: "fragmented client communication, manual compliance tracking, and missed relationship touchpoints at scale",
  law_firm_general: "slow intake response times, untracked consultation-to-retainer conversion, and referral source blindness",
  personal_injury_law: "unattributed ad spend on high-value cases, slow intake processing, and manual case qualification",
  hvac: "missed calls during peak demand, zero follow-up on unsold estimates, and weak local search rankings",
  plumbing: "slow speed-to-lead on emergency calls, thin online review presence, and no reactivation for past customers",
  roofing: "long estimate-to-close gaps without follow-up, weak online credibility for high-ticket decisions, and seasonal pipeline drops",
  marketing_agency: "proposal bottlenecks, leaky sales pipeline, and no automated lead nurture between touchpoints",
  consulting_firm: "prospect drift during long sales cycles, inconsistent thought leadership distribution, and manual CRM updates",
  creative_agency: "feast-or-famine project pipeline, reliance on referrals only, and no systematic lead generation",
  fitness_gym: "high member churn without reactivation, low review volume, and ineffective local advertising",
  real_estate_agent: "slow lead response time, inconsistent follow-up across deal stages, and low sphere-of-influence nurture",
  shopify_brand: "rising CAC without retention strategy, low repeat purchase rate, and unoptimized ad attribution",
  chiropractor: "patient drop-off after initial visits, weak local SEO compared to competing practices, and no recall automation",
  cpa_accounting: "missed seasonal prospecting windows, manual client communication, and no referral tracking",
  insurance_agency: "manual renewal tracking, missed cross-sell timing, and inconsistent new policy lead flow",
  business_coaching: "high discovery call no-show rates, weak authority positioning, and manual client enrollment process",
  plastic_surgery: "long research cycles without nurture, high ad costs with poor attribution, and reputation management gaps",
};

// ── Niche-specific 90-day priorities ──
const NICHE_90_DAY: Record<string, string> = {
  med_spa: "Launch reactivation campaigns for dormant clients, optimize consultation booking flow, and build review volume to 50+",
  dentist: "Dominate 'dentist near me' local search, automate patient recall, and reach 4.8+ average rating",
  financial_advisor: "Implement compliance-safe CRM, launch automated prospect nurture, and track referral sources systematically",
  wealth_management: "Deploy enterprise CRM workflows, establish automated client touchpoints, and build compliance audit trail",
  law_firm_general: "Reduce intake response time to <5 minutes, track consultation-to-retainer conversion, and automate referral attribution",
  personal_injury_law: "Launch attributed paid ad campaigns, automate intake qualification, and implement call tracking across all channels",
  hvac: "Rank top-3 for local HVAC searches, implement missed call auto-response, and launch seasonal reactivation campaigns",
  plumbing: "Achieve first-page local rankings, implement instant lead response, and build review volume to 100+",
  roofing: "Automate estimate follow-up sequences, build credibility with 50+ reviews, and fill pre-season pipeline",
  marketing_agency: "Implement sales pipeline tracking, reduce proposal turnaround to <24 hours, and automate lead nurture between meetings",
  consulting_firm: "Build content-driven nurture sequences, implement CRM pipeline stages, and automate meeting scheduling",
  fitness_gym: "Launch lapsed member reactivation, implement trial-to-membership automation, and boost review collection",
  real_estate_agent: "Implement speed-to-lead automation, build sphere nurture campaigns, and systematize review collection post-close",
  shopify_brand: "Optimize ad attribution, launch repeat purchase email flows, and improve site conversion rate by 0.5%+",
  insurance_agency: "Automate renewal reminders, implement cross-sell triggers, and launch referral incentive tracking",
  business_coaching: "Reduce discovery call no-shows by 50%, launch authority content sequence, and automate enrollment workflow",
};

// ── Niche-specific focus outcomes ──
const NICHE_FOCUS_OUTCOMES: Record<string, string[]> = {
  med_spa: [
    "Automated consultation booking with pre-qualification",
    "Dormant client reactivation generating 15–30% rebookings",
    "Post-treatment follow-up sequences increasing retention",
    "Review generation reaching 4.8+ average rating",
  ],
  dentist: [
    "Local SEO dominance for 'dentist near me' searches",
    "Automated patient recall reducing no-shows by 40%",
    "Review volume growth outpacing competing practices",
  ],
  financial_advisor: [
    "Compliance-safe automated prospect nurture sequences",
    "CRM pipeline tracking every prospect from referral to AUM",
    "Advisor workflow automating routine client communications",
  ],
  wealth_management: [
    "Enterprise-grade CRM with compliance audit trails",
    "Automated quarterly review scheduling and preparation",
    "Multi-advisor pipeline visibility and attribution",
  ],
  law_firm_general: [
    "Sub-5-minute intake response automation",
    "Consultation-to-retainer conversion tracking",
    "Referral source attribution across all channels",
  ],
  personal_injury_law: [
    "High-value case attribution across all ad channels",
    "Automated intake screening and qualification workflow",
    "Call tracking and recording for case documentation",
  ],
  hvac: [
    "Local lead capture ranking top-3 in service area",
    "Missed call auto-response recovering 40%+ of lost calls",
    "Seasonal dispatch-ready CRM with job tracking",
  ],
  plumbing: [
    "Emergency call speed-to-lead automation",
    "Local SEO ranking for high-intent service searches",
    "Automated review requests after completed jobs",
  ],
  roofing: [
    "Automated estimate follow-up closing more high-ticket jobs",
    "Review credibility system for homeowner trust",
    "Seasonal pipeline management preventing revenue gaps",
  ],
  marketing_agency: [
    "Sales pipeline clarity with deal stage tracking",
    "Proposal automation reducing turnaround to hours",
    "Automated lead nurture between sales touchpoints",
  ],
  consulting_firm: [
    "Thought leadership content distribution automation",
    "Long-cycle prospect nurture preventing deal drift",
    "Consultation scheduling with pre-meeting intelligence",
  ],
  fitness_gym: [
    "Lapsed member reactivation campaign automation",
    "Trial-to-membership conversion optimization",
    "Local ad campaigns targeting high-intent gym seekers",
  ],
  shopify_brand: [
    "Paid ad optimization with full-funnel attribution",
    "Repeat purchase automation increasing LTV by 25%+",
    "Website conversion rate optimization",
  ],
  insurance_agency: [
    "Automated renewal reminder sequences reducing churn",
    "Cross-sell trigger campaigns based on policy lifecycle",
    "New policy lead generation through targeted ads",
  ],
  business_coaching: [
    "Discovery call booking with automated confirmation/reminders",
    "Authority positioning through content distribution",
    "Client enrollment workflow with payment integration",
  ],
  real_estate_agent: [
    "Speed-to-lead response within 60 seconds",
    "Sphere-of-influence automated nurture campaigns",
    "Post-close review collection and referral triggers",
  ],
};

const OP_TYPE_OPPORTUNITIES: Record<string, string> = {
  field_service: "reducing no-shows, automating dispatch-to-invoice cycles, and capturing every inbound call",
  appointment_local: "filling calendar gaps, converting walk-ins to loyal repeat clients, and reactivating dormant revenue",
  consultative_sales: "shortening close cycles, increasing proposal-to-contract conversion, and systematizing follow-up",
  membership_recurring: "reducing churn, maximizing lifetime value per member, and automating re-engagement",
  project_service: "improving project pipeline velocity, increasing average project value, and preventing revenue gaps",
  custom_hybrid: "unifying multiple revenue channels into a single growth system with cross-sell automation",
};

const OP_TYPE_BOTTLENECKS: Record<string, string> = {
  field_service: "manual scheduling, missed follow-ups, and inconsistent review collection after service visits",
  appointment_local: "low online visibility, poor post-appointment nurture, and lack of reactivation for dormant clients",
  consultative_sales: "long sales cycles, untracked proposal engagement, and manual follow-up sequences",
  membership_recurring: "member disengagement, lack of automated retention campaigns, and inconsistent upsell timing",
  project_service: "project scope creep without revenue capture, inconsistent lead-to-project handoff, and weak referral generation",
  custom_hybrid: "fragmented systems, inconsistent client experience across service lines, and poor cross-sell automation",
};

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

  const rationales = selectedModules
    .filter(m => MODULE_RATIONALE[m])
    .map(m => MODULE_RATIONALE[m]);

  const moduleRationale = rationales.length > 0
    ? rationales.join(". ") + "."
    : "Selected modules address the core growth levers for this business model.";

  const nicheKey = profile.niche ?? "";
  const bottlenecks = NICHE_BOTTLENECKS[nicheKey]
    ?? OP_TYPE_BOTTLENECKS[opType]
    ?? "manual processes, missed follow-ups, and untracked revenue opportunities";

  const prioritySystems = niche
    ? Object.entries(niche.modulePriority)
        .filter(([, v]) => v >= 4)
        .map(([k]) => k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()))
        .join(", ") || "CRM, Automation"
    : "CRM, Automation";

  const next90Days = NICHE_90_DAY[nicheKey]
    ?? `Implement core growth systems, launch lead capture, and establish tracking across all channels`;

  const focusOutcomes = NICHE_FOCUS_OUTCOMES[nicheKey]
    ?? [
      "Systematic lead capture across all channels",
      "Automated follow-up reducing response time",
      "Revenue attribution across marketing spend",
    ];

  const whyThisPackage = `This package was designed specifically for ${businessLabel} businesses operating as a ${opLabel.toLowerCase()} model. ${
    financial
      ? "It includes compliance-grade workflows and audit-ready tracking that financial firms require."
      : `It prioritizes the systems that drive the most revenue for ${opLabel.toLowerCase()} businesses — ${prioritySystems.toLowerCase()}.`
  }`;

  const whatItSolves = `The primary challenges for ${businessLabel} are ${bottlenecks}. This system addresses each of these directly with purpose-built automation and intelligence.`;

  const afterActivation = `After activation, your team gets immediate access to a fully configured growth system. Within the first 30 days, core automations go live. By day 60, lead flow and tracking are established. By day 90, you'll have data-driven insights guiding every growth decision.`;

  return {
    headline,
    opportunity: `The primary growth opportunity is ${opportunity}.`,
    prioritySystems: `Priority systems: ${prioritySystems}.`,
    bottlenecks: `Key bottlenecks to solve: ${bottlenecks}.`,
    moduleRationale,
    next90Days,
    focusOutcomes,
    whyThisPackage,
    whatItSolves,
    afterActivation,
  };
}
