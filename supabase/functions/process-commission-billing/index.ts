// Monthly commission billing (pg_cron, 1st of each month).
// For every commission-priced deal that has completed Pay & Sign:
//   - sum the client's financial_adjustments revenue for the prior calendar month
//   - commission = commission_rate% * revenue
//   - create a commission invoice and charge the saved card off-session
//   - on success: mark paid + send the standard confirmation set + client receipt
//   - on failure: NO retry — alert ops + assigned rep, leave invoice payment_failed
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";
import { getStripe, chargeOffSession } from "../_shared/stripe-billing.ts";
import { sendPaymentConfirmation } from "../_shared/pay-sign-notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const OPS_EMAIL_TO = "team@newlightgen.com";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function priorMonth(): { start: string; end: string; label: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: start.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log(`[commission EMAIL QUEUED - no RESEND_API_KEY] to=${to} subject="${subject}"`);
    return { ok: false, detail: "resend credentials missing" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "NewLight <team@newlightgen.com>", to: [to], subject, text, html }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("[commission Resend error]", res.status, t);
    return { ok: false, detail: `${res.status}: ${t}` };
  }
  return { ok: true, detail: "sent" };
}

// deno-lint-ignore no-explicit-any
async function repEmailFor(supabase: any, userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data: ep } = await supabase
    .from("employee_profiles").select("email").eq("user_id", userId).maybeSingle();
  if (ep?.email) return ep.email;
  const { data: wu } = await supabase
    .from("workspace_users").select("email").eq("user_id", userId).maybeSingle();
  return wu?.email ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Auth: cron secret OR admin/operator JWT
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

  const body = await req.json().catch(() => ({}));
  const period = body.period_start && body.period_end
    ? { start: body.period_start, end: body.period_end, label: `${body.period_start} – ${body.period_end}` }
    : priorMonth();

  const stripe = await getStripe();

  const { data: deals, error: dealsErr } = await supabase
    .from("crm_deals")
    .select("id, client_id, deal_name, commission_rate, pricing_model, pay_sign_status, assigned_user")
    .eq("pricing_model", "commission")
    .eq("pay_sign_status", "paid_signed");
  if (dealsErr) return json({ error: dealsErr.message }, 500);

  const results: unknown[] = [];

  for (const deal of deals ?? []) {
    try {
      if (!deal.client_id) { results.push({ deal_id: deal.id, skipped: "no_client" }); continue; }

      const rate = Number(deal.commission_rate || 0);
      if (!(rate > 0)) { results.push({ deal_id: deal.id, skipped: "no_rate" }); continue; }

      const { data: adjustments } = await supabase
        .from("financial_adjustments")
        .select("amount")
        .eq("client_id", deal.client_id)
        .eq("type", "revenue")
        .gte("created_at", `${period.start}T00:00:00Z`)
        .lte("created_at", `${period.end}T23:59:59Z`);
      // deno-lint-ignore no-explicit-any
      const revenue = (adjustments ?? []).reduce((s: number, a: any) => s + (Number(a.amount) || 0), 0);
      const amount = Math.round(revenue * (rate / 100) * 100) / 100;
      if (!(amount > 0)) { results.push({ deal_id: deal.id, skipped: "zero_amount", revenue }); continue; }

      const { data: client } = await supabase
        .from("clients")
        .select("id, name, owner_email, stripe_customer_id, stripe_payment_method_id")
        .eq("id", deal.client_id)
        .maybeSingle();

      // Invoice row (unique per client/period via partial index → idempotent).
      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          client_id: deal.client_id,
          deal_id: deal.id,
          invoice_number: `COM-${Date.now().toString(36).toUpperCase()}`,
          invoice_type: "commission",
          invoice_status: "pending",
          subtotal_amount: amount,
          tax_amount: 0,
          total_amount: amount,
          amount_paid: 0,
          period_start: period.start,
          period_end: period.end,
          payment_notes: `Commission ${rate}% on ${period.label} revenue of $${revenue.toLocaleString()}`,
          issued_at: new Date().toISOString(),
        } as any)
        .select("id, invoice_number")
        .maybeSingle();

      if (invErr || !invoice) {
        results.push({ deal_id: deal.id, skipped: "invoice_exists_or_error", detail: invErr?.message });
        continue;
      }

      const repEmail = await repEmailFor(supabase, deal.assigned_user ?? null);
      const businessName = client?.name || deal.deal_name || "Client";
      const amountFmt = `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      const fail = async (reason: string) => {
        await supabase.from("invoices").update({
          invoice_status: "payment_failed",
          failed_at: new Date().toISOString(),
          failure_reason: reason,
          failure_notification_sent: true,
        }).eq("id", invoice.id);

        const subject = `ACTION NEEDED — Commission charge failed: ${businessName} · ${amountFmt}`;
        const text = [
          `Commission billing failed and was NOT retried.`,
          ``,
          `Client: ${businessName}`,
          `Period: ${period.label}`,
          `Revenue logged: $${revenue.toLocaleString()}`,
          `Commission (${rate}%): ${amountFmt}`,
          `Invoice: ${invoice.invoice_number} (left as payment_failed)`,
          `Reason: ${reason}`,
          ``,
          `A human needs to follow up with the client.`,
        ].join("\n");
        const html = `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#b91c1c;color:#fff;padding:12px 16px;border-radius:8px;font-weight:700;text-align:center;">COMMISSION CHARGE FAILED</div>
    <h1 style="font-size:20px;margin:20px 0 6px;">${businessName}</h1>
    <table style="width:100%;font-size:14px;line-height:1.8;">
      <tr><td style="color:#6b7280;width:150px;">Period</td><td>${period.label}</td></tr>
      <tr><td style="color:#6b7280;">Revenue logged</td><td>$${revenue.toLocaleString()}</td></tr>
      <tr><td style="color:#6b7280;">Commission (${rate}%)</td><td><strong>${amountFmt}</strong></td></tr>
      <tr><td style="color:#6b7280;">Invoice</td><td>${invoice.invoice_number}</td></tr>
      <tr><td style="color:#6b7280;">Reason</td><td>${reason}</td></tr>
    </table>
    <p style="font-size:13px;color:#6b7280;margin-top:24px;">No automatic retry was attempted. Please follow up manually.</p>
  </div></body></html>`;

        await sendEmail(OPS_EMAIL_TO, subject, html, text);
        if (repEmail && repEmail !== OPS_EMAIL_TO) await sendEmail(repEmail, subject, html, text);
        results.push({ deal_id: deal.id, invoice_id: invoice.id, failed: true, reason, amount });
      };

      if (!stripe) { await fail("STRIPE_SECRET_KEY not configured"); continue; }
      if (!client?.stripe_customer_id || !client?.stripe_payment_method_id) {
        await fail("No card on file for this client");
        continue;
      }

      const charge = await chargeOffSession(stripe, {
        customerId: client.stripe_customer_id,
        paymentMethodId: client.stripe_payment_method_id,
        amount,
        description: `Commission — ${period.label} (${rate}% of $${revenue.toLocaleString()})`,
        metadata: { client_id: deal.client_id, deal_id: deal.id, invoice_id: invoice.id, period: period.label },
      });

      if (!charge.ok) { await fail(charge.error || "Charge failed"); continue; }

      await supabase.from("invoices").update({
        invoice_status: "paid",
        amount_paid: amount,
        paid_at: new Date().toISOString(),
        payment_method: "stripe",
        stripe_payment_intent_id: charge.payment_intent_id,
      }).eq("id", invoice.id);

      const notify = await sendPaymentConfirmation(supabase, deal.id, {
        invoiceId: invoice.id,
        payerEmail: client.owner_email || null,
      });

      results.push({ deal_id: deal.id, invoice_id: invoice.id, ok: true, amount, revenue, notify });
    } catch (e) {
      console.error("[process-commission-billing] deal error", deal.id, e);
      results.push({ deal_id: deal.id, error: String((e as Error).message) });
    }
  }

  // deno-lint-ignore no-explicit-any
  const summary = {
    period,
    total_deals: (deals ?? []).length,
    charged: results.filter((r: any) => r.ok).length,
    failed: results.filter((r: any) => r.failed).length,
  };
  console.log("[process-commission-billing]", JSON.stringify(summary));
  return json({ ...summary, results });
});
