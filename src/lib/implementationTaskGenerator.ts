import { supabase } from "@/integrations/supabase/client";

// ─── Profile-driven implementation task templates ───────────────
type TaskTemplate = { key: string; label: string; category: string; priority: string };

const COMMON_TASKS: TaskTemplate[] = [
  { key: "review_branding", label: "Review branding assets & logo", category: "branding", priority: "high" },
  { key: "configure_domain", label: "Configure domain / website access", category: "website", priority: "high" },
  { key: "setup_services", label: "Review & configure services/offers", category: "services", priority: "high" },
  { key: "setup_team_access", label: "Set up team member access", category: "team", priority: "medium" },
  { key: "configure_billing", label: "Verify billing & payment setup", category: "billing", priority: "medium" },
  { key: "final_qa", label: "Final QA & launch review", category: "internal", priority: "high" },
  { key: "client_handoff", label: "Client handoff & training call", category: "internal", priority: "high" },
];

const PROFILE_TASKS: Record<string, TaskTemplate[]> = {
  field_service: [
    { key: "fs_service_areas", label: "Review service areas & coverage zones", category: "operations", priority: "high" },
    { key: "fs_dispatch_calendar", label: "Configure dispatch calendar", category: "calendar", priority: "high" },
    { key: "fs_appointment_types", label: "Verify appointment types & durations", category: "calendar", priority: "high" },
    { key: "fs_reminders", label: "Verify reminder cadence", category: "calendar", priority: "medium" },
    { key: "fs_intake_form", label: "Review intake form mapping", category: "forms", priority: "medium" },
    { key: "fs_workforce", label: "Prepare workforce / team setup", category: "team", priority: "medium" },
    { key: "fs_location_settings", label: "Configure location/on-site defaults", category: "operations", priority: "medium" },
  ],
  appointment_local: [
    { key: "al_booking_calendar", label: "Configure booking calendar", category: "calendar", priority: "high" },
    { key: "al_appointment_types", label: "Verify appointment types", category: "calendar", priority: "high" },
    { key: "al_business_hours", label: "Confirm business hours & availability", category: "operations", priority: "high" },
    { key: "al_booking_page", label: "Set up public booking page", category: "calendar", priority: "medium" },
    { key: "al_reminders", label: "Configure reminders & follow-ups", category: "calendar", priority: "medium" },
    { key: "al_reviews", label: "Set up review request automation", category: "marketing", priority: "low" },
  ],
  consultative_sales: [
    { key: "cs_sales_calendars", label: "Verify sales calendars", category: "calendar", priority: "high" },
    { key: "cs_meeting_types", label: "Verify discovery/demo/closing types", category: "calendar", priority: "high" },
    { key: "cs_zoom_settings", label: "Confirm Zoom/virtual meeting settings", category: "calendar", priority: "high" },
    { key: "cs_lead_capture", label: "Review lead capture form", category: "forms", priority: "medium" },
    { key: "cs_followup_cadence", label: "Review follow-up cadence", category: "calendar", priority: "medium" },
    { key: "cs_close_workflow", label: "Verify close workflow assumptions", category: "operations", priority: "medium" },
    { key: "cs_pipeline_setup", label: "Configure sales pipeline stages", category: "operations", priority: "medium" },
  ],
  membership_recurring: [
    { key: "mr_membership_tiers", label: "Configure membership tiers/plans", category: "services", priority: "high" },
    { key: "mr_recurring_billing", label: "Set up recurring billing rules", category: "billing", priority: "high" },
    { key: "mr_renewal_reminders", label: "Configure renewal reminders", category: "calendar", priority: "medium" },
    { key: "mr_member_portal", label: "Set up member portal access", category: "operations", priority: "medium" },
    { key: "mr_onboarding_flow", label: "Configure member onboarding flow", category: "operations", priority: "medium" },
  ],
  project_service: [
    { key: "ps_kickoff", label: "Kickoff setup & project scoping", category: "internal", priority: "high" },
    { key: "ps_intake_review", label: "Project intake review", category: "forms", priority: "high" },
    { key: "ps_timeline", label: "Timeline confirmation & milestones", category: "operations", priority: "high" },
    { key: "ps_team_perms", label: "Set up team permissions & access", category: "team", priority: "medium" },
    { key: "ps_reporting", label: "Configure status/reporting cadence", category: "operations", priority: "medium" },
    { key: "ps_deliverables", label: "Confirm deliverable tracking setup", category: "operations", priority: "medium" },
  ],
  custom_hybrid: [
    { key: "ch_needs_audit", label: "Custom needs audit & mapping", category: "internal", priority: "high" },
    { key: "ch_module_config", label: "Configure enabled modules", category: "operations", priority: "high" },
    { key: "ch_workflow_design", label: "Design custom workflow", category: "operations", priority: "medium" },
    { key: "ch_integration_plan", label: "Integration requirements review", category: "operations", priority: "medium" },
  ],
};

// ─── Generator ──────────────────────────────────────────────────
export async function generateImplementationTasks(clientId: string): Promise<{ created: number; skipped: number }> {
  // Load client + profile
  const [{ data: client }, { data: profile }] = await Promise.all([
    supabase.from("clients").select("id, business_name, payment_status, implementation_status").eq("id", clientId).single(),
    supabase.from("workspace_profiles").select("profile_type").eq("client_id", clientId).limit(1).single(),
  ]);

  if (!client) return { created: 0, skipped: 0 };

  const profileType = (profile?.profile_type as string) || "custom_hybrid";
  const profileTasks = PROFILE_TASKS[profileType] || PROFILE_TASKS.custom_hybrid;
  const allTemplates = [...COMMON_TASKS, ...profileTasks];

  // Check existing tasks to enforce idempotency
  const { data: existing } = await supabase
    .from("implementation_tasks")
    .select("task_key")
    .eq("client_id", clientId);
  const existingKeys = new Set((existing || []).map((t: any) => t.task_key));

  const toInsert = allTemplates
    .filter(t => !existingKeys.has(t.key))
    .map(t => ({
      client_id: clientId,
      task_key: t.key,
      task_label: t.label,
      category: t.category,
      task_status: "not_started",
      priority: t.priority,
      source_profile: profileType,
    }));

  let created = 0;
  if (toInsert.length > 0) {
    const { error } = await supabase.from("implementation_tasks").insert(toInsert as any);
    if (!error) created = toInsert.length;
  }

  // Update implementation status if needed
  if (client.implementation_status === "not_started" && created > 0) {
    await supabase.from("clients").update({ implementation_status: "in_progress" } as any).eq("id", clientId);
  }

  // Audit
  if (created > 0) {
    await supabase.from("audit_logs").insert({
      client_id: clientId,
      action: "implementation_tasks_generated",
      module: "implementation",
      metadata: { profile: profileType, created, skipped: allTemplates.length - created } as any,
    });
  }

  return { created, skipped: existingKeys.size };
}

export const TASK_STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started", color: "text-white/40" },
  { value: "queued", label: "Queued", color: "text-blue-400" },
  { value: "in_progress", label: "In Progress", color: "text-[hsl(var(--nl-sky))]" },
  { value: "waiting_on_client", label: "Waiting on Client", color: "text-amber-400" },
  { value: "blocked", label: "Blocked", color: "text-red-400" },
  { value: "in_review", label: "In Review", color: "text-purple-400" },
  { value: "complete", label: "Complete", color: "text-emerald-400" },
  { value: "canceled", label: "Canceled", color: "text-white/20" },
];

export const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "text-white/30" },
  { value: "medium", label: "Medium", color: "text-blue-400" },
  { value: "high", label: "High", color: "text-amber-400" },
  { value: "urgent", label: "Urgent", color: "text-red-400" },
];

export const TASK_CATEGORIES: Record<string, string> = {
  branding: "Branding & Assets",
  website: "Website & Domain",
  services: "Services & Offers",
  operations: "Operations",
  team: "Team & Access",
  calendar: "Calendar & Booking",
  forms: "Forms & Intake",
  billing: "Billing",
  marketing: "Marketing",
  internal: "Internal Delivery",
  general: "General",
};
