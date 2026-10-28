// Close Prep submission for a BDR's own lead.
// - Ensures a crm_deals row exists for the lead (creates one if none).
// - Persists pricing/closing_notes/close_prep_completed_at on the deal.
// - Creates a closing_meeting bdr_calendar_events row on the rep's own calendar.
// - Fires universal + rep-focused notifications (SMS + email).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createZoomMeeting } from "../_shared/zoom.ts";
import { attendeeEmail, type MeetingAttendee } from "../_shared/meetingAttendees.ts";
import { esc, fmtMoney, buildServiceAgreementHtml } from "../_shared/service-agreement-html.ts";

// Short, distinct receipt/terms-summary document (separate from the full 16-section agreement).
function buildTermsSummaryHtml(args: { businessName: string; priceLine: string; retainerKpi?: string | null }): string {
  const bn = esc(args.businessName);
  const kpiRow = args.retainerKpi
    ? `<tr><td style="padding:8px 0;color:#6b7280;width:140px;vertical-align:top;">KPI Target</td><td style="padding:8px 0;">${esc(args.retainerKpi)}</td></tr>`
    : "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt / Terms Summary — ${bn}</title></head>
<body style="font-family:Georgia,'Times New Roman',serif;color:#111827;background:#ffffff;max-width:720px;margin:0 auto;padding:48px 40px;line-height:1.6;">
  <h1 style="font-size:22px;margin:0 0 4px;">Receipt / Terms Summary</h1>
  <p style="color:#6b7280;margin:0 0 24px;">${bn} &mdash; effective as of the date of signature</p>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="padding:8px 0;color:#6b7280;width:140px;vertical-align:top;">Business</td><td style="padding:8px 0;"><strong>${bn}</strong></td></tr>
    <tr><td style="padding:8px 0;color:#6b7280;vertical-align:top;">Terms</td><td style="padding:8px 0;"><strong>${esc(args.priceLine)}</strong></td></tr>
    ${kpiRow}
  </table>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="font-size:14px;color:#6b7280;">This is a summary for your records. The Service Agreement is the full governing legal document.</p>
</body></html>`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UNIVERSAL_SMS_TO = "+18053408945";
const UNIVERSAL_EMAIL_TO = "team@newlightgen.com";
const TWILIO_FROM = "+18555066111";

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "America/Los_Angeles",
  });
}

async function sendSms(to: string, body: string): Promise<boolean> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
    console.log(`[SMS QUEUED] to=${to} body="${body.slice(0, 120)}"`);
    return false;
  }
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: "+18555066111",
        Body: body,
      }),
    });
    if (!res.ok) { console.error("Twilio error:", res.status, await res.text().catch(() => "")); return false; }
    return true;
  } catch (e) { console.error("SMS send error:", e); return false; }
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL QUEUED - no RESEND_API_KEY] to=${to} subject="${subject}"`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "NewLight <team@newlightgen.com>", to: [to], subject, text, html }),
    });
    if (!res.ok) { console.error("Resend error:", res.status, await res.text().catch(() => "")); return false; }
    return true;
  } catch (e) { console.error("Email send error:", e); return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !authData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = authData.user.id as string;
    const userEmail = authData.user.email as string | undefined;

    const body = await req.json();
    const {
      lead_id,
      initial_fee,
      recurring_fee,
      commission_rate,
      commission_rate_ongoing,
      pricing_model: pricing_model_in,
      retainer_kpi,
      closing_notes,
      meeting_starts_at,
      duration_minutes,
      client_details,
      away,
      attendees: attendeesIn,
    } = body || {};
    // "Meeting away from our Zoom": no Zoom link, no client/attendee emails or texts.
    const isAway = away === true;
    const attendeeInput: Array<{ name: string; email: string | null; phone: string | null }> = Array.isArray(attendeesIn)
      ? attendeesIn.slice(0, 10).map((a: any) => ({
          name: typeof a?.name === "string" ? a.name.trim().slice(0, 120) : "",
          email: typeof a?.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim()) ? a.email.trim().toLowerCase().slice(0, 200) : null,
          phone: typeof a?.phone === "string" && a.phone.replace(/\D/g, "").length >= 10 ? a.phone.trim().slice(0, 40) : null,
        })).filter((a: any) => a.name && (a.email || a.phone))
      : [];

    if (!lead_id || !meeting_starts_at) {
      return new Response(JSON.stringify({ error: "Missing required fields (lead_id, meeting_starts_at)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const pricing_model = pricing_model_in === "commission" ? "commission" : "retainer";
    const isCommission = pricing_model === "commission";
    const kpi = typeof retainer_kpi === "string" && retainer_kpi.trim() ? retainer_kpi.trim() : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Load the lead & confirm ownership
    const { data: lead, error: leadErr } = await supabase
      .from("nl_bdr_leads")
      .select("id, user_id, client_id, provisioned_client_id, business_name, owner_name, phone, email, crm_contact_id, crm_deal_id, pipeline_stage, outcome_history, customer_notes, website, logo_url")
      .eq("id", lead_id)
      .maybeSingle();
    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (lead.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Not your lead" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1b. Skip-Form-1 path: no discovery meeting was ever booked for this lead.
    //     The rep supplies the client's details here instead, and the client's
    //     account is created below exactly as a Form 1 booking would have.
    const { count: discoveryCount } = await supabase
      .from("bdr_calendar_events")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", lead.id)
      .eq("meeting_kind", "discovery");
    const skippedDiscovery = (discoveryCount ?? 0) === 0;
    if (skippedDiscovery) {
      const cd = client_details && typeof client_details === "object" ? client_details : {};
      const cdName = typeof cd.full_name === "string" ? cd.full_name.trim().slice(0, 120) : "";
      const cdEmail = typeof cd.email === "string" ? cd.email.trim().toLowerCase().slice(0, 200) : "";
      const cdPhone = typeof cd.phone === "string" ? cd.phone.trim().slice(0, 40) : "";
      if (!cdName || !cdPhone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cdEmail)) {
        return new Response(JSON.stringify({ error: "This lead skipped Form 1 — client name, a valid email and phone are required." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const modules = Array.isArray(cd.modules_of_interest)
        ? cd.modules_of_interest.filter((m: unknown) => typeof m === "string" && m).slice(0, 20) : null;
      const notesExtra = cd.compliance_restrictions === "yes" ? "Compliance restrictions: yes (from Close Prep)"
        : cd.compliance_restrictions === "no" ? "Compliance restrictions: no (from Close Prep)" : "";
      const history = Array.isArray((lead as any).outcome_history) ? (lead as any).outcome_history : [];
      const patch: Record<string, unknown> = {
        owner_name: cdName,
        email: cdEmail,
        phone: cdPhone,
        skipped_discovery: true,
        outcome_history: [...history, { label: "Skipped discovery — went straight to Form 2", timestamp: new Date().toISOString() }],
      };
      if (modules) patch.modules_of_interest = modules;
      if (typeof cd.has_sales_team === "boolean") patch.has_sales_team = cd.has_sales_team;
      if (typeof cd.sales_team_size === "string" && cd.sales_team_size) patch.sales_team_size = cd.sales_team_size.slice(0, 40);
      if (notesExtra) patch.customer_notes = [(lead as any).customer_notes, notesExtra].filter(Boolean).join("\n");
      const { error: cdErr } = await supabase.from("nl_bdr_leads").update(patch as any).eq("id", lead.id);
      if (cdErr) {
        // Phone may collide with another rep's lead (unique index) — keep the rest.
        console.error("[close-prep-submit] client details update failed, retrying without phone:", cdErr.message);
        delete patch.phone;
        await supabase.from("nl_bdr_leads").update(patch as any).eq("id", lead.id);
      }
      (lead as any).owner_name = cdName;
      (lead as any).email = cdEmail;
      (lead as any).phone = cdPhone;
    }

    // 1c. Does this lead still need a client account? Form 1 bookings (booking_form /
    //     round_robin) create it at booking time. Skipped-Form-1 leads and first
    //     meetings booked elsewhere (away from our Zoom) get it here at Form 2.
    const { count: form1Count } = await supabase
      .from("bdr_calendar_events")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", lead.id)
      .in("source", ["booking_form", "round_robin"]);
    const needsAccount = !(lead as any).provisioned_client_id && (form1Count ?? 0) === 0;

    // 2. Ensure calendar (reps may own several booking links — take the oldest)
    let { data: cal } = await supabase
      .from("bdr_calendars")
      .select("id, user_id, client_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!cal) {
      const { data: created, error: calErr } = await supabase
        .from("bdr_calendars")
        .insert({
          user_id: userId,
          client_id: lead.client_id,
          name: "My Pipeline Calendar",
          booking_slug: `bdr-${userId.slice(0, 8)}-${Math.random().toString(36).slice(2, 6)}`,
        })
        .select("id, user_id, client_id")
        .single();
      if (calErr) throw calErr;
      cal = created;
    }

    // 3. Ensure CRM contact + deal
    let contactId = lead.crm_contact_id as string | null;
    if (!contactId) {
      const { data: contact } = await supabase.from("crm_contacts").insert({
        full_name: lead.owner_name || lead.business_name,
        phone: lead.phone || null,
        email: lead.email || null,
        lead_source: "bdr_field",
        contact_status: "lead",
        contact_owner: userId,
        client_id: lead.client_id,
      } as any).select("id").single();
      contactId = contact?.id || null;
    }

    let dealId = lead.crm_deal_id as string | null;
    if (!dealId) {
      const { data: deal, error: dealErr } = await supabase.from("crm_deals").insert({
        deal_name: `${lead.business_name} — BDR Lead`,
        pipeline_stage: "proposal_sent",
        status: "open",
        lead_source: "bdr_field",
        assigned_user: userId,
        contact_id: contactId,
        client_id: lead.client_id,
        // Carries the real per-business workspace provisioned at booking time,
        // so payment can be reflected on the correct client (not the ops workspace).
        provisioned_client_id: (lead as any).provisioned_client_id ?? null,
      } as any).select("id").single();
      if (dealErr) throw dealErr;
      dealId = deal!.id as string;
    }

    // 4. Create the closing-meeting calendar event
    const start = new Date(meeting_starts_at);
    const dur = Number(duration_minutes) || 45;
    const end = new Date(start.getTime() + dur * 60_000);
    const { data: evt, error: evtErr } = await supabase
      .from("bdr_calendar_events")
      .insert({
        user_id: userId,
        client_id: lead.client_id,
        calendar_id: cal!.id,
        title: `Closing Meeting: ${lead.business_name}`,
        description: closing_notes || null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        lead_id: lead.id,
        source: "closing_meeting",
        is_external: isAway,
        notes: closing_notes || null,
        metadata: { business_name: lead.business_name, phone: lead.phone, email: lead.email, customer_name: lead.owner_name || null },
      })
      .select("id")
      .single();
    if (evtErr) throw evtErr;

    // 4a. Extra attendees on the closing meeting.
    let attendeeRows: MeetingAttendee[] = [];
    if (attendeeInput.length) {
      const { data: insAtt, error: attErr } = await supabase.from("bdr_meeting_attendees")
        .insert(attendeeInput.map((a) => ({ ...a, event_id: evt.id, lead_id: lead.id, created_by: userId })) as any)
        .select("id, name, email, phone, sms_consent, optin_token");
      if (attErr) console.error("[close-prep-submit] attendees insert failed:", attErr.message);
      attendeeRows = (insAtt || []) as MeetingAttendee[];
    }

    // 4b. Zoom for the closing meeting — never blocks the booking. None when away.
    let zoomJoinUrl: string | null = null;
    let zoomStartUrl: string | null = null;
    if (!isAway) try {
      const zoom = await createZoomMeeting({
        topic: `NewLight Closing Meeting — ${lead.business_name}`,
        startTime: start.toISOString(),
        durationMinutes: dur,
        agenda: closing_notes || undefined,
      });
      zoomJoinUrl = zoom.join_url; zoomStartUrl = zoom.start_url;
      const { error: zErr } = await supabase.from("bdr_calendar_events")
        .update({ zoom_meeting_id: String(zoom.id), zoom_join_url: zoom.join_url, zoom_start_url: zoom.start_url })
        .eq("id", evt.id);
      if (zErr) console.error("[close-prep zoom] save failed:", zErr.message);
    } catch (e) {
      console.error("[close-prep zoom] create failed:", (e as Error).message);
    }

    // 5a. Create Proposal row (Form 2 artifact #1)
    const priceLineForDoc =
      (isCommission
        ? `Commission — Initial ${fmtMoney(Number(initial_fee ?? 0))} + ${Number(commission_rate ?? 0)}% yr 1 / ${Number(commission_rate_ongoing ?? 0)}% ongoing of Attributable Revenue`
        : `Retainer — Initial ${fmtMoney(Number(initial_fee ?? 0))} + ${fmtMoney(Number(recurring_fee ?? 0))}/month`) +
      (kpi ? ` · KPI: ${kpi}` : "");

    const { data: proposal, error: propErr } = await supabase
      .from("proposals")
      .insert({
        client_id: lead.client_id,
        contact_id: contactId,
        deal_id: dealId,
        proposal_title: `${lead.business_name} — Service Proposal`,
        proposal_type: "close_prep",
        proposal_status: "draft",
        pricing_model,
        setup_fee: initial_fee != null ? Number(initial_fee) : null,
        monthly_fee: !isCommission && recurring_fee != null ? Number(recurring_fee) : null,
        offer_summary: priceLineForDoc,
        internal_summary: closing_notes || null,
        created_by: userId,
        assigned_salesman_user_id: userId,
      } as any)
      .select("id, share_token")
      .single();
    if (propErr) throw propErr;
    const proposalId = proposal!.id as string;

    // 5b. Create service_agreement envelope + items (Form 2 artifact #2)
    const { data: agencySettings } = await supabase
      .from("agency_settings")
      .select("legal_entity_name, entity_type, governing_state, venue_county, notice_address, notice_email")
      .limit(1)
      .maybeSingle();
    const summaryHtml = buildServiceAgreementHtml({
      businessName: lead.business_name,
      priceLine: priceLineForDoc,
      initialFee: initial_fee != null ? Number(initial_fee) : 0,
      recurringFee: recurring_fee != null ? Number(recurring_fee) : null,
      pricingModel: pricing_model as "retainer" | "commission",
      commissionRate: commission_rate != null ? Number(commission_rate) : null,
      commissionRateOngoing: commission_rate_ongoing != null ? Number(commission_rate_ongoing) : null,
      retainerKpi: kpi,
      closingNotes: closing_notes || null,
      agencyLegalName: agencySettings?.legal_entity_name || "NewLight Marketing, LLC",
      agencyEntityType: agencySettings?.entity_type || "a California limited liability company",
      governingState: agencySettings?.governing_state || "California",
      venueCounty: agencySettings?.venue_county || "Santa Barbara County",
      dataRetentionDays: 365,
    });
    const summaryDataUrl = `data:text/html;base64,${btoa(unescape(encodeURIComponent(summaryHtml)))}`;
    const termsSummaryHtml = buildTermsSummaryHtml({ businessName: lead.business_name, priceLine: priceLineForDoc, retainerKpi: kpi });
    const termsSummaryDataUrl = `data:text/html;base64,${btoa(unescape(encodeURIComponent(termsSummaryHtml)))}`;

    const { data: envelope, error: envErr } = await supabase
      .from("document_envelopes")
      .insert({
        client_id: lead.client_id,
        // Real per-business workspace, used by client-facing document/billing views.
        provisioned_client_id: (lead as any).provisioned_client_id ?? null,
        envelope_type: "service_agreement",
        title: `Service Agreement — ${lead.business_name}`,
        status: "draft",
        related_type: "crm_deal",
        related_id: dealId,
        recipient_name: lead.owner_name || null,
        recipient_email: lead.email || null,
        created_by: userId,
        attorney_reviewed: false,
      } as any)
      .select("id, share_token")
      .single();
    if (envErr) throw envErr;
    const envelopeId = envelope!.id as string;
    const envelopeToken = envelope!.share_token as string;

    await supabase.from("document_envelope_items").insert([
      { envelope_id: envelopeId, document_name: "Service Agreement", document_url: summaryDataUrl, display_order: 0 },
      { envelope_id: envelopeId, document_name: "Receipt / Terms Summary", document_url: termsSummaryDataUrl, display_order: 1 },
    ] as any);

    // 5c. Update the deal with pricing + close_prep timestamp + meeting id + envelope/pay-sign linkage
    const dealPatch: Record<string, unknown> = {
      initial_fee: initial_fee != null ? Number(initial_fee) : null,
      pricing_model,
      recurring_fee: isCommission ? null : (recurring_fee != null ? Number(recurring_fee) : null),
      commission_rate: isCommission ? Number(commission_rate ?? 0) : null,
      commission_rate_ongoing: isCommission ? Number(commission_rate_ongoing ?? 10) : null,
      retainer_kpi: kpi,
      data_retention_days: 365,
      closing_notes: closing_notes || null,
      close_prep_completed_at: new Date().toISOString(),
      close_prep_meeting_id: evt.id,
      proposal_id_current: proposalId,
      service_agreement_envelope_id: envelopeId,
      pay_sign_status: "pending",
    };
    await supabase.from("crm_deals").update(dealPatch as any).eq("id", dealId);

    // 6. Link back to lead + create close_prep_links row
    const { error: linkErr } = await supabase.from("nl_bdr_leads").update({
      crm_contact_id: contactId,
      crm_deal_id: dealId,
      // Form 2 submitted → Hot (never downgrade Won).
      ...((lead as any).pipeline_stage === "won" ? {} : { pipeline_stage: "hot" }),
    }).eq("id", lead.id);
    if (linkErr) {
      // Hard-fail: without this link the BDR pipeline revenue reads $0.
      console.error("[close-prep-submit] failed to link deal to lead", {
        lead_id: lead.id, deal_id: dealId, error: linkErr.message,
      });
      throw linkErr;
    }

    const { error: cplErr } = await supabase.from("close_prep_links").insert({
      lead_id: lead.id, deal_id: dealId, user_id: userId,
    } as any);
    if (cplErr) console.error("[close-prep-submit] close_prep_links insert failed", cplErr.message);


    // 6b. Log the Discovery meeting outcome (Won → Form 2). Silent skip if none.
    try {
      const preferredEventId = typeof body?.event_id === "string" ? body.event_id : null;
      const { data: discEvents } = await supabase
        .from("bdr_calendar_events")
        .select("id, attempt_number, starts_at")
        .eq("lead_id", lead.id)
        .eq("meeting_kind", "discovery")
        .order("starts_at", { ascending: false })
        .limit(50);
      const ids = (discEvents || []).map((e: any) => e.id);
      let logged = new Set<string>();
      if (ids.length) {
        const { data: outs } = await supabase
          .from("bdr_meeting_outcomes").select("event_id")
          .in("event_id", ids).eq("meeting_kind", "discovery");
        logged = new Set((outs || []).map((o: any) => o.event_id));
      }
      const open = (discEvents || []).filter((e: any) => !logged.has(e.id));
      const target = open.find((e: any) => e.id === preferredEventId) || open[0];
      if (target) {
        const { error: oErr } = await supabase.from("bdr_meeting_outcomes").insert({
          client_id: lead.client_id ?? null,
          event_id: target.id,
          lead_id: lead.id,
          rep_user_id: userId,
          meeting_kind: "discovery",
          attempt_number: target.attempt_number ?? 1,
          attendance: "attended",
          result: "won",
          next_step: "form_2",
          next_event_id: evt.id,
        } as any);
        if (oErr) console.error("[close-prep-submit] outcome insert failed", oErr.message);
        else await supabase.from("bdr_calendar_events").update({ attendance: "attended" }).eq("id", target.id);
      }
    } catch (e) { console.error("[close-prep-submit] discovery outcome error", e); }

    // 6c. Skip path: create the client's account + login (what Form 1 would have done).
    let credentials: { tempPassword?: string | null; magicLink?: string | null } | null = null;
    if (needsAccount && lead.email) {
      try {
        const provResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/provision-from-booking`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cron-secret": Deno.env.get("CRON_SECRET") || "",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            business_name: lead.business_name,
            company_name: lead.business_name,
            bdr_lead_id: lead.id,
            logo_url: (lead as any).logo_url || null,
            website: (lead as any).website || null,
            contact_name: lead.owner_name || lead.email.split("@")[0],
            contact_email: lead.email,
            contact_phone: lead.phone || null,
            preferred_contact_method: "email",
            sms_consent: false,
            booking_source: "close_prep_skip",
          }),
        });
        const prov = await provResp.json().catch(() => ({}));
        if (!provResp.ok || !prov?.success) {
          console.error("[close-prep-submit] provisioning failed:", provResp.status, prov?.error);
        } else {
          if (prov.client_id) {
            await supabase.from("crm_deals").update({ provisioned_client_id: prov.client_id } as any).eq("id", dealId);
          }
          const linkedUserId: string | null = prov.linked_user_id || null;
          const isNewUser = prov.is_new_user === true && prov.existing_user !== true;
          if (linkedUserId && isNewUser) {
            const rand = crypto.getRandomValues(new Uint8Array(9));
            const candidate = "NL-" + btoa(String.fromCharCode(...rand)).replace(/[^A-Za-z0-9]/g, "").slice(0, 9);
            const { error: updErr } = await supabase.auth.admin.updateUserById(linkedUserId, {
              password: candidate, email_confirm: true, user_metadata: { must_change_password: true },
            });
            if (!updErr) credentials = { tempPassword: candidate };
            else console.error("[close-prep-submit] temp password failed:", updErr.message);
          } else if (linkedUserId) {
            const { data: linkData } = await supabase.auth.admin.generateLink({
              type: "magiclink", email: lead.email, options: { redirectTo: "https://newlight-app.com/auth" },
            });
            const ml = (linkData as any)?.properties?.action_link || null;
            if (ml) credentials = { magicLink: ml };
          }
        }
      } catch (e) {
        console.error("[close-prep-submit] provisioning error:", (e as Error).message);
      }
    }

    // Construct the client-facing Pay & Sign URL
    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    let originBase = "";
    try { originBase = origin ? new URL(origin).origin : ""; } catch { originBase = ""; }
    const paySignUrl = originBase ? `${originBase}/pay-sign/${envelopeToken}` : `/pay-sign/${envelopeToken}`;

    // 7. Notifications (fire-and-forget)
    const notifyTask = sendClosePrepNotifications(supabase, {
      userId,
      userEmail: userEmail || null,
      lead,
      when: start.toISOString(),
      pricing_model,
      commission_rate: commission_rate != null ? Number(commission_rate) : null,
      commission_rate_ongoing: commission_rate_ongoing != null ? Number(commission_rate_ongoing) : null,
      initial_fee: initial_fee != null ? Number(initial_fee) : null,
      recurring_fee: recurring_fee != null ? Number(recurring_fee) : null,
      closing_notes: closing_notes || null,
      paySignUrl,
      zoomJoinUrl,
      zoomStartUrl,
      credentials,
      clientEmail: lead.email || null,
      isAway,
      attendees: attendeeRows,
    }).catch((e) => console.error("[close-prep notifications] uncaught:", e));
    // deno-lint-ignore no-explicit-any
    const waitUntil = (globalThis as any)?.EdgeRuntime?.waitUntil?.bind((globalThis as any).EdgeRuntime);
    if (typeof waitUntil === "function") waitUntil(notifyTask); else void notifyTask;

    return new Response(JSON.stringify({
      ok: true,
      deal_id: dealId,
      event_id: evt.id,
      proposal_id: proposalId,
      envelope_id: envelopeId,
      envelope_share_token: envelopeToken,
      pay_sign_url: paySignUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// deno-lint-ignore no-explicit-any
async function sendClosePrepNotifications(supabase: any, args: {
  userId: string;
  userEmail: string | null;
  lead: any;
  when: string;
  pricing_model: string;
  commission_rate: number | null;
  commission_rate_ongoing: number | null;
  initial_fee: number | null;
  recurring_fee: number | null;
  closing_notes: string | null;
  paySignUrl: string;
  zoomJoinUrl?: string | null;
  zoomStartUrl?: string | null;
  credentials?: { tempPassword?: string | null; magicLink?: string | null } | null;
  clientEmail?: string | null;
  isAway?: boolean;
  attendees?: MeetingAttendee[];
}) {
  const { zoomJoinUrl = null, zoomStartUrl = null, isAway = false, attendees = [] } = args;
  const { userId, userEmail, lead, when, initial_fee, recurring_fee, commission_rate, commission_rate_ongoing, pricing_model, closing_notes, paySignUrl } = args;
  const whenLbl = fmtWhen(when);
  const who = lead.owner_name ? `${lead.owner_name} (${lead.business_name})` : lead.business_name;

  // Resolve rep info
  let repEmail = (userEmail || "").toLowerCase();
  let repName = "";
  try {
    const { data: userResp } = await supabase.auth.admin.getUserById(userId);
    const u = userResp?.user;
    if (u) {
      if (!repEmail) repEmail = (u.email || "").toLowerCase();
      repName =
        (u.user_metadata as any)?.display_name ||
        (u.user_metadata as any)?.full_name ||
        (u.user_metadata as any)?.name ||
        u.email || "";
    }
    if (!repName) {
      const { data: emp } = await supabase
        .from("employee_profiles").select("full_name").eq("user_id", userId).maybeSingle();
      if (emp?.full_name) repName = emp.full_name;
    }
  } catch (e) { console.error("[close-prep] rep lookup failed:", e); }

  const priceLine = pricing_model === "commission"
    ? `Commission — Initial ${fmtMoney(Number(initial_fee ?? 0))} + ${Number(commission_rate ?? 0)}% yr 1 / ${Number(commission_rate_ongoing ?? 0)}% ongoing of Attributable Revenue`
    : `Retainer — Initial ${fmtMoney(Number(initial_fee ?? 0))} + ${fmtMoney(Number(recurring_fee ?? 0))}/mo`;

  // Universal SMS
  await sendSms(UNIVERSAL_SMS_TO, `NewLight close prep: ${repName || "BDR"} scheduled ${who} for ${whenLbl}. ${priceLine}.`);

  // Universal email (skip if rep IS team@)
  if (repEmail !== UNIVERSAL_EMAIL_TO) {
    const subj = `Close Prep: ${who} → ${repName || "BDR"} at ${whenLbl}`;
    const text = `Close prep submitted.\n\nBDR: ${repName || "-"}\nClient: ${who}\nWhen: ${whenLbl}\nTerms: ${priceLine}\n${closing_notes ? `\nNotes: ${closing_notes}\n` : ""}`;
    const html = closePrepHtml({ heading: "Close Prep Submitted", repName, who, whenLbl, priceLine, closing_notes, lead });
    await sendEmail(UNIVERSAL_EMAIL_TO, subj, html, text);
  }

  // Rep's own proposal-prep email
  if (repEmail) {
    const subj = `Closing meeting prep — ${lead.business_name}`;
    const text = [
      `Hi ${repName || "there"},`,
      ``,
      `Your closing meeting for ${who} is set for ${whenLbl}.`,
      ``,
      `Terms you locked in:`,
      `  • ${priceLine}`,
      closing_notes ? `\nYour notes:\n${closing_notes}` : "",
      ``,
      `Contact:`,
      `  • Business: ${lead.business_name}`,
      lead.owner_name ? `  • Owner: ${lead.owner_name}` : "",
      lead.phone ? `  • Phone: ${lead.phone}` : "",
      lead.email ? `  • Email: ${lead.email}` : "",
      ``,
      zoomJoinUrl ? `Zoom join link: ${zoomJoinUrl}` : "",
      zoomStartUrl ? `Zoom host start link: ${zoomStartUrl}` : "",
      isAway ? `Away from our Zoom: no Zoom link, and the client gets no confirmation or reminders for this meeting.` : "",
      attendees.length ? `Extra attendees: ${attendees.map((a) => a.name).join(", ")}${isAway ? "" : " (emailed the confirmation)"}` : "",
      ``,
      `Send this link to the client during the closing meeting so they can pay + e-sign in one flow:`,
      paySignUrl,
      ``,
      `— NewLight`,
    ].filter(Boolean).join("\n");
    const html = closePrepHtml({ heading: `Closing meeting prep — ${lead.business_name}`, repName, who, whenLbl, priceLine, closing_notes, lead, paySignUrl, zoomJoinUrl, zoomStartUrl, away: isAway });
    await sendEmail(repEmail, subj, html, text);
  }

  // Away from our Zoom: no meeting confirmation. If the client's account was just
  // created (first meeting booked elsewhere / Form 1 skipped), still send the login.
  if (isAway) {
    if (lead.email && (args.credentials?.tempPassword || args.credentials?.magicLink)) {
      try {
        const signer = repName || "The NewLight Team";
        const creds = args.credentials!;
        const text = [
          `Hi ${lead.owner_name || "there"},`,
          ``,
          creds.tempPassword
            ? `Your NewLight workspace is ready.\nLogin: https://newlight-app.com/auth\nEmail: ${lead.email}\nTemporary password: ${creds.tempPassword}\n(You'll be asked to change it on first login.)`
            : `Your NewLight workspace is ready. Sign in (link expires shortly): ${creds.magicLink}`,
          ``,
          `— ${signer}`,
          repEmail ? `Email: ${repEmail}` : "",
        ].filter(Boolean).join("\n");
        const html = workspaceReadyHtml({ ownerName: lead.owner_name || null, signer, repEmail: repEmail || null, credentials: creds, clientEmail: lead.email });
        await sendEmail(lead.email, "Your NewLight workspace is ready", html, text);
      } catch (e) {
        console.error("[close-prep] workspace email failed:", e);
      }
    }
    return;
  }

  // Extra attendees — same confirmation + Zoom link (texts only after they opt in).
  for (const a of attendees) {
    if (!a.email) continue;
    try {
      const { html, text } = attendeeEmail({
        attendee: a,
        line: `Your NewLight Closing meeting with ${lead.business_name} is confirmed for ${whenLbl} (Pacific Time).`,
        zoom: zoomJoinUrl,
      });
      await sendEmail(a.email, `Your meeting is confirmed — ${whenLbl}`, html, text);
    } catch (e) {
      console.error("[close-prep] attendee email failed:", e);
    }
  }

  // Direct client-facing email — meeting confirmation ONLY (no pricing/payment/signing content)
  if (lead.email) {
    try {
      const subj = `Your meeting is confirmed — ${whenLbl}`;
      const signer = repName || "The NewLight Team";
      const text = [
        `Hi ${lead.owner_name || "there"},`,
        ``,
        `Your meeting is confirmed for ${whenLbl} (Pacific Time).`,
        ``,
        zoomJoinUrl ? `Join on Zoom: ${zoomJoinUrl}\n` : "",
        `Looking forward to speaking with you. If you need to change the time, just reply to this email.`,
        args.credentials?.tempPassword
          ? `\nYour NewLight workspace is ready.\nLogin: https://newlight-app.com/auth\nEmail: ${lead.email}\nTemporary password: ${args.credentials.tempPassword}\n(You'll be asked to change it on first login.)\n`
          : args.credentials?.magicLink
            ? `\nYour NewLight workspace is ready. Sign in (link expires shortly): ${args.credentials.magicLink}\n`
            : "",
        ``,
        `— ${signer}`,
        repEmail ? `Email: ${repEmail}` : "",
      ].filter(Boolean).join("\n");
      const creds = args.credentials || null;
      const html = clientMeetingConfirmHtml({
        ownerName: lead.owner_name || null,
        whenLbl,
        signer,
        repEmail: repEmail || null,
        zoomJoinUrl,
        credentials: creds,
        clientEmail: lead.email,
      });
      console.log(`[close-prep client email] to=${lead.email} subject="${subj}" when="${whenLbl}"`);
      await sendEmail(lead.email, subj, html, text);
    } catch (e) {
      console.error("[close-prep] client email failed:", e);
    }
  }
}

function workspaceReadyHtml(args: {
  ownerName: string | null;
  signer: string;
  repEmail: string | null;
  credentials: { tempPassword?: string | null; magicLink?: string | null };
  clientEmail: string;
}): string {
  const { ownerName, signer, repEmail, credentials, clientEmail } = args;
  const inner = credentials.tempPassword
    ? `<p style="margin:0 0 4px;font-size:14px;"><strong>Email:</strong> ${esc(clientEmail)}</p>
       <p style="margin:0 0 12px;font-size:14px;"><strong>Temporary password:</strong> <code>${esc(credentials.tempPassword)}</code></p>
       <a href="https://newlight-app.com/auth" style="display:inline-block;background:#0EA5E9;color:#fff;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none;">Log in to NewLight</a>
       <p style="margin:10px 0 0;font-size:12px;color:#64748B;">You'll be asked to change your password on first login.</p>`
    : `<a href="${esc(credentials.magicLink || "")}" style="display:inline-block;background:#0EA5E9;color:#fff;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none;">Sign in to NewLight</a>
       <p style="margin:10px 0 0;font-size:12px;color:#64748B;">This sign-in link expires shortly.</p>`;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">Your NewLight workspace is ready</h1>
    <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">Hi ${esc(ownerName || "there")},</p>
    <div style="margin:20px 0;padding:16px;background:#F1F5F9;border-radius:10px;border:1px solid #E2E8F0;">${inner}</div>
    <p style="font-size:14px;line-height:1.6;margin:20px 0 0;">— ${esc(signer)}${repEmail ? `<br><span style="color:#6b7280;font-size:13px;">${esc(repEmail)}</span>` : ""}</p>
  </div>
</body></html>`;
}

function clientMeetingConfirmHtml(args: {
  ownerName: string | null;
  whenLbl: string;
  signer: string;
  repEmail: string | null;
  zoomJoinUrl?: string | null;
  credentials?: { tempPassword?: string | null; magicLink?: string | null } | null;
  clientEmail?: string | null;
}): string {
  const { ownerName, whenLbl, signer, repEmail, zoomJoinUrl, credentials, clientEmail } = args;
  const credsHtml = credentials?.tempPassword
    ? `<div style="margin:20px 0;padding:16px;background:#F1F5F9;border-radius:10px;border:1px solid #E2E8F0;">
         <p style="margin:0 0 8px;font-size:14px;font-weight:700;">Your NewLight workspace is ready</p>
         <p style="margin:0 0 4px;font-size:14px;"><strong>Email:</strong> ${esc(clientEmail || "")}</p>
         <p style="margin:0 0 12px;font-size:14px;"><strong>Temporary password:</strong> <code>${esc(credentials.tempPassword)}</code></p>
         <a href="https://newlight-app.com/auth" style="display:inline-block;background:#0EA5E9;color:#fff;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none;">Log in to NewLight</a>
         <p style="margin:10px 0 0;font-size:12px;color:#64748B;">You'll be asked to change your password on first login.</p>
       </div>`
    : credentials?.magicLink
      ? `<div style="margin:20px 0;padding:16px;background:#F1F5F9;border-radius:10px;border:1px solid #E2E8F0;">
           <p style="margin:0 0 10px;font-size:14px;font-weight:700;">Your NewLight workspace is ready</p>
           <a href="${esc(credentials.magicLink)}" style="display:inline-block;background:#0EA5E9;color:#fff;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;text-decoration:none;">Sign in to NewLight</a>
           <p style="margin:10px 0 0;font-size:12px;color:#64748B;">This sign-in link expires shortly.</p>
         </div>`
      : "";
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">Your meeting is confirmed</h1>
    <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">Hi ${esc(ownerName || "there")},</p>
    <div style="padding:14px 16px;background:#f9fafb;border-radius:8px;font-size:15px;color:#111827;margin:0 0 20px;"><strong>${esc(whenLbl)}</strong> <span style="color:#6b7280;font-size:13px;">(Pacific Time)</span></div>
    ${zoomJoinUrl ? `<p style="font-size:14px;line-height:1.6;margin:0 0 16px;">Join on Zoom: <a href="${esc(zoomJoinUrl)}">${esc(zoomJoinUrl)}</a></p>` : ""}
    <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">Looking forward to speaking with you. If you need to change the time, just reply to this email.</p>
    ${credsHtml}
    <p style="font-size:14px;line-height:1.6;margin:20px 0 0;">— ${esc(signer)}${repEmail ? `<br><span style="color:#6b7280;font-size:13px;">${esc(repEmail)}</span>` : ""}</p>
  </div>
</body></html>`;
}


function closePrepHtml(args: {
  heading: string;
  repName: string;
  who: string;
  whenLbl: string;
  priceLine: string;
  closing_notes: string | null;
  lead: any;
  paySignUrl?: string;
  zoomJoinUrl?: string | null;
  zoomStartUrl?: string | null;
  away?: boolean;
}): string {
  const { heading, repName, who, whenLbl, priceLine, closing_notes, lead, paySignUrl, zoomJoinUrl, zoomStartUrl } = args;
  const rows: string[] = [
    `<tr><td style="padding:6px 0;color:#6b7280;width:130px;">BDR</td><td style="padding:6px 0;"><strong>${repName || "-"}</strong></td></tr>`,
    `<tr><td style="padding:6px 0;color:#6b7280;">Client</td><td style="padding:6px 0;"><strong>${who}</strong></td></tr>`,
    `<tr><td style="padding:6px 0;color:#6b7280;">Closing meeting</td><td style="padding:6px 0;"><strong>${whenLbl}</strong></td></tr>`,
    `<tr><td style="padding:6px 0;color:#6b7280;">Terms</td><td style="padding:6px 0;"><strong>${priceLine}</strong></td></tr>`,
  ];
  if (lead.phone) rows.push(`<tr><td style="padding:6px 0;color:#6b7280;">Phone</td><td style="padding:6px 0;">${lead.phone}</td></tr>`);
  if (lead.email) rows.push(`<tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;">${lead.email}</td></tr>`);
  if (zoomJoinUrl) rows.push(`<tr><td style="padding:6px 0;color:#6b7280;">Zoom join</td><td style="padding:6px 0;"><a href="${zoomJoinUrl}">${zoomJoinUrl}</a></td></tr>`);
  if (args.away) rows.push(`<tr><td style="padding:6px 0;color:#6b7280;">Meeting</td><td style="padding:6px 0;"><strong>Away from our Zoom</strong> — no link; the client gets no confirmation or reminders.</td></tr>`);
  if (zoomStartUrl) rows.push(`<tr><td style="padding:6px 0;color:#6b7280;">Zoom host start</td><td style="padding:6px 0;"><a href="${zoomStartUrl}">Start meeting as host</a></td></tr>`);
  const notesBlock = closing_notes
    ? `<div style="margin-top:16px;padding:12px 14px;background:#f9fafb;border-radius:8px;font-size:13px;color:#374151;white-space:pre-wrap;">${closing_notes.replace(/</g, "&lt;")}</div>`
    : "";
  const paySignBlock = paySignUrl
    ? `<div style="margin-top:20px;padding:14px 16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;font-size:13px;color:#065f46;"><strong>Pay &amp; Sign link (send to client):</strong><br><a href="${paySignUrl}" style="color:#065f46;word-break:break-all;">${paySignUrl}</a></div>`
    : "";
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">${heading}</h1>
    <table style="width:100%;font-size:14px;line-height:1.6;border-collapse:collapse;margin:0 0 8px;">${rows.join("")}</table>
    ${notesBlock}
    ${paySignBlock}
    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:24px 0 0;">Bring this to your closing meeting.</p>
  </div>
</body></html>`;
}

