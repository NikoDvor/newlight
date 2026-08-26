import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";
import { getStripe, ensureStripeCustomer } from "../_shared/stripe-billing.ts";

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ---- Auth: admin or operator only ----
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Unauthorized" }, 401);
  const { data: userData } = await supabase.auth.getUser(jwt);
  const user = userData?.user;
  if (!user) return json({ error: "Unauthorized" }, 401);
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "operator");
  if (!allowed) return json({ error: "Forbidden" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const { client_id, amount, description, deal_id } = body ?? {};
  if (!client_id || typeof client_id !== "string") return json({ error: "client_id is required" }, 400);
  if (typeof amount !== "number" || !isFinite(amount) || amount <= 0) {
    return json({ error: "amount must be a positive number" }, 400);
  }
  if (!description || typeof description !== "string") return json({ error: "description is required" }, 400);

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecret) return json({ error: "Stripe not configured" }, 503);

  const { data: client } = await supabase
    .from("clients")
    .select("id, business_name, owner_email, stripe_customer_id")
    .eq("id", client_id)
    .maybeSingle();
  if (!client) return json({ error: "Client not found" }, 404);

  try {
    const stripe = await getStripe();
    if (!stripe) return json({ error: "Stripe not configured" }, 503);

    const customerId = await ensureStripeCustomer(stripe, supabase, {
      clientId: client_id,
      email: client.owner_email,
      name: client.business_name,
      existingCustomerId: client.stripe_customer_id ?? null,
    });

    const invoiceNumber = `ADHOC-${Date.now().toString(36).toUpperCase()}`;
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .insert({
        client_id,
        deal_id: deal_id || null,
        invoice_number: invoiceNumber,
        invoice_type: "adhoc",
        invoice_status: "pending",
        subtotal_amount: amount,
        tax_amount: 0,
        total_amount: amount,
        amount_paid: 0,
        issued_at: new Date().toISOString(),
        payment_notes: description,
      } as any)
      .select("id")
      .single();
    if (invErr) return json({ error: invErr.message }, 500);

    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    let originBase = "";
    try { originBase = origin ? new URL(origin).origin : ""; } catch { originBase = ""; }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: description },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      ...(customerId ? { customer: customerId } : { customer_email: client.owner_email || undefined }),
      success_url: `${originBase}/admin/billing?payment=success&invoice_id=${encodeURIComponent(invoice.id)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${originBase}/admin/billing?payment=cancelled&invoice_id=${encodeURIComponent(invoice.id)}`,
      metadata: { invoice_id: invoice.id, adhoc: "true" },
    });

    await supabase.from("invoices").update({
      payment_link_url: session.url,
      stripe_checkout_session_id: session.id,
    }).eq("id", invoice.id);

    return json({ invoice_id: invoice.id, payment_link_url: session.url });
  } catch (err: any) {
    console.error("[create-adhoc-invoice] error", err);
    return json({ error: err?.message || "Failed to create ad-hoc invoice" }, 500);
  }
});
