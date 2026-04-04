import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Verify caller identity
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller is admin/operator
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .in("role", ["admin", "operator"])
      .maybeSingle();

    if (!callerRole) {
      return new Response(
        JSON.stringify({ error: "Only admins and operators can invite users" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { email, role, client_id } = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "Email and role are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Only admins can assign admin role
    if (role === "admin" && callerRole.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can assign admin role" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Attempt to invite — handles both new and existing users robustly
    let userId: string = "";
    let inviteEmailSent = false;
    let setupLink: string | null = null;
    let alreadyExisted = false;

    // Try invite first — if user exists, this will fail with a known error
    // Derive site URL for activation redirect
    const siteUrl = (Deno.env.get("SITE_URL") || supabaseUrl.replace(".supabase.co", ".lovable.app")).replace(/\/$/, "");
    const activateRedirect = `${siteUrl}/activate`;

    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: email.split("@")[0] },
        redirectTo: activateRedirect,
      });

    if (inviteError) {
      const errMsg = inviteError.message?.toLowerCase() || "";
      const isExistingUser = errMsg.includes("already") || errMsg.includes("registered") || errMsg.includes("exists") || errMsg.includes("duplicate");

      if (isExistingUser) {
        // User exists — look them up via generateLink (reliable, no pagination)
        const { data: linkData } = await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email,
        });

        if (linkData?.user?.id) {
          userId = linkData.user.id;
          alreadyExisted = true;
        } else {
          return new Response(
            JSON.stringify({ error: "User exists but could not be found for linking" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      } else {
        // Invite genuinely failed — try generateLink fallback
        const { data: linkData, error: linkError } =
          await adminClient.auth.admin.generateLink({
            type: "invite",
            email,
            options: {
              data: { full_name: email.split("@")[0] },
            },
          });

        if (linkError || !linkData?.user?.id) {
          return new Response(
            JSON.stringify({ error: linkError?.message || inviteError.message }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        userId = linkData.user.id;
        setupLink = linkData.properties?.action_link || null;
      }
    } else if (inviteData?.user?.id) {
      userId = inviteData.user.id;
      inviteEmailSent = true;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Could not create or find user account" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Assign role — scope by client_id for client roles
    const clientRoles = ["client_owner", "client_team", "read_only"];
    const isClientRole = clientRoles.includes(role);
    const targetClientId = isClientRole ? client_id || null : null;

    if (isClientRole && targetClientId) {
      // Remove only this client's role for this user (avoid duplicates)
      await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("client_id", targetClientId);
    } else if (!isClientRole) {
      // Admin/operator: remove all existing roles
      await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
    }

    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: userId,
        role,
        client_id: targetClientId,
      });

    if (roleError) {
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        invite_email_sent: inviteEmailSent,
        setup_link: setupLink,
        already_existed: alreadyExisted,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
