import { supabase } from "@/integrations/supabase/client";
import type { ActivationFormState, ServiceConfig, TeamMemberConfig } from "@/components/activation/activationTypes";

/**
 * Hydrates canonical workspace records from activation form data.
 * Idempotent — safe to run multiple times for the same client.
 */
export interface HydrationResult {
  synced: string[];
  skipped: string[];
  errors: string[];
}

export async function hydrateWorkspaceFromActivation(
  clientId: string,
  form: ActivationFormState
): Promise<HydrationResult> {
  const synced: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  // 1. Sync clients table fields
  try {
    const clientUpdate: Record<string, any> = {};
    if (form.business_name_confirmed) clientUpdate.business_name = form.business_name_confirmed;
    if (form.owner_name) clientUpdate.owner_name = form.owner_name;
    if (form.owner_email) clientUpdate.owner_email = form.owner_email;
    if (form.owner_phone) clientUpdate.owner_phone = form.owner_phone;
    if (form.website_url) clientUpdate.website_url = form.website_url;
    if (form.legal_business_name) clientUpdate.legal_business_name = form.legal_business_name;
    if (form.secondary_contact_name) clientUpdate.secondary_contact_name = form.secondary_contact_name;
    if (form.secondary_contact_email) clientUpdate.secondary_contact_email = form.secondary_contact_email;
    if (form.secondary_contact_phone) clientUpdate.secondary_contact_phone = form.secondary_contact_phone;
    if (form.industry) clientUpdate.industry = form.industry;
    if (form.primary_location) clientUpdate.primary_location = form.primary_location;
    if (form.default_timezone) clientUpdate.timezone = form.default_timezone;
    if (form.service_package) clientUpdate.service_package = form.service_package;
    if (form.crm_mode) clientUpdate.crm_mode = form.crm_mode === "external" ? "external" : "native";

    if (Object.keys(clientUpdate).length > 0) {
      const { error } = await supabase.from("clients").update(clientUpdate as any).eq("id", clientId);
      if (error) errors.push(`clients: ${error.message}`);
      else synced.push("Client record");
    } else {
      skipped.push("Client record (no changes)");
    }
  } catch (e: any) {
    errors.push(`clients: ${e.message}`);
  }

  // 2. Sync billing_accounts with full payment data
  try {
    const paymentPending = form.payment_confirmed !== "confirmed";
    const paymentAwaiting = form.payment_confirmed === "awaiting_confirmation";
    const billingStatus = form.payment_confirmed === "confirmed" ? "active"
      : paymentAwaiting ? "awaiting_confirmation" : "pending_payment";

    const { error } = await supabase.from("billing_accounts").upsert({
      client_id: clientId,
      billing_status: billingStatus,
      billing_email: form.owner_email || null,
      setup_fee: form.setup_fee ? parseFloat(form.setup_fee) : null,
      monthly_fee: form.monthly_fee ? parseFloat(form.monthly_fee) : null,
      contract_term: form.contract_term || null,
      payment_method: form.payment_method || null,
      wire_reference: form.wire_reference || null,
      payment_receipt_url: form.payment_receipt_url || null,
      internal_payment_notes: form.internal_payment_notes || null,
      service_package: form.service_package || null,
    } as any, { onConflict: "client_id" });

    if (error) errors.push(`billing: ${error.message}`);
    else synced.push("Billing account");
  } catch (e: any) {
    errors.push(`billing: ${e.message}`);
  }

  // 3. Sync branding
  try {
    const { error } = await supabase.from("client_branding").upsert({
      client_id: clientId,
      company_name: form.company_name || form.business_name_confirmed || null,
      display_name: form.display_name || null,
      logo_url: form.logo_url || null,
      primary_color: form.primary_color || null,
      secondary_color: form.secondary_color || null,
      accent_color: form.accent_color || null,
      welcome_message: form.welcome_message || null,
      tagline: form.tagline || null,
      app_display_name: form.app_display_name || null,
      workspace_header_name: form.workspace_header_name || null,
      calendar_title: form.calendar_title || null,
      finance_dashboard_title: form.finance_dashboard_title || null,
      report_header_title: form.report_header_title || null,
      login_branding_text: form.login_branding_text || null,
      dashboard_title: form.dashboard_title || null,
    }, { onConflict: "client_id" });

    if (error) errors.push(`branding: ${error.message}`);
    else synced.push("Branding");
  } catch (e: any) {
    errors.push(`branding: ${e.message}`);
  }

  // 4. Sync services (idempotent by name)
  try {
    const serviceConfigs: ServiceConfig[] = form.service_configs || [];
    let svcCount = 0;
    for (const svc of serviceConfigs) {
      if (!svc.service_name) continue;
      // Check if exists
      const { data: existing } = await supabase.from("service_catalog" as any)
        .select("id").eq("client_id", clientId).eq("service_name", svc.service_name).maybeSingle();
      if (existing) { skipped.push(`Service: ${svc.service_name}`); continue; }

      const { error } = await supabase.from("service_catalog" as any).insert({
        client_id: clientId,
        service_name: svc.service_name,
        service_description: svc.service_description || null,
        display_price_text: svc.display_price_text || null,
        service_status: svc.service_status || "draft",
        display_order: svcCount,
      });
      if (error) errors.push(`service ${svc.service_name}: ${error.message}`);
      else { synced.push(`Service: ${svc.service_name}`); svcCount++; }
    }
    if (svcCount === 0 && serviceConfigs.filter(s => s.service_name).length === 0) {
      skipped.push("Services (none defined)");
    }
  } catch (e: any) {
    errors.push(`services: ${e.message}`);
  }

  // 5. Sync team members as workspace_users (idempotent by email)
  try {
    const members: TeamMemberConfig[] = form.team_member_configs || [];
    if (form.need_team_now === "yes") {
      for (const m of members) {
        if (!m.email) continue;
        const { data: existing } = await supabase.from("workspace_users")
          .select("id").eq("client_id", clientId).eq("email", m.email).maybeSingle();
        if (existing) { skipped.push(`Team: ${m.email}`); continue; }

        const { error } = await supabase.from("workspace_users").insert({
          client_id: clientId,
          email: m.email,
          full_name: m.full_name || m.email.split("@")[0],
          phone: m.phone || null,
          job_title: m.job_title || null,
          department: m.department || null,
          role_preset: m.role_preset || "service_provider",
          is_bookable_staff: m.bookable_staff === "yes",
          status: "active",
        });
        if (error) errors.push(`team ${m.email}: ${error.message}`);
        else synced.push(`Team: ${m.full_name || m.email}`);
      }
    } else {
      skipped.push("Team members (not added now)");
    }
  } catch (e: any) {
    errors.push(`team: ${e.message}`);
  }

  // 6. Sync integration statuses
  try {
    const integrations = form.integrations || {};
    for (const [name, cfg] of Object.entries(integrations)) {
      if (!cfg.used) continue;
      const status = cfg.used === "yes"
        ? (cfg.access_ready === "yes" ? "connected" : "pending_access")
        : "not_started";

      // Try to update existing
      const { data: existing } = await supabase.from("client_integrations")
        .select("id").eq("client_id", clientId).eq("integration_name", name).maybeSingle();

      if (existing) {
        await supabase.from("client_integrations")
          .update({ status, config: { access_owner: cfg.access_owner, admin_email: cfg.admin_email, priority: cfg.priority, notes: cfg.notes } as any })
          .eq("id", existing.id);
        synced.push(`Integration: ${name}`);
      } else if (cfg.used === "yes") {
        await supabase.from("client_integrations").insert({
          client_id: clientId,
          integration_name: name,
          status,
          config: { access_owner: cfg.access_owner, admin_email: cfg.admin_email, priority: cfg.priority, notes: cfg.notes } as any,
        });
        synced.push(`Integration: ${name}`);
      }
    }
  } catch (e: any) {
    errors.push(`integrations: ${e.message}`);
  }

  // 7. Sync owner as workspace_user (idempotent)
  try {
    if (form.owner_email) {
      const { data: existing } = await supabase.from("workspace_users")
        .select("id").eq("client_id", clientId).eq("email", form.owner_email).maybeSingle();
      if (existing) {
        // Update name/phone if changed
        await supabase.from("workspace_users").update({
          full_name: form.owner_name || form.owner_email.split("@")[0],
          phone: form.owner_phone || null,
        }).eq("id", existing.id);
        skipped.push("Owner workspace user (updated)");
      } else {
        await supabase.from("workspace_users").insert({
          client_id: clientId,
          email: form.owner_email,
          full_name: form.owner_name || form.owner_email.split("@")[0],
          phone: form.owner_phone || null,
          role_preset: "owner",
          is_bookable_staff: false,
          status: "active",
        });
        synced.push("Owner workspace user");
      }
    }
  } catch (e: any) {
    errors.push(`owner user: ${e.message}`);
  }

  return { synced, skipped, errors };
}

/**
 * Checks which canonical records are missing data for a given client.
 * Used for the sync status indicator.
 */
export async function checkSyncStatus(clientId: string): Promise<{
  complete: boolean;
  missing: string[];
}> {
  const missing: string[] = [];

  const [clientRes, brandRes, billingRes, svcRes, wsUserRes] = await Promise.all([
    supabase.from("clients").select("owner_email, owner_name, owner_phone, industry, primary_location").eq("id", clientId).single(),
    supabase.from("client_branding").select("company_name, logo_url, primary_color").eq("client_id", clientId).maybeSingle(),
    supabase.from("billing_accounts").select("billing_status, payment_method, monthly_fee, setup_fee").eq("client_id", clientId).maybeSingle(),
    supabase.from("service_catalog" as any).select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("workspace_users").select("id", { count: "exact", head: true }).eq("client_id", clientId),
  ]);

  const client = clientRes.data as any;
  if (!client?.owner_email) missing.push("Owner email");
  if (!client?.owner_name) missing.push("Owner name");

  const brand = brandRes.data;
  if (!brand?.company_name) missing.push("Company name (branding)");
  if (!brand?.logo_url) missing.push("Logo");

  const billing = billingRes.data as any;
  if (!billing) missing.push("Billing account");
  else if (!billing.payment_method) missing.push("Payment method");

  if ((svcRes.count || 0) === 0) missing.push("Services");
  if ((wsUserRes.count || 0) === 0) missing.push("Workspace users");

  return { complete: missing.length === 0, missing };
}
