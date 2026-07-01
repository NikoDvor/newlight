import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin }: ProtectedRouteProps) {
  const { user, isAdmin } = useWorkspace();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Force first-login password change before any protected route (except the
  // reset page itself, so the user isn't trapped in a redirect loop).
  const mustChange = Boolean(user?.user_metadata?.must_change_password);
  if (mustChange && location.pathname !== "/reset-password") {
    return <Navigate to="/reset-password?force=1" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
