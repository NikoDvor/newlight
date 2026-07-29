import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";
import { notifyPaidSignedIfTransition } from "../_shared/paid-signed-notify.ts";
import { sendPaymentConfirmation } from "../_shared/pay-sign-notify.ts";
import {
  ensureStripeCustomer,
  savePaymentMethodFromSession,
  createRetainerSubscription,
} from "../_shared/stripe-billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
          if (deal && deal.pricing_model === "retainer" && effectiveCustomerId) {
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
