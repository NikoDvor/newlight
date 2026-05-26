import { useEffect, useState } from "react";
import { getImpersonation, stopImpersonation, type ImpersonationState } from "@/lib/impersonation";
import { LogOut, Eye } from "lucide-react";

export function ImpersonationBanner() {
  const [state, setState] = useState<ImpersonationState | null>(null);

  useEffect(() => {
    setState(getImpersonation());
    const onStorage = () => setState(getImpersonation());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!state) return null;

  return (
    <div
      className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-between gap-3 px-4 py-2 text-sm font-medium text-white shadow-lg"
      style={{
        background: "linear-gradient(90deg, hsl(38 95% 50%) 0%, hsl(28 95% 52%) 100%)",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">
          Viewing as <strong>{state.targetName || state.targetEmail}</strong>
          <span className="opacity-70 ml-2 hidden sm:inline">({state.targetRole.replace(/_/g, " ")})</span>
        </span>
      </div>
      <button
        onClick={stopImpersonation}
        className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-black/25 hover:bg-black/40 transition-colors flex-shrink-0"
      >
        <LogOut className="h-3.5 w-3.5" /> Exit
      </button>
    </div>
  );
}
