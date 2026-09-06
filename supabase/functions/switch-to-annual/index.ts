// Switch a client's billing to the flat annual plan ($29,997/year).
//
// Two entry points:
//  a) Dashboard  — { client_id } + Authorization bearer of a user with access to that client.
//                  Deal is found via crm_deals.provisioned_client_id.
//  b) Form 3     — { share_token } of the pay & sign envelope (no auth required, token is the secret).
//
// Creates a real Stripe one-time checkout session (mode: "payment").
// The actual state change happens in stripe-webhook on checkout.session.completed
// (metadata.annual_switch === "true"): cancels any monthly subscription and stamps
// billing_cadence / annual_started_at / app_store_complimentary on the deal.
//
// initial_fee is never read, reduced, or written here.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getStripe, ensureStripeCustomer } from "../_shared/stripe-billing.ts";

export const ANNUAL_PRICE = 29997;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const clientId: string | undefined = body?.client_id;
    const shareToken: string | undefined = body?.share_token;
    if (!clientId && !shareToken) return json({ error: "client_id or share_token required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // deno-lint-ignore no-explicit-any
    let deal: any = null;
    let recipientEmail: string | null = null;

    if (shareToken) {
      const { data: envelope } = await supabase
        .from("document_envelopes")
        .select("id, related_type, related_id, recipient_email")
        .eq("share_token", shareToken)
        .maybeSingle();
      if (!envelope?.related_id) return json({ error: "Envelope not found" }, 404);
      recipientEmail = envelope.recipient_email ?? null;
      const { data: d } = await supabase
        .from("crm_deals")
        .select("id, client_id, provisioned_client_id, deal_name, pricing_model, billing_cadence, stripe_subscription_id")
        .eq("id", envelope.related_id)
        .maybeSingle();
      deal = d;
    } else {
      // Dashboard path — require an authenticated user with access to the client.
      const authHeader = req.headers.get("Authorization") || "";
      if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
      const anon = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: authData } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
      const userId = authData?.user?.id;
      if (!userId) return json({ error: "Unauthorized" }, 401);
      const { data: allowed } = await supabase.rpc("user_can_access_client", {
        _user_id: userId,
        _client_id: clientId,
      });
      if (!allowed) return json({ error: "Forbidden" }, 403);
      recipientEmail = authData?.user?.email ?? null;

      const { data: d } = await supabase
        .from("crm_deals")
        .select("id, client_id, provisioned_client_id, deal_name, pricing_model, billing_cadence, stripe_subscription_id")
        .eq("provisioned_client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      deal = d;
    }

    if (!deal) return json({ error: "No deal found for this client" }, 404);
    if (deal.billing_cadence === "annual") return json({ error: "Already on annual billing" }, 409);

    const stripe = await getStripe();
    if (!stripe) return json({ error: "Stripe not configured" }, 503);

    const targetClientId = deal.provisioned_client_id || deal.client_id;
    const { data: client } = targetClientId
      ? await supabase.from("clients").select("name, owner_email").eq("id", targetClientId).maybeSingle()
      : { data: null };

    const customerId = await ensureStripeCustomer(stripe, supabase, {
      clientId: deal.client_id,
      email: recipientEmail || client?.owner_email || null,
      name: client?.name || deal.deal_name || null,
    });

    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    let originBase = "";
    try { originBase = origin ? new URL(origin).origin : ""; } catch { originBase = ""; }
    const returnPath = shareToken ? `/pay-sign/${shareToken}` : "/billing";
    const successUrl = `${originBase}${returnPath}?annual=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${originBase}${returnPath}?annual=cancelled`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `${client?.name || deal.deal_name || "NewLight"} — Annual Plan (12 months, app included)`,
          },
          unit_amount: ANNUAL_PRICE * 100,
        },
        quantity: 1,
      }],
      ...(customerId ? { customer: customerId } : { customer_email: recipientEmail || undefined }),
      payment_intent_data: { setup_future_usage: "off_session" },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { annual_switch: "true", deal_id: deal.id },
    });

    return json({ url: session.url, session_id: session.id, amount: ANNUAL_PRICE });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
