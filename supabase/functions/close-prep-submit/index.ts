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
      pricing_model, // "retainer" | "commission"
      recurring_fee,
      commission_rate,
      closing_notes,
      meeting_starts_at,
      duration_minutes,
    } = body || {};

    if (!lead_id || !meeting_starts_at || !pricing_model) {
      return new Response(JSON.stringify({ error: "Missing required fields (lead_id, meeting_starts_at, pricing_model)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["retainer", "commission"].includes(pricing_model)) {
      return new Response(JSON.stringify({ error: "pricing_model must be 'retainer' or 'commission'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      pricing_model === "retainer"
        ? `Retainer — Initial $${Number(initial_fee ?? 0).toLocaleString()} + $${Number(recurring_fee ?? 0).toLocaleString()}/month`
        : `Commission — Initial $${Number(initial_fee ?? 0).toLocaleString()} + ${Number(commission_rate ?? 0)}% of revenue`;

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
        monthly_fee: pricing_model === "retainer" && recurring_fee != null ? Number(recurring_fee) : null,
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
    const summaryHtml = buildServiceAgreementHtml({
      businessName: lead.business_name,
      priceLine: priceLineForDoc,
      pricingModel: pricing_model,
      initialFee: initial_fee != null ? Number(initial_fee) : 0,
      recurringFee: recurring_fee != null ? Number(recurring_fee) : null,
      commissionRate: commission_rate != null ? Number(commission_rate) : null,
      closingNotes: closing_notes || null,
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
      recurring_fee: pricing_model === "retainer" && recurring_fee != null ? Number(recurring_fee) : null,
      commission_rate: pricing_model === "commission" && commission_rate != null ? Number(commission_rate) : null,
      closing_notes: closing_notes || null,
      close_prep_completed_at: new Date().toISOString(),
      close_prep_meeting_id: evt.id,
      proposal_id_current: proposalId,
      service_agreement_envelope_id: envelopeId,
      pay_sign_status: "pending",
    };
    await supabase.from("crm_deals").update(dealPatch as any).eq("id", dealId);

    // 6. Link back to lead + create close_prep_links row
    await supabase.from("nl_bdr_leads").update({
      crm_contact_id: contactId,
      crm_deal_id: dealId,
    }).eq("id", lead.id);

    await supabase.from("close_prep_links").insert({
      lead_id: lead.id, deal_id: dealId, user_id: userId,
    } as any);

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
      initial_fee: initial_fee != null ? Number(initial_fee) : null,
      recurring_fee: recurring_fee != null ? Number(recurring_fee) : null,
      commission_rate: commission_rate != null ? Number(commission_rate) : null,
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
  initial_fee: number | null;
  recurring_fee: number | null;
  commission_rate: number | null;
  closing_notes: string | null;
  paySignUrl: string;
}) {
  const { userId, userEmail, lead, when, pricing_model, initial_fee, recurring_fee, commission_rate, closing_notes, paySignUrl } = args;
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

  const priceLine = pricing_model === "retainer"
    ? `Retainer — Initial $${(initial_fee ?? 0).toLocaleString()} + $${(recurring_fee ?? 0).toLocaleString()}/mo`
    : `Commission — Initial $${(initial_fee ?? 0).toLocaleString()} + ${commission_rate ?? 0}% of revenue`;

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
  pricingModel: string;
  initialFee: number;
  recurringFee: number | null;
  commissionRate: number | null;
  closingNotes: string | null;
}): string {
  const { businessName, priceLine, pricingModel, initialFee, recurringFee, commissionRate, closingNotes } = args;
  const bn = esc(businessName);
  const initFmt = `$${(initialFee || 0).toLocaleString()}`;
  const recurringBlock = pricingModel === "retainer"
    ? `<p>Following recoupment of the Initial Fee (or immediately if Client opts out of the guarantee mechanism in writing), Client will pay Agency a recurring retainer of <strong>$${(recurringFee ?? 0).toLocaleString()} per month</strong>, invoiced in advance, due on the same calendar day each month.</p>`
    : `<p>Following recoupment of the Initial Fee (or immediately if Client opts out of the guarantee mechanism in writing), Client will pay Agency a performance commission equal to <strong>${commissionRate ?? 0}% of Attributable Revenue</strong>, invoiced monthly in arrears based on the agreed system of record.</p>`;
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
  .terms { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:16px 20px; margin: 16px 0 8px; font-family:Arial,sans-serif; font-size:14px; }
  .terms strong { color:#111; }
  .notes { background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:14px 18px; margin: 16px 0; font-family:Arial,sans-serif; font-size:13px; }
  .fine { font-size: 12px; color:#6b7280; font-family:Arial,sans-serif; margin-top: 32px; }
</style></head><body><div class="wrap">
  <div class="draft-banner">⚠ DRAFT — PENDING ATTORNEY REVIEW · NOT FINAL LEGAL LANGUAGE</div>

  <h1>Master Services Agreement</h1>
  <p class="subtitle">Between NewLight Generation ("Agency") and ${bn} ("Client")</p>

  <div class="terms">
    <strong>Commercial Terms:</strong> ${esc(priceLine)}<br>
    <strong>Initial Fee at signing:</strong> ${initFmt}
  </div>

  ${notesBlock}

  <h2>1. Performance Guarantee</h2>
  <p><strong>1.1 Initial Fee.</strong> Client will pay Agency the Initial Fee stated above upon execution of this Agreement. The Initial Fee is non-refundable and compensates Agency for onboarding, strategy, creative production, technical setup, and the first campaign cycle.</p>
  <p><strong>1.2 Guarantee Period.</strong> Agency will use commercially reasonable efforts, over a period of ninety (90) days from the date the Initial Fee is received (the "Guarantee Period"), to generate Attributable Revenue for Client at least equal to the Initial Fee.</p>
  <p><strong>1.3 Attributable Revenue.</strong> "Attributable Revenue" means gross revenue reasonably traceable to Agency's campaigns and creative through the agreed system of record (analytics, CRM, and/or ad-platform reporting), applying last-touch attribution, net of refunds, chargebacks, and cancellations, and <em>excluding</em> (a) organic and direct/brand-search traffic, (b) revenue from customers who transacted with Client in the twelve (12) months preceding the Effective Date, and (c) revenue from channels Agency does not manage.</p>
  <p><strong>1.4 Recoupment Remedy.</strong> If, at the end of the Guarantee Period, Attributable Revenue is less than the Initial Fee, Agency will continue to provide services at no additional charge until Attributable Revenue at least equals the Initial Fee, subject to the Client Cooperation Conditions in Section 1.6, for up to an additional sixty (60) days (150 days total from receipt of the Initial Fee). After that combined period, either party may terminate this Agreement with no further obligation to the other, and Agency will owe no further service and no payment.</p>
  <p><strong>1.5 Sole and Exclusive Remedy; No Refund.</strong> The continued-service remedy in Section 1.4 is Client's <strong>sole and exclusive remedy</strong> for any failure to achieve Attributable Revenue equal to or greater than the Initial Fee. Under no circumstance — including where Agency ultimately generates Attributable Revenue in excess of the Initial Fee — will Client be entitled to any cash refund, credit, rebate, or bonus payment of any kind. The Initial Fee is fully earned upon receipt.</p>
  <p><strong>1.6 Client Cooperation Conditions.</strong> Client's rights under Sections 1.2–1.4 are conditioned on Client, throughout the Guarantee Period and any extension:</p>
  <ul>
    <li>maintaining active, uninterrupted access for Agency to all analytics, CRM, ad accounts, and reporting systems used as the system of record;</li>
    <li>maintaining agreed paid-media spend at or above the minimum specified at kickoff;</li>
    <li>responding to Agency approval requests and creative reviews within three (3) business days;</li>
    <li>not materially altering pricing, offer, landing pages, website, or intake process without prior consultation with Agency; and</li>
    <li>promptly notifying Agency of any operational, inventory, staffing, or fulfillment issue that affects conversion.</li>
  </ul>
  <p>If tracking, analytics, or ad-account access is revoked, suspended, or degraded, the Guarantee Period is automatically tolled (paused) until access is restored. Repeated or material breach of these conditions terminates the guarantee remedy.</p>
  <p><strong>1.6.1 Client-Caused Exclusions.</strong> Without limiting the foregoing, the guarantee remedy in Sections 1.2–1.4 is tolled for the duration of, and voided by material or repeated occurrence of, any of the following:</p>
  <ul>
    <li>(a) Client changes to pricing, product, offer, website, or landing pages that materially reduce conversion, made without prior consultation with Agency;</li>
    <li>(b) Client's failure to follow up on leads delivered by Agency within a commercially reasonable time;</li>
    <li>(c) Client reducing paid-media spend below the agreed minimum specified at kickoff;</li>
    <li>(d) Client rejecting Agency's material recommendations without offering a reasonable alternative;</li>
    <li>(e) Client's own legal, licensing, regulatory, or compliance issues that prevent Agency from executing agreed campaigns; and</li>
    <li>(f) Client-supplied assets, claims, testimonials, or representations that violate platform policy or applicable law.</li>
  </ul>
  <p><strong>1.7 No Guarantee of Specific Results.</strong> Except for the recoupment mechanism expressly stated in Sections 1.2–1.5, Agency makes <strong>no guarantee</strong> of any specific ranking, traffic volume, lead volume, conversion rate, customer count, revenue amount, ROAS, or profitability. Performance in any channel depends on factors outside Agency's control including market conditions, competition, Client's product and pricing, seasonality, and third-party platform behavior.</p>

  <h2>2. Ongoing Fees</h2>
  ${recurringBlock}
  <p>Invoices are due upon receipt. Amounts more than ten (10) days past due accrue interest at 1.5% per month or the maximum rate permitted by law, whichever is lower. Agency may suspend services for any invoice more than fifteen (15) days past due.</p>

  <h2>3. Term & Termination</h2>
  <p><strong>3.1 Term.</strong> This Agreement begins on the Effective Date (the date of Client's signature and receipt of the Initial Fee) and continues on a month-to-month basis thereafter.</p>
  <p><strong>3.2 Termination for Convenience.</strong> After the Guarantee Period, either party may terminate this Agreement for any reason on thirty (30) days' prior written notice.</p>
  <p><strong>3.3 Termination for Cause.</strong> Agency may terminate this Agreement immediately upon written notice for (a) non-payment of any undisputed invoice more than fifteen (15) days past due, or (b) material breach of the Client Cooperation Conditions that is not cured within seven (7) days of written notice.</p>
  <p><strong>3.4 Effect of Termination.</strong> Upon termination, Agency's obligation to continue services under Section 1.4 (including any free-service continuation) ends. No portion of the Initial Fee, and no fees paid for services already performed, are refundable. Sections 1.5, 4, 5, and 6 survive termination.</p>

  <h2>4. Confidentiality</h2>
  <p>Each party will hold the other party's non-public business, financial, technical, customer, and marketing information ("Confidential Information") in confidence and use it only to perform this Agreement, with the same degree of care it uses for its own confidential information (and no less than reasonable care). Confidential Information excludes information that is or becomes public through no fault of the receiving party, was already known to the receiving party without a duty of confidentiality, or is independently developed. This obligation survives for two (2) years after termination.</p>
  <p><strong>4.1 Client Data Ownership.</strong> As between the parties, Client owns all Client-provided data, customer lists, brand assets, and campaign performance data generated on Client's accounts. On written request within thirty (30) days of termination, Agency will export and deliver Client's data in a commercially reasonable format and will then delete Agency's working copies (subject to backup retention and legal-hold requirements).</p>

  <h2>5. Limitation of Liability</h2>
  <p><strong>5.1 Cap.</strong> Except as provided in Section 5.2, the total aggregate liability of either party arising out of or related to this Agreement, whether in contract, tort, or otherwise, will not exceed the total fees actually paid by Client to Agency in the three (3) months immediately preceding the event giving rise to the claim.</p>
  <p><strong>5.2 Guarantee Remedy Excluded.</strong> The recoupment remedy in Section 1.4 is governed exclusively by Sections 1.2–1.6 and is not subject to the cap in Section 5.1, nor does it entitle Client to any monetary damages beyond continued free service as expressly stated.</p>
  <p><strong>5.3 Exclusion of Indirect Damages.</strong> Neither party will be liable for lost profits, lost revenue, lost data, or any indirect, incidental, consequential, special, or punitive damages, even if advised of the possibility.</p>
  <p><strong>5.4 Carve-Out.</strong> Nothing in this Agreement limits or excludes either party's liability for fraud, fraudulent misrepresentation, willful misconduct, or gross negligence. Such liability is expressly <strong>NOT</strong> subject to the cap in Section 5.1.</p>

  <h2>6. General</h2>
  <p>This Agreement, together with any statement of work or order form referencing it, is the entire agreement of the parties and supersedes prior discussions on the same subject. It may be modified only in a writing signed by both parties. Neither party may assign this Agreement without the other's consent, except to a successor in a merger, acquisition, or sale of substantially all assets. If any provision is held unenforceable, the remainder remains in effect. This Agreement is governed by the laws of the State of California, without regard to conflict-of-law principles. Any dispute will be resolved in the state or federal courts located in San Luis Obispo County, California, and each party consents to that jurisdiction.</p>

  <h2>7. Regulatory Compliance (Client Industry-Specific)</h2>
  <p>Client acknowledges that Agency is a marketing services provider, is not a registered investment adviser, broker-dealer, or FINRA member, and does not provide investment, legal, tax, or accounting advice. If Client is or is affiliated with a registered investment adviser, broker-dealer, or other entity subject to SEC, FINRA, or state securities regulation, Client — not Agency — is solely responsible for ensuring that all advertising, marketing, and communications materials produced under this Agreement comply with applicable law, including the SEC Investment Adviser Marketing Rule (17 CFR §275.206(4)-1), FINRA advertising rules, and any applicable state securities regulations, and for obtaining any required internal compliance department review and approval prior to publication or distribution.</p>
  <p>Client will indemnify, defend, and hold Agency harmless from any claim, fine, penalty, or regulatory action arising from Client's use, approval, or publication of Agency-produced materials, except to the extent caused by Agency's gross negligence or willful misconduct.</p>

  <h2>8. Force Majeure</h2>
  <p>Neither party will be liable for any delay or failure to perform (other than an obligation to pay amounts already due) caused by circumstances beyond its reasonable control, including acts of God, natural disaster, fire, flood, epidemic, war, terrorism, civil unrest, labor disruption, government action or order, changes to third-party platform policies or advertising algorithms, suspension or termination of an ad account not caused by the affected party, and failures of internet, telecommunications, hosting, or utility services. Performance is excused without penalty for the duration of the event, and any applicable Guarantee Period is tolled accordingly. The affected party will give prompt written notice, use commercially reasonable efforts to mitigate, and resume performance as soon as practicable. If the event continues for more than sixty (60) days, either party may terminate this Agreement on written notice without further liability.</p>

  <h2>9. No Suppression of Reviews</h2>
  <p>Agency will never condition guarantee performance, continued service, or any remedy under this Agreement on Client withholding, removing, retracting, or altering any public review, complaint, rating, or testimonial. This Agreement contains no non-disparagement obligation restricting Client's honest public statements about Agency, consistent with the federal Consumer Review Fairness Act (15 U.S.C. §45b).</p>

  <p class="fine">By signing the accompanying envelope, Client acknowledges receipt of this Agreement, agrees to be bound by its terms, and confirms that the Initial Fee is non-refundable and that Client's sole and exclusive remedy for underperformance during the Guarantee Period is the continued-service mechanism in Section 1.4.</p>
  <p class="fine">This is a DRAFT document pending attorney review. Final executed version will be countersigned by NewLight Generation and retained with the signed envelope in Client's records.</p>
</div></body></html>`;
}
