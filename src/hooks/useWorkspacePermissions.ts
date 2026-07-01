import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { AccessLevel } from "@/lib/rolePresets";

interface WorkspacePermissions {
  loading: boolean;
  permissions: Record<string, AccessLevel>;
  hasAccess: (moduleKey: string, minLevel?: AccessLevel) => boolean;
}

const LEVEL_ORDER: AccessLevel[] = ["none", "view", "edit", "manage"];

// Roles that get full access to every module by default (workspace owners/admins).
// Provisioned workspaces won't have per-module workspace_permissions rows yet,
// so without this the sidebar hides everything for the owner.
const FULL_ACCESS_ROLES = new Set([
  "client_owner",
  "client_admin",
  "owner",
  "admin",
]);

export function useWorkspacePermissions(): WorkspacePermissions {
  const { user, activeClientId, isAdmin, userRole } = useWorkspace();
  const [permissions, setPermissions] = useState<Record<string, AccessLevel>>({});
  const [loading, setLoading] = useState(true);
  const [ownerLike, setOwnerLike] = useState(false);

  useEffect(() => {
    if (!user || !activeClientId) { setLoading(false); return; }
    if (isAdmin) {
      setPermissions({});
      setOwnerLike(true);
      setLoading(false);
      return;
    }

    (async () => {
      // 1. Owner-like role on THIS workspace via user_roles → full access.
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role, client_id")
        .eq("user_id", user.id);

      const hasOwnerRole = (roles ?? []).some(
        (r: any) =>
          FULL_ACCESS_ROLES.has(r.role) &&
          (r.client_id === activeClientId || r.client_id === null)
      );

      if (hasOwnerRole) {
        setOwnerLike(true);
        setPermissions({});
        setLoading(false);
        return;
      }

      // 2. Fallback: granular workspace_permissions via workspace_users.
      const { data: wsUser } = await supabase
        .from("workspace_users")
        .select("id, role_preset")
        .eq("client_id", activeClientId)
        .eq("email", user.email)
        .maybeSingle();

      if (!wsUser) {
        // No permission record and no owner role → default deny (unchanged).
        setOwnerLike(false);
        setLoading(false);
        return;
      }

      if (FULL_ACCESS_ROLES.has((wsUser as any).role_preset)) {
        setOwnerLike(true);
        setPermissions({});
        setLoading(false);
        return;
      }

      const { data: perms } = await supabase
        .from("workspace_permissions")
        .select("module_key, access_level")
        .eq("workspace_user_id", wsUser.id);

      const map: Record<string, AccessLevel> = {};
      (perms ?? []).forEach((p: any) => { map[p.module_key] = p.access_level; });
      setPermissions(map);
      setOwnerLike(false);
      setLoading(false);
    })();
  }, [user, activeClientId, isAdmin, userRole]);

  const hasAccess = (moduleKey: string, minLevel: AccessLevel = "view"): boolean => {
    if (isAdmin || ownerLike) return true;
    if (userRole && FULL_ACCESS_ROLES.has(userRole)) return true;
    const level = permissions[moduleKey] || "none";
    return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(minLevel);
  };

  return { loading, permissions, hasAccess };
}
