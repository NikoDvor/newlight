// Edit deal pricing terms and regenerate the service agreement document.
// Blocked once the deal is paid+signed (requires a formal amendment instead).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildServiceAgreementHtml } from "../_shared/service-agreement-html.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const {
      deal_id,
      pricing_model,
      initial_fee,
      recurring_fee,
      commission_rate,
      commission_rate_ongoing,
      retainer_kpi,
    } = body ?? {};
    if (!deal_id) return json({ error: "deal_id is required" }, 400);
    if (pricing_model !== "retainer" && pricing_model !== "commission") {
      return json({ error: "pricing_model must be 'retainer' or 'commission'" }, 400);
    }

    const { data: deal, error: dealErr } = await supabase
      .from("crm_deals")
      .select("id, client_id, deal_name, assigned_user, pay_sign_status, closing_notes, service_agreement_envelope_id")
      .eq("id", deal_id)
      .maybeSingle();
    if (dealErr) throw dealErr;
    if (!deal) return json({ error: "Deal not found" }, 404);

    // Authorization: admin/operator OR the deal's assigned user
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin" || r.role === "operator");
    if (!isAdmin && deal.assigned_user !== user.id) {
      return json({ error: "Forbidden" }, 403);
    }

    if (deal.pay_sign_status === "paid_signed") {
      return json({
        error: "This deal is already signed. Terms cannot be edited here — a signed agreement requires a formal amendment, not a silent edit, since the client's signed copy and any live billing would no longer match.",
      }, 400);
    }

    const isCommission = pricing_model === "commission";
    const kpi = retainer_kpi || null;

    const dealPatch: Record<string, unknown> = {
      pricing_model,
      initial_fee: initial_fee != null ? Number(initial_fee) : null,
      recurring_fee: isCommission ? null : (recurring_fee != null ? Number(recurring_fee) : null),
      commission_rate: isCommission ? Number(commission_rate ?? 0) : null,
      commission_rate_ongoing: isCommission ? Number(commission_rate_ongoing ?? 10) : null,
      retainer_kpi: kpi,
    };
    const { error: updErr } = await supabase.from("crm_deals").update(dealPatch as any).eq("id", deal.id);
    if (updErr) throw updErr;

    // Regenerate the agreement document if an envelope already exists
    const envelopeId = deal.service_agreement_envelope_id as string | null;
    if (envelopeId) {
      let businessName = deal.deal_name || "Client";
      if (deal.client_id) {
        const { data: client } = await supabase.from("clients").select("name").eq("id", deal.client_id).maybeSingle();
        if (client?.name) businessName = client.name;
      }

      const { data: agencySettings } = await supabase
        .from("agency_settings")
        .select("legal_entity_name, entity_type, governing_state, venue_county, notice_address, notice_email")
        .limit(1)
        .maybeSingle();

      const priceLine =
        (isCommission
          ? `Commission — Initial $${Number(initial_fee ?? 0).toLocaleString()} + ${Number(commission_rate ?? 0)}% yr 1 / ${Number(commission_rate_ongoing ?? 0)}% ongoing of Attributable Revenue`
          : `Retainer — Initial $${Number(initial_fee ?? 0).toLocaleString()} + $${Number(recurring_fee ?? 0).toLocaleString()}/month`) +
        (kpi ? ` · KPI: ${kpi}` : "");

      const summaryHtml = buildServiceAgreementHtml({
        businessName,
        priceLine,
        initialFee: initial_fee != null ? Number(initial_fee) : 0,
        recurringFee: recurring_fee != null ? Number(recurring_fee) : null,
        pricingModel: pricing_model as "retainer" | "commission",
        commissionRate: commission_rate != null ? Number(commission_rate) : null,
        commissionRateOngoing: commission_rate_ongoing != null ? Number(commission_rate_ongoing) : null,
        retainerKpi: kpi,
        closingNotes: (deal as any).closing_notes || null,
        agencyLegalName: agencySettings?.legal_entity_name || "NewLight Marketing, LLC",
        agencyEntityType: agencySettings?.entity_type || "a California limited liability company",
        governingState: agencySettings?.governing_state || "California",
        venueCounty: agencySettings?.venue_county || "Santa Barbara County",
        dataRetentionDays: 365,
      });
      const summaryDataUrl = `data:text/html;base64,${btoa(unescape(encodeURIComponent(summaryHtml)))}`;

      for (const name of ["Service Agreement", "Receipt / Terms Summary"]) {
        await supabase
          .from("document_envelope_items")
          .update({ document_url: summaryDataUrl } as any)
          .eq("envelope_id", envelopeId)
          .eq("document_name", name);
      }
    }

    return json({ ok: true });
  } catch (e) {
    console.error("update-deal-terms error", e);
    return json({ error: (e as Error).message || "Unexpected error" }, 500);
  }
});
