// Role preset definitions with default module permissions
export type AccessLevel = "none" | "view" | "edit" | "manage";

export interface ModulePermission {
  module_key: string;
  label: string;
  access_level: AccessLevel;
}

export const MODULE_KEYS = [
  { key: "crm", label: "CRM" },
  { key: "calendar", label: "Calendar" },
  { key: "booking", label: "Booking Management" },
  { key: "forms", label: "Forms" },
  { key: "messaging", label: "Messaging / Conversations" },
  { key: "email", label: "Email Hub" },
  { key: "reviews", label: "Reviews" },
  { key: "website", label: "Website Workspace" },
  { key: "seo", label: "SEO Workspace" },
  { key: "ads", label: "Ads Workspace" },
  { key: "social", label: "Social Workspace" },
  { key: "content", label: "Content Planner" },
  { key: "helpdesk", label: "Help Desk" },
  { key: "proposals", label: "Proposals / Sign Center" },
  { key: "workforce", label: "Workforce / Time Tracking" },
  { key: "finance", label: "Payroll / Finance" },
  { key: "reports", label: "Reports / Dashboard" },
  { key: "ai", label: "Ask AI" },
  { key: "training", label: "Training Courses" },
  { key: "meeting_intel", label: "Meeting Intelligence" },
  { key: "settings", label: "Settings" },
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number]["key"];

export const ROLE_PRESETS: Record<string, { label: string; description: string; defaults: Record<string, AccessLevel> }> = {
  workspace_admin: {
    label: "Workspace Admin",
    description: "Broad access to most workspace modules",
    defaults: Object.fromEntries(MODULE_KEYS.map(m => [m.key, "manage" as AccessLevel])),
  },
  manager: {
    label: "Manager",
    description: "Team workflows, calendars, CRM, reporting, staff visibility",
    defaults: {
      crm: "manage", calendar: "manage", booking: "manage", forms: "edit",
      messaging: "manage", email: "view", reviews: "manage", website: "view",
      seo: "view", ads: "view", social: "view", content: "view",
      helpdesk: "manage", proposals: "edit", workforce: "manage", finance: "view",
      reports: "manage", ai: "edit", training: "manage", meeting_intel: "manage", settings: "view",
    },
  },
  front_desk: {
    label: "Front Desk",
    description: "Calendar, booking, contact lookup, messaging, limited CRM",
    defaults: {
      crm: "view", calendar: "edit", booking: "manage", forms: "view",
      messaging: "edit", email: "none", reviews: "none", website: "none",
      seo: "none", ads: "none", social: "none", content: "none",
      helpdesk: "view", proposals: "none", workforce: "none", finance: "none",
      reports: "view", ai: "none", training: "view", meeting_intel: "none", settings: "none",
    },
  },
  sales_rep: {
    label: "Sales Rep",
    description: "CRM, deals, leads, tasks, messaging, calendar",
    defaults: {
      crm: "edit", calendar: "edit", booking: "view", forms: "view",
      messaging: "edit", email: "edit", reviews: "view", website: "none",
      seo: "none", ads: "none", social: "none", content: "none",
      helpdesk: "none", proposals: "edit", workforce: "none", finance: "none",
      reports: "view", ai: "edit", training: "view", meeting_intel: "view", settings: "none",
    },
  },
  service_provider: {
    label: "Service Provider",
    description: "Assigned calendars, contacts, notes, forms, limited CRM",
    defaults: {
      crm: "view", calendar: "view", booking: "view", forms: "view",
      messaging: "view", email: "none", reviews: "none", website: "none",
      seo: "none", ads: "none", social: "none", content: "none",
      helpdesk: "none", proposals: "none", workforce: "view", finance: "none",
      reports: "none", ai: "none", training: "view", meeting_intel: "view", settings: "none",
    },
  },
  support_staff: {
    label: "Support Staff",
    description: "Help desk, messaging, contact history, limited calendar/CRM",
    defaults: {
      crm: "view", calendar: "view", booking: "none", forms: "view",
      messaging: "edit", email: "view", reviews: "view", website: "none",
      seo: "none", ads: "none", social: "none", content: "none",
      helpdesk: "manage", proposals: "none", workforce: "none", finance: "none",
      reports: "view", ai: "view", training: "view", meeting_intel: "none", settings: "none",
    },
  },
  marketing_staff: {
    label: "Marketing Staff",
    description: "Website, SEO, ads, social, content planner, reporting",
    defaults: {
      crm: "view", calendar: "none", booking: "none", forms: "edit",
      messaging: "none", email: "edit", reviews: "edit", website: "manage",
      seo: "manage", ads: "manage", social: "manage", content: "manage",
      helpdesk: "none", proposals: "none", workforce: "none", finance: "none",
      reports: "edit", ai: "edit", training: "view", meeting_intel: "none", settings: "none",
    },
  },
  custom: {
    label: "Custom",
    description: "Manual permissions only",
    defaults: Object.fromEntries(MODULE_KEYS.map(m => [m.key, "none" as AccessLevel])),
  },
};
