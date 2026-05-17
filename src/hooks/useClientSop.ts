import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClientSopRow {
  company_intro: string;
  sales_process: string;
  core_offer: string;
  scripts: string;
}

// NewLight Internal — never apply SOP overrides for internal staff.
const NEWLIGHT_INTERNAL_ID = "00000000-0000-0000-0000-0000000000ff";

/**
 * Loads the current user's client SOP (Module 1 & 2 overrides).
 * Returns null when the user is NewLight Internal or has no SOP row.
 */
export function useClientSop(): { sop: ClientSopRow | null; loading: boolean } {
  const [sop, setSop] = useState<ClientSopRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) { setSop(null); setLoading(false); }
        return;
      }
      const { data: cid } = await (supabase as any).rpc("get_employee_client_id", { _user_id: user.id });
      if (!cid || cid === NEWLIGHT_INTERNAL_ID) {
        if (active) { setSop(null); setLoading(false); }
        return;
      }
      const { data } = await (supabase as any)
        .from("client_training_sop")
        .select("company_intro, sales_process, core_offer, scripts")
        .eq("client_id", cid)
        .maybeSingle();
      if (!active) return;
      // Only treat as overriding when at least one field has content.
      if (data && (data.company_intro || data.sales_process || data.core_offer || data.scripts)) {
        setSop(data as ClientSopRow);
      } else {
        setSop(null);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  return { sop, loading };
}
