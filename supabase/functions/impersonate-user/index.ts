// Generates a magic-link token_hash for a target user so an admin can swap
// their Supabase session into that user. Admins may impersonate anyone; operators only non-staff users.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireStaff } from "../_shared/auth.ts";
import { targetIsPrivileged, securityAudit } from "../_shared/privileged.ts";

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

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const caller = await requireStaff(req, admin);
    if (!caller.ok) return json({ error: caller.status === 401 ? "invalid_session" : "forbidden" }, caller.status);

    const { targetUserId, targetEmail } = await req.json().catch(() => ({}));
    if (!targetUserId && !targetEmail) return json({ error: "missing_target" }, 400);
    if (targetUserId && targetUserId === caller.userId) return json({ error: "cannot_impersonate_self" }, 400);

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

    // Resolved target id (works for email-only requests too). Operators may only impersonate non-staff users.
    const resolvedId: string = (link as any).user?.id ?? targetUserId ?? "";
    if (resolvedId && resolvedId === caller.userId) return json({ error: "cannot_impersonate_self" }, 400);
    if (!caller.isAdmin && (!resolvedId || await targetIsPrivileged(admin, resolvedId))) {
      return json({ error: "forbidden_target" }, 403);
    }
    await securityAudit(admin, caller.userId, "user_impersonated", { target_user_id: resolvedId, target_email: email, caller_role: caller.isAdmin ? "admin" : "operator" });

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
