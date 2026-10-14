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
  consultative_sales: [
    { key: "cs_sales_calendars", label: "Verify client meeting & onboarding calendars", category: "calendar", priority: "high" },
    { key: "cs_meeting_types", label: "Verify discovery / financial review / planning meeting types", category: "calendar", priority: "high" },
    { key: "cs_zoom_settings", label: "Confirm Zoom/virtual meeting settings", category: "calendar", priority: "high" },
    { key: "cs_lead_capture", label: "Confirm compliance-approved prospect intake wording", category: "forms", priority: "high" },
    { key: "cs_followup_cadence", label: "Confirm compliance-approved email & follow-up wording", category: "calendar", priority: "medium" },
    { key: "cs_close_workflow", label: "Verify new-client onboarding workflow", category: "operations", priority: "medium" },
    { key: "cs_pipeline_setup", label: "Configure prospect pipeline stages", category: "operations", priority: "medium" },
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
  const profileTasks = PROFILE_TASKS[profileType] || PROFILE_TASKS.consultative_sales;
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
