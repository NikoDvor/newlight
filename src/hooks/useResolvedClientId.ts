import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared resolution logic for admin-facing pages that operate on a
 * per-client workspace. Precedence:
 *   1. `?client_id=` URL param (admin deep-links)
 *   2. `activeClientId` from WorkspaceContext (client owners / staff)
 * When neither is present and the user is an admin, a workspace picker
 * list is lazy-loaded so the calling page can render an empty state.
 *
 * Mirrors the same pattern used by AdminClientSetup (route-param driven)
 * and originally introduced in BrandingSettings.
 */
export function useResolvedClientId() {
  const { activeClientId, setActiveClientId, isAdmin } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlClientId = searchParams.get("client_id");
  const effectiveClientId = urlClientId || activeClientId;

  // Keep workspace context in sync when URL drives selection
  useEffect(() => {
    if (urlClientId && urlClientId !== activeClientId) {
      setActiveClientId(urlClientId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlClientId]);

  const [adminClients, setAdminClients] = useState<
    { id: string; business_name: string | null }[]
  >([]);
  const [loadingClients, setLoadingClients] = useState(false);

  useEffect(() => {
    if (!isAdmin || effectiveClientId) return;
    setLoadingClients(true);
    supabase
      .from("clients")
      .select("id, business_name")
      .order("business_name", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        setAdminClients(data || []);
        setLoadingClients(false);
      });
  }, [isAdmin, effectiveClientId]);

  const selectClient = (id: string) => {
    if (!id) return;
    setSearchParams({ client_id: id });
    setActiveClientId(id);
  };

  return {
    effectiveClientId,
    urlClientId,
    isAdmin,
    adminClients,
    loadingClients,
    selectClient,
  };
}

export type ResolvedClientState = ReturnType<typeof useResolvedClientId>;
