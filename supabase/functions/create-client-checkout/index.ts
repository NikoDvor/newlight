// Public, envelope-scoped Stripe Checkout for client-owned payment requests.
// Routes funds to the sub-account's own Stripe Connect account (destination charge).
// Fully separate from NewLight's own billing functions.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) return json({ error: "Stripe not configured" }, 503);

    const body = await req.json().catch(() => ({}));
    const { share_token, payment_request_id, return_url } = body ?? {};
    if (!share_token || !payment_request_id) {
      return json({ error: "share_token and payment_request_id are required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Envelope scope check — the token must resolve to a client_agreement envelope.
    const { data: envelope } = await supabase
      .from("document_envelopes")
      .select("id, envelope_type")
      .eq("share_token", share_token)
      .maybeSingle();
    if (!envelope) return json({ error: "Envelope not found" }, 404);
    if (envelope.envelope_type !== "client_agreement") {
      return json({ error: "This endpoint only handles client_agreement envelopes" }, 400);
    }

    // The payment request must belong to that exact envelope.
    const { data: pr } = await supabase
      .from("client_payment_requests")
      .select("id, client_id, envelope_id, amount, currency, method, status, payer_email, payer_name")
      .eq("id", payment_request_id)
      .maybeSingle();
    if (!pr || pr.envelope_id !== envelope.id) return json({ error: "Payment request not found" }, 404);
    if (pr.method !== "stripe") return json({ error: "This payment request is not a card payment" }, 400);
    if (pr.status === "paid") return json({ error: "This payment has already been made" }, 400);

    const { data: settings } = await supabase
      .from("client_payment_settings")
      .select("stripe_connect_account_id, stripe_charges_enabled")
      .eq("client_id", pr.client_id)
      .maybeSingle();

    if (!settings?.stripe_charges_enabled || !settings?.stripe_connect_account_id) {
      return json({ error: "Card payments are not active for this business yet" }, 400);
    }

    const base = typeof return_url === "string" && return_url.startsWith("http")
      ? return_url
      : `https://newlight-app.com/close-and-sign/${share_token}`;

    const { Stripe } = await import("https://esm.sh/stripe@14.21.0?target=deno");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: pr.payer_email || undefined,
      line_items: [
        {
          price_data: {
            currency: (pr.currency || "usd").toLowerCase(),
            product_data: { name: "Payment for agreement" },
            unit_amount: Math.round(Number(pr.amount) * 100),
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        transfer_data: { destination: settings.stripe_connect_account_id },
      },
      metadata: { payment_request_id: pr.id, envelope_id: envelope.id },
      success_url: `${base}?payment=success`,
      cancel_url: `${base}?payment=cancelled`,
    });

    return json({ ok: true, url: session.url });
  } catch (e: any) {
    console.error("create-client-checkout error:", e);
    return json({ error: e?.message || "Unexpected error" }, 500);
  }
});
