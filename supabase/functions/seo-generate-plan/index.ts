import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeUrl(u: string): string {
  const t = u.trim();
  if (!/^https?:\/\//i.test(t)) return "https://" + t;
  return t;
}

function volumeFromTier(tier: string): number {
  const t = (tier || "").toLowerCase();
  if (t === "high") return 1000;
  if (t === "low") return 50;
  return 300;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, redirect: "follow" });
  } catch {
    return null;
  } finally {
    clearTimeout(tid);
  }
}

function stripFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  }
  return t;
}

type GenResult = {
  issues_created: number;
  keywords_created: number;
  content_created: number;
  locations_created: number;
};

async function generateForClient(
  supabase: SupabaseClient,
  clientId: string,
  lovableKey: string | undefined,
): Promise<GenResult> {
  // 1. Client
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("business_name, industry, primary_location, website_url, business_type")
    .eq("id", clientId)
    .maybeSingle();
  if (clientErr || !client) throw new Error("Client not found");

  // 2. Service areas
  let serviceAreas: string = client.primary_location || "";
  const { data: draft } = await supabase
    .from("activation_drafts")
    .select("form_data")
    .eq("client_id", clientId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const fd = (draft?.form_data as Record<string, unknown> | undefined) || {};
  const ops = (fd.intake_operations as Record<string, unknown> | undefined) || {};
  if (typeof ops.service_areas === "string" && ops.service_areas.trim()) {
    serviceAreas = ops.service_areas as string;
  }

  let issuesCreated = 0;
  let keywordsCreated = 0;
  let contentCreated = 0;
  let locationsCreated = 0;

  // 3. Website audit
  if (client.website_url && client.website_url.trim()) {
    const auditTitles = [
      "Missing or poor <title> tag",
      "Missing or poor meta description",
      "H1 tag issue",
      "Images missing alt text",
      "Site not served over HTTPS",
      "sitemap.xml not found",
      "robots.txt not found",
    ];
    await supabase
      .from("seo_issues")
      .delete()
      .eq("client_id", clientId)
      .eq("category", "technical")
      .in("issue_title", auditTitles);

    const siteUrl = normalizeUrl(client.website_url);
    const issuesToInsert: Array<Record<string, unknown>> = [];

    const homeRes = await fetchWithTimeout(siteUrl, 10000);
    if (homeRes && homeRes.ok) {
      const finalUrl = homeRes.url || siteUrl;
      const html = await homeRes.text();

      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "";
      if (!title || title.length < 10 || title.length > 60) {
        issuesToInsert.push({
          client_id: clientId,
          issue_title: "Missing or poor <title> tag",
          category: "technical",
          severity: "high",
          status: "open",
          recommendation: "Add a unique <title> tag between 10 and 60 characters that describes the page and includes a primary keyword.",
        });
      }

      const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
      const desc = descMatch ? descMatch[1].trim() : "";
      if (!desc || desc.length < 50 || desc.length > 160) {
        issuesToInsert.push({
          client_id: clientId,
          issue_title: "Missing or poor meta description",
          category: "technical",
          severity: "medium",
          status: "open",
          recommendation: "Add a meta description between 50 and 160 characters summarising the page.",
        });
      }

      const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
      if (h1Count !== 1) {
        issuesToInsert.push({
          client_id: clientId,
          issue_title: "H1 tag issue",
          category: "technical",
          severity: "high",
          status: "open",
          recommendation: h1Count === 0
            ? "Add exactly one <h1> tag to the homepage describing the page topic."
            : `Page has ${h1Count} <h1> tags. Use exactly one <h1> per page.`,
        });
      }

      const imgs = html.match(/<img\b[^>]*>/gi) || [];
      const missingAlt = imgs.filter(t => !/\salt\s*=/i.test(t)).length;
      if (missingAlt > 0) {
        issuesToInsert.push({
          client_id: clientId,
          issue_title: "Images missing alt text",
          category: "technical",
          severity: "low",
          status: "open",
          recommendation: `${missingAlt} image(s) on the homepage are missing alt attributes. Add descriptive alt text for accessibility and SEO.`,
        });
      }

      if (!/^https:/i.test(finalUrl)) {
        issuesToInsert.push({
          client_id: clientId,
          issue_title: "Site not served over HTTPS",
          category: "technical",
          severity: "high",
          status: "open",
          recommendation: "Configure an SSL certificate and redirect all HTTP traffic to HTTPS.",
        });
      }
    }

    const base = siteUrl.replace(/\/+$/, "");
    const sitemapRes = await fetchWithTimeout(`${base}/sitemap.xml`, 10000);
    if (!sitemapRes || sitemapRes.status !== 200) {
      issuesToInsert.push({
        client_id: clientId,
        issue_title: "sitemap.xml not found",
        category: "technical",
        severity: "medium",
        status: "open",
        recommendation: "Publish a sitemap.xml at the site root to help search engines discover your pages.",
      });
    }
    const robotsRes = await fetchWithTimeout(`${base}/robots.txt`, 10000);
    if (!robotsRes || robotsRes.status !== 200) {
      issuesToInsert.push({
        client_id: clientId,
        issue_title: "robots.txt not found",
        category: "technical",
        severity: "low",
        status: "open",
        recommendation: "Publish a robots.txt at the site root to control crawler behavior.",
      });
    }

    if (issuesToInsert.length > 0) {
      const { error: insErr } = await supabase.from("seo_issues").insert(issuesToInsert);
      if (!insErr) issuesCreated = issuesToInsert.length;
    }
  }

  // 4. AI generation
  const KW_CEILING = 15;
  const CONTENT_CEILING = 8;

  const { count: existingKwCount } = await supabase
    .from("seo_keywords")
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId);

  const { count: existingOpenContentCount } = await supabase
    .from("seo_content_opportunities")
    .select("*", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("status", "open");

  const kwCount = existingKwCount || 0;
  const openContentCount = existingOpenContentCount || 0;
  const skipAi = kwCount >= KW_CEILING && openContentCount >= CONTENT_CEILING;

  if (lovableKey && !skipAi) {
    const locations = [serviceAreas, client.primary_location].filter(Boolean).join("; ");
    const prompt = `You are an SEO strategist. Generate a localized SEO plan for this business:

Business name: ${client.business_name || "Unknown"}
Industry: ${client.industry || "Unknown"}
Business type: ${client.business_type || "Unknown"}
Locations / service areas: ${locations || "Unknown"}

Return STRICT JSON ONLY (no prose, no markdown fences) with this exact shape:
{
  "keywords": [ { "keyword": "string", "volume_tier": "high"|"medium"|"low" } ],
  "content_opportunities": [ { "topic_title": "string", "target_keyword": "string", "opportunity_type": "blog_post"|"new_page"|"location_page"|"faq"|"optimization", "priority": "low"|"medium"|"high" } ]
}

Requirements:
- keywords: 12 to 15 entries, localized to the cities listed and the industry. Mix high/medium/low volume.
- content_opportunities: 6 to 8 entries focused on driving local organic traffic.`;

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

    if (aiRes.ok) {
      const aiJson = await aiRes.json();
      const content = aiJson?.choices?.[0]?.message?.content || "";
      let parsed: { keywords?: Array<{ keyword: string; volume_tier: string }>; content_opportunities?: Array<{ topic_title: string; target_keyword: string; opportunity_type: string; priority: string }> } = {};
      try {
        parsed = JSON.parse(stripFences(content));
      } catch {
        parsed = {};
      }

      const maxNewKeywords = Math.max(0, KW_CEILING - kwCount);
      const maxNewContent = Math.max(0, CONTENT_CEILING - openContentCount);

      if (Array.isArray(parsed.keywords) && parsed.keywords.length > 0 && maxNewKeywords > 0) {
        const { data: existingKw } = await supabase
          .from("seo_keywords")
          .select("keyword")
          .eq("client_id", clientId);
        const have = new Set((existingKw || []).map(r => (r.keyword || "").toLowerCase()));
        const rows: Array<Record<string, unknown>> = [];
        for (const k of parsed.keywords.slice(0, maxNewKeywords)) {
          if (!k?.keyword) continue;
          const kw = String(k.keyword).trim();
          if (!kw) continue;
          if (have.has(kw.toLowerCase())) continue;
          have.add(kw.toLowerCase());
          rows.push({
            client_id: clientId,
            keyword: kw,
            position: null,
            search_volume: volumeFromTier(k.volume_tier),
          });
        }
        if (rows.length > 0) {
          const { error: kErr } = await supabase.from("seo_keywords").insert(rows);
          if (!kErr) keywordsCreated = rows.length;
        }
      }

      if (Array.isArray(parsed.content_opportunities) && parsed.content_opportunities.length > 0 && maxNewContent > 0) {
        const { data: existingCo } = await supabase
          .from("seo_content_opportunities")
          .select("topic_title")
          .eq("client_id", clientId);
        const haveCo = new Set((existingCo || []).map(r => (r.topic_title || "").toLowerCase()));
        const allowedType = new Set(["blog_post", "new_page", "location_page", "faq", "optimization"]);
        const allowedPriority = new Set(["low", "medium", "high"]);
        const rows: Array<Record<string, unknown>> = [];
        for (const c of parsed.content_opportunities.slice(0, maxNewContent)) {
          const title = String(c?.topic_title || "").trim();
          if (!title) continue;
          if (haveCo.has(title.toLowerCase())) continue;
          haveCo.add(title.toLowerCase());
          const type = allowedType.has(c.opportunity_type) ? c.opportunity_type : "blog_post";
          const prio = allowedPriority.has(c.priority) ? c.priority : "medium";
          rows.push({
            client_id: clientId,
            topic_title: title,
            target_keyword: c.target_keyword || null,
            opportunity_type: type,
            priority: prio,
            status: "open",
          });
        }
        if (rows.length > 0) {
          const { error: cErr } = await supabase.from("seo_content_opportunities").insert(rows);
          if (!cErr) contentCreated = rows.length;
        }
      }
    }
  }

  // 5. Local seeding
  if (serviceAreas && serviceAreas.trim()) {
    const cities = serviceAreas.split(",").map(s => s.trim()).filter(Boolean);
    if (cities.length > 0) {
      const { data: existingLoc } = await supabase
        .from("seo_local_visibility")
        .select("location_name")
        .eq("client_id", clientId);
      const haveLoc = new Set((existingLoc || []).map(r => (r.location_name || "").toLowerCase()));
      const rows: Array<Record<string, unknown>> = [];
      for (const city of cities) {
        if (haveLoc.has(city.toLowerCase())) continue;
        haveLoc.add(city.toLowerCase());
        rows.push({
          client_id: clientId,
          location_name: city,
          visibility_status: "unknown",
          notes: "Auto-seeded from intake",
        });
      }
      if (rows.length > 0) {
        const { error: lErr } = await supabase.from("seo_local_visibility").insert(rows);
        if (!lErr) locationsCreated = rows.length;
      }
    }
  }

  return {
    issues_created: issuesCreated,
    keywords_created: keywordsCreated,
    content_created: contentCreated,
    locations_created: locationsCreated,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const cronSecret = Deno.env.get("CRON_SECRET");

  // AUTH: cron secret header OR valid user JWT
  const cronHeader = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization");

  let authorized = false;
  if (cronSecret && cronHeader && cronHeader === cronSecret) {
    authorized = true;
  } else if (authHeader?.startsWith("Bearer ")) {
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (!userErr && userData.user) authorized = true;
  }
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json().catch(() => ({}));

    if (body?.refresh_all === true) {
      const { data: clientsList, error: listErr } = await supabase
        .from("clients")
        .select("id")
        .not("status", "in", "(churned,cancelled)");
      if (listErr) return json({ error: listErr.message }, 500);

      let totalIssues = 0;
      let totalKeywords = 0;
      let totalContent = 0;
      let totalLocations = 0;
      const failures: Array<{ client_id: string; error: string }> = [];
      let processed = 0;

      for (const c of clientsList || []) {
        try {
          const r = await generateForClient(supabase, c.id, lovableKey);
          totalIssues += r.issues_created;
          totalKeywords += r.keywords_created;
          totalContent += r.content_created;
          totalLocations += r.locations_created;
          processed += 1;
        } catch (err) {
          failures.push({
            client_id: c.id,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      await supabase.from("seo_run_log").insert({
        triggered_by: cronHeader && cronSecret && cronHeader === cronSecret ? "cron" : "manual",
        clients_processed: processed,
        total_keywords: totalKeywords,
        total_content: totalContent,
        total_issues: totalIssues,
        total_locations: totalLocations,
        failures,
      });

      return json({
        clients_processed: processed,
        total_issues: totalIssues,
        total_keywords: totalKeywords,
        total_content: totalContent,
        total_locations: totalLocations,
        failures,
      });
    }

    const clientId = body.client_id;
    if (!clientId) return json({ error: "client_id required" }, 400);

    const result = await generateForClient(supabase, clientId, lovableKey);

    await supabase.from("seo_run_log").insert({
      triggered_by: "manual",
      clients_processed: 1,
      total_keywords: result.keywords_created,
      total_content: result.content_created,
      total_issues: result.issues_created,
      total_locations: result.locations_created,
      failures: [],
    });

    return json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return json({ error: msg }, 500);
  }
});
