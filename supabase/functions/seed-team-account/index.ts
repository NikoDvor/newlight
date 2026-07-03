// One-shot seeder: creates the Team booking account using the SAME logic as
// create-user-manual (rolePreset="bdr") and then a bdr_calendars row using
// the SAME logic as src/lib/bdrCalendar.ts ensureBdrCalendar(). Safe to re-run.
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
    const temporaryPassword = crypto.randomUUID().replace(/-/g, "") + "A1!";
    const rolePreset = "bdr";
    const jobTitle = "BDR";

    // Mirror create-user-manual: create auth user, delete stale if already exists.
    let userId: string | undefined;
    const meta = { full_name: fullName, role_preset: rolePreset, created_manually: true, phone };
    const created = await admin.auth.admin.createUser({
      email, password: temporaryPassword, email_confirm: true, user_metadata: meta,
    });
    userId = created.data?.user?.id;
    if (created.error || !userId) {
      const msg = (created.error?.message || "").toLowerCase();
      if (msg.includes("already")) {
        const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = list.data?.users?.find((u) => (u.email || "").toLowerCase() === email);
        if (existing) userId = existing.id;
        if (!userId) return json({ error: "user exists but not found" }, 400);
        // Update metadata + password to keep in sync with manual path
        await admin.auth.admin.updateUserById(userId, { password: temporaryPassword, user_metadata: meta, email_confirm: true } as any);
      } else {
        return json({ error: created.error?.message || "create failed" }, 400);
      }
    }

    // Roles: platform-wide marketing_staff (BDR preset)
    await admin.from("user_roles").delete().eq("user_id", userId!).is("client_id", null).eq("role", "client_team");
    const { data: existingRole } = await admin.from("user_roles").select("id").eq("user_id", userId!).eq("role", "marketing_staff").is("client_id", null).maybeSingle();
    if (!existingRole) {
      const { error: roleErr } = await admin.from("user_roles").insert({ user_id: userId!, role: "marketing_staff", client_id: null });
      if (roleErr) return json({ error: `role: ${roleErr.message}` }, 400);
    }

    // employee_profiles (scoped to NewLight Internal client for data)
    const { data: existingEmp } = await admin.from("employee_profiles").select("id").eq("user_id", userId!).maybeSingle();
    if (!existingEmp) {
      const { error: empErr } = await admin.from("employee_profiles").insert({
        user_id: userId!, full_name: fullName, email,
        department: null, job_title: jobTitle, employee_role: "marketing_staff",
        status: "active", client_id: NEWLIGHT_INTERNAL_CLIENT_ID,
      });
      if (empErr) return json({ error: `emp: ${empErr.message}` }, 400);
    } else {
      await admin.from("employee_profiles").update({ full_name: fullName, email, job_title: jobTitle, status: "active" }).eq("user_id", userId!);
    }

    // bdr_calendars — same shape as ensureBdrCalendar, booking_slug forced to "team"
    const { data: existingCal } = await admin.from("bdr_calendars").select("*").eq("user_id", userId!).maybeSingle();
    let calendar = existingCal;
    if (!calendar) {
      const { data: newCal, error: calErr } = await admin.from("bdr_calendars").insert({
        user_id: userId!, client_id: NEWLIGHT_INTERNAL_CLIENT_ID,
        name: `${fullName.split(" ")[0]}'s Pipeline Calendar`,
        booking_slug: "team",
      }).select("*").single();
      if (calErr) return json({ error: `cal: ${calErr.message}` }, 400);
      calendar = newCal;
    } else if (calendar.booking_slug !== "team") {
      await admin.from("bdr_calendars").update({ booking_slug: "team" }).eq("id", calendar.id);
    }

    return json({ success: true, user_id: userId, calendar_id: (calendar as any)?.id, temporary_password: temporaryPassword });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
