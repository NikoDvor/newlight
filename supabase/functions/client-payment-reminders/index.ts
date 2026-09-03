// Daily due-date reminders for client-owned payment requests.
// Fully independent of NewLight's own billing/invoice system.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Local HTML-escape helper (intentionally not imported from shared modules). */
function escapeHtml(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
      body: JSON.stringify({ from: "Payments <team@newlightgen.com>", to: [to], subject, text, html }),
    });
    if (!res.ok) { console.error("Resend error:", res.status, await res.text().catch(() => "")); return false; }
    return true;
  } catch (e) { console.error("Email send error:", e); return false; }
}

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function fmtMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: (currency || "usd").toUpperCase() }).format(amount);
  } catch { return `${amount} ${(currency || "usd").toUpperCase()}`; }
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

/** Whole days between today (UTC date) and a YYYY-MM-DD due date. */
function daysUntil(dueDate: string, todayStr: string): number {
  const a = Date.parse(`${todayStr}T00:00:00Z`);
  const b = Date.parse(`${dueDate}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

function reminderHtml(args: {
  payerName: string; amountLabel: string; dueLabel: string; urgency: string; wireInstructions: string | null;
}): string {
  const { payerName, amountLabel, dueLabel, urgency, wireInstructions } = args;
  const wireBlock = wireInstructions
    ? `<div style="margin:20px 0;padding:16px;background:#f6f7f9;border-radius:8px;">
         <p style="font-size:13px;font-weight:700;margin:0 0 8px;">Wire transfer instructions</p>
         <pre style="font-family:ui-monospace,Menlo,monospace;font-size:13px;line-height:1.6;margin:0;white-space:pre-wrap;">${escapeHtml(wireInstructions)}</pre>
       </div>`
    : "";
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">Payment reminder</h1>
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">Hi ${escapeHtml(payerName)},</p>
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">This is a reminder that your payment of <strong>${escapeHtml(amountLabel)}</strong> is ${escapeHtml(urgency)} (<strong>${escapeHtml(dueLabel)}</strong>).</p>
    ${wireBlock}
    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:24px 0 0;">If you've already sent this payment, please disregard this message.</p>
  </div>
</body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const todayStr = new Date().toISOString().slice(0, 10);

    const { data: requests, error } = await supabase
      .from("client_payment_requests")
      .select("*")
      .eq("status", "pending");

    if (error) return json({ error: error.message }, 500);

    const settingsCache = new Map<string, any>();
    const getSettings = async (clientId: string) => {
      if (settingsCache.has(clientId)) return settingsCache.get(clientId);
      const { data } = await supabase
        .from("client_payment_settings")
        .select("wire_instructions")
        .eq("client_id", clientId)
        .maybeSingle();
      settingsCache.set(clientId, data || null);
      return data || null;
    };

    let sent = 0;
    let overdue = 0;

    for (const r of requests || []) {
      const diff = daysUntil(r.due_date, todayStr);

      if (diff < 0) {
        await supabase.from("client_payment_requests").update({ status: "overdue" }).eq("id", r.id);
        overdue++;
        continue;
      }

      let column: string | null = null;
      let urgency = "";
      let subject = "";
      if (diff === 7 && !r.reminder_7d_sent_at) {
        column = "reminder_7d_sent_at"; urgency = "due in 7 days"; subject = "Payment reminder — due in 7 days";
      } else if (diff === 1 && !r.reminder_1d_sent_at) {
        column = "reminder_1d_sent_at"; urgency = "due tomorrow"; subject = "Payment reminder — due tomorrow";
      } else if (diff === 0 && !r.reminder_due_sent_at) {
        column = "reminder_due_sent_at"; urgency = "due today"; subject = "Payment reminder — due today";
      }
      if (!column) continue;
      if (!r.payer_email) continue;

      const settings = r.method === "wire" ? await getSettings(r.client_id) : null;
      const wireInstructions = settings?.wire_instructions || null;
      const amountLabel = fmtMoney(Number(r.amount), r.currency);
      const dueLabel = fmtDate(r.due_date);
      const payerName = r.payer_name || "there";

      const text = [
        `Hi ${payerName},`,
        ``,
        `This is a reminder that your payment of ${amountLabel} is ${urgency} (${dueLabel}).`,
        ...(wireInstructions ? ["", "Wire transfer instructions:", wireInstructions] : []),
        ``,
        `If you've already sent this payment, please disregard this message.`,
      ].join("\n");

      await sendEmail(
        r.payer_email,
        subject,
        reminderHtml({ payerName, amountLabel, dueLabel, urgency, wireInstructions }),
        text,
      );

      await supabase
        .from("client_payment_requests")
        .update({ [column]: new Date().toISOString() })
        .eq("id", r.id);
      sent++;
    }

    return json({ ok: true, checked: requests?.length || 0, reminders_sent: sent, marked_overdue: overdue });
  } catch (e) {
    return json({ error: String((e as any)?.message || e) }, 500);
  }
});
