// ── Business Operation Types ──
// Internal layer mapping workspace profiles to operational behavior.
// Used by the admin quote engine and proposal system — NOT client-facing.

import type { ProfileType } from "@/lib/profileEngine";
import type { IndustryCategory, BusinessArchetype } from "@/lib/workspaceProfileTypes";

export const BUSINESS_OPERATION_TYPES = [
  { value: "field_service", label: "Field Service", description: "On-site dispatch: HVAC, plumbing, cleaning, landscaping" },
  { value: "appointment_local", label: "Appointment / Local", description: "In-office booking: dental, salon, med spa, clinic" },
  { value: "consultative_sales", label: "Consultative Sales", description: "Zoom-heavy B2B: agency, consulting, financial advisory" },
  { value: "membership_recurring", label: "Membership / Recurring", description: "Recurring cadence: gym, subscription, coaching" },
  { value: "project_service", label: "Project / Delivery", description: "Scoped deliverables: contractor, agency delivery" },
  { value: "custom_hybrid", label: "Custom / Hybrid", description: "Manual configuration — admin selects everything" },
] as const;

export type BusinessOperationType = (typeof BUSINESS_OPERATION_TYPES)[number]["value"];

/** Financial firms are a premium subtype of consultative_sales */
export function isFinancialFirm(industry: IndustryCategory): boolean {
  return industry === "financial_legal";
}

/** Map archetype → best-fit business operation type */
export function resolveOperationType(
  archetype: BusinessArchetype,
  industry: IndustryCategory
): BusinessOperationType {
  const map: Record<BusinessArchetype, BusinessOperationType> = {
    appointments: "appointment_local",
    projects: "project_service",
    retainers: "consultative_sales",
    transactions: "appointment_local",
    ecommerce: "membership_recurring",
    subscription_saas: "membership_recurring",
    high_ticket_recurring: "consultative_sales",
    enterprise_accounts: "consultative_sales",
  };
  // Home services override
  if (industry === "home_services") return "field_service";
  return map[archetype] ?? "custom_hybrid";
}

/** Direct cast from legacy ProfileType (1:1 compatible) */
export function fromLegacyProfile(legacy: ProfileType): BusinessOperationType {
  return legacy as BusinessOperationType;
}
