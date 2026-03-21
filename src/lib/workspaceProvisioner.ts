import { supabase } from "@/integrations/supabase/client";
import { emitEvent } from "./automationEngine";

// ─── Industry-Aware Defaults ─────────────────────────────────────────

interface IndustryDefaults {
  calendars: { name: string; type: string; apptTypes: string[]; duration: number }[];
  services: { name: string; description: string; price: string; category?: string }[];
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
      { name: "Gift Registry", description: "Custom gift registry setup", price: "Free" },
    ],
    forms: [{ name: "Contact Form", type: "contact", questions: ["What are you looking for?", "Preferred contact method?"] }],
  },
  "local business": {
    calendars: [{ name: "Appointments", type: "booking", apptTypes: ["Appointment", "Consultation"], duration: 30 }],
    services: [
      { name: "Standard Service", description: "Our core service offering", price: "Contact for pricing" },
    ],
    forms: [{ name: "Contact Form", type: "contact", questions: ["How can we help you?", "Best time to reach you?"] }],
  },
  general: {
    calendars: [{ name: "Appointments", type: "booking", apptTypes: ["Appointment", "Consultation"], duration: 30 }],
    services: [
      { name: "Core Service", description: "Primary service offering", price: "Contact for pricing" },
    ],
    forms: [{ name: "Contact Form", type: "contact", questions: ["How can we help you?"] }],
  },
};

function matchIndustry(industry: string | null | undefined): IndustryDefaults | null {
  if (!industry) return null;
  const lower = industry.toLowerCase();
  for (const [key, val] of Object.entries(INDUSTRY_DEFAULTS)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

// ─── Default Fallback Starter ────────────────────────────────────────

const FALLBACK_DEFAULTS: IndustryDefaults = {
  calendars: [{ name: "Appointments", type: "booking", apptTypes: ["Appointment", "Consultation"], duration: 30 }],
  services: [],
  forms: [{ name: "Contact Form", type: "contact", questions: ["How can we help you?"] }],
};

// ─── Website Content Block Defaults ──────────────────────────────────

const DEFAULT_CONTENT_BLOCKS = [
  { page_key: "home", block_key: "hero", block_type: "hero", block_label: "Hero Banner", display_order: 0, content_json: { headline: "", subheadline: "", cta_text: "Get Started", cta_url: "" }, is_active: true },
  { page_key: "home", block_key: "services", block_type: "services", block_label: "Services Overview", display_order: 1, content_json: { title: "Our Services", items: [] }, is_active: true },
  { page_key: "home", block_key: "about", block_type: "text", block_label: "About Us", display_order: 2, content_json: { title: "About Us", body: "" }, is_active: true },
  { page_key: "home", block_key: "testimonials", block_type: "testimonials", block_label: "Testimonials", display_order: 3, content_json: { title: "What Our Clients Say", items: [] }, is_active: true },
  { page_key: "home", block_key: "contact", block_type: "contact", block_label: "Contact", display_order: 4, content_json: { title: "Get In Touch", phone: "", email: "", address: "" }, is_active: true },
];

// ─── Provisioner ─────────────────────────────────────────────────────

export async function provisionWorkspaceDefaults(clientId: string, options: {
  industry?: string | null;
  timezone?: string;
  skipIfExists?: boolean;
  ownerEmail?: string | null;
  ownerName?: string | null;
}) {
  const tz = options.timezone || "America/Los_Angeles";
  const defaults = matchIndustry(options.industry) || FALLBACK_DEFAULTS;
  const skip = options.skipIfExists !== false;
  const templateName = options.industry || "General";

  // Check existing records to avoid duplicates
  const [calRes, svcRes, formRes, contentRes, wsUserRes, billingRes, recRes] = await Promise.all([
    supabase.from("calendars").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("service_catalog" as any).select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("client_forms").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("website_content_blocks").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("workspace_users").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("billing_accounts").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("ai_business_insights").select("id", { count: "exact", head: true }).eq("client_id", clientId),
  ]);

  const hasCalendars = (calRes.count || 0) > 0;
  const hasServices = (svcRes.count || 0) > 0;
  const hasForms = (formRes.count || 0) > 0;
  const hasContent = (contentRes.count || 0) > 0;
  const hasWsUsers = (wsUserRes.count || 0) > 0;
  const hasBilling = (billingRes.count || 0) > 0;
  const hasRecommendations = (recRes.count || 0) > 0;

  const provisionedItems: string[] = [];

  // 1. Auto-create starter calendars + availability + appointment types + booking links + reminders
  if (!hasCalendars || !skip) {
    for (const calDef of defaults.calendars) {
      const { data: cal } = await supabase.from("calendars").insert({
        client_id: clientId,
        calendar_name: calDef.name,
        calendar_type: calDef.type,
        timezone: tz,
        is_active: true,
      }).select().single();

      if (cal) {
        const dayInserts = [1, 2, 3, 4, 5].map(day => ({
          client_id: clientId,
          calendar_id: cal.id,
          day_of_week: day,
          start_time: "09:00",
          end_time: "17:00",
          slot_interval_minutes: 30,
          is_active: true,
        }));
        await supabase.from("calendar_availability").insert(dayInserts);

        for (const typeName of calDef.apptTypes) {
          await supabase.from("calendar_appointment_types").insert({
            client_id: clientId,
            calendar_id: cal.id,
            name: typeName,
            duration_minutes: calDef.duration,
            is_active: true,
          });
        }

        const linkSlug = calDef.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        await supabase.from("calendar_booking_links").insert({
          client_id: clientId,
          calendar_id: cal.id,
          slug: `${clientId.slice(0, 8)}-${linkSlug}`,
          is_active: true,
          is_public: true,
        });

        await supabase.from("calendar_reminder_rules").insert([
          { client_id: clientId, calendar_id: cal.id, reminder_type: "confirmation", channel: "email", offset_minutes: 0, is_active: true },
          { client_id: clientId, calendar_id: cal.id, reminder_type: "reminder", channel: "email", offset_minutes: 1440, is_active: true },
        ]);

        provisionedItems.push(`Calendar: ${calDef.name}`);
      }
    }
  }

  // 2. Auto-create starter services
  if (!hasServices || !skip) {
    for (let i = 0; i < defaults.services.length; i++) {
      const svc = defaults.services[i];
      await supabase.from("service_catalog" as any).insert({
        client_id: clientId,
        service_name: svc.name,
        service_description: svc.description,
        display_price_text: svc.price,
        service_status: "active",
        display_order: i,
      });
      provisionedItems.push(`Service: ${svc.name}`);
    }
  }

  // 3. Auto-create starter forms
  if (!hasForms || !skip) {
    for (const formDef of defaults.forms) {
      await supabase.from("client_forms").insert({
        client_id: clientId,
        form_name: formDef.name,
        form_type: formDef.type,
        form_status: "draft",
        intake_questions: formDef.questions.map((q, i) => ({ id: `q${i + 1}`, label: q, type: "text", required: false })),
      });
      provisionedItems.push(`Form: ${formDef.name}`);
    }
  }

  // 4. Auto-create website content blocks scaffold
  if (!hasContent || !skip) {
    for (const block of DEFAULT_CONTENT_BLOCKS) {
      await supabase.from("website_content_blocks").insert({
        client_id: clientId,
        ...block,
      });
    }
    provisionedItems.push("Website content structure (5 blocks)");
  }

  // 5. Auto-create workspace owner user record
  if ((!hasWsUsers || !skip) && options.ownerEmail) {
    await supabase.from("workspace_users").insert({
      client_id: clientId,
      email: options.ownerEmail,
      full_name: options.ownerName || options.ownerEmail.split("@")[0],
      role_preset: "owner",
      status: "active",
      is_bookable_staff: false,
    });
    provisionedItems.push("Workspace owner user");
  }

  // 6. Auto-create billing account stub
  if (!hasBilling || !skip) {
    await supabase.from("billing_accounts").insert({
      client_id: clientId,
      billing_status: "pending_setup",
    });
    provisionedItems.push("Billing account");
  }

  // 7. Auto-create starter recommendation / growth insight
  if (!hasRecommendations || !skip) {
    const industryLabel = options.industry || "your business";
    await supabase.from("ai_business_insights").insert([
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

  // 8. Log provisioning audit trail
  if (provisionedItems.length > 0) {
    await Promise.all([
      supabase.from("crm_activities").insert({
        client_id: clientId,
        activity_type: "auto_provisioned",
        activity_note: `Full app template "${templateName}" applied — ${provisionedItems.length} item(s) created: ${provisionedItems.join(", ")}`,
      }),
      supabase.from("audit_logs").insert({
        action: "full_app_template_applied",
        client_id: clientId,
        module: "onboarding",
        metadata: { template: templateName, items: provisionedItems, auto: true },
      }),
    ]);
  }

  // 9. Emit events
  await emitEvent({
    eventKey: "workspace_created",
    clientId,
    payload: { industry: options.industry, auto_provisioned: true, items_created: provisionedItems.length },
  });

  return { calendarsCreated: !hasCalendars, servicesCreated: !hasServices, formsCreated: !hasForms, provisionedItems };
}

// ─── Setup Status Sync ──────────────────────────────────────────────

export async function syncOnboardingStage(clientId: string, stage: string) {
  await supabase.from("clients").update({ onboarding_stage: stage } as any).eq("id", clientId);

  await supabase.from("audit_logs").insert({
    action: "onboarding_stage_updated",
    client_id: clientId,
    module: "onboarding",
    metadata: { new_stage: stage },
  });

  await emitEvent({
    eventKey: "setup_progress_updated",
    clientId,
    payload: { stage },
  });
}

// ─── Launch / Activate Workspace ────────────────────────────────────

export interface LaunchResult {
  success: boolean;
  blockers: string[];
}

export async function launchWorkspace(clientId: string): Promise<LaunchResult> {
  const [
    brandRes, svcRes, calRes, formRes, formRes2, contactRes,
    proposalRes, subRes,
  ] = await Promise.all([
    supabase.from("client_branding").select("logo_url, primary_color").eq("client_id", clientId).maybeSingle(),
    supabase.from("service_catalog" as any).select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("calendars").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("is_active", true),
    supabase.from("client_forms" as any).select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("forms").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("proposals").select("proposal_status").eq("client_id", clientId),
    supabase.from("subscriptions").select("subscription_status").eq("client_id", clientId),
  ]);

  const blockers: string[] = [];
  const hasBrand = !!(brandRes.data?.logo_url && brandRes.data?.primary_color && brandRes.data.primary_color !== "#3B82F6");
  if (!hasBrand) blockers.push("Branding incomplete — add logo and brand colors");
  if ((svcRes.count || 0) === 0) blockers.push("No services or products added");
  if ((calRes.count || 0) === 0) blockers.push("No active calendar created");
  const formCount = (formRes.count || 0) + (formRes2.count || 0);
  if (formCount === 0) blockers.push("No booking forms created");

  if (blockers.length > 0) {
    return { success: false, blockers };
  }

  await supabase.from("clients").update({ onboarding_stage: "active" } as any).eq("id", clientId);

  await Promise.all([
    supabase.from("audit_logs").insert({
      action: "workspace_launched",
      client_id: clientId,
      module: "activation",
      metadata: { launched_at: new Date().toISOString() },
    }),
    supabase.from("crm_activities").insert({
      client_id: clientId,
      activity_type: "milestone",
      activity_note: "Workspace launched and marked active",
    }),
    emitEvent({
      eventKey: "workspace_created",
      clientId,
      payload: { stage: "active", launched: true },
    }),
  ]);

  return { success: true, blockers: [] };
}

// ─── Compute Readiness for Admin View ────────────────────────────────

export interface WorkspaceReadinessResult {
  brandingComplete: boolean;
  calendarReady: boolean;
  formsReady: boolean;
  teamReady: boolean;
  integrationsReviewed: boolean;
  percentage: number;
  onboardingStage: string;
}

export async function computeWorkspaceReadiness(clientId: string): Promise<WorkspaceReadinessResult> {
  const [brandRes, calRes, formRes, formRes2, teamRes, intgRes, clientRes] = await Promise.all([
    supabase.from("client_branding").select("logo_url, primary_color").eq("client_id", clientId).maybeSingle(),
    supabase.from("calendars").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("client_forms").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("forms").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("workspace_users").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("client_integrations").select("status").eq("client_id", clientId),
    supabase.from("clients").select("onboarding_stage").eq("id", clientId).single(),
  ]);

  const brandingComplete = !!(brandRes.data?.logo_url && brandRes.data?.primary_color && brandRes.data.primary_color !== "#3B82F6");
  const calendarReady = (calRes.count || 0) > 0;
  const formsReady = ((formRes.count || 0) + (formRes2.count || 0)) > 0;
  const teamReady = (teamRes.count || 0) > 0;
  const intgs = intgRes.data || [];
  const integrationsReviewed = intgs.length > 0 && intgs.some((i: any) => i.status !== "not_started");

  const checks = [brandingComplete, calendarReady, formsReady, teamReady, integrationsReviewed];
  const percentage = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return {
    brandingComplete,
    calendarReady,
    formsReady,
    teamReady,
    integrationsReviewed,
    percentage,
    onboardingStage: clientRes.data?.onboarding_stage || "lead",
  };
}
