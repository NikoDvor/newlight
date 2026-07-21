// Scheduled scan: fires customer SMS + BDR in-app notification reminders for
// upcoming bdr_calendar_events at 24h, 3h, and 15min before start_time.
// Skips windows whose trigger time has already passed at booking time.
// Idempotent via reminder_{24h,3h,15m}_sent_at columns.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWILIO_FROM_DEFAULT = "+18058940908";

type Window = { key: "24h" | "3h" | "15m"; column: string; minutes: number; label: string };
const WINDOWS: Window[] = [
  { key: "24h", column: "reminder_24h_sent_at", minutes: 24 * 60, label: "24 hours" },
  { key: "3h",  column: "reminder_3h_sent_at",  minutes: 3 * 60,  label: "3 hours" },
  { key: "15m", column: "reminder_15m_sent_at", minutes: 15,      label: "15 minutes" },
];

async function sendSms(to: string, body: string): Promise<boolean> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
    console.log(`[SMS QUEUED - missing key] to=${to} body="${body.substring(0, 100)}"`);
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
        From: Deno.env.get("TWILIO_FROM_NUMBER") || TWILIO_FROM_DEFAULT,
        Body: body,
      }),
    });
    if (!res.ok) {
      console.error("Twilio error", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("SMS send error", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  const horizon = new Date(now + 25 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date(now).toISOString();

  // Any upcoming event where at least one reminder is still unsent.
  const { data: events, error } = await supabase
    .from("bdr_calendar_events")
    .select("id, user_id, client_id, starts_at, created_at, lead_id, metadata, zoom_join_url, reminder_24h_sent_at, reminder_3h_sent_at, reminder_15m_sent_at")
    .gt("starts_at", nowIso)
    .lt("starts_at", horizon)
    .or("reminder_24h_sent_at.is.null,reminder_3h_sent_at.is.null,reminder_15m_sent_at.is.null")
    .limit(500);

  if (error) {
    console.error("scan query failed", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const evt of events || []) {
    const startMs = new Date(evt.starts_at as string).getTime();
    const createdMs = evt.created_at ? new Date(evt.created_at as string).getTime() : now;
    const minutesUntil = (startMs - now) / 60000;

    // Resolve customer contact + name from metadata → lead fallback.
    const meta = (evt.metadata || {}) as Record<string, any>;
    let customerName: string = meta.customer_name || "";
    let customerPhone: string = meta.phone || "";
    let businessName: string = meta.business_name || "";
    if (evt.lead_id && (!customerPhone || !customerName)) {
      const { data: lead } = await supabase
        .from("nl_bdr_leads")
        .select("owner_name, business_name, phone")
        .eq("id", evt.lead_id as string)
        .maybeSingle();
      if (lead) {
        if (!customerName) customerName = (lead.owner_name || lead.business_name || "") as string;
        if (!customerPhone) customerPhone = (lead.phone || "") as string;
        if (!businessName) businessName = (lead.business_name || "") as string;
      }
    }

    const zoomUrl = (evt.zoom_join_url as string) || "";
    const who = businessName ? `${customerName} (${businessName})` : customerName || "your client";

    for (const w of WINDOWS) {
      const alreadySent = (evt as any)[w.column] != null;
      if (alreadySent) continue;

      // Fire window is: we're within [triggerTime, triggerTime + slack).
      // Slack tolerates the 5-min cron cadence + small skew.
      const triggerMs = startMs - w.minutes * 60_000;
      const slackMs = 6 * 60_000;

      // Skip if trigger time was already in the past when the booking was made.
      if (triggerMs < createdMs) {
        // Mark as sent so we don't keep evaluating this window forever.
        await supabase.from("bdr_calendar_events")
          .update({ [w.column]: new Date().toISOString() })
          .eq("id", evt.id as string);
        results.push({ event_id: evt.id, window: w.key, action: "skipped_past_at_booking" });
        continue;
      }

      // Not yet time.
      if (now < triggerMs) continue;
      // Missed window entirely (function was down > slack) — mark sent, do not fire late.
      if (now > triggerMs + Math.max(slackMs, w.minutes * 60_000 * 0.5)) {
        await supabase.from("bdr_calendar_events")
          .update({ [w.column]: new Date().toISOString() })
          .eq("id", evt.id as string);
        results.push({ event_id: evt.id, window: w.key, action: "skipped_missed" });
        continue;
      }

      // ---- Send customer SMS ----
      let smsOk = false;
      if (customerPhone) {
        const smsBody = zoomUrl
          ? `Reminder: your NewLight meeting is in ${w.label}. Join: ${zoomUrl}`
          : `Reminder: your NewLight meeting is in ${w.label}. Check your email for the meeting link.`;
        smsOk = await sendSms(customerPhone, smsBody);
      }

      // ---- Insert BDR in-app notification ----
      let notifOk = false;
      if (evt.user_id && evt.client_id) {
        const title = `Meeting in ${w.label}`;
        const zoomLine = zoomUrl ? `\nZoom: ${zoomUrl}` : "";
        const message = `Upcoming meeting with ${who} at ${new Date(evt.starts_at as string).toLocaleString("en-US", {
          weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Los_Angeles",
        })}.${zoomLine}`;
        const { error: notifErr } = await supabase.from("notifications").insert({
          client_id: evt.client_id as string,
          recipient_user_id: evt.user_id as string,
          type: "meeting_reminder",
          title,
          message,
          linked_type: "bdr_calendar_event",
          linked_id: (evt.id as string),
        });
        if (notifErr) console.error("notification insert failed", notifErr);
        else notifOk = true;
      }

      // Mark sent regardless of individual channel success to prevent runaway retries.
      await supabase.from("bdr_calendar_events")
        .update({ [w.column]: new Date().toISOString() })
        .eq("id", evt.id as string);

      results.push({
        event_id: evt.id, window: w.key,
        minutes_until: Math.round(minutesUntil),
        sms: smsOk, notification: notifOk,
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, scanned: events?.length || 0, actions: results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
