import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { Trophy, XCircle, UserX, CalendarClock, Percent } from "lucide-react";

export type RangeKey = "30" | "90" | "365" | "all";

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
  { key: "365", label: "Last 365 days" },
  { key: "all", label: "All time" },
];

export function rangeStart(range: RangeKey): string | null {
  if (range === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - Number(range));
  return d.toISOString();
}

const STAGE_ORDER = [
  { key: "new_lead", label: "New Lead" },
  { key: "appointment_booked", label: "Appt Booked" },
  { key: "negotiation", label: "Negotiation" },
  { key: "closed_won", label: "Won" },
];

const NEON = "hsl(211 96% 60%)";
const GREEN = "hsl(152 60% 50%)";
const RED = "hsl(0 72% 61%)";
const PIE_COLORS = [NEON, "hsl(197 92% 68%)", "hsl(41 96% 60%)", "hsl(280 70% 65%)", "hsl(152 60% 50%)", RED, "hsl(210 20% 60%)"];

export interface InsightsData {
  deals: any[];
  appts: any[];
  outcomes: any[];
  names: Record<string, string>;
}

export function isNoShow(a: any): boolean {
  const s = (a.status || "").toLowerCase();
  if (s.includes("no_show") || s.includes("no-show") || s === "noshow") return true;
  if (!a.meeting_started_at && a.start_time) {
    const past = Date.now() - new Date(a.start_time).getTime();
    const completed = s === "completed" || s === "cancelled" || s === "canceled" || s === "rescheduled";
    if (past > 2 * 60 * 60 * 1000 && !completed) return true;
  }
  return false;
}

export async function fetchInsightsData(clientId: string | null, range: RangeKey): Promise<InsightsData> {
  const since = rangeStart(range);

  let dq = supabase.from("crm_deals").select("id, client_id, pipeline_stage, deal_value, lost_reason, lost_at, assigned_user, created_at");
  let aq = supabase.from("appointments").select("id, client_id, status, start_time, meeting_started_at, reschedule_count, reschedule_reason, cancellation_reason, assigned_user_id, created_at");
  let oq = supabase.from("client_call_outcomes").select("id, client_id, user_id, outcome, objection_category, logged_at");

  if (clientId) {
    dq = dq.eq("client_id", clientId);
    aq = aq.eq("client_id", clientId);
    oq = oq.eq("client_id", clientId);
  }
  if (since) {
    dq = dq.gte("created_at", since);
    aq = aq.gte("start_time", since);
    oq = oq.gte("logged_at", since);
  }

  const [dRes, aRes, oRes] = await Promise.all([
    dq.limit(5000),
    aq.limit(5000),
    oq.limit(5000),
  ]);

  const deals = dRes.data || [];
  const appts = aRes.data || [];
  const outcomes = oRes.data || [];

  const ids = Array.from(new Set([
    ...deals.map((d: any) => d.assigned_user),
    ...appts.map((a: any) => a.assigned_user_id),
    ...outcomes.map((o: any) => o.user_id),
  ].filter(Boolean))) as string[];

  const names: Record<string, string> = {};
  if (ids.length) {
    const [wu, ep] = await Promise.all([
      supabase.from("workspace_users").select("user_id, full_name").in("user_id", ids),
      supabase.from("employee_profiles").select("user_id, full_name").in("user_id", ids),
    ]);
    (ep.data || []).forEach((r: any) => { if (r.user_id && r.full_name) names[r.user_id] = r.full_name; });
    (wu.data || []).forEach((r: any) => { if (r.user_id && r.full_name) names[r.user_id] = r.full_name; });
  }

  return { deals, appts, outcomes, names };
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="h-[220px] flex flex-col items-center justify-center text-center gap-1.5 rounded-xl border border-dashed border-white/10">
      <p className="text-sm text-white/60 font-medium">No data yet</p>
      <p className="text-xs text-white/35 max-w-[240px]">{label}</p>
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: string; icon: any; tone?: "good" | "bad" }) {
  return (
    <Card className="border-0 bg-white/[0.04]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-red-400" : "text-white"}`}>{value}</p>
            {sub && <p className="text-[11px] text-white/40 mt-0.5">{sub}</p>}
          </div>
          <Icon className="h-4 w-4 text-white/30" />
        </div>
      </CardContent>
    </Card>
  );
}

const chartTooltip = {
  contentStyle: { background: "hsl(220 30% 12%)", border: "1px solid hsla(211,96%,60%,.2)", borderRadius: 8, fontSize: 11, color: "white" },
};

export interface FunnelStage {
  key?: string;
  name: string;
  count: number;
  conversionPct: number | null;
}

export function computeStageFunnel(deals: any[]): FunnelStage[] {
  const funnel: FunnelStage[] = STAGE_ORDER.map((s, i) => {
    const count = deals.filter(d => d.pipeline_stage === s.key).length;
    let conversionPct: number | null = null;
    if (i > 0) {
      const prev = deals.filter(d => d.pipeline_stage === STAGE_ORDER[i - 1].key).length;
      conversionPct = prev > 0 ? Math.round((count / prev) * 100) : null;
    }
    return { key: s.key, name: s.label, count, conversionPct };
  });
  return funnel;
}

export interface Bottleneck {
  fromLabel: string;
  toLabel: string;
  conversionPct: number;
}

export function computeBottleneck(deals: any[]): Bottleneck | null {
  const funnel = computeStageFunnel(deals);
  const withConv = funnel.filter((f, i) => i > 0 && f.conversionPct !== null);
  if (funnel.filter(f => f.count > 0).length < 2 || withConv.length === 0) return null;
  const lowest = withConv.reduce((a, b) => (b.conversionPct! < a.conversionPct! ? b : a));
  const idx = funnel.indexOf(lowest);
  return { fromLabel: funnel[idx - 1].name, toLabel: lowest.name, conversionPct: lowest.conversionPct! };
}

function FunnelTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as FunnelStage;
  return (
    <div style={chartTooltip.contentStyle} className="px-3 py-2">
      <p className="font-semibold">{d.name}</p>
      <p>{d.count} deal{d.count === 1 ? "" : "s"}</p>
      {d.conversionPct !== null && d.conversionPct !== undefined && (
        <p className="text-white/70">{d.conversionPct}% from previous stage</p>
      )}
    </div>
  );
}

export function PipelineInsightsView({ data, loading }: { data: InsightsData; loading: boolean }) {
  const { deals, appts, outcomes, names } = data;

  const won = deals.filter(d => d.pipeline_stage === "closed_won");
  const lost = deals.filter(d => d.pipeline_stage === "lost" || d.pipeline_stage === "closed_lost");
  const wonValue = won.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  const noShows = appts.filter(isNoShow);
  const rescheduled = appts.reduce((s, a) => s + (Number(a.reschedule_count) || 0), 0);
  const closeRate = won.length + lost.length > 0 ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;

  const funnel = computeStageFunnel(deals);
  funnel.push({ name: "Lost", count: lost.length, conversionPct: null });
  const bottleneck = computeBottleneck(deals);
  const attendRate = appts.length ? Math.round(100 - (noShows.length / appts.length) * 100) : null;

  const wonLost = [
    { name: "Won", value: won.length },
    { name: "Lost", value: lost.length },
  ].filter(x => x.value > 0);

  const objections = useMemo(() => {
    const m: Record<string, number> = {};
    outcomes.forEach(o => { if (o.objection_category) m[o.objection_category] = (m[o.objection_category] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [outcomes]);

  const reps = useMemo(() => {
    const ids = new Set<string>();
    deals.forEach(d => d.assigned_user && ids.add(d.assigned_user));
    appts.forEach(a => a.assigned_user_id && ids.add(a.assigned_user_id));
    outcomes.forEach(o => o.user_id && ids.add(o.user_id));
    return Array.from(ids).map(id => {
      const dW = deals.filter(d => d.assigned_user === id && d.pipeline_stage === "closed_won").length;
      const dL = deals.filter(d => d.assigned_user === id && (d.pipeline_stage === "lost" || d.pipeline_stage === "closed_lost")).length;
      const myAppts = appts.filter(a => a.assigned_user_id === id);
      const ns = myAppts.filter(isNoShow).length;
      return {
        id,
        name: names[id] || `${id.slice(0, 8)}…`,
        closeRate: dW + dL > 0 ? Math.round((dW / (dW + dL)) * 100) : null,
        won: dW,
        lost: dL,
        noShowRate: myAppts.length ? Math.round((ns / myAppts.length) * 100) : null,
        reschedules: myAppts.reduce((s, a) => s + (Number(a.reschedule_count) || 0), 0),
      };
    }).sort((a, b) => (b.closeRate ?? -1) - (a.closeRate ?? -1));
  }, [deals, appts, outcomes, names]);

  if (loading) {
    return <div className="py-16 text-center text-sm text-white/40">Loading insights…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Won" value={String(won.length)} sub={`$${wonValue.toLocaleString()}`} icon={Trophy} tone="good" />
        <Stat label="Lost" value={String(lost.length)} icon={XCircle} tone={lost.length ? "bad" : undefined} />
        <Stat label="No-Shows" value={String(noShows.length)} sub={`${appts.length} meetings`} icon={UserX} />
        <Stat label="Rescheduled" value={String(rescheduled)} icon={CalendarClock} />
        <Stat label="Close Rate" value={`${closeRate}%`} icon={Percent} tone={closeRate >= 50 ? "good" : undefined} />
      </div>

      <Card className="border-0 bg-white/[0.04]">
        <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Pipeline Funnel</CardTitle></CardHeader>
        <CardContent>
          {deals.length === 0 ? (
            <EmptyState label="Deals will appear here as your pipeline fills up." />
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel}>
                  <XAxis dataKey="name" tick={{ fill: "hsla(0,0%,100%,.5)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsla(0,0%,100%,.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTooltip} cursor={{ fill: "hsla(211,96%,60%,.06)" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {funnel.map((f, i) => (
                      <Cell key={f.name} fill={f.name === "Lost" ? RED : f.name === "Won" ? GREEN : NEON} fillOpacity={0.55 + i * 0.08} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 bg-white/[0.04]">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Won vs Lost</CardTitle></CardHeader>
          <CardContent>
            {wonLost.length === 0 ? (
              <EmptyState label="Close or lose a deal to see the split here." />
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={wonLost} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                      {wonLost.map(w => <Cell key={w.name} fill={w.name === "Won" ? GREEN : RED} />)}
                    </Pie>
                    <Tooltip {...chartTooltip} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "white" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/[0.04]">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Objection Breakdown</CardTitle></CardHeader>
          <CardContent>
            {objections.length === 0 ? (
              <EmptyState label="Objections logged on calls will be categorized here." />
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={objections} dataKey="value" nameKey="name" outerRadius={80}>
                      {objections.map((o, i) => <Cell key={o.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...chartTooltip} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "white" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 bg-white/[0.04]">
        <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Per-Salesperson Performance</CardTitle></CardHeader>
        <CardContent>
          {reps.length === 0 ? (
            <EmptyState label="Assign deals and meetings to reps to compare performance." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-white/40">
                    <th className="text-left font-semibold py-2">Salesperson</th>
                    <th className="text-right font-semibold py-2">Won</th>
                    <th className="text-right font-semibold py-2">Lost</th>
                    <th className="text-right font-semibold py-2">Close Rate</th>
                    <th className="text-right font-semibold py-2">No-Show Rate</th>
                    <th className="text-right font-semibold py-2">Reschedules</th>
                  </tr>
                </thead>
                <tbody>
                  {reps.map(r => (
                    <tr key={r.id} className="border-t border-white/5">
                      <td className="py-2 text-white/80">{r.name}</td>
                      <td className="py-2 text-right text-emerald-400">{r.won}</td>
                      <td className="py-2 text-right text-red-400">{r.lost}</td>
                      <td className="py-2 text-right text-white">{r.closeRate === null ? "—" : `${r.closeRate}%`}</td>
                      <td className="py-2 text-right text-white/70">{r.noShowRate === null ? "—" : `${r.noShowRate}%`}</td>
                      <td className="py-2 text-right text-white/70">{r.reschedules}</td>
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

export function RangeFilter({ value, onChange }: { value: RangeKey; onChange: (v: RangeKey) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as RangeKey)}>
      <SelectTrigger className="w-[170px] bg-white/[0.04] border-white/10 text-white text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RANGE_OPTIONS.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function usePipelineInsights(clientId: string | null | undefined, range: RangeKey, enabled = true) {
  const [data, setData] = useState<InsightsData>({ deals: [], appts: [], outcomes: [], names: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) { setLoading(false); return; }
    setLoading(true);
    fetchInsightsData(clientId ?? null, range).then(d => {
      if (!cancelled) { setData(d); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId, range, enabled]);

  return { data, loading };
}
