// Sends a "your meeting has moved" notice for a rescheduled (NEW) meeting.
// Booking-form / round-robin meetings are skipped: the booking trigger already
// re-sends the full confirmation for those.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const TWILIO_FROM = "+18555066111";

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "America/Los_Angeles",
  }) + " PT";
}
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function sendSms(to: string, body: string): Promise<boolean> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) { console.log(`[SMS QUEUED - missing key] to=${to}`); return false; }
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: "+18555066111", Body: body }),
    });
    if (!res.ok) { console.error("Twilio error", res.status, await res.text().catch(() => "")); return false; }
    return true;
  } catch (e) { console.error("SMS send error", e); return false; }
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) { console.log(`[EMAIL QUEUED - no RESEND_API_KEY] to=${to}`); return false; }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "NewLight <team@newlightgen.com>", to: [to], subject, html, text }),
    });
    if (!res.ok) { console.error("Resend error", res.status, await res.text().catch(() => "")); return false; }
    return true;
  } catch (e) { console.error("Email send error", e); return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !authData?.user?.id) return json({ error: "Unauthorized" }, 401);
    const callerId = authData.user.id;

    const body = await req.json().catch(() => ({}));
    const eventId = typeof body?.event_id === "string" ? body.event_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(eventId)) return json({ error: "event_id is required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: evt } = await admin.from("bdr_calendar_events")
      .select("id, user_id, lead_id, source, meeting_kind, starts_at, metadata, zoom_join_url")
      .eq("id", eventId).maybeSingle();
    if (!evt) return json({ error: "Meeting not found" }, 404);

    if (evt.user_id !== callerId) {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
      const ok = (roles || []).some((r: any) => r.role === "admin" || r.role === "operator");
      if (!ok) return json({ error: "Forbidden" }, 403);
    }

    if (evt.source === "booking_form" || evt.source === "round_robin") {
      return json({ ok: true, skipped: "booking_confirmation_handles_it" });
    }
    if (!evt.lead_id) return json({ ok: true, skipped: "no_lead" });

    const meta = (evt.metadata || {}) as Record<string, any>;
    let email: string = meta.email || "";
    let phone: string = meta.phone || "";
    let name: string = meta.customer_name || meta.owner_name || "";
    const { data: lead } = await admin.from("nl_bdr_leads")
      .select("owner_name, business_name, email, owner_direct_phone, front_desk_phone, phone")
      .eq("id", evt.lead_id).maybeSingle();
    if (lead) {
      if (!email) email = lead.email || "";
      if (!phone) phone = lead.owner_direct_phone || lead.front_desk_phone || lead.phone || "";
      if (!name) name = lead.owner_name || "";
    }

    let consent = meta.sms_consent === true;
    if (!consent) {
      const { data: others } = await admin.from("bdr_calendar_events")
        .select("id").eq("lead_id", evt.lead_id).eq("metadata->>sms_consent", "true").limit(1);
      consent = (others || []).length > 0;
    }

    const kindLabel = evt.meeting_kind === "closing" || evt.source === "closing_meeting" ? "Closing"
      : evt.meeting_kind === "onboarding" || evt.source === "onboarding_meeting" ? "Onboarding" : "";
    const meetingName = kindLabel ? `${kindLabel} meeting` : "meeting";
    const when = formatDateTime(evt.starts_at);
    const zoom: string = evt.zoom_join_url || "";

    const result: Record<string, unknown> = { ok: true };

    if (email) {
      const text = `Hi ${name || "there"},\n\nYour NewLight ${meetingName} has moved to ${when}.${zoom ? `\n\nJoin on Zoom: ${zoom}` : ""}\n\n— NewLight`;
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:520px;margin:0 auto;padding:24px;">
<p>Hi ${esc(name || "there")},</p>
<p>Your NewLight ${esc(meetingName)} has moved to <strong>${esc(when)}</strong>.</p>
${zoom ? `<p>Join on Zoom: <a href="${esc(zoom)}">${esc(zoom)}</a></p>` : ""}
<p>— NewLight</p></div>`;
      result.email = await sendEmail(email, "Your NewLight meeting has moved", html, text);
    } else result.email = "no_email";

    if (phone && consent) {
      result.sms = await sendSms(phone, `Your NewLight ${meetingName} has moved to ${when}.${zoom ? ` Join: ${zoom}` : ""}`);
    } else result.sms = phone ? "skipped_no_consent" : "no_phone";

    const { data: rep } = await admin.auth.admin.getUserById(evt.user_id);
    const repEmail = rep?.user?.email;
    if (repEmail) {
      const line = `${lead?.business_name || name || "Prospect"} — ${meetingName} moved to ${when}.`;
      result.rep_email = await sendEmail(repEmail, "Meeting rescheduled", `<p>${esc(line)}</p>`, line);
    }

    return json(result);
  } catch (e) {
    console.error("[meeting-reschedule-notice]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
