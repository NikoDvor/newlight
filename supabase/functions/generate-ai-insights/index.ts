import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map free-text industry to benchmark industry key
function mapIndustry(raw: string | null | undefined): string {
  const t = (raw || "").toLowerCase();
  if (t.includes("med spa") || t.includes("aesthetic")) return "med_spa";
  if (t.includes("hvac")) return "hvac";
  if (t.includes("roof")) return "roofing";
  if (t.includes("solar")) return "solar";
  if (t.includes("law") || t.includes("legal") || t.includes("attorney")) return "law_firm";
  if (t.includes("financial") || t.includes("wealth") || t.includes("advisor")) return "financial_advisor";
  if (t.includes("salon") || t.includes("barber") || t.includes("spa")) return "salon";
  return "default";
}

interface Signal {
  metric_key: string;
  category: string;
  actual: number;
  benchmark: number;
  top_quartile: number | null;
  unit: string;
  gap_pct: number;
  direction: "higher_is_better" | "lower_is_better";
  breach: boolean;
  human_label: string;
  action_hint: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { client_id } = await req.json();
    if (!client_id) {
      return new Response(JSON.stringify({ error: "Missing client_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!supabaseAnonKey || !authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: hasAccess } = await authClient.rpc("user_has_client_access", {
      _user_id: user.id, _client_id: client_id,
    });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ---- Fetch real data (last 90 days for signals) ----
    const ninetyAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const [
      { data: client },
      { data: contacts },
      { data: deals },
      { data: events },
      { data: reviews },
      { data: health },
    ] = await Promise.all([
      sb.from("clients").select("business_name, industry").eq("id", client_id).maybeSingle(),
      sb.from("crm_contacts").select("id, created_at").eq("client_id", client_id).gte("created_at", ninetyAgo),
      sb.from("crm_deals").select("id, deal_value, pipeline_stage, created_at").eq("client_id", client_id).gte("created_at", ninetyAgo),
      sb.from("calendar_events").select("id, calendar_status, created_at").eq("client_id", client_id).gte("created_at", ninetyAgo),
      sb.from("review_requests").select("id, rating, created_at").eq("client_id", client_id).gte("created_at", ninetyAgo),
      sb.from("client_health_scores").select("overall_score").eq("client_id", client_id).maybeSingle(),
    ]);

    const industry = mapIndustry(client?.industry);
    const { data: benchmarks } = await sb
      .from("vertical_benchmarks")
      .select("metric_key, benchmark_value, top_quartile_value, unit")
      .eq("industry", industry);

    const bmMap = new Map<string, { benchmark: number; top: number | null; unit: string }>();
    (benchmarks ?? []).forEach((b) => bmMap.set(b.metric_key, {
      benchmark: Number(b.benchmark_value),
      top: b.top_quartile_value != null ? Number(b.top_quartile_value) : null,
      unit: b.unit ?? "",
    }));

    // ---- Compute signals from real data ----
    const totalLeads = (contacts ?? []).length;
    const totalDeals = (deals ?? []).length;
    const wonDeals = (deals ?? []).filter((d) => d.pipeline_stage === "closed_won").length;
    const conversion = totalLeads > 0 ? (wonDeals / totalLeads) * 100 : 0;

    const totalAppts = (events ?? []).length;
    const noShows = (events ?? []).filter((e) =>
      ["no_show", "no-show", "noshow"].includes((e.calendar_status || "").toLowerCase())
    ).length;
    const noShowRate = totalAppts > 0 ? (noShows / totalAppts) * 100 : 0;

    const reviewsWithRating = (reviews ?? []).filter((r) => r.rating != null);
    const avgRating = reviewsWithRating.length > 0
      ? reviewsWithRating.reduce((s, r) => s + Number(r.rating), 0) / reviewsWithRating.length
      : 0;
    const reviewsLast30 = (reviews ?? []).filter((r) => r.created_at >= thirtyAgo).length;
    // monthly velocity from last 30 days
    const reviewVelocity = reviewsLast30;

    const signalDefs: Array<Omit<Signal, "benchmark" | "top_quartile" | "unit" | "gap_pct" | "breach">> = [
      { metric_key: "conversion_rate", category: "crm", actual: conversion,
        direction: "higher_is_better",
        human_label: `Lead-to-close conversion is ${conversion.toFixed(1)}%`,
        action_hint: "Improve CRM follow-up cadence and speed-to-lead" },
      { metric_key: "no_show_rate", category: "crm", actual: noShowRate,
        direction: "lower_is_better",
        human_label: `Appointment no-show rate is ${noShowRate.toFixed(1)}%`,
        action_hint: "Add SMS reminders and confirmation flow" },
      { metric_key: "review_velocity_monthly", category: "reviews", actual: reviewVelocity,
        direction: "higher_is_better",
        human_label: `Only ${reviewVelocity} reviews collected in last 30 days`,
        action_hint: "Turn on automated post-appointment review requests" },
      { metric_key: "avg_rating", category: "reviews", actual: avgRating,
        direction: "higher_is_better",
        human_label: `Average review rating is ${avgRating.toFixed(2)}`,
        action_hint: "Add reputation-recovery flow for low-rating feedback" },
    ];

    const signals: Signal[] = signalDefs
      .map((s) => {
        const bm = bmMap.get(s.metric_key);
        if (!bm) return null;
        const gap = bm.benchmark - s.actual;
        const gap_pct = bm.benchmark > 0 ? Math.abs(gap / bm.benchmark) * 100 : 0;
        const breach = s.direction === "higher_is_better"
          ? s.actual < bm.benchmark
          : s.actual > bm.benchmark;
        return { ...s, benchmark: bm.benchmark, top_quartile: bm.top, unit: bm.unit, gap_pct, breach };
      })
      .filter((s): s is Signal => s !== null && s.breach);

    // Persist snapshot of all breached signals (used by UI Weaknesses panel)
    const signalsSnapshot = signals
      .sort((a, b) => b.gap_pct - a.gap_pct)
      .map((s) => ({
        metric_key: s.metric_key,
        category: s.category,
        actual: Number(s.actual.toFixed(2)),
        benchmark: s.benchmark,
        top_quartile: s.top_quartile,
        unit: s.unit,
        gap_pct: Number(s.gap_pct.toFixed(1)),
        direction: s.direction,
        human_label: s.human_label,
      }));

    await sb
      .from("client_signal_snapshots")
      .upsert(
        { client_id, signals: signalsSnapshot, industry, computed_at: new Date().toISOString() },
        { onConflict: "client_id" }
      );

    if (signals.length === 0) {
      // still clear old 'new' recs; nothing to insert
      await sb.from("ai_recommendations").delete().eq("client_id", client_id).eq("status", "new");
      return new Response(JSON.stringify({ recommendations: [], signals: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Ask AI for recommendation per breached signal ----
    const prompt = `You are a growth advisor for a ${client?.industry || "small business"} named "${client?.business_name || "the client"}".

Below are business signals that are underperforming the ${industry} industry benchmark. For each, produce a specific, actionable recommendation.

Signals (JSON):
${JSON.stringify(signals.map((s) => ({
  metric: s.metric_key,
  category: s.category,
  actual: Number(s.actual.toFixed(2)),
  benchmark: s.benchmark,
  top_quartile: s.top_quartile,
  unit: s.unit,
  human: s.human_label,
  hint: s.action_hint,
})), null, 2)}

Return ONLY a JSON array (no prose, no fences) of objects with these exact fields:
[
  {
    "metric_key": "<matches input metric>",
    "category": "<ads|seo|social|reviews|website|crm>",
    "title": "<specific 5-9 word recommendation>",
    "why_reasoning": "<2-3 sentences citing the client's actual numbers vs benchmark>",
    "expected_impact_value": <number, estimated $ or count gain>,
    "impact_unit": "<$|leads|appointments|%>",
    "confidence_pct": <0-100 integer>,
    "effort_level": "<low|medium|high>",
    "action_label": "<short button text like 'Enable instant lead response'>"
  }
]`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a data-driven growth analyst. Respond only with valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      const errText = await aiResp.text();
      console.error("AI error:", status, errText);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const raw = aiJson.choices?.[0]?.message?.content ?? "[]";
    const cleaned = raw.replace(/```json\s*|```/g, "").trim();

    let recs: any[] = [];
    try {
      recs = JSON.parse(cleaned);
      if (!Array.isArray(recs)) recs = [];
    } catch (e) {
      console.error("Failed to parse AI JSON:", cleaned);
      recs = [];
    }

    // Reach heuristic: number of leads/appointments potentially affected (capped)
    const reach = Math.max(1, Math.min(10, Math.round(totalLeads / 5) || 3));
    const effortMap: Record<string, number> = { low: 1, medium: 2, high: 4 };

    const enriched = recs.map((r) => {
      const impact = Math.max(1, Math.min(10, Math.round((Number(r.expected_impact_value) || 100) / 100)));
      const confidence = Math.max(0, Math.min(100, Number(r.confidence_pct) || 60));
      const effort = effortMap[String(r.effort_level || "medium").toLowerCase()] || 2;
      const rice = (reach * impact * (confidence / 100)) / effort;
      return {
        client_id,
        category: String(r.category || "crm").toLowerCase(),
        title: String(r.title || "Improve growth signal").slice(0, 200),
        why_reasoning: String(r.why_reasoning || ""),
        expected_impact_value: Number(r.expected_impact_value) || 0,
        impact_unit: String(r.impact_unit || "$"),
        confidence_pct: Math.round(confidence),
        effort_level: String(r.effort_level || "medium").toLowerCase(),
        rice_score: Number(rice.toFixed(2)),
        status: "new" as const,
        action_label: String(r.action_label || "Take action").slice(0, 100),
      };
    });

    // Replace prior 'new' recs, preserve accepted/acted/dismissed/snoozed
    await sb.from("ai_recommendations").delete().eq("client_id", client_id).eq("status", "new");

    let inserted: any[] = [];
    if (enriched.length > 0) {
      const { data, error } = await sb.from("ai_recommendations").insert(enriched).select();
      if (error) {
        console.error("Insert error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted = data ?? [];
    }

    return new Response(JSON.stringify({
      recommendations: inserted,
      signals: signals.map((s) => ({
        metric_key: s.metric_key,
        actual: Number(s.actual.toFixed(2)),
        benchmark: s.benchmark,
        unit: s.unit,
      })),
      industry,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-ai-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
