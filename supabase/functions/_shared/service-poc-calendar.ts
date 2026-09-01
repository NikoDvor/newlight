// Shared Service POC calendar helpers (server-side / service role).
// Mirrors src/lib/servicePocCalendar.ts.

// Reserved internal client id for NewLight's own admin operations workspace.
export const ADMIN_OPS_CLIENT_ID = "00000000-0000-0000-0000-0000000000ff";

export const SERVICE_POC_CALENDAR_TYPE = "service_poc";

export async function ensureServicePocCalendar(supabase: any, userId: string) {
  const { data: existing, error: findErr } = await supabase
    .from("calendars")
    .select("*")
    .eq("owner_user_id", userId)
    .eq("calendar_type", SERVICE_POC_CALENDAR_TYPE)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);
  if (existing) return existing;

  const { data: profile } = await supabase
    .from("employee_profiles")
    .select("full_name")
    .eq("user_id", userId)
    .maybeSingle();

  const name = `${profile?.full_name || "Service POC"} — Service Calendar`;

  const { data: created, error: insErr } = await supabase
    .from("calendars")
    .insert({
      calendar_name: name,
      calendar_type: SERVICE_POC_CALENDAR_TYPE,
      owner_user_id: userId,
      client_id: ADMIN_OPS_CLIENT_ID,
      is_active: true,
    })
    .select("*")
    .single();
  if (insErr) throw new Error(insErr.message);
  return created;
}

export async function listServicePocs(supabase: any) {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "service_poc");
  if (error) throw new Error(error.message);
  const ids = Array.from(new Set((roles || []).map((r: any) => r.user_id).filter(Boolean)));
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase
    .from("employee_profiles")
    .select("user_id, full_name, email")
    .in("user_id", ids);

  const byId = new Map((profiles || []).map((p: any) => [p.user_id, p]));
  return ids.map((id: any) => ({
    user_id: id,
    full_name: byId.get(id)?.full_name || "Service POC",
    email: byId.get(id)?.email || null,
  }));
}
