import { ReactNode, useMemo } from "react";
import { WorkspaceContext, useWorkspace } from "@/contexts/WorkspaceContext";

/**
 * Reserved internal client id for NewLight's own admin operations workspace.
 * Used to isolate Niko's internal ops data from all real client workspaces.
 */
export const ADMIN_OPS_CLIENT_ID = "newlight-internal";
export const ADMIN_OPS_CLIENT_NAME = "NewLight Ops";

/**
 * Wraps children with a WorkspaceContext override so that any page reading
 * useWorkspace() sees activeClientId = ADMIN_OPS_CLIENT_ID and viewMode = "workspace".
 * Preserves the rest of the parent workspace context (user, isAdmin, etc.).
 */
export function AdminOpsProvider({ children }: { children: ReactNode }) {
  const parent = useWorkspace();

  const value = useMemo(
    () => ({
      ...parent,
      viewMode: "workspace" as const,
      activeClientId: ADMIN_OPS_CLIENT_ID,
      activeClientName: ADMIN_OPS_CLIENT_NAME,
    }),
    [parent]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
