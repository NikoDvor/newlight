import type { ProfileType } from "@/lib/profileEngine";

export const INDUSTRY_OPTIONS = [
  "Registered Investment Adviser (RIA)",
  "Wealth Management",
  "Hedge Fund",
  "Private Equity & Venture Capital",
  "Financial Insurance",
] as const;

export function suggestProfileFromIndustry(industry: string): ProfileType {
  void industry;
  return "consultative_sales";
}
