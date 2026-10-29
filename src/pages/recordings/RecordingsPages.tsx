import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import RecordingsVault from "@/components/recordings/RecordingsVault";
import { NEWLIGHT_INTERNAL_CLIENT_ID } from "@/hooks/useEmployeeClientId";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

/** Salesman: their own recordings. */
export function EmployeeRecordings() {
  return <div className="mx-auto max-w-4xl"><RecordingsVault mode="mine" clientId={NEWLIGHT_INTERNAL_CLIENT_ID} /></div>;
}

/** NewLight admin: every salesman's recordings. */
export function AdminRecordings() {
  return <div className="mx-auto max-w-5xl"><RecordingsVault mode="team" clientId={NEWLIGHT_INTERNAL_CLIENT_ID} title="Meeting Recordings" /></div>;
}

/** NewLight admin → a client sub-account's recordings. */
export function AdminClientRecordings() {
  const { clientId } = useParams<{ clientId: string }>();
  const [name, setName] = useState<string>("");
  useEffect(() => {
    if (!clientId) return;
    (supabase as any).from("clients").select("business_name").eq("id", clientId).maybeSingle().then(({ data }: any) => setName(data?.business_name || ""));
  }, [clientId]);
  if (!clientId) return null;
  return <div className="mx-auto max-w-5xl"><RecordingsVault mode="team" clientId={clientId} title={name ? `${name} — Recordings` : "Recordings"} /></div>;
}

/** Client workspace: owners see the whole team, everyone else sees their own. */
export function ClientRecordings() {
  const { activeClientId, roles } = useWorkspace() as any;
  if (!activeClientId) return null;
  const owner = (roles || []).some((r: any) => r.role === "client_owner" && r.client_id === activeClientId);
  return <div className="mx-auto max-w-5xl"><RecordingsVault mode={owner ? "team" : "mine"} clientId={activeClientId} title={owner ? "Team Recordings" : "My Recordings"} /></div>;
}
