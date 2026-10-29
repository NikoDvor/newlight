import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { loadAcademy, type AcademyData } from "@/lib/academy";

export function useAcademy() {
  const { user } = useWorkspace();
  const [data, setData] = useState<AcademyData | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const d = await loadAcademy(user.id);
    setData(d);
    setLoading(false);
  }, [user?.id]);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh, userId: user?.id as string | undefined };
}
