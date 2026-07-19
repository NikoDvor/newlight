import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { getEmployeeRoute } from "@/lib/employeeRouting";

interface SessionGateProps {
  children: ReactNode;
}

export function SessionGate({ children }: SessionGateProps) {
  const { user, isAdmin, userRole, employeeProfile, isSessionLoading } = useWorkspace();
  const navigate = useNavigate();

  const shouldRedirect = !isSessionLoading && !!user && !!userRole;

  useEffect(() => {
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
  }, [shouldRedirect, isAdmin, userRole, employeeProfile?.job_title, navigate]);

  if (isSessionLoading) {
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

  if (shouldRedirect) return null;

  return <>{children}</>;
}

export default SessionGate;
