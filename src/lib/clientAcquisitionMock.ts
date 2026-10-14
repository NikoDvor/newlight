// Mock data for the Client Acquisition Analytics admin page. No DB reads.

export interface TrafficSource {
  channel: string;
  views: number;
  color: string;
}

export interface AcquisitionBDR {
  // Mirrors the shape of crm_deals.assigned_user / nl_bdr_leads.user_id relation.
  // In future, replace `id` with the real auth.users.id and `name` from profiles.
  id: string;
  name: string;
  initial: string;
  color: string;
}

export interface BottleneckFlag {
  severity: "high" | "med" | "low";
  label: string;
  detail: string;
}

export interface AcquisitionClient {
  id: string;
  name: string;
  industry: string;
  sourcedBy: AcquisitionBDR;
  totalViews: number;
  trafficSources: TrafficSource[];
  appointments: number;
  appointmentsTrend: number[]; // last 6 months
  closedWon: number;
  bottlenecks: BottleneckFlag[];
}

const BDRS: AcquisitionBDR[] = [
  { id: "bdr-1", name: "Alex Rivera", initial: "AR", color: "hsl(211 96% 62%)" },
  { id: "bdr-2", name: "Jordan Chen", initial: "JC", color: "hsl(280 70% 65%)" },
  { id: "bdr-3", name: "Sam Patel", initial: "SP", color: "hsl(152 60% 55%)" },
  { id: "bdr-4", name: "Morgan Lee", initial: "ML", color: "hsl(38 92% 60%)" },
];

const CHANNEL_COLORS: Record<string, string> = {
  "Google Organic": "hsl(211 96% 62%)",
  "Google AI Overview": "hsl(280 70% 65%)",
  "Social Media": "hsl(340 80% 62%)",
  "Paid Ads": "hsl(38 92% 60%)",
  "Direct": "hsl(197 92% 68%)",
  "Referral": "hsl(152 60% 55%)",
};

const src = (
  organic: number, ai: number, social: number, paid: number, direct: number, referral: number
): TrafficSource[] => [
  { channel: "Google Organic", views: organic, color: CHANNEL_COLORS["Google Organic"] },
  { channel: "Google AI Overview", views: ai, color: CHANNEL_COLORS["Google AI Overview"] },
  { channel: "Social Media", views: social, color: CHANNEL_COLORS["Social Media"] },
  { channel: "Paid Ads", views: paid, color: CHANNEL_COLORS["Paid Ads"] },
  { channel: "Direct", views: direct, color: CHANNEL_COLORS["Direct"] },
  { channel: "Referral", views: referral, color: CHANNEL_COLORS["Referral"] },
];

export const MOCK_ACQUISITION_CLIENTS: AcquisitionClient[] = [];

export const closeRate = (c: AcquisitionClient) =>
  c.appointments > 0 ? Math.round((c.closedWon / c.appointments) * 1000) / 10 : 0;

export const bookingRate = (c: AcquisitionClient) =>
  c.totalViews > 0 ? Math.round((c.appointments / c.totalViews) * 10000) / 100 : 0;

export const severityColor = (s: BottleneckFlag["severity"]) => {
  if (s === "high") return { bg: "bg-red-500/15", text: "text-red-300", border: "border-red-500/30", raw: "hsl(0 72% 61%)" };
  if (s === "med") return { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/30", raw: "hsl(38 92% 60%)" };
  return { bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-500/30", raw: "hsl(211 96% 62%)" };
};
