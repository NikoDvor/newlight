import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROLE_PRESETS = new Set(["workspace_admin", "manager", "marketing_staff", "support_staff", "custom"]);
const PLATFORM_WIDE_VALUES = new Set(["", "platform", "platform-wide", "__platform__"]);

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
      console.error("Missing required function secrets", {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
        hasAnonKey: Boolean(anonKey),
      });
      return json({ error: "Manual account creation is not configured" }, 500);
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

    if (!callerRole) return json({ error: "Only admins and operators can create users" }, 403);

    const body = await req.json();
    const fullName = String(body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const temporaryPassword = String(body.temporary_password || "");
    const rolePreset = String(body.role_preset || "custom");
    const rawClientId = body.client_id == null ? "" : String(body.client_id).trim();
    const clientId = PLATFORM_WIDE_VALUES.has(rawClientId) ? null : rawClientId;
    const department = body.department ? String(body.department).trim() : null;
    const jobTitle = body.job_title ? String(body.job_title).trim() : null;

    if (!fullName || !email || !temporaryPassword) {
      return json({ error: "Full name, email, and temporary password are required" }, 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Invalid email address" }, 400);
    if (temporaryPassword.length < 8) return json({ error: "Temporary password must be at least 8 characters" }, 400);
    if (!ROLE_PRESETS.has(rolePreset)) return json({ error: "Invalid role preset" }, 400);

    if (clientId) {
      const { data: client, error: clientError } = await adminClient.from("clients").select("id").eq("id", clientId).maybeSingle();
      if (clientError) {
        console.error("Client lookup failed", { clientId, message: clientError.message });
        return json({ error: "Could not verify client workspace" }, 400);
      }
      if (!client) return json({ error: "Client workspace not found" }, 404);
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role_preset: rolePreset, created_manually: true },
    });

    if (createError || !created.user?.id) {
      return json({ error: createError?.message || "Could not create user account" }, 400);
    }

    const userId = created.user.id;
    await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .is("client_id", null)
      .eq("role", "client_team");

    const platformRole = clientId
      ? rolePreset === "workspace_admin" ? "client_owner" : "client_team"
      : rolePreset === "workspace_admin" ? "admin" : "operator";

    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: userId,
      role: platformRole,
      client_id: clientId,
    });
    if (roleError) {
      console.error("User role insert failed", { userId, role: platformRole, clientId, message: roleError.message });
      await adminClient.auth.admin.deleteUser(userId);
      return json({ error: roleError.message }, 400);
    }

    if (!clientId) {
      await adminClient.from("audit_logs").insert({
        client_id: null,
        user_id: caller.id,
        action: "manual_platform_user_created",
        module: "team",
        status: "success",
        metadata: { created_user_id: userId, full_name: fullName, email, role_preset: rolePreset, platform_role: platformRole },
      });

      return json({ success: true, user_id: userId, platform_role: platformRole });
    }

    const { error: workspaceError } = await adminClient.from("workspace_users").insert({
      client_id: clientId,
      user_id: userId,
      full_name: fullName,
      email,
      department,
      job_title: jobTitle,
      role_preset: rolePreset,
      status: "active",
      provisioning_status: "provisioned",
      provisioned_at: new Date().toISOString(),
      is_bookable_staff: false,
    });
    if (workspaceError) {
      console.error("Workspace user insert failed", { userId, clientId, message: workspaceError.message });
      await adminClient.from("user_roles").delete().eq("user_id", userId).eq("client_id", clientId);
      await adminClient.auth.admin.deleteUser(userId);
      return json({ error: workspaceError.message }, 400);
    }

    await adminClient.from("audit_logs").insert({
      client_id: clientId,
      user_id: caller.id,
      action: "manual_user_created",
      module: "team",
      status: "success",
      metadata: { created_user_id: userId, full_name: fullName, email, role_preset: rolePreset },
    });

    return json({ success: true, user_id: userId });
  } catch (err) {
    return json({ error: (err as Error).message || "Failed to create account" }, 500);
  }
});
