import { supabase } from "@/integrations/supabase/client";
import { emitEvent } from "./automationEngine";

// ─── Industry-Aware Defaults ─────────────────────────────────────────

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
};

function matchIndustry(industry: string | null | undefined): IndustryDefaults | null {
  if (!industry) return null;
  const lower = industry.toLowerCase();
  for (const [key, val] of Object.entries(INDUSTRY_DEFAULTS)) {
    if (lower.includes(key)) return val;
  }
  // Fallback: professional service for unknown
  return null;
}

// ─── Default Fallback Starter ────────────────────────────────────────

const FALLBACK_DEFAULTS: IndustryDefaults = {
  calendars: [{ name: "Appointments", type: "booking", apptTypes: ["Appointment", "Consultation"], duration: 30 }],
  services: [],
  forms: [{ name: "Contact Form", type: "contact", questions: ["How can we help you?"] }],
};

// ─── Provisioner ─────────────────────────────────────────────────────

export async function provisionWorkspaceDefaults(clientId: string, options: {
  industry?: string | null;
  timezone?: string;
  skipIfExists?: boolean;
}) {
  const tz = options.timezone || "America/Los_Angeles";
  const defaults = matchIndustry(options.industry) || FALLBACK_DEFAULTS;
  const skip = options.skipIfExists !== false;

  // Check existing records to avoid duplicates
  const [calRes, svcRes, formRes] = await Promise.all([
    supabase.from("calendars").select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("service_catalog" as any).select("id", { count: "exact", head: true }).eq("client_id", clientId),
    supabase.from("client_forms").select("id", { count: "exact", head: true }).eq("client_id", clientId),
  ]);

  const hasCalendars = (calRes.count || 0) > 0;
  const hasServices = (svcRes.count || 0) > 0;
  const hasForms = (formRes.count || 0) > 0;

  // 1. Auto-create starter calendars
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
        // Availability: Mon-Fri 9-5
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

        // Appointment types
        for (const typeName of calDef.apptTypes) {
          await supabase.from("calendar_appointment_types").insert({
            client_id: clientId,
            calendar_id: cal.id,
            name: typeName,
            duration_minutes: calDef.duration,
            is_active: true,
          });
        }

        // Booking link
        const linkSlug = calDef.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        await supabase.from("calendar_booking_links").insert({
          client_id: clientId,
          calendar_id: cal.id,
          slug: `${clientId.slice(0, 8)}-${linkSlug}`,
          is_active: true,
          is_public: true,
        });

        // Default reminder rules
        await supabase.from("calendar_reminder_rules").insert([
          { client_id: clientId, calendar_id: cal.id, reminder_type: "confirmation", channel: "email", offset_minutes: 0, is_active: true },
          { client_id: clientId, calendar_id: cal.id, reminder_type: "reminder", channel: "email", offset_minutes: 1440, is_active: true },
        ]);
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
    }
  }

  // 4. Emit events
  await emitEvent({
    eventKey: "workspace_created",
    clientId,
    payload: { industry: options.industry, auto_provisioned: true },
  });

  return { calendarsCreated: !hasCalendars, servicesCreated: !hasServices, formsCreated: !hasForms };
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
  const teamReady = (teamRes.count || 0) > 1;
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
