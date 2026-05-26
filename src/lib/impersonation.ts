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

export function startImpersonation(state: Omit<ImpersonationState, "startedAt">) {
  localStorage.setItem(KEY, JSON.stringify({ ...state, startedAt: Date.now() }));
  window.location.href = state.targetClientId ? "/dashboard" : "/employee/dashboard";
}

export function stopImpersonation() {
  const s = getImpersonation();
  localStorage.removeItem(KEY);
  window.location.href = s?.returnPath ?? "/admin/team";
}
