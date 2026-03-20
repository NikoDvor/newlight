export interface ServiceConfig {
  service_name: string;
  service_description: string;
  display_price_text: string;
  service_status: string;
  bookable: string;
}

export const defaultServiceConfig = (): ServiceConfig => ({
  service_name: "", service_description: "", display_price_text: "",
  service_status: "draft", bookable: "no",
});

export interface CalendarConfig {
  calendar_name: string;
  calendar_type: string;
  description: string;
  owner_user: string;
  assigned_users: string;
  appointment_types: string;
  default_duration: string;
  buffer_before: string;
  buffer_after: string;
  availability_days: string;
  availability_hours_start: string;
  availability_hours_end: string;
  slot_interval: string;
  booking_link_slug: string;
  location_type: string;
  meeting_link_type: string;
  confirmation_message: string;
  reminders_enabled: string;
  active: string;
  staff_pool: string;
  distribution_method: string;
  fallback_owner: string;
  department_name: string;
}

export const defaultCalendarConfig = (): CalendarConfig => ({
  calendar_name: "",
  calendar_type: "single",
  description: "",
  owner_user: "",
  assigned_users: "",
  appointment_types: "Consultation",
  default_duration: "30",
  buffer_before: "0",
  buffer_after: "0",
  availability_days: "1,2,3,4,5",
  availability_hours_start: "09:00",
  availability_hours_end: "17:00",
  slot_interval: "30",
  booking_link_slug: "",
  location_type: "virtual",
  meeting_link_type: "zoom",
  confirmation_message: "",
  reminders_enabled: "yes",
  active: "yes",
  staff_pool: "",
  distribution_method: "round_robin",
  fallback_owner: "",
  department_name: "",
});

export interface TeamMemberConfig {
  full_name: string;
  email: string;
  phone: string;
  job_title: string;
  department: string;
  role_preset: string;
  calendar_access: string;
  bookable_staff: string;
  crm_access: string;
  training_access: string;
  assigned_calendars: string;
}

export const defaultTeamMemberConfig = (): TeamMemberConfig => ({
  full_name: "", email: "", phone: "", job_title: "", department: "",
  role_preset: "", calendar_access: "no", bookable_staff: "no",
  crm_access: "no", training_access: "no", assigned_calendars: "",
});

export const ROLE_PRESET_OPTIONS = [
  { value: "workspace_admin", label: "Workspace Admin" },
  { value: "manager", label: "Manager" },
  { value: "front_desk", label: "Front Desk" },
  { value: "sales_rep", label: "Sales Rep" },
  { value: "service_provider", label: "Service Provider" },
  { value: "support_staff", label: "Support Staff" },
  { value: "marketing_staff", label: "Marketing Staff" },
  { value: "custom", label: "Custom" },
];

export interface ActivationFormState {
  // Step 1: Deal Close
  business_name_confirmed: string;
  legal_business_name: string;
  display_name: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  secondary_contact_name: string;
  secondary_contact_email: string;
  secondary_contact_phone: string;
  deal_status: string;
  payment_confirmed: string;
  payment_method: string;
  setup_fee: string;
  monthly_fee: string;
  contract_term: string;
  service_package: string;
  kickoff_contact: string;
  kickoff_email: string;
  kickoff_phone: string;
  closing_notes: string;
  sales_notes: string;
  assigned_account_manager: string;
  assigned_sales_rep: string;
  activation_priority: string;
  requested_launch_date: string;
  immediate_activation: string;

  // Step 2: Branding
  company_name: string;
  dashboard_title: string;
  welcome_message: string;
  tagline: string;
  website_url: string;
  primary_location: string;
  additional_locations: string;
  industry: string;
  main_service: string;
  primary_goal: string;
  growth_challenge: string;
  brand_personality: string;
  tone_of_voice: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string;
  app_display_name: string;
  workspace_header_name: string;
  calendar_title: string;
  finance_dashboard_title: string;
  report_header_title: string;
  login_branding_text: string;

  // Step 3: CRM
  crm_mode: string;
  crm_provider: string;
  crm_admin_email: string;
  crm_workspace_name: string;
  sync_priority: string;
  import_contacts_now: string;
  field_mapping_contact: string;
  lead_sources: string;
  default_sales_owner: string;
  default_pipeline_owner: string;
  sales_process_type: string;
  multiple_pipelines: string;
  pipeline_types: string;
  existing_contact_count: string;
  existing_deal_count: string;
  csv_import: string;
  custom_fields: string;
  crm_notes: string;

  // Step 4: Calendar
  num_calendars: string;
  use_native_calendar: string;
  external_calendar_sync: string;
  default_timezone: string;
  default_meeting_types: string;
  booking_page_branded: string;
  round_robin: string;
  team_assignment_logic: string;
  // New calendar fields
  different_booking_links: string;
  need_department_calendars: string;
  default_reminder_preference: string;
  default_cancellation_policy: string;
  default_reschedule_policy: string;
  calendar_configs: CalendarConfig[];

  // Step 5: Services & Products
  service_configs: ServiceConfig[];
  services_notes: string;

  // Step 6: Booking Forms
  use_native_forms: string;
  need_booking_form: string;
  need_intake_form: string;
  need_quote_form: string;
  need_support_form: string;
  need_contact_form: string;
  form_calendar_link: string;
  form_creates_contact: string;
  form_triggers_reminders: string;
  form_notification_owner: string;
  form_tone: string;
  need_custom_fields: string;
  form_notes: string;

  // Step 6: Email
  use_native_email: string;
  email_provider: string;
  main_inbox: string;
  shared_inbox: string;
  shared_inbox_users: string;
  sender_name: string;
  reply_to_email: string;
  template_categories: string;
  sales_inbox: string;
  support_inbox: string;
  review_messaging: string;
  booking_reminder_messaging: string;
  followup_messaging: string;
  messaging_owner: string;
  preferred_reminder_channel: string;
  business_phone: string;
  twilio_needed: string;
  sms_consent_notes: string;
  email_notes: string;

  // Step 6: Reviews
  use_native_reviews: string;
  primary_review_platform: string;
  google_review_link: string;
  facebook_review_link: string;
  other_review_link: string;
  review_send_timing: string;
  preferred_review_channel: string;
  recovery_owner: string;
  review_templates_needed: string;
  auto_send_after_appointment: string;
  service_recovery_enabled: string;
  public_review_prompt: string;
  reputation_goal: string;
  reputation_notes: string;

  // Step 8: Team / Employee
  need_team_now: string;
  num_team_members: string;
  need_training_access: string;
  need_meeting_intel_access: string;
  team_member_configs: TeamMemberConfig[];

  // Step 9: Workforce
  use_workforce: string;
  need_payroll: string;
  num_workers: string;
  departments: string;
  labor_categories: string;
  require_timesheet_approval: string;
  default_pay_frequency: string;
  overtime_enabled: string;
  commission_enabled: string;
  workforce_manager: string;
  employee_portal: string;

  // Step 8: Finance
  use_finance: string;
  payroll_frequency: string;
  require_payroll_approval: string;
  reimbursements_used: string;
  deductions_used: string;
  bonus_structure: string;
  commission_structure: string;
  accountant_name: string;
  accountant_email: string;
  payroll_export_frequency: string;
  labor_cost_tracking: string;
  revenue_categories: string;
  cost_centers: string;
  accountant_handoff: string;
  payroll_prep_notes: string;

  // Step 9: Marketing
  use_seo: string;
  use_website_workspace: string;
  use_ads: string;
  use_social: string;
  use_content_planner: string;
  main_website_platform: string;
  service_areas: string;
  seo_keywords: string;
  competitors: string;
  ad_platforms: string;
  social_platforms: string;
  content_approval_owner: string;
  reporting_priorities: string;
  main_kpis: string;
  local_visibility: string;
  content_workflow: string;
  example_data: string;
  marketing_notes: string;

  // Step 10: Proposals
  use_proposals: string;
  signer_legal_name: string;
  signer_name: string;
  signer_title: string;
  signer_email: string;
  additional_approver_name: string;
  additional_approver_email: string;
  approval_order: string;
  need_nda: string;
  need_service_agreement: string;
  need_proposal_template: string;
  need_internal_approval: string;
  document_notes: string;

  // Step 11: Support
  use_helpdesk: string;
  support_email: string;
  support_inbox_owner: string;
  ticket_categories: string;
  priority_contact: string;
  sla_notes: string;
  customer_support_portal: string;
  internal_escalation: string;
  helpdesk_notes: string;

  // Step 12: Integrations
  integrations: Record<string, { used: string; access_ready: string; access_owner: string; admin_email: string; priority: string; notes: string }>;

  // Step 13: Notifications
  booking_notify: string;
  cancellation_notify: string;
  review_recovery_notify: string;
  payroll_approval_notify: string;
  support_ticket_notify: string;
  onboarding_notify: string;
  preferred_channels: string;
  quiet_hours: string;
  team_roles_notes: string;
  manager_roles: string;
  readonly_users: string;
  client_team_members: string;
  worker_portal_users: string;
}

export const STEPS = [
  { id: 1, title: "Deal Close + Activation", icon: "Zap" },
  { id: 2, title: "Business Identity + Branding", icon: "Palette" },
  { id: 3, title: "CRM Setup", icon: "Users" },
  { id: 4, title: "Calendar Setup", icon: "Calendar" },
  { id: 5, title: "Services & Products", icon: "ShoppingBag" },
  { id: 6, title: "Booking Forms", icon: "ClipboardList" },
  { id: 7, title: "Email + Messaging", icon: "Mail" },
  { id: 8, title: "Reviews + Reputation", icon: "Star" },
  { id: 9, title: "Team / Employee Setup", icon: "UserPlus" },
  { id: 10, title: "Workforce + Payroll", icon: "DollarSign" },
  { id: 11, title: "Finance Ops", icon: "DollarSign" },
  { id: 12, title: "Marketing Systems", icon: "TrendingUp" },
  { id: 13, title: "Support / Help Desk", icon: "Headphones" },
  { id: 14, title: "Integrations + Access", icon: "Link" },
  { id: 15, title: "Review + Activate", icon: "CheckCircle" },
] as const;

export const INTEGRATION_KEYS = [
  "Google Analytics", "Search Console", "Google Business Profile", "Meta",
  "Google Ads", "Stripe", "Twilio", "Zoom", "External CRM", "Email Provider",
  "External Calendar",
] as const;

export const defaultIntegrations = (): ActivationFormState["integrations"] => {
  const result: ActivationFormState["integrations"] = {};
  INTEGRATION_KEYS.forEach(k => {
    result[k] = { used: "", access_ready: "", access_owner: "", admin_email: "", priority: "medium", notes: "" };
  });
  return result;
};

export const INDUSTRY_CALENDAR_SUGGESTIONS: Record<string, { name: string; type: string; types: string }[]> = {
  "salon": [
    { name: "Consultation", type: "single", types: "Consultation" },
    { name: "Staff Calendars", type: "staff", types: "Haircut, Color, Style" },
  ],
  "spa": [
    { name: "Consultation", type: "single", types: "Consultation" },
    { name: "Staff Calendars", type: "staff", types: "Massage, Facial, Body Treatment" },
  ],
  "med spa": [
    { name: "Consultation", type: "single", types: "Consultation" },
    { name: "Follow-Up", type: "single", types: "Follow-Up" },
    { name: "Provider Calendars", type: "staff", types: "Botox, Filler, Laser" },
  ],
  "agency": [
    { name: "Sales Calendar", type: "single", types: "Discovery Call, Demo" },
    { name: "Onboarding Calendar", type: "single", types: "Kickoff, Setup" },
    { name: "Support Calendar", type: "team", types: "Support Call" },
  ],
  "home service": [
    { name: "Estimate Calendar", type: "single", types: "Estimate, Walkthrough" },
    { name: "Service Calendar", type: "team", types: "Service Appointment" },
    { name: "Team Calendar", type: "round_robin", types: "Service Call" },
  ],
  "professional service": [
    { name: "Consultation", type: "single", types: "Consultation, Strategy Session" },
    { name: "Team Calendar", type: "team", types: "Meeting" },
    { name: "Support Calendar", type: "single", types: "Support Call" },
  ],
  "dental": [
    { name: "New Patient", type: "single", types: "New Patient Exam" },
    { name: "Provider Calendars", type: "staff", types: "Cleaning, Filling, Crown" },
  ],
  "fitness": [
    { name: "Consultation", type: "single", types: "Free Consultation, Assessment" },
    { name: "Trainer Calendars", type: "staff", types: "Personal Training, Group Class" },
  ],
};

export const defaultFormState = (): ActivationFormState => ({
  business_name_confirmed: "", legal_business_name: "", display_name: "",
  owner_name: "", owner_email: "", owner_phone: "",
  secondary_contact_name: "", secondary_contact_email: "", secondary_contact_phone: "",
  deal_status: "pending_payment", payment_confirmed: "pending", payment_method: "credit_card",
  setup_fee: "", monthly_fee: "", contract_term: "", service_package: "enterprise",
  kickoff_contact: "", kickoff_email: "", kickoff_phone: "",
  closing_notes: "", sales_notes: "",
  assigned_account_manager: "", assigned_sales_rep: "",
  activation_priority: "normal", requested_launch_date: "", immediate_activation: "no",

  company_name: "", dashboard_title: "", welcome_message: "", tagline: "",
  website_url: "", primary_location: "", additional_locations: "", industry: "",
  main_service: "", primary_goal: "", growth_challenge: "",
  brand_personality: "", tone_of_voice: "",
  primary_color: "#3B82F6", secondary_color: "#06B6D4", accent_color: "#8B5CF6",
  logo_url: "", app_display_name: "", workspace_header_name: "",
  calendar_title: "", finance_dashboard_title: "", report_header_title: "",
  login_branding_text: "",

  crm_mode: "native", crm_provider: "", crm_admin_email: "", crm_workspace_name: "",
  sync_priority: "medium", import_contacts_now: "no", field_mapping_contact: "",
  lead_sources: "", default_sales_owner: "", default_pipeline_owner: "",
  sales_process_type: "", multiple_pipelines: "no", pipeline_types: "",
  existing_contact_count: "", existing_deal_count: "",
  csv_import: "no", custom_fields: "no", crm_notes: "",

  num_calendars: "1", use_native_calendar: "yes", external_calendar_sync: "no",
  default_timezone: "America/Los_Angeles", default_meeting_types: "",
  booking_page_branded: "yes", round_robin: "no", team_assignment_logic: "",
  different_booking_links: "no", need_department_calendars: "no",
  default_reminder_preference: "email", default_cancellation_policy: "",
  default_reschedule_policy: "",
  calendar_configs: [defaultCalendarConfig()],

  service_configs: [defaultServiceConfig()],
  services_notes: "",

  use_native_forms: "yes", need_booking_form: "yes", need_intake_form: "no",
  need_quote_form: "no", need_support_form: "no", need_contact_form: "no",
  form_calendar_link: "primary", form_creates_contact: "yes",
  form_triggers_reminders: "yes", form_notification_owner: "",
  form_tone: "professional", need_custom_fields: "no", form_notes: "",

  use_native_email: "yes", email_provider: "", main_inbox: "", shared_inbox: "no",
  shared_inbox_users: "", sender_name: "", reply_to_email: "", template_categories: "",
  sales_inbox: "no", support_inbox: "no", review_messaging: "yes",
  booking_reminder_messaging: "yes", followup_messaging: "yes",
  messaging_owner: "", preferred_reminder_channel: "email",
  business_phone: "", twilio_needed: "no", sms_consent_notes: "", email_notes: "",

  use_native_reviews: "yes", primary_review_platform: "google",
  google_review_link: "", facebook_review_link: "", other_review_link: "",
  review_send_timing: "after_appointment", preferred_review_channel: "email",
  recovery_owner: "", review_templates_needed: "yes",
  auto_send_after_appointment: "yes", service_recovery_enabled: "yes",
  public_review_prompt: "yes", reputation_goal: "", reputation_notes: "",

  need_team_now: "no", num_team_members: "0",
  need_training_access: "no", need_meeting_intel_access: "no",
  team_member_configs: [defaultTeamMemberConfig()],

  use_workforce: "no", need_payroll: "no", num_workers: "", departments: "",
  labor_categories: "", require_timesheet_approval: "yes",
  default_pay_frequency: "biweekly", overtime_enabled: "no",
  commission_enabled: "no", workforce_manager: "", employee_portal: "no",

  use_finance: "yes", payroll_frequency: "biweekly",
  require_payroll_approval: "yes", reimbursements_used: "no",
  deductions_used: "no", bonus_structure: "no", commission_structure: "no",
  accountant_name: "", accountant_email: "", payroll_export_frequency: "",
  labor_cost_tracking: "no", revenue_categories: "", cost_centers: "",
  accountant_handoff: "no", payroll_prep_notes: "",

  use_seo: "yes", use_website_workspace: "yes", use_ads: "yes",
  use_social: "yes", use_content_planner: "yes",
  main_website_platform: "", service_areas: "", seo_keywords: "",
  competitors: "", ad_platforms: "", social_platforms: "",
  content_approval_owner: "", reporting_priorities: "", main_kpis: "",
  local_visibility: "yes", content_workflow: "no", example_data: "yes",
  marketing_notes: "",

  use_proposals: "yes", signer_legal_name: "", signer_name: "", signer_title: "",
  signer_email: "", additional_approver_name: "", additional_approver_email: "",
  approval_order: "sequential", need_nda: "no", need_service_agreement: "yes",
  need_proposal_template: "yes", need_internal_approval: "no", document_notes: "",

  use_helpdesk: "yes", support_email: "", support_inbox_owner: "",
  ticket_categories: "", priority_contact: "", sla_notes: "",
  customer_support_portal: "no", internal_escalation: "yes", helpdesk_notes: "",

  integrations: defaultIntegrations(),

  booking_notify: "", cancellation_notify: "", review_recovery_notify: "",
  payroll_approval_notify: "", support_ticket_notify: "", onboarding_notify: "",
  preferred_channels: "in_app", quiet_hours: "",
  team_roles_notes: "", manager_roles: "", readonly_users: "",
  client_team_members: "", worker_portal_users: "",
});

export interface StepProps {
  form: ActivationFormState;
  set: (key: string, value: string) => void;
  setIntegration: (name: string, field: string, value: string) => void;
  submitting: boolean;
}
