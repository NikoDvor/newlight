import { supabase } from "@/integrations/supabase/client";

export interface SetupItemDef {
  category: string;
  item_key: string;
  item_label: string;
  submitted_by_client: boolean;
}

export const DEFAULT_SETUP_ITEMS: SetupItemDef[] = [
  // Branding / Assets
  { category: "branding", item_key: "logo_primary", item_label: "Primary Logo", submitted_by_client: true },
  { category: "branding", item_key: "logo_secondary", item_label: "Secondary / Icon Logo", submitted_by_client: true },
  { category: "branding", item_key: "brand_colors", item_label: "Brand Colors", submitted_by_client: true },
  { category: "branding", item_key: "brand_fonts", item_label: "Brand Fonts / Guidelines", submitted_by_client: true },
  // Domain / Website
  { category: "website", item_key: "domain_access", item_label: "Domain Registrar Access", submitted_by_client: true },
  { category: "website", item_key: "website_platform", item_label: "Website Platform Access", submitted_by_client: true },
  { category: "website", item_key: "hosting_access", item_label: "Hosting / DNS Access", submitted_by_client: true },
  // Services / Offers
  { category: "services", item_key: "service_list", item_label: "Service / Product List", submitted_by_client: true },
  { category: "services", item_key: "pricing_info", item_label: "Pricing Information", submitted_by_client: true },
  { category: "services", item_key: "service_areas", item_label: "Service Areas / Locations", submitted_by_client: true },
  // Hours / Team
  { category: "team", item_key: "business_hours", item_label: "Business Hours", submitted_by_client: true },
  { category: "team", item_key: "team_members", item_label: "Team Members & Roles", submitted_by_client: true },
  { category: "team", item_key: "team_headshots", item_label: "Team Headshots / Bios", submitted_by_client: true },
  // Calendar / Booking
  { category: "calendar", item_key: "calendar_access", item_label: "Calendar Platform Access", submitted_by_client: true },
  { category: "calendar", item_key: "booking_preferences", item_label: "Booking Preferences", submitted_by_client: true },
  // Messaging
  { category: "messaging", item_key: "phone_number", item_label: "Business Phone Number", submitted_by_client: true },
  { category: "messaging", item_key: "email_accounts", item_label: "Business Email Accounts", submitted_by_client: true },
  // Integrations
  { category: "integrations", item_key: "google_access", item_label: "Google Business / Analytics Access", submitted_by_client: true },
  { category: "integrations", item_key: "social_access", item_label: "Social Media Account Access", submitted_by_client: true },
  { category: "integrations", item_key: "ad_accounts", item_label: "Ad Account Access (Google/Meta)", submitted_by_client: true },
  // Billing / Account
  { category: "billing", item_key: "billing_contact", item_label: "Billing Contact Info", submitted_by_client: true },
  { category: "billing", item_key: "payment_method", item_label: "Payment Method on File", submitted_by_client: false },
  // Internal Delivery
  { category: "internal", item_key: "crm_setup", item_label: "CRM Pipeline Setup", submitted_by_client: false },
  { category: "internal", item_key: "automation_config", item_label: "Automation Configuration", submitted_by_client: false },
  { category: "internal", item_key: "reporting_setup", item_label: "Reporting Dashboard Setup", submitted_by_client: false },
  { category: "internal", item_key: "launch_review", item_label: "Final Launch Review", submitted_by_client: false },
];

/**
 * Idempotently seed default setup items for a client.
 * Uses ON CONFLICT to avoid duplicates.
 */
export async function seedSetupItems(clientId: string): Promise<void> {
  const rows = DEFAULT_SETUP_ITEMS.map(item => ({
    client_id: clientId,
    ...item,
    item_status: "missing",
  }));

  // Upsert: if item_key already exists for this client, skip
  const { error } = await supabase
    .from("client_setup_items" as any)
    .upsert(rows as any, { onConflict: "client_id,item_key", ignoreDuplicates: true });

  if (error) console.error("Setup items seed error:", error);
}

export const CATEGORY_LABELS: Record<string, string> = {
  branding: "Branding & Assets",
  website: "Domain & Website",
  services: "Services & Offers",
  team: "Hours & Team",
  calendar: "Calendar & Booking",
  messaging: "Messaging & Phone",
  integrations: "Integrations",
  billing: "Billing & Account",
  internal: "Internal Delivery",
};

export const CATEGORY_ORDER = ["branding", "website", "services", "team", "calendar", "messaging", "integrations", "billing", "internal"];

export const ITEM_STATUS_OPTIONS = [
  { value: "missing", label: "Missing", color: "hsl(0 70% 60%)" },
  { value: "requested", label: "Requested", color: "hsl(38 92% 50%)" },
  { value: "received", label: "Received", color: "hsl(211 96% 56%)" },
  { value: "completed", label: "Completed", color: "hsl(152 60% 44%)" },
];
