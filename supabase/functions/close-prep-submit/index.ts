// Close Prep submission for a BDR's own lead.
// - Ensures a crm_deals row exists for the lead (creates one if none).
// - Persists pricing/closing_notes/close_prep_completed_at on the deal.
// - Creates a closing_meeting bdr_calendar_events row on the rep's own calendar.
// - Fires universal + rep-focused notifications (SMS + email).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UNIVERSAL_SMS_TO = "+18053408945";
const UNIVERSAL_EMAIL_TO = "team@newlightgen.com";
const TWILIO_FROM = "+18058940908";

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
        From: Deno.env.get("TWILIO_FROM_NUMBER") || TWILIO_FROM,
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
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims as any).email as string | undefined;

    const body = await req.json();
    const {
      lead_id,
      initial_fee,
      recurring_fee,
      commission_rate,
      pricing_model: pricing_model_in,
      retainer_kpi,
      closing_notes,
      meeting_starts_at,
      duration_minutes,
    } = body || {};

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
      .select("id, user_id, client_id, business_name, owner_name, phone, email, crm_contact_id, crm_deal_id")
      .eq("id", lead_id)
      .maybeSingle();
    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (lead.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Not your lead" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Ensure calendar
    let { data: cal } = await supabase
      .from("bdr_calendars")
      .select("id, user_id, client_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!cal) {
      const { data: created, error: calErr } = await supabase
        .from("bdr_calendars")
        .insert({
          user_id: userId,
          client_id: lead.client_id,
          name: "My Pipeline Calendar",
          booking_slug: `bdr-${userId.slice(0, 8)}`,
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
        notes: closing_notes || null,
        metadata: { business_name: lead.business_name, phone: lead.phone, email: lead.email },
      })
      .select("id")
      .single();
    if (evtErr) throw evtErr;

    // 5a. Create Proposal row (Form 2 artifact #1)
    const priceLineForDoc =
      (isCommission
        ? `Commission — Initial $${Number(initial_fee ?? 0).toLocaleString()} + ${Number(commission_rate ?? 0)}% of Attributable Revenue`
        : `Retainer — Initial $${Number(initial_fee ?? 0).toLocaleString()} + $${Number(recurring_fee ?? 0).toLocaleString()}/month`) +
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
      retainerKpi: kpi,
      closingNotes: closing_notes || null,
      agencyLegalName: agencySettings?.legal_entity_name || "NewLight Marketing, LLC",
      agencyEntityType: agencySettings?.entity_type || "a California limited liability company",
      governingState: agencySettings?.governing_state || "California",
      venueCounty: agencySettings?.venue_county || "Santa Barbara County",
      dataRetentionDays: 365,
    });
    const summaryDataUrl = `data:text/html;base64,${btoa(unescape(encodeURIComponent(summaryHtml)))}`;

    const { data: envelope, error: envErr } = await supabase
      .from("document_envelopes")
      .insert({
        client_id: lead.client_id,
        envelope_type: "service_agreement",
        title: `Service Agreement — ${lead.business_name}`,
        status: "draft",
        related_type: "crm_deal",
        related_id: dealId,
        recipient_name: lead.owner_name || null,
        recipient_email: lead.email || null,
        created_by: userId,
      } as any)
      .select("id, share_token")
      .single();
    if (envErr) throw envErr;
    const envelopeId = envelope!.id as string;
    const envelopeToken = envelope!.share_token as string;

    await supabase.from("document_envelope_items").insert([
      { envelope_id: envelopeId, document_name: "Service Agreement", document_url: summaryDataUrl, display_order: 0 },
      { envelope_id: envelopeId, document_name: "Receipt / Terms Summary", document_url: summaryDataUrl, display_order: 1 },
    ] as any);

    // 5c. Update the deal with pricing + close_prep timestamp + meeting id + envelope/pay-sign linkage
    const dealPatch: Record<string, unknown> = {
      initial_fee: initial_fee != null ? Number(initial_fee) : null,
      pricing_model,
      recurring_fee: isCommission ? null : (recurring_fee != null ? Number(recurring_fee) : null),
      commission_rate: isCommission ? Number(commission_rate ?? 0) : null,
      retainer_kpi: kpi,
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
      initial_fee: initial_fee != null ? Number(initial_fee) : null,
      recurring_fee: recurring_fee != null ? Number(recurring_fee) : null,
      closing_notes: closing_notes || null,
      paySignUrl,
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
  initial_fee: number | null;
  recurring_fee: number | null;
  closing_notes: string | null;
  paySignUrl: string;
}) {
  const { userId, userEmail, lead, when, initial_fee, recurring_fee, commission_rate, pricing_model, closing_notes, paySignUrl } = args;
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
    ? `Commission — Initial $${(initial_fee ?? 0).toLocaleString()} + ${Number(commission_rate ?? 0)}% of Attributable Revenue`
    : `Retainer — Initial $${(initial_fee ?? 0).toLocaleString()} + $${(recurring_fee ?? 0).toLocaleString()}/mo`;

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
      `Send this link to the client during the closing meeting so they can pay + e-sign in one flow:`,
      paySignUrl,
      ``,
      `— NewLight`,
    ].filter(Boolean).join("\n");
    const html = closePrepHtml({ heading: `Closing meeting prep — ${lead.business_name}`, repName, who, whenLbl, priceLine, closing_notes, lead, paySignUrl });
    await sendEmail(repEmail, subj, html, text);
  }
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
}): string {
  const { heading, repName, who, whenLbl, priceLine, closing_notes, lead, paySignUrl } = args;
  const rows: string[] = [
    `<tr><td style="padding:6px 0;color:#6b7280;width:130px;">BDR</td><td style="padding:6px 0;"><strong>${repName || "-"}</strong></td></tr>`,
    `<tr><td style="padding:6px 0;color:#6b7280;">Client</td><td style="padding:6px 0;"><strong>${who}</strong></td></tr>`,
    `<tr><td style="padding:6px 0;color:#6b7280;">Closing meeting</td><td style="padding:6px 0;"><strong>${whenLbl}</strong></td></tr>`,
    `<tr><td style="padding:6px 0;color:#6b7280;">Terms</td><td style="padding:6px 0;"><strong>${priceLine}</strong></td></tr>`,
  ];
  if (lead.phone) rows.push(`<tr><td style="padding:6px 0;color:#6b7280;">Phone</td><td style="padding:6px 0;">${lead.phone}</td></tr>`);
  if (lead.email) rows.push(`<tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;">${lead.email}</td></tr>`);
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

function esc(s: string): string {
  return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function buildServiceAgreementHtml(args: {
  businessName: string;
  priceLine: string;
  initialFee: number;
  recurringFee: number | null;
  pricingModel: "retainer" | "commission";
  commissionRate: number | null;
  retainerKpi?: string | null;
  closingNotes: string | null;
  agencyLegalName: string;
  agencyEntityType: string;
  governingState: string;
  venueCounty: string;
  dataRetentionDays: number;
}): string {
  const {
    businessName, priceLine, initialFee, recurringFee, pricingModel, commissionRate, retainerKpi, closingNotes,
    agencyLegalName, agencyEntityType, governingState, venueCounty, dataRetentionDays,
  } = args;
  const bn = esc(businessName);
  const agency = esc(agencyLegalName);
  const entityType = esc(agencyEntityType);
  const govState = esc(governingState);
  const venue = esc(venueCounty);
  const initFmt = `$${(initialFee || 0).toLocaleString()}`;
  const isCommissionDeal = pricingModel === "commission";
  const retainerBlock = `<p>Beginning upon Recoupment or ninety (90) days after the Initial Fee payment, whichever is earlier, subject to Section 3, Client will pay Agency a recurring retainer of <strong>$${(recurringFee ?? 0).toLocaleString()} per month</strong> (the "Recurring Fee"), invoiced in advance, due on the same calendar day each month. The Recurring Fee is a fixed dollar amount and does not vary with Client's revenue, assets under management, number of clients, or investment performance.${retainerKpi ? ` This retainer is evaluated against the following performance target: ${esc(retainerKpi)}.` : ""}</p>`;
  const commissionBlock = `<p>Beginning upon execution of this Agreement, Agency will invoice Client monthly in arrears an amount equal to <strong>${commissionRate ?? 0}% of Attributable Revenue</strong> recognized by Client during that month (the "Commission"), as determined from the System of Record. This is a results-based compensation arrangement: the Commission is calculated solely on Attributable Revenue that Agency's own Services are shown to have generated for Client, as defined in Section 1, and is expressly NOT calculated on Client's overall advisory fee revenue, assets under management, or any revenue not attributable to the Services. If Attributable Revenue in a given month is zero, no Commission is due for that month.${retainerKpi ? ` This arrangement is evaluated against the following performance target: ${esc(retainerKpi)}.` : ""}</p>`;
  const recurringBlock = isCommissionDeal ? commissionBlock : retainerBlock;
  const sectionFourHeading = isCommissionDeal ? "4. Commission" : "4. Recurring Fee";
  const compensationDisclosure = isCommissionDeal
    ? `The compensation to be disclosed under this arrangement is the Initial Fee described in Section 3, and the Commission described in Section 4, which is calculated as a percentage of Attributable Revenue that Agency's own Services generate for Client. Because this compensation is results-based, Client acknowledges this creates a conflict of interest requiring specific disclosure to prospective clients under Rule 206(4)-1(b)(1)(iii), given Agency's financial incentive tied to the volume and value of business referred.`
    : `The compensation to be disclosed under this arrangement is the Initial Fee and the Recurring Fee described in Sections 3 and 4.`;
  const notesBlock = closingNotes
    ? `<div class="notes"><h3>Deal-Specific Notes</h3><p>${esc(closingNotes).replace(/\n/g,"<br>")}</p></div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Service Agreement — ${bn}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color:#1a1a1a; background:#ffffff; margin:0; padding:0; line-height:1.6; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 32px 40px 64px; }
  .draft-banner { background:#fff4e5; border:2px solid #d97706; color:#7c2d12; padding:14px 18px; border-radius:8px; font-family:Arial,sans-serif; font-size:13px; font-weight:700; text-align:center; letter-spacing:0.5px; margin-bottom:28px; }
  h1 { font-size: 26px; margin: 0 0 4px; letter-spacing:0.3px; }
  .subtitle { font-size: 13px; color:#555; margin: 0 0 24px; font-family:Arial,sans-serif; }
  h2 { font-size: 17px; margin: 28px 0 8px; border-bottom:1px solid #e5e7eb; padding-bottom:6px; color:#111; }
  h3 { font-size: 14px; margin: 18px 0 6px; color:#111; font-family:Arial,sans-serif; }
  p, li { font-size: 14px; }
  ul, ol { padding-left: 22px; }
  dl { margin: 8px 0; }
  dt { font-size: 14px; font-weight: 700; margin-top: 10px; }
  dd { font-size: 14px; margin: 2px 0 0 18px; }
  .terms { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px 20px; margin: 16px 0 8px; font-family:Arial,sans-serif; font-size:14px; }
  .terms strong { color:#111; }
  .notes { background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:14px 18px; margin: 16px 0; font-family:Arial,sans-serif; font-size:13px; }
  .fine { font-size: 12px; color:#6b7280; font-family:Arial,sans-serif; margin-top: 32px; }
</style></head><body><div class="wrap">
  <div class="draft-banner">⚠ DRAFT — PENDING ATTORNEY REVIEW · NOT FINAL LEGAL LANGUAGE</div>

  <h1>Master Services Agreement</h1>
  <p class="subtitle">Between ${agency} ("Agency"), ${entityType}, and ${bn} ("Client")</p>

  <div class="terms">
    <strong>Commercial Terms:</strong> ${esc(priceLine)}<br>
    <strong>Initial Fee at signing:</strong> ${initFmt}
  </div>

  ${notesBlock}

  <h2>1. Definitions</h2>
  <dl>
    <dt>"Attributable Revenue"</dt>
    <dd>means gross revenue recognized by Client from a new client account first sourced through the Services, as recorded in the System of Record, applying last-touch attribution, over the Guarantee Period. Attributable Revenue excludes (a) revenue from pre-existing relationships, (b) revenue Client would have generated anyway absent the Services, and (c) refunded, charged-back, or cancelled amounts.</dd>
    <dt>"Guarantee Period"</dt>
    <dd>means the period of ninety (90) days from the date the Initial Fee is received by Agency.</dd>
    <dt>"Recoupment"</dt>
    <dd>means cumulative Attributable Revenue greater than or equal to the Initial Fee.</dd>
    <dt>"Recurring Fee"</dt>
    <dd>means the fixed monthly amount stated in Section 4. The Recurring Fee is expressly <strong>not</strong> calculated as a percentage of Client's revenue, assets under management, or investment performance.</dd>
    <dt>"KPI Target"</dt>
    <dd>means the internal accountability benchmark described in Section 4, if stated. The KPI Target is a performance benchmark only and is not a fee formula.</dd>
    <dt>"System of Record"</dt>
    <dd>means Client's designated CRM instance and/or ad-platform reporting, as maintained and made accessible by Client.</dd>
  </dl>

  <h2>2. No Guarantee of Specific Results</h2>
  <p>Client acknowledges that Agency cannot and does not guarantee any specific number of leads, new clients, assets under management, revenue, or investment performance. Results depend on factors outside Agency's control, including market conditions, competition, Client's product and pricing, seasonality, and third-party platform behavior. This Agreement is a commitment of Agency's efforts and service duration, not a promise of any particular outcome. Nothing in this Agreement or in any Service constitutes advice regarding, or any claim about, the investment returns or performance of Client's own advisory services or Client's clients' accounts.</p>

  <h2>3. Performance Guarantee</h2>
  <p><strong>3.1 Initial Fee.</strong> Client will pay Agency the Initial Fee stated above upon execution of this Agreement. The Initial Fee is non-refundable and is fully earned upon Recoupment. The mechanism in this Section 3 is a "Performance Guarantee" of continued service, and is not a money-back guarantee, satisfaction guarantee, or free-trial offer within the meaning of 16 CFR 239.3; the Initial Fee is not refundable under any circumstance in this Agreement.</p>
  <p><strong>3.2 Recoupment.</strong> If, at the end of the Guarantee Period, Attributable Revenue is less than the Initial Fee, Agency will continue to provide services at no additional charge until Recoupment occurs or until one hundred fifty (150) days total from receipt of the Initial Fee (the ninety (90) day Guarantee Period plus a sixty (60) day extension), whichever occurs first, subject to the Client Cooperation Conditions in Section 3.4. After that combined period, either party may terminate this Agreement with no further obligation to the other, and Agency will owe no further service and no payment.</p>
  <p><strong>3.3 SOLE AND EXCLUSIVE REMEDY; NO REFUND.</strong> The continued-service remedy in Section 3.2 is Client's <strong>SOLE AND EXCLUSIVE REMEDY</strong> for any failure to achieve Attributable Revenue equal to or greater than the Initial Fee. Under no circumstance — including where Agency ultimately generates Attributable Revenue in excess of the Initial Fee — will Client be entitled to any cash refund, credit, rebate, or bonus payment of any kind. The Initial Fee is fully earned upon receipt.</p>
  <p><strong>3.4 Client Cooperation Conditions.</strong> Client's rights under Sections 3.2–3.3 are conditioned on Client, throughout the Guarantee Period and any extension:</p>
  <ul>
    <li>maintaining active, uninterrupted access for Agency to all analytics, CRM, ad accounts, and reporting systems used as the System of Record;</li>
    <li>maintaining agreed paid-media spend at or above the minimum specified at kickoff;</li>
    <li>responding to Agency approval requests and creative reviews within three (3) business days;</li>
    <li>not materially altering pricing, offer, landing pages, website, or intake process without prior consultation with Agency; and</li>
    <li>promptly notifying Agency of any operational, inventory, staffing, or fulfillment issue that affects conversion.</li>
  </ul>
  <p>Repeated or material breach of these conditions terminates the guarantee remedy.</p>
  <p><strong>3.5 Client-Caused Exclusions.</strong> Without limiting the foregoing, the guarantee remedy in Sections 3.2–3.3 is tolled for the duration of, and voided by material or repeated occurrence of, any of the following:</p>
  <ul>
    <li>(a) Client changes to pricing, product, offer, website, or landing pages that materially reduce conversion, made without prior consultation with Agency;</li>
    <li>(b) Client's failure to follow up on leads delivered by Agency within a commercially reasonable time;</li>
    <li>(c) Client reducing paid-media spend below the agreed minimum specified at kickoff;</li>
    <li>(d) Client rejecting Agency's material recommendations without offering a reasonable alternative;</li>
    <li>(e) Client's own legal, licensing, regulatory, or compliance issues that prevent Agency from executing agreed campaigns; and</li>
    <li>(f) Client-supplied assets, claims, testimonials, or representations that violate platform policy or applicable law.</li>
  </ul>
  <p><strong>3.6 Tolling.</strong> If tracking, analytics, or ad-account access is revoked, suspended, or degraded, the Guarantee Period is automatically tolled (paused) until access is restored.</p>

  <h2>${sectionFourHeading}</h2>
  ${recurringBlock}
  <p>Invoices are due upon receipt. Amounts more than ten (10) days past due accrue interest at 1.5% per month or the maximum rate permitted by law, whichever is lower. Agency may suspend services for any invoice more than fifteen (15) days past due.</p>

  <h2>5. Promoter Status and Marketing Rule Compliance</h2>
  <p><strong>5.1 Promoter Acknowledgment.</strong> Client acknowledges that Agency may act as a "promoter" of Client within the meaning of Rule 206(4)-1(e)(5) under the Investment Advisers Act of 1940, and that outreach performed under this Agreement may constitute an "endorsement" and an "Advertisement" under Rule 206(4)-1.</p>
  <p><strong>5.2 Client Responsibilities.</strong> Client is solely responsible for: (a) ensuring that all Advertisements comply with Rule 206(4)-1; (b) making all required disclosures at the time of dissemination, including that Agency is not a client of Client, that Agency is compensated, and a brief statement of any material conflicts of interest; (c) making all required Form ADV disclosures of the promoter arrangement; and (d) confirming that Agency is not an "ineligible person" under Rule 206(4)-1.</p>
  <p><strong>5.3 Agency Cooperation.</strong> Agency will cooperate by providing information reasonably needed for Client's disclosures, will not disseminate content that Client has not approved under Section 7, represents that it is not subject to a disqualifying event described in Rule 206(4)-1(e)(1)(i)–(ii), and will promptly notify Client if that representation changes.</p>
  <p><strong>5.4 Compensation Disclosure.</strong> ${compensationDisclosure}</p>

  <h2>6. FINRA Communications Rider</h2>
  <p>This Section 6 applies only to the extent Client, or any registered representative for whom Agency performs Services, is a member of, or an associated person of a member of, the Financial Industry Regulatory Authority ("FINRA"). Where applicable: (a) no retail communication under FINRA Rule 2210 will be used without the prior written approval of a registered principal of Client's member firm, in addition to the approval required under Section 7; (b) content prepared on behalf of an individual registered representative will disclose that it was prepared by or on behalf of the representative, consistent with FINRA Regulatory Notice 08-27, unless the representative reviewed and adopted it as their own; and (c) Client's member firm remains solely responsible for supervision, recordkeeping, and FINRA filing obligations, and Agency will reasonably cooperate by providing content and distribution records on request.</p>

  <h2>7. Client Cooperation and Content Approval</h2>
  <p><strong>7.1 Prior Approval.</strong> No outreach, script, or advertisement will be disseminated on Client's behalf or in Client's name without the prior written (including email) approval of Client's compliance function or other designated approver, and Agency will not materially deviate from approved content without new approval.</p>
  <p><strong>7.2 Access and Contacts.</strong> Client will provide the access and cooperation described in Section 3.4 and will designate a compliance contact and a business contact.</p>
  <p><strong>7.3 Excused Delay.</strong> Agency is not in breach to the extent performance is delayed by Client's failure to provide access, approvals, or cooperation under this Section.</p>

  <h2>8. Client Data, Confidentiality, and Security</h2>
  <p><strong>8.1 Client Data Ownership.</strong> As between the parties, Client owns all Client-provided data, customer lists, brand assets, and campaign performance data generated on Client's accounts ("Client Data").</p>
  <p><strong>8.2 Safeguards.</strong> Agency will maintain reasonable administrative, technical, and physical safeguards designed to protect Client Data against unauthorized access, use, or disclosure.</p>
  <p><strong>8.3 Breach Notification.</strong> Agency will notify Client within seventy-two (72) hours of Agency becoming aware of any actual unauthorized access to or acquisition of Client Data, and will reasonably cooperate with Client's own notification obligations, including under Regulation S-P (17 CFR 248.30).</p>
  <p><strong>8.4 Data Minimization.</strong> Agency retains Client Data only as long as reasonably necessary to perform the Services and satisfy the purposes described in this Agreement, and not indefinitely.</p>
  <p><strong>8.5 Return and Destruction on Termination.</strong> Within thirty (30) days after termination, at Client's election, Agency will return or destroy all Client Data, except (a) copies required to be retained by law or Agency's own bona fide recordkeeping requirements, and (b) routine backup archives, which are deleted in the ordinary course, remain confidential, and are not otherwise accessed. In no event will Agency retain Client Data for any other purpose more than ${dataRetentionDays} days after termination. Agency will provide written certification of destruction on request.</p>
  <p><strong>8.6 Confidentiality.</strong> Each party will hold the other party's non-public business, financial, technical, customer, and marketing information ("Confidential Information") in confidence and use it only to perform this Agreement, with the same degree of care it uses for its own confidential information (and no less than reasonable care). Confidential Information excludes information that is or becomes public through no fault of the receiving party, was already known to the receiving party without a duty of confidentiality, or is independently developed. This obligation survives for two (2) years after termination.</p>
  <p><strong>8.7 Regulatory Examination Records.</strong> Agency will provide Client copies of records reasonably needed for a regulatory examination on request.</p>

  <h2>9. Intellectual Property</h2>
  <p>Client grants Agency a limited, non-exclusive license to use Client's name, trademarks, and brand materials solely to perform the Services. Deliverables created by Agency for Client and paid for in full are owned by Client upon payment. Agency retains all right, title, and interest in its own pre-existing tools, methodologies, templates, and know-how.</p>

  <h2>10. Limitation of Liability</h2>
  <p><strong>10.1 Cap.</strong> Except as provided in Section 10.2, the total aggregate liability of either party arising out of or related to this Agreement, whether in contract, tort, or otherwise, will not exceed the total fees actually paid by Client to Agency in the three (3) months immediately preceding the event giving rise to the claim.</p>
  <p><strong>10.2 Guarantee Remedy Excluded.</strong> The recoupment remedy in Section 3.2 is governed exclusively by Sections 3.1–3.6 and is not subject to the cap in Section 10.1, nor does it entitle Client to any monetary damages beyond continued free service as expressly stated.</p>
  <p><strong>10.3 Exclusion of Indirect Damages.</strong> Neither party will be liable for lost profits, lost revenue, lost data, or any indirect, incidental, consequential, special, or punitive damages, even if advised of the possibility.</p>
  <p><strong>10.4 Carve-Out.</strong> Nothing in this Agreement limits or excludes either party's liability for fraud, fraudulent misrepresentation, willful misconduct, or gross negligence. Such liability is expressly <strong>NOT</strong> subject to the cap in Section 10.1. This Section does not limit either party's indemnification obligations, breach of Section 8 (Client Data, Confidentiality, and Security), or liability for fraud or willful misconduct, none of which are subject to the cap in this Section.</p>

  <h2>11. Insurance</h2>
  <p>During the term of this Agreement, Agency will maintain commercial general liability insurance, professional liability/errors and omissions insurance (including media liability coverage) with limits of at least $1,000,000 per claim and in the aggregate, and cyber liability insurance with limits of at least $1,000,000 per claim, and will provide a certificate of insurance and name Client as an additional insured on request, to the extent commercially available on commercially reasonable terms.</p>

  <h2>12. Term &amp; Termination</h2>
  <p><strong>12.1 Term.</strong> This Agreement begins on the Effective Date (the date of Client's signature and receipt of the Initial Fee) and continues on a month-to-month basis thereafter.</p>
  <p><strong>12.2 Termination for Convenience.</strong> After the Guarantee Period, either party may terminate this Agreement for any reason on thirty (30) days' prior written notice.</p>
  <p><strong>12.3 Termination for Cause.</strong> Agency may terminate this Agreement immediately upon written notice for (a) non-payment of any undisputed invoice more than fifteen (15) days past due, or (b) material breach of the Client Cooperation Conditions that is not cured within seven (7) days of written notice.</p>
  <p><strong>12.4 Effect of Termination.</strong> Upon termination, Agency's obligation to continue services under Section 3.2 (including any free-service continuation) ends. No portion of the Initial Fee, and no fees paid for services already performed, are refundable. Client Data will be handled in accordance with Section 8.5. Sections 3.3, 8, 10, and 15 survive termination.</p>

  <h2>13. Force Majeure</h2>
  <p>Neither party will be liable for any delay or failure to perform (other than an obligation to pay amounts already due) caused by circumstances beyond its reasonable control, including acts of God, natural disaster, fire, flood, epidemic, war, terrorism, civil unrest, labor disruption, government action or order, changes to third-party platform policies or advertising algorithms, suspension or termination of an ad account not caused by the affected party, and failures of internet, telecommunications, hosting, or utility services. Performance is excused without penalty for the duration of the event, and the Guarantee Period is tolled accordingly per Section 3.6. The affected party will give prompt written notice, use commercially reasonable efforts to mitigate, and resume performance as soon as practicable. If the event continues for more than sixty (60) days, either party may terminate this Agreement on written notice without further liability.</p>

  <h2>14. No Suppression of Reviews</h2>
  <p>Agency will never condition guarantee performance, continued service, or any remedy under this Agreement on Client withholding, removing, retracting, or altering any public review, complaint, rating, or testimonial. This Agreement contains no non-disparagement obligation restricting Client's honest public statements about Agency, consistent with the federal Consumer Review Fairness Act (15 U.S.C. §45b).</p>

  <h2>15. General</h2>
  <p>This Agreement, together with any statement of work or order form referencing it, is the entire agreement of the parties and supersedes prior discussions on the same subject. It may be modified only in a writing signed by both parties. Neither party may assign this Agreement without the other's consent, except to a successor in a merger, acquisition, or sale of substantially all assets. If any provision is held unenforceable, the remainder remains in effect. This Agreement is governed by the laws of the State of ${govState}, without regard to conflict-of-law principles. Any dispute will be resolved in the state or federal courts located in ${venue}, ${govState}, and each party consents to that jurisdiction.</p>

  <h2>16. Regulatory Acknowledgment (General)</h2>
  <p>Client further acknowledges that Agency is a marketing services provider and does not provide investment, legal, tax, or accounting advice, and is not itself a registered investment adviser, broker-dealer, or FINRA member.</p>

  <p class="fine">By signing the accompanying envelope, Client acknowledges receipt of this Agreement, agrees to be bound by its terms, and confirms that the Initial Fee is non-refundable and that Client's sole and exclusive remedy for underperformance during the Guarantee Period is the continued-service mechanism in Section 3.2.</p>
  <p class="fine">This is a DRAFT document pending attorney review. Final executed version will be countersigned by ${agency} and retained with the signed envelope in Client's records.</p>
</div></body></html>`;
}
