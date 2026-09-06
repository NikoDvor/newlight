import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";
import { notifyPaidSignedIfTransition } from "../_shared/paid-signed-notify.ts";
import { sendPaymentConfirmation } from "../_shared/pay-sign-notify.ts";
import {
  ensureStripeCustomer,
  savePaymentMethodFromSession,
  createRetainerSubscription,
  applyAnnualSwitch,
} from "../_shared/stripe-billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

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
        const subscriptionId = session.subscription;
        const clientEmail = session.customer_details?.email || session.customer_email;
        const paySignInvoiceId = session.metadata?.invoice_id as string | undefined;

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

            if (inv && inv.invoice_status !== "paid") {
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


        // ---- Annual plan switch ($29,997 one-time, dashboard or Form 3) ----
        if (session.metadata?.annual_switch === "true") {
          const annualDealId = session.metadata?.deal_id as string | undefined;
          if (annualDealId) {
            // Save the card so next year's renewal can be charged off-session.
            let savedPaymentMethodId: string | null = null;
            try {
              const { data: annualDeal } = await supabase
                .from("crm_deals")
                .select("id, client_id, provisioned_client_id")
                .eq("id", annualDealId)
                .maybeSingle();
              const annualClientId = annualDeal?.provisioned_client_id || annualDeal?.client_id || null;
              const annualCustomerId = await ensureStripeCustomer(stripe, supabase, {
                clientId: annualClientId,
                email: clientEmail,
                existingCustomerId: typeof customerId === "string" ? customerId : null,
              });
              if (annualCustomerId) {
                savedPaymentMethodId = await savePaymentMethodFromSession(
                  stripe, supabase, session, annualCustomerId, annualClientId,
                );
              }
            } catch (e) {
              console.error("[stripe-webhook] annual switch card save failed", e);
            }

            const res = await applyAnnualSwitch(stripe, supabase, annualDealId);
            console.log("[stripe-webhook] annual switch:", JSON.stringify(res));
            await supabase.from("audit_logs").insert({
              action: "annual_billing_activated",
              module: "billing",
              status: "success",
              metadata: {
                session_id: session.id,
                deal_id: annualDealId,
                card_saved: Boolean(savedPaymentMethodId),
                ...res,
              },
            });
          }
          break;
        }

        // ---- Pay & Sign (Form 3) initial-fee payment: authoritative confirmation ----
        if (paySignInvoiceId) {
          const dealId = session.metadata?.deal_id as string | undefined;
          const envelopeId = session.metadata?.envelope_id as string | undefined;

          const { data: invoice } = await supabase
            .from("invoices")
            .select("id, invoice_status, client_id")
            .eq("id", paySignInvoiceId)
            .maybeSingle();

          if (invoice && invoice.invoice_status !== "paid") {
            await supabase.from("invoices").update({
              invoice_status: "paid",
              amount_paid: (session.amount_total ?? 0) / 100,
              paid_at: new Date().toISOString(),
              payment_method: "stripe",
              stripe_checkout_session_id: session.id,
            }).eq("id", paySignInvoiceId);
          }

          let deal: any = null;
          if (dealId) {
            const { data: d } = await supabase
              .from("crm_deals")
              .select("id, client_id, deal_name, pricing_model, initial_fee, recurring_fee, commission_rate, stripe_subscription_id, pay_sign_status")
              .eq("id", dealId)
              .maybeSingle();
            deal = d;
          }

          // Save the card for future automatic charges (retainer + commission).
          let effectiveCustomerId: string | null = typeof customerId === "string" ? customerId : null;
          let paymentMethodId: string | null = null;
          try {
            effectiveCustomerId = await ensureStripeCustomer(stripe, supabase, {
              clientId: deal?.client_id ?? invoice?.client_id ?? null,
              email: clientEmail,
              existingCustomerId: effectiveCustomerId,
            });
            if (effectiveCustomerId) {
              paymentMethodId = await savePaymentMethodFromSession(
                stripe, supabase, session, effectiveCustomerId, deal?.client_id ?? invoice?.client_id ?? null,
              );
            }
          } catch (e) {
            console.error("[stripe-webhook] card save failed", e);
          }

          // Retainer → create the real recurring Stripe subscription.
          if (deal && deal.pricing_model === "retainer" && effectiveCustomerId && session.metadata?.annual !== "true") {
            try {
              let clientName: string | null = null;
              if (deal.client_id) {
                const { data: c } = await supabase.from("clients").select("name").eq("id", deal.client_id).maybeSingle();
                clientName = c?.name ?? null;
              }
              const subRes = await createRetainerSubscription(stripe, supabase, {
                deal, customerId: effectiveCustomerId, paymentMethodId, clientName,
              });
              console.log("[stripe-webhook] retainer subscription:", JSON.stringify(subRes));
            } catch (e) {
              console.error("[stripe-webhook] subscription creation failed", e);
            }
          }

          // Form 3 annual cadence — stamp the annual fields on the deal.
          if (session.metadata?.annual === "true" && dealId) {
            try {
              const res = await applyAnnualSwitch(stripe, supabase, dealId);
              console.log("[stripe-webhook] form3 annual:", JSON.stringify(res));
            } catch (e) {
              console.error("[stripe-webhook] form3 annual switch failed", e);
            }
          }

          // Resolve envelope state + a public Pay & Sign link for the emails.
          let envStatus: string | null = null;
          let paySignUrl: string | undefined;
          if (envelopeId) {
            const { data: env } = await supabase
              .from("document_envelopes").select("status, share_token").eq("id", envelopeId).maybeSingle();
            envStatus = env?.status ?? null;
            if (env?.share_token) paySignUrl = `${APP_BASE_URL}/pay-sign/${env.share_token}`;
          }

          // Idempotent notifications (guarded by invoices.payment_confirmation_sent).
          if (dealId) {
            await sendPaymentConfirmation(supabase, dealId, {
              invoiceId: paySignInvoiceId,
              payerEmail: clientEmail || null,
              paySignUrl,
            });

            // If the agreement is already signed, transition + notify (guarded).
            if (envStatus === "signed") {
              await notifyPaidSignedIfTransition(supabase, dealId, { envelopeId, paySignUrl });
            } else {
              await supabase.from("crm_deals")
                .update({ pay_sign_status: "paid" })
                .eq("id", dealId)
                .neq("pay_sign_status", "paid_signed");
            }
          }

          await supabase.from("audit_logs").insert({
            client_id: deal?.client_id ?? invoice?.client_id ?? null,
            action: "pay_sign_payment_confirmed",
            module: "billing",
            status: "success",
            metadata: { session_id: session.id, invoice_id: paySignInvoiceId, deal_id: dealId ?? null },
          });
          break;
        }

        // ---- Existing client billing-portal checkout flow ----
        if (clientEmail) {
          await supabase.from("clients")
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              stripe_status: "active",
            })
            .eq("owner_email", clientEmail);
        }

        await supabase.from("audit_logs").insert({
          action: "stripe_checkout_completed",
          module: "billing",
          status: "success",
          metadata: { customer_id: customerId, session_id: session.id, email: clientEmail },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        await supabase.from("clients")
          .update({ stripe_status: "active" })
          .eq("stripe_customer_id", customerId);

        // Retainer subscriptions: keep the deal's next_charge_at aligned with
        // Stripe's own schedule — the period just paid ends when the next one starts.
        const subId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id ?? null;
        const periodEnd = invoice.period_end ?? invoice.lines?.data?.[0]?.period?.end ?? null;
        if (subId && periodEnd) {
          const { data: subDeal } = await supabase
            .from("crm_deals").select("id").eq("stripe_subscription_id", subId).maybeSingle();
          if (subDeal?.id) {
            await supabase.from("crm_deals")
              .update({ next_charge_at: new Date(periodEnd * 1000).toISOString() })
              .eq("id", subDeal.id);
          }
        }


        await supabase.from("audit_logs").insert({
          action: "stripe_payment_succeeded",
          module: "billing",
          status: "success",
          metadata: { customer_id: customerId, invoice_id: invoice.id, amount: invoice.amount_paid },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        await supabase.from("clients")
          .update({ stripe_status: "past_due" })
          .eq("stripe_customer_id", customerId);

        // ---- Alert ops + the assigned rep (mirrors charge-annual-renewals' fail()) ----
        try {
          const failedSubId = typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id ?? null;

          let failedDeal: any = null;
          if (failedSubId) {
            const { data: d } = await supabase
              .from("crm_deals")
              .select("id, deal_name, client_id, provisioned_client_id, recurring_fee, assigned_user")
              .eq("stripe_subscription_id", failedSubId)
              .maybeSingle();
            failedDeal = d;
          }

          let businessName = failedDeal?.deal_name || null;
          const nameClientId = failedDeal?.provisioned_client_id || failedDeal?.client_id || null;
          if (nameClientId) {
            const { data: c } = await supabase
              .from("clients").select("name, business_name").eq("id", nameClientId).maybeSingle();
            businessName = c?.business_name || c?.name || businessName;
          }
          if (!businessName) {
            const { data: c2 } = await supabase
              .from("clients").select("name, business_name").eq("stripe_customer_id", customerId).maybeSingle();
            businessName = c2?.business_name || c2?.name || "Unknown client";
          }

          const amountDue = typeof invoice.amount_due === "number" ? invoice.amount_due / 100 : null;
          const amountFmt = amountDue !== null
            ? `$${amountDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : (failedDeal?.recurring_fee
              ? `$${Number(failedDeal.recurring_fee).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "amount unavailable");

          let repEmail: string | null = null;
          if (failedDeal?.assigned_user) {
            const { data: ep } = await supabase
              .from("employee_profiles").select("email").eq("user_id", failedDeal.assigned_user).maybeSingle();
            repEmail = ep?.email ?? null;
            if (!repEmail) {
              const { data: wu } = await supabase
                .from("workspace_users").select("email").eq("user_id", failedDeal.assigned_user).maybeSingle();
              repEmail = wu?.email ?? null;
            }
          }

          const subject = `ACTION NEEDED — Retainer payment failed: ${businessName} · ${amountFmt}`;
          const text = [
            `A retainer subscription payment failed in Stripe.`,
            ``,
            `Client: ${businessName}`,
            `Amount: ${amountFmt}`,
            `Stripe invoice: ${invoice.id}`,
            failedSubId ? `Subscription: ${failedSubId}` : ``,
            ``,
            `Stripe will retry automatically on its own dunning schedule — no manual retry is needed,`,
            `but a human should be aware and follow up with the client about their card.`,
          ].filter(Boolean).join("\n");
          const html = `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#b91c1c;color:#fff;padding:12px 16px;border-radius:8px;font-weight:700;text-align:center;">RETAINER PAYMENT FAILED</div>
    <h1 style="font-size:20px;margin:20px 0 6px;">${businessName}</h1>
    <table style="width:100%;font-size:14px;line-height:1.8;">
      <tr><td style="color:#6b7280;width:150px;">Amount</td><td><strong>${amountFmt}</strong></td></tr>
      <tr><td style="color:#6b7280;">Stripe invoice</td><td>${invoice.id}</td></tr>
      ${failedSubId ? `<tr><td style="color:#6b7280;">Subscription</td><td>${failedSubId}</td></tr>` : ""}
    </table>
    <p style="font-size:13px;color:#6b7280;margin-top:24px;">Stripe will retry automatically per its own dunning schedule. Please follow up with the client about their payment method.</p>
  </div></body></html>`;

          await sendAdhocEmail([OPS_EMAIL_TO], subject, html);
          if (repEmail && repEmail !== OPS_EMAIL_TO) await sendAdhocEmail([repEmail], subject, html);
        } catch (e) {
          console.error("[stripe-webhook] payment_failed alerting error", e);
        }

        await supabase.from("audit_logs").insert({
          action: "stripe_payment_failed",
          module: "billing",
          status: "error",
          metadata: { customer_id: customerId, invoice_id: invoice.id },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        await supabase.from("clients")
          .update({ stripe_status: "cancelled" })
          .eq("stripe_customer_id", customerId);

        await supabase.from("audit_logs").insert({
          action: "stripe_subscription_cancelled",
          module: "billing",
          status: "success",
          metadata: { customer_id: customerId, subscription_id: subscription.id },
        });
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
