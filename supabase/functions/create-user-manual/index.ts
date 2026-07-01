import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROLE_PRESETS = new Set(["bdr", "sdr", "project_manager", "service_manager", "admin"]);
const PLATFORM_WIDE_VALUES = new Set(["", "platform", "platform-wide", "__platform__"]);
const NEWLIGHT_INTERNAL_CLIENT_ID = "00000000-0000-0000-0000-0000000000ff";

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

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: callerData, error: callerError } = await userClient.auth.getUser();
    const caller = callerData?.user;
    if (callerError || !caller) {
      console.error("Caller auth validation failed", { message: callerError?.message });
      return json({ error: "Not authenticated" }, 401);
    }



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
    const phone = body.phone == null ? "" : String(body.phone).trim();
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
    if (["bdr", "sdr"].includes(rolePreset) && !phone) {
      return json({ error: "Phone number is required for BDR/SDR" }, 400);
    }
    if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) {
      return json({ error: "Phone must be in E.164 format (e.g. +18055551234)" }, 400);
    }


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
      user_metadata: { full_name: fullName, role_preset: rolePreset, created_manually: true, ...(phone ? { phone } : {}) },
    });

    let userId: string | undefined = created?.user?.id;

    if (createError || !userId) {
      const msg = (createError?.message || "").toLowerCase();
      const alreadyExists = msg.includes("already been registered") || msg.includes("already exists") || msg.includes("already registered");

      if (alreadyExists) {
        // Silently hard-delete the stale auth user and retry as a fresh create.
        const { data: list, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (listError) {
          return json({ error: listError.message }, 400);
        }
        const existing = list?.users?.find((u) => (u.email || "").toLowerCase() === email);
        if (existing) {
          await adminClient.auth.admin.deleteUser(existing.id);
        }
        const retry = await adminClient.auth.admin.createUser({
          email,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: { full_name: fullName, role_preset: rolePreset, created_manually: true },
        });
        if (retry.error || !retry.data?.user?.id) {
          return json({ error: retry.error?.message || "Could not create user account" }, 400);
        }
        userId = retry.data.user.id;
      } else {
        return json({ error: createError?.message || "Could not create user account" }, 400);
      }
    }

    // userId is resolved above (either newly created or existing user whose password was reset)
    await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .is("client_id", null)
      .eq("role", "client_team");

    // Map new role presets to underlying app_role + scope
    // bdr/sdr  -> marketing_staff (platform-wide employee, routed via job_title)
    // project_manager -> client_team scoped to assigned client (client_id required)
    // service_manager -> operator (platform-wide, sees all clients, no admin page)
    // admin    -> admin (full access)
    let platformRole: string;
    let effectiveClientId: string | null = clientId;
    let effectiveJobTitle = jobTitle;

    if (rolePreset === "admin") {
      platformRole = "admin";
      effectiveClientId = null;
    } else if (rolePreset === "service_manager") {
      platformRole = "operator";
      effectiveClientId = null;
    } else if (rolePreset === "project_manager") {
      if (!clientId) return json({ error: "Project Manager requires an assigned client" }, 400);
      platformRole = "client_team";
    } else if (rolePreset === "bdr") {
      platformRole = "marketing_staff";
      effectiveClientId = null; // user_roles stays platform-wide
      effectiveJobTitle = jobTitle || "BDR";
    } else if (rolePreset === "sdr") {
      platformRole = "marketing_staff";
      effectiveClientId = null;
      effectiveJobTitle = jobTitle || "SDR";
    } else {
      return json({ error: "Invalid role preset" }, 400);
    }

    // Tenant assignment for employee_profiles (BDR/SDR/Admin/Operator share the platform-wide user_roles row,
    // but their *data* is scoped to a client workspace — default to NewLight Internal).
    const employeeClientId = ["bdr", "sdr", "service_manager", "admin"].includes(rolePreset)
      ? (clientId || NEWLIGHT_INTERNAL_CLIENT_ID)
      : null;

    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: userId,
      role: platformRole,
      client_id: effectiveClientId,
    });
    if (roleError) {
      console.error("User role insert failed", { userId, role: platformRole, clientId: effectiveClientId, message: roleError.message });
      await adminClient.auth.admin.deleteUser(userId);
      return json({ error: roleError.message }, 400);
    }

    if (!effectiveClientId) {
      if (["marketing_staff", "support_staff"].includes(platformRole)) {
        const { error: employeeError } = await adminClient.from("employee_profiles").insert({
          user_id: userId,
          full_name: fullName,
          email,
          department,
          job_title: effectiveJobTitle,
          employee_role: platformRole,
          status: "active",
          client_id: employeeClientId,
        });

        if (employeeError) {
          console.error("Employee profile insert failed", { userId, message: employeeError.message });
          await adminClient.from("user_roles").delete().eq("user_id", userId).is("client_id", null);
          await adminClient.auth.admin.deleteUser(userId);
          return json({ error: employeeError.message }, 400);
        }
      }

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
      client_id: effectiveClientId,
      user_id: userId,
      full_name: fullName,
      email,
      department,
      job_title: effectiveJobTitle,
      role_preset: rolePreset,
      status: "active",
      provisioning_status: "provisioned",
      provisioned_at: new Date().toISOString(),
      is_bookable_staff: false,
    });
    if (workspaceError) {
      console.error("Workspace user insert failed", { userId, clientId: effectiveClientId, message: workspaceError.message });
      await adminClient.from("user_roles").delete().eq("user_id", userId).eq("client_id", effectiveClientId);
      await adminClient.auth.admin.deleteUser(userId);
      return json({ error: workspaceError.message }, 400);
    }

    await adminClient.from("audit_logs").insert({
      client_id: effectiveClientId,
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
