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
      body: JSON.stringify({ from: "NewLight <noreply@newlightgen.com>", to: [to], subject, text, html }),
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
    const summaryHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Service Agreement Summary</title></head><body style="font-family:Arial,sans-serif;padding:32px;max-width:640px;margin:0 auto;color:#111"><h1 style="font-size:22px">Service Agreement — ${lead.business_name.replace(/</g,"&lt;")}</h1><p><strong>Terms:</strong> ${priceLineForDoc}</p>${closing_notes ? `<p><strong>Notes:</strong><br>${closing_notes.replace(/</g,"&lt;").replace(/\n/g,"<br>")}</p>` : ""}<p style="margin-top:32px;font-size:12px;color:#555">By signing this envelope you agree to the terms above. A formal Service Agreement PDF will be attached by NewLight staff and countersigned.</p></body></html>`;
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
      `— NewLight`,
    ].filter(Boolean).join("\n");
    const html = closePrepHtml({ heading: `Closing meeting prep — ${lead.business_name}`, repName, who, whenLbl, priceLine, closing_notes, lead });
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
}): string {
  const { heading, repName, who, whenLbl, priceLine, closing_notes, lead } = args;
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
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">${heading}</h1>
    <table style="width:100%;font-size:14px;line-height:1.6;border-collapse:collapse;margin:0 0 8px;">${rows.join("")}</table>
    ${notesBlock}
    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:24px 0 0;">Bring this to your closing meeting.</p>
  </div>
</body></html>`;
}
