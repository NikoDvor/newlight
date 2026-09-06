// Daily 24-hour-ahead payment reminders (pg_cron).
// Covers EVERY billing type by reading the one shared field: crm_deals.next_charge_at.
// A deal whose charge lands 23–25 hours from now gets one email + one SMS.
// Duplicate protection: crm_deals.last_reminder_sent_for stores the charge date
// already reminded about, so re-runs before the charge never re-send.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const ANNUAL_PLAN_PRICE = 29997;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function money(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log(`[payment-reminder EMAIL QUEUED - no RESEND_API_KEY] to=${to} subject="${subject}"`);
    return { ok: false, detail: "resend credentials missing" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "NewLight <team@newlightgen.com>", to: [to], subject, text, html }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("[payment-reminder Resend error]", res.status, t);
    return { ok: false, detail: `${res.status}: ${t}` };
  }
  return { ok: true, detail: "sent" };
}

/** Twilio send via the Lovable connector gateway (same pattern as send-compliance-text). */
// deno-lint-ignore no-explicit-any
async function sendSms(supabase: any, clientId: string, to: string, body: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  const FROM = Deno.env.get("TWILIO_FROM_NUMBER") || "+18058940908";

  let sid: string | null = null;
  let status = "sent";
  let errorNote: string | null = null;

  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
    status = "failed";
    errorNote = "Twilio credentials not configured in this environment.";
  } else {
    try {
      const resp = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": TWILIO_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: FROM, Body: body }),
      });
      const respBody = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        status = "failed";
        errorNote = `Twilio ${resp.status}: ${respBody?.message || JSON.stringify(respBody).slice(0, 400)}`;
      } else {
        sid = respBody?.sid ?? null;
      }
    } catch (e) {
      status = "failed";
      errorNote = `Network error: ${(e as Error).message}`;
    }
  }

  // Always log the attempt — same recordkeeping rule as other outbound SMS.
  await supabase.from("client_text_messages").insert({
    client_id: clientId,
    direction: "outbound",
    phone_number: to,
    message_body: body,
    twilio_message_sid: sid,
    send_status: status,
    error_note: errorNote,
  } as any);

  return { ok: status === "sent", detail: errorNote ?? "sent" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Auth: cron secret OR admin/operator JWT.
  const CRON_SECRET = Deno.env.get("CRON_SECRET");
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  let allowed = Boolean(CRON_SECRET && cronHeader && cronHeader === CRON_SECRET);
  if (!allowed) {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (jwt) {
      const { data: userData } = await supabase.auth.getUser(jwt);
      if (userData?.user) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id);
        // deno-lint-ignore no-explicit-any
        allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "operator");
      }
    }
  }
  if (!allowed) return json({ error: "Unauthorized" }, 401);

  const now = Date.now();
  const windowStart = new Date(now + 23 * 3600 * 1000).toISOString();
  const windowEnd = new Date(now + 25 * 3600 * 1000).toISOString();

  const { data: deals, error: dealsErr } = await supabase
    .from("crm_deals")
    .select("id, client_id, provisioned_client_id, deal_name, pricing_model, billing_cadence, recurring_fee, next_charge_at, last_reminder_sent_for")
    .not("next_charge_at", "is", null)
    .gte("next_charge_at", windowStart)
    .lte("next_charge_at", windowEnd);
  if (dealsErr) return json({ error: dealsErr.message }, 500);

  const results: unknown[] = [];

  for (const deal of deals ?? []) {
    try {
      // Already reminded for exactly this charge date → skip.
      if (deal.last_reminder_sent_for &&
          new Date(deal.last_reminder_sent_for).getTime() === new Date(deal.next_charge_at).getTime()) {
        results.push({ deal_id: deal.id, skipped: "already_reminded" });
        continue;
      }

      const billingClientId = deal.provisioned_client_id || deal.client_id;
      if (!billingClientId) { results.push({ deal_id: deal.id, skipped: "no_client" }); continue; }

      const { data: client } = await supabase
        .from("clients")
        .select("id, name, owner_email, owner_phone")
        .eq("id", billingClientId)
        .maybeSingle();

      const businessName = client?.name || deal.deal_name || "there";
      const chargeDate = new Date(deal.next_charge_at);
      const dateLabel = chargeDate.toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
      });

      // What's coming: annual flat, retainer recurring fee, or an unknown commission amount.
      let amountLabel: string;
      let amountPhrase: string;
      if (deal.billing_cadence === "annual") {
        amountLabel = money(ANNUAL_PLAN_PRICE);
        amountPhrase = `your annual plan renewal of ${amountLabel}`;
      } else if (deal.pricing_model === "commission") {
        amountLabel = "your monthly commission payment";
        amountPhrase = `your monthly commission payment`;
      } else {
        const monthly = Number(deal.recurring_fee || 0);
        amountLabel = monthly > 0 ? money(monthly) : "your scheduled payment";
        amountPhrase = monthly > 0 ? `your monthly retainer of ${amountLabel}` : `your scheduled payment`;
      }

      const subject = `Reminder: payment scheduled for tomorrow — ${dateLabel}`;
      const text = [
        `Hi ${businessName},`,
        ``,
        `This is a reminder that ${amountPhrase} will be charged to the card on file on ${dateLabel}.`,
        ``,
        `No action is needed if everything looks right. If your card has changed, please update it before then.`,
        ``,
        `Thank you,`,
        `NewLight`,
      ].join("\n");
      const html = `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:22px;margin:0 0 16px;">Payment scheduled for tomorrow</h1>
    <p style="font-size:14px;line-height:1.6;">Hi ${escapeHtml(businessName)},</p>
    <p style="font-size:14px;line-height:1.6;">This is a reminder that <strong>${escapeHtml(amountPhrase)}</strong> will be charged to the card on file on <strong>${escapeHtml(dateLabel)}</strong>.</p>
    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin-top:24px;">No action is needed if everything looks right. If your card has changed, please update it before then.</p>
    <p style="font-size:13px;color:#6b7280;">Thank you,<br/>NewLight</p>
  </div></body></html>`;

      const emailRes = client?.owner_email
        ? await sendEmail(client.owner_email, subject, html, text)
        : { ok: false, detail: "no client email" };

      const smsBody = `NewLight: reminder — ${amountPhrase} will be charged to your card on file on ${dateLabel}. Reply if anything needs updating.`;
      const smsRes = client?.owner_phone
        ? await sendSms(supabase, billingClientId, client.owner_phone, smsBody)
        : { ok: false, detail: "no client phone" };

      await supabase.from("crm_deals")
        .update({ last_reminder_sent_for: deal.next_charge_at })
        .eq("id", deal.id);

      await supabase.from("audit_logs").insert({
        client_id: billingClientId,
        action: "payment_reminder_sent",
        module: "billing",
        status: "success",
        metadata: {
          deal_id: deal.id,
          next_charge_at: deal.next_charge_at,
          amount_label: amountLabel,
          email: emailRes,
          sms: smsRes,
        },
      });

      results.push({ deal_id: deal.id, ok: true, email: emailRes, sms: smsRes, next_charge_at: deal.next_charge_at });
    } catch (e) {
      console.error("[send-payment-reminders] deal error", deal.id, e);
      results.push({ deal_id: deal.id, error: String((e as Error).message) });
    }
  }

  const summary = {
    window: { from: windowStart, to: windowEnd },
    due_deals: (deals ?? []).length,
    // deno-lint-ignore no-explicit-any
    reminded: results.filter((r: any) => r.ok).length,
  };
  console.log("[send-payment-reminders]", JSON.stringify(summary));
  return json({ ...summary, results });
});
