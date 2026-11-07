// Helpers for privileged user-management actions (impersonate / delete / email change / role grants).
// deno-lint-ignore-file no-explicit-any

export const PRIVILEGED_ROLES = ["admin", "operator"];

/** True if the target user holds an admin or operator role. */
export async function targetIsPrivileged(sb: any, userId: string): Promise<boolean> {
  if (!userId) return false;
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId).in("role", PRIVILEGED_ROLES).limit(1);
  return (data ?? []).length > 0;
}

/** Best-effort security audit row. Never throws. */
export async function securityAudit(sb: any, actorId: string, action: string, metadata: Record<string, unknown>, clientId: string | null = null) {
  try {
    await sb.from("audit_logs").insert({
      client_id: clientId,
      user_id: actorId,
      action,
      module: "security",
      status: "success",
      metadata: { actor: actorId, ...metadata },
    });
  } catch (_) { /* best effort */ }
}
