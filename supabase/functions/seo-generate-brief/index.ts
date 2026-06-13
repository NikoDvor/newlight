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
    const { client_id, opp_id } = body;
    if (!client_id || !opp_id) return json({ error: "client_id and opp_id required" }, 400);

    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("business_name, industry, primary_location, business_type")
      .eq("id", client_id)
      .maybeSingle();
    if (clientErr || !client) return json({ error: "Client not found" }, 404);

    const { data: opp, error: oppErr } = await supabase
      .from("seo_content_opportunities")
      .select("topic_title, target_keyword, opportunity_type, priority")
      .eq("id", opp_id)
      .maybeSingle();
    if (oppErr || !opp) return json({ error: "Opportunity not found" }, 404);

    const isFinancial = client.business_type === "financial_firm";

    const complianceInstruction = isFinancial
      ? `\n\nCOMPLIANCE STANDARD: This content is being produced by NewLight on behalf of a regulated financial firm as part of a managed SEO service. All content must be built to SEC and FINRA standards from the ground up — not flagged after the fact. Apply the following rules throughout the entire brief:

1. No performance guarantees, projected returns, or specific yield figures in any section including the CTA.

2. All claims must be factual and capable of substantiation — avoid superlatives like "best", "guaranteed", "proven" unless they can be documented.

3. Use balanced, educational language — present information, do not promise outcomes.

4. The CTA must invite consultation or further information, never imply a guaranteed result.

5. Include a suggested disclaimer in the compliance_notes field that should appear at the bottom of the published content, appropriate for the content type and topic.

6. In the compliance_notes field, confirm which SEC/FINRA standards were applied (e.g. FINRA Rule 2210 for communications with the public, SEC Marketing Rule for testimonials if relevant) and note any topic-specific considerations the writer should be aware of.

The compliance_notes field is not a warning list — it is a confirmation of the regulatory framework applied and guidance for the writer to maintain that standard throughout drafting.`
      : "";

    const prompt = `You are an expert SEO content strategist. Generate a detailed content brief for the following opportunity.

Business: ${client.business_name || "Unknown"}
Industry: ${client.industry || "Unknown"}
Location: ${client.primary_location || "Unknown"}
Topic: ${opp.topic_title}
Primary keyword: ${opp.target_keyword || opp.topic_title}
Content type: ${opp.opportunity_type}
Priority: ${opp.priority}
${complianceInstruction}

Return STRICT JSON ONLY (no prose, no markdown fences) with this exact shape:
{
  "primary_keyword": "string",
  "secondary_keywords": ["string", "string", "string", "string", "string"],
  "suggested_title": "string",
  "meta_description": "string (under 160 characters)",
  "word_count": "string (e.g. 1500-1800 words)",
  "h2_sections": [
    { "heading": "string", "note": "string (one sentence on what this section covers)" }
  ],
  "internal_link_suggestions": "string",
  "call_to_action": "string",
  "compliance_notes": "string"
}

Requirements:
- secondary_keywords: exactly 5 entries, specific and varied
- h2_sections: 5 entries minimum
- meta_description: must be under 160 characters
- compliance_flags: only include if this is a financial firm, otherwise return empty string`;

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
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(stripFences(raw));
    } catch {
      return json({ error: "Failed to parse AI response" }, 500);
    }

    const briefText = JSON.stringify(parsed);
    const now = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("seo_content_opportunities")
      .update({ brief: briefText, brief_generated_at: now })
      .eq("id", opp_id);

    if (updateErr) return json({ error: updateErr.message }, 500);

    return json({ brief: briefText, brief_generated_at: now });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return json({ error: msg }, 500);
  }
});
