// Mock data for Client Intelligence admin pages. No DB reads, no real logic.

export interface MockClient {
  id: string;
  name: string;
  industry: string;
  score: number; // 0-100
  revenueTrend: "up" | "down" | "flat";
  monthlyRevenue: number[]; // last 6 months
  status: "healthy" | "at-risk" | "inactive" | "underperforming";
  reasons: string[];
  missingSetup: string[];
  onboardingStage: number; // 0-7
  wins: { appointments: number; deals: number; revenue: number };
  optimizations: { title: string; detail: string; priority: "high" | "med" | "low" }[];
}

export const MOCK_CLIENTS: MockClient[] = [
  {
    id: "c1", name: "Bright Smile Dental", industry: "Dental",
    score: 87, revenueTrend: "up", monthlyRevenue: [18200, 19100, 20300, 22400, 24100, 26800],
    status: "healthy", reasons: [], missingSetup: [], onboardingStage: 7,
    wins: { appointments: 42, deals: 18, revenue: 26800 },
    optimizations: [{ title: "Launch review autopilot", detail: "5-star average — capitalize with more requests.", priority: "med" }],
  },
  {
    id: "c2", name: "Northside HVAC Co", industry: "Home Services",
    score: 72, revenueTrend: "up", monthlyRevenue: [32100, 30800, 34200, 35600, 37100, 38900],
    status: "healthy", reasons: [], missingSetup: ["Google Ads not connected"], onboardingStage: 6,
    wins: { appointments: 71, deals: 34, revenue: 38900 },
    optimizations: [{ title: "Launch Google Ads", detail: "Estimated $12K/mo additional pipeline.", priority: "high" }],
  },
  {
    id: "c3", name: "Peak Fitness Studio", industry: "Fitness",
    score: 54, revenueTrend: "flat", monthlyRevenue: [14200, 14100, 13900, 14300, 14100, 14000],
    status: "underperforming", reasons: ["Flat revenue 6 months", "Low email open rate"],
    missingSetup: ["No active nurture campaign", "SOP incomplete: onboarding"],
    onboardingStage: 5,
    wins: { appointments: 22, deals: 8, revenue: 14000 },
    optimizations: [
      { title: "Refresh nurture sequence", detail: "Open rate 12% — below industry avg.", priority: "high" },
      { title: "Add referral incentive", detail: "Members love the brand; leverage them.", priority: "med" },
    ],
  },
  {
    id: "c4", name: "Ironclad Legal", industry: "Legal",
    score: 41, revenueTrend: "down", monthlyRevenue: [48200, 46100, 44800, 42300, 39100, 36800],
    status: "at-risk", reasons: ["Revenue down 24% QoQ", "No new leads in 14 days", "Missed 3 check-ins"],
    missingSetup: ["Call tracking not configured"],
    onboardingStage: 6,
    wins: { appointments: 9, deals: 3, revenue: 36800 },
    optimizations: [
      { title: "Emergency growth review", detail: "Schedule strategy call this week.", priority: "high" },
      { title: "SEO stalled — recommend content refresh", detail: "Rankings dropped for 4 core keywords.", priority: "high" },
    ],
  },
  {
    id: "c5", name: "Sunrise Med Spa", industry: "Med Spa",
    score: 78, revenueTrend: "up", monthlyRevenue: [22100, 23400, 24800, 26200, 27900, 29600],
    status: "healthy", reasons: [], missingSetup: [], onboardingStage: 7,
    wins: { appointments: 58, deals: 24, revenue: 29600 },
    optimizations: [{ title: "Upsell membership program", detail: "48% of clients rebook — perfect fit.", priority: "med" }],
  },
  {
    id: "c6", name: "Coastal Roofing", industry: "Home Services",
    score: 33, revenueTrend: "down", monthlyRevenue: [58100, 51200, 47800, 42100, 38400, 31200],
    status: "at-risk", reasons: ["Revenue down 46% QoQ", "Last login 21 days ago"],
    missingSetup: ["No active campaigns", "CRM pipeline empty", "SOP incomplete: intake"],
    onboardingStage: 4,
    wins: { appointments: 4, deals: 1, revenue: 31200 },
    optimizations: [
      { title: "Reactivate paused ad campaigns", detail: "Seasonal window closing.", priority: "high" },
      { title: "Rebuild intake SOP", detail: "Leads dropping off before qualification.", priority: "high" },
    ],
  },
  {
    id: "c7", name: "Verde Landscaping", industry: "Home Services",
    score: 62, revenueTrend: "flat", monthlyRevenue: [19800, 20100, 19900, 20400, 20200, 20100],
    status: "underperforming", reasons: ["Growth flat 6 months"],
    missingSetup: ["Google Business Profile not verified"],
    onboardingStage: 6,
    wins: { appointments: 31, deals: 12, revenue: 20100 },
    optimizations: [{ title: "Verify GBP + start review flow", detail: "Local SEO leverage untapped.", priority: "med" }],
  },
  {
    id: "c8", name: "Metro Auto Detail", industry: "Automotive",
    score: 18, revenueTrend: "down", monthlyRevenue: [12400, 10800, 9200, 7100, 5400, 3800],
    status: "inactive", reasons: ["No activity 30 days", "Owner unresponsive", "Automations paused"],
    missingSetup: ["Integrations disconnected", "No active campaigns", "SOP not started"],
    onboardingStage: 2,
    wins: { appointments: 1, deals: 0, revenue: 3800 },
    optimizations: [{ title: "Escalate to success manager", detail: "Churn risk critical.", priority: "high" }],
  },
];

export const ONBOARDING_STAGES = [
  "Discovery",
  "Business Info",
  "Integrations",
  "Team Setup",
  "CRM Config",
  "Campaigns",
  "Launch",
  "Live",
];

export const scoreColor = (s: number) => {
  if (s >= 70) return { bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/30", raw: "hsl(152 60% 55%)" };
  if (s >= 50) return { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/30", raw: "hsl(38 92% 60%)" };
  return { bg: "bg-red-500/15", text: "text-red-300", border: "border-red-500/30", raw: "hsl(0 72% 61%)" };
};
