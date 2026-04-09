// ── Twilio Playbook Engine ──
// Resolves twilioPlaybook from StructuredWorkspaceProfile into messaging
// cadence presets for the existing automation/template system.
// Does NOT rebuild Twilio infrastructure — provides routing and preset data.

import type { StructuredWorkspaceProfile } from "@/lib/businessCategoryRegistry";

export type TwilioPlaybookKey =
  | "financial_compliance_nurture"
  | "appointment_reactivation"
  | "speed_to_lead_field_service"
  | "foot_traffic_loyalty"
  | "consultative_followup"
  | "recurring_retention"
  | "retail_safe_default"
  | "project_milestone_updates";

export interface TwilioPlaybookConfig {
  key: TwilioPlaybookKey;
  label: string;
  description: string;
  cadenceStyle: "conservative" | "moderate" | "aggressive" | "minimal";
  messagingCapabilities: string[];
  automationTemplates: string[];
  complianceSafe: boolean;
}

const PLAYBOOKS: Record<TwilioPlaybookKey, TwilioPlaybookConfig> = {
  financial_compliance_nurture: {
    key: "financial_compliance_nurture",
    label: "Financial Compliance Nurture",
    description: "Compliant lead follow-up, approval-sensitive reminders, nurture check-ins, review-required messaging states",
    cadenceStyle: "conservative",
    messagingCapabilities: [
      "compliant_lead_followup",
      "approval_sensitive_reminder",
      "proposal_followup_sequence",
      "nurture_checkin",
      "review_required_messaging",
    ],
    automationTemplates: [
      "lead_followup_compliant",
      "meeting_reminder_professional",
      "proposal_reminder_cadence",
      "quarterly_checkin",
    ],
    complianceSafe: true,
  },
  appointment_reactivation: {
    key: "appointment_reactivation",
    label: "Appointment Reactivation",
    description: "Appointment reminders, missed follow-up, rebooking nudges, review requests, consultation follow-up",
    cadenceStyle: "moderate",
    messagingCapabilities: [
      "appointment_reminder",
      "missed_appointment_followup",
      "rebooking_nudge",
      "review_request",
      "lead_consultation_followup",
    ],
    automationTemplates: [
      "appt_reminder_24h",
      "appt_reminder_1h",
      "missed_appt_followup",
      "rebooking_30day",
      "review_request_post_visit",
    ],
    complianceSafe: false,
  },
  speed_to_lead_field_service: {
    key: "speed_to_lead_field_service",
    label: "Speed-to-Lead Field Service",
    description: "Fast lead response, missed-call text back, estimate follow-up, no-show recovery",
    cadenceStyle: "aggressive",
    messagingCapabilities: [
      "fast_lead_response",
      "missed_call_textback",
      "estimate_followup",
      "appointment_reminder",
      "no_show_recovery",
    ],
    automationTemplates: [
      "instant_lead_response",
      "missed_call_auto_text",
      "estimate_followup_24h",
      "appt_reminder_field",
      "no_response_recovery",
    ],
    complianceSafe: false,
  },
  foot_traffic_loyalty: {
    key: "foot_traffic_loyalty",
    label: "Foot Traffic & Loyalty",
    description: "Reservation follow-up, repeat-visit nudges, review requests, limited-time offers",
    cadenceStyle: "minimal",
    messagingCapabilities: [
      "reservation_followup",
      "repeat_visit_nudge",
      "review_request",
      "limited_time_offer",
    ],
    automationTemplates: [
      "post_visit_thankyou",
      "return_visit_30day",
      "review_request_friendly",
      "promo_offer_seasonal",
    ],
    complianceSafe: false,
  },
  consultative_followup: {
    key: "consultative_followup",
    label: "Consultative Follow-Up",
    description: "Inquiry follow-up, meeting reminders, proposal cadence, nurture sequence, decision-maker follow-up",
    cadenceStyle: "moderate",
    messagingCapabilities: [
      "inquiry_followup",
      "meeting_reminder",
      "proposal_reminder_cadence",
      "nurture_checkin",
      "decision_maker_followup",
    ],
    automationTemplates: [
      "lead_inquiry_followup",
      "meeting_reminder_professional",
      "proposal_followup_sequence",
      "nurture_quarterly",
      "decision_maker_nudge",
    ],
    complianceSafe: false,
  },
  recurring_retention: {
    key: "recurring_retention",
    label: "Recurring Retention",
    description: "Renewal reminders, churn-risk outreach, onboarding check-ins, inactive reactivation",
    cadenceStyle: "moderate",
    messagingCapabilities: [
      "renewal_reminder",
      "churn_risk_outreach",
      "onboarding_checkin",
      "inactive_reactivation",
      "retention_messaging",
    ],
    automationTemplates: [
      "renewal_30day_notice",
      "churn_risk_engagement",
      "onboarding_day7_checkin",
      "inactive_60day_reactivation",
      "retention_milestone",
    ],
    complianceSafe: false,
  },
  retail_safe_default: {
    key: "retail_safe_default",
    label: "Retail Safe Default",
    description: "Safe services-first reminders only — no commerce-heavy automation until later setup",
    cadenceStyle: "minimal",
    messagingCapabilities: [
      "order_confirmation",
      "appointment_reminder",
      "review_request",
    ],
    automationTemplates: [
      "order_thankyou",
      "appt_reminder_basic",
      "review_request_basic",
    ],
    complianceSafe: false,
  },
  project_milestone_updates: {
    key: "project_milestone_updates",
    label: "Project Milestone Updates",
    description: "Kickoff reminders, milestone updates, approval reminders, delivery notifications, post-delivery follow-up",
    cadenceStyle: "moderate",
    messagingCapabilities: [
      "kickoff_reminder",
      "milestone_update",
      "approval_reminder",
      "delivery_notification",
      "post_delivery_followup",
    ],
    automationTemplates: [
      "project_kickoff_notice",
      "milestone_completion_update",
      "approval_request_reminder",
      "delivery_complete_notice",
      "post_project_followup",
    ],
    complianceSafe: false,
  },
};

const CATEGORY_PLAYBOOK_MAP: Record<string, TwilioPlaybookKey> = {
  financial_compliance: "financial_compliance_nurture",
  aesthetics_wellness: "appointment_reactivation",
  field_local_service: "speed_to_lead_field_service",
  food_hospitality: "foot_traffic_loyalty",
  professional_consultative: "consultative_followup",
  real_estate: "consultative_followup",
  membership_recurring: "recurring_retention",
  retail_ecommerce: "retail_safe_default",
  technology_saas: "recurring_retention",
  project_delivery: "project_milestone_updates",
};

export function resolveTwilioPlaybook(profile: StructuredWorkspaceProfile): TwilioPlaybookConfig {
  const key = CATEGORY_PLAYBOOK_MAP[profile.category] ?? "consultative_followup";
  return PLAYBOOKS[key];
}

export function getTwilioPlaybookByKey(key: TwilioPlaybookKey): TwilioPlaybookConfig {
  return PLAYBOOKS[key];
}

export function getAllPlaybooks(): TwilioPlaybookConfig[] {
  return Object.values(PLAYBOOKS);
}

/** Check if playbook is ready for use (requires Twilio setup) */
export function isPlaybookReady(_clientIntegrations: { provider: string; status: string }[]): boolean {
  return _clientIntegrations.some(
    i => i.provider === "twilio" && i.status === "connected"
  );
}
