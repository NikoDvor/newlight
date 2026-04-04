import { useWorkspacePermissions } from "@/hooks/useWorkspacePermissions";
import type { AccessLevel } from "@/lib/rolePresets";
import { ShieldOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  moduleKey: string;
  minLevel?: AccessLevel;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ moduleKey, minLevel = "view", children, fallback }: Props) {
  const { loading, hasAccess } = useWorkspacePermissions();

  if (loading) return null;

  if (!hasAccess(moduleKey, minLevel)) {
    if (fallback) return <>{fallback}</>;
    return <PermissionDenied />;
  }

  return <>{children}</>;
}

function PermissionDenied() {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="p-8 max-w-md text-center border-border bg-card">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <ShieldOff className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mb-6">
          You don't have permission to access this module. Contact your workspace administrator to request access.
        </p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </Card>
    </div>
  );
}
