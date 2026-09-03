// Generic last-touch attribution matching engine.
// Suggests links between attribution_events and closed-won deals.
// Never writes to financial_adjustments — a human approves suggestions in the admin UI.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const LOOKBACK_DAYS = 90;

const digits = (s: string | null | undefined) => (s || "").replace(/\D/g, "");
const lower = (s: string | null | undefined) => (s || "").trim().toLowerCase();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("ATTRIBUTION_MATCH_CRON_SECRET") || "";

    const body = await req.json().catch(() => ({} as any));
    const clientId = typeof body?.client_id === "string" && body.client_id ? body.client_id : null;

    // Auth: scheduled invocation via shared secret, otherwise admin/operator JWT.
    const providedCronSecret = req.headers.get("x-cron-secret") || "";
    const isCron = Boolean(cronSecret) && providedCronSecret === cronSecret;

    const supabase = createClient(supabaseUrl, serviceKey);

    if (!isCron) {
      const token = (req.headers.get("Authorization") || "").replace("Bearer ", "").trim();
      if (!token) return json({ error: "Unauthorized" }, 401);
      const anonClient = createClient(supabaseUrl, anonKey);
      const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
      if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", userData.user.id);
      const allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "operator");
      if (!allowed) return json({ error: "Forbidden" }, 403);
    }

    // 1. Closed-won deals in scope.
    let dealQuery = supabase
      .from("crm_deals")
      .select("id, client_id, contact_id, deal_name, deal_value, created_at")
      .eq("pipeline_stage", "closed_won")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (clientId) dealQuery = dealQuery.eq("client_id", clientId);

    const { data: deals, error: dealsErr } = await dealQuery;
    if (dealsErr) return json({ error: dealsErr.message }, 500);

    const dealList = deals || [];
    if (dealList.length === 0) return json({ ok: true, deals_checked: 0, matches_created: 0 });

    // 2. Exclude deals that already have a link.
    const { data: existingLinks, error: linkErr } = await supabase
      .from("attribution_revenue_links")
      .select("deal_id")
      .in("deal_id", dealList.map((d: any) => d.id));
    if (linkErr) return json({ error: linkErr.message }, 500);
    const linked = new Set((existingLinks || []).map((l: any) => l.deal_id));

    const candidates = dealList.filter((d: any) => !linked.has(d.id) && d.contact_id);
    if (candidates.length === 0) {
      return json({ ok: true, deals_checked: dealList.length, matches_created: 0 });
    }

    // 3. Contacts for those deals.
    const contactIds = Array.from(new Set(candidates.map((d: any) => d.contact_id)));
    const { data: contacts } = await supabase
      .from("crm_contacts")
      .select("id, phone, secondary_phone, email")
      .in("id", contactIds);
    const contactMap = new Map((contacts || []).map((c: any) => [c.id, c]));

    // 4. Attribution events per client (bounded by the oldest lookback needed).
    const clientIds = Array.from(new Set(candidates.map((d: any) => d.client_id)));
    const oldestDealTs = Math.min(...candidates.map((d: any) => Date.parse(d.created_at)));
    const sinceIso = new Date(oldestDealTs - LOOKBACK_DAYS * 86400000).toISOString();

    const { data: events, error: evErr } = await supabase
      .from("attribution_events")
      .select("id, client_id, channel, contact_phone, contact_email, occurred_at")
      .in("client_id", clientIds)
      .gte("occurred_at", sinceIso)
      .order("occurred_at", { ascending: false })
      .limit(20000);
    if (evErr) return json({ error: evErr.message }, 500);

    const eventsByClient = new Map<string, any[]>();
    for (const e of events || []) {
      const arr = eventsByClient.get(e.client_id) || [];
      arr.push(e);
      eventsByClient.set(e.client_id, arr);
    }

    // 5. Last-touch match.
    const inserts: any[] = [];
    for (const deal of candidates) {
      const contact = contactMap.get(deal.contact_id);
      if (!contact) continue;

      const phones = [digits(contact.phone), digits(contact.secondary_phone)].filter((p) => p.length >= 10)
        .map((p) => p.slice(-10));
      const email = lower(contact.email);
      if (phones.length === 0 && !email) continue;

      const dealTs = Date.parse(deal.created_at);
      const windowStart = dealTs - LOOKBACK_DAYS * 86400000;
      const pool = eventsByClient.get(deal.client_id) || [];

      let best: any = null;
      for (const e of pool) {
        const ts = Date.parse(e.occurred_at);
        if (!(ts < dealTs && ts >= windowStart)) continue;
        const ePhone = digits(e.contact_phone);
        const phoneHit = ePhone.length >= 10 && phones.includes(ePhone.slice(-10));
        const emailHit = Boolean(email) && lower(e.contact_email) === email;
        if (!phoneHit && !emailHit) continue;
        if (!best || ts > Date.parse(best.occurred_at)) best = e;
      }

      if (best) {
        inserts.push({
          client_id: deal.client_id,
          attribution_event_id: best.id,
          deal_id: deal.id,
          matched_amount: Number(deal.deal_value || 0),
          match_method: "last_touch_contact_match",
          status: "suggested",
        });
      }
    }

    let created = 0;
    if (inserts.length > 0) {
      const { data: inserted, error: insErr } = await supabase
        .from("attribution_revenue_links")
        .insert(inserts)
        .select("id");
      if (insErr) return json({ error: insErr.message }, 500);
      created = (inserted || []).length;
    }

    return json({ ok: true, deals_checked: dealList.length, matches_created: created });
  } catch (e) {
    console.error("match-attribution-to-deals error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
