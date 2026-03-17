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

export function useWorkspacePermissions(): WorkspacePermissions {
  const { user, activeClientId, isAdmin } = useWorkspace();
  const [permissions, setPermissions] = useState<Record<string, AccessLevel>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !activeClientId) { setLoading(false); return; }
    if (isAdmin) {
      // Admins get manage on everything
      setPermissions({});
      setLoading(false);
      return;
    }

    (async () => {
      // Find workspace_user for this auth user
      const { data: wsUser } = await supabase
        .from("workspace_users")
        .select("id")
        .eq("client_id", activeClientId)
        .eq("email", user.email)
        .maybeSingle();

      if (!wsUser) { setLoading(false); return; }

      const { data: perms } = await supabase
        .from("workspace_permissions")
        .select("module_key, access_level")
        .eq("workspace_user_id", wsUser.id);

      const map: Record<string, AccessLevel> = {};
      (perms ?? []).forEach((p: any) => { map[p.module_key] = p.access_level; });
      setPermissions(map);
      setLoading(false);
    })();
  }, [user, activeClientId, isAdmin]);

  const hasAccess = (moduleKey: string, minLevel: AccessLevel = "view"): boolean => {
    if (isAdmin) return true;
    const level = permissions[moduleKey] || "none";
    return LEVEL_ORDER.indexOf(level) >= LEVEL_ORDER.indexOf(minLevel);
  };

  return { loading, permissions, hasAccess };
}
