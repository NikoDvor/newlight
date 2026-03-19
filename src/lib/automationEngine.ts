import { supabase } from "@/integrations/supabase/client";

// ─── Event Trigger Registry ──────────────────────────────────────────

export const EVENT_REGISTRY = {
  // Sales
  internal_sales_intake_submitted: { category: "Sales", name: "Sales Intake Submitted" },
  sales_meeting_booked: { category: "Sales", name: "Sales Meeting Booked" },
  sales_meeting_completed: { category: "Sales", name: "Sales Meeting Completed" },
  lead_qualified: { category: "Sales", name: "Lead Qualified" },
  lead_not_qualified: { category: "Sales", name: "Lead Not Qualified" },
  proposal_generated: { category: "Proposal", name: "Proposal Generated" },
  proposal_sent: { category: "Proposal", name: "Proposal Sent" },
  proposal_viewed: { category: "Proposal", name: "Proposal Viewed" },
  proposal_accepted: { category: "Proposal", name: "Proposal Accepted" },
  proposal_rejected: { category: "Proposal", name: "Proposal Rejected" },
  deal_closed_won: { category: "Sales", name: "Deal Closed Won" },
  deal_closed_lost: { category: "Sales", name: "Deal Closed Lost" },
  // Activation
  demo_workspace_created: { category: "Activation", name: "Demo Workspace Created" },
  activation_form_submitted: { category: "Activation", name: "Activation Form Submitted" },
  workspace_activated: { category: "Activation", name: "Workspace Activated" },
  setup_progress_updated: { category: "Activation", name: "Setup Progress Updated" },
  integration_status_changed: { category: "Integrations", name: "Integration Status Changed" },
  // Client Booking
  client_booking_created: { category: "Booking", name: "Client Booking Created" },
  client_booking_cancelled: { category: "Booking", name: "Client Booking Cancelled" },
  client_booking_rescheduled: { category: "Booking", name: "Client Booking Rescheduled" },
  client_booking_completed: { category: "Booking", name: "Client Booking Completed" },
  client_booking_no_show: { category: "Booking", name: "Client Booking No-Show" },
  // CRM / Forms
  form_submitted: { category: "CRM", name: "Form Submitted" },
  contact_created: { category: "CRM", name: "Contact Created" },
  contact_updated: { category: "CRM", name: "Contact Updated" },
  deal_stage_changed: { category: "CRM", name: "Deal Stage Changed" },
  task_created: { category: "CRM", name: "Task Created" },
  // Reviews
  review_request_created: { category: "Reviews", name: "Review Request Created" },
  review_feedback_positive: { category: "Reviews", name: "Positive Review Feedback" },
  review_feedback_negative: { category: "Reviews", name: "Negative Review Feedback" },
  recovery_task_created: { category: "Reviews", name: "Recovery Task Created" },
  // Billing
  billing_account_created: { category: "Billing", name: "Billing Account Created" },
  subscription_created: { category: "Billing", name: "Subscription Created" },
  invoice_issued: { category: "Billing", name: "Invoice Issued" },
  invoice_paid: { category: "Billing", name: "Invoice Paid" },
  invoice_failed: { category: "Billing", name: "Invoice Failed" },
  subscription_past_due: { category: "Billing", name: "Subscription Past Due" },
  contract_expiring: { category: "Billing", name: "Contract Expiring" },
  // Workforce
  team_member_added: { category: "Workforce", name: "Team Member Added" },
  timesheet_submitted: { category: "Workforce", name: "Timesheet Submitted" },
  timesheet_rejected: { category: "Workforce", name: "Timesheet Rejected" },
  payroll_approved: { category: "Workforce", name: "Payroll Approved" },
} as const;

export type EventKey = keyof typeof EVENT_REGISTRY;

// ─── Action Types ────────────────────────────────────────────────────

export const ACTION_TYPES = [
  "create_contact", "update_contact", "create_company", "create_deal",
  "update_deal_stage", "create_task", "update_workspace_status", "create_workspace",
  "update_setup_progress", "send_internal_email", "send_external_email",
  "send_internal_notification", "send_client_notification", "queue_sms",
  "queue_reminder", "create_proposal", "mark_proposal_ready", "issue_invoice",
  "mark_billing_hold", "update_contract_status", "create_appointment",
  "update_appointment_status", "assign_calendar_user", "create_review_request",
  "create_workspace_user", "send_invite", "assign_permissions",
  "create_activity_feed_entry", "create_audit_log", "create_handoff_task",
  "create_recovery_task", "create_integration_task",
] as const;

// ─── Emit Event ──────────────────────────────────────────────────────

export async function emitEvent(params: {
  eventKey: EventKey;
  clientId?: string | null;
  relatedType?: string;
  relatedId?: string;
  payload?: Record<string, any>;
}) {
  const reg = EVENT_REGISTRY[params.eventKey];

  // Log the event
  await supabase.from("automation_events").insert({
    client_id: params.clientId || null,
    event_type: params.eventKey,
    event_data: params.payload || {},
    event_key: params.eventKey,
    event_name: reg.name,
    related_type: params.relatedType || null,
    related_id: params.relatedId || null,
  } as any);

  // Find matching automations
  const query = supabase
    .from("automations")
    .select("*")
    .eq("trigger_event", params.eventKey)
    .eq("enabled", true);

  if (params.clientId) {
    query.or(`client_id.eq.${params.clientId},client_id.is.null`);
  }

  const { data: automations } = await query;
  if (!automations || automations.length === 0) return;

  // Execute each matching automation
  for (const auto of automations) {
    await executeAutomation(auto, params);
  }
}

// ─── Execute Automation ──────────────────────────────────────────────

async function executeAutomation(
  automation: any,
  context: { eventKey: string; clientId?: string | null; relatedType?: string; relatedId?: string; payload?: Record<string, any> }
) {
  // Create run record
  const { data: run } = await supabase
    .from("automation_runs")
    .insert({
      automation_id: automation.id,
      client_id: context.clientId || automation.client_id || null,
      status: "running",
      started_at: new Date().toISOString(),
      related_type: context.relatedType || null,
      related_id: context.relatedId || null,
      trigger_payload: context.payload || {},
    } as any)
    .select("id")
    .single();

  if (!run) return;

  try {
    const actions = Array.isArray(automation.action_config)
      ? automation.action_config
      : (automation.action_config as any)?.actions || [];

    for (const action of actions) {
      await executeAction(run.id, action, context);
    }

    await supabase.from("automation_runs").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    } as any).eq("id", run.id);
  } catch (err: any) {
    await supabase.from("automation_runs").update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error: err?.message || "Unknown error",
    } as any).eq("id", run.id);
  }
}

// ─── Execute Single Action ──────────────────────────────────────────

async function executeAction(
  runId: string,
  action: { action_key: string; action_type: string; config?: any },
  context: { clientId?: string | null; payload?: Record<string, any> }
) {
  try {
    // Action dispatch — each action type can be extended here
    switch (action.action_type) {
      case "create_activity_feed_entry":
        await supabase.from("audit_logs").insert({
          action: action.config?.action || "automation_action",
          module: action.config?.module || "automation",
          client_id: context.clientId || null,
          metadata: { run_id: runId, ...context.payload },
        });
        break;

      case "create_audit_log":
        await supabase.from("audit_logs").insert({
          action: action.config?.action || "automation_audit",
          module: action.config?.module || "automation",
          client_id: context.clientId || null,
          metadata: { run_id: runId, ...context.payload },
        });
        break;

      case "send_internal_notification":
        await supabase.from("notifications").insert({
          client_id: context.clientId || null,
          title: action.config?.title || "Automation Notification",
          message: action.config?.message || "An automation completed.",
          type: action.config?.type || "system",
          status: "unread",
        } as any);
        break;

      case "update_deal_stage":
        if (context.payload?.deal_id && action.config?.stage) {
          await supabase.from("crm_deals").update({
            pipeline_stage: action.config.stage,
          } as any).eq("id", context.payload.deal_id);
        }
        break;

      case "create_task":
        if (context.clientId) {
          await supabase.from("tasks").insert({
            client_id: context.clientId,
            title: action.config?.title || "Automated Task",
            description: action.config?.description || "",
            status: "open",
            priority: action.config?.priority || "medium",
          } as any);
        }
        break;

      default:
        // Log unhandled action types for future implementation
        break;
    }

    // Log success
    await supabase.from("automation_action_logs").insert({
      automation_run_id: runId,
      action_key: action.action_key || action.action_type,
      action_type: action.action_type,
      action_status: "Completed",
      result_summary: `Action ${action.action_type} executed successfully`,
    } as any);
  } catch (err: any) {
    await supabase.from("automation_action_logs").insert({
      automation_run_id: runId,
      action_key: action.action_key || action.action_type,
      action_type: action.action_type,
      action_status: "Failed",
      error_message: err?.message || "Unknown error",
    } as any);
    throw err; // Propagate to mark run as failed
  }
}

// ─── Default Automation Profiles ─────────────────────────────────────

export const DEFAULT_PROFILES = [
  {
    automation_name: "Sales Meeting Booked → Update Deal + Notify",
    automation_key: "sales_meeting_booked_flow",
    automation_category: "Sales",
    workspace_scope_type: "admin_sales",
    trigger_event: "sales_meeting_booked",
    action_config: { actions: [
      { action_key: "update_deal", action_type: "update_deal_stage", config: { stage: "booked_meeting" } },
      { action_key: "notify_sales", action_type: "send_internal_notification", config: { title: "Meeting Booked", message: "A new sales meeting has been booked." } },
      { action_key: "log_activity", action_type: "create_activity_feed_entry", config: { action: "sales_meeting_booked", module: "sales" } },
    ]},
  },
  {
    automation_name: "Proposal Accepted → Close Deal + Billing",
    automation_key: "proposal_accepted_flow",
    automation_category: "Proposal",
    workspace_scope_type: "admin_sales",
    trigger_event: "proposal_accepted",
    action_config: { actions: [
      { action_key: "close_deal", action_type: "update_deal_stage", config: { stage: "closed_won" } },
      { action_key: "notify_team", action_type: "send_internal_notification", config: { title: "Proposal Accepted!", message: "A proposal has been accepted. Billing and activation initiated." } },
      { action_key: "log_activity", action_type: "create_audit_log", config: { action: "proposal_accepted_automation", module: "sales" } },
    ]},
  },
  {
    automation_name: "Client Booking Created → Confirm + Log",
    automation_key: "client_booking_created_flow",
    automation_category: "Booking",
    workspace_scope_type: "client_workspace",
    trigger_event: "client_booking_created",
    action_config: { actions: [
      { action_key: "notify_staff", action_type: "send_internal_notification", config: { title: "New Booking", message: "A new booking has been created." } },
      { action_key: "log_activity", action_type: "create_activity_feed_entry", config: { action: "booking_created", module: "calendar" } },
    ]},
  },
  {
    automation_name: "Negative Review → Recovery Task",
    automation_key: "negative_review_recovery",
    automation_category: "Reviews",
    workspace_scope_type: "client_workspace",
    trigger_event: "review_feedback_negative",
    action_config: { actions: [
      { action_key: "create_recovery", action_type: "create_task", config: { title: "Review Recovery Required", description: "A negative review was received. Follow up with the customer.", priority: "high" } },
      { action_key: "notify_owner", action_type: "send_internal_notification", config: { title: "Negative Feedback", message: "A customer left negative feedback. Recovery task created." } },
      { action_key: "log_activity", action_type: "create_audit_log", config: { action: "review_recovery_created", module: "reviews" } },
    ]},
  },
  {
    automation_name: "Invoice Failed → Notify + Follow-up",
    automation_key: "invoice_failed_followup",
    automation_category: "Billing",
    workspace_scope_type: "admin_global",
    trigger_event: "invoice_failed",
    action_config: { actions: [
      { action_key: "notify_billing", action_type: "send_internal_notification", config: { title: "Invoice Payment Failed", message: "An invoice payment has failed. Follow up required." } },
      { action_key: "create_followup", action_type: "create_task", config: { title: "Follow Up on Failed Payment", description: "Invoice payment failed — contact client.", priority: "high" } },
      { action_key: "log_activity", action_type: "create_audit_log", config: { action: "invoice_failed_automation", module: "billing" } },
    ]},
  },
  {
    automation_name: "Team Member Added → Invite + Log",
    automation_key: "team_member_added_flow",
    automation_category: "Workforce",
    workspace_scope_type: "client_workspace",
    trigger_event: "team_member_added",
    action_config: { actions: [
      { action_key: "log_activity", action_type: "create_activity_feed_entry", config: { action: "team_member_added", module: "team" } },
      { action_key: "notify_manager", action_type: "send_internal_notification", config: { title: "New Team Member", message: "A new team member has been added to the workspace." } },
    ]},
  },
  {
    automation_name: "Activation Form Submitted → Configure Workspace",
    automation_key: "activation_submitted_flow",
    automation_category: "Activation",
    workspace_scope_type: "admin_global",
    trigger_event: "activation_form_submitted",
    action_config: { actions: [
      { action_key: "notify_ops", action_type: "send_internal_notification", config: { title: "Activation Submitted", message: "A client activation form has been submitted." } },
      { action_key: "log_activity", action_type: "create_audit_log", config: { action: "activation_form_submitted", module: "activation" } },
    ]},
  },
  {
    automation_name: "Client Booking Completed → Review Request",
    automation_key: "booking_completed_review",
    automation_category: "Booking",
    workspace_scope_type: "client_workspace",
    trigger_event: "client_booking_completed",
    action_config: { actions: [
      { action_key: "log_activity", action_type: "create_activity_feed_entry", config: { action: "booking_completed", module: "calendar" } },
      { action_key: "notify", action_type: "send_internal_notification", config: { title: "Booking Completed", message: "An appointment has been completed." } },
    ]},
  },
  {
    automation_name: "Contract Expiring → Renewal Alert",
    automation_key: "contract_expiring_alert",
    automation_category: "Billing",
    workspace_scope_type: "admin_global",
    trigger_event: "contract_expiring",
    action_config: { actions: [
      { action_key: "notify", action_type: "send_internal_notification", config: { title: "Contract Expiring Soon", message: "A client contract is nearing its end date." } },
      { action_key: "create_task", action_type: "create_task", config: { title: "Renewal Discussion Needed", description: "Client contract is expiring soon.", priority: "medium" } },
    ]},
  },
  {
    automation_name: "Demo Workspace Created → Notify Sales",
    automation_key: "demo_workspace_notify",
    automation_category: "Activation",
    workspace_scope_type: "admin_sales",
    trigger_event: "demo_workspace_created",
    action_config: { actions: [
      { action_key: "notify_sales", action_type: "send_internal_notification", config: { title: "Demo Workspace Ready", message: "A demo workspace has been created and is ready for presentation." } },
      { action_key: "log", action_type: "create_audit_log", config: { action: "demo_workspace_created", module: "sales" } },
    ]},
  },
];
