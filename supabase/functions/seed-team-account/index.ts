// One-shot updater: finds the existing team@newlightgen.com auth account,
// sets password to "Rooney17!", updates display name + phone in user_metadata,
// ensures marketing_staff role + employee_profiles row, and ensures a
// bdr_calendars row with booking_slug="team" (same shape as ensureBdrCalendar).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NEWLIGHT_INTERNAL_CLIENT_ID = "00000000-0000-0000-0000-0000000000ff";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, svc, { auth: { autoRefreshToken: false, persistSession: false } });

    const fullName = "Niko Dvortcsak";
    const email = "team@newlightgen.com";
    const phone = "+18058363557";
    const password = "Rooney17!";
    const jobTitle = "BDR";

    // 1) Find existing auth user by email (paginate)
    let userId: string | undefined;
    for (let page = 1; page <= 25 && !userId; page++) {
      const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return json({ error: error.message }, 400);
      const found = list?.users?.find((u) => (u.email || "").toLowerCase() === email);
      if (found) userId = found.id;
      if (!list?.users || list.users.length < 200) break;
    }
    if (!userId) return json({ error: `No existing auth user for ${email}` }, 404);

    // 2) Update password + metadata via auth.admin.updateUserById (same pattern as update-user-email/-phone)
    const { data: targetResp } = await admin.auth.admin.getUserById(userId);
    const existingMeta = (targetResp?.user?.user_metadata as Record<string, unknown>) || {};
    const meta = { ...existingMeta, full_name: fullName, display_name: fullName, phone, role_preset: "bdr" };
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: meta,
    } as any);
    if (updErr) return json({ error: `update auth: ${updErr.message}` }, 400);

    // 3) Ensure marketing_staff platform role (drop stale client_team if present)
    await admin.from("user_roles").delete().eq("user_id", userId).is("client_id", null).eq("role", "client_team");
    const { data: existingRole } = await admin
      .from("user_roles").select("id")
      .eq("user_id", userId).eq("role", "marketing_staff").is("client_id", null).maybeSingle();
    if (!existingRole) {
      const { error: roleErr } = await admin.from("user_roles").insert({ user_id: userId, role: "marketing_staff", client_id: null });
      if (roleErr) return json({ error: `role: ${roleErr.message}` }, 400);
    }

    // 4) employee_profiles (NewLight Internal client) — appears in Admin → Team like Caleb/Arturo/Devon
    const { data: existingEmp } = await admin.from("employee_profiles").select("id").eq("user_id", userId).maybeSingle();
    if (!existingEmp) {
      const { error: empErr } = await admin.from("employee_profiles").insert({
        user_id: userId, full_name: fullName, email, phone,
        department: null, job_title: jobTitle, employee_role: "marketing_staff",
        status: "active", client_id: NEWLIGHT_INTERNAL_CLIENT_ID,
      });
      if (empErr) return json({ error: `emp: ${empErr.message}` }, 400);
    } else {
      await admin.from("employee_profiles")
        .update({ full_name: fullName, email, phone, job_title: jobTitle, status: "active" })
        .eq("user_id", userId);
    }

    // 5) bdr_calendars — mirrors ensureBdrCalendar(), forces booking_slug="team"
    const { data: existingCal } = await admin.from("bdr_calendars").select("*").eq("user_id", userId).maybeSingle();
    let calendar = existingCal;
    if (!calendar) {
      const { data: newCal, error: calErr } = await admin.from("bdr_calendars").insert({
        user_id: userId,
        client_id: NEWLIGHT_INTERNAL_CLIENT_ID,
        name: `${fullName.split(" ")[0]}'s Pipeline Calendar`,
        booking_slug: "team",
      }).select("*").single();
      if (calErr) return json({ error: `cal: ${calErr.message}` }, 400);
      calendar = newCal;
    } else if (calendar.booking_slug !== "team") {
      await admin.from("bdr_calendars").update({ booking_slug: "team" }).eq("id", calendar.id);
    }

    return json({ success: true, user_id: userId, calendar_id: (calendar as any)?.id, email, password_set: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
