import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

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
  try {
    const { Stripe } = await import("https://esm.sh/stripe@14.21.0?target=deno");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });
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
