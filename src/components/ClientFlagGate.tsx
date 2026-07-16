import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useEmployeeClientId } from "@/hooks/useEmployeeClientId";

type ClientFlag = "has_sales_team" | "has_compliance_requirements";

/**
 * Reads a boolean flag from the `clients` table for a given client id.
 * When `clientId` is undefined the hook returns `loading=true` until one is provided.
 */
export function useClientFlag(flag: ClientFlag, clientId: string | null | undefined) {
  const [value, setValue] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) { setValue(null); setLoading(!clientId); return; }
    let active = true;
    setLoading(true);
    supabase
      .from("clients")
      .select(flag)
      .eq("id", clientId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setValue(Boolean((data as any)?.[flag]));
        setLoading(false);
      });
    return () => { active = false; };
  }, [flag, clientId]);

  return { value, loading };
}

interface GateProps {
  flag: ClientFlag;
  /** Where to resolve the client id from. Defaults to "workspace". */
  source?: "workspace" | "employee";
  /** Path to redirect to when the flag is false. */
  redirectTo?: string;
  children: React.ReactNode;
}

/**
 * Route guard that only renders `children` when the given `clients.<flag>` is true.
 * Falsy → redirects to `redirectTo` (default `/dashboard` for workspace, `/employee/dashboard` for employee).
 */
export function ClientFlagGate({ flag, source = "workspace", redirectTo, children }: GateProps) {
  const { activeClientId } = useWorkspace();
  const { clientId: employeeClientId, loading: empLoading } = useEmployeeClientId();
  const resolvedId = source === "employee" ? employeeClientId : activeClientId;
  const { value, loading } = useClientFlag(flag, resolvedId);

  if (loading || (source === "employee" && empLoading)) return null;
  if (!value) {
    return <Navigate to={redirectTo ?? (source === "employee" ? "/employee/dashboard" : "/dashboard")} replace />;
  }
  return <>{children}</>;
}
