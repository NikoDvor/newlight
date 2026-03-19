/**
 * Recommended Services Engine
 * Evaluates workspace state and produces ranked service recommendations
 * with projected revenue impact.
 */

export interface ServiceDefinition {
  key: string;
  name: string;
  category: string;
  description: string;
  monthlyRevenueMin: number;
  monthlyRevenueMax: number;
  signals: { key: string; weight: number; checkFn: (ctx: WorkspaceContext) => number }[];
  urgencyFn: (ctx: WorkspaceContext) => "Low" | "Medium" | "High" | "Critical";
  reasonFn: (ctx: WorkspaceContext) => string;
}

export interface WorkspaceContext {
  contactCount: number;
  openDeals: number;
  pipelineValue: number;
  wonValue: number;
  upcomingEvents: number;
  completedEvents: number;
  reviewCount: number;
  avgRating: number;
  openTasks: number;
  integrationsConnected: number;
  integrationsTotal: number;
  hasCalendarSync: boolean;
  hasAds: boolean;
  hasSEO: boolean;
  hasSocial: boolean;
  hasWebsite: boolean;
  hasReviewAutomation: boolean;
  hasEmailAutomation: boolean;
  hasCRMAutomation: boolean;
  teamSize: number;
  bookingCount: number;
  noShowCount: number;
  cancelledCount: number;
  activePackageKeys: string[];
}

export interface ServiceRecommendation {
  key: string;
  name: string;
  category: string;
  description: string;
  fitScore: number;
  urgency: "Low" | "Medium" | "High" | "Critical";
  projectedMonthly: number;
  projectedAnnual: number;
  confidence: number;
  reason: string;
  priorityRank: number;
}

// ── Industry benchmark defaults ──
const BENCHMARKS = {
  avgBookingValue: 150,
  seoTrafficLift: 0.35,
  seoLeadRate: 0.03,
  seoCloseRate: 0.15,
  adsLeadCostDefault: 25,
  adsBudgetDefault: 1500,
  adsCloseRate: 0.12,
  reviewConversionLift: 0.08,
  crmRecoveryRate: 0.10,
  websiteConversionLift: 0.05,
  socialLeadRate: 0.02,
  contentEngagementLift: 0.15,
  noShowRecoveryRate: 0.40,
  emailAutomationLift: 0.12,
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// ── Service catalog ──
export const SERVICE_CATALOG: ServiceDefinition[] = [
  {
    key: "seo_implementation",
    name: "SEO Implementation",
    category: "Growth",
    description: "Increase organic traffic and capture high-intent local search leads.",
    monthlyRevenueMin: 800,
    monthlyRevenueMax: 8000,
    signals: [
      { key: "no_seo", weight: 3, checkFn: (c) => c.hasSEO ? 0 : 1 },
      { key: "has_website", weight: 2, checkFn: (c) => c.hasWebsite ? 1 : 0.3 },
      { key: "low_traffic_signal", weight: 2, checkFn: (c) => c.contactCount < 20 ? 1 : 0.4 },
    ],
    urgencyFn: (c) => !c.hasSEO && c.hasWebsite ? "High" : "Medium",
    reasonFn: (c) => !c.hasSEO
      ? "No SEO strategy active — organic traffic and leads are being missed."
      : "SEO is configured but could be expanded for more visibility.",
  },
  {
    key: "paid_ads",
    name: "Paid Ads Management",
    category: "Growth",
    description: "Generate leads immediately through targeted Google & Meta advertising.",
    monthlyRevenueMin: 1200,
    monthlyRevenueMax: 12000,
    signals: [
      { key: "no_ads", weight: 3, checkFn: (c) => c.hasAds ? 0 : 1 },
      { key: "low_leads", weight: 2, checkFn: (c) => c.contactCount < 30 ? 1 : 0.3 },
      { key: "pipeline_capacity", weight: 1, checkFn: (c) => c.openDeals < 10 ? 1 : 0.5 },
    ],
    urgencyFn: (c) => !c.hasAds && c.contactCount < 10 ? "Critical" : c.hasAds ? "Low" : "High",
    reasonFn: (c) => !c.hasAds
      ? "No paid advertising active — you're missing immediate lead volume."
      : "Ads are running but could be optimized for better ROI.",
  },
  {
    key: "social_media",
    name: "Social Media Management",
    category: "Growth",
    description: "Build brand presence and generate engagement through social channels.",
    monthlyRevenueMin: 400,
    monthlyRevenueMax: 4000,
    signals: [
      { key: "no_social", weight: 2, checkFn: (c) => c.hasSocial ? 0 : 1 },
      { key: "has_content_gap", weight: 1, checkFn: (c) => 0.6 },
    ],
    urgencyFn: (c) => !c.hasSocial ? "Medium" : "Low",
    reasonFn: (c) => !c.hasSocial
      ? "No social presence managed — brand visibility is limited."
      : "Social is active but could drive more leads with optimization.",
  },
  {
    key: "review_generation",
    name: "Review Generation & Reputation",
    category: "Reputation",
    description: "Increase review volume and ratings to boost trust and local rankings.",
    monthlyRevenueMin: 600,
    monthlyRevenueMax: 5000,
    signals: [
      { key: "low_reviews", weight: 3, checkFn: (c) => c.reviewCount < 5 ? 1 : c.reviewCount < 20 ? 0.6 : 0.2 },
      { key: "low_rating", weight: 2, checkFn: (c) => c.avgRating < 4.0 ? 1 : c.avgRating < 4.5 ? 0.5 : 0.1 },
      { key: "no_automation", weight: 2, checkFn: (c) => c.hasReviewAutomation ? 0 : 1 },
    ],
    urgencyFn: (c) => c.avgRating > 0 && c.avgRating < 3.5 ? "Critical" : c.reviewCount < 5 ? "High" : "Medium",
    reasonFn: (c) => c.reviewCount < 5
      ? "Very few reviews — trust signals are weak for prospective customers."
      : c.avgRating < 4.0
        ? "Average rating below 4.0 — reputation is hurting conversions."
        : "Review system could be automated to scale social proof.",
  },
  {
    key: "crm_automation",
    name: "CRM & Follow-Up Automation",
    category: "Operations",
    description: "Automate lead follow-up, pipeline management, and reduce manual work.",
    monthlyRevenueMin: 500,
    monthlyRevenueMax: 6000,
    signals: [
      { key: "no_crm_auto", weight: 3, checkFn: (c) => c.hasCRMAutomation ? 0 : 1 },
      { key: "open_deals", weight: 2, checkFn: (c) => c.openDeals > 5 ? 1 : 0.4 },
      { key: "low_close", weight: 1, checkFn: (c) => c.pipelineValue > 0 && c.wonValue / c.pipelineValue < 0.2 ? 1 : 0.3 },
    ],
    urgencyFn: (c) => !c.hasCRMAutomation && c.openDeals > 10 ? "High" : "Medium",
    reasonFn: (c) => !c.hasCRMAutomation
      ? `${c.openDeals} open deals with no follow-up automation — leads are leaking.`
      : "CRM automation active but could be expanded.",
  },
  {
    key: "website_optimization",
    name: "Website Optimization",
    category: "Growth",
    description: "Improve conversion rate with better UX, CTAs, and page performance.",
    monthlyRevenueMin: 500,
    monthlyRevenueMax: 5000,
    signals: [
      { key: "has_website", weight: 2, checkFn: (c) => c.hasWebsite ? 1 : 0 },
      { key: "low_conversion_signal", weight: 2, checkFn: (c) => c.contactCount > 0 && c.bookingCount / Math.max(c.contactCount, 1) < 0.1 ? 1 : 0.3 },
    ],
    urgencyFn: (c) => c.hasWebsite ? "Medium" : "Low",
    reasonFn: (c) => c.hasWebsite
      ? "Website live but conversion optimization could increase leads."
      : "No website configured — online presence is missing.",
  },
  {
    key: "appointment_generation",
    name: "Appointment Generation System",
    category: "Revenue",
    description: "Maximize booking volume with optimized scheduling and lead capture.",
    monthlyRevenueMin: 1000,
    monthlyRevenueMax: 8000,
    signals: [
      { key: "low_bookings", weight: 3, checkFn: (c) => c.bookingCount < 5 ? 1 : c.bookingCount < 20 ? 0.6 : 0.2 },
      { key: "no_calendar_sync", weight: 1, checkFn: (c) => c.hasCalendarSync ? 0 : 1 },
    ],
    urgencyFn: (c) => c.bookingCount === 0 ? "Critical" : c.bookingCount < 5 ? "High" : "Medium",
    reasonFn: (c) => c.bookingCount === 0
      ? "Zero bookings — the appointment pipeline is empty."
      : `Only ${c.bookingCount} bookings — there's significant room to grow.`,
  },
  {
    key: "email_automation",
    name: "Email & Follow-Up Automation",
    category: "Operations",
    description: "Automated email sequences for nurturing, reminders, and re-engagement.",
    monthlyRevenueMin: 400,
    monthlyRevenueMax: 4000,
    signals: [
      { key: "no_email_auto", weight: 3, checkFn: (c) => c.hasEmailAutomation ? 0 : 1 },
      { key: "contacts_exist", weight: 1, checkFn: (c) => c.contactCount > 10 ? 1 : 0.3 },
    ],
    urgencyFn: (c) => !c.hasEmailAutomation && c.contactCount > 20 ? "High" : "Medium",
    reasonFn: (c) => !c.hasEmailAutomation
      ? `${c.contactCount} contacts with no email automation — re-engagement is manual.`
      : "Email automation active but could add more sequences.",
  },
  {
    key: "noshow_recovery",
    name: "No-Show & Revenue Recovery",
    category: "Revenue",
    description: "Recover lost revenue from cancellations and no-shows with automated outreach.",
    monthlyRevenueMin: 300,
    monthlyRevenueMax: 3000,
    signals: [
      { key: "high_noshow", weight: 3, checkFn: (c) => c.noShowCount > 3 ? 1 : c.noShowCount > 0 ? 0.5 : 0 },
      { key: "cancelled", weight: 2, checkFn: (c) => c.cancelledCount > 3 ? 1 : c.cancelledCount > 0 ? 0.5 : 0 },
    ],
    urgencyFn: (c) => c.noShowCount > 5 ? "High" : c.noShowCount > 0 ? "Medium" : "Low",
    reasonFn: (c) => c.noShowCount > 0
      ? `${c.noShowCount} no-shows detected — automated recovery could recapture ${Math.round(c.noShowCount * BENCHMARKS.noShowRecoveryRate * BENCHMARKS.avgBookingValue)} in revenue.`
      : "No-show recovery system is preventative — ready when needed.",
  },
  {
    key: "full_growth_system",
    name: "Full Growth System Upgrade",
    category: "Strategic",
    description: "Comprehensive growth package combining all services for maximum impact.",
    monthlyRevenueMin: 3000,
    monthlyRevenueMax: 25000,
    signals: [
      { key: "multiple_gaps", weight: 3, checkFn: (c) => {
        const gaps = [!c.hasSEO, !c.hasAds, !c.hasSocial, !c.hasReviewAutomation, !c.hasCRMAutomation].filter(Boolean).length;
        return gaps >= 3 ? 1 : gaps >= 2 ? 0.6 : 0.2;
      }},
      { key: "growth_ready", weight: 2, checkFn: (c) => c.bookingCount > 5 || c.contactCount > 20 ? 1 : 0.4 },
    ],
    urgencyFn: (c) => {
      const gaps = [!c.hasSEO, !c.hasAds, !c.hasSocial, !c.hasReviewAutomation, !c.hasCRMAutomation].filter(Boolean).length;
      return gaps >= 4 ? "Critical" : gaps >= 3 ? "High" : "Medium";
    },
    reasonFn: (c) => {
      const gaps = [!c.hasSEO, !c.hasAds, !c.hasSocial, !c.hasReviewAutomation, !c.hasCRMAutomation].filter(Boolean).length;
      return `${gaps} growth systems inactive — a full system approach maximizes ROI.`;
    },
  },
];

// ── Main engine ──

export function generateRecommendations(ctx: WorkspaceContext): ServiceRecommendation[] {
  const results: ServiceRecommendation[] = [];

  for (const svc of SERVICE_CATALOG) {
    // Calculate fit score (0-100)
    let totalWeight = 0;
    let weightedSum = 0;
    for (const sig of svc.signals) {
      const val = clamp(sig.checkFn(ctx), 0, 1);
      weightedSum += val * sig.weight;
      totalWeight += sig.weight;
    }
    const fitScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;

    // Skip very low fit
    if (fitScore < 15) continue;

    const urgency = svc.urgencyFn(ctx);
    const reason = svc.reasonFn(ctx);

    // Revenue projection
    const fitFactor = fitScore / 100;
    const projectedMonthly = Math.round(
      svc.monthlyRevenueMin + (svc.monthlyRevenueMax - svc.monthlyRevenueMin) * fitFactor
    );
    const projectedAnnual = projectedMonthly * 12;

    // Confidence based on data availability
    const dataSignals = [
      ctx.contactCount > 0, ctx.bookingCount > 0, ctx.reviewCount > 0,
      ctx.pipelineValue > 0, ctx.integrationsConnected > 0,
    ].filter(Boolean).length;
    const confidence = clamp(Math.round(30 + dataSignals * 14), 30, 95);

    results.push({
      key: svc.key,
      name: svc.name,
      category: svc.category,
      description: svc.description,
      fitScore,
      urgency,
      projectedMonthly,
      projectedAnnual,
      confidence,
      reason,
      priorityRank: 0,
    });
  }

  // Rank by composite score
  const urgencyWeight: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  results.sort((a, b) => {
    const scoreA = a.fitScore * 0.4 + (a.projectedMonthly / 250) * 0.35 + urgencyWeight[a.urgency] * 10 * 0.25;
    const scoreB = b.fitScore * 0.4 + (b.projectedMonthly / 250) * 0.35 + urgencyWeight[b.urgency] * 10 * 0.25;
    return scoreB - scoreA;
  });

  results.forEach((r, i) => { r.priorityRank = i + 1; });

  return results;
}

export function buildWorkspaceContext(data: {
  contacts: number;
  deals: { deal_value: number; status: string; pipeline_stage: string }[];
  events: { status: string; start_time: string }[];
  reviews: { rating: number | null }[];
  tasks: number;
  integrations: { status: string }[];
  calendarIntegrations: any[];
  automations: { automation_category: string | null; enabled: boolean }[];
  teamSize: number;
}): WorkspaceContext {
  const now = new Date();
  const openDeals = data.deals.filter(d => d.status === "open");
  const wonDeals = data.deals.filter(d => d.pipeline_stage === "closed_won");
  const rated = data.reviews.filter(r => r.rating != null);
  const connected = data.integrations.filter(i => i.status === "connected");
  const autoCategories = data.automations.filter(a => a.enabled).map(a => a.automation_category?.toLowerCase() || "");

  return {
    contactCount: data.contacts,
    openDeals: openDeals.length,
    pipelineValue: openDeals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0),
    wonValue: wonDeals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0),
    upcomingEvents: data.events.filter(e => new Date(e.start_time) >= now && !["cancelled", "no_show"].includes(e.status)).length,
    completedEvents: data.events.filter(e => e.status === "completed").length,
    reviewCount: data.reviews.length,
    avgRating: rated.length > 0 ? rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length : 0,
    openTasks: data.tasks,
    integrationsConnected: connected.length,
    integrationsTotal: data.integrations.length,
    hasCalendarSync: data.calendarIntegrations.length > 0,
    hasAds: false, // determined by active ad campaigns or integration
    hasSEO: false,
    hasSocial: false,
    hasWebsite: true, // assume workspace has website module
    hasReviewAutomation: autoCategories.some(c => c?.includes("review")),
    hasEmailAutomation: autoCategories.some(c => c?.includes("email") || c?.includes("follow")),
    hasCRMAutomation: autoCategories.some(c => c?.includes("crm") || c?.includes("lead")),
    teamSize: data.teamSize,
    bookingCount: data.events.filter(e => e.status === "confirmed" || e.status === "completed").length,
    noShowCount: data.events.filter(e => e.status === "no_show").length,
    cancelledCount: data.events.filter(e => e.status === "cancelled").length,
    activePackageKeys: [],
  };
}
