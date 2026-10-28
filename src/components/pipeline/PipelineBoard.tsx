import { useEffect, useState } from "react";
import { Search, CalendarClock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CustomerProfilePanel from "@/components/CustomerProfilePanel";
import { fmtMoney } from "@/lib/pipelineRevenue";

/**
 * The pipeline as a board: every lead in Cold / Warm / Hot / Won columns
 * (Expired behind a toggle). `scope="team"` = all salesmen (admin, with an
 * optional salesman filter); `scope="mine"` = the signed-in salesman.
 * Counts are exact; each column lists the 40 most recently active leads
 * (search to find any other). Click a lead → Customer profile.
 */
type StageKey = "cold" | "warm" | "hot" | "won" | "expired_no_close_prep";
const COLUMNS: { key: StageKey; label: string; color: string; hint: string }[] = [
  { key: "cold", label: "Cold", color: "hsl(211,90%,60%)", hint: "No Form 1 yet" },
  { key: "warm", label: "Warm", color: "hsl(38,92%,55%)", hint: "Form 1 booked" },
  { key: "hot", label: "Hot", color: "hsl(14,90%,58%)", hint: "Form 2 done" },
  { key: "won", label: "Won", color: "hsl(142,72%,42%)", hint: "Paid + signed" },
];
const EXPIRED = { key: "expired_no_close_prep" as StageKey, label: "Expired — No Form 2", color: "hsl(215,12%,55%)", hint: "Form 1 but no Form 2 in time" };
const PER_COLUMN = 40;

interface LeadCard {
  id: string; user_id: string; business_name: string; owner_name: string | null;
  pipeline_stage: string | null; updated_at: string; estimated_annual_value: number | null; unattended_since: string | null;
}

export default function PipelineBoard({ scope, repUserId }: { scope: "team" | "mine"; repUserId?: string }) {
  const [cols, setCols] = useState<Record<string, { rows: LeadCard[]; count: number }>>({});
  const [nextMeeting, setNextMeeting] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [showExpired, setShowExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openLead, setOpenLead] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 300); return () => clearTimeout(t); }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const db = supabase as any;
      let uid: string | null = repUserId || null;
      if (scope === "mine") {
        const { data: { user } } = await supabase.auth.getUser();
        uid = user?.id || null;
        if (!uid) { setLoading(false); return; }
      }
      const stages = [...COLUMNS, EXPIRED].map((c) => c.key);
      const results = await Promise.all(stages.map((st) => {
        let q = db.from("nl_bdr_leads")
          .select("id, user_id, business_name, owner_name, pipeline_stage, updated_at, estimated_annual_value, unattended_since", { count: "exact" })
          .order("updated_at", { ascending: false }).limit(PER_COLUMN);
        q = st === "cold" ? q.or("pipeline_stage.is.null,pipeline_stage.eq.cold") : q.eq("pipeline_stage", st);
        if (uid) q = q.eq("user_id", uid);
        if (query) q = q.ilike("business_name", `%${query.replace(/[%_]/g, "")}%`);
        return q;
      }));
      if (cancelled) return;
      const next: Record<string, { rows: LeadCard[]; count: number }> = {};
      stages.forEach((st, i) => { next[st] = { rows: results[i].data || [], count: results[i].count ?? 0 }; });
      setCols(next);

      // Next upcoming meeting per visible lead
      const ids = stages.flatMap((st) => next[st].rows.map((r) => r.id)).filter((_, i) => i < 400);
      if (ids.length) {
        const { data: evts } = await db.from("bdr_calendar_events")
          .select("lead_id, starts_at").in("lead_id", ids).gt("starts_at", new Date().toISOString())
          .or("attendance.is.null,attendance.not.in.(rescheduled,cancelled)")
          .order("starts_at", { ascending: true }).limit(1000);
        const m: Record<string, string> = {};
        (evts || []).forEach((e: any) => { if (!m[e.lead_id]) m[e.lead_id] = e.starts_at; });
        if (!cancelled) setNextMeeting(m);
      }
      if (scope === "team") {
        const uids = Array.from(new Set(stages.flatMap((st) => next[st].rows.map((r) => r.user_id))));
        if (uids.length) {
          const { data: emps } = await db.from("employee_profiles").select("user_id, full_name").in("user_id", uids);
          if (!cancelled) setNames(Object.fromEntries((emps || []).map((e: any) => [e.user_id, e.full_name])));
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [scope, repUserId, query, reload]);

  const columns = showExpired ? [...COLUMNS, EXPIRED] : COLUMNS;
  const fmtWhen = (iso: string) => new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search business…"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none" />
        </div>
        <button onClick={() => setShowExpired((v) => !v)}
          className={`text-xs px-3 py-1.5 rounded-lg border ${showExpired ? "border-white/30 bg-white/10" : "border-white/10 text-muted-foreground"}`}>
          {showExpired ? "Hide" : "Show"} Expired ({cols[EXPIRED.key]?.count ?? 0})
        </button>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className={`grid gap-3 ${showExpired ? "md:grid-cols-3 xl:grid-cols-5" : "md:grid-cols-2 xl:grid-cols-4"}`}>
        {columns.map((c) => {
          const col = cols[c.key] || { rows: [], count: 0 };
          return (
            <div key={c.key} className="rounded-xl border border-white/10 bg-white/[0.02] flex flex-col min-h-[200px]">
              <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between" style={{ boxShadow: `inset 0 2px 0 ${c.color}` }}>
                <div>
                  <div className="text-xs font-semibold" style={{ color: c.color }}>{c.label}</div>
                  <div className="text-[10px] text-muted-foreground">{c.hint}</div>
                </div>
                <span className="text-sm font-bold tabular-nums">{col.count}</span>
              </div>
              <div className="p-2 space-y-1.5 overflow-y-auto" style={{ maxHeight: "62vh" }}>
                {col.rows.length === 0 && !loading && <p className="text-[11px] text-muted-foreground text-center py-6">No leads</p>}
                {col.rows.map((l) => (
                  <button key={l.id} onClick={() => setOpenLead(l.id)}
                    className="w-full text-left rounded-lg px-2.5 py-2 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-colors">
                    <div className="text-xs font-semibold truncate">{l.business_name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {[l.owner_name, scope === "team" ? names[l.user_id] : null].filter(Boolean).join(" · ") || "—"}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {nextMeeting[l.id] && (
                        <span className="text-[10px] inline-flex items-center gap-1 text-sky-300"><CalendarClock className="h-3 w-3" />{fmtWhen(nextMeeting[l.id])}</span>
                      )}
                      {l.unattended_since && <span className="text-[10px] text-amber-300">No-show timer</span>}
                      {c.key !== "cold" && l.estimated_annual_value ? <span className="text-[10px] text-muted-foreground tabular-nums">{fmtMoney(Number(l.estimated_annual_value))}</span> : null}
                    </div>
                  </button>
                ))}
                {col.count > col.rows.length && (
                  <p className="text-[10px] text-muted-foreground text-center py-1">+{col.count - col.rows.length} more — search to find them</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CustomerProfilePanel open={!!openLead} onOpenChange={(o) => { if (!o) { setOpenLead(null); setReload((n) => n + 1); } }} leadId={openLead} />
    </div>
  );
}
