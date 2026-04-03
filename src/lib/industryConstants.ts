import type { ProfileType } from "@/lib/profileEngine";

export const INDUSTRY_OPTIONS = [
  "Accounting / CPA", "Aesthetics", "Agency", "Automotive",
  "Barbershop", "Chiropractic", "Cleaning Service", "Construction",
  "Consulting", "Dental", "E-commerce", "Financial Services",
  "Fitness", "Healthcare", "HVAC", "Insurance Agency",
  "Landscaping", "Legal", "Med Spa", "Mortgage Broker",
  "Plumbing", "Real Estate", "Restaurant", "Roofing",
  "Salon", "Spa", "Wealth Management", "Window Washing",
  "Other",
] as const;

export function suggestProfileFromIndustry(industry: string): ProfileType {
  const t = (industry || "").toLowerCase();
  if (["hvac", "plumbing", "cleaning", "landscaping", "roofing", "window", "construction"].some(k => t.includes(k))) return "field_service";
  if (["dental", "salon", "med spa", "spa", "aesthetics", "barbershop", "chiropractic", "healthcare", "fitness", "restaurant", "automotive"].some(k => t.includes(k))) return "appointment_local";
  if (["agency", "consulting", "real estate", "financial", "wealth", "accounting", "cpa", "insurance", "mortgage"].some(k => t.includes(k))) return "consultative_sales";
  if (["e-commerce"].some(k => t.includes(k))) return "membership_recurring";
  if (["legal"].some(k => t.includes(k))) return "project_service";
  return "custom_hybrid";
}
