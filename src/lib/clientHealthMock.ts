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

export const MOCK_CLIENTS: MockClient[] = [];

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
