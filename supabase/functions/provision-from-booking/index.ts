import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      business_name,
      contact_name,
      contact_email,
      contact_phone,
      company_name,
      logo_url,
      primary_color,
      secondary_color,
      industry,
      location,
      website,
      timezone,
      main_goal,
      interested_service,
      appointment_id,
      calendar_client_id,
      custom_slug,
    } = await req.json();

    if (!contact_email || !business_name) {
      return new Response(
        JSON.stringify({ error: "business_name and contact_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayName = company_name || business_name;
    let slug = (custom_slug || displayName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Check if workspace with this exact slug already exists
    const { data: existingBySlug } = await adminClient
      .from("clients")
      .select("id, workspace_slug")
      .eq("workspace_slug", slug)
      .maybeSingle();

    if (existingBySlug) {
      // Check if same owner — if so, return existing workspace
      const { data: existingByOwner } = await adminClient
        .from("clients")
        .select("id, workspace_slug")
        .eq("workspace_slug", slug)
        .eq("owner_email", contact_email)
        .maybeSingle();

      if (existingByOwner) {
        return new Response(
          JSON.stringify({
            success: true,
            already_exists: true,
            client_id: existingByOwner.id,
            workspace_url: `/w/${existingByOwner.workspace_slug}`,
            workspace_slug: existingByOwner.workspace_slug,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Different owner, same slug — append a suffix
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    // 1. Create client workspace
    const { data: client, error: clientErr } = await adminClient
      .from("clients")
      .insert({
        business_name: displayName,
        workspace_slug: slug,
        industry: industry || null,
        primary_location: location || null,
        owner_name: contact_name || null,
        owner_email: contact_email,
        onboarding_stage: "provisioned",
        status: "active",
        source_appointment_id: appointment_id || null,
        website_url: website || null,
        timezone: timezone || "America/Los_Angeles",
      })
      .select()
      .single();

    if (clientErr || !client) {
      return new Response(
        JSON.stringify({ error: clientErr?.message || "Failed to create workspace" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create branding, health scores, onboarding, integrations in parallel
    const integrationNames = [
      "Google Analytics", "Google Search Console", "Google Business Profile",
      "Meta / Instagram", "Google Ads", "Domain / Website",
    ];

    await Promise.all([
      adminClient.from("client_branding").insert({
        client_id: client.id,
        company_name: displayName,
        display_name: displayName,
        logo_url: logo_url || null,
        primary_color: primary_color || "#3B82F6",
        secondary_color: secondary_color || "#06B6D4",
        welcome_message: `Welcome to ${displayName}`,
        app_display_name: displayName,
        app_icon_url: logo_url || null,
        splash_logo_url: logo_url || null,
        workspace_header_name: displayName,
      }),
      adminClient.from("client_health_scores").insert({ client_id: client.id }),
      adminClient.from("onboarding_progress").insert({ client_id: client.id }),
      adminClient.from("provision_queue").insert({
        client_id: client.id,
        provision_status: "provisioning",
      }),
      adminClient.from("client_integrations").insert(
        integrationNames.map((name) => ({
          client_id: client.id,
          integration_name: name,
          status: "pending",
        }))
      ),
      // Create CRM contact for the owner
      adminClient.from("crm_contacts").insert({
        client_id: client.id,
        full_name: contact_name || contact_email.split("@")[0],
        email: contact_email.toLowerCase(),
        phone: contact_phone || null,
        lead_source: appointment_id ? "booking" : "onboarding_form",
        pipeline_stage: "new_lead",
        first_contact_date: new Date().toISOString(),
        last_interaction_date: new Date().toISOString(),
      }),
    ]);

    // 3. Invite the user as client_owner (append role, don't replace)
    let inviteResult: any = {};
    try {
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u: any) => u.email === contact_email
      );

      let userId: string;
      let setupLink: string | null = null;

      if (existingUser) {
        userId = existingUser.id;
        // ADD the new client_owner role for this workspace (don't touch other roles)
        const { data: existingRole } = await adminClient
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("client_id", client.id)
          .maybeSingle();

        if (!existingRole) {
          await adminClient.from("user_roles").insert({
            user_id: userId,
            role: "client_owner",
            client_id: client.id,
          });
        }
        inviteResult = { user_id: userId, existing: true };
      } else {
        // Try to invite
        const { data: inviteData, error: inviteError } =
          await adminClient.auth.admin.inviteUserByEmail(contact_email, {
            data: { full_name: contact_name || contact_email.split("@")[0] },
          });

        if (inviteError) {
          // Fallback: generate link
          const { data: linkData } = await adminClient.auth.admin.generateLink({
            type: "invite",
            email: contact_email,
            options: { data: { full_name: contact_name || contact_email.split("@")[0] } },
          });
          userId = linkData?.user?.id || "";
          setupLink = linkData?.properties?.action_link || null;
        } else {
          userId = inviteData.user.id;
        }

        if (userId) {
          await adminClient.from("user_roles").insert({
            user_id: userId,
            role: "client_owner",
            client_id: client.id,
          });
        }
        inviteResult = { user_id: userId, setup_link: setupLink };
      }
    } catch (e) {
      inviteResult = { error: (e as Error).message };
    }

    // 4. Activity + audit
    await Promise.all([
      adminClient.from("crm_activities").insert({
        client_id: client.id,
        activity_type: "workspace_created",
        activity_note: `Workspace created for ${contact_name || contact_email}${main_goal ? ` — Goal: ${main_goal}` : ""}${interested_service ? ` — Interest: ${interested_service}` : ""}`,
      }),
      adminClient.from("audit_logs").insert({
        action: "workspace_auto_provisioned",
        client_id: client.id,
        module: "onboarding",
        metadata: {
          contact_email,
          contact_name,
          appointment_id,
          industry,
          main_goal: main_goal || null,
          interested_service: interested_service || null,
          source: appointment_id ? "booking_auto_provision" : "onboarding_form",
        },
      }),
      // Mark provision ready
      adminClient
        .from("provision_queue")
        .update({ provision_status: "ready_for_kickoff" })
        .eq("client_id", client.id),
    ]);

    // Build the workspace access URL
    const workspaceUrl = `/w/${slug}`;

    return new Response(
      JSON.stringify({
        success: true,
        client_id: client.id,
        workspace_slug: slug,
        workspace_url: workspaceUrl,
        setup_link: inviteResult.setup_link || null,
        invite_sent: !inviteResult.setup_link && !inviteResult.error && !inviteResult.existing,
        existing_user: !!inviteResult.existing,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});