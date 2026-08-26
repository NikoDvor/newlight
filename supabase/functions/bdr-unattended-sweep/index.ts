// bdr-unattended-sweep — runs hourly via pg_cron.
// For every nl_bdr_leads row with unattended_since set:
//   - if 67h have passed (5h before the 72h deadline) and no warning sent yet,
//     notify the owning BDR.
//   - if 72h have passed, revert pipeline_stage to 'cold', log it to
//     outcome_history, and clear the unattended_* fields.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const WARN_AFTER_MS = 67 * 3600_000;   // 5h before the 72h deadline
const EXPIRE_AFTER_MS = 72 * 3600_000;

async function sendSms(to: string, body: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
    console.log(`[SMS QUEUED] to=${to} body="${body.slice(0, 120)}"`);
    return;
  }
  try {
    await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: Deno.env.get("TWILIO_FROM_NUMBER") || "+18058940908",
        Body: body,
      }),
    });
  } catch (e) { console.error("SMS send error:", e); }
}

async function sendEmail(to: string, subject: string, text: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) { console.log(`[EMAIL QUEUED] to=${to} subject="${subject}"`); return; }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "NewLight <team@newlightgen.com>", to: [to], subject, text }),
    });
  } catch (e) { console.error("Email send error:", e); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  if (cronSecret && (req.headers.get("x-cron-secret") || "") !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  let warned = 0, expired = 0;

  const { data: leads, error } = await supabase
    .from("nl_bdr_leads")
    .select("id, user_id, business_name, unattended_since, unattended_warned_at, unattended_return_stage, outcome_history")
    .not("unattended_since", "is", null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  for (const lead of leads || []) {
    const sinceMs = new Date(lead.unattended_since as string).getTime();
    const elapsed = now - sinceMs;

    // 72h — auto-revert to Cold
    if (elapsed >= EXPIRE_AFTER_MS) {
      const history = Array.isArray(lead.outcome_history) ? lead.outcome_history : [];
      history.push({
        label: "Auto-reverted to Cold — 72h unattended with no reschedule",
        timestamp: new Date().toISOString(),
      });
      await supabase.from("nl_bdr_leads").update({
        pipeline_stage: "cold",
        unattended_since: null,
        unattended_return_stage: null,
        unattended_warned_at: null,
        outcome_history: history,
      }).eq("id", lead.id);
      expired++;
      continue;
    }

    // 67h — 5h warning, once
    if (elapsed >= WARN_AFTER_MS && !lead.unattended_warned_at) {
      await supabase.from("nl_bdr_leads").update({ unattended_warned_at: new Date().toISOString() }).eq("id", lead.id);
      try {
        const { data: userResp } = await supabase.auth.admin.getUserById(lead.user_id as string);
        const u = userResp?.user;
        const email = u?.email;
        const name = (u?.user_metadata as any)?.full_name || (u?.user_metadata as any)?.display_name || email;
        const hoursLeft = Math.max(0, Math.ceil((sinceMs + EXPIRE_AFTER_MS - now) / 3600_000));
        const msg = `NewLight: "${lead.business_name}" has ${hoursLeft}h left before it auto-reverts to Cold. Reschedule now to keep it in ${lead.unattended_return_stage || "its current stage"}.`;
        if (email) await sendEmail(email, `Unattended lead expiring soon — ${lead.business_name}`, `Hi ${name || "there"},\n\n${msg}\n\n— NewLight`);
      } catch (e) { console.error("[unattended-sweep] notify failed:", e); }
      warned++;
    }
  }

  return new Response(JSON.stringify({ ok: true, checked: (leads || []).length, warned, expired }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
