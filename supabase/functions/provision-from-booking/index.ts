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
      appointment_id,
      calendar_client_id,
    } = await req.json();

    if (!contact_email || !business_name) {
      return new Response(
        JSON.stringify({ error: "business_name and contact_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if workspace already exists for this email
    const { data: existingClient } = await adminClient
      .from("clients")
      .select("id, workspace_slug")
      .eq("owner_email", contact_email)
      .maybeSingle();

    if (existingClient) {
      const appUrl = supabaseUrl.replace(".supabase.co", ".lovable.app");
      return new Response(
        JSON.stringify({
          success: true,
          already_exists: true,
          client_id: existingClient.id,
          workspace_url: `${appUrl}`,
          workspace_slug: existingClient.workspace_slug,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayName = company_name || business_name;
    const slug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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
        onboarding_stage: "lead",
        status: "active",
        source_appointment_id: appointment_id || null,
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
      // Create a default calendar
      adminClient.from("calendars").insert({
        client_id: client.id,
        calendar_name: "Main Calendar",
        calendar_type: "booking",
        timezone: "America/Los_Angeles",
        is_active: true,
      }),
      // Create CRM contact
      adminClient.from("crm_contacts").insert({
        client_id: client.id,
        full_name: contact_name || contact_email.split("@")[0],
        email: contact_email.toLowerCase(),
        phone: contact_phone || null,
        lead_source: "booking",
        pipeline_stage: "new_lead",
        first_contact_date: new Date().toISOString(),
        last_interaction_date: new Date().toISOString(),
      }),
    ]);

    // 3. Invite the user as client_owner
    let inviteResult: any = {};
    try {
      // Check if user already exists
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u: any) => u.email === contact_email
      );

      let userId: string;
      let setupLink: string | null = null;

      if (existingUser) {
        userId = existingUser.id;
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
      }

      if (userId) {
        // Remove existing roles, assign client_owner
        await adminClient.from("user_roles").delete().eq("user_id", userId);
        await adminClient.from("user_roles").insert({
          user_id: userId,
          role: "client_owner",
          client_id: client.id,
        });
      }

      inviteResult = { user_id: userId, setup_link: setupLink };
    } catch (e) {
      inviteResult = { error: (e as Error).message };
    }

    // 4. Activity + audit
    await Promise.all([
      adminClient.from("crm_activities").insert({
        client_id: client.id,
        activity_type: "workspace_created",
        activity_note: `Workspace auto-created from booking for ${contact_name || contact_email}`,
      }),
      adminClient.from("audit_logs").insert({
        action: "workspace_auto_provisioned",
        client_id: client.id,
        module: "booking",
        metadata: {
          contact_email,
          contact_name,
          appointment_id,
          source: "booking_auto_provision",
        },
      }),
      // Mark provision ready
      adminClient
        .from("provision_queue")
        .update({ provision_status: "ready_for_kickoff" })
        .eq("client_id", client.id),
    ]);

    // Build the workspace access URL
    const appUrl = supabaseUrl.replace(".supabase.co", ".lovable.app");
    const workspaceUrl = appUrl;

    // Store the access URL
    await adminClient
      .from("clients")
      .update({ workspace_access_url: workspaceUrl })
      .eq("id", client.id);

    return new Response(
      JSON.stringify({
        success: true,
        client_id: client.id,
        workspace_slug: slug,
        workspace_url: workspaceUrl,
        setup_link: inviteResult.setup_link || null,
        invite_sent: !inviteResult.setup_link && !inviteResult.error,
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
