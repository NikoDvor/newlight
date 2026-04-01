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
      preferred_contact_method,
      sms_consent,
      calendar_id,
      appointment_start,
      appointment_end,
      appointment_title,
      appointment_description,
      appointment_timezone,
      booking_source,
      customer_notes,
    } = await req.json();

    if (!contact_email || !business_name) {
      return new Response(
        JSON.stringify({ error: "business_name and contact_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayName = company_name || business_name;
    let slug = (custom_slug || displayName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const { data: existingBySlug } = await adminClient
      .from("clients")
      .select("id, workspace_slug")
      .eq("workspace_slug", slug)
      .maybeSingle();

    if (existingBySlug) {
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
            invite_sent: false,
            invite_error: null,
            contact_id: null,
            lead_id: null,
            deal_id: null,
            appointment_id: null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const { data: client, error: clientErr } = await adminClient
      .from("clients")
      .insert({
        business_name: displayName,
        workspace_slug: slug,
        industry: industry || null,
        primary_location: location || null,
        owner_name: contact_name || null,
        owner_email: contact_email,
        owner_phone: contact_phone || null,
        preferred_contact_method: preferred_contact_method || "email",
        sms_consent: sms_consent || false,
        invite_status: "invite_not_attempted",
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

    const integrationNames = [
      "Google Analytics",
      "Google Search Console",
      "Google Business Profile",
      "Meta / Instagram",
      "Google Ads",
      "Domain / Website",
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
    ]);

    const nowIso = new Date().toISOString();
    const contactFullName = contact_name || contact_email.split("@")[0];
    const contactEmailLower = contact_email.toLowerCase();
    const resolvedBookingSource = booking_source || (appointment_id ? "booking_page" : "get_started_form");

    let contactId: string | null = null;
    let leadId: string | null = null;
    let dealId: string | null = null;
    let leadAction = "skipped";
    let dealAction = "skipped";
    let appointmentRecord: {
      id: string;
      client_id: string;
      calendar_id: string;
      title: string;
      start_time: string;
      end_time: string;
      status: string;
      booking_source: string | null;
    } | null = null;

    const { data: existingContact, error: existingContactError } = await adminClient
      .from("crm_contacts")
      .select("id, number_of_appointments")
      .eq("client_id", client.id)
      .eq("email", contactEmailLower)
      .maybeSingle();

    if (existingContactError) {
      throw new Error(`Failed to look up contact: ${existingContactError.message}`);
    }

    if (existingContact) {
      contactId = existingContact.id;
      const { error: contactUpdateError } = await adminClient
        .from("crm_contacts")
        .update({
          full_name: contactFullName,
          phone: contact_phone || null,
          last_interaction_date: nowIso,
          number_of_appointments: Number(existingContact.number_of_appointments || 0) + 1,
        })
        .eq("id", existingContact.id);

      if (contactUpdateError) {
        throw new Error(`Failed to update contact: ${contactUpdateError.message}`);
      }
    } else {
      const { data: newContact, error: newContactError } = await adminClient
        .from("crm_contacts")
        .insert({
          client_id: client.id,
          full_name: contactFullName,
          email: contactEmailLower,
          phone: contact_phone || null,
          lead_source: appointment_start ? "booking" : "onboarding_form",
          pipeline_stage: "appointment_booked",
          first_contact_date: nowIso,
          last_interaction_date: nowIso,
          number_of_appointments: appointment_start ? 1 : 0,
        })
        .select("id")
        .single();

      if (newContactError || !newContact) {
        throw new Error(newContactError?.message || "Failed to create contact");
      }

      contactId = newContact.id;
    }

    if (contactId) {
      const { data: existingDeal, error: existingDealError } = await adminClient
        .from("crm_deals")
        .select("id, pipeline_stage")
        .eq("client_id", client.id)
        .eq("contact_id", contactId)
        .neq("pipeline_stage", "closed_won")
        .neq("pipeline_stage", "closed_lost")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingDealError) {
        throw new Error(`Failed to look up deal: ${existingDealError.message}`);
      }

      if (existingDeal) {
        dealId = existingDeal.id;
        const earlyStages = ["new_lead", "contacted", "qualified"];
        if (earlyStages.includes(existingDeal.pipeline_stage)) {
          const { error: updateDealError } = await adminClient
            .from("crm_deals")
            .update({ pipeline_stage: "appointment_booked" })
            .eq("id", existingDeal.id);

          if (updateDealError) {
            throw new Error(`Failed to update deal: ${updateDealError.message}`);
          }
        }
        dealAction = "reused";
      } else {
        const dealName = `${displayName} — ${appointment_start ? "Discovery Booking" : "New Opportunity"}`;
        const { data: newDeal, error: newDealError } = await adminClient
          .from("crm_deals")
          .insert({
            client_id: client.id,
            contact_id: contactId,
            deal_name: dealName,
            pipeline_stage: "appointment_booked",
            deal_value: 0,
            status: "open",
            lead_source: appointment_start ? "booking" : "onboarding_form",
            qualification_status: "unqualified",
          })
          .select("id")
          .single();

        if (newDealError || !newDeal) {
          throw new Error(newDealError?.message || "Failed to create deal");
        }

        dealId = newDeal.id;
        dealAction = "created";
      }

      const { data: existingLead, error: existingLeadError } = await adminClient
        .from("crm_leads")
        .select("id")
        .eq("client_id", client.id)
        .eq("contact_id", contactId)
        .limit(1)
        .maybeSingle();

      if (existingLeadError) {
        throw new Error(`Failed to look up lead: ${existingLeadError.message}`);
      }

      if (existingLead) {
        leadId = existingLead.id;
        leadAction = "reused";
      } else {
        const { data: newLead, error: newLeadError } = await adminClient
          .from("crm_leads")
          .insert({
            client_id: client.id,
            contact_id: contactId,
            source: appointment_start ? "booking" : "onboarding_form",
            lead_status: "new_lead",
            estimated_value: 0,
            notes: `Auto-created from workspace provisioning: ${displayName}`,
          })
          .select("id")
          .single();

        if (newLeadError || !newLead) {
          throw new Error(newLeadError?.message || "Failed to create lead");
        }

        leadId = newLead.id;
        leadAction = "created";
      }
    }

    if (calendar_id && appointment_start && appointment_end) {
      const { data: createdAppointment, error: appointmentError } = await adminClient
        .from("appointments")
        .insert({
          client_id: calendar_client_id || client.id,
          calendar_id,
          title: appointment_title || `Intro Call — ${displayName}`,
          description: appointment_description || null,
          start_time: appointment_start,
          end_time: appointment_end,
          timezone: appointment_timezone || timezone || "America/Los_Angeles",
          booking_source: resolvedBookingSource,
          status: "scheduled",
          customer_notes: customer_notes || null,
        })
        .select("id, client_id, calendar_id, title, start_time, end_time, status, booking_source")
        .single();

      if (appointmentError || !createdAppointment) {
        throw new Error(appointmentError?.message || "Failed to create appointment");
      }

      appointmentRecord = createdAppointment;
    }

    let inviteSent = false;
    let setupLink: string | null = null;
    let inviteError: string | null = null;
    let existingUser = false;
    let linkedUserId: string | null = null;

    try {
      const { data: inviteData, error: invErr } = await adminClient.auth.admin.inviteUserByEmail(contact_email, {
        data: { full_name: contact_name || contact_email.split("@")[0] },
      });

      if (invErr) {
        const errMsg = invErr.message?.toLowerCase() || "";
        if (
          errMsg.includes("already") ||
          errMsg.includes("registered") ||
          errMsg.includes("exists") ||
          errMsg.includes("duplicate")
        ) {
          const { data: linkData } = await adminClient.auth.admin.generateLink({
            type: "magiclink",
            email: contact_email,
          });

          if (linkData?.user?.id) {
            linkedUserId = linkData.user.id;
            existingUser = true;
            const { data: existingRole } = await adminClient
              .from("user_roles")
              .select("id")
              .eq("user_id", linkedUserId)
              .eq("client_id", client.id)
              .maybeSingle();

            if (!existingRole) {
              await adminClient.from("user_roles").insert({
                user_id: linkedUserId,
                role: "client_owner",
                client_id: client.id,
              });
            }
          } else {
            inviteError = "Could not link existing user account";
          }
        } else {
          const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
            type: "invite",
            email: contact_email,
            options: { data: { full_name: contact_name || contact_email.split("@")[0] } },
          });

          if (linkErr || !linkData?.user?.id) {
            inviteError = linkErr?.message || invErr.message || "Invite failed";
          } else {
            linkedUserId = linkData.user.id;
            setupLink = linkData.properties?.action_link || null;
            await adminClient.from("user_roles").insert({
              user_id: linkedUserId,
              role: "client_owner",
              client_id: client.id,
            });
          }
        }
      } else if (inviteData?.user?.id) {
        linkedUserId = inviteData.user.id;
        inviteSent = true;
        await adminClient.from("user_roles").insert({
          user_id: linkedUserId,
          role: "client_owner",
          client_id: client.id,
        });
      }
    } catch (e) {
      inviteError = (e as Error).message || "Invite failed unexpectedly";
    }

    const finalInviteStatus = inviteSent
      ? "invite_sent"
      : existingUser
      ? "access_link_generated"
      : inviteError
      ? "invite_failed"
      : "invite_attempted";

    const activityInserts = [
      {
        client_id: client.id,
        activity_type: "workspace_created",
        activity_note: `Workspace created for ${contact_name || contact_email}${main_goal ? ` — Goal: ${main_goal}` : ""}${interested_service ? ` — Interest: ${interested_service}` : ""}`,
      },
    ];

    if (dealAction !== "skipped") {
      activityInserts.push({
        client_id: client.id,
        activity_type: dealAction === "created" ? "deal_created" : "deal_updated",
        activity_note: `Deal ${dealAction} from provisioning — ${displayName}`,
      });
    }

    if (leadAction !== "skipped") {
      activityInserts.push({
        client_id: client.id,
        activity_type: leadAction === "created" ? "lead_created" : "lead_exists",
        activity_note: `Lead ${leadAction} from provisioning — ${contact_name || contact_email}`,
      });
    }

    if (appointmentRecord) {
      activityInserts.push({
        client_id: client.id,
        activity_type: "appointment_booked",
        activity_note: `Appointment booked for ${displayName} on ${appointmentRecord.start_time}`,
      });
    }

    await Promise.all([
      adminClient.from("clients").update({ invite_status: finalInviteStatus }).eq("id", client.id),
      adminClient.from("crm_activities").insert(activityInserts),
      adminClient.from("audit_logs").insert({
        action: "workspace_auto_provisioned",
        client_id: client.id,
        module: "onboarding",
        metadata: {
          contact_email,
          contact_name,
          contact_phone,
          preferred_contact_method,
          sms_consent,
          appointment_id,
          industry,
          main_goal: main_goal || null,
          interested_service: interested_service || null,
          source: appointment_start ? "booking_auto_provision" : "onboarding_form",
          booking_source: resolvedBookingSource,
          invite_sent: inviteSent,
          invite_error: inviteError,
          invite_status: finalInviteStatus,
          existing_user: existingUser,
          lead_action: leadAction,
          deal_action: dealAction,
          deal_id: dealId,
          lead_id: leadId,
          contact_id: contactId,
          calendar_id: calendar_id || null,
          appointment_start: appointment_start || null,
          appointment_end: appointment_end || null,
          booked_appointment_id: appointmentRecord?.id || null,
          appointment_client_id: appointmentRecord?.client_id || null,
        },
      }),
      adminClient
        .from("provision_queue")
        .update({ provision_status: "ready_for_kickoff" })
        .eq("client_id", client.id),
    ]);

    const workspaceUrl = `/w/${slug}`;

    let handoffResult: Record<string, unknown> = {};
    try {
      const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || "";
      const baseUrl = origin || "https://newlight.lovable.app";

      const handoffResp = await adminClient.functions.invoke("send-handoff-message", {
        body: {
          client_id: client.id,
          business_name: displayName,
          owner_email: contact_email,
          owner_phone: contact_phone || null,
          preferred_contact_method: preferred_contact_method || "email",
          sms_consent: sms_consent || false,
          workspace_slug: slug,
          base_url: baseUrl,
        },
      });

      if (handoffResp.data) {
        handoffResult = handoffResp.data as Record<string, unknown>;
      }
    } catch (handoffErr) {
      console.warn("Handoff message send failed (non-blocking):", handoffErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        client_id: client.id,
        workspace_slug: slug,
        workspace_url: workspaceUrl,
        setup_link: setupLink,
        invite_sent: inviteSent,
        existing_user: existingUser,
        invite_error: inviteError,
        linked_user_id: linkedUserId,
        email_delivery_status: handoffResult.email_status || "not_attempted",
        sms_delivery_status: handoffResult.sms_status || "not_attempted",
        contact_id: contactId,
        lead_id: leadId,
        deal_id: dealId,
        appointment_id: appointmentRecord?.id || null,
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