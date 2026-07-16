import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const ninetyAgo = new Date(Date.now() - 90 * 86400000).toISOString();

    const [
      { data: client },
      { data: contacts },
      { data: deals },
      { data: events },
      { data: reviews },
      { data: competitors },
    ] = await Promise.all([
      sb.from("clients").select("business_name, industry").eq("id", client_id).maybeSingle(),
      sb.from("crm_contacts").select("id, created_at").eq("client_id", client_id).gte("created_at", ninetyAgo),
      sb.from("crm_deals").select("id, deal_value, pipeline_stage, created_at").eq("client_id", client_id).gte("created_at", ninetyAgo),
      sb.from("calendar_events").select("id, calendar_status, created_at").eq("client_id", client_id).gte("created_at", ninetyAgo),
      sb.from("review_requests").select("id, rating, created_at").eq("client_id", client_id).gte("created_at", ninetyAgo),
      sb.from("growth_competitors").select("*").eq("client_id", client_id),
    ]);

    const d = deals ?? [];
    const wonLast30 = d.filter((x) => x.pipeline_stage === "closed_won" && x.created_at >= thirtyAgo);
    const wonLast90 = d.filter((x) => x.pipeline_stage === "closed_won");
    const monthlyRevenue = wonLast30.reduce((s, x) => s + (Number(x.deal_value) || 0), 0);
    const avgDealValue = wonLast90.length > 0
      ? wonLast90.reduce((s, x) => s + (Number(x.deal_value) || 0), 0) / wonLast90.length
      : 0;

    const leadsLast30 = (contacts ?? []).filter((c) => c.created_at >= thirtyAgo).length;
    const totalLeads90 = (contacts ?? []).length;
    const closeRate = totalLeads90 > 0 ? (wonLast90.length / totalLeads90) * 100 : 0;

    const apptsLast30 = (events ?? []).filter((e) => e.created_at >= thirtyAgo).length;
    const reviewsLast30 = (reviews ?? []).filter((r) => r.created_at >= thirtyAgo).length;

    const snapshot = {
      business_name: client?.business_name || "the client",
      industry: client?.industry || "small business",
      leads_last_30_days: leadsLast30,
      appointments_last_30_days: apptsLast30,
      reviews_last_30_days: reviewsLast30,
      close_rate_pct: Number(closeRate.toFixed(2)),
      avg_deal_value: Number(avgDealValue.toFixed(2)),
      monthly_revenue_run_rate: Number(monthlyRevenue.toFixed(2)),
      competitor_count: (competitors ?? []).length,
      competitors: (competitors ?? []).map((c) => ({
        name: c.competitor_name, reviews: c.review_count, rating: c.avg_rating,
        share_of_voice_pct: c.estimated_share_of_voice,
      })),
    };

    const prompt = `You are an executive growth strategist for a ${snapshot.industry} named "${snapshot.business_name}".

Current business snapshot (JSON):
${JSON.stringify(snapshot, null, 2)}

Identify 2-4 strategic GROWTH OPPORTUNITIES this business should pursue in the next 6-12 months. Each opportunity must be one of: new_service, new_channel, pricing, new_geo, retention.

For each opportunity, size the revenue impact using bottom-up logic: reachable volume × conversion assumption × avg deal value. State assumptions in plain language.

Return ONLY a JSON array (no prose, no fences) of objects with these exact fields:
[
  {
    "opportunity_type": "<new_service|new_channel|pricing|new_geo|retention>",
    "title": "<specific 5-10 word opportunity name>",
    "narrative": "<2-4 sentence executive explanation of the opportunity and why it fits this business now>",
    "sized_revenue_low": <monthly $ conservative estimate>,
    "sized_revenue_expected": <monthly $ expected estimate>,
    "sized_revenue_high": <monthly $ optimistic estimate>,
    "confidence_pct": <0-100 integer>,
    "effort_level": "<low|medium|high>",
    "assumptions": "<plain language list of 2-4 assumptions, comma-separated or bullet-style, e.g. 'Reachable audience: 500 households/mo; Conversion: 3%; Avg deal: $2,500'>"
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
          { role: "system", content: "You are an executive growth strategist. Respond only with valid JSON." },
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

    let opps: any[] = [];
    try {
      opps = JSON.parse(cleaned);
      if (!Array.isArray(opps)) opps = [];
    } catch (e) {
      console.error("Failed to parse AI JSON:", cleaned);
      opps = [];
    }

    const enriched = opps.map((o) => ({
      client_id,
      opportunity_type: String(o.opportunity_type || "new_channel").toLowerCase(),
      title: String(o.title || "Growth opportunity").slice(0, 200),
      narrative: String(o.narrative || ""),
      sized_revenue_low: Number(o.sized_revenue_low) || 0,
      sized_revenue_expected: Number(o.sized_revenue_expected) || 0,
      sized_revenue_high: Number(o.sized_revenue_high) || 0,
      confidence_pct: Math.max(0, Math.min(100, Math.round(Number(o.confidence_pct) || 50))),
      effort_level: String(o.effort_level || "medium").toLowerCase(),
      assumptions: String(o.assumptions || ""),
      status: "active" as const,
    }));

    // Replace prior 'active' opps; preserve pursuing/completed/dismissed
    await sb.from("growth_opportunities").delete().eq("client_id", client_id).eq("status", "active");

    let inserted: any[] = [];
    if (enriched.length > 0) {
      const { data, error } = await sb.from("growth_opportunities").insert(enriched).select();
      if (error) {
        console.error("Insert error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      inserted = data ?? [];
    }

    return new Response(JSON.stringify({ opportunities: inserted, snapshot }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-growth-opportunities error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
