import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const INTEGRATION_PLATFORMS = [
  "Google Analytics", "Google Search Console", "Google Business Profile",
  "Meta / Facebook", "Google Ads", "Stripe", "Twilio", "Zoom",
  "External CRM", "External Calendar", "Email Provider",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // ── GENERATE TOKEN (admin only) ──
    if (action === "generate-token") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims, error: claimsErr } = await anonClient.auth.getUser();
      if (claimsErr || !claims.user) return json({ error: "Unauthorized" }, 401);

      // Check admin/operator role
      const { data: roleCheck } = await supabase.rpc("is_admin_or_operator", { _user_id: claims.user.id });
      if (!roleCheck) return json({ error: "Forbidden" }, 403);

      const body = await req.json();
      const clientId = body.client_id;
      if (!clientId) return json({ error: "client_id required" }, 400);

      // Generate secure token
      const token = crypto.randomUUID() + "-" + crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      const { error: insertErr } = await supabase.from("client_intake_tokens").insert({
        client_id: clientId,
        token,
        expires_at: expiresAt,
        created_by: claims.user.id,
      });

      if (insertErr) return json({ error: insertErr.message }, 500);

      return json({ token, expires_at: expiresAt });
    }

    // ── VALIDATE TOKEN (public) ──
    if (action === "validate") {
      const token = url.searchParams.get("token");
      if (!token) return json({ error: "Token required" }, 400);

      const { data: tokenRow } = await supabase
        .from("client_intake_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (!tokenRow) return json({ error: "Invalid token" }, 404);
      if (tokenRow.used_at) return json({ error: "Token already used", used: true }, 400);
      if (new Date(tokenRow.expires_at) < new Date()) return json({ error: "Token expired" }, 400);

      // Get client data for prefill
      const { data: client } = await supabase
        .from("clients")
        .select("id, business_name, owner_name, owner_email, owner_phone, website_url, primary_location, industry")
        .eq("id", tokenRow.client_id)
        .single();

      // Get existing branding for logo check
      const { data: branding } = await supabase
        .from("client_branding")
        .select("logo_url")
        .eq("client_id", tokenRow.client_id)
        .maybeSingle();

      // Get existing integrations
      const { data: existingIntegrations } = await supabase
        .from("client_integrations")
        .select("integration_name, status, config")
        .eq("client_id", tokenRow.client_id);

      return json({
        valid: true,
        client_id: tokenRow.client_id,
        client,
        logo_url: branding?.logo_url || null,
        existing_integrations: existingIntegrations || [],
      });
    }

    // ── SUBMIT INTAKE (public, token-validated) ──
    if (action === "submit") {
      const body = await req.json();
      const { token, contacts, operations, restrictions, integrations, logo_url } = body;

      if (!token) return json({ error: "Token required" }, 400);

      // Validate token
      const { data: tokenRow } = await supabase
        .from("client_intake_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (!tokenRow) return json({ error: "Invalid token" }, 404);
      if (tokenRow.used_at) return json({ error: "Already submitted" }, 400);
      if (new Date(tokenRow.expires_at) < new Date()) return json({ error: "Token expired" }, 400);

      const clientId = tokenRow.client_id;

      // ── Update client record with contacts/operations ──
      const clientUpdate: Record<string, unknown> = {};
      if (contacts?.owner_name) clientUpdate.owner_name = contacts.owner_name;
      if (contacts?.owner_email) clientUpdate.owner_email = contacts.owner_email;
      if (contacts?.owner_phone) clientUpdate.owner_phone = contacts.owner_phone;
      if (contacts?.secondary_contact_name) clientUpdate.secondary_contact_name = contacts.secondary_contact_name;
      if (contacts?.secondary_contact_email) clientUpdate.secondary_contact_email = contacts.secondary_contact_email;
      if (contacts?.secondary_contact_phone) clientUpdate.secondary_contact_phone = contacts.secondary_contact_phone;
      if (operations?.service_areas) clientUpdate.primary_location = operations.service_areas;
      if (operations?.website_url) clientUpdate.website_url = operations.website_url;

      if (Object.keys(clientUpdate).length > 0) {
        await supabase.from("clients").update(clientUpdate).eq("id", clientId);
      }

      // ── Update branding logo if provided ──
      if (logo_url) {
        const { data: existingBranding } = await supabase
          .from("client_branding")
          .select("id")
          .eq("client_id", clientId)
          .maybeSingle();

        if (existingBranding) {
          await supabase.from("client_branding").update({ logo_url }).eq("client_id", clientId);
        } else {
          await supabase.from("client_branding").insert({ client_id: clientId, logo_url });
        }
      }

      // ── Upsert integrations ──
      if (integrations && Array.isArray(integrations)) {
        for (const intg of integrations) {
          if (!intg.platform) continue;

          let status = "not_needed";
          let mode = "skipped";

          if (intg.handling === "use_existing") {
            mode = "client_existing";
            status = intg.access_ready ? "ready_to_connect" : "access_needed";
          } else if (intg.handling === "use_newlight") {
            mode = "newlight_default";
            status = "newlight_ready";
          } else if (intg.handling === "skip") {
            mode = "skipped";
            status = "not_needed";
          }

          const config = {
            mode,
            handling: intg.handling,
            access_owner_name: intg.access_owner_name || null,
            access_owner_email: intg.access_owner_email || null,
            access_ready: !!intg.access_ready,
            notes: intg.notes || null,
            submitted_at: new Date().toISOString(),
          };

          // Check existing
          const { data: existing } = await supabase
            .from("client_integrations")
            .select("id")
            .eq("client_id", clientId)
            .eq("integration_name", intg.platform)
            .maybeSingle();

          if (existing) {
            await supabase
              .from("client_integrations")
              .update({ status, config, updated_at: new Date().toISOString() })
              .eq("id", existing.id);
          } else {
            await supabase.from("client_integrations").insert({
              client_id: clientId,
              integration_name: intg.platform,
              status,
              config,
            });
          }
        }
      }

      // ── Store restrictions/operations/contacts metadata in activation_drafts ──
      const { data: draft } = await supabase
        .from("activation_drafts")
        .select("id, form_data")
        .eq("client_id", clientId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (draft) {
        const existingData = (draft.form_data as Record<string, unknown>) || {};
        await supabase.from("activation_drafts").update({
          form_data: {
            ...existingData,
            client_intake_completed: true,
            client_intake_submitted_at: new Date().toISOString(),
            intake_contacts: contacts,
            intake_operations: operations,
            intake_restrictions: restrictions,
            intake_decision_makers: contacts?.decision_makers || [],
            intake_team_emails: operations?.team_emails || "",
          },
        }).eq("id", draft.id);
      }

      // ── Mark token used ──
      await supabase
        .from("client_intake_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", tokenRow.id);

      // ── Audit log ──
      await supabase.from("audit_logs").insert({
        client_id: clientId,
        action: "client_intake_submitted",
        module: "activation",
        status: "success",
        metadata: {
          integrations_count: integrations?.length || 0,
          has_logo: !!logo_url,
          has_contacts: !!contacts,
        },
      });

      // ── CRM activity ──
      await supabase.from("crm_activities").insert({
        client_id: clientId,
        activity_type: "note",
        subject: "Client Intake Form Submitted",
        description: `Client completed their intake form with ${integrations?.length || 0} integration responses.`,
      });

      return json({ success: true });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    return json({ error: err.message || "Internal error" }, 500);
  }
});
