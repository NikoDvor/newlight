// Stripe Connect onboarding for sub-accounts (client-owned payments).
// Fully separate from NewLight's own billing (stripe-billing.ts / stripe-webhook).
// Uses the platform STRIPE_SECRET_KEY because Connect requires the platform credential by design.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const RETURN_URL = "https://newlight-app.com/payment-settings";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) return json({ error: "Stripe not configured" }, 503);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const client_id = body?.client_id;
    if (!client_id || typeof client_id !== "string") return json({ error: "client_id is required" }, 400);

    // Authorization: admin/operator, or a member of this workspace.
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "operator");

    if (!isAdmin) {
      const { data: membership } = await admin
        .from("workspace_users")
        .select("id")
        .eq("user_id", user.id)
        .eq("client_id", client_id)
        .maybeSingle();
      if (!membership) return json({ error: "Forbidden" }, 403);
    }

    const { data: settings } = await admin
      .from("client_payment_settings")
      .select("*")
      .eq("client_id", client_id)
      .maybeSingle();

    const { Stripe } = await import("https://esm.sh/stripe@14.21.0?target=deno");
    const stripe = new Stripe(stripeSecret, { apiVersion: "2024-04-10" });

    let accountId: string | null = settings?.stripe_connect_account_id ?? null;

    if (!accountId) {
      const account = await stripe.accounts.create({ type: "express" });
      accountId = account.id;
      const { error: upErr } = await admin
        .from("client_payment_settings")
        .upsert(
          { client_id, stripe_connect_account_id: accountId, updated_at: new Date().toISOString() },
          { onConflict: "client_id" }
        );
      if (upErr) {
        console.error("Failed to persist connect account:", upErr);
        return json({ error: "Could not save Stripe account" }, 500);
      }
    }

    const link = await stripe.accountLinks.create({
      account: accountId!,
      type: "account_onboarding",
      refresh_url: RETURN_URL,
      return_url: RETURN_URL,
    });

    return json({ ok: true, onboarding_url: link.url });
  } catch (e: any) {
    console.error("stripe-connect-onboard error:", e);
    return json({ error: e?.message || "Unexpected error" }, 500);
  }
});
