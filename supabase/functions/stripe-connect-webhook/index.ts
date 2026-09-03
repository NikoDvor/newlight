// Stripe Connect webhook for sub-account (client-owned) payment accounts.
//
// IMPORTANT: This is a SEPARATE webhook endpoint in the Stripe dashboard from NewLight's own
// billing webhook (stripe-webhook). It must be configured on its own endpoint with its own
// signing secret, stored as STRIPE_CONNECT_WEBHOOK_SECRET — do NOT reuse NewLight's
// STRIPE_WEBHOOK_SECRET here.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET");
  if (!stripeSecret || !webhookSecret) {
    console.error("Stripe Connect webhook not configured");
    return new Response("Not configured", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const rawBody = await req.text();

  try {
    const { Stripe } = await import("https://esm.sh/stripe@14.21.0?target=deno");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });

    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);

    if (event.type === "account.updated") {
      const account: any = event.data.object;
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { error } = await supabase
        .from("client_payment_settings")
        .update({
          stripe_charges_enabled: Boolean(account?.charges_enabled),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_connect_account_id", account?.id);
      if (error) console.error("Failed to update client_payment_settings:", error);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("stripe-connect-webhook error:", e?.message || e);
    return new Response(`Webhook Error: ${e?.message || "invalid"}`, { status: 400 });
  }
});
