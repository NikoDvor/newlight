import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  computeBdrPipelineRevenue,
  type BdrEventRow,
  type BdrLeadRow,
  type BdrLinkedDealRow,
} from "@/lib/bdrPipelineRevenue";
import type { PipelineRevenueModel } from "@/lib/pipelineRevenue";
import type { UsePipelineRevenueResult } from "@/hooks/usePipelineRevenue";

/**
 * Admin-only variant of usePipelineRevenue. Same output contract, different
 * source: NewLight's BDR pipeline lives in `nl_bdr_leads` (+ the `crm_deals`
 * row a converting lead produces), never in crm_deals scoped to the internal
 * client id — that workspace is, and will stay, empty of BDR activity.
 *
 * `clientId` is only used for the revenue target (and the widget's target
 * editor), not to scope the pipeline itself.
 */
export function useBdrPipelineRevenue(
  clientId: string | null | undefined,
): UsePipelineRevenueResult {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<BdrLeadRow[]>([]);
  const [deals, setDeals] = useState<BdrLinkedDealRow[]>([]);
  const [events, setEvents] = useState<BdrEventRow[]>([]);
  const [revenueTarget, setRevenueTarget] = useState<number | null>(null);
  const [repNames, setRepNames] = useState<Record<string, string>>({});
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);

      const [leadRes, evtRes, clientRes, staffRes] = await Promise.all([
        (supabase as any)
          .from("nl_bdr_leads")
          .select(
            "id,user_id,business_name,pipeline_stage,status,called,meeting_booked,objection_category,crm_deal_id,created_at,updated_at",
          ),
        (supabase as any)
          .from("bdr_calendar_events")
          .select("id,lead_id,user_id,source,attendance,starts_at"),
        clientId
          ? (supabase as any)
              .from("clients")
              .select("id,revenue_target")
              .eq("id", clientId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        (supabase as any)
          .from("employee_profiles")
          .select("user_id,full_name,email"),
      ]);

      if (!active) return;

      const leadRows = (leadRes?.data ?? []) as BdrLeadRow[];
      setLeads(leadRows);
      setEvents((evtRes?.data ?? []) as BdrEventRow[]);
      setRevenueTarget(
        clientRes?.data?.revenue_target != null ? Number(clientRes.data.revenue_target) : null,
      );

      const names: Record<string, string> = {};
      for (const s of staffRes?.data ?? []) {
        if (s.user_id) names[s.user_id] = s.full_name || s.email || "Team member";
      }
      setRepNames(names);

      // Only the deals BDR leads actually produced — the Form 2 linkage.
      const dealIds = Array.from(
        new Set(leadRows.map((l) => l.crm_deal_id).filter(Boolean) as string[]),
      );
      if (dealIds.length) {
        const { data: dealData } = await (supabase as any)
          .from("crm_deals")
          .select(
            "id,deal_value,initial_fee,recurring_fee,pricing_model,pay_sign_status,pipeline_stage,close_prep_completed_at",
          )
          .in("id", dealIds);
        if (active) setDeals((dealData ?? []) as BdrLinkedDealRow[]);
      } else if (active) {
        setDeals([]);
      }

      if (active) setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [clientId, nonce]);

  const computed = useMemo(
    () => computeBdrPipelineRevenue({ leads, deals, events, revenueTarget }),
    [leads, deals, events, revenueTarget],
  );

  const model: PipelineRevenueModel | null = leads.length || !loading ? computed.model : null;

  const openDeals = useMemo(
    () =>
      computed.rows
        .filter((r) => r.pipeline_stage !== "won" && r.pipeline_stage !== "lost")
        .map((r) => ({ stage: r.pipeline_stage as any, value: Number(r.deal_value) || 0 })),
    [computed.rows],
  );

  return { loading, model, openDeals, repNames, vertical: null, refresh };
}
