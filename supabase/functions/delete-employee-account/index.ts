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
      return json({ error: "Delete employee account is not configured" }, 500);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) return json({ error: "Not authenticated" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin", "operator"])
      .limit(1)
      .maybeSingle();
    if (!callerRole) return json({ error: "Only admins and operators can delete accounts" }, 403);

    const body = await req.json().catch(() => ({}));
    const userId = String(body.user_id || "").trim();
    if (!userId) return json({ error: "user_id is required" }, 400);
    if (userId === caller.id) return json({ error: "You cannot delete your own account" }, 400);

    // Remove person records. Calendars, calendar_events, and bdr_calendar_events are
    // intentionally left untouched as historical meeting records.
    const cleanupTables = ["user_roles", "employee_profiles", "workspace_users"];
    for (const table of cleanupTables) {
      const { error } = await adminClient.from(table).delete().eq("user_id", userId);
      if (error) console.warn(`cleanup ${table} failed:`, error.message);
    }

    // Remove the actual auth login. If this fails, the person is still gone from
    // the app — surface it as a warning rather than failing the whole request.
    let warning: string | null = null;
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error("auth.admin.deleteUser failed:", deleteAuthError);
      warning = `App records deleted, but auth account removal failed: ${deleteAuthError.message}`;
    }

    await adminClient.from("audit_logs").insert({
      client_id: null,
      user_id: caller.id,
      action: "employee_account_deleted",
      module: "team",
      metadata: { deleted_user_id: userId },
    }).then(() => {}, () => {});

    return json({ success: true, ...(warning ? { warning } : {}) });
  } catch (err: any) {
    console.error("delete-employee-account error:", err);
    return json({ error: err?.message || "Unexpected error" }, 500);
  }
});
