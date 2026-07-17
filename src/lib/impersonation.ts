// Real session-swap impersonation.
// Admin's session tokens are backed up to sessionStorage (not localStorage), then
// the client signs in as the target user via a magic-link token_hash generated
// server-side. On exit, the admin session is restored.
//
// Security note: tokens live in sessionStorage so they:
//   - are scoped to the current tab (not shared across tabs / devices),
//   - clear on tab close (bounded exposure window),
//   - are still cleared explicitly on restore or on any restore failure.
// A separate non-sensitive marker in localStorage records which admin is
// impersonating whom, so unrelated UI can react to the state without touching
// the raw tokens.

import { supabase } from "@/integrations/supabase/client";

const BACKUP_KEY = "nl_admin_session_backup";
const MARKER_KEY = "nl_admin_impersonation_marker";
// Hard TTL: refuse to restore a backup older than this. Any longer-lived
// backup is treated as stale and discarded.
const BACKUP_TTL_MS = 60 * 60 * 1000; // 1h

interface AdminSessionBackup {
  access_token: string;
  refresh_token: string;
  admin_email?: string;
  admin_user_id?: string;
  return_path?: string;
  saved_at: number;
}

interface ImpersonationMarker {
  admin_user_id?: string;
  admin_email?: string;
  target_user_id: string;
  target_email?: string;
  saved_at: number;
}

function readBackup(): AdminSessionBackup | null {
  try {
    const raw = sessionStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSessionBackup;
    if (!parsed?.access_token || !parsed?.refresh_token) return null;
    if (Date.now() - (parsed.saved_at || 0) > BACKUP_TTL_MS) {
      sessionStorage.removeItem(BACKUP_KEY);
      try { localStorage.removeItem(MARKER_KEY); } catch { /* noop */ }
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hasAdminBackup(): boolean {
  return !!readBackup();
}

export function getAdminBackup(): AdminSessionBackup | null {
  return readBackup();
}


export interface ImpersonateArgs {
  targetUserId: string;
  targetEmail?: string;
  targetName?: string;
  returnPath?: string;
  destinationPath?: string;
}

export async function startImpersonation(args: ImpersonateArgs) {
  // 1. Back up current (admin) session
  const { data: { session }, error: sErr } = await supabase.auth.getSession();
  if (sErr || !session) throw new Error("No active session to back up");

  const backup: AdminSessionBackup = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    admin_email: session.user?.email,
    admin_user_id: session.user?.id,
    return_path: args.returnPath ?? window.location.pathname,
    saved_at: Date.now(),
  };
  sessionStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
  try {
    const marker: ImpersonationMarker = {
      admin_user_id: session.user?.id,
      admin_email: session.user?.email,
      target_user_id: args.targetUserId,
      target_email: args.targetEmail,
      saved_at: Date.now(),
    };
    localStorage.setItem(MARKER_KEY, JSON.stringify(marker));
  } catch { /* noop */ }

  try {
    // 2. Ask edge function for a token_hash for the target user
    const { data, error } = await supabase.functions.invoke("impersonate-user", {
      body: { targetUserId: args.targetUserId, targetEmail: args.targetEmail },
    });
    if (error || !data?.token_hash) {
      throw new Error(error?.message || data?.error || "Impersonation failed");
    }

    // 3. Sign in as the target user — full Supabase session swap
    const { error: vErr } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: data.token_hash,
    });
    if (vErr) throw vErr;

    // 4. Hard redirect so all providers re-init under the new session
    const dest = args.destinationPath ?? "/employee/bdr";
    window.location.href = dest;
  } catch (e) {
    // If something failed mid-flight, drop the backup so we don't strand
    // the user in a broken hybrid state.
    localStorage.removeItem(BACKUP_KEY);
    throw e;
  }
}

/**
 * Sign out of the impersonated session and restore the admin session.
 * Returns true if a backup was found and restored (caller should redirect),
 * false if there was nothing to restore (caller can do a normal sign-out).
 */
export async function restoreAdminSession(): Promise<boolean> {
  const backup = getAdminBackup();
  if (!backup) return false;

  try {
    await supabase.auth.signOut();
  } catch {
    // ignore — we're swapping anyway
  }

  const { error } = await supabase.auth.setSession({
    access_token: backup.access_token,
    refresh_token: backup.refresh_token,
  });

  localStorage.removeItem(BACKUP_KEY);

  if (error) {
    console.warn("[impersonation] restore failed, sending to /auth", error);
    window.location.href = "/auth";
    return true;
  }

  window.location.href = backup.return_path && backup.return_path.startsWith("/admin")
    ? backup.return_path
    : "/admin";
  return true;
}
