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
      return json({ error: "Delete user is not configured" }, 500);
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
    if (!callerRole) return json({ error: "Only admins and operators can delete users" }, 403);

    const body = await req.json().catch(() => ({}));
    const userId = String(body.user_id || "").trim();
    if (!userId) return json({ error: "user_id is required" }, 400);
    if (userId === caller.id) return json({ error: "You cannot delete your own account" }, 400);

    // Purge from application tables that reference the user. Failures are non-fatal
    // (some rows may not exist or RLS-free deletes may return 0 rows) but are logged.
    const cleanupTables = [
      "user_roles",
      "employee_profiles",
      "workspace_users",
      "calendar_users",
      "calendar_access",
      "chat_participants",
      "bdr_calendars",
      "bdr_calendar_events",
      "nl_bdr_leads",
      "nl_bdr_objections",
      "nl_certifications",
      "nl_module_completion",
      "nl_module_exams",
      "nl_objection_unlocks",
      "nl_practice_recordings",
      "nl_training_certifications",
      "nl_training_chapter_level_progress",
      "nl_training_exam_attempts",
      "nl_training_flashcard_progress",
      "nl_training_progress",
      "nl_user_reflections",
      "workers",
    ];

    for (const table of cleanupTables) {
      const { error } = await adminClient.from(table).delete().eq("user_id", userId);
      if (error) console.warn(`cleanup ${table} failed:`, error.message);
    }

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error("auth.admin.deleteUser failed:", deleteAuthError);
      return json({ error: `Failed to remove auth user: ${deleteAuthError.message}` }, 500);
    }

    await adminClient.from("audit_logs").insert({
      actor_user_id: caller.id,
      action: "user.deleted",
      entity_type: "auth.user",
      entity_id: userId,
      metadata: { deleted_by: caller.email ?? null },
    }).then(() => {}, () => {});

    return json({ success: true });
  } catch (err: any) {
    console.error("delete-user-manual error:", err);
    return json({ error: err?.message || "Unexpected error" }, 500);
  }
});
