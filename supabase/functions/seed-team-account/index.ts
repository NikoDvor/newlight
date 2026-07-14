// One-shot: reset password for team@newlightgen.com to "Newlight".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = "team@newlightgen.com";
    let userId: string | undefined;
    let currentUser: any = null;
    for (let page = 1; page <= 25 && !userId; page++) {
      const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return json({ error: error.message }, 400);
      const found = list?.users?.find((u) => (u.email || "").toLowerCase() === email);
      if (found) { userId = found.id; currentUser = found; }
      if (!list?.users || list.users.length < 200) break;
    }
    if (!userId) return json({ error: `not found: ${email}` }, 404);

    const before = {
      id: currentUser.id,
      email: currentUser.email,
      email_confirmed_at: currentUser.email_confirmed_at,
      phone: currentUser.phone,
      banned_until: currentUser.banned_until,
      last_sign_in_at: currentUser.last_sign_in_at,
      user_metadata: currentUser.user_metadata,
    };

    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password: "Newlight",
      email_confirm: true,
      ban_duration: "none",
    } as any);
    if (updErr) return json({ error: updErr.message, before }, 400);

    return json({ success: true, before, password_reset_to: "Newlight" });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
