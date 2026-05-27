// Visual-only impersonation: admin stays signed in; UI fetches as the target user.
// Reads/writes still execute under the admin's auth context (RLS-wise),
// but the app shows the target's workspace and identity.

const KEY = "nl_impersonation";

export interface ImpersonationState {
  targetUserId: string;
  targetName: string;
  targetEmail: string;
  targetRole: string;
  targetClientId: string | null;
  startedAt: number;
  returnPath: string;
}

export function getImpersonation(): ImpersonationState | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ImpersonationState) : null;
  } catch {
    return null;
  }
}

export async function startImpersonation(state: Omit<ImpersonationState, "startedAt">) {
  localStorage.setItem(KEY, JSON.stringify({ ...state, startedAt: Date.now() }));

  let role = (state.targetRole || "").toLowerCase();

  // Fallback: resolve role from DB if missing/unknown
  if (!role || (role !== "admin" && role !== "service_manager" && role !== "marketing_staff" && role !== "support_staff")) {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: wu } = await (supabase as any)
        .from("workspace_users")
        .select("role")
        .eq("user_id", state.targetUserId)
        .limit(1)
        .maybeSingle();
      if (wu?.role) role = String(wu.role).toLowerCase();
      if (!role) {
        const { data: ep } = await (supabase as any)
          .from("employee_profiles")
          .select("role")
          .eq("user_id", state.targetUserId)
          .maybeSingle();
        if (ep?.role) role = String(ep.role).toLowerCase();
      }
    } catch (e) {
      console.warn("[impersonation] role lookup failed", e);
    }
  }

  let dest = "/dashboard";
  if (role === "marketing_staff") dest = "/employee/bdr";
  else if (role === "support_staff") dest = "/employee/support";
  else if (role === "admin" || role === "service_manager") dest = "/admin";
  else if (state.targetClientId) dest = "/dashboard";
  else dest = "/employee";

  console.log("[impersonation] role detected:", role, "→ routing to:", dest);
  window.location.href = dest;
}

export function stopImpersonation() {
  const s = getImpersonation();
  localStorage.removeItem(KEY);
  window.location.href = s?.returnPath ?? "/admin/team";
}
