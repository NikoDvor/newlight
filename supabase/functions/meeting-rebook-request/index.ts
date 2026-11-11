// No-show rebook: the salesman logged a meeting as a no-show without picking a new time.
// Sends the lead "sorry we missed you — pick a new time" with the salesman's meeting link, by email,
// and by text only if the lead agreed to texts. When they book from that link, the database files it
// as the next try of the same meeting (a reschedule), not as an extra meeting.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { esc, repContact, sendEmail, sendSms } from "../_shared/notifySend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const APP_ORIGIN = "https://newlight-app.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (new URL(req.url).searchParams.get("ping") === "1") return json({ ok: true, version: "2026-11-10" });
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    const callerId = authData?.user?.id;
    if (!callerId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const eventId = typeof body?.event_id === "string" ? body.event_id : "";
    const noShow = body?.reason === "no_show";
    if (!/^[0-9a-f-]{36}$/i.test(eventId)) return json({ error: "event_id is required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: evt } = await admin.from("bdr_calendar_events")
      .select("id, user_id, lead_id, meeting_kind, starts_at, metadata, is_external, calendar_id")
      .eq("id", eventId).maybeSingle();
    if (!evt) return json({ error: "Meeting not found" }, 404);
    if (evt.user_id !== callerId) {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
      if (!(roles || []).some((r: any) => r.role === "admin" || r.role === "operator")) return json({ error: "Forbidden" }, 403);
    }
    if (!evt.lead_id) return json({ ok: true, skipped: "no_lead" });

    const meta = (evt.metadata || {}) as Record<string, any>;
    const { data: lead } = await admin.from("nl_bdr_leads")
      .select("owner_name, business_name, email, owner_direct_phone, front_desk_phone, phone").eq("id", evt.lead_id).maybeSingle();
    const email: string = meta.email || lead?.email || "";
    const phone: string = meta.phone || lead?.owner_direct_phone || lead?.phone || "";
    const first = String(meta.customer_name || lead?.owner_name || "").trim().split(/\s+/)[0] || "there";

    let consent = meta.sms_consent === true;
    if (!consent) {
      const { data: others } = await admin.from("bdr_calendar_events")
        .select("id").eq("lead_id", evt.lead_id).eq("metadata->>sms_consent", "true").limit(1);
      consent = (others || []).length > 0;
    }

    const { data: cal } = await admin.from("bdr_calendars").select("booking_slug").eq("id", evt.calendar_id).maybeSingle();
    if (!cal?.booking_slug) return json({ ok: false, error: "Salesman has no meeting link" }, 400);
    const link = `${APP_ORIGIN}/bdr/meet/${cal.booking_slug}`;
    const rep = await repContact(admin, evt.user_id);
    const kindName = evt.meeting_kind === "closing" ? "closing meeting" : evt.meeting_kind === "onboarding" ? "onboarding meeting" : "meeting";

    const result: Record<string, unknown> = { ok: true, link };
    const opener = noShow ? `sorry we missed you for our ${kindName} today.` : `as discussed, here's a link to pick a new time for our ${kindName}.`;
    const text = `Hi ${first}, ${opener} Pick a time that works for you here: ${link} — ${rep.name}, NewLight`;
    if (email) {
      const html = `<p>Hi ${esc(first)},</p><p>${noShow ? `Sorry we missed you for our ${esc(kindName)} today. No problem — pick a new time that works for you:` : `As discussed, here's a link to pick a new time for our ${esc(kindName)}:`}</p>
<p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#1b6fe0;color:#fff;border-radius:8px;text-decoration:none">Pick a new time</a></p>
<p>${esc(rep.name)}<br/>NewLight</p>`;
      result.email = await sendEmail(email, noShow ? "Sorry we missed you — pick a new time" : "Pick a new time for our meeting", html, text);
    } else result.email = "no_email";
    if (phone && consent) result.sms = await sendSms(phone, text);
    else result.sms = phone ? "skipped_no_consent" : "no_phone";

    await admin.from("bdr_calendar_events")
      .update({ metadata: { ...meta, rebook_link_sent_at: new Date().toISOString() } }).eq("id", evt.id);
    return json(result);
  } catch (e) {
    console.error("meeting-rebook-request", e);
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
