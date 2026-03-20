/**
 * Master System Registry — single source of truth for all platform modules,
 * their readiness, dependency type, and integration boundaries.
 */

export type ModuleStatus =
  | "Production Ready"
  | "Operational"
  | "Partially Operational"
  | "In Progress"
  | "Needs Hardening"
  | "Planned";

export type DependencyType = "Native" | "External-Required" | "External-Optional";

export type SystemCategory =
  | "Core Engine"
  | "Revenue Systems"
  | "Growth Systems"
  | "Communications"
  | "Support Systems"
  | "Client Workspace"
  | "Admin Systems"
  | "Integrations";

export interface SystemModule {
  key: string;
  name: string;
  category: SystemCategory;
  status: ModuleStatus;
  dependency: DependencyType;
  description: string;
  routes: string[];
  dataModels: string[];
  feedsInto: string[];
  receivesFrom: string[];
}

export const systemModules: SystemModule[] = [
  // ── Core Engine ──
  {
    key: "crm",
    name: "CRM & Pipelines",
    category: "Core Engine",
    status: "Operational",
    dependency: "Native",
    description: "Contact/company/deal management with multi-pipeline support.",
    routes: ["/crm", "/pipeline"],
    dataModels: ["crm_contacts", "crm_companies", "crm_deals", "crm_pipelines", "crm_pipeline_stages"],
    feedsInto: ["proposals", "billing", "automation", "conversations", "ai_insights"],
    receivesFrom: ["calendar", "forms", "reviews", "conversations"],
  },
  {
    key: "calendar",
    name: "Calendar & Booking Engine",
    category: "Core Engine",
    status: "Operational",
    dependency: "Native",
    description: "Multi-calendar scheduling, booking links, appointment types, and availability.",
    routes: ["/calendar", "/calendar-management"],
    dataModels: ["calendars", "appointments", "calendar_events", "calendar_availability", "booking_links"],
    feedsInto: ["crm", "reviews", "automation", "conversations"],
    receivesFrom: ["forms", "crm"],
  },
  {
    key: "forms",
    name: "Form Builder",
    category: "Core Engine",
    status: "Operational",
    dependency: "Native",
    description: "Dynamic form creation with submissions tracking.",
    routes: ["/forms"],
    dataModels: ["form_definitions", "form_submissions"],
    feedsInto: ["crm", "calendar", "automation"],
    receivesFrom: [],
  },
  {
    key: "automation",
    name: "Automation Orchestration",
    category: "Core Engine",
    status: "Operational",
    dependency: "Native",
    description: "35+ event triggers, cross-module action execution, workflow builder.",
    routes: ["/automations", "/admin/automations"],
    dataModels: ["automations", "automation_runs", "automation_events", "automation_action_logs"],
    feedsInto: ["crm", "conversations", "billing", "notifications"],
    receivesFrom: ["crm", "calendar", "billing", "reviews", "forms"],
  },

  // ── Revenue Systems ──
  {
    key: "proposals",
    name: "Proposal & E-Sign Engine",
    category: "Revenue Systems",
    status: "Operational",
    dependency: "Native",
    description: "Proposal creation, templates, native e-sign with canvas signature, IP logging, and deal linkage.",
    routes: ["/proposals", "/admin/proposal-templates", "/proposal/:token"],
    dataModels: ["proposals", "proposal_templates", "proposal_sections", "proposal_line_items", "proposal_signatures"],
    feedsInto: ["billing", "activation", "packages"],
    receivesFrom: ["crm", "packages"],
  },
  {
    key: "billing",
    name: "Billing & Revenue Engine",
    category: "Revenue Systems",
    status: "Operational",
    dependency: "Native",
    description: "Subscriptions, invoices, payment tracking, MRR visibility.",
    routes: ["/billing", "/admin/billing", "/finance"],
    dataModels: ["billing_accounts", "subscriptions", "invoices", "payments", "billing_events"],
    feedsInto: ["health_scoring", "activation", "renewals"],
    receivesFrom: ["proposals", "packages", "stripe"],
  },
  {
    key: "packages",
    name: "Package & Offer Engine",
    category: "Revenue Systems",
    status: "Operational",
    dependency: "Native",
    description: "Configurable offer packages, deliverables, pricing models, upsell paths.",
    routes: ["/admin/packages"],
    dataModels: ["offer_packages", "package_deliverables", "package_relationships"],
    feedsInto: ["proposals", "billing", "activation", "upsell"],
    receivesFrom: [],
  },
  {
    key: "upsell",
    name: "Upsell & Expansion Engine",
    category: "Revenue Systems",
    status: "Partially Operational",
    dependency: "Native",
    description: "Detects cross-sell/upsell opportunities based on usage signals.",
    routes: ["/admin/client-success"],
    dataModels: ["upsell_opportunities"],
    feedsInto: ["proposals", "conversations"],
    receivesFrom: ["health_scoring", "packages", "crm"],
  },
  {
    key: "renewals",
    name: "Renewal Management",
    category: "Revenue Systems",
    status: "Partially Operational",
    dependency: "Native",
    description: "Contract renewal tracking, status flow, owner assignment.",
    routes: ["/admin/client-success"],
    dataModels: ["renewal_records"],
    feedsInto: ["billing", "conversations"],
    receivesFrom: ["billing", "health_scoring"],
  },

  // ── Growth Systems ──
  {
    key: "website",
    name: "Website Workspace",
    category: "Growth Systems",
    status: "Operational",
    dependency: "Native",
    description: "Website builder, funnel builder, landing pages.",
    routes: ["/website", "/website-builder", "/funnel-builder", "/landing-pages"],
    dataModels: [],
    feedsInto: ["seo", "ai_insights"],
    receivesFrom: [],
  },
  {
    key: "seo",
    name: "SEO Intelligence",
    category: "Growth Systems",
    status: "Operational",
    dependency: "Native",
    description: "Keyword tracking, competitor analysis, issue detection, content opportunities, local visibility.",
    routes: ["/seo", "/market-research", "/competitor-tracking"],
    dataModels: ["seo_keywords", "seo_competitors", "seo_issues", "seo_content_opportunities", "seo_local_visibility"],
    feedsInto: ["ai_insights", "recommendations", "market_research"],
    receivesFrom: ["google_search_console"],
  },
  {
    key: "market_research",
    name: "Market Research & Intelligence",
    category: "Growth Systems",
    status: "Operational",
    dependency: "Native",
    description: "Market trends, buyer insights, and competitive intelligence powered by SEO data.",
    routes: ["/market-research"],
    dataModels: ["seo_keywords", "seo_competitors", "seo_content_opportunities"],
    feedsInto: ["recommendations", "ai_insights"],
    receivesFrom: ["seo"],
  },
  {
    key: "ads",
    name: "Paid Ads Management",
    category: "Growth Systems",
    status: "Partially Operational",
    dependency: "Native",
    description: "Ad campaign tracking, performance records, recommendations.",
    routes: ["/paid-ads"],
    dataModels: ["ad_campaigns", "ad_performance_records", "ad_recommendations"],
    feedsInto: ["ai_insights", "billing"],
    receivesFrom: ["google_ads", "meta_ads"],
  },
  {
    key: "social",
    name: "Social Media Management",
    category: "Growth Systems",
    status: "Partially Operational",
    dependency: "Native",
    description: "Social content planning and publishing.",
    routes: ["/social-media"],
    dataModels: [],
    feedsInto: ["content", "ai_insights"],
    receivesFrom: [],
  },
  {
    key: "reviews",
    name: "Reviews & Reputation Engine",
    category: "Growth Systems",
    status: "Operational",
    dependency: "Native",
    description: "Review requests, recovery pipeline, reputation monitoring.",
    routes: ["/reviews"],
    dataModels: ["review_requests"],
    feedsInto: ["crm", "ai_insights", "health_scoring"],
    receivesFrom: ["calendar", "automation"],
  },
  {
    key: "content",
    name: "Content Planner",
    category: "Growth Systems",
    status: "Partially Operational",
    dependency: "Native",
    description: "Content calendar and planning tools.",
    routes: ["/content-planner"],
    dataModels: [],
    feedsInto: ["social", "website"],
    receivesFrom: [],
  },

  // ── Communications ──
  {
    key: "conversations",
    name: "Conversations & Inbox",
    category: "Communications",
    status: "Operational",
    dependency: "Native",
    description: "Unified inbox, threaded conversations, multi-channel messaging.",
    routes: ["/conversations", "/inbox"],
    dataModels: ["conversations", "conversation_messages"],
    feedsInto: ["crm", "follow_up"],
    receivesFrom: ["crm", "calendar", "support"],
  },
  {
    key: "follow_up",
    name: "Follow-Up Queue",
    category: "Communications",
    status: "Operational",
    dependency: "Native",
    description: "Structured follow-up management with priority and due dates.",
    routes: ["/follow-ups"],
    dataModels: ["follow_up_queues"],
    feedsInto: ["conversations", "crm"],
    receivesFrom: ["proposals", "calendar", "support"],
  },
  {
    key: "templates",
    name: "Message Templates",
    category: "Communications",
    status: "Operational",
    dependency: "Native",
    description: "Reusable templates for email, SMS, and in-app messaging.",
    routes: ["/message-templates"],
    dataModels: ["message_templates"],
    feedsInto: ["conversations", "automation"],
    receivesFrom: [],
  },
  {
    key: "chat",
    name: "Internal Chat",
    category: "Communications",
    status: "Operational",
    dependency: "Native",
    description: "Team messaging and chat threads.",
    routes: ["/chat"],
    dataModels: ["chat_threads", "chat_messages", "chat_participants"],
    feedsInto: [],
    receivesFrom: [],
  },
  {
    key: "email_module",
    name: "Email",
    category: "Communications",
    status: "Partially Operational",
    dependency: "Native",
    description: "Email compose and inbox integration.",
    routes: ["/email"],
    dataModels: [],
    feedsInto: ["conversations"],
    receivesFrom: ["email_provider"],
  },

  // ── Support Systems ──
  {
    key: "support",
    name: "Support Ticketing",
    category: "Support Systems",
    status: "Operational",
    dependency: "Native",
    description: "Ticket creation, comments, SLA tracking, resolution.",
    routes: ["/support-tickets", "/help-desk"],
    dataModels: ["support_tickets", "support_comments"],
    feedsInto: ["conversations", "health_scoring", "notifications"],
    receivesFrom: ["crm"],
  },
  {
    key: "knowledge",
    name: "Knowledge Base",
    category: "Support Systems",
    status: "Partially Operational",
    dependency: "Native",
    description: "Searchable help articles and guides.",
    routes: ["/knowledge-base"],
    dataModels: [],
    feedsInto: ["support"],
    receivesFrom: [],
  },
  {
    key: "training",
    name: "Training & Courses",
    category: "Support Systems",
    status: "Partially Operational",
    dependency: "Native",
    description: "Course delivery, training milestones.",
    routes: ["/training"],
    dataModels: [],
    feedsInto: ["health_scoring"],
    receivesFrom: [],
  },
  {
    key: "health_scoring",
    name: "Client Health Scoring",
    category: "Support Systems",
    status: "Operational",
    dependency: "Native",
    description: "Multi-signal health scores, adoption tracking, risk detection.",
    routes: ["/admin/client-success", "/success-center"],
    dataModels: ["client_health_records", "client_success_milestones", "client_risk_records"],
    feedsInto: ["upsell", "renewals", "ai_insights"],
    receivesFrom: ["billing", "calendar", "reviews", "support", "training"],
  },

  // ── Client Workspace ──
  {
    key: "dashboard",
    name: "Client Dashboard",
    category: "Client Workspace",
    status: "Operational",
    dependency: "Native",
    description: "Overview dashboard with health, activity, and revenue signals.",
    routes: ["/"],
    dataModels: [],
    feedsInto: [],
    receivesFrom: ["crm", "calendar", "billing", "ai_insights"],
  },
  {
    key: "ai_insights",
    name: "AI Insights & Growth Advisor",
    category: "Client Workspace",
    status: "Operational",
    dependency: "Native",
    description: "AI-powered business insights, recommendations, predictive growth.",
    routes: ["/ai-insights", "/growth-advisor"],
    dataModels: ["ai_business_insights"],
    feedsInto: ["recommendations"],
    receivesFrom: ["crm", "calendar", "billing", "reviews", "health_scoring"],
  },
  {
    key: "workforce",
    name: "Workforce & Team",
    category: "Client Workspace",
    status: "Operational",
    dependency: "Native",
    description: "Team management, labor costs, commissions, scheduling.",
    routes: ["/workforce", "/team"],
    dataModels: ["workspace_users"],
    feedsInto: ["billing"],
    receivesFrom: [],
  },

  // ── Admin Systems ──
  {
    key: "admin_portal",
    name: "Admin Portal",
    category: "Admin Systems",
    status: "Operational",
    dependency: "Native",
    description: "Master admin dashboard, client management, provisioning.",
    routes: ["/admin"],
    dataModels: ["clients", "user_roles"],
    feedsInto: [],
    receivesFrom: ["crm", "billing", "health_scoring"],
  },
  {
    key: "sales_pipeline",
    name: "Admin Sales Pipeline",
    category: "Admin Systems",
    status: "Operational",
    dependency: "Native",
    description: "Internal sales pipeline, deal tracking, demo builds.",
    routes: ["/admin/sales-pipeline", "/admin/sales-demo-creator"],
    dataModels: ["crm_deals"],
    feedsInto: ["proposals", "activation"],
    receivesFrom: ["crm"],
  },
  {
    key: "activation",
    name: "Activation & Provisioning",
    category: "Admin Systems",
    status: "Operational",
    dependency: "Native",
    description: "Client onboarding, workspace provisioning, master activation form.",
    routes: ["/admin/activation", "/admin/master-activation", "/admin/provision"],
    dataModels: ["clients"],
    feedsInto: ["billing", "health_scoring"],
    receivesFrom: ["proposals", "packages", "sales_pipeline"],
  },
  {
    key: "launch_readiness",
    name: "Launch Readiness",
    category: "Admin Systems",
    status: "Operational",
    dependency: "Native",
    description: "Platform-wide readiness audit across 16 categories.",
    routes: ["/admin/launch-checklist"],
    dataModels: [],
    feedsInto: [],
    receivesFrom: [],
  },

  // ── Integrations ──
  {
    key: "stripe",
    name: "Stripe Payments",
    category: "Integrations",
    status: "Planned",
    dependency: "External-Required",
    description: "Payment processing for subscriptions and invoices.",
    routes: [],
    dataModels: [],
    feedsInto: ["billing"],
    receivesFrom: ["billing"],
  },
  {
    key: "google_calendar",
    name: "Google Calendar Sync",
    category: "Integrations",
    status: "Partially Operational",
    dependency: "External-Optional",
    description: "Two-way sync with Google Calendar.",
    routes: ["/calendar-integrations"],
    dataModels: ["calendar_integrations", "calendar_sync_settings"],
    feedsInto: ["calendar"],
    receivesFrom: ["calendar"],
  },
  {
    key: "google_ads",
    name: "Google Ads API",
    category: "Integrations",
    status: "Planned",
    dependency: "External-Optional",
    description: "Ad performance data import from Google Ads.",
    routes: ["/integrations"],
    dataModels: [],
    feedsInto: ["ads"],
    receivesFrom: [],
  },
  {
    key: "meta_ads",
    name: "Meta Ads API",
    category: "Integrations",
    status: "Planned",
    dependency: "External-Optional",
    description: "Ad performance data import from Meta/Facebook Ads.",
    routes: ["/integrations"],
    dataModels: [],
    feedsInto: ["ads"],
    receivesFrom: [],
  },
  {
    key: "google_search_console",
    name: "Google Search Console",
    category: "Integrations",
    status: "Planned",
    dependency: "External-Optional",
    description: "SEO ranking and search performance data.",
    routes: ["/integrations"],
    dataModels: [],
    feedsInto: ["seo"],
    receivesFrom: [],
  },
  {
    key: "email_provider",
    name: "Email Delivery Provider",
    category: "Integrations",
    status: "Planned",
    dependency: "External-Required",
    description: "Transactional and marketing email delivery rail.",
    routes: ["/integrations"],
    dataModels: [],
    feedsInto: ["email_module", "conversations"],
    receivesFrom: [],
  },
  {
    key: "sms_provider",
    name: "SMS Delivery Provider",
    category: "Integrations",
    status: "Planned",
    dependency: "External-Optional",
    description: "SMS delivery rail for notifications and reminders.",
    routes: ["/integrations"],
    dataModels: [],
    feedsInto: ["conversations"],
    receivesFrom: [],
  },
];

/* ── helpers ── */

export const getModulesByCategory = (cat: SystemCategory) =>
  systemModules.filter((m) => m.category === cat);

export const getModuleByKey = (key: string) =>
  systemModules.find((m) => m.key === key);

export const getNativeModules = () =>
  systemModules.filter((m) => m.dependency === "Native");

export const getExternalModules = () =>
  systemModules.filter((m) => m.dependency !== "Native");

export const statusColor: Record<ModuleStatus, string> = {
  "Production Ready": "hsl(142 72% 42%)",
  "Operational": "hsl(var(--primary))",
  "Partially Operational": "hsl(var(--nl-electric))",
  "In Progress": "hsl(38 92% 50%)",
  "Needs Hardening": "hsl(25 95% 53%)",
  "Planned": "hsl(var(--muted-foreground))",
};

export const dependencyLabel: Record<DependencyType, { label: string; color: string }> = {
  Native: { label: "Native", color: "hsl(var(--primary))" },
  "External-Required": { label: "Ext · Required", color: "hsl(25 95% 53%)" },
  "External-Optional": { label: "Ext · Optional", color: "hsl(var(--muted-foreground))" },
};

export const allCategories: SystemCategory[] = [
  "Core Engine",
  "Revenue Systems",
  "Growth Systems",
  "Communications",
  "Support Systems",
  "Client Workspace",
  "Admin Systems",
  "Integrations",
];
