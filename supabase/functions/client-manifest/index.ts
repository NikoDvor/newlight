import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_ICON = "/pwa-512x512.png";
const DEFAULT_COLOR = "#0EA5E9";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });

const cleanName = (value: unknown, fallback: string) => {
  const name = typeof value === "string" ? value.trim() : "";
  return name ? name.slice(0, 80) : fallback;
};

const cleanIcon = (value: unknown) => {
  const icon = typeof value === "string" ? value.trim() : "";
  if (!icon) return DEFAULT_ICON;
  if (icon.startsWith("https://") || icon.startsWith("/")) return icon;
  return DEFAULT_ICON;
};

const cleanColor = (value: unknown) => {
  const color = typeof value === "string" ? value.trim() : "";
  return /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_COLOR;
};

const firstWord = (value: string) => value.trim().split(/\s+/)[0]?.slice(0, 12) || "App";

const cleanOrigin = (value: string | null) => {
  if (!value) return "";
  try {
    const origin = new URL(value).origin;
    return origin.startsWith("http://") || origin.startsWith("https://") ? origin : "";
  } catch {
    return "";
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const clientId = url.searchParams.get("client_id")?.trim() ?? "";
  const appOrigin = cleanOrigin(url.searchParams.get("app_origin"));

  if (!UUID_RE.test(clientId)) {
    return json({ error: "Valid client_id is required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("client-manifest missing backend configuration", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
    });
    return json({ error: "Manifest service is not configured" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: client, error: clientError } = await adminClient
    .from("clients")
    .select("business_name, workspace_slug")
    .eq("id", clientId)
    .maybeSingle();

  if (clientError) {
    console.error("client-manifest client lookup failed", { clientId, message: clientError.message });
    return json({ error: "Could not load workspace manifest" }, 500);
  }

  if (!client) return json({ error: "Workspace not found" }, 404);

  const { data: branding, error: brandingError } = await adminClient
    .from("client_branding")
    .select("company_name, app_display_name, logo_url, app_icon_url, pwa_icon_url, primary_color")
    .eq("client_id", clientId)
    .maybeSingle();

  if (brandingError) {
    console.error("client-manifest branding lookup failed", { clientId, message: brandingError.message });
    return json({ error: "Could not load workspace branding" }, 500);
  }

  const appName = cleanName(branding?.company_name, cleanName(branding?.app_display_name, cleanName(client.business_name, "NewLight")));
  const iconUrl = cleanIcon(branding?.pwa_icon_url || branding?.app_icon_url || branding?.logo_url);
  const themeColor = cleanColor(branding?.primary_color);
  const startPath = client.workspace_slug ? `/w/${client.workspace_slug}` : "/";
  const startUrl = appOrigin ? `${appOrigin}${startPath}` : startPath;
  const scope = appOrigin ? `${appOrigin}/` : "/";

  return json({
    name: appName,
    short_name: firstWord(appName),
    description: `${appName} workspace`,
    start_url: startUrl,
    scope,
    display: "standalone",
    orientation: "portrait-primary",
    background_color: themeColor,
    theme_color: themeColor,
    icons: [
      { src: iconUrl, sizes: "192x192", type: "image/png" },
      { src: iconUrl, sizes: "512x512", type: "image/png" },
      { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  });
});
