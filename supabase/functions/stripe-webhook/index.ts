import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";
import {
  ensureStripeCustomer,
  savePaymentMethodFromSession,
} from "../_shared/stripe-billing.ts";
import { markRowPaid, failRow } from "../_shared/nlBilling.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const OPS_EMAIL_TO = "team@newlightgen.com";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://www.newlight-app.com";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendAdhocEmail(to: (string | null | undefined)[], subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  const recipients = to.filter((e): e is string => !!e);
  if (!recipients.length) return;
  if (!key) {
    console.log(`[stripe-webhook adhoc EMAIL QUEUED - no RESEND_API_KEY] to=${recipients.join(",")} subject="${subject}"`);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "NewLight <team@newlightgen.com>", to: recipients, subject, html }),
    });
    if (!res.ok) console.error("[stripe-webhook adhoc email] failed", await res.text());
  } catch (e) {
    console.error("[stripe-webhook adhoc email] error", e);
  }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeSecret || !webhookSecret) {
    console.error("Stripe secrets not configured");
    return json({ error: "Stripe not configured" }, 503);
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "No signature" }, 400);

  const body = await req.text();

  // Verify Stripe signature
  let event: any;
  let stripe: any;
  try {
    const { Stripe } = await import("https://esm.sh/stripe@14.21.0?target=deno");
    stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return json({ error: "Invalid signature" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = session.customer;
        const clientEmail = session.customer_details?.email || session.customer_email;
        const paySignInvoiceId = session.metadata?.invoice_id as string | undefined;

        // ---- Package billing (Nov 2026): save a payment method (setup mode) ----
        if (session.metadata?.nl_setup === "true") {
          try {
            const dealId = session.metadata?.deal_id as string;
            const realClientId = (session.metadata?.client_id as string) || null;
            const si = typeof session.setup_intent === "string" ? await stripe.setupIntents.retrieve(session.setup_intent) : session.setup_intent;
            const pmId = typeof si?.payment_method === "string" ? si.payment_method : si?.payment_method?.id;
            const cust = typeof customerId === "string" ? customerId : null;
            if (pmId && cust) {
              await stripe.customers.update(cust, { invoice_settings: { default_payment_method: pmId } });
              if (realClientId) await supabase.from("clients").update({ stripe_customer_id: cust, stripe_payment_method_id: pmId }).eq("id", realClientId);
              if (dealId) await supabase.from("crm_deals").update({ recurring_method_saved_at: new Date().toISOString() }).eq("id", dealId);
            }
          } catch (e) { console.error("[stripe-webhook] nl_setup failed", e); }
          break;
        }

        // ---- Package billing: first payment through Pay & Sign ----
        if (session.metadata?.nl_schedule_id) {
          try {
            const { data: row } = await supabase.from("nl_billing_schedule").select("*").eq("id", session.metadata.nl_schedule_id).maybeSingle();
            const { data: deal } = row ? await supabase.from("crm_deals").select("*").eq("id", row.deal_id).maybeSingle() : { data: null };
            if (row && deal) {
              const realClientId = deal.provisioned_client_id || deal.client_id;
              const cust = await ensureStripeCustomer(stripe, supabase, { clientId: realClientId, email: clientEmail, existingCustomerId: typeof customerId === "string" ? customerId : null });
              if (cust) {
                const pm = await savePaymentMethodFromSession(stripe, supabase, session, cust, realClientId);
                if (pm) await supabase.from("crm_deals").update({ recurring_method_saved_at: new Date().toISOString() }).eq("id", deal.id);
              }
              const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
              const collected = (session.amount_total ?? 0) / 100;
              if (session.payment_status === "paid" && Math.abs(collected - Number(row.amount)) > 0.01) {
                await supabase.from("audit_logs").insert({ client_id: realClientId ?? null, action: "stripe_amount_mismatch", module: "billing", status: "error", metadata: { session_id: session.id, schedule_id: row.id, collected, expected: Number(row.amount) } });
                await sendAdhocEmail([OPS_EMAIL_TO], "ACTION NEEDED — payment amount mismatch", `<p>Stripe collected $${collected.toFixed(2)} but "${row.label}" is $${Number(row.amount).toFixed(2)}. Not marked paid. Session ${session.id}.</p>`);
              } else if (session.payment_status === "paid") {
                await supabase.from("nl_billing_schedule").update({ stripe_payment_intent_id: piId ?? null, attempts: 1, last_attempt_at: new Date().toISOString() }).eq("id", row.id);
                if (row.status !== "paid") await markRowPaid(supabase, row, deal, { via: "stripe" });
              } else {
                // Bank debit (ACH) is still clearing — payment_intent.succeeded finishes it.
                await supabase.from("nl_billing_schedule").update({ status: "processing", stripe_payment_intent_id: piId ?? null, attempts: 1, last_attempt_at: new Date().toISOString() }).eq("id", row.id);
              }
            }
          } catch (e) { console.error("[stripe-webhook] nl first payment failed", e); }
          break;
        }

        // ---- Ad-hoc invoice payment (standalone one-off charge) ----
        if (session.metadata?.adhoc === "true") {
          const adhocInvoiceId = session.metadata?.invoice_id as string | undefined;
          if (adhocInvoiceId) {
            const amountPaid = (session.amount_total ?? 0) / 100;
            const { data: inv } = await supabase
              .from("invoices")
              .select("id, invoice_status, client_id, payment_notes, total_amount")
              .eq("id", adhocInvoiceId)
              .maybeSingle();

            if (inv && session.payment_status === "paid" && Math.abs(amountPaid - Number(inv.total_amount || 0)) > 0.01) {
              await supabase.from("audit_logs").insert({ client_id: inv.client_id ?? null, action: "stripe_amount_mismatch", module: "billing", status: "error", metadata: { session_id: session.id, invoice_id: adhocInvoiceId, collected: amountPaid, expected: Number(inv.total_amount || 0) } });
              await sendAdhocEmail([OPS_EMAIL_TO], "ACTION NEEDED — payment amount mismatch", `<p>Stripe collected $${amountPaid.toFixed(2)} for an invoice of $${Number(inv.total_amount || 0).toFixed(2)}. Not marked paid. Session ${session.id}.</p>`);
            } else if (inv && inv.invoice_status !== "paid") {
              await supabase.from("invoices").update({
                invoice_status: "paid",
                amount_paid: amountPaid,
                paid_at: new Date().toISOString(),
                payment_method: "stripe",
                stripe_checkout_session_id: session.id,
              }).eq("id", adhocInvoiceId);

              let clientName: string | null = null;
              let ownerEmail: string | null = null;
              if (inv.client_id) {
                const { data: c } = await supabase
                  .from("clients").select("business_name, owner_email").eq("id", inv.client_id).maybeSingle();
                clientName = c?.business_name ?? null;
                ownerEmail = c?.owner_email ?? null;
              }

              const desc = inv.payment_notes || "Ad-hoc invoice";
              const amountStr = `$${amountPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              await sendAdhocEmail(
                [ownerEmail || clientEmail, "team@newlightgen.com"],
                `Payment received — ${desc}`,
                `<p>Payment received.</p><p><strong>${desc}</strong><br/>Amount: ${amountStr}${clientName ? `<br/>Client: ${clientName}` : ""}</p><p>Thank you.<br/>NewLight</p>`,
              );
            }

            await supabase.from("audit_logs").insert({
              client_id: inv?.client_id ?? null,
              action: "adhoc_invoice_paid",
              module: "billing",
              status: "success",
              metadata: { session_id: session.id, invoice_id: adhocInvoiceId },
            });
          }
          break;
        }


        // ---- Invoice payment (manual invoices from Close Center / Billing) ----
        // The amount Stripe collected must match the invoice. A session for the wrong amount never marks it paid.
        if (paySignInvoiceId) {
          const { data: invoice } = await supabase
            .from("invoices")
            .select("id, invoice_status, client_id, total_amount, invoice_number")
            .eq("id", paySignInvoiceId)
            .maybeSingle();
          const collected = (session.amount_total ?? 0) / 100;
          if (!invoice) {
            console.error("[stripe-webhook] invoice not found", paySignInvoiceId);
            break;
          }
          if (session.payment_status !== "paid") break;
          if (Math.abs(collected - Number(invoice.total_amount || 0)) > 0.01) {
            await supabase.from("audit_logs").insert({
              client_id: invoice.client_id ?? null,
              action: "stripe_amount_mismatch",
              module: "billing",
              status: "error",
              metadata: { session_id: session.id, invoice_id: invoice.id, collected, expected: Number(invoice.total_amount || 0) },
            });
            await sendAdhocEmail([OPS_EMAIL_TO], `ACTION NEEDED — payment amount mismatch (${invoice.invoice_number || invoice.id})`,
              `<p>Stripe collected $${collected.toFixed(2)} for an invoice of $${Number(invoice.total_amount || 0).toFixed(2)}. The invoice was NOT marked paid. Session: ${session.id}</p>`);
            break;
          }
          if (invoice.invoice_status !== "paid") {
            await supabase.from("invoices").update({
              invoice_status: "paid",
              amount_paid: collected,
              paid_at: new Date().toISOString(),
              payment_method: "stripe",
              stripe_checkout_session_id: session.id,
            }).eq("id", invoice.id);
          }
          await supabase.from("audit_logs").insert({
            client_id: invoice.client_id ?? null,
            action: "invoice_payment_confirmed",
            module: "billing",
            status: "success",
            metadata: { session_id: session.id, invoice_id: invoice.id },
          });
          break;
        }

        await supabase.from("audit_logs").insert({
          action: "stripe_checkout_unmatched",
          module: "billing",
          status: "success",
          metadata: { session_id: session.id, note: "no known metadata; ignored" },
        });
        break;
      }

      // ---- Package billing: off-session + ACH outcomes ----
      case "payment_intent.succeeded":
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const sid = pi.metadata?.nl_schedule_id as string | undefined;
        if (!sid) { console.log(`[stripe-webhook] ${event.type} without nl_schedule_id`); break; }
        const { data: row } = await supabase.from("nl_billing_schedule").select("*").eq("id", sid).maybeSingle();
        if (!row || row.status === "paid") break;
        const { data: deal } = await supabase.from("crm_deals").select("*").eq("id", row.deal_id).maybeSingle();
        if (!deal) break;
        if (event.type === "payment_intent.succeeded") {
          const got = Number(pi.amount_received ?? pi.amount ?? 0) / 100;
          if (Math.abs(got - Number(row.amount)) > 0.01) {
            await supabase.from("audit_logs").insert({ client_id: deal.provisioned_client_id ?? null, action: "stripe_amount_mismatch", module: "billing", status: "error", metadata: { payment_intent: pi.id, schedule_id: row.id, collected: got, expected: Number(row.amount) } });
            await sendAdhocEmail([OPS_EMAIL_TO], "ACTION NEEDED — payment amount mismatch", `<p>Stripe collected $${got.toFixed(2)} but the scheduled charge "${row.label}" is $${Number(row.amount).toFixed(2)}. Not marked paid. PaymentIntent ${pi.id}.</p>`);
            break;
          }
          await markRowPaid(supabase, { ...row, stripe_payment_intent_id: pi.id }, deal, { via: "stripe" });
        } else if (row.status === "processing") {
          // Only async (bank debit) failures land here; card failures were handled when charged.
          const reason = pi.last_payment_error?.message || "Payment failed";
          await failRow(supabase, { ...row, attempts: Math.max(1, row.attempts || 1) }, deal, reason);
        }
        break;
      }

      // ---- Refunds and disputes: flag for a human; commissions must be reversed in the ledger ----
      case "charge.refunded":
      case "charge.dispute.created": {
        const obj = event.data.object;
        const piId = typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent?.id;
        let label = "";
        if (piId) {
          const { data: row } = await supabase.from("nl_billing_schedule").select("id, label, deal_id, amount").eq("stripe_payment_intent_id", piId).maybeSingle();
          if (row) label = `${row.label} ($${Number(row.amount).toFixed(2)}, deal ${row.deal_id})`;
        }
        await supabase.from("audit_logs").insert({
          action: event.type === "charge.refunded" ? "stripe_charge_refunded" : "stripe_dispute_opened",
          module: "billing",
          status: "error",
          metadata: { payment_intent: piId ?? null, charge: obj.id, schedule: label || null },
        });
        await sendAdhocEmail([OPS_EMAIL_TO],
          `ACTION NEEDED — ${event.type === "charge.refunded" ? "refund" : "dispute"} on ${label || "a payment"}`,
          `<p>Stripe reported a ${event.type === "charge.refunded" ? "refund" : "chargeback"}. ${label ? `Payment: ${label}.` : ""} Reverse the rep commission in Commissions if one was earned on it. Stripe charge: ${obj.id}.</p>`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("Webhook handler error:", msg);
    return json({ error: msg }, 500);
  }
});
