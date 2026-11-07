import { requireClientAccess, authJson } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

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
  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const url = new URL(req.url);
  const clientIdParam = url.searchParams.get("client_id");
  if (!clientIdParam) {
    return new Response(JSON.stringify({ error: "client_id required" }), { status: 400, headers: corsHeaders });
  }

  const access = await requireClientAccess(req, supabase, clientIdParam, anonKey, supabaseUrl);
  if (!access.ok) return authJson(access, corsHeaders);

  // Signed, expiring state so the callback can trust client_id/user_id.
  const stateSecret = Deno.env.get("GSC_STATE_SECRET") || Deno.env.get("CRON_SECRET") || "";
  if (!stateSecret) {
    return new Response(JSON.stringify({ error: "OAuth state signing is not configured" }), { status: 500, headers: corsHeaders });
  }
  const payload = b64url(new TextEncoder().encode(JSON.stringify({
    client_id: clientIdParam,
    user_id: access.userId,
    exp: Date.now() + 15 * 60 * 1000,
  })));
  const state = `${payload}.${await hmac(stateSecret, payload)}`;

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
    state,
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return new Response(JSON.stringify({ url: googleAuthUrl }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
