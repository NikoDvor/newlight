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

function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  return t;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { client_id } = body;
    if (!client_id) return json({ error: "client_id required" }, 400);

    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("business_name, industry, primary_location, business_type")
      .eq("id", client_id)
      .maybeSingle();
    if (clientErr || !client) return json({ error: "Client not found" }, 404);

    const { data: competitors, error: compErr } = await supabase
      .from("seo_competitors")
      .select("domain")
      .eq("client_id", client_id);
    if (compErr || !competitors || competitors.length === 0) {
      return json({ error: "No competitors found — add competitors first" }, 400);
    }

    const { data: keywords } = await supabase
      .from("seo_keywords")
      .select("keyword")
      .eq("client_id", client_id);

    const competitorDomains = competitors.map(c => c.domain).join(", ");
    const existingKeywords = (keywords || []).map(k => k.keyword).join(", ") || "none yet";
    const isFinancial = client.business_type === "financial_firm";

    const locationContext = isFinancial
      ? `Geographic scope: national/regional (financial services firm)`
      : `Primary location: ${client.primary_location || "Unknown"}`;

    const competitiveFraming = isFinancial
      ? `This is a regulated financial services firm. Focus competitive analysis on:
- Thought leadership and educational content gaps
- Credential and trust signal differentiation (CFP, CFA, fiduciary)
- National keyword opportunities competitors rank for
- Content types like guides, whitepapers, market commentary
- Positioning around independence, fiduciary duty, fee transparency
Do not suggest local service area pages or local city targeting.`
      : `Focus on local service area competitive opportunities, pricing transparency, service differentiation, and content gaps that drive local organic traffic.`;

    const prompt = `You are an expert SEO competitive analyst. Perform a gap analysis for this business against their competitors.

Business: ${client.business_name || "Unknown"}
Industry: ${client.industry || "Unknown"}
${locationContext}
Existing keywords: ${existingKeywords}
Competitor domains: ${competitorDomains}

${competitiveFraming}

Return STRICT JSON ONLY (no prose, no markdown fences) with this exact shape:
{
  "keyword_gaps": [
    { "keyword": "string", "note": "string (one sentence on why this is a gap)", "priority": "high"|"medium"|"low" }
  ],
  "content_gaps": [
    { "title": "string", "note": "string (one sentence on why this content is missing)", "priority": "high"|"medium"|"low" }
  ],
  "positioning_opportunities": [
    { "title": "string", "note": "string (2-3 sentences on the positioning angle and why it works)" }
  ]
}

Requirements:
- keyword_gaps: 8 to 10 entries, mix of high/medium/low priority, do not include keywords already in the existing keywords list
- content_gaps: 5 to 6 entries, specific and actionable
- positioning_opportunities: 3 entries, strategic and differentiated from competitors`;

    if (!lovableKey) return json({ error: "AI gateway not configured" }, 500);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You output strict JSON only." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) return json({ error: "AI request failed" }, 500);

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content || "";
    let parsed: {
      keyword_gaps?: Array<{ keyword: string; note: string; priority: string }>;
      content_gaps?: Array<{ title: string; note: string; priority: string }>;
      positioning_opportunities?: Array<{ title: string; note: string }>;
    } = {};
    try {
      parsed = JSON.parse(stripFences(raw));
    } catch {
      return json({ error: "Failed to parse AI response" }, 500);
    }

    const now = new Date().toISOString();

    await supabase
      .from("seo_competitor_gaps")
      .delete()
      .eq("client_id", client_id);

    const { error: insertErr } = await supabase
      .from("seo_competitor_gaps")
      .insert({
        client_id,
        competitor_domains: competitorDomains,
        keyword_gaps: parsed.keyword_gaps || [],
        content_gaps: parsed.content_gaps || [],
        positioning_opportunities: parsed.positioning_opportunities || [],
        generated_at: now,
      });

    if (insertErr) return json({ error: insertErr.message }, 500);

    return json({
      keyword_gaps: parsed.keyword_gaps || [],
      content_gaps: parsed.content_gaps || [],
      positioning_opportunities: parsed.positioning_opportunities || [],
      generated_at: now,
      competitor_domains: competitorDomains,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return json({ error: msg }, 500);
  }
});
