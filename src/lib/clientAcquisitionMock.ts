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

export const MOCK_ACQUISITION_CLIENTS: AcquisitionClient[] = [
  {
    id: "c1", name: "Bright Smile Dental", industry: "Dental", sourcedBy: BDRS[0],
    totalViews: 12400, trafficSources: src(6200, 1800, 1400, 2100, 600, 300),
    appointments: 84, appointmentsTrend: [42, 51, 58, 64, 72, 84], closedWon: 34,
    bottlenecks: [],
  },
  {
    id: "c2", name: "Northside HVAC Co", industry: "Home Services", sourcedBy: BDRS[1],
    totalViews: 28900, trafficSources: src(9200, 4100, 2800, 10600, 1400, 800),
    appointments: 142, appointmentsTrend: [98, 105, 118, 124, 131, 142], closedWon: 61,
    bottlenecks: [],
  },
  {
    id: "c3", name: "Peak Fitness Studio", industry: "Fitness", sourcedBy: BDRS[2],
    totalViews: 18200, trafficSources: src(4200, 900, 8400, 3800, 600, 300),
    appointments: 22, appointmentsTrend: [28, 26, 24, 25, 23, 22], closedWon: 3,
    bottlenecks: [
      { severity: "high", label: "High views, low booking rate", detail: "18.2K views → only 22 appointments (0.12%). Landing page or CTA likely failing." },
      { severity: "high", label: "Bookings not converting to close", detail: "Only 3 of 22 booked appointments closed (13.6%)." },
    ],
  },
  {
    id: "c4", name: "Ironclad Legal", industry: "Legal", sourcedBy: BDRS[0],
    totalViews: 4800, trafficSources: src(2100, 600, 200, 900, 800, 200),
    appointments: 12, appointmentsTrend: [24, 22, 18, 16, 14, 12], closedWon: 4,
    bottlenecks: [
      { severity: "med", label: "Declining traffic", detail: "Views down 38% over 6 months. SEO or intent gap." },
    ],
  },
  {
    id: "c5", name: "Sunrise Med Spa", industry: "Med Spa", sourcedBy: BDRS[3],
    totalViews: 21400, trafficSources: src(5400, 2200, 8900, 3200, 900, 800),
    appointments: 96, appointmentsTrend: [58, 66, 74, 82, 88, 96], closedWon: 41,
    bottlenecks: [],
  },
  {
    id: "c6", name: "Coastal Roofing", industry: "Home Services", sourcedBy: BDRS[1],
    totalViews: 3200, trafficSources: src(1200, 200, 400, 900, 400, 100),
    appointments: 6, appointmentsTrend: [22, 18, 14, 10, 8, 6], closedWon: 1,
    bottlenecks: [
      { severity: "high", label: "Traffic collapse", detail: "Views down 72% over 6 months. Paid campaigns paused." },
      { severity: "high", label: "Bookings not converting to close", detail: "Only 1 of 6 booked appointments closed (16.7%)." },
    ],
  },
  {
    id: "c7", name: "Verde Landscaping", industry: "Home Services", sourcedBy: BDRS[2],
    totalViews: 9600, trafficSources: src(4400, 1100, 1800, 1400, 700, 200),
    appointments: 44, appointmentsTrend: [38, 40, 41, 42, 43, 44], closedWon: 17,
    bottlenecks: [
      { severity: "low", label: "Growth plateau", detail: "Appointment growth flat over 6 months." },
    ],
  },
  {
    id: "c8", name: "Metro Auto Detail", industry: "Automotive", sourcedBy: BDRS[3],
    totalViews: 8800, trafficSources: src(2400, 400, 3800, 1600, 400, 200),
    appointments: 4, appointmentsTrend: [12, 10, 8, 6, 5, 4], closedWon: 0,
    bottlenecks: [
      { severity: "high", label: "High views, low booking rate", detail: "8.8K views → only 4 appointments (0.05%)." },
      { severity: "high", label: "Zero closed deals", detail: "0 of 4 booked appointments closed." },
    ],
  },
];

export const closeRate = (c: AcquisitionClient) =>
  c.appointments > 0 ? Math.round((c.closedWon / c.appointments) * 1000) / 10 : 0;

export const bookingRate = (c: AcquisitionClient) =>
  c.totalViews > 0 ? Math.round((c.appointments / c.totalViews) * 10000) / 100 : 0;

export const severityColor = (s: BottleneckFlag["severity"]) => {
  if (s === "high") return { bg: "bg-red-500/15", text: "text-red-300", border: "border-red-500/30", raw: "hsl(0 72% 61%)" };
  if (s === "med") return { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/30", raw: "hsl(38 92% 60%)" };
  return { bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-500/30", raw: "hsl(211 96% 62%)" };
};
