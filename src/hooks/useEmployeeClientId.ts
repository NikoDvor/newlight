import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const NEWLIGHT_INTERNAL_ID = "00000000-0000-0000-0000-0000000000ff";

let cachedClientId: string | null = null;
let cachedUserId: string | null = null;

/**
 * Resolves the current authenticated employee's tenant client_id.
 * Order: employee_profiles.client_id → workspace_users.client_id → NewLight Internal.
 * Cached per session.
 */
export function useEmployeeClientId() {
  const [clientId, setClientId] = useState<string | null>(cachedClientId);
  const [loading, setLoading] = useState(!cachedClientId);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) { setClientId(null); setLoading(false); } return; }
      if (cachedUserId === user.id && cachedClientId) {
        if (active) { setClientId(cachedClientId); setLoading(false); }
        return;
      }
      const { data: emp } = await (supabase as any)
        .from("employee_profiles").select("client_id").eq("user_id", user.id).maybeSingle();
      let resolved = emp?.client_id as string | null | undefined;
      if (!resolved) {
        const { data: ws } = await (supabase as any)
          .from("workspace_users").select("client_id").eq("user_id", user.id)
          .eq("status", "active").order("created_at", { ascending: true }).limit(1).maybeSingle();
        resolved = ws?.client_id;
      }
      if (!resolved) resolved = NEWLIGHT_INTERNAL_ID;
      cachedUserId = user.id;
      cachedClientId = resolved;
      if (active) { setClientId(resolved); setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  return { clientId, loading };
}

export const NEWLIGHT_INTERNAL_CLIENT_ID = NEWLIGHT_INTERNAL_ID;
