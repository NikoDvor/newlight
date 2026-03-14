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
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

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

    // Check if user already exists
    const { data: existingUsers } =
      await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email === email
    );

    let userId: string;
    let inviteEmailSent = false;
    let setupLink: string | null = null;

    if (existingUser) {
      // User already exists — just assign the role
      userId = existingUser.id;
    } else {
      // Try invite first (sends password setup email)
      const { data: inviteData, error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(email, {
          data: { full_name: email.split("@")[0] },
          redirectTo: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth`,
        });

      if (inviteError) {
        // Fallback: generate a magic link that admin can share manually
        const { data: linkData, error: linkError } =
          await adminClient.auth.admin.generateLink({
            type: "invite",
            email,
            options: {
              data: { full_name: email.split("@")[0] },
              redirectTo: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth`,
            },
          });

        if (linkError) {
          return new Response(
            JSON.stringify({ error: linkError.message }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        userId = linkData.user.id;
        // Build the setup link from the generated token properties
        const actionLink = linkData.properties?.action_link;
        if (actionLink) {
          setupLink = actionLink;
        }
      } else {
        userId = inviteData.user.id;
        inviteEmailSent = true;
      }
    }

    // Remove any existing roles for this user (to avoid duplicates)
    await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    // Assign role
    const clientRoles = ["client_owner", "client_team", "read_only"];
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: userId,
        role,
        client_id: clientRoles.includes(role) ? client_id || null : null,
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
