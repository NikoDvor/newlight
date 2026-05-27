// Generates a magic-link token_hash for a target user so an admin can swap
// their Supabase session into that user. Requires the caller to be an admin.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "missing_auth" }, 401);

    // Verify caller is an admin
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user: caller }, error: callerErr } = await userClient.auth.getUser();
    if (callerErr || !caller) return json({ error: "invalid_session" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "operator");
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const { targetUserId, targetEmail } = await req.json().catch(() => ({}));
    if (!targetUserId && !targetEmail) return json({ error: "missing_target" }, 400);

    // Resolve target email
    let email = targetEmail as string | undefined;
    if (!email && targetUserId) {
      const { data: u, error: uErr } = await admin.auth.admin.getUserById(targetUserId);
      if (uErr || !u?.user?.email) return json({ error: "target_not_found" }, 404);
      email = u.user.email;
    }

    // Generate magic link → returns hashed_token that the client can verify
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: email!,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      return json({ error: "link_failed", detail: linkErr?.message }, 500);
    }

    return json({
      token_hash: link.properties.hashed_token,
      email,
    });
  } catch (e) {
    return json({ error: "server_error", detail: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
