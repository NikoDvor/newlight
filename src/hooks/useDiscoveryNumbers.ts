import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  EMPTY_INPUTS, baselineModel, computeDiscovery, projectModel,
  type DiscoveryInputs, type DiscoveryModel,
} from "@/lib/discoveryNumbers";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Discovery numbers for one lead (nl_discovery_numbers, one row per lead), or a
 * practice session (leadId = null: nothing is saved). Every entry and slider
 * autosaves, so picking the same client again brings everything back.
 */
export function useDiscoveryNumbers(leadId: string | null) {
  const [inputs, setInputs] = useState<DiscoveryInputs>(EMPTY_INPUTS);
  const [model, setModel] = useState<DiscoveryModel | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!leadId);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loaded.current = false;
    setInputs(EMPTY_INPUTS); setModel(null); setSaveState("idle");
    if (!leadId) { setLoading(false); setBusinessName(null); return; }
    setLoading(true);
    (async () => {
      const db = supabase as any;
      const [{ data: row }, { data: lead }] = await Promise.all([
        db.from("nl_discovery_numbers").select("*").eq("lead_id", leadId).maybeSingle(),
        db.from("nl_bdr_leads").select("user_id, business_name").eq("id", leadId).maybeSingle(),
      ]);
      if (cancelled) return;
      setOwnerId(lead?.user_id ?? null);
      setBusinessName(lead?.business_name ?? null);
      if (row) {
        const n = (v: any) => (v == null ? null : Number(v));
        const lpc = n(row.leads_per_client);
        // Older rows stored new leads only — show them as new clients for the new script.
        let nc = n(row.new_clients_12m);
        if (nc == null && row.new_leads != null && lpc && lpc > 0) {
          const yearly = row.new_leads_period === "month" ? Number(row.new_leads) * 12 : Number(row.new_leads);
          nc = Math.round((yearly / lpc) * 10) / 10;
        }
        setInputs({
          firm_type: "ria", goal_revenue: n(row.goal_revenue), goal_revenue_period: row.goal_revenue_period || "year",
          goal_clients: n(row.goal_clients), current_revenue: n(row.current_revenue), current_revenue_period: row.current_revenue_period || "year",
          current_clients: n(row.current_clients), new_leads: n(row.new_leads), new_leads_period: row.new_leads_period || "year",
          leads_per_client: lpc, new_clients_12m: nc, their_number: n(row.their_number),
        });
        setModel(row.model_leads != null || row.model_close_rate != null || row.model_ticket != null
          ? { leads: Number(row.model_leads ?? 0), closeRate: Number(row.model_close_rate ?? 0), ticket: Number(row.model_ticket ?? 0) }
          : null);
      }
      setLoading(false);
      setTimeout(() => { loaded.current = true; }, 0);
    })();
    return () => { cancelled = true; };
  }, [leadId]);

  const result = useMemo(() => computeDiscovery(inputs), [inputs]);
  const base = useMemo(() => baselineModel(result), [result]);
  const m = model ?? base;
  const proj = useMemo(() => projectModel(result, m), [result, m]);
  const dirty = model != null && (Math.round(model.leads) !== Math.round(base.leads)
    || Math.abs(model.closeRate - base.closeRate) > 0.0005 || Math.round(model.ticket) !== Math.round(base.ticket));

  // Autosave (debounced). New leads are stored too, so older screens keep working.
  useEffect(() => {
    if (!leadId || !loaded.current || !ownerId) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("nl_discovery_numbers").upsert({
        lead_id: leadId, user_id: ownerId, updated_by: u.user?.id ?? null,
        firm_type: "ria",
        goal_revenue: inputs.goal_revenue, goal_revenue_period: inputs.goal_revenue_period,
        goal_clients: inputs.goal_clients,
        current_revenue: inputs.current_revenue, current_revenue_period: inputs.current_revenue_period,
        current_clients: inputs.current_clients,
        new_leads: result.leadsPerYear != null ? Math.round(result.leadsPerYear * 10) / 10 : inputs.new_leads,
        new_leads_period: result.leadsPerYear != null ? "year" : inputs.new_leads_period,
        leads_per_client: inputs.leads_per_client,
        new_clients_12m: inputs.new_clients_12m ?? null,
        their_number: inputs.their_number ?? null,
        model_leads: model ? model.leads : null,
        model_close_rate: model ? Math.min(1, Math.max(0, model.closeRate)) : null,
        model_ticket: model ? model.ticket : null,
      }, { onConflict: "lead_id" });
      setSaveState(error ? "error" : "saved");
      if (error) console.error("discovery numbers save failed", error);
    }, 700);
    return () => clearTimeout(t);
  }, [inputs, model]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<DiscoveryInputs>) => setInputs((p) => ({ ...p, ...patch }));
  const setM = (patch: Partial<DiscoveryModel>) => setModel({ ...m, ...patch });
  const resetModel = () => setModel(null);

  return { inputs, set, model: m, setM, resetModel, dirty, result, base, proj, loading, saveState, businessName, practice: !leadId };
}
