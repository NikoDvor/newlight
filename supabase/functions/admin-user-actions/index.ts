import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Check caller permissions: admin OR project_manager/client_owner of target's workspace
    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role, client_id")
      .eq("user_id", user.id);
    const isAdmin = (callerRoles ?? []).some((r) => r.role === "admin");
    const managerClientIds = (callerRoles ?? [])
      .filter((r) => ["project_manager", "client_owner"].includes(r.role))
      .map((r) => r.client_id)
      .filter(Boolean);

    const body = await req.json();
    const { action, target_user_id, target_email } = body;

    const checkScope = async (targetId: string) => {
      if (isAdmin) return true;
      const { data: targetRoles } = await admin
        .from("user_roles")
        .select("client_id")
        .eq("user_id", targetId);
      return (targetRoles ?? []).some((r) => r.client_id && managerClientIds.includes(r.client_id));
    };

    if (action === "force_password_reset") {
      // Require BOTH target_user_id (for scope enforcement) AND target_email (for magic link).
      if (!target_user_id) return json({ error: "target_user_id required" }, 400);
      if (!target_email) return json({ error: "target_email required" }, 400);
      // Verify the email actually belongs to target_user_id — prevents an authorized
      // manager from triggering a reset email to an arbitrary address by pairing
      // a legitimate target_user_id with an unrelated email.
      const { data: targetUser, error: getErr } = await admin.auth.admin.getUserById(target_user_id);
      if (getErr || !targetUser?.user) return json({ error: "Target user not found" }, 404);
      if ((targetUser.user.email || "").toLowerCase() !== target_email.toLowerCase()) {
        return json({ error: "target_email does not match target_user_id" }, 400);
      }
      if (!(await checkScope(target_user_id))) return json({ error: "Forbidden" }, 403);
      const redirectTo = body.redirect_to ?? `${new URL(req.url).origin}/reset-password`;
      const { error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: target_email,
        options: { redirectTo },
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "suspend" || action === "reactivate") {
      if (!target_user_id) return json({ error: "target_user_id required" }, 400);
      if (!(await checkScope(target_user_id))) return json({ error: "Forbidden" }, 403);
      const status = action === "suspend" ? "suspended" : "active";
      const banDuration = action === "suspend" ? "876000h" : "none"; // ~100 years vs unban
      const { error: banErr } = await admin.auth.admin.updateUserById(target_user_id, {
        ban_duration: banDuration,
      });
      if (banErr) return json({ error: banErr.message }, 400);
      await admin.from("user_roles").update({ status }).eq("user_id", target_user_id);
      return json({ ok: true, status });
    }

    if (action === "get_user_details") {
      if (!target_user_id) return json({ error: "target_user_id required" }, 400);
      if (!(await checkScope(target_user_id))) return json({ error: "Forbidden" }, 403);
      const { data: u, error } = await admin.auth.admin.getUserById(target_user_id);
      if (error) return json({ error: error.message }, 400);
      return json({
        email: u.user?.email,
        phone: u.user?.phone,
        created_at: u.user?.created_at,
        last_sign_in_at: u.user?.last_sign_in_at,
        banned_until: (u.user as any)?.banned_until,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e.message ?? "Server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
