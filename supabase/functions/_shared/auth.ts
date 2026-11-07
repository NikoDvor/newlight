// Shared auth helpers for edge functions. Every function that is not a public webhook or public booking
// endpoint must call one of these before doing any work.
// deno-lint-ignore-file no-explicit-any

export type AuthResult =
  | { ok: true; userId: string; roles: string[]; isAdmin: boolean; isOperator: boolean }
  | { ok: false; status: number; error: string };

export function bearer(req: Request): string {
  return (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

/** Resolves the signed-in user and their roles from the request JWT (service-role client required). */
export async function getCaller(req: Request, sb: any): Promise<AuthResult> {
  const jwt = bearer(req);
  if (!jwt) return { ok: false, status: 401, error: "Unauthorized" };
  const { data, error } = await sb.auth.getUser(jwt);
  const user = data?.user;
  if (error || !user) return { ok: false, status: 401, error: "Unauthorized" };
  const { data: rows } = await sb.from("user_roles").select("role").eq("user_id", user.id);
  const roles = (rows ?? []).map((r: any) => String(r.role));
  return { ok: true, userId: user.id, roles, isAdmin: roles.includes("admin"), isOperator: roles.includes("operator") };
}

/** Admin or operator only. Pass adminOnly to exclude operators. */
export async function requireStaff(req: Request, sb: any, opts: { adminOnly?: boolean } = {}): Promise<AuthResult> {
  const c = await getCaller(req, sb);
  if (!c.ok) return c;
  if (opts.adminOnly ? !c.isAdmin : !(c.isAdmin || c.isOperator)) return { ok: false, status: 403, error: "Forbidden" };
  return c;
}

/**
 * Constant-time compare of the x-cron-secret header with CRON_SECRET.
 * FAILS CLOSED: if CRON_SECRET is not configured, nobody passes.
 */
export function cronOk(req: Request): boolean {
  const secret = Deno.env.get("CRON_SECRET") || "";
  const got = req.headers.get("x-cron-secret") || "";
  if (!secret || got.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= secret.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

/** Staff, or a member of the given client workspace (via clients.id visibility under the caller's own JWT/RLS). */
export async function requireClientAccess(req: Request, sb: any, clientId: string, anonKey: string, url: string): Promise<AuthResult> {
  const c = await getCaller(req, sb);
  if (!c.ok) return c;
  if (c.isAdmin || c.isOperator) return c;
  if (!clientId) return { ok: false, status: 400, error: "client_id required" };
  const { data: wu } = await sb.from("workspace_users").select("id").eq("user_id", c.userId).eq("client_id", clientId).maybeSingle();
  if (!wu) return { ok: false, status: 403, error: "No access to this workspace" };
  return c;
}

export function authJson(r: { status: number; error: string }, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: r.error }), { status: r.status, headers: { ...headers, "Content-Type": "application/json" } });
}

/**
 * Async cron check used by scheduled functions: header matches the CRON_SECRET env var, OR matches the
 * NL_BILLING_CRON_SECRET stored in the database vault (checked through nl_billing_cron_ok). Fails closed.
 * ALWAYS use as: `if (!(await cronAuthorized(req, sb))) ...` — never call without await.
 */
export async function cronAuthorized(req: Request, sb: any): Promise<boolean> {
  if (cronOk(req)) return true;
  const got = req.headers.get("x-cron-secret") || "";
  if (got.length < 21) return false;
  try {
    const { data } = await sb.rpc("nl_billing_cron_ok", { p: got });
    return data === true;
  } catch {
    return false;
  }
}
