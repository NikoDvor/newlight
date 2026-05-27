// Real session-swap impersonation.
// Admin's session tokens are backed up to localStorage, then the client signs
// in as the target user via a magic-link token_hash generated server-side.
// On exit, the admin session is restored.

import { supabase } from "@/integrations/supabase/client";

const BACKUP_KEY = "nl_admin_session_backup";

interface AdminSessionBackup {
  access_token: string;
  refresh_token: string;
  admin_email?: string;
  admin_user_id?: string;
  return_path?: string;
  saved_at: number;
}

export function hasAdminBackup(): boolean {
  try {
    return !!localStorage.getItem(BACKUP_KEY);
  } catch {
    return false;
  }
}

export function getAdminBackup(): AdminSessionBackup | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? (JSON.parse(raw) as AdminSessionBackup) : null;
  } catch {
    return null;
  }
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
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));

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
