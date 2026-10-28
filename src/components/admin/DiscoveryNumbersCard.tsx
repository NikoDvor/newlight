import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney, fmtPct } from "@/lib/pipelineRevenue";
import { computeDiscovery, projectModel, baselineModel, type DiscoveryInputs } from "@/lib/discoveryNumbers";
import DiscoveryNumbersDialog from "@/components/pipeline/DiscoveryNumbersDialog";

/**
 * Admin: every prospect's discovery numbers, per salesman — where they are,
 * their goal, the gap, average ticket, close rate and the modelled missed
 * revenue opportunity — plus averages. Click a row to open the same panel.
 */
const STAGE_LABEL: Record<string, string> = { cold: "Cold", warm: "Warm", hot: "Hot", won: "Won", expired_no_close_prep: "Expired" };

export default function DiscoveryNumbersCard({ repUserId }: { repUserId?: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<{ id: string; business_name: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const db = supabase as any;
    let q = db.from("nl_discovery_numbers")
      .select("*, lead:nl_bdr_leads(id, business_name, pipeline_stage, status)")
      .order("updated_at", { ascending: false }).limit(500);
    if (repUserId) q = q.eq("user_id", repUserId);
    const { data, error } = await q;
    if (error) console.error("discovery numbers load failed", error);
    const list = data || [];
    setRows(list);
    const ids = Array.from(new Set(list.map((r: any) => r.user_id)));
    if (ids.length) {
      const { data: emps } = await db.from("employee_profiles").select("user_id, full_name").in("user_id", ids);
      setNames(Object.fromEntries((emps || []).map((e: any) => [e.user_id, e.full_name])));
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [repUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const computed = useMemo(() => rows.map((r) => {
    const n = (v: any) => (v == null ? null : Number(v));
    const inputs: DiscoveryInputs = {
      firm_type: r.firm_type, goal_revenue: n(r.goal_revenue), goal_revenue_period: r.goal_revenue_period,
      goal_clients: n(r.goal_clients), current_revenue: n(r.current_revenue), current_revenue_period: r.current_revenue_period,
      current_clients: n(r.current_clients), new_leads: n(r.new_leads), new_leads_period: r.new_leads_period,
      leads_per_client: n(r.leads_per_client),
    };
    const res = computeDiscovery(inputs);
    const model = r.model_leads != null || r.model_close_rate != null || r.model_ticket != null
      ? { leads: Number(r.model_leads ?? 0), closeRate: Number(r.model_close_rate ?? 0), ticket: Number(r.model_ticket ?? 0) }
      : baselineModel(res);
    return { r, res, proj: projectModel(res, model) };
  }), [rows]);

  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null && Number.isFinite(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const averages = {
    current: avg(computed.map((c) => c.res.currentRevenue)),
    gap: avg(computed.map((c) => c.res.gapRevenue)),
    ticket: avg(computed.map((c) => c.res.avgTicket)),
    close: avg(computed.map((c) => c.res.closeRate)),
    missed: avg(computed.map((c) => c.proj.missedOpportunity)),
  };
  const money = (n: number | null) => (n == null ? "—" : fmtMoney(n));

  return (
    <Card className="border-0 bg-white/[0.03]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white">Discovery numbers by salesman</CardTitle>
        <p className="text-xs text-white/45">Each prospect's numbers from the discovery call. Click a row to open their calculator.</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 text-center text-sm text-white/40">Loading…</div>
        ) : computed.length === 0 ? (
          <div className="py-6 text-center text-sm text-white/40">No discovery numbers entered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-white/50">
                  <th className="py-2 pr-3 font-medium">Salesman</th>
                  <th className="py-2 pr-3 font-medium">Prospect</th>
                  <th className="py-2 pr-3 font-medium text-right">Current / yr</th>
                  <th className="py-2 pr-3 font-medium text-right">Goal / yr</th>
                  <th className="py-2 pr-3 font-medium text-right">Gap</th>
                  <th className="py-2 pr-3 font-medium text-right">Avg ticket</th>
                  <th className="py-2 pr-3 font-medium text-right">Close rate</th>
                  <th className="py-2 pr-3 font-medium text-right">Missed opp. (modelled)</th>
                  <th className="py-2 font-medium">Stage</th>
                </tr>
              </thead>
              <tbody>
                {computed.map(({ r, res, proj }) => (
                  <tr key={r.id} onClick={() => setOpen({ id: r.lead_id, business_name: r.lead?.business_name || "" })}
                    className="border-t border-white/5 text-white/85 cursor-pointer hover:bg-white/[0.03]">
                    <td className="py-2 pr-3 whitespace-nowrap">{names[r.user_id] || "Salesman"}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{r.lead?.business_name || "—"}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{money(res.currentRevenue)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{money(res.goalRevenue)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{money(res.gapRevenue)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{money(res.avgTicket)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{res.closeRate == null ? "—" : fmtPct(res.closeRate, 1)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-semibold">+{fmtMoney(proj.missedOpportunity)}</td>
                    <td className="py-2 whitespace-nowrap">{STAGE_LABEL[r.lead?.pipeline_stage] || r.lead?.pipeline_stage || "—"}</td>
                  </tr>
                ))}
                <tr className="border-t border-white/10 text-white/60 italic">
                  <td className="py-2 pr-3" colSpan={2}>Average ({computed.length})</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{money(averages.current)}</td>
                  <td className="py-2 pr-3" />
                  <td className="py-2 pr-3 text-right tabular-nums">{money(averages.gap)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{money(averages.ticket)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{averages.close == null ? "—" : fmtPct(averages.close, 1)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">+{money(averages.missed)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <DiscoveryNumbersDialog lead={open} onClose={() => { setOpen(null); load(); }} />
    </Card>
  );
}
