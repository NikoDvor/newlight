import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function guessProvisionalProfile(businessType: string): string {
  const t = (businessType || "").toLowerCase();
  if (["hvac", "plumbing", "cleaning", "landscaping", "roofing", "window", "construction"].some(k => t.includes(k))) return "field_service";
  if (["dental", "salon", "med spa", "healthcare", "fitness", "restaurant", "automotive"].some(k => t.includes(k))) return "appointment_local";
  if (["agency", "consulting", "real estate"].some(k => t.includes(k))) return "consultative_sales";
  if (["e-commerce"].some(k => t.includes(k))) return "membership_recurring";
  if (["legal"].some(k => t.includes(k))) return "project_service";
  return "custom_hybrid";
}

function guessZoomDefault(businessType: string): boolean {
  const profile = guessProvisionalProfile(businessType);
  return ["consultative_sales", "project_service", "custom_hybrid"].includes(profile);
}

// ─── Industry-aware starter defaults (ported from workspaceProvisioner.ts) ───

interface IndustryDefaults {
  calendars: { name: string; type: string; apptTypes: string[]; duration: number }[];
  services: { name: string; description: string; price: string }[];
  forms: { name: string; type: string; questions: string[] }[];
}

const INDUSTRY_DEFAULTS: Record<string, IndustryDefaults> = {
  "med spa": {
    calendars: [
      { name: "Consultations", type: "booking", apptTypes: ["Free Consultation", "Follow-Up"], duration: 30 },
      { name: "Treatments", type: "booking", apptTypes: ["Treatment Session", "Touch-Up"], duration: 60 },
    ],
    services: [
      { name: "Botox", description: "Cosmetic injection treatment", price: "Starting at $12/unit" },
      { name: "Dermal Fillers", description: "Volume restoration and contouring", price: "Starting at $600" },
      { name: "Facial", description: "Deep cleansing and rejuvenation", price: "$150" },
    ],
    forms: [{ name: "Patient Intake", type: "intake", questions: ["Allergies or sensitivities?", "Current medications?", "Previous treatments?"] }],
  },
  salon: {
    calendars: [{ name: "Appointments", type: "booking", apptTypes: ["Haircut", "Color", "Styling", "Consultation"], duration: 45 }],
    services: [
      { name: "Haircut", description: "Cut and style", price: "From $45" },
      { name: "Color", description: "Full color treatment", price: "From $120" },
      { name: "Blowout", description: "Wash and blowout style", price: "$55" },
    ],
    forms: [{ name: "New Client Form", type: "intake", questions: ["Hair type?", "Any sensitivities?", "Style preferences?"] }],
  },
  dental: {
    calendars: [
      { name: "General", type: "booking", apptTypes: ["Cleaning", "Exam", "Consultation"], duration: 30 },
      { name: "Procedures", type: "booking", apptTypes: ["Filling", "Crown", "Root Canal"], duration: 60 },
    ],
    services: [
      { name: "Cleaning & Exam", description: "Routine dental cleaning and examination", price: "$200" },
      { name: "Teeth Whitening", description: "Professional whitening treatment", price: "From $350" },
    ],
    forms: [{ name: "Patient Intake", type: "intake", questions: ["Dental insurance provider?", "Current medications?", "Last dental visit?"] }],
  },
  agency: {
    calendars: [
      { name: "Sales Calls", type: "booking", apptTypes: ["Discovery Call", "Strategy Session"], duration: 30 },
      { name: "Onboarding", type: "booking", apptTypes: ["Kickoff Meeting", "Training Session"], duration: 60 },
    ],
    services: [
      { name: "SEO Package", description: "Monthly SEO management", price: "From $1,500/mo" },
      { name: "Social Media Management", description: "Content creation and posting", price: "From $1,000/mo" },
      { name: "Paid Ads Management", description: "PPC campaign management", price: "From $1,200/mo" },
    ],
    forms: [{ name: "Lead Intake", type: "contact", questions: ["Monthly marketing budget?", "Current marketing challenges?", "Goals for the next 6 months?"] }],
  },
  "home service": {
    calendars: [{ name: "Estimates", type: "booking", apptTypes: ["Free Estimate", "Consultation", "Service Call"], duration: 30 }],
    services: [
      { name: "Service Call", description: "Standard service visit", price: "From $99" },
      { name: "Emergency Service", description: "Same-day emergency response", price: "From $199" },
    ],
    forms: [{ name: "Service Request", type: "contact", questions: ["Describe the issue", "Preferred date/time?", "Property type?"] }],
  },
  "professional service": {
    calendars: [{ name: "Consultations", type: "booking", apptTypes: ["Initial Consultation", "Follow-Up", "Review Meeting"], duration: 45 }],
    services: [
      { name: "Consultation", description: "Professional consultation session", price: "From $150/hr" },
      { name: "Monthly Retainer", description: "Ongoing advisory services", price: "From $2,000/mo" },
    ],
    forms: [{ name: "Client Intake", type: "intake", questions: ["Nature of your inquiry?", "Timeline or urgency?", "Budget range?"] }],
  },
  retail: {
    calendars: [{ name: "Appointments", type: "booking", apptTypes: ["In-Store Appointment", "Personal Shopping"], duration: 30 }],
    services: [
      { name: "Personal Shopping", description: "Guided shopping experience", price: "Complimentary" },
    ],
    forms: [{ name: "Contact Form", type: "contact", questions: ["What are you looking for?", "Preferred contact method?"] }],
  },
  "local business": {
    calendars: [{ name: "Appointments", type: "booking", apptTypes: ["Appointment", "Consultation"], duration: 30 }],
    services: [{ name: "Standard Service", description: "Our core service offering", price: "Contact for pricing" }],
    forms: [{ name: "Contact Form", type: "contact", questions: ["How can we help you?", "Best time to reach you?"] }],
  },
  general: {
    calendars: [{ name: "Appointments", type: "booking", apptTypes: ["Appointment", "Consultation"], duration: 30 }],
    services: [{ name: "Core Service", description: "Primary service offering", price: "Contact for pricing" }],
    forms: [{ name: "Contact Form", type: "contact", questions: ["How can we help you?"] }],
  },
};

const FALLBACK_DEFAULTS: IndustryDefaults = {
  calendars: [{ name: "Appointments", type: "booking", apptTypes: ["Appointment", "Consultation"], duration: 30 }],
  services: [],
  forms: [{ name: "Contact Form", type: "contact", questions: ["How can we help you?"] }],
};

function matchIndustry(industry: string | null | undefined): IndustryDefaults | null {
  if (!industry) return null;
  const lower = industry.toLowerCase();
  for (const [key, val] of Object.entries(INDUSTRY_DEFAULTS)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

const DEFAULT_CONTENT_BLOCKS = [
  { page_key: "home", block_key: "hero", block_type: "hero", block_label: "Hero Banner", display_order: 0, content_json: { headline: "", subheadline: "", cta_text: "Get Started", cta_url: "" }, is_active: true },
  { page_key: "home", block_key: "services", block_type: "services", block_label: "Services Overview", display_order: 1, content_json: { title: "Our Services", items: [] }, is_active: true },
  { page_key: "home", block_key: "about", block_type: "text", block_label: "About Us", display_order: 2, content_json: { title: "About Us", body: "" }, is_active: true },
  { page_key: "home", block_key: "testimonials", block_type: "testimonials", block_label: "Testimonials", display_order: 3, content_json: { title: "What Our Clients Say", items: [] }, is_active: true },
  { page_key: "home", block_key: "contact", block_type: "contact", block_label: "Contact", display_order: 4, content_json: { title: "Get In Touch", phone: "", email: "", address: "" }, is_active: true },
];

const DEFAULT_SETUP_ITEMS: { item_key: string; title: string; category: string; display_order: number }[] = [
  { item_key: "brand_logo", title: "Upload your logo", category: "branding", display_order: 1 },
  { item_key: "brand_colors", title: "Set brand colors", category: "branding", display_order: 2 },
  { item_key: "services_configured", title: "Configure your services", category: "services", display_order: 3 },
  { item_key: "calendar_availability", title: "Set calendar availability", category: "calendar", display_order: 4 },
  { item_key: "team_invited", title: "Invite your team", category: "team", display_order: 5 },
  { item_key: "forms_reviewed", title: "Review intake forms", category: "forms", display_order: 6 },
  { item_key: "integrations_connected", title: "Connect integrations", category: "integrations", display_order: 7 },
  { item_key: "first_contact_added", title: "Add your first contact", category: "crm", display_order: 8 },
];

async function provisionWorkspaceDefaults(
  adminClient: ReturnType<typeof createClient>,
  opts: {
    clientId: string;
    industry: string | null;
    timezone: string;
    ownerEmail: string;
    ownerName: string | null;
    ownerPhone: string | null;
  }
) {
  const { clientId, industry, timezone: tz, ownerEmail, ownerName, ownerPhone } = opts;
  const defaults = matchIndustry(industry) || FALLBACK_DEFAULTS;
  const provisionedItems: string[] = [];

  // Existence checks — skip anything already present (idempotent).
  const [calRes, svcRes, formRes, contentRes, wsUserRes, billingRes, recRes, setupRes] = await Promise.all([
    adminClient.from("calendars").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    adminClient.from("service_catalog").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    adminClient.from("client_forms").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    adminClient.from("website_content_blocks").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    adminClient.from("workspace_users").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    adminClient.from("billing_accounts").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    adminClient.from("ai_business_insights").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    adminClient.from("client_setup_items").select("id", { count: "exact", head: true }).eq("client_id", clientId),
  ]);

  // 1. Calendars + availability + appointment types + booking links + reminder rules
  if ((calRes.count || 0) === 0) {
    for (const calDef of defaults.calendars) {
      const { data: cal } = await adminClient.from("calendars").insert({
        client_id: clientId,
        calendar_name: calDef.name,
        calendar_type: calDef.type,
        timezone: tz,
        is_active: true,
      }).select().single();

      if (!cal) continue;

      await adminClient.from("calendar_availability").insert(
        [1, 2, 3, 4, 5].map((day) => ({
          client_id: clientId,
          calendar_id: cal.id,
          day_of_week: day,
          start_time: "09:00",
          end_time: "17:00",
          slot_interval_minutes: 30,
          is_active: true,
        }))
      );

      await adminClient.from("calendar_appointment_types").insert(
        calDef.apptTypes.map((typeName) => ({
          client_id: clientId,
          calendar_id: cal.id,
          name: typeName,
          duration_minutes: calDef.duration,
          is_active: true,
        }))
      );

      const linkSlug = calDef.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await adminClient.from("calendar_booking_links").insert({
        client_id: clientId,
        calendar_id: cal.id,
        slug: `${clientId.slice(0, 8)}-${linkSlug}`,
        is_active: true,
        is_public: true,
      });

      await adminClient.from("calendar_reminder_rules").insert([
        { client_id: clientId, calendar_id: cal.id, reminder_type: "confirmation", channel: "email", offset_minutes: 0, is_active: true },
        { client_id: clientId, calendar_id: cal.id, reminder_type: "reminder", channel: "email", offset_minutes: 1440, is_active: true },
      ]);

      provisionedItems.push(`Calendar: ${calDef.name}`);
    }
  }

  // 2. Services
  if ((svcRes.count || 0) === 0 && defaults.services.length > 0) {
    await adminClient.from("service_catalog").insert(
      defaults.services.map((svc, i) => ({
        client_id: clientId,
        service_name: svc.name,
        service_description: svc.description,
        display_price_text: svc.price,
        service_status: "active",
        display_order: i,
      }))
    );
    provisionedItems.push(`Services (${defaults.services.length})`);
  }

  // 3. Forms
  if ((formRes.count || 0) === 0) {
    for (const formDef of defaults.forms) {
      await adminClient.from("client_forms").insert({
        client_id: clientId,
        form_name: formDef.name,
        form_type: formDef.type,
        form_status: "draft",
        intake_questions: formDef.questions.map((q, i) => ({
          id: `q${i + 1}`,
          label: q,
          type: "text",
          required: false,
        })),
      });
      provisionedItems.push(`Form: ${formDef.name}`);
    }
  }

  // 4. Website content scaffold
  if ((contentRes.count || 0) === 0) {
    await adminClient.from("website_content_blocks").insert(
      DEFAULT_CONTENT_BLOCKS.map((b) => ({ client_id: clientId, ...b }))
    );
    provisionedItems.push("Website content structure");
  }

  // 5. Workspace owner user (also grants sidebar module access via role_preset=owner)
  if ((wsUserRes.count || 0) === 0 && ownerEmail) {
    await adminClient.from("workspace_users").insert({
      client_id: clientId,
      email: ownerEmail,
      full_name: ownerName || ownerEmail.split("@")[0],
      phone: ownerPhone || null,
      role_preset: "owner",
      status: "active",
      is_bookable_staff: false,
    });
    provisionedItems.push("Workspace owner user");
  }

  // 6. Billing account stub
  if ((billingRes.count || 0) === 0) {
    await adminClient.from("billing_accounts").insert({
      client_id: clientId,
      billing_status: "pending_setup",
      billing_email: ownerEmail || null,
    });
    provisionedItems.push("Billing account");
  }

  // 7. Growth recommendations
  if ((recRes.count || 0) === 0) {
    const industryLabel = industry || "your business";
    await adminClient.from("ai_business_insights").insert([
      {
        client_id: clientId,
        title: "Optimize your online visibility",
        category: "growth",
        severity: "medium",
        status: "active",
        explanation: `Based on ${industryLabel} industry benchmarks, optimizing your Google Business Profile and local SEO can increase new customer inquiries by 20-40%.`,
        recommended_action: "Complete your Google Business Profile and request a local SEO audit.",
      },
      {
        client_id: clientId,
        title: "Automate booking confirmations",
        category: "efficiency",
        severity: "low",
        status: "active",
        explanation: "Automated confirmation and reminder emails reduce no-shows by up to 30% and save staff time.",
        recommended_action: "Enable automated email reminders in your calendar settings.",
      },
    ]);
    provisionedItems.push("Growth recommendations (2)");
  }

  // 8. Setup checklist items
  if ((setupRes.count || 0) === 0) {
    await adminClient.from("client_setup_items").insert(
      DEFAULT_SETUP_ITEMS.map((item) => ({
        client_id: clientId,
        item_key: item.item_key,
        title: item.title,
        category: item.category,
        display_order: item.display_order,
        status: "pending",
      }))
    );
    provisionedItems.push(`Setup checklist (${DEFAULT_SETUP_ITEMS.length})`);
  }

  // 9. Audit trail
  if (provisionedItems.length > 0) {
    await Promise.all([
      adminClient.from("crm_activities").insert({
        client_id: clientId,
        activity_type: "auto_provisioned",
        activity_note: `Full workspace template applied — ${provisionedItems.length} item(s): ${provisionedItems.join(", ")}`,
      }),
      adminClient.from("audit_logs").insert({
        action: "full_workspace_provisioned",
        client_id: clientId,
        module: "onboarding",
        metadata: { industry, items: provisionedItems, auto: true, source: "provision-from-booking" },
      }),
    ]);
  }

  console.log(`[provision-from-booking] provisioned ${provisionedItems.length} items for ${clientId}: ${provisionedItems.join(", ")}`);
  return provisionedItems;
}

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
      provisional_profile: explicit_profile,
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
      business_type: industry || null,
      provisional_profile: explicit_profile || guessProvisionalProfile(industry || ""),
      zoom_enabled_default: explicit_profile ? ["consultative_sales", "project_service", "custom_hybrid"].includes(explicit_profile) : guessZoomDefault(industry || ""),
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
      // Demo SOP shell — placeholder content for Module 1 & 2 so the new
      // sub-account has something to show until the closing/go-live form
      // replaces it with the client's real SOPs.
      adminClient.from("client_training_sop").upsert(
        {
          client_id: client.id,
          company_intro: "[DEMO PLACEHOLDER]\n\nThis is where your company introduction will go. In the live version, your team will learn who you are, what you do, and the story behind your business — all written from your closing/go-live form.\n\nReplace this content from the Closing & Activation form.",
          core_offer: "[DEMO PLACEHOLDER]\n\nThis is where your core offer will go: what you sell, the outcome it delivers for customers, and the reason it's worth the price.\n\nReplace this content from the Closing & Activation form.",
          sales_process: "[DEMO PLACEHOLDER]\n\nThis is where your sales process will go, step by step — from first contact to closed customer. Your team will learn it here before they ever take a call.\n\nReplace this content from the Closing & Activation form.",
          scripts: "[DEMO PLACEHOLDER]\n\nThis is where your scripts will go: opener, qualifying questions, pitch, close, and common objection handling.\n\nReplace this content from the Closing & Activation form.",
          is_demo_shell: true,
          bdr_training_enabled: false,
        },
        { onConflict: "client_id", ignoreDuplicates: true }
      ),
    ]);

    // ─── Full workspace provisioning (ported from src/lib/workspaceProvisioner.ts) ───
    // Ensures every booking-confirmed client automatically gets calendars,
    // services, forms, billing, workspace user, setup items, and recommendations
    // without needing anyone to open a UI.
    try {
      await provisionWorkspaceDefaults(adminClient, {
        clientId: client.id,
        industry: industry || null,
        timezone: timezone || "America/Los_Angeles",
        ownerEmail: contact_email,
        ownerName: contact_name || null,
        ownerPhone: contact_phone || null,
      });
    } catch (provErr) {
      console.error("[provision-from-booking] workspace defaults failed (non-blocking):", (provErr as Error).message);
    }



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
      const baseUrl = origin || "https://newlightgen.com";

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