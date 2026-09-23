import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useClientManifest } from "@/hooks/useClientManifest";
import { getEmployeeRoute } from "@/lib/employeeRouting";

interface SessionGateProps {
  children: ReactNode;
}

function isStandaloneLaunch() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function SessionGate({ children }: SessionGateProps) {
  useClientManifest();
  const { user, isAdmin, userRole, employeeProfile, isSessionLoading, sessionExpired } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();

  const shouldRedirect = !isSessionLoading && !!user && !!userRole;
  // An installed home-screen app on iOS has its own storage partition, so the
  // Safari session never carries over. Send it straight to sign-in instead of
  // the marketing landing page.
  const needsSignIn =
    !isSessionLoading && !user && location.pathname === "/" && isStandaloneLaunch();

  useEffect(() => {
    if (needsSignIn) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!shouldRedirect) return;
    if (isAdmin) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }
    const empRoute = getEmployeeRoute(userRole, employeeProfile?.job_title);
    if (empRoute) {
      navigate(empRoute, { replace: true });
      return;
    }
    navigate("/dashboard", { replace: true });
  }, [needsSignIn, shouldRedirect, isAdmin, userRole, employeeProfile?.job_title, navigate]);

  // A signed-in user whose role hasn't resolved yet is still "deciding" — never
  // fall through to the logged-out landing page in that window.
  const awaitingRole = !!user && !userRole && !sessionExpired;

  if (isSessionLoading || awaitingRole) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          color: "#64748b",
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: 14,
        }}
      >
        <div
          aria-label="Loading"
          style={{
            width: 24,
            height: 24,
            border: "2px solid rgba(30,111,217,0.2)",
            borderTopColor: "#2196F3",
            borderRadius: "50%",
            animation: "sg-spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes sg-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (shouldRedirect || needsSignIn) return null;

  return <>{children}</>;
}

export default SessionGate;
