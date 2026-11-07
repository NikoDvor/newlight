import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

function b64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
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
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const siteUrl = Deno.env.get("SITE_URL") || "https://newlightgen.com";

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return Response.redirect(`${siteUrl}/seo?gsc_error=${encodeURIComponent(error)}`, 302);
  }

  if (!code || !stateRaw) {
    return Response.redirect(`${siteUrl}/seo?gsc_error=missing_params`, 302);
  }

  // Verify HMAC signature and 15-minute expiry (state is created by gsc-oauth-start). Fails closed.
  const stateSecret = Deno.env.get("GSC_STATE_SECRET") || Deno.env.get("CRON_SECRET") || "";
  let state: { client_id: string; user_id: string; exp: number };
  try {
    if (!stateSecret) throw new Error("no secret");
    const [payload, sig] = stateRaw.split(".");
    if (!payload || !sig) throw new Error("malformed");
    const expected = await hmac(stateSecret, payload);
    if (expected.length !== sig.length) throw new Error("bad sig");
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    if (diff !== 0) throw new Error("bad sig");
    const pad = payload.replace(/-/g, "+").replace(/_/g, "/");
    state = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(pad + "=".repeat((4 - (pad.length % 4)) % 4)), (c) => c.charCodeAt(0))));
    if (!state.client_id || typeof state.exp !== "number" || Date.now() > state.exp) throw new Error("expired");
  } catch {
    return Response.redirect(`${siteUrl}/seo?gsc_error=invalid_state`, 302);
  }

  const redirectUri = `${supabaseUrl}/functions/v1/gsc-oauth-callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("Token exchange failed:", errText);
    return Response.redirect(`${siteUrl}/seo?gsc_error=token_exchange_failed`, 302);
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokens;

  const tokenExpiry = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

  const gscRes = await fetch(
    "https://www.googleapis.com/webmasters/v3/sites",
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  let propertyUrl: string | null = null;
  if (gscRes.ok) {
    const gscData = await gscRes.json();
    const sites = gscData.siteEntry || [];
    const verified = sites.filter((s: any) => s.permissionLevel !== "siteUnverifiedUser");
    if (verified.length > 0) {
      propertyUrl = verified[0].siteUrl;
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { error: upsertErr } = await supabase
    .from("client_oauth_connections")
    .upsert({
      client_id: state.client_id,
      integration_type: "gsc",
      access_token,
      refresh_token,
      token_expiry: tokenExpiry,
      property_url: propertyUrl,
      status: "active",
      connected_at: new Date().toISOString(),
      connected_by: state.user_id,
    }, { onConflict: "client_id,integration_type" });

  if (upsertErr) {
    console.error("Upsert failed:", upsertErr);
    return Response.redirect(`${siteUrl}/seo?gsc_error=db_error`, 302);
  }

  return Response.redirect(`${siteUrl}/seo?gsc_connected=true`, 302);
});
