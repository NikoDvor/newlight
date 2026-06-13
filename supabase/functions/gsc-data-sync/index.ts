import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

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

async function refreshAccessToken(
  clientSecret: string,
  clientId: string,
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function syncGscForClient(
  supabase: ReturnType<typeof createClient>,
  clientId: string,
  googleClientId: string,
  googleClientSecret: string,
): Promise<{ keywords_updated: number; error?: string }> {
  const { data: conn, error: connErr } = await supabase
    .from("client_oauth_connections")
    .select("*")
    .eq("client_id", clientId)
    .eq("integration_type", "gsc")
    .eq("status", "active")
    .maybeSingle();

  if (connErr || !conn) return { keywords_updated: 0, error: "No GSC connection found" };

  let accessToken = conn.access_token;
  const expiry = conn.token_expiry ? new Date(conn.token_expiry) : null;
  const now = new Date();

  if (!expiry || expiry <= now) {
    if (!conn.refresh_token) {
      await supabase.from("client_oauth_connections").update({ status: "expired" }).eq("id", conn.id);
      return { keywords_updated: 0, error: "Token expired, no refresh token" };
    }
    const refreshed = await refreshAccessToken(googleClientSecret, googleClientId, conn.refresh_token);
    if (!refreshed) {
      await supabase.from("client_oauth_connections").update({ status: "expired" }).eq("id", conn.id);
      return { keywords_updated: 0, error: "Token refresh failed" };
    }
    accessToken = refreshed.access_token;
    const newExpiry = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString();
    await supabase.from("client_oauth_connections").update({
      access_token: accessToken,
      token_expiry: newExpiry,
    }).eq("id", conn.id);
  }

  const propertyUrl = conn.property_url;
  if (!propertyUrl) return { keywords_updated: 0, error: "No GSC property URL" };

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 28);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const gscRes = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(propertyUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: ["query"],
        rowLimit: 100,
        dimensionFilterGroups: [],
      }),
    }
  );

  if (!gscRes.ok) {
    const errText = await gscRes.text();
    console.error("GSC API error:", errText);
    return { keywords_updated: 0, error: "GSC API request failed" };
  }

  const gscData = await gscRes.json();
  const rows = gscData.rows || [];

  let keywordsUpdated = 0;

  for (const row of rows) {
    const keyword = row.keys?.[0];
    if (!keyword) continue;

    const clicks = Math.round(row.clicks || 0);
    const impressions = Math.round(row.impressions || 0);
    const position = Math.round(row.position || 0);

    const { data: existing } = await supabase
      .from("seo_keywords")
      .select("id")
      .eq("client_id", clientId)
      .ilike("keyword", keyword)
      .maybeSingle();

    if (existing) {
      await supabase.from("seo_keywords").update({
        position,
        search_volume: impressions,
        clicks,
        last_synced_at: new Date().toISOString(),
      }).eq("id", existing.id);
      keywordsUpdated++;
    }
  }

  return { keywords_updated: keywordsUpdated };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const cronSecret = Deno.env.get("CRON_SECRET");

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

  const body = await req.json().catch(() => ({}));
  const clientId = body.client_id;

  if (!clientId) return json({ error: "client_id required" }, 400);

  const result = await syncGscForClient(supabase, clientId, googleClientId, googleClientSecret);

  return json(result);
});
