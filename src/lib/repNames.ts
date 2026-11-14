import { supabase } from "@/integrations/supabase/client";

/** Display names for staff/salesmen. Salesmen live in employee_profiles, not workspace_users, so check both. */
export async function fetchRepNames(userIds: string[]): Promise<Record<string, string>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  const map: Record<string, string> = {};
  if (!ids.length) return map;
  const [{ data: emps }, { data: wu }] = await Promise.all([
    (supabase as any).from("employee_profiles").select("user_id, full_name").in("user_id", ids),
    (supabase as any).from("workspace_users").select("user_id, full_name").in("user_id", ids),
  ]);
  (wu || []).forEach((u: any) => { const n = u.full_name; if (n) map[u.user_id] = n; });
  (emps || []).forEach((e: any) => { if (e.full_name) map[e.user_id] = e.full_name; });
  return map;
}
