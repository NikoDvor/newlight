// Same module bundle Form 1 submits (see BDRBookingPublic). Used when Form 1's
// questions are answered somewhere else: Close Prep for a lead that skipped
// Form 1, and "Log meeting booked elsewhere".
export const INCLUDED_MODULE_KEYS = ["paid_ads", "seo", "website_management", "tracking_attribution", "crm_automation", "lifecycle_nurture", "reputation_reviews"];
export const SALES_TOOL_KEYS = ["sales_meeting_intelligence", "sales_call_tracking", "sales_followups", "sales_tasks", "sales_contacts", "sales_companies", "sales_deals", "sales_pipeline", "sales_appointments", "sales_approvals"];
export const TEAM_SIZES = ["1-2", "3-5", "6-10", "10+"];

export function form1Modules(salesTeam: "" | "yes" | "no", compliance: "" | "yes" | "no"): string[] {
  return Array.from(new Set([
    ...INCLUDED_MODULE_KEYS,
    ...(salesTeam === "yes" ? SALES_TOOL_KEYS : []),
    ...(compliance === "yes" ? ["financial_compliance"] : []),
  ]));
}
