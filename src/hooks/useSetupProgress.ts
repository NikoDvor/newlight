import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SetupProgress {
  total: number;
  completed: number;
  received: number;
  requested: number;
  missing: number;
  percentage: number;
}

export function useSetupProgress(clientId: string | null) {
  const [progress, setProgress] = useState<SetupProgress>({ total: 0, completed: 0, received: 0, requested: 0, missing: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("client_setup_items" as any)
        .select("item_status, submitted_by_client")
        .eq("client_id", clientId);
      const items = (data || []) as any[];
      const clientItems = items.filter((i: any) => i.submitted_by_client);
      const total = clientItems.length;
      const completed = clientItems.filter((i: any) => i.item_status === "completed").length;
      const received = clientItems.filter((i: any) => i.item_status === "received").length;
      const requested = clientItems.filter((i: any) => i.item_status === "requested").length;
      const missing = clientItems.filter((i: any) => i.item_status === "missing").length;
      const percentage = total > 0 ? Math.round(((completed + received) / total) * 100) : 0;
      setProgress({ total, completed, received, requested, missing, percentage });
      setLoading(false);
    })();
  }, [clientId]);

  return { progress, loading };
}
