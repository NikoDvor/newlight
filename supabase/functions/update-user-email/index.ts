import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: "Function is not configured" }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerData, error: callerError } = await userClient.auth.getUser();
    const caller = callerData?.user;
    if (callerError || !caller) return json({ error: "Not authenticated" }, 401);

    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin", "operator"])
      .limit(1)
      .maybeSingle();
    if (!callerRole) return json({ error: "Only admins and operators can update user emails" }, 403);

    const body = await req.json();
    const userId = String(body.user_id || "").trim();
    const newEmail = String(body.new_email || "").trim().toLowerCase();

    if (!userId) return json({ error: "user_id is required" }, 400);
    if (!newEmail) return json({ error: "new_email is required" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return json({ error: "Invalid email address" }, 400);
    }
    if (newEmail.length > 255) return json({ error: "Email must be under 255 characters" }, 400);

    // Confirm target user exists
    const { data: targetResp, error: targetErr } = await adminClient.auth.admin.getUserById(userId);
    if (targetErr || !targetResp?.user) {
      return json({ error: "Target user not found" }, 404);
    }
    const currentEmail = (targetResp.user.email || "").toLowerCase();
    if (currentEmail === newEmail) {
      return json({ error: "New email is the same as the current email" }, 400);
    }

    // Check email is not already in use by another auth user (paginate)
    const perPage = 200;
    for (let page = 1; page <= 25; page++) {
      const { data: list, error: listErr } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (listErr) return json({ error: listErr.message }, 400);
      const users = list?.users || [];
      const conflict = users.find(
        (u) => (u.email || "").toLowerCase() === newEmail && u.id !== userId,
      );
      if (conflict) return json({ error: "That email is already in use by another user" }, 409);
      if (users.length < perPage) break;
    }

    const { data: updated, error: updateErr } = await adminClient.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true,
    });
    if (updateErr || !updated?.user) {
      return json({ error: updateErr?.message || "Failed to update email" }, 400);
    }

    // Best-effort mirror to profile tables (do not fail if columns absent for a given user)
    await adminClient.from("employee_profiles").update({ email: newEmail }).eq("user_id", userId);
    await adminClient.from("workspace_users").update({ email: newEmail }).eq("user_id", userId);

    await adminClient.from("audit_logs").insert({
      client_id: null,
      user_id: caller.id,
      action: "user_email_updated",
      module: "team",
      status: "success",
      metadata: { target_user_id: userId, old_email: currentEmail, new_email: newEmail },
    });

    return json({ success: true, user_id: userId, email: newEmail });
  } catch (err) {
    return json({ error: (err as Error).message || "Failed to update email" }, 500);
  }
});
