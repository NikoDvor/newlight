// Daily annual-renewal charging (pg_cron, 09:00 PST / 17:00 UTC).
// Finds annual deals whose next_charge_at has come due and charges the saved
// card $29,997 off-session. Mirrors process-commission-billing exactly:
//   - success: advance next_charge_at 365 days + email the client a receipt
//   - failure: NO retry — alert ops + the assigned rep, leave the invoice failed
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";
import { getStripe, chargeOffSession, addDays, ANNUAL_PLAN_PRICE } from "../_shared/stripe-billing.ts";

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

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log(`[annual-renewal EMAIL QUEUED - no RESEND_API_KEY] to=${to} subject="${subject}"`);
    return { ok: false, detail: "resend credentials missing" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "NewLight <team@newlightgen.com>", to: [to], subject, text, html }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("[annual-renewal Resend error]", res.status, t);
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

  // Auth: cron secret OR admin/operator JWT (same gate as commission billing).
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

  const stripe = await getStripe();
  const nowIso = new Date().toISOString();

  const { data: deals, error: dealsErr } = await supabase
    .from("crm_deals")
    .select("id, client_id, provisioned_client_id, deal_name, billing_cadence, next_charge_at, assigned_user")
    .eq("billing_cadence", "annual")
    .not("next_charge_at", "is", null)
    .lte("next_charge_at", nowIso);
  if (dealsErr) return json({ error: dealsErr.message }, 500);

  const amount = ANNUAL_PLAN_PRICE;
  const amountFmt = `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const results: unknown[] = [];

  for (const deal of deals ?? []) {
    try {
      const billingClientId = deal.provisioned_client_id || deal.client_id;
      if (!billingClientId) { results.push({ deal_id: deal.id, skipped: "no_client" }); continue; }

      const { data: client } = await supabase
        .from("clients")
        .select("id, name, owner_email, stripe_customer_id, stripe_payment_method_id")
        .eq("id", billingClientId)
        .maybeSingle();

      const businessName = client?.name || deal.deal_name || "Client";
      const dueLabel = new Date(deal.next_charge_at).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
      });

      const { data: invoice, error: invErr } = await supabase
        .from("invoices")
        .insert({
          client_id: billingClientId,
          provisioned_client_id: deal.provisioned_client_id ?? null,
          deal_id: deal.id,
          invoice_number: `ANN-${Date.now().toString(36).toUpperCase()}`,
          invoice_type: "annual",
          invoice_status: "pending",
          subtotal_amount: amount,
          tax_amount: 0,
          total_amount: amount,
          amount_paid: 0,
          payment_notes: `Annual plan renewal — 12 months (app included)`,
          issued_at: new Date().toISOString(),
        } as any)
        .select("id, invoice_number")
        .maybeSingle();

      if (invErr || !invoice) {
        results.push({ deal_id: deal.id, skipped: "invoice_error", detail: invErr?.message });
        continue;
      }

      const repEmail = await repEmailFor(supabase, deal.assigned_user ?? null);

      const fail = async (reason: string) => {
        await supabase.from("invoices").update({
          invoice_status: "payment_failed",
          failed_at: new Date().toISOString(),
          failure_reason: reason,
          failure_notification_sent: true,
        }).eq("id", invoice.id);

        const subject = `ACTION NEEDED — Annual renewal charge failed: ${businessName} · ${amountFmt}`;
        const text = [
          `Annual renewal billing failed and was NOT retried.`,
          ``,
          `Client: ${businessName}`,
          `Renewal due: ${dueLabel}`,
          `Amount: ${amountFmt}`,
          `Invoice: ${invoice.invoice_number} (left as payment_failed)`,
          `Reason: ${reason}`,
          ``,
          `A human needs to follow up with the client.`,
        ].join("\n");
        const html = `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#b91c1c;color:#fff;padding:12px 16px;border-radius:8px;font-weight:700;text-align:center;">ANNUAL RENEWAL CHARGE FAILED</div>
    <h1 style="font-size:20px;margin:20px 0 6px;">${businessName}</h1>
    <table style="width:100%;font-size:14px;line-height:1.8;">
      <tr><td style="color:#6b7280;width:150px;">Renewal due</td><td>${dueLabel}</td></tr>
      <tr><td style="color:#6b7280;">Amount</td><td><strong>${amountFmt}</strong></td></tr>
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
        description: `Annual plan renewal — ${businessName}`,
        metadata: { client_id: billingClientId, deal_id: deal.id, invoice_id: invoice.id, kind: "annual_renewal" },
      });

      if (!charge.ok) { await fail(charge.error || "Charge failed"); continue; }

      await supabase.from("invoices").update({
        invoice_status: "paid",
        amount_paid: amount,
        paid_at: new Date().toISOString(),
        payment_method: "stripe",
        stripe_payment_intent_id: charge.payment_intent_id,
      }).eq("id", invoice.id);

      const nextChargeAt = addDays(new Date(deal.next_charge_at), 365).toISOString();
      await supabase.from("crm_deals").update({ next_charge_at: nextChargeAt }).eq("id", deal.id);
      await supabase.from("clients").update({ payment_status: "paid" }).eq("id", billingClientId);

      const nextLabel = new Date(nextChargeAt).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
      });

      let receipt: unknown = { ok: false, detail: "no client email" };
      if (client?.owner_email) {
        const subject = `Payment received — Annual plan renewal (${amountFmt})`;
        const text = [
          `Hi ${businessName},`,
          ``,
          `Your annual plan has been renewed for another 12 months.`,
          ``,
          `Amount charged: ${amountFmt}`,
          `Invoice: ${invoice.invoice_number}`,
          `Next renewal: ${nextLabel}`,
          ``,
          `Thank you,`,
          `NewLight`,
        ].join("\n");
        const html = `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:22px;margin:0 0 16px;">Annual plan renewed</h1>
    <p style="font-size:14px;line-height:1.6;">Hi ${businessName}, your annual plan has been renewed for another 12 months.</p>
    <table style="width:100%;font-size:14px;line-height:1.8;margin-top:12px;">
      <tr><td style="color:#6b7280;width:150px;">Amount charged</td><td><strong>${amountFmt}</strong></td></tr>
      <tr><td style="color:#6b7280;">Invoice</td><td>${invoice.invoice_number}</td></tr>
      <tr><td style="color:#6b7280;">Next renewal</td><td>${nextLabel}</td></tr>
    </table>
    <p style="font-size:13px;color:#6b7280;margin-top:24px;">Thank you,<br/>NewLight</p>
  </div></body></html>`;
        receipt = await sendEmail(client.owner_email, subject, html, text);
      }

      await supabase.from("audit_logs").insert({
        client_id: billingClientId,
        action: "annual_renewal_charged",
        module: "billing",
        status: "success",
        metadata: { deal_id: deal.id, invoice_id: invoice.id, amount, next_charge_at: nextChargeAt },
      });

      results.push({ deal_id: deal.id, invoice_id: invoice.id, ok: true, amount, next_charge_at: nextChargeAt, receipt });
    } catch (e) {
      console.error("[charge-annual-renewals] deal error", deal.id, e);
      results.push({ deal_id: deal.id, error: String((e as Error).message) });
    }
  }

  const summary = {
    due_deals: (deals ?? []).length,
    // deno-lint-ignore no-explicit-any
    charged: results.filter((r: any) => r.ok).length,
    // deno-lint-ignore no-explicit-any
    failed: results.filter((r: any) => r.failed).length,
  };
  console.log("[charge-annual-renewals]", JSON.stringify(summary));
  return json({ ...summary, results });
});
