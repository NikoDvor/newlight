// Triggered on new row insert into public.bdr_calendar_events (BDR confirmed bookings).
// Wire this up as a Database Webhook: Table = bdr_calendar_events, Event = INSERT,
// Type = Supabase Edge Function → booking-confirmation-sms.
//
// Sends two SMS via the Twilio connector gateway (same pattern as
// supabase/functions/process-meeting-reminders/index.ts):
//   1. To the client who booked — appointment confirmation.
//   2. To the BDR who owns the calendar — new booking notification.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles",
  });
}

async function sendSms(to: string, body: string): Promise<boolean> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");

  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
    console.log(`[SMS QUEUED] To: ${to} | Body: ${body.substring(0, 120)}...`);
    return false;
  }

  try {
    const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
    const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: Deno.env.get("TWILIO_FROM_NUMBER") || "+18058363557",
        Body: body,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Twilio error:", response.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error("SMS send error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json().catch(() => ({} as any));
    // Supabase database webhooks send { type, table, record, old_record, schema }
    // Allow direct manual invocation too: { record: {...} } or a raw record.
    const record = payload.record ?? payload;

    if (!record || typeof record !== "object") {
      return new Response(JSON.stringify({ error: "No record in payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only act on INSERTs into bdr_calendar_events (defensive).
    if (payload.type && payload.type !== "INSERT") {
      return new Response(JSON.stringify({ skipped: "non-insert event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (payload.table && payload.table !== "bdr_calendar_events") {
      return new Response(JSON.stringify({ skipped: "unexpected table" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const startsAt: string | undefined = record.starts_at;
    const meta = (record.metadata || {}) as Record<string, any>;
    const bdrUserId: string | undefined = record.user_id;
    const leadId: string | undefined = record.lead_id;

    if (!startsAt) throw new Error("Missing starts_at on booking record");

    // --- Resolve client (booker) name + phone --------------------------------
    let clientName: string = meta.customer_name || "";
    let clientPhone: string = meta.phone || "";

    if ((!clientName || !clientPhone) && leadId) {
      const { data: lead } = await supabase
        .from("nl_bdr_leads")
        .select("owner_name, business_name, phone")
        .eq("id", leadId)
        .maybeSingle();
      if (lead) {
        if (!clientName) clientName = lead.owner_name || lead.business_name || "";
        if (!clientPhone) clientPhone = lead.phone || "";
      }
    }

    // --- Resolve BDR phone (owner of the calendar) ---------------------------
    let bdrPhone = "";
    let bdrName = "";
    if (bdrUserId) {
      const { data: userResp } = await supabase.auth.admin.getUserById(bdrUserId);
      const u = userResp?.user;
      if (u) {
        bdrPhone = u.phone || (u.user_metadata as any)?.phone || "";
        bdrName =
          (u.user_metadata as any)?.full_name ||
          (u.user_metadata as any)?.name ||
          u.email ||
          "";
      }
      if (!bdrName) {
        const { data: emp } = await supabase
          .from("employee_profiles")
          .select("full_name")
          .eq("user_id", bdrUserId)
          .maybeSingle();
        if (emp?.full_name) bdrName = emp.full_name;
      }
    }

    const when = formatDateTime(startsAt);

    // --- 1. SMS to client ----------------------------------------------------
    const clientMsg = `Your appointment with NewLight is confirmed for ${when}. We'll see you then! Questions? Call (805) 836-3557`;
    let clientSent = false;
    if (clientPhone) {
      clientSent = await sendSms(clientPhone, clientMsg);
    } else {
      console.warn("No client phone available for booking", record.id);
    }

    // --- 2. SMS to BDR -------------------------------------------------------
    const bdrMsg = `New booking confirmed: ${clientName || "New lead"} at ${when}. Check your calendar.`;
    let bdrSent = false;
    if (bdrPhone) {
      bdrSent = await sendSms(bdrPhone, bdrMsg);
    } else {
      console.warn("No BDR phone available for user", bdrUserId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking_id: record.id,
        client_sent: clientSent,
        client_phone_present: Boolean(clientPhone),
        bdr_sent: bdrSent,
        bdr_phone_present: Boolean(bdrPhone),
        bdr_name: bdrName || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("booking-confirmation-sms error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
