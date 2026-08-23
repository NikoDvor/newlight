import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  computePipelineRevenue,
  type DealRow,
  type MeetingRow,
  type PeerDealRow,
  toCanonStage,
  type PipelineRevenueModel,
} from "@/lib/pipelineRevenue";

/**
 * Single fetch + compute entry point for the Pipeline Revenue Opportunity
 * widget. Used identically by the NewLight admin dashboard and every
 * sub-account dashboard — the only difference is the clientId passed in.
 * Nothing here should ever be recomputed ad hoc inside a page.
 */

export interface UsePipelineRevenueResult {
  loading: boolean;
  model: PipelineRevenueModel | null;
  /** Open deals in canonical-stage form, for live slider projection. */
  openDeals: { stage: any; value: number }[];
  repNames: Record<string, string>;
  vertical: string | null;
  refresh: () => void;
}

const DEAL_COLS =
  "id,client_id,deal_name,deal_value,pipeline_stage,status,assigned_user,created_at,lost_reason,lost_at";

export function usePipelineRevenue(
  clientId: string | null | undefined,
  opts: { withBenchmark?: boolean; emitRisk?: boolean } = {},
): UsePipelineRevenueResult {
  const { withBenchmark = false, emitRisk = false } = opts;
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [peerDeals, setPeerDeals] = useState<PeerDealRow[]>([]);
  const [revenueTarget, setRevenueTarget] = useState<number | null>(null);
  const [vertical, setVertical] = useState<string | null>(null);
  const [repNames, setRepNames] = useState<Record<string, string>>({});
  const [nonce, setNonce] = useState(0);
  const riskEmitted = useRef<string | null>(null);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);

      const [dealRes, mtgRes, clientRes, memberRes] = await Promise.all([
        (supabase as any).from("crm_deals").select(DEAL_COLS).eq("client_id", clientId),
        (supabase as any)
          .from("sales_meetings")
          .select("id,meeting_type,attended,start_time,assigned_salesman_user_id")
          .eq("client_id", clientId),
        (supabase as any)
          .from("clients")
          .select("id,revenue_target,industry,business_type")
          .eq("id", clientId)
          .maybeSingle(),
        (supabase as any)
          .from("workspace_users")
          .select("user_id,full_name,email")
          .eq("client_id", clientId),
      ]);

      if (!active) return;

      setDeals((dealRes?.data ?? []) as DealRow[]);
      setMeetings((mtgRes?.data ?? []) as MeetingRow[]);

      const client = clientRes?.data;
      setRevenueTarget(client?.revenue_target != null ? Number(client.revenue_target) : null);
      // Reuse the existing vertical fields — no duplicate column was added.
      const vert = (client?.business_type || client?.industry || null) as string | null;
      setVertical(vert);

      const names: Record<string, string> = {};
      for (const m of memberRes?.data ?? []) {
        if (m.user_id) names[m.user_id] = m.full_name || m.email || "Team member";
      }
      setRepNames(names);

      if (withBenchmark && vert) {
        const { data: peers } = await (supabase as any)
          .from("clients")
          .select("id,industry,business_type")
          .neq("id", clientId)
          .limit(500);
        const norm = (s: string | null) => (s || "").trim().toLowerCase();
        const peerIds = (peers ?? [])
          .filter((c: any) => norm(c.business_type) === norm(vert) || norm(c.industry) === norm(vert))
          .map((c: any) => c.id);
        if (peerIds.length) {
          const { data: pd } = await (supabase as any)
            .from("crm_deals")
            .select("client_id,pipeline_stage")
            .in("client_id", peerIds);
          if (active) setPeerDeals((pd ?? []) as PeerDealRow[]);
        } else if (active) {
          setPeerDeals([]);
        }
      } else if (active) {
        setPeerDeals([]);
      }

      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [clientId, withBenchmark, nonce]);

  const model = useMemo(
    () =>
      clientId
        ? computePipelineRevenue({ deals, meetings, revenueTarget, peerDeals })
        : null,
    [clientId, deals, meetings, revenueTarget, peerDeals],
  );

  const openDeals = useMemo(
    () =>
      (model?.buckets ?? [])
        .filter((b) => b.stage !== "won" && b.stage !== "lost")
        .flatMap((b) =>
          deals
            .filter((d) => {
              const s = toCanonStage(d.pipeline_stage);
              return s === b.stage;
            })
            .map((d) => ({ stage: b.stage, value: Number(d.deal_value) || 0 })),
        ),
    [model, deals],
  );

  /**
   * Part D1 — stage-collapse signals are pushed into the SAME risk surface
   * AdminClientSuccess / ClientSuccessCenter already read (client_risk_records)
   * rather than creating a second, disconnected alert stream.
   */
  useEffect(() => {
    if (!emitRisk || !clientId || !model || model.riskSignals.length === 0) return;
    const key = `${clientId}:${model.riskSignals.map((r) => r.stage).join(",")}`;
    if (riskEmitted.current === key) return;
    riskEmitted.current = key;
    (async () => {
      try {
        const { data: existing } = await (supabase as any)
          .from("client_risk_records")
          .select("id,title")
          .eq("client_id", clientId)
          .eq("risk_type", "pipeline_stage_collapse")
          .eq("status", "open");
        const seen = new Set((existing ?? []).map((r: any) => r.title));
        const rows = model.riskSignals
          .map((s) => ({
            client_id: clientId,
            risk_type: "pipeline_stage_collapse",
            title: `Pipeline collapse at ${s.stage}`,
            description: s.message,
            severity: s.kind === "systemic" ? "high" : "medium",
            status: "open",
          }))
          .filter((r) => !seen.has(r.title));
        if (rows.length) await (supabase as any).from("client_risk_records").insert(rows);
      } catch {
        /* risk logging is best-effort — never block the dashboard */
      }
    })();
  }, [emitRisk, clientId, model]);

  return { loading, model, openDeals, repNames, vertical, refresh };
}
