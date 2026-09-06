// Server-side equivalent of src/lib/setupItemsSeeder.ts (frontend keeps its own copy).
// Seeds the default client_setup_items checklist for a newly-won client.

export interface SetupItemDef {
  category: string;
  item_key: string;
  item_label: string;
  submitted_by_client: boolean;
}

export const DEFAULT_SETUP_ITEMS: SetupItemDef[] = [
  { category: "branding", item_key: "logo_primary", item_label: "Primary Logo", submitted_by_client: true },
  { category: "branding", item_key: "logo_secondary", item_label: "Secondary / Icon Logo", submitted_by_client: true },
  { category: "branding", item_key: "brand_colors", item_label: "Brand Colors", submitted_by_client: true },
  { category: "branding", item_key: "brand_fonts", item_label: "Brand Fonts / Guidelines", submitted_by_client: true },
  { category: "website", item_key: "domain_access", item_label: "Domain Registrar Access", submitted_by_client: true },
  { category: "website", item_key: "website_platform", item_label: "Website Platform Access", submitted_by_client: true },
  { category: "website", item_key: "hosting_access", item_label: "Hosting / DNS Access", submitted_by_client: true },
  { category: "services", item_key: "service_list", item_label: "Service / Product List", submitted_by_client: true },
  { category: "services", item_key: "pricing_info", item_label: "Pricing Information", submitted_by_client: true },
  { category: "services", item_key: "service_areas", item_label: "Service Areas / Locations", submitted_by_client: true },
  { category: "team", item_key: "business_hours", item_label: "Business Hours", submitted_by_client: true },
  { category: "team", item_key: "team_members", item_label: "Team Members & Roles", submitted_by_client: true },
  { category: "team", item_key: "team_headshots", item_label: "Team Headshots / Bios", submitted_by_client: true },
  { category: "calendar", item_key: "calendar_access", item_label: "Calendar Platform Access", submitted_by_client: true },
  { category: "calendar", item_key: "booking_preferences", item_label: "Booking Preferences", submitted_by_client: true },
  { category: "messaging", item_key: "phone_number", item_label: "Business Phone Number", submitted_by_client: true },
  { category: "messaging", item_key: "email_accounts", item_label: "Business Email Accounts", submitted_by_client: true },
  { category: "integrations", item_key: "google_access", item_label: "Google Business / Analytics Access", submitted_by_client: true },
  { category: "integrations", item_key: "social_access", item_label: "Social Media Account Access", submitted_by_client: true },
  { category: "integrations", item_key: "ad_accounts", item_label: "Ad Account Access (Google/Meta)", submitted_by_client: true },
  { category: "billing", item_key: "billing_contact", item_label: "Billing Contact Info", submitted_by_client: true },
  { category: "billing", item_key: "payment_method", item_label: "Payment Method on File", submitted_by_client: false },
  { category: "internal", item_key: "crm_setup", item_label: "CRM Pipeline Setup", submitted_by_client: false },
  { category: "internal", item_key: "automation_config", item_label: "Automation Configuration", submitted_by_client: false },
  { category: "internal", item_key: "reporting_setup", item_label: "Reporting Dashboard Setup", submitted_by_client: false },
  { category: "internal", item_key: "launch_review", item_label: "Final Launch Review", submitted_by_client: false },
];

/**
 * Seeds the default checklist for a client, but only if they have no rows yet.
 * Safe to call repeatedly.
 */
// deno-lint-ignore no-explicit-any
export async function seedSetupItemsForClient(supabase: any, clientId: string) {
  if (!clientId) return { seeded: false, reason: "no_client_id" };

  const { count, error: countErr } = await supabase
    .from("client_setup_items")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  if (countErr) {
    console.error("[setup-items-seeder] count error", countErr);
    return { seeded: false, reason: countErr.message };
  }
  if ((count ?? 0) > 0) return { seeded: false, reason: "already_seeded", existing: count };

  const rows = DEFAULT_SETUP_ITEMS.map((item) => ({
    client_id: clientId,
    ...item,
    item_status: "missing",
  }));

  const { error } = await supabase
    .from("client_setup_items")
    .upsert(rows, { onConflict: "client_id,item_key", ignoreDuplicates: true });

  if (error) {
    console.error("[setup-items-seeder] insert error", error);
    return { seeded: false, reason: error.message };
  }
  return { seeded: true, count: rows.length };
}
