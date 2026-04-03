import type { ProfileType } from "@/lib/profileEngine";

export const INDUSTRY_OPTIONS = [
  "Agency", "Dental", "Med Spa", "Salon", "Legal", "HVAC",
  "Real Estate", "Fitness", "Restaurant", "Automotive",
  "Construction", "Consulting", "Healthcare", "E-commerce",
  "Window Washing", "Landscaping", "Plumbing", "Roofing",
  "Cleaning Service", "Other",
] as const;

export function suggestProfileFromIndustry(industry: string): ProfileType {
  const t = (industry || "").toLowerCase();
  if (["hvac", "plumbing", "cleaning", "landscaping", "roofing", "window", "construction"].some(k => t.includes(k))) return "field_service";
  if (["dental", "salon", "med spa", "healthcare", "fitness", "restaurant", "automotive"].some(k => t.includes(k))) return "appointment_local";
  if (["agency", "consulting", "real estate"].some(k => t.includes(k))) return "consultative_sales";
  if (["e-commerce"].some(k => t.includes(k))) return "membership_recurring";
  if (["legal"].some(k => t.includes(k))) return "project_service";
  return "custom_hybrid";
}
