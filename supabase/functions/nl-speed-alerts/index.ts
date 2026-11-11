// Speed alerts (pg_cron every 5 minutes). Tells the salesman the moment a lead shows buying intent but stops:
//   A) Booking page: the lead entered their details on Form 1 but didn't pick a time (10+ minutes ago).
//   B) Pay & Sign: the client opened their Pay & Sign page but hasn't paid and signed (15+ minutes later).
// Each alert is sent once (nl_speed_alerts), by text (if the rep has a phone on file), email, and in-app notification.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { cronAuthorized, requireStaff, authJson } from "../_shared/auth.ts";
import { esc, repContact, sendEmail, sendSms } from "../_shared/notifySend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const MIN = 60_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const digits = (s: string) => s.replace(/\D/g, "").slice(-10);

function contactFrom(data: Record<string, unknown> | null) {
  let email = "", phone = "", name = "";
  for (const [k, v] of Object.entries(data || {})) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (!email && EMAIL_RE.test(t)) email = t.toLowerCase();
    else if (!phone && t.replace(/\D/g, "").length >= 10 && /^[\d\s()+.\-]+$/.test(t)) phone = t;
    else if (!name && /name/i.test(k) && !/business|company|firm/i.test(k)) name = t;
  }
  return { email, phone, name };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (!(await cronAuthorized(req, admin))) {
    const auth = await requireStaff(req, admin);
    if (!auth.ok) return authJson(auth, corsHeaders);
  }
  const now = Date.now();
  const sent: string[] = [];

  async function claim(kind: string, refId: string) {
    const { error } = await admin.from("nl_speed_alerts").insert({ kind, ref_id: refId });
    return !error; // unique (kind, ref_id): only the first run sends
  }
  async function alertRep(userId: string, clientId: string | null, title: string, message: string, linkedType: string, linkedId: string) {
    const rep = await repContact(admin, userId);
    if (rep.phone) await sendSms(rep.phone, `NewLight: ${title}. ${message}`);
    if (rep.email) await sendEmail(rep.email, title, `<p><b>${esc(title)}</b></p><p>${esc(message)}</p>`, `${title}\n\n${message}`);
    await admin.from("notifications").insert({
      recipient_user_id: userId, client_id: clientId, title, message, type: "speed_alert",
      linked_type: linkedType, linked_id: linkedId, is_read: false,
    });
  }

  // A) Form 1 details entered, no time picked.
  const { data: cals } = await admin.from("bdr_calendars").select("id, user_id, client_id, booking_form_id").not("booking_form_id", "is", null);
  const byForm = new Map<string, any[]>();
  for (const c of cals || []) { const a = byForm.get(c.booking_form_id) || []; a.push(c); byForm.set(c.booking_form_id, a); }
  if (byForm.size) {
    const { data: subs } = await admin.from("form_submissions")
      .select("id, form_id, submission_data, created_at")
      .in("form_id", Array.from(byForm.keys()))
      .gte("created_at", new Date(now - 90 * MIN).toISOString())
      .lte("created_at", new Date(now - 10 * MIN).toISOString())
      .limit(200);
    for (const s of subs || []) {
      const c = contactFrom(s.submission_data as Record<string, unknown>);
      if (!c.email && !c.phone) continue;
      for (const cal of byForm.get(s.form_id) || []) {
        const { data: evs } = await admin.from("bdr_calendar_events")
          .select("metadata").eq("calendar_id", cal.id).gte("created_at", s.created_at).limit(200);
        const booked = (evs || []).some((e: any) => {
          const m = e.metadata || {};
          return (c.email && String(m.email || "").toLowerCase() === c.email) || (c.phone && digits(String(m.phone || "")) === digits(c.phone));
        });
        if (booked) continue;
        if (!(await claim("booking_abandoned", `${s.id}:${cal.user_id}`))) continue;
        const who = c.name || c.email || c.phone;
        await alertRep(cal.user_id, cal.client_id, "Lead started booking but didn't pick a time",
          `${who} filled in your booking page ${Math.round((now - new Date(s.created_at).getTime()) / MIN)} min ago and stopped. Call now${c.phone ? `: ${c.phone}` : ""}${c.email ? ` · ${c.email}` : ""}.`,
          "form_submission", s.id);
        sent.push(`booking:${s.id}`);
      }
    }
  }

  // B) Pay & Sign opened, not paid and signed.
  const { data: envs } = await admin.from("document_envelopes")
    .select("id, related_id, viewed_at, recipient_name")
    .eq("related_type", "crm_deal").not("viewed_at", "is", null)
    .gte("viewed_at", new Date(now - 24 * 60 * MIN).toISOString())
    .lte("viewed_at", new Date(now - 15 * MIN).toISOString())
    .limit(200);
  for (const env of envs || []) {
    const { data: deal } = await admin.from("crm_deals").select("id, client_id, deal_name, pay_sign_status, assigned_user").eq("id", env.related_id).maybeSingle();
    if (!deal || deal.pay_sign_status === "paid_signed") continue;
    const { data: lead } = await admin.from("nl_bdr_leads").select("user_id, owner_name, business_name, owner_direct_phone, phone").eq("crm_deal_id", deal.id).maybeSingle();
    const repId = lead?.user_id || deal.assigned_user;
    if (!repId) continue;
    if (!(await claim("pay_sign_unfinished", env.id))) continue;
    const who = lead?.business_name || deal.deal_name || env.recipient_name || "Your client";
    const ph = lead?.owner_direct_phone || lead?.phone || "";
    await alertRep(repId, deal.client_id, "Client opened Pay & Sign but didn't finish",
      `${who} opened their Pay & Sign page and hasn't paid and signed yet. Call now${ph ? `: ${ph}` : ""}.`,
      "crm_deal", deal.id);
    sent.push(`pay_sign:${deal.id}`);
  }

  return json({ ok: true, sent });
});
