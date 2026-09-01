// Public edge function that resolves a Pay & Sign envelope by share_token
// and (on demand) creates an invoice + Stripe checkout session for the linked deal.
// No JWT required — the share_token itself is the capability.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";
import { notifyPaidSignedIfTransition } from "../_shared/paid-signed-notify.ts";
import { sendPaymentConfirmation, sendWelcomeDocument } from "../_shared/pay-sign-notify.ts";
import { getStripe, ensureStripeCustomer } from "../_shared/stripe-billing.ts";
import { ensureServicePocCalendar, listServicePocs } from "../_shared/service-poc-calendar.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const method = req.method;

  let body: any = {};
  if (method === "POST") {
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  }
  const share_token = body.share_token || url.searchParams.get("token");
  const action = body.action || "context";

  if (!share_token || typeof share_token !== "string") {
    return json({ error: "share_token is required" }, 400);
  }

  // Look up the envelope
  const { data: envelope, error: envErr } = await supabase
    .from("document_envelopes")
    .select("id, client_id, envelope_type, title, status, related_type, related_id, viewed_at, recipient_name, recipient_email")
    .eq("share_token", share_token)
    .maybeSingle();
  if (envErr) return json({ error: envErr.message }, 500);
  if (!envelope) return json({ error: "Envelope not found" }, 404);

  // Resolve linked deal + client + invoice
  let deal: any = null;
  let invoice: any = null;
  let client: any = null;

  if (envelope.related_type === "crm_deal" && envelope.related_id) {
    const { data: d } = await supabase
      .from("crm_deals")
      .select("id, client_id, deal_name, initial_fee, pricing_model, recurring_fee, commission_rate, payment_invoice_id, pay_sign_status, contact_id, proposal_id_current, assigned_user, onboarding_meeting_id")
      .eq("id", envelope.related_id)
      .maybeSingle();
    deal = d;
    if (deal?.payment_invoice_id) {
      const { data: inv } = await supabase
        .from("invoices")
        .select("id, invoice_number, total_amount, invoice_status, payment_link_url, paid_at, stripe_checkout_session_id")
        .eq("id", deal.payment_invoice_id)
        .maybeSingle();
      invoice = inv;
    }
  }

  if (envelope.client_id) {
    const { data: c } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", envelope.client_id)
      .maybeSingle();
    client = c;
  }

  // Resolve the assigned rep (the same rep who ran Form 2) + their calendar availability.
  async function resolveRepAndCalendar() {
    const uid = deal?.assigned_user as string | null;
    if (!uid) return { rep: null, calendar: null };
    let rep: any = null;
    const { data: ep } = await supabase
      .from("employee_profiles").select("user_id, full_name, email").eq("user_id", uid).maybeSingle();
    if (ep) rep = { id: ep.user_id, name: ep.full_name, email: ep.email };
    if (!rep) {
      const { data: wu } = await supabase
        .from("workspace_users").select("user_id, full_name, email").eq("user_id", uid).maybeSingle();
      if (wu) rep = { id: wu.user_id, name: wu.full_name, email: wu.email };
    }
    const { data: cal } = await supabase
      .from("bdr_calendars")
      .select("id, user_id, availability, timezone")
      .eq("user_id", uid)
      .maybeSingle();
    return { rep, calendar: cal || null };
  }

  if (action === "context") {
    // Also fetch items for the sign panel
    const { data: items } = await supabase
      .from("document_envelope_items")
      .select("id, document_name, document_url, display_order")
      .eq("envelope_id", envelope.id)
      .order("display_order");

    // Proposal locked in on Form 2 — surfaced so Form 3 shows the same numbers.
    let proposal: any = null;
    if (deal?.proposal_id_current) {
      const { data: p } = await supabase
        .from("proposals")
        .select("id, offer_summary, setup_fee, monthly_fee")
        .eq("id", deal.proposal_id_current)
        .maybeSingle();
      proposal = p;
    }

    const { rep, calendar } = await resolveRepAndCalendar();

    // Existing onboarding meeting, if already scheduled
    let onboarding_meeting: any = null;
    if (deal?.onboarding_meeting_id) {
      const { data: ev } = await supabase
        .from("bdr_calendar_events")
        .select("id, title, starts_at, ends_at")
        .eq("id", deal.onboarding_meeting_id)
        .maybeSingle();
      onboarding_meeting = ev;
    }

    // Mark as viewed (first hit only)
    if (!envelope.viewed_at) {
      await supabase.from("document_envelopes")
        .update({ viewed_at: new Date().toISOString(), status: envelope.status === "sent" ? "viewed" : envelope.status })
        .eq("id", envelope.id);
    }
    return json({
      envelope, deal, invoice, client, items: items || [],
      proposal, rep, rep_availability: calendar?.availability || null,
      rep_timezone: calendar?.timezone || null, onboarding_meeting,
    });
  }

  if (action === "schedule_onboarding") {
    if (!deal) return json({ error: "No deal linked to envelope" }, 400);
    const starts_at = body.starts_at;
    if (!starts_at || typeof starts_at !== "string" || isNaN(Date.parse(starts_at))) {
      return json({ error: "Valid starts_at is required" }, 400);
    }
    if (deal.onboarding_meeting_id) {
      return json({ ok: true, already_scheduled: true, event_id: deal.onboarding_meeting_id });
    }

    const { rep, calendar } = await resolveRepAndCalendar();
    if (!calendar?.id) return json({ error: "Assigned rep has no calendar configured" }, 409);

    const { data: originatingLead } = await supabase
      .from("nl_bdr_leads")
      .select("id")
      .eq("crm_deal_id", deal.id)
      .maybeSingle();

    const start = new Date(starts_at);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const { data: ev, error: evErr } = await supabase
      .from("bdr_calendar_events")
      .insert({
        calendar_id: calendar.id,
        user_id: rep?.id || calendar.user_id,
        client_id: deal.client_id,
        contact_id: deal.contact_id,
        lead_id: originatingLead?.id || null,
        title: `Onboarding: ${client?.name || deal.deal_name || "Client"}`,
        source: "onboarding_meeting",
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        metadata: { deal_id: deal.id, envelope_id: envelope.id },
      } as any)
      .select("id, starts_at, ends_at")
      .single();
    if (evErr) return json({ error: evErr.message }, 500);

    await supabase.from("crm_deals").update({ onboarding_meeting_id: ev.id }).eq("id", deal.id);

    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    let originBase = ""; try { originBase = origin ? new URL(origin).origin : ""; } catch { originBase = ""; }
    const paySignUrl = originBase ? `${originBase}/pay-sign/${share_token}` : undefined;

    const welcome = await sendWelcomeDocument(supabase, deal.id, {
      clientEmail: envelope.recipient_email,
      clientName: client?.name || null,
      repName: rep?.name || null,
      repEmail: rep?.email || null,
      onboardingMeetingStartsAt: ev.starts_at,
      paySignUrl,
    });

    return json({ ok: true, event_id: ev.id, starts_at: ev.starts_at, welcome });
  }



  // ---------------------------------------------------------------------------
  // Ongoing Service Meetings (independent of the onboarding/bdr_calendar flow)
  // ---------------------------------------------------------------------------
  if (action === "list_service_pocs") {
    try {
      const pocs = await listServicePocs(supabase);
      return json({ pocs });
    } catch (e: any) {
      return json({ error: e?.message || "Failed to list Service POCs" }, 500);
    }
  }

  if (action === "service_poc_availability") {
    const pocId = body.service_poc_user_id;
    if (!pocId || typeof pocId !== "string") return json({ error: "service_poc_user_id is required" }, 400);
    try {
      const cal = await ensureServicePocCalendar(supabase, pocId);
      const { data: availability } = await supabase
        .from("calendar_availability")
        .select("day_of_week, start_time, end_time, slot_interval_minutes, is_active, timezone")
        .eq("calendar_id", cal.id)
        .eq("is_active", true)
        .order("day_of_week");
      const { data: apptTypes } = await supabase
        .from("calendar_appointment_types")
        .select("duration_minutes")
        .eq("calendar_id", cal.id)
        .eq("is_active", true)
        .limit(1);
      return json({
        calendar_id: cal.id,
        timezone: cal.timezone || "America/Los_Angeles",
        availability: availability || [],
        default_duration_minutes: apptTypes?.[0]?.duration_minutes ?? 30,
      });
    } catch (e: any) {
      return json({ error: e?.message || "Failed to load availability" }, 500);
    }
  }

  if (action === "schedule_recurring_service_meeting") {
    if (!deal) return json({ error: "No deal linked to envelope" }, 400);
    const pocId = body.service_poc_user_id;
    const frequency = body.frequency;
    const dayOfWeek = Number(body.day_of_week);
    const time = String(body.time || "");
    const notes = typeof body.notes === "string" ? body.notes : null;

    if (!pocId || typeof pocId !== "string") return json({ error: "service_poc_user_id is required" }, 400);
    if (frequency !== "weekly" && frequency !== "biweekly") return json({ error: "frequency must be weekly or biweekly" }, 400);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return json({ error: "day_of_week must be 0-6" }, 400);
    if (!/^\d{1,2}:\d{2}$/.test(time)) return json({ error: "time must be HH:MM" }, 400);

    try {
      const cal = await ensureServicePocCalendar(supabase, pocId);
      const tz = cal.timezone || "America/Los_Angeles";

      const { data: apptTypes } = await supabase
        .from("calendar_appointment_types")
        .select("duration_minutes")
        .eq("calendar_id", cal.id)
        .eq("is_active", true)
        .limit(1);
      const durationMinutes = Number(apptTypes?.[0]?.duration_minutes ?? 30) || 30;

      // Contact details already captured earlier in the Pay & Sign flow
      let contactPhone: string | null = null;
      if (deal.contact_id) {
        const { data: contact } = await supabase
          .from("crm_contacts").select("phone").eq("id", deal.contact_id).maybeSingle();
        contactPhone = contact?.phone ?? null;
      }

      // Resolve the first occurrence in the calendar's timezone.
      const zonedOffsetMs = (d: Date) => {
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: tz, hour12: false,
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        }).formatToParts(d).reduce((acc: any, p) => { acc[p.type] = p.value; return acc; }, {});
        const asUtc = Date.UTC(
          Number(parts.year), Number(parts.month) - 1, Number(parts.day),
          Number(parts.hour) % 24, Number(parts.minute), Number(parts.second),
        );
        return asUtc - d.getTime();
      };
      const localToUtc = (y: number, m: number, d: number, h: number, mi: number) => {
        const naive = Date.UTC(y, m, d, h, mi, 0);
        let guess = new Date(naive - zonedOffsetMs(new Date(naive)));
        guess = new Date(naive - zonedOffsetMs(guess));
        return guess;
      };

      const [hh, mm] = time.split(":").map(Number);
      const now = new Date();
      const nowParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      }).formatToParts(now).reduce((acc: any, p) => { acc[p.type] = p.value; return acc; }, {});
      const todayLocal = new Date(Date.UTC(Number(nowParts.year), Number(nowParts.month) - 1, Number(nowParts.day)));
      let deltaDays = (dayOfWeek - todayLocal.getUTCDay() + 7) % 7;
      let first = localToUtc(
        todayLocal.getUTCFullYear(), todayLocal.getUTCMonth(), todayLocal.getUTCDate() + deltaDays, hh, mm,
      );
      if (first.getTime() <= now.getTime()) {
        deltaDays += 7;
        first = localToUtc(
          todayLocal.getUTCFullYear(), todayLocal.getUTCMonth(), todayLocal.getUTCDate() + deltaDays, hh, mm,
        );
      }

      const stepDays = frequency === "weekly" ? 7 : 14;
      const seriesId = crypto.randomUUID();
      const occurrences: Date[] = [];
      for (let i = 0; i < 12; i++) {
        occurrences.push(localToUtc(
          todayLocal.getUTCFullYear(), todayLocal.getUTCMonth(), todayLocal.getUTCDate() + deltaDays + i * stepDays, hh, mm,
        ));
      }
      const lastOccurrence = occurrences[occurrences.length - 1];

      const rows = occurrences.map((start) => ({
        calendar_id: cal.id,
        client_id: deal.client_id,
        assigned_user: pocId,
        title: `Service Check-in: ${client?.name || deal.deal_name || "Client"}`,
        contact_id: deal.contact_id || null,
        contact_name: envelope.recipient_name || null,
        contact_email: envelope.recipient_email || null,
        contact_phone: contactPhone,
        company_name: client?.name || deal.deal_name || null,
        notes,
        timezone: tz,
        start_time: start.toISOString(),
        end_time: new Date(start.getTime() + durationMinutes * 60 * 1000).toISOString(),
        recurrence_frequency: frequency,
        recurrence_series_id: seriesId,
        recurrence_end_date: lastOccurrence.toISOString(),
        booking_source: "pay_sign_recurring",
      }));

      const { error: insErr } = await supabase.from("calendar_events").insert(rows as any);
      if (insErr) return json({ error: insErr.message }, 500);

      return json({
        ok: true,
        series_id: seriesId,
        first_occurrence: occurrences[0].toISOString(),
        count: 12,
      });
    } catch (e: any) {
      return json({ error: e?.message || "Failed to schedule recurring meetings" }, 500);
    }
  }

  if (action === "create_payment") {
    if (!deal) return json({ error: "No deal linked to envelope" }, 400);
    const initialFee = Number(deal.initial_fee ?? 0);
    if (!(initialFee > 0)) return json({ error: "No initial fee set on the deal" }, 400);

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) return json({ error: "Stripe not configured" }, 503);

    // Create invoice row if none exists
    let invId = deal.payment_invoice_id as string | null;
    if (!invId) {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const { data: newInv, error: invErr } = await supabase
        .from("invoices")
        .insert({
          client_id: deal.client_id,
          invoice_number: invoiceNumber,
          invoice_type: "initial_fee",
          invoice_status: "pending",
          subtotal_amount: initialFee,
          tax_amount: 0,
          total_amount: initialFee,
          amount_paid: 0,
          issued_at: new Date().toISOString(),
        } as any)
        .select("id")
        .single();
      if (invErr) return json({ error: invErr.message }, 500);
      invId = newInv.id;
      await supabase.from("crm_deals").update({ payment_invoice_id: invId }).eq("id", deal.id);
    }

    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    let originBase = "";
    try { originBase = origin ? new URL(origin).origin : ""; } catch { originBase = ""; }
    const successUrl = `${originBase}/pay-sign/${share_token}?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${originBase}/pay-sign/${share_token}?payment=cancelled`;

    const stripe = await getStripe();
    if (!stripe) return json({ error: "Stripe not configured" }, 503);

    // Always create/reuse a Stripe Customer so the card can be reused later
    // (retainer subscription or monthly off-session commission charges).
    const customerId = await ensureStripeCustomer(stripe, supabase, {
      clientId: deal.client_id,
      email: envelope.recipient_email,
      name: client?.name || deal.deal_name,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `${client?.name || deal.deal_name || "NewLight"} — Initial Fee` },
          unit_amount: Math.round(initialFee * 100),
        },
        quantity: 1,
      }],
      ...(customerId ? { customer: customerId } : { customer_email: envelope.recipient_email || undefined }),
      payment_intent_data: { setup_future_usage: "off_session" },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { invoice_id: invId!, deal_id: deal.id, envelope_id: envelope.id },
    });

    await supabase.from("invoices")
      .update({ payment_link_url: session.url, stripe_checkout_session_id: session.id })
      .eq("id", invId!);

    return json({ url: session.url, session_id: session.id, invoice_id: invId });
  }

  if (action === "mark_paid") {
    // Manual mark-paid path for admin polling; verifies via session id if provided
    const session_id = body.session_id;
    if (!deal?.payment_invoice_id) return json({ error: "No invoice linked" }, 400);
    if (!session_id) return json({ error: "session_id required" }, 400);

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) return json({ error: "Stripe not configured" }, 503);

    const { Stripe } = await import("https://esm.sh/stripe@14.21.0?target=deno");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });
    const sess = await stripe.checkout.sessions.retrieve(session_id);
    if (sess.payment_status !== "paid") return json({ error: "Session not paid", payment_status: sess.payment_status }, 409);

    await supabase.from("invoices").update({
      invoice_status: "paid",
      amount_paid: (sess.amount_total ?? 0) / 100,
      paid_at: new Date().toISOString(),
      payment_method: "stripe",
    }).eq("id", deal.payment_invoice_id);

    const originHdr = req.headers.get("origin") || req.headers.get("referer") || "";
    let base = ""; try { base = originHdr ? new URL(originHdr).origin : ""; } catch { base = ""; }
    const paySignLink = base ? `${base}/pay-sign/${share_token}` : `/pay-sign/${share_token}`;

    // Payment confirmations (idempotent per invoice)
    const paymentNotify = await sendPaymentConfirmation(supabase, deal.id, {
      invoiceId: deal.payment_invoice_id,
      payerEmail: sess.customer_details?.email || envelope.recipient_email || null,
      paySignUrl: paySignLink,
    });

    // If envelope also signed, transition deal to paid_signed and notify ops; else just mark paid.
    let newStatus = "paid";
    let notify: any = null;
    if (envelope.status === "signed") {
      notify = await notifyPaidSignedIfTransition(supabase, deal.id, { paySignUrl: paySignLink, envelopeId: envelope.id });
      newStatus = "paid_signed";
    } else {
      await supabase.from("crm_deals").update({ pay_sign_status: "paid" }).eq("id", deal.id);
    }

    return json({ ok: true, invoice_status: "paid", pay_sign_status: newStatus, notify, payment_notify: paymentNotify });
  }

  return json({ error: "Unknown action" }, 400);
});
