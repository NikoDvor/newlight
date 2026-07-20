// Public edge function that resolves a Pay & Sign envelope by share_token
// and (on demand) creates an invoice + Stripe checkout session for the linked deal.
// No JWT required — the share_token itself is the capability.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";
import { notifyPaidSignedIfTransition } from "../_shared/paid-signed-notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const method = req.method;

  let body: any = {};
  if (method === "POST") {
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  }
  const share_token = body.share_token || url.searchParams.get("token");
  const action = body.action || "context";

  if (!share_token || typeof share_token !== "string") {
    return json({ error: "share_token is required" }, 400);
  }

  // Look up the envelope
  const { data: envelope, error: envErr } = await supabase
    .from("document_envelopes")
    .select("id, client_id, envelope_type, title, status, related_type, related_id, viewed_at, recipient_name, recipient_email")
    .eq("share_token", share_token)
    .maybeSingle();
  if (envErr) return json({ error: envErr.message }, 500);
  if (!envelope) return json({ error: "Envelope not found" }, 404);

  // Resolve linked deal + client + invoice
  let deal: any = null;
  let invoice: any = null;
  let client: any = null;

  if (envelope.related_type === "crm_deal" && envelope.related_id) {
    const { data: d } = await supabase
      .from("crm_deals")
      .select("id, client_id, deal_name, initial_fee, pricing_model, recurring_fee, commission_rate, payment_invoice_id, pay_sign_status, contact_id")
      .eq("id", envelope.related_id)
      .maybeSingle();
    deal = d;
    if (deal?.payment_invoice_id) {
      const { data: inv } = await supabase
        .from("invoices")
        .select("id, invoice_number, total_amount, invoice_status, payment_link_url, paid_at, stripe_checkout_session_id")
        .eq("id", deal.payment_invoice_id)
        .maybeSingle();
      invoice = inv;
    }
  }

  if (envelope.client_id) {
    const { data: c } = await supabase
      .from("clients")
      .select("id, name")
      .eq("id", envelope.client_id)
      .maybeSingle();
    client = c;
  }

  if (action === "context") {
    // Also fetch items for the sign panel
    const { data: items } = await supabase
      .from("document_envelope_items")
      .select("id, document_name, document_url, display_order")
      .eq("envelope_id", envelope.id)
      .order("display_order");
    // Mark as viewed (first hit only)
    if (!envelope.viewed_at) {
      await supabase.from("document_envelopes")
        .update({ viewed_at: new Date().toISOString(), status: envelope.status === "sent" ? "viewed" : envelope.status })
        .eq("id", envelope.id);
    }
    return json({ envelope, deal, invoice, client, items: items || [] });
  }

  if (action === "create_payment") {
    if (!deal) return json({ error: "No deal linked to envelope" }, 400);
    const initialFee = Number(deal.initial_fee ?? 0);
    if (!(initialFee > 0)) return json({ error: "No initial fee set on the deal" }, 400);

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) return json({ error: "Stripe not configured" }, 503);

    // Create invoice row if none exists
    let invId = deal.payment_invoice_id as string | null;
    if (!invId) {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const { data: newInv, error: invErr } = await supabase
        .from("invoices")
        .insert({
          client_id: deal.client_id,
          invoice_number: invoiceNumber,
          invoice_type: "initial_fee",
          invoice_status: "pending",
          subtotal_amount: initialFee,
          tax_amount: 0,
          total_amount: initialFee,
          amount_paid: 0,
          issued_at: new Date().toISOString(),
        } as any)
        .select("id")
        .single();
      if (invErr) return json({ error: invErr.message }, 500);
      invId = newInv.id;
      await supabase.from("crm_deals").update({ payment_invoice_id: invId }).eq("id", deal.id);
    }

    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    let originBase = "";
    try { originBase = origin ? new URL(origin).origin : ""; } catch { originBase = ""; }
    const successUrl = `${originBase}/pay-sign/${share_token}?payment=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${originBase}/pay-sign/${share_token}?payment=cancelled`;

    const { Stripe } = await import("https://esm.sh/stripe@14.21.0?target=deno");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `${client?.name || deal.deal_name || "NewLight"} — Initial Fee` },
          unit_amount: Math.round(initialFee * 100),
        },
        quantity: 1,
      }],
      customer_email: envelope.recipient_email || undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { invoice_id: invId!, deal_id: deal.id, envelope_id: envelope.id },
    });

    await supabase.from("invoices")
      .update({ payment_link_url: session.url, stripe_checkout_session_id: session.id })
      .eq("id", invId!);

    return json({ url: session.url, session_id: session.id, invoice_id: invId });
  }

  if (action === "mark_paid") {
    // Manual mark-paid path for admin polling; verifies via session id if provided
    const session_id = body.session_id;
    if (!deal?.payment_invoice_id) return json({ error: "No invoice linked" }, 400);
    if (!session_id) return json({ error: "session_id required" }, 400);

    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) return json({ error: "Stripe not configured" }, 503);

    const { Stripe } = await import("https://esm.sh/stripe@14.21.0?target=deno");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });
    const sess = await stripe.checkout.sessions.retrieve(session_id);
    if (sess.payment_status !== "paid") return json({ error: "Session not paid", payment_status: sess.payment_status }, 409);

    await supabase.from("invoices").update({
      invoice_status: "paid",
      amount_paid: (sess.amount_total ?? 0) / 100,
      paid_at: new Date().toISOString(),
      payment_method: "stripe",
    }).eq("id", deal.payment_invoice_id);

    // If envelope also signed, bump deal to paid_signed; else just paid
    const newStatus = envelope.status === "signed" ? "paid_signed" : "paid";
    await supabase.from("crm_deals").update({ pay_sign_status: newStatus }).eq("id", deal.id);

    return json({ ok: true, invoice_status: "paid", pay_sign_status: newStatus });
  }

  return json({ error: "Unknown action" }, 400);
});
