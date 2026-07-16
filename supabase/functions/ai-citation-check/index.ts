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

const MODEL = "google/gemini-2.5-flash";

function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function seedQueriesFor(client: {
  business_name?: string | null;
  industry?: string | null;
  primary_location?: string | null;
  business_type?: string | null;
}): string[] {
  const loc = (client.primary_location || "").trim();
  const industry = (client.industry || "").trim().toLowerCase();
  const isFinancial = client.business_type === "financial_firm"
    || /financial|advisor|wealth|invest|retire|planner/i.test(industry);

  if (isFinancial) {
    return [
      loc ? `best financial advisor in ${loc}` : `best financial advisor near me`,
      `fiduciary financial advisor near me`,
      `how to choose a retirement planner`,
      `top wealth management firms${loc ? ` in ${loc}` : ""}`,
      `questions to ask a financial advisor`,
    ];
  }
  const label = industry || "local business";
  return [
    loc ? `best ${label} in ${loc}` : `best ${label} near me`,
    `top ${label} companies${loc ? ` in ${loc}` : ""}`,
    `how to choose a ${label}`,
    `${label} reviews${loc ? ` ${loc}` : ""}`,
  ];
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

  const isService = authHeader === `Bearer ${serviceKey}`;
  if (!isService) {
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
  }


  if (!lovableKey) return json({ error: "AI gateway not configured" }, 500);

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { client_id } = body || {};
    if (!client_id) return json({ error: "client_id required" }, 400);

    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .select("business_name, industry, primary_location, business_type, website_url")
      .eq("id", client_id)
      .maybeSingle();
    if (clientErr || !client) return json({ error: "Client not found" }, 404);

    const businessName = (client.business_name || "").trim();
    if (!businessName) {
      return json({ error: "Client has no business_name set" }, 400);
    }
    const domain = extractDomain(client.website_url);

    // Load or seed queries
    let { data: queries } = await supabase
      .from("ai_citation_queries")
      .select("id, query_text, is_active")
      .eq("client_id", client_id)
      .eq("is_active", true);

    if (!queries || queries.length === 0) {
      const seeds = seedQueriesFor(client).map((q) => ({
        client_id,
        query_text: q,
        is_active: true,
      }));
      const { data: inserted } = await supabase
        .from("ai_citation_queries")
        .insert(seeds)
        .select("id, query_text, is_active");
      queries = inserted || [];
    }

    const nameLower = businessName.toLowerCase();
    const domainLower = domain?.toLowerCase() || null;
    const results: Array<Record<string, unknown>> = [];
    const rowsToInsert: Array<Record<string, unknown>> = [];

    for (const q of queries) {
      let cited = false;
      let snippet = "";
      let text = "";
      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              {
                role: "system",
                content:
                  "You are a helpful assistant answering a user question the way a general-purpose AI search assistant would. Provide a substantive answer that names specific businesses, firms, or resources when relevant. Do not refuse.",
              },
              { role: "user", content: q.query_text },
            ],
          }),
        });
        if (!aiRes.ok) {
          const errText = await aiRes.text();
          snippet = `AI request failed (${aiRes.status}): ${errText.slice(0, 200)}`;
        } else {
          const aiJson = await aiRes.json();
          text = aiJson?.choices?.[0]?.message?.content || "";
          const lower = text.toLowerCase();
          const nameHit = nameLower && lower.includes(nameLower);
          const domainHit = domainLower && lower.includes(domainLower);
          cited = Boolean(nameHit || domainHit);

          if (cited) {
            const needle = nameHit ? nameLower : (domainLower as string);
            const idx = lower.indexOf(needle);
            const start = Math.max(0, idx - 120);
            const end = Math.min(text.length, idx + needle.length + 180);
            snippet = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
          } else {
            snippet = text.slice(0, 400) + (text.length > 400 ? "…" : "");
          }
        }
      } catch (e) {
        snippet = `Error: ${e instanceof Error ? e.message : "unknown"}`;
      }

      const row = {
        client_id,
        query_id: q.id,
        query_text: q.query_text,
        ai_model: MODEL,
        cited,
        response_snippet: snippet,
        checked_at: new Date().toISOString(),
      };
      rowsToInsert.push(row);
      results.push({ query_text: q.query_text, cited, snippet, ai_model: MODEL });
    }

    if (rowsToInsert.length > 0) {
      await supabase.from("ai_citation_checks").insert(rowsToInsert);
    }

    return json({
      checks_run: rowsToInsert.length,
      cited_count: rowsToInsert.filter((r) => r.cited).length,
      results,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return json({ error: msg }, 500);
  }
});
