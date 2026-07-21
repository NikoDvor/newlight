import { useEffect, useState } from "react";
import { ArrowLeft, Eye } from "lucide-react";
import { getAdminBackup, hasAdminBackup, restoreAdminSession } from "@/lib/impersonation";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Persistent top bar shown on every employee route while an admin is
 * impersonating another user. Renders nothing when there is no admin backup.
 */
export function AdminImpersonationBar() {
  const { user, employeeProfile } = useWorkspace();
  const [active, setActive] = useState<boolean>(() => hasAdminBackup());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Re-check on mount + when storage changes in another tab
    setActive(hasAdminBackup());
    const onStorage = () => setActive(hasAdminBackup());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!active) return null;

  const backup = getAdminBackup();
  const targetName =
    employeeProfile?.full_name ||
    (user?.user_metadata as any)?.full_name ||
    user?.email ||
    "employee";
  const adminEmail = backup?.admin_email;

  const handleExit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const restored = await restoreAdminSession();
      if (!restored) {
        setActive(false);
        setBusy(false);
      }
      // On success restoreAdminSession triggers a hard redirect.
    } catch {
      setBusy(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-3 px-3 py-1.5 text-[12px] font-medium text-amber-50 border-b border-amber-400/40 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.5)]"
      style={{
        background:
          "linear-gradient(90deg, hsl(35 90% 40% / 0.95), hsl(28 92% 46% / 0.95))",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <Eye className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">
        Viewing as <strong className="font-semibold">{targetName}</strong>
        {adminEmail ? (
          <span className="hidden sm:inline text-amber-100/80"> · admin {adminEmail}</span>
        ) : null}
      </span>
      <button
        onClick={handleExit}
        disabled={busy}
        className="ml-2 inline-flex items-center gap-1 rounded-md bg-black/25 hover:bg-black/40 px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60"
      >
        <ArrowLeft className="h-3 w-3" />
        {busy ? "Restoring…" : "Back to Admin"}
      </button>
    </div>
  );
}

export default AdminImpersonationBar;
