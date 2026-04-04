import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import newlightLogo from "@/assets/newlight-logo.jpg";

/**
 * Wraps public pages (Landing, Auth). While the session is loading it shows
 * a branded splash. Once loaded, if the user is already authenticated it
 * redirects them to their dashboard — otherwise it renders children.
 */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, userRole, isSessionLoading } = useWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSessionLoading) return;
    if (user && userRole) {
      if (isAdmin) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isSessionLoading, user, userRole, isAdmin, navigate]);

  if (isSessionLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, hsl(218 35% 6%) 0%, hsl(220 42% 12%) 40%, hsl(215 50% 10%) 70%, hsl(218 35% 6%) 100%)",
        }}
      >
        <img
          src={newlightLogo}
          alt="NewLight"
          className="h-14 w-auto object-contain animate-pulse"
          style={{ filter: "drop-shadow(0 0 30px hsla(211,96%,56%,.4))" }}
        />
      </div>
    );
  }

  // User is authenticated — the useEffect will redirect, render nothing meanwhile
  if (user && userRole) return null;

  return <>{children}</>;
}
