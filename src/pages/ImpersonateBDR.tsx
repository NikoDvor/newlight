import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Eye } from "lucide-react";
import { BDRDashboard } from "@/pages/employee/EmployeeDashboards";
import { GlobalAtmosphere } from "@/components/GlobalAtmosphere";

/**
 * Unguarded impersonation route. Bypasses EmployeeLayout / SessionGate /
 * isAdmin redirects so an admin can preview the BDR employee portal view
 * without the real auth session bouncing them back to /admin.
 *
 * Visual-only: the underlying data hooks still run as the signed-in admin.
 */
export default function ImpersonateBDR() {
  const navigate = useNavigate();
  const [imp, setImp] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("nl_impersonation");
      if (!raw) {
        navigate("/admin/team", { replace: true });
        return;
      }
      setImp(JSON.parse(raw));
    } catch {
      navigate("/admin/team", { replace: true });
    }
  }, [navigate]);

  if (!imp) return null;

  const exit = () => {
    try { localStorage.removeItem("nl_impersonation"); } catch {}
    window.location.href = "/admin/team";
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* Impersonation header */}
      <div
        className="sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-2 text-sm font-medium text-white shadow-lg"
        style={{ background: "linear-gradient(90deg, hsl(38 95% 50%) 0%, hsl(28 95% 52%) 100%)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            Viewing BDR portal as <strong>{imp.targetName || imp.targetEmail}</strong>
            <span className="opacity-70 ml-2 hidden sm:inline">(visual preview)</span>
          </span>
        </div>
        <button
          onClick={exit}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-black/25 hover:bg-black/40 transition-colors flex-shrink-0"
        >
          <LogOut className="h-3.5 w-3.5" /> Exit impersonation
        </button>
      </div>

      <main className="nl-dark-bg relative">
        <GlobalAtmosphere />
        <div className="relative z-1 p-4 sm:p-6 lg:p-10">
          <BDRDashboard />
        </div>
      </main>
    </div>
  );
}
