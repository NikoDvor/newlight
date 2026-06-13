const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.99.1");
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const clientIdParam = url.searchParams.get("client_id");
  if (!clientIdParam) {
    return new Response(JSON.stringify({ error: "client_id required" }), { status: 400, headers: corsHeaders });
  }

  const state = JSON.stringify({
    client_id: clientIdParam,
    user_id: userData.user.id,
  });

  const scopes = [
    "https://www.googleapis.com/auth/webmasters.readonly",
    "openid",
    "email",
  ].join(" ");

  const redirectUri = `${supabaseUrl}/functions/v1/gsc-oauth-callback`;

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state: encodeURIComponent(state),
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return new Response(JSON.stringify({ url: googleAuthUrl }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
