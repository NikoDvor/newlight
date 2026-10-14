import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { rangeStart, type RangeKey } from "@/components/insights/PipelineInsightsView";
import { LOST_REASONS, MEETING_KINDS, RESCHEDULE_REASONS, type LostReason } from "@/lib/meetingOutcomes";

const NEON = "hsl(211,96%,60%)";
const KINDS = ["discovery", "closing", "onboarding"] as const;

interface Ev { id: string; user_id: string; lead_id: string | null; meeting_kind: string; attempt_number: number | null; starts_at: string; ends_at: string | null; attendance: string | null }
interface Out {
  id: string; event_id: string; lead_id: string | null; rep_user_id: string; meeting_kind: string; attempt_number: number;
  attendance: string | null; result: "won" | "rescheduled" | "lost"; next_step: string | null; reschedule_reason: string | null;
  primary_lost_reason: string | null; lost_reasons: string[] | null; notes: string | null; logged_at: string;
}
interface Lead { id: string; business_name: string; user_id: string; crm_deal_id: string | null }
interface Deal { id: string; pay_sign_status: string | null; paid_signed_at: string | null; fully_activated_at: string | null }
interface Item { ev?: Ev; out?: Out }
interface Rate { num: number; den: number; items: Item[] }

export interface MeetingOutcomeAnalyticsProps {
  range: RangeKey;
  repFilter: string;
  reps: { id: string; name: string }[];
  onRepSelect: (repId: string) => void;
}

const SHORT: Record<string, string> = { discovery: "Discovery", closing: "Closing", onboarding: "Onboarding", pay_sign: "Pay & Sign" };
const kindLabel = (k: string, a?: number | null) => (k === "pay_sign" ? "Pay & Sign" : `${SHORT[k] || k} #${a ?? 1}`);
const pct = (r: { num: number; den: number }) => (r.den ? Math.round((r.num / r.den) * 100) : null);
const reasonLabel = (k: string) => LOST_REASONS[k as LostReason] || k;

async function pageAll<T>(build: (from: number, to: number) => any): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error || !data) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}
async function inChunks<T>(ids: string[], fn: (chunk: string[]) => Promise<T[]>): Promise<T[]> {
  const res: T[] = [];
  for (let i = 0; i < ids.length; i += 200) res.push(...(await fn(ids.slice(i, i + 200))));
  return res;
}

/* ─── metric engine ─── */
function computeMetrics(events: Ev[], outs: Out[], leads: Map<string, Lead>, deals: Map<string, Deal>) {
  const evById = new Map(events.map((e) => [e.id, e]));
  const item = (o: Out): Item => ({ out: o, ev: evById.get(o.event_id) });
  const dealOf = (leadId: string | null) => { const l = leadId ? leads.get(leadId) : null; return l?.crm_deal_id ? deals.get(l.crm_deal_id) : undefined; };
  const byKind = (k: string) => outs.filter((o) => o.meeting_kind === k);

  const show = (k: string): Rate => {
    const den = byKind(k).filter((o) => o.attendance === "attended" || o.attendance === "no_show");
    return { num: den.filter((o) => o.attendance === "attended").length, den: den.length, items: den.map(item) };
  };
  const leadConv = (k: string): Rate => {
    const os = byKind(k).filter((o) => o.lead_id);
    const all = new Set(os.map((o) => o.lead_id!));
    const won = new Set(os.filter((o) => o.result === "won").map((o) => o.lead_id!));
    return { num: won.size, den: all.size, items: os.map(item) };
  };
  const closingWon = byKind("closing").filter((o) => o.result === "won" && o.lead_id);
  const cwLeads = new Set(closingWon.map((o) => o.lead_id!));
  const paidLeads = new Set(Array.from(cwLeads).filter((l) => dealOf(l)?.pay_sign_status === "paid_signed"));
  const discOuts = byKind("discovery").filter((o) => o.lead_id);
  const discLeads = new Set(discOuts.map((o) => o.lead_id!));
  const allPaidInScope = new Set(Array.from(new Set(outs.map((o) => o.lead_id).filter(Boolean) as string[])).filter((l) => dealOf(l)?.pay_sign_status === "paid_signed"));
  const paidDeals = new Map<string, string>();
  allPaidInScope.forEach((l) => { const d = dealOf(l); if (d) paidDeals.set(d.id, l); });
  const activated = Array.from(paidDeals.keys()).filter((d) => deals.get(d)?.fully_activated_at).length;

  const resched = outs.filter((o) => o.result === "rescheduled");
  const recovered = resched.filter((r) => outs.some((o) => o.result === "won" && o.lead_id === r.lead_id && o.meeting_kind === r.meeting_kind && o.logged_at > r.logged_at));

  const attempt = (k: string, first: boolean): Rate => {
    const os = byKind(k).filter((o) => (first ? (o.attempt_number ?? 1) <= 1 : (o.attempt_number ?? 1) >= 2));
    return { num: os.filter((o) => o.result === "won").length, den: os.length, items: os.map(item) };
  };

  const lost = outs.filter((o) => o.result === "lost");
  const stageOf = (o: Out) => o.meeting_kind === "pay_sign" ? "Pay & Sign" : o.meeting_kind === "onboarding" ? "Onboarding"
    : `${SHORT[o.meeting_kind]} ${(o.attempt_number ?? 1) >= 2 ? "#2+" : "#1"}`;

  const now = Date.now();
  const logged = new Set(outs.filter((o) => o.meeting_kind !== "pay_sign").map((o) => o.event_id));
  const missing = events.filter((e) => new Date(e.starts_at).getTime() < now && e.attendance !== "rescheduled" && !logged.has(e.id));

  return {
    discShow: show("discovery"),
    discForm2: leadConv("discovery"),
    closShow: show("closing"),
    closPS: leadConv("closing"),
    psPaid: { num: paidLeads.size, den: cwLeads.size, items: closingWon.map(item) } as Rate,
    paidAct: { num: activated, den: paidDeals.size, items: outs.filter((o) => o.lead_id && allPaidInScope.has(o.lead_id) && o.meeting_kind === "closing").map(item) } as Rate,
    overall: { num: Array.from(discLeads).filter((l) => dealOf(l)?.pay_sign_status === "paid_signed").length, den: discLeads.size, items: discOuts.map(item) } as Rate,
    recovery: { num: recovered.length, den: resched.length, items: resched.map(item) } as Rate,
    discA1: attempt("discovery", true), discA2: attempt("discovery", false),
    closA1: attempt("closing", true), closA2: attempt("closing", false),
    lost, lostItems: (os: Out[]) => os.map(item), stageOf,
    missing, discoveryMeetings: events.filter((e) => e.meeting_kind === "discovery"),
  };
}

/* ─── component ─── */
export default function MeetingOutcomeAnalytics({ range, repFilter, reps, onRepSelect }: MeetingOutcomeAnalyticsProps) {
  const [events, setEvents] = useState<Ev[]>([]);
  const [outs, setOuts] = useState<Out[]>([]);
  const [leads, setLeads] = useState<Map<string, Lead>>(new Map());
  const [deals, setDeals] = useState<Map<string, Deal>>(new Map());
  const [loading, setLoading] = useState(true);
  const [allReasons, setAllReasons] = useState(false);
  const [drill, setDrill] = useState<{ title: string; items: Item[] } | null>(null);
  const [sortKey, setSortKey] = useState("discMeetings");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const db = supabase as any;
      const since = rangeStart(range);
      const evs = await pageAll<Ev>((f, t) => {
        let q = db.from("bdr_calendar_events")
          .select("id, user_id, lead_id, meeting_kind, attempt_number, starts_at, ends_at, attendance")
          .in("meeting_kind", KINDS as unknown as string[]).order("starts_at", { ascending: false });
        if (since) q = q.gte("starts_at", since);
        return q.range(f, t);
      });
      const os = await inChunks<Out>(evs.map((e) => e.id), async (c) => {
        const { data } = await db.from("bdr_meeting_outcomes").select("*").in("event_id", c);
        return data || [];
      });
      const leadIds = Array.from(new Set([...evs.map((e) => e.lead_id), ...os.map((o) => o.lead_id)].filter(Boolean) as string[]));
      const ls = await inChunks<Lead>(leadIds, async (c) => {
        const { data } = await db.from("nl_bdr_leads").select("id, business_name, user_id, crm_deal_id").in("id", c);
        return data || [];
      });
      const dealIds = Array.from(new Set(ls.map((l) => l.crm_deal_id).filter(Boolean) as string[]));
      const ds = await inChunks<Deal>(dealIds, async (c) => {
        const { data } = await db.from("crm_deals").select("id, pay_sign_status, paid_signed_at, fully_activated_at").in("id", c);
        return data || [];
      });
      if (cancelled) return;
      setEvents(evs); setOuts(os);
      setLeads(new Map(ls.map((l) => [l.id, l])));
      setDeals(new Map(ds.map((d) => [d.id, d])));
      setLoading(false);
    })().catch((e) => { console.error("[MeetingOutcomeAnalytics]", e); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range]);

  const repName = useMemo(() => new Map(reps.map((r) => [r.id, r.name])), [reps]);

  const fEvents = useMemo(() => repFilter === "all" ? events : events.filter((e) => e.user_id === repFilter), [events, repFilter]);
  const fOuts = useMemo(() => repFilter === "all" ? outs : outs.filter((o) => o.rep_user_id === repFilter), [outs, repFilter]);
  const m = useMemo(() => computeMetrics(fEvents, fOuts, leads, deals), [fEvents, fOuts, leads, deals]);

  /* stage bars */
  const STAGES = ["Discovery #1", "Discovery #2+", "Closing #1", "Closing #2+", "Pay & Sign", "Onboarding"];
  const stageRows = STAGES.map((s) => { const os = m.lost.filter((o) => m.stageOf(o) === s); return { s, os }; });

  /* reasons table */
  const RCOLS = [
    { key: "discovery", label: "Discovery" }, { key: "closing", label: "Closing" },
    { key: "pay_sign", label: "Pay & Sign" }, { key: "onboarding", label: "Onboarding" },
  ];
  const reasonsOf = (o: Out) => allReasons ? (o.lost_reasons?.length ? o.lost_reasons : o.primary_lost_reason ? [o.primary_lost_reason] : []) : (o.primary_lost_reason ? [o.primary_lost_reason] : []);
  const lostAt = (k: string | null) => k ? m.lost.filter((o) => o.meeting_kind === k) : m.lost;

  /* per-rep */
  const repRows = useMemo(() => {
    const ids = new Set<string>(reps.map((r) => r.id));
    events.forEach((e) => ids.add(e.user_id)); outs.forEach((o) => ids.add(o.rep_user_id));
    return Array.from(ids).map((id) => {
      const mm = computeMetrics(events.filter((e) => e.user_id === id), outs.filter((o) => o.rep_user_id === id), leads, deals);
      const counts = new Map<string, number>();
      mm.lost.forEach((o) => o.primary_lost_reason && counts.set(o.primary_lost_reason, (counts.get(o.primary_lost_reason) || 0) + 1));
      const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
      return {
        id, name: repName.get(id) || id.slice(0, 8), mm,
        discMeetings: mm.discoveryMeetings.length,
        discShow: pct(mm.discShow), discForm2: pct(mm.discForm2), closShow: pct(mm.closShow),
        closPS: pct(mm.closPS), psPaid: pct(mm.psPaid), overall: pct(mm.overall),
        lost: mm.lost.length, topLost: top ? reasonLabel(top[0]) : "", missing: mm.missing.length,
      };
    });
  }, [events, outs, leads, deals, reps, repName]);
  const sortedReps = useMemo(() => {
    const dir = sortAsc ? 1 : -1;
    return [...repRows].sort((a: any, b: any) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string" || typeof bv === "string") return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
      return ((av ?? -1) - (bv ?? -1)) * dir;
    });
  }, [repRows, sortKey, sortAsc]);

  const open = (title: string, items: Item[]) => setDrill({ title, items });
  const evItems = (es: Ev[]): Item[] => es.map((ev) => ({ ev }));

  const tiles: { label: string; r: Rate }[] = [
    { label: "Discovery show rate", r: m.discShow },
    { label: "Discovery → Form 2", r: m.discForm2 },
    { label: "Closing show rate", r: m.closShow },
    { label: "Closing → Pay & Sign sent", r: m.closPS },
    { label: "Pay & Sign → Paid + signed", r: m.psPaid },
    { label: "Paid + signed → Activated", r: m.paidAct },
    { label: "Overall close rate", r: m.overall },
    { label: "Reschedule recovery", r: m.recovery },
  ];

  const COLS: { key: string; label: string }[] = [
    { key: "name", label: "Salesman" }, { key: "discMeetings", label: "Discovery mtgs" },
    { key: "discShow", label: "Disc show %" }, { key: "discForm2", label: "Disc → Form 2 %" },
    { key: "closShow", label: "Closing show %" }, { key: "closPS", label: "Closing → P&S %" },
    { key: "psPaid", label: "P&S → Paid %" }, { key: "overall", label: "Overall close %" },
    { key: "lost", label: "Lost" }, { key: "topLost", label: "Top lost reason" }, { key: "missing", label: "Outcomes missing" },
  ];
  const repCellItems = (row: typeof repRows[number], key: string): Item[] | null => {
    const mm = row.mm;
    switch (key) {
      case "discMeetings": return evItems(mm.discoveryMeetings);
      case "discShow": return mm.discShow.items; case "discForm2": return mm.discForm2.items;
      case "closShow": return mm.closShow.items; case "closPS": return mm.closPS.items;
      case "psPaid": return mm.psPaid.items; case "overall": return mm.overall.items;
      case "lost": case "topLost": return mm.lostItems(mm.lost);
      case "missing": return evItems(mm.missing);
      default: return null;
    }
  };

  return (
    <Card className="border-0 bg-white/[0.03]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: NEON }} /> Meeting Outcomes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="py-10 text-center text-sm text-white/40">Loading outcomes…</div>
        ) : (
          <>
            {/* 1. Close rates */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {tiles.map((t) => (
                <button key={t.label} onClick={() => open(t.label, t.r.items)} className="text-left rounded-xl bg-white/[0.04] p-4 hover:bg-white/[0.07] transition-colors">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{t.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">{pct(t.r) == null ? "—" : `${pct(t.r)}%`}</p>
                  <p className="text-[11px] text-white/35 mt-1">{t.r.den ? `${t.r.num} of ${t.r.den}` : "no meetings yet"}</p>
                </button>
              ))}
              {([["Discovery", m.discA1, m.discA2], ["Closing", m.closA1, m.closA2]] as const).map(([k, a1, a2]) => (
                <div key={k} className="rounded-xl bg-white/[0.04] p-4 col-span-2 sm:col-span-2">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{k} win rate by attempt</p>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    {([["Attempt 1", a1], ["Attempt 2+", a2]] as const).map(([lbl, r]) => (
                      <button key={lbl} onClick={() => open(`${k} win rate — ${lbl}`, r.items)} className="text-left rounded-lg hover:bg-white/[0.05] p-1">
                        <p className="text-[11px] text-white/50">{lbl}</p>
                        <p className="text-lg font-bold text-white">{pct(r) == null ? "—" : `${pct(r)}%`}</p>
                        <p className="text-[11px] text-white/35">{r.den ? `${r.num} of ${r.den}` : "no meetings yet"}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Where lost */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2">Where leads are lost</p>
              {m.lost.length === 0 ? <p className="text-xs text-white/35">No lost outcomes yet.</p> : (
                <div className="space-y-1.5">
                  {stageRows.map(({ s, os }) => {
                    const p = Math.round((os.length / m.lost.length) * 100);
                    return (
                      <button key={s} onClick={() => open(`Lost at ${s}`, m.lostItems(os))} className="w-full text-left group">
                        <div className="flex justify-between text-xs text-white/70"><span>{s}</span><span className="text-white/50">{os.length} · {p}%</span></div>
                        <div className="h-2 rounded bg-white/[0.06] mt-1 overflow-hidden">
                          <div className="h-full rounded group-hover:brightness-125" style={{ width: `${p}%`, background: NEON }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Why lost */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Why leads are lost</p>
                <div className="flex rounded-md border border-white/10 overflow-hidden text-[11px]">
                  {[["Main reason only", false], ["All reasons mentioned", true]].map(([lbl, v]) => (
                    <button key={String(lbl)} onClick={() => setAllReasons(v as boolean)}
                      className={`px-2.5 py-1 ${allReasons === v ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/[0.05]"}`}>{lbl as string}</button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                <table className="w-full text-xs min-w-[560px]">
                  <thead><tr className="text-white/40 text-left">
                    <th className="p-2 font-medium">Reason</th>
                    {RCOLS.map((c) => <th key={c.key} className="p-2 font-medium text-right">{c.label}</th>)}
                    <th className="p-2 font-medium text-right">Total</th>
                  </tr></thead>
                  <tbody>
                    {(Object.keys(LOST_REASONS) as LostReason[]).map((rk) => {
                      const cells = [...RCOLS.map((c) => c.key), null].map((k) => {
                        const base = lostAt(k);
                        const hits = base.filter((o) => reasonsOf(o).includes(rk));
                        return { k, base, hits };
                      });
                      const zero = cells[cells.length - 1].hits.length === 0;
                      return (
                        <tr key={rk} className={`border-t border-white/[0.04] ${zero ? "opacity-35" : ""}`}>
                          <td className="p-2 text-white/80">{LOST_REASONS[rk]}</td>
                          {cells.map(({ k, base, hits }) => (
                            <td key={k ?? "total"} className="p-2 text-right">
                              {hits.length ? (
                                <button className="text-white/80 hover:underline"
                                  onClick={() => open(`${LOST_REASONS[rk]} — ${k ? SHORT[k] : "All stages"}`, m.lostItems(hits))}>
                                  {hits.length} <span className="text-white/40">({Math.round((hits.length / base.length) * 100)}%)</span>
                                </button>
                              ) : <span className="text-white/30">0</span>}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. By salesman */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2">By salesman</p>
              <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
                <table className="w-full text-xs min-w-[900px]">
                  <thead><tr className="text-white/40 text-left">
                    {COLS.map((c) => (
                      <th key={c.key} className="p-2 font-medium cursor-pointer select-none whitespace-nowrap hover:text-white/70"
                        onClick={() => { if (sortKey === c.key) setSortAsc(!sortAsc); else { setSortKey(c.key); setSortAsc(false); } }}>
                        {c.label}{sortKey === c.key ? (sortAsc ? " ▲" : " ▼") : ""}
                      </th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {sortedReps.map((row) => (
                      <tr key={row.id} className={`border-t border-white/[0.04] ${repFilter === row.id ? "bg-white/[0.05]" : ""}`}>
                        {COLS.map((c) => {
                          const v = (row as any)[c.key];
                          if (c.key === "name") return (
                            <td key={c.key} className="p-2"><button className="text-white hover:underline" onClick={() => onRepSelect(row.id)}>{v}</button></td>
                          );
                          const isPct = ["discShow", "discForm2", "closShow", "closPS", "psPaid", "overall"].includes(c.key);
                          const display = isPct ? (v == null ? "—" : `${v}%`) : (v === "" ? "—" : v);
                          const items = repCellItems(row, c.key);
                          const red = c.key === "missing" && v > 0;
                          return (
                            <td key={c.key} className={`p-2 whitespace-nowrap ${red ? "text-red-400 font-semibold" : "text-white/75"}`}>
                              {items && items.length ? (
                                <button className="hover:underline" onClick={() => open(`${row.name} — ${c.label}`, items)}>{display}</button>
                              ) : display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* 5. Drill-down */}
      <Sheet open={!!drill} onOpenChange={(o) => { if (!o) setDrill(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{drill?.title}</SheetTitle></SheetHeader>
          <p className="text-xs text-muted-foreground mt-1">{drill?.items.length ?? 0} meeting{drill?.items.length === 1 ? "" : "s"}</p>
          <div className="mt-4 space-y-2">
            {drill?.items.length === 0 && <p className="text-sm text-muted-foreground">No meetings here.</p>}
            {drill?.items.map(({ ev, out }, i) => {
              const leadId = out?.lead_id ?? ev?.lead_id ?? null;
              const lead = leadId ? leads.get(leadId) : undefined;
              const repId = out?.rep_user_id ?? ev?.user_id;
              const kind = out?.meeting_kind ?? ev?.meeting_kind ?? "";
              const att = out?.attendance ?? ev?.attendance;
              const reasons = out?.result === "lost"
                ? (out.lost_reasons?.length ? out.lost_reasons : out.primary_lost_reason ? [out.primary_lost_reason] : []).map(reasonLabel)
                : out?.reschedule_reason ? [RESCHEDULE_REASONS[out.reschedule_reason as keyof typeof RESCHEDULE_REASONS] || out.reschedule_reason] : [];
              return (
                <div key={(out?.id ?? ev?.id ?? "") + i} className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-foreground truncate">{lead?.business_name || "Unknown lead"}</span>
                    <span className="text-muted-foreground whitespace-nowrap">{ev ? new Date(ev.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : out ? new Date(out.logged_at).toLocaleDateString() : ""}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {(repId && repName.get(repId)) || "Unknown rep"} · {kindLabel(kind, out?.attempt_number ?? ev?.attempt_number)}
                    {kind && MEETING_KINDS[kind as keyof typeof MEETING_KINDS] ? "" : ""}
                  </div>
                  <div className="text-muted-foreground">
                    Attendance: {att ? att.replace(/_/g, " ") : "—"} · Result: {out ? out.result : "no outcome logged"}
                  </div>
                  {reasons.length > 0 && <div className="text-foreground/80">Reasons: {reasons.join(", ")}</div>}
                  {out?.notes && <div className="text-foreground/70 whitespace-pre-wrap">Note: {out.notes}</div>}
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
