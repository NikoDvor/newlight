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
    if (!callerRole) return json({ error: "Only admins and operators can update user phones" }, 403);

    const body = await req.json();
    const userId = String(body.user_id || "").trim();
    const newPhone = String(body.new_phone ?? "").trim();

    if (!userId) return json({ error: "user_id is required" }, 400);
    if (newPhone && !/^\+[1-9]\d{7,14}$/.test(newPhone)) {
      return json({ error: "Phone must be E.164 format (e.g. +15551234567)" }, 400);
    }

    const { data: targetResp, error: targetErr } = await adminClient.auth.admin.getUserById(userId);
    if (targetErr || !targetResp?.user) {
      return json({ error: "Target user not found" }, 404);
    }
    const existingMetadata = targetResp.user.user_metadata || {};

    const { error: updateErr } = await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: { ...existingMetadata, phone: newPhone },
    });
    if (updateErr) {
      return json({ error: updateErr.message || "Failed to update phone" }, 400);
    }

    // Best-effort mirror to profile tables
    await adminClient.from("employee_profiles").update({ phone: newPhone || null }).eq("user_id", userId);
    await adminClient.from("workspace_users").update({ phone: newPhone || null }).eq("user_id", userId);

    await adminClient.from("audit_logs").insert({
      client_id: null,
      user_id: caller.id,
      action: "user_phone_updated",
      module: "team",
      status: "success",
      metadata: { target_user_id: userId, new_phone: newPhone },
    });

    return json({ success: true, user_id: userId, phone: newPhone });
  } catch (err) {
    return json({ error: (err as Error).message || "Failed to update phone" }, 500);
  }
});
