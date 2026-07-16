import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

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
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecret) {
    console.error("STRIPE_SECRET_KEY not configured");
    return json({ error: "Stripe not configured" }, 503);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { invoice_id, amount, description, client_email, success_url, cancel_url } = body ?? {};

  if (!invoice_id || typeof invoice_id !== "string") {
    return json({ error: "invoice_id is required" }, 400);
  }
  if (typeof amount !== "number" || !isFinite(amount) || amount <= 0) {
    return json({ error: "amount (in dollars) must be a positive number" }, 400);
  }
  if (!description || typeof description !== "string") {
    return json({ error: "description is required" }, 400);
  }

  const origin = req.headers.get("origin") || req.headers.get("referer") || "";
  const originBase = (() => {
    try {
      return origin ? new URL(origin).origin : "";
    } catch {
      return "";
    }
  })();

  const finalSuccessUrl =
    success_url ||
    `${originBase}/admin/close-center?payment=success&invoice_id=${encodeURIComponent(invoice_id)}&session_id={CHECKOUT_SESSION_ID}`;
  const finalCancelUrl =
    cancel_url ||
    `${originBase}/admin/close-center?payment=cancelled&invoice_id=${encodeURIComponent(invoice_id)}`;

  try {
    const { Stripe } = await import("https://esm.sh/stripe@14.21.0?target=deno");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: description },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: client_email || undefined,
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: { invoice_id },
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: updateErr } = await supabase
      .from("invoices")
      .update({
        payment_link_url: session.url,
        stripe_checkout_session_id: session.id,
      })
      .eq("id", invoice_id);

    if (updateErr) {
      console.error("Failed to update invoice:", updateErr);
      // Session was created; still return url but include warning
      return json({
        url: session.url,
        session_id: session.id,
        warning: `Session created but invoice update failed: ${updateErr.message}`,
      });
    }

    return json({ url: session.url, session_id: session.id });
  } catch (err: any) {
    console.error("Stripe checkout creation failed:", err);
    const status = typeof err?.statusCode === "number" ? err.statusCode : 500;
    const message = err?.message || "Failed to create checkout session";
    return json({ error: message, type: err?.type }, status);
  }
});
