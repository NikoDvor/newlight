import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpDown } from "lucide-react";
import {
  PipelineInsightsView, RangeFilter, usePipelineInsights, isNoShow, computeBottleneck, type RangeKey,
} from "@/components/insights/PipelineInsightsView";

type SortKey = "name" | "closeRate" | "noShowRate" | "rescheduleRate" | "stuck" | "weakestPct";

const STAGES = [
  { key: "new_lead", label: "New" },
  { key: "appointment_booked", label: "Appt" },
  { key: "negotiation", label: "Nego" },
];

export default function AdminPipelineInsights() {
  const [range, setRange] = useState<RangeKey>("90");
  const [clientId, setClientId] = useState<string>("all");
  const [clients, setClients] = useState<{ id: string; business_name: string | null }[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("stuck");
  const [sortAsc, setSortAsc] = useState(false);

  const selected = clientId === "all" ? null : clientId;
  const { data, loading } = usePipelineInsights(selected, range);
  const all = usePipelineInsights(null, range);

  useEffect(() => {
    supabase.from("clients").select("id, business_name").order("business_name").limit(500)
      .then(({ data }) => setClients(data || []));
  }, []);

  const clientName = (id: string) => clients.find(c => c.id === id)?.business_name || `${id.slice(0, 8)}…`;

  const rows = useMemo(() => {
    const ids = new Set<string>();
    all.data.deals.forEach((d: any) => d.client_id && ids.add(d.client_id));
    all.data.appts.forEach((a: any) => a.client_id && ids.add(a.client_id));
    return Array.from(ids).map(id => {
      const deals = all.data.deals.filter((d: any) => d.client_id === id);
      const appts = all.data.appts.filter((a: any) => a.client_id === id);
      const won = deals.filter((d: any) => d.pipeline_stage === "closed_won").length;
      const lost = deals.filter((d: any) => d.pipeline_stage === "lost" || d.pipeline_stage === "closed_lost").length;
      const ns = appts.filter(isNoShow).length;
      const resch = appts.reduce((s: number, a: any) => s + (Number(a.reschedule_count) || 0), 0);
      const stages: Record<string, number> = {};
      STAGES.forEach(s => { stages[s.key] = deals.filter((d: any) => d.pipeline_stage === s.key).length; });
      const stuck = STAGES.reduce((s, st) => s + stages[st.key], 0);
      const bn = computeBottleneck(deals);
      return {
        id,
        name: clientName(id),
        closeRate: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null,
        noShowRate: appts.length ? Math.round((ns / appts.length) * 100) : null,
        rescheduleRate: appts.length ? Math.round((resch / appts.length) * 100) : null,
        stages,
        stuck,
        weakestPct: bn ? bn.conversionPct : null,
      };
    }).sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      if (sortKey === "weakestPct") {
        // Ascending = worst bottleneck first regardless of direction default
        const av = a.weakestPct ?? 999;
        const bv = b.weakestPct ?? 999;
        return (av - bv) * (sortAsc ? 1 : -1);
      }
      const av = (a as any)[sortKey] ?? -1;
      const bv = (b as any)[sortKey] ?? -1;
      return (av - bv) * dir;
    });
  }, [all.data, clients, sortKey, sortAsc]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortAsc(s => !s);
    else { setSortKey(k); setSortAsc(k === "name"); }
  };

  const Th = ({ k, label, align = "right" }: { k: SortKey; label: string; align?: "left" | "right" }) => (
    <th className={`py-2 text-[10px] uppercase tracking-wider font-semibold text-white/40 text-${align}`}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-white/70">
        {label}<ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline Insights</h1>
          <p className="text-sm text-white/50 mt-1">Wins, losses, no-shows and objections across all client pipelines.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-[220px] bg-white/[0.04] border-white/10 text-white text-xs">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.business_name || c.id.slice(0, 8)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <RangeFilter value={range} onChange={setRange} />
        </div>
      </div>

      <PipelineInsightsView data={data} loading={loading} />

      <Card className="border-0 bg-white/[0.04]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-white">Client Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {all.loading ? (
            <p className="py-8 text-center text-sm text-white/40">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="h-[180px] flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10">
              <p className="text-sm text-white/60 font-medium">No data yet</p>
              <p className="text-xs text-white/35">Client pipelines will be compared here as deals and meetings are logged.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <Th k="name" label="Client" align="left" />
                    <Th k="closeRate" label="Close Rate" />
                    <Th k="noShowRate" label="No-Show" />
                    <Th k="rescheduleRate" label="Reschedule" />
                    <Th k="weakestPct" label="Weakest Stage %" />
                    {STAGES.map(s => (
                      <th key={s.key} className="py-2 text-right text-[10px] uppercase tracking-wider font-semibold text-white/40">{s.label}</th>
                    ))}
                    <Th k="stuck" label="In Pipeline" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-t border-white/5">
                      <td className="py-2 text-white/80">
                        <button className="hover:text-white underline-offset-2 hover:underline" onClick={() => setClientId(r.id)}>{r.name}</button>
                      </td>
                      <td className="py-2 text-right text-white">{r.closeRate === null ? "—" : `${r.closeRate}%`}</td>
                      <td className={`py-2 text-right ${(r.noShowRate ?? 0) > 25 ? "text-red-400" : "text-white/70"}`}>{r.noShowRate === null ? "—" : `${r.noShowRate}%`}</td>
                      <td className="py-2 text-right text-white/70">{r.rescheduleRate === null ? "—" : `${r.rescheduleRate}%`}</td>
                      <td className={`py-2 text-right ${r.weakestPct !== null && r.weakestPct < 50 ? "text-amber-400" : "text-white/70"}`}>{r.weakestPct === null ? "—" : `${r.weakestPct}%`}</td>
                      {STAGES.map(s => (
                        <td key={s.key} className="py-2 text-right text-white/60">{r.stages[s.key]}</td>
                      ))}
                      <td className="py-2 text-right text-white font-semibold">{r.stuck}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
