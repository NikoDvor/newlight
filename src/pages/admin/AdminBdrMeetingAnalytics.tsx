import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  AlertTriangle, TrendingDown, Trophy, Percent, UserCheck, CalendarClock,
  RefreshCw, Target, Clock, Users,
} from "lucide-react";
import { RANGE_OPTIONS, rangeStart, type RangeKey } from "@/components/insights/PipelineInsightsView";

/* ─── constants ─── */
const NEON = "hsl(211 96% 60%)";
const GREEN = "hsl(152 60% 50%)";

const DISCOVERY_SOURCES = ["booking_form", "dialer"];
const CLOSING_SOURCES = ["closing_meeting"];

type MeetingKind = "discovery" | "closing";

interface Evt {
  id: string;
  lead_id: string | null;
  user_id: string | null;
  starts_at: string;
  attendance: string | null;
  source: string | null;
  reschedule_count: number | null;
}

interface Lead {
  id: string;
  user_id: string | null;
  crm_deal_id: string | null;
  business_name: string | null;
  pipeline_stage: string | null;
  outcome_history: any;
  created_at: string;
}

interface Deal {
  id: string;
  pay_sign_status: string | null;
  updated_at: string | null;
  paid_signed_at: string | null;
}

interface Objection { id: string; objection_category: string | null; meeting_kind: string | null; user_id: string | null }

interface Data {
  events: Evt[];
  leads: Lead[];
  deals: Deal[];
  objections: Objection[];
  names: Record<string, string>;
}

const EMPTY: Data = { events: [], leads: [], deals: [], objections: [], names: {} };

function kindOf(e: Evt): MeetingKind | null {
  if (e.source && DISCOVERY_SOURCES.includes(e.source)) return "discovery";
  if (e.source && CLOSING_SOURCES.includes(e.source)) return "closing";
  return null;
}

function pct(n: number, d: number): number | null {
  return d > 0 ? Math.round((n / d) * 100) : null;
}

function fmtPct(v: number | null) {
  return v === null ? "—" : `${v}%`;
}

/* ─── data ─── */
async function fetchData(range: RangeKey): Promise<Data> {
  const since = rangeStart(range);

  let eq = supabase.from("bdr_calendar_events")
    .select("id, lead_id, user_id, starts_at, attendance, source, reschedule_count");
  let lq = supabase.from("nl_bdr_leads")
    .select("id, user_id, crm_deal_id, business_name, pipeline_stage, outcome_history, created_at");
  let oq = supabase.from("nl_bdr_objections").select("id, objection_category, meeting_kind, user_id, created_at");

  if (since) {
    eq = eq.gte("starts_at", since);
    lq = lq.gte("created_at", since);
    oq = oq.gte("created_at", since);
  }

  const [eRes, lRes, oRes] = await Promise.all([eq.limit(5000), lq.limit(5000), oq.limit(5000)]);

  const events = ((eRes.data as any[]) || []) as Evt[];
  const leads = ((lRes.data as any[]) || []) as Lead[];
  const objections = ((oRes.data as any[]) || []) as Objection[];

  const dealIds = Array.from(new Set(leads.map(l => l.crm_deal_id).filter(Boolean))) as string[];
  let deals: Deal[] = [];
  if (dealIds.length) {
    const chunks: string[][] = [];
    for (let i = 0; i < dealIds.length; i += 200) chunks.push(dealIds.slice(i, i + 200));
    const res = await Promise.all(chunks.map(c =>
      supabase.from("crm_deals").select("id, pay_sign_status, updated_at, paid_signed_at").in("id", c)));
    deals = res.flatMap(r => ((r.data as any[]) || [])) as Deal[];
  }

  const userIds = Array.from(new Set([
    ...leads.map(l => l.user_id),
    ...events.map(e => e.user_id),
  ].filter(Boolean))) as string[];

  const names: Record<string, string> = {};
  if (userIds.length) {
    const [ep, wu] = await Promise.all([
      supabase.from("employee_profiles").select("user_id, full_name").in("user_id", userIds),
      supabase.from("workspace_users").select("user_id, full_name").in("user_id", userIds),
    ]);
    ((wu.data as any[]) || []).forEach(r => { if (r.user_id && r.full_name) names[r.user_id] = r.full_name; });
    ((ep.data as any[]) || []).forEach(r => { if (r.user_id && r.full_name) names[r.user_id] = r.full_name; });
  }

  return { events, leads, deals, objections, names };
}

/* ─── small UI ─── */
function Sample({ n, noun = "meetings" }: { n: number; noun?: string }) {
  if (n === 0) return <p className="text-[11px] text-white/35 mt-1">No {noun} yet — this will fill in as the pipeline runs.</p>;
  return <p className="text-[11px] text-white/35 mt-1">Based on {n} {n === 1 ? noun.replace(/s$/, "") : noun} — more data will sharpen this over time.</p>;
}

function Metric({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: React.ReactNode; icon: any; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-red-400" : "text-white"}`}>{value}</p>
          {sub}
        </div>
        <Icon className="h-4 w-4 text-white/30 shrink-0" />
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="h-[180px] flex flex-col items-center justify-center text-center gap-1.5 rounded-xl border border-dashed border-white/10">
      <p className="text-sm text-white/60 font-medium">No data yet</p>
      <p className="text-xs text-white/35 max-w-[260px]">{label}</p>
    </div>
  );
}

function RowGroup({ title, rows, noun }: { title: string; rows: { name: string; n: number }[]; noun: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold mb-1.5">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-white/30 py-1.5">None logged.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map(o => (
            <div key={o.name} className="flex items-center justify-between text-xs text-white/70 border-b border-white/[0.06] py-1.5">
              <span>{o.name}</span><span className="text-white/50">{o.n}</span>
            </div>
          ))}
          <Sample n={rows.reduce((s, o) => s + o.n, 0)} noun={`logged ${noun}`} />
        </div>
      )}
    </div>
  );
}


const chartTooltipStyle = {
  background: "hsl(220 30% 12%)", border: "1px solid hsla(211,96%,60%,.2)",
  borderRadius: 8, fontSize: 11, color: "white",
};

/* ─── metric computation per meeting kind ─── */
interface KindStats {
  total: number;
  pastDue: number;
  attended: number;
  noShow: number;
  showUpRate: number | null;
  rescheduledPct: number | null;
  avgReschedules: number | null;
  recovered: number;
  recoveryRate: number | null;
  progressed: number;
  progressionRate: number | null;
}

function computeKind(kind: MeetingKind, events: Evt[], leads: Lead[], deals: Deal[]): KindStats {
  const now = Date.now();
  const mine = events.filter(e => kindOf(e) === kind);
  const pastDue = mine.filter(e => new Date(e.starts_at).getTime() < now && e.attendance !== "pending");
  const attended = pastDue.filter(e => e.attendance === "attended");
  const noShow = pastDue.filter(e => e.attendance === "no_show");

  const rescheduled = mine.filter(e => (e.reschedule_count || 0) > 0);
  const totalReschedules = mine.reduce((s, e) => s + (e.reschedule_count || 0), 0);

  // no-show recovery: a later same-kind meeting for that lead that was attended
  let recovered = 0;
  noShow.forEach(ns => {
    const t = new Date(ns.starts_at).getTime();
    const later = mine.some(e =>
      e.lead_id && e.lead_id === ns.lead_id &&
      e.id !== ns.id &&
      new Date(e.starts_at).getTime() > t &&
      e.attendance === "attended");
    if (later) recovered++;
  });

  // progression
  const dealById = new Map(deals.map(d => [d.id, d]));
  const attendedLeadIds = Array.from(new Set(attended.map(a => a.lead_id).filter(Boolean))) as string[];
  let progressed = 0;
  attendedLeadIds.forEach(leadId => {
    if (kind === "discovery") {
      const firstAttended = Math.min(...attended.filter(a => a.lead_id === leadId).map(a => new Date(a.starts_at).getTime()));
      const hasClosing = events.some(e => e.lead_id === leadId && kindOf(e) === "closing" && new Date(e.starts_at).getTime() > firstAttended);
      if (hasClosing) progressed++;
    } else {
      const lead = leads.find(l => l.id === leadId);
      const deal = lead?.crm_deal_id ? dealById.get(lead.crm_deal_id) : undefined;
      if (deal?.pay_sign_status === "paid_signed") progressed++;
    }
  });

  return {
    total: mine.length,
    pastDue: pastDue.length,
    attended: attended.length,
    noShow: noShow.length,
    showUpRate: pct(attended.length, attended.length + noShow.length),
    rescheduledPct: pct(rescheduled.length, mine.length),
    avgReschedules: mine.length ? Math.round((totalReschedules / mine.length) * 100) / 100 : null,
    recovered,
    recoveryRate: pct(recovered, noShow.length),
    progressed,
    progressionRate: pct(progressed, attendedLeadIds.length),
  };
}

function KindBlock({ title, stats, progressionLabel }: { title: string; stats: KindStats; progressionLabel: string }) {
  return (
    <Card className="border-0 bg-white/[0.03]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: NEON }} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Metric
          label="Show-Up Rate"
          value={fmtPct(stats.showUpRate)}
          icon={UserCheck}
          tone={stats.showUpRate !== null && stats.showUpRate >= 75 ? "good" : undefined}
          sub={<Sample n={stats.attended + stats.noShow} noun="completed meetings" />}
        />
        <Metric
          label="Reschedule Rate"
          value={fmtPct(stats.rescheduledPct)}
          icon={RefreshCw}
          sub={
            <p className="text-[11px] text-white/35 mt-1">
              Avg {stats.avgReschedules ?? "—"} per meeting · {stats.total} booked
            </p>
          }
        />
        <Metric
          label="No-Show Recovery"
          value={fmtPct(stats.recoveryRate)}
          icon={CalendarClock}
          sub={<p className="text-[11px] text-white/35 mt-1">{stats.recovered} of {stats.noShow} no-shows re-booked & attended</p>}
        />
        <Metric
          label="Progression Rate"
          value={fmtPct(stats.progressionRate)}
          icon={Target}
          tone={stats.progressionRate !== null && stats.progressionRate >= 75 ? "good" : undefined}
          sub={<p className="text-[11px] text-white/35 mt-1">{progressionLabel}</p>}
        />
      </CardContent>
    </Card>
  );
}

/* ─── page ─── */
export default function AdminBdrMeetingAnalytics() {
  const [range, setRange] = useState<RangeKey>("90");
  const [repFilter, setRepFilter] = useState<string>("all");
  const [data, setData] = useState<Data>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>("discoveryShow");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchData(range)
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(EMPTY); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range]);

  const { events, leads, deals, objections, names } = data;

  // Rep scoping: same logic as the per-rep table's myLeads/myEvents
  const effectiveLeads = useMemo(
    () => (repFilter === "all" ? leads : leads.filter(l => l.user_id === repFilter)),
    [leads, repFilter],
  );
  const effectiveEvents = useMemo(() => {
    if (repFilter === "all") return events;
    const ids = new Set(effectiveLeads.map(l => l.id));
    return events.filter(e => e.user_id === repFilter || (e.lead_id && ids.has(e.lead_id)));
  }, [events, effectiveLeads, repFilter]);

  const discovery = useMemo(() => computeKind("discovery", effectiveEvents, effectiveLeads, deals), [effectiveEvents, effectiveLeads, deals]);
  const closing = useMemo(() => computeKind("closing", effectiveEvents, effectiveLeads, deals), [effectiveEvents, effectiveLeads, deals]);

  const wonDealIds = useMemo(
    () => new Set(deals.filter(d => d.pay_sign_status === "paid_signed").map(d => d.id)),
    [deals],
  );
  const wonLeads = useMemo(
    () => effectiveLeads.filter(l => l.crm_deal_id && wonDealIds.has(l.crm_deal_id)),
    [effectiveLeads, wonDealIds],
  );

  /* 5. Funnel */
  const funnel = useMemo(() => {
    const discoveryBooked = new Set(effectiveEvents.filter(e => kindOf(e) === "discovery" && e.lead_id).map(e => e.lead_id)).size;
    const discoveryAttended = new Set(effectiveEvents.filter(e => kindOf(e) === "discovery" && e.attendance === "attended" && e.lead_id).map(e => e.lead_id)).size;
    const closingBooked = new Set(effectiveEvents.filter(e => kindOf(e) === "closing" && e.lead_id).map(e => e.lead_id)).size;
    const closingAttended = new Set(effectiveEvents.filter(e => kindOf(e) === "closing" && e.attendance === "attended" && e.lead_id).map(e => e.lead_id)).size;
    const stages = [
      { name: "Leads Created", count: effectiveLeads.length },
      { name: "Discovery Booked", count: discoveryBooked },
      { name: "Discovery Attended", count: discoveryAttended },
      { name: "Closing Booked", count: closingBooked },
      { name: "Closing Attended", count: closingAttended },
      { name: "Won", count: wonLeads.length },
    ];
    return stages.map((s, i) => ({
      ...s,
      conversionPct: i === 0 ? null : (stages[i - 1].count > 0 ? Math.round((s.count / stages[i - 1].count) * 100) : null),
    }));
  }, [effectiveEvents, effectiveLeads, wonLeads]);


  const bottleneck = useMemo(() => {
    const withConv = funnel.filter((f, i) => i > 0 && f.conversionPct !== null);
    if (funnel.filter(f => f.count > 0).length < 2 || withConv.length === 0) return null;
    const lowest = withConv.reduce((a, b) => (b.conversionPct! < a.conversionPct! ? b : a));
    const idx = funnel.indexOf(lowest);
    return { fromLabel: funnel[idx - 1].name, toLabel: lowest.name, conversionPct: lowest.conversionPct! };
  }, [funnel]);

  /* 6. Meetings-to-close distribution */
  const meetingsToClose = useMemo(() => {
    const buckets: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4+": 0 };
    let counted = 0;
    wonLeads.forEach(l => {
      const attended = effectiveEvents.filter(e => e.lead_id === l.id && kindOf(e) !== null && e.attendance === "attended").length;
      if (attended === 0) return;
      counted++;
      const key = attended >= 4 ? "4+" : String(attended);
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return {
      counted,
      rows: Object.entries(buckets).map(([label, n]) => ({
        label: label === "4+" ? "4+ meetings" : `${label} meeting${label === "1" ? "" : "s"}`,
        n,
        pct: counted ? Math.round((n / counted) * 100) : 0,
      })),
    };
  }, [wonLeads, effectiveEvents]);

  /* 7. Objections + outcomes (split by meeting kind) */
  const groupCounts = (items: { key: string; kind: string | null }[]) => {
    const bucket = (k: string | null) => (k === "discovery" ? "discovery" : k === "closing" ? "closing" : "unlabeled");
    const acc: Record<string, Record<string, number>> = { discovery: {}, closing: {}, unlabeled: {} };
    items.forEach(i => {
      const b = bucket(i.kind);
      acc[b][i.key] = (acc[b][i.key] || 0) + 1;
    });
    const toRows = (m: Record<string, number>) =>
      Object.entries(m).map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n);
    return {
      discovery: toRows(acc.discovery),
      closing: toRows(acc.closing),
      unlabeled: toRows(acc.unlabeled),
    };
  };

  const objectionGroups = useMemo(
    () => groupCounts(
      objections
        .filter(o => repFilter === "all" || o.user_id === repFilter)
        .map(o => ({ key: o.objection_category || "Uncategorized", kind: o.meeting_kind }))
    ),
    [objections, repFilter],
  );

  const outcomeGroups = useMemo(() => {
    const items: { key: string; kind: string | null }[] = [];
    effectiveLeads.forEach(l => {
      const hist = Array.isArray(l.outcome_history) ? l.outcome_history : [];
      hist.forEach((h: any) => {
        const label = typeof h === "string" ? h : (h?.outcome || h?.label);
        if (label) items.push({ key: label, kind: typeof h === "string" ? null : (h?.meeting_kind ?? null) });
      });
    });
    return groupCounts(items);
  }, [effectiveLeads]);

  /* 8. Time to close */
  const timeToClose = useMemo(() => {
    const spans: number[] = [];
    let usedFallback = false;
    wonLeads.forEach(l => {
      const deal = deals.find(d => d.id === l.crm_deal_id);
      const closedAt = deal?.paid_signed_at || deal?.updated_at;
      if (!closedAt) return;
      const firstAttended = effectiveEvents
        .filter(e => e.lead_id === l.id && kindOf(e) !== null && e.attendance === "attended")
        .map(e => new Date(e.starts_at).getTime())
        .sort((a, b) => a - b)[0];
      if (!firstAttended) return;
      const days = (new Date(closedAt).getTime() - firstAttended) / 86400000;
      if (days >= 0) {
        spans.push(days);
        if (!deal?.paid_signed_at) usedFallback = true;
      }
    });
    const avg = spans.length ? Math.round((spans.reduce((a, b) => a + b, 0) / spans.length) * 10) / 10 : null;
    return { avg, n: spans.length, usedFallback };
  }, [wonLeads, deals, effectiveEvents]);


  /* 9. Per-rep */
  const reps = useMemo(() => {
    const ids = new Set<string>();
    leads.forEach(l => l.user_id && ids.add(l.user_id));
    events.forEach(e => e.user_id && ids.add(e.user_id));

    const rows = Array.from(ids).map(id => {
      const myLeads = leads.filter(l => l.user_id === id);
      const myLeadIds = new Set(myLeads.map(l => l.id));
      const myEvents = events.filter(e => (e.user_id === id) || (e.lead_id && myLeadIds.has(e.lead_id)));
      const d = computeKind("discovery", myEvents, myLeads, deals);
      const c = computeKind("closing", myEvents, myLeads, deals);

      const myWon = myLeads.filter(l => l.crm_deal_id && wonDealIds.has(l.crm_deal_id));
      const spans: number[] = [];
      myWon.forEach(l => {
        const deal = deals.find(x => x.id === l.crm_deal_id);
        const closedAt = deal?.paid_signed_at || deal?.updated_at;
        if (!closedAt) return;
        const first = myEvents
          .filter(e => e.lead_id === l.id && kindOf(e) !== null && e.attendance === "attended")
          .map(e => new Date(e.starts_at).getTime()).sort((a, b) => a - b)[0];
        if (!first) return;
        const days = (new Date(closedAt).getTime() - first) / 86400000;
        if (days >= 0) spans.push(days);
      });

      return {
        id,
        name: names[id] || `${id.slice(0, 8)}…`,
        discoveryShow: d.showUpRate,
        closingShow: c.showUpRate,
        progression: d.progressionRate,
        closingWon: c.progressionRate,
        avgDays: spans.length ? Math.round((spans.reduce((a, b) => a + b, 0) / spans.length) * 10) / 10 : null,
        meetings: d.total + c.total,
      };
    }).filter(r => r.meetings > 0 || r.avgDays !== null);

    return rows.sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      const av = (a as any)[sortKey] ?? -1;
      const bv = (b as any)[sortKey] ?? -1;
      return (av - bv) * dir;
    });
  }, [leads, events, deals, names, wonDealIds, sortKey, sortAsc]);

  const toggleSort = (k: string) => {
    if (k === sortKey) setSortAsc(s => !s);
    else { setSortKey(k); setSortAsc(false); }
  };

  const Th = ({ k, label, align = "right" }: { k: string; label: string; align?: "left" | "right" }) => (
    <th
      className={`${align === "left" ? "text-left" : "text-right"} font-semibold py-2 cursor-pointer select-none hover:text-white/70`}
      onClick={() => toggleSort(k)}
    >
      {label}{sortKey === k ? (sortAsc ? " ↑" : " ↓") : ""}
    </th>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">BDR Meeting Analytics</h1>
          <p className="text-xs text-white/40 mt-0.5">
            Sales-side pipeline only (leads, discovery & closing meetings) — separate from client-facing Pipeline Insights.
          </p>
          {repFilter !== "all" && (
            <p className="text-xs text-amber-300/80 mt-1">
              Showing: {reps.find(r => r.id === repFilter)?.name || "selected rep"} only — the per-rep table below still shows all reps.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={repFilter} onValueChange={setRepFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Reps</SelectItem>
              {reps.map(r => <SelectItem key={r.id} value={r.id} className="text-xs">{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={v => setRange(v as RangeKey)}>
            <SelectTrigger className="w-[170px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map(o => <SelectItem key={o.key} value={o.key} className="text-xs">{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>


      {loading ? (
        <div className="py-16 text-center text-sm text-white/40">Loading meeting analytics…</div>
      ) : (
        <>
          {/* 1-4: per meeting type */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <KindBlock
              title="Discovery Meeting (Form 1)"
              stats={discovery}
              progressionLabel={`${discovery.progressed} attended discoveries led to a closing meeting`}
            />
            <KindBlock
              title="Closing Meeting (Form 2)"
              stats={closing}
              progressionLabel={`${closing.progressed} attended closings reached paid & signed`}
            />
          </div>

          {/* 5: funnel + bottleneck */}
          {bottleneck === null ? (
            <Card className="border border-white/10 bg-white/[0.04]">
              <CardContent className="p-4 flex items-center gap-3">
                <Percent className="h-4 w-4 text-white/30 shrink-0" />
                <p className="text-sm text-white/50">Not enough pipeline data yet to identify a bottleneck.</p>
              </CardContent>
            </Card>
          ) : bottleneck.conversionPct > 75 ? (
            <Card className="border border-emerald-400/20 bg-emerald-400/[0.06]">
              <CardContent className="p-4 flex items-center gap-3">
                <Trophy className="h-4 w-4 text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-300">
                  No major bottlenecks — your weakest stage still converts at {bottleneck.conversionPct}% ({bottleneck.fromLabel} → {bottleneck.toLabel}).
                </p>
              </CardContent>
            </Card>
          ) : bottleneck.conversionPct < 50 ? (
            <Card className="border border-amber-400/30 bg-amber-400/[0.07]">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-300">
                    Biggest Bottleneck: {bottleneck.fromLabel} → {bottleneck.toLabel} ({bottleneck.conversionPct}% conversion)
                  </p>
                  <p className="text-[11px] text-amber-200/60 mt-0.5">This stage transition is losing the most leads — focus coaching and follow-up here.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-white/10 bg-white/[0.04]">
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingDown className="h-4 w-4 text-white/40 shrink-0" />
                <p className="text-sm text-white/70">
                  Weakest transition: {bottleneck.fromLabel} → {bottleneck.toLabel} ({bottleneck.conversionPct}% conversion).
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Full Sales Funnel</CardTitle></CardHeader>
            <CardContent>
              {effectiveLeads.length === 0 ? (
                <EmptyState label="Leads and meetings will appear here as the sales pipeline runs." />
              ) : (
                <>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnel}>
                        <XAxis
                          dataKey="name"
                          interval={0}
                          height={54}
                          axisLine={false}
                          tickLine={false}
                          tick={(props: any) => {
                            const { x, y, payload } = props;
                            const stage = funnel[payload.index];
                            const words = String(payload.value).split(" ");
                            return (
                              <g transform={`translate(${x},${y})`}>
                                {words.map((w, i) => (
                                  <text key={i} x={0} y={0} dy={12 + i * 11} textAnchor="middle" fill="hsla(0,0%,100%,.5)" fontSize={10}>{w}</text>
                                ))}
                                {stage?.conversionPct != null && (
                                  <text x={0} y={0} dy={12 + words.length * 11} textAnchor="middle" fill="hsla(41,96%,60%,.9)" fontSize={10}>
                                    {stage.conversionPct}%
                                  </text>
                                )}
                              </g>
                            );
                          }}
                        />
                        <YAxis allowDecimals={false} tick={{ fill: "hsla(0,0%,100%,.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          cursor={{ fill: "hsla(211,96%,60%,.06)" }}
                          contentStyle={chartTooltipStyle}
                          formatter={(v: any) => [v, "Leads"]}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {funnel.map((f, i) => (
                            <Cell key={f.name} fill={f.name === "Won" ? GREEN : NEON} fillOpacity={0.5 + i * 0.08} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <Sample n={effectiveLeads.length} noun="leads" />
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 6: meetings to close */}
            <Card className="border-0 bg-white/[0.04]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Meetings to Close</CardTitle></CardHeader>
              <CardContent>
                {meetingsToClose.counted === 0 ? (
                  <EmptyState label="Once deals reach paid & signed, the number of attended meetings it took shows here." />
                ) : (
                  <div className="space-y-2.5">
                    {meetingsToClose.rows.map(r => (
                      <div key={r.label}>
                        <div className="flex items-center justify-between text-xs text-white/70">
                          <span>{r.label}</span>
                          <span className="text-white/50">{r.n} client{r.n === 1 ? "" : "s"} ({r.pct}%)</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] mt-1 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: NEON }} />
                        </div>
                      </div>
                    ))}
                    <Sample n={meetingsToClose.counted} noun="closed clients" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 8: time to close */}
            <Card className="border-0 bg-white/[0.04]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-white">Time to Close</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Metric
                  label="Avg Days: First Attended Meeting → Paid & Signed"
                  value={timeToClose.avg === null ? "—" : `${timeToClose.avg} days`}
                  icon={Clock}
                  sub={<Sample n={timeToClose.n} noun="closed deals" />}
                />
                {timeToClose.usedFallback && (
                  <p className="text-[11px] text-white/35">
                    Some pre-dates this fix and uses an approximate timestamp.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 7: objections + outcomes */}
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white">Objections &amp; Outcomes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-[11px] text-white/35">
                Tagged to whichever meeting was most recent for that lead at the moment it was logged.
                Entries from before this tracking existed show as Unlabeled.
              </p>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2">Objection Categories</p>
                {objectionGroups.discovery.length === 0 && objectionGroups.closing.length === 0 && objectionGroups.unlabeled.length === 0 ? (
                  <EmptyState label="Objections logged by reps will be grouped here." />
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <RowGroup title="Discovery" rows={objectionGroups.discovery} noun="objections" />
                      <RowGroup title="Closing" rows={objectionGroups.closing} noun="objections" />
                    </div>
                    {objectionGroups.unlabeled.length > 0 && (
                      <p className="text-[11px] text-white/30 mt-2">
                        Unlabeled (logged before this tracking existed): {objectionGroups.unlabeled.reduce((s, o) => s + o.n, 0)}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2">Lead Outcome History</p>
                {outcomeGroups.discovery.length === 0 && outcomeGroups.closing.length === 0 && outcomeGroups.unlabeled.length === 0 ? (
                  <EmptyState label="Outcomes logged on leads will be tallied here." />
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <RowGroup title="Discovery" rows={outcomeGroups.discovery} noun="outcomes" />
                      <RowGroup title="Closing" rows={outcomeGroups.closing} noun="outcomes" />
                    </div>
                    {outcomeGroups.unlabeled.length > 0 && (
                      <p className="text-[11px] text-white/30 mt-2">
                        Unlabeled (logged before this tracking existed): {outcomeGroups.unlabeled.reduce((s, o) => s + o.n, 0)}
                      </p>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>


          {/* 9: per-rep */}
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-white/40" /> Per-Rep Meeting Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reps.length === 0 ? (
                <EmptyState label="Assign leads and meetings to reps to compare performance." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-white/40">
                        <Th k="name" label="Rep" align="left" />
                        <Th k="discoveryShow" label="Discovery Show-Up" />
                        <Th k="closingShow" label="Closing Show-Up" />
                        <Th k="progression" label="Disc → Closing" />
                        <Th k="closingWon" label="Closing → Won" />
                        <Th k="avgDays" label="Avg Days to Close" />
                        <Th k="meetings" label="Meetings" />
                      </tr>
                    </thead>
                    <tbody>
                      {reps.map(r => (
                        <tr
                          key={r.id}
                          onClick={() => setRepFilter(prev => (prev === r.id ? "all" : r.id))}
                          className={`border-t border-white/[0.06] text-white/80 cursor-pointer transition-colors ${repFilter === r.id ? "bg-[hsla(211,96%,60%,.12)]" : "hover:bg-white/[0.04]"}`}
                        >
                          <td className="py-2 text-left">{r.name}</td>
                          <td className="py-2 text-right">{fmtPct(r.discoveryShow)}</td>
                          <td className="py-2 text-right">{fmtPct(r.closingShow)}</td>
                          <td className="py-2 text-right">{fmtPct(r.progression)}</td>
                          <td className="py-2 text-right">{fmtPct(r.closingWon)}</td>
                          <td className="py-2 text-right">{r.avgDays === null ? "—" : `${r.avgDays}d`}</td>
                          <td className="py-2 text-right text-white/50">{r.meetings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Sample n={reps.length} noun="reps" />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
