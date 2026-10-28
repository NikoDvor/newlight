import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, CalendarClock, Loader2, AlertTriangle, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CustomerProfilePanel from "@/components/CustomerProfilePanel";
import { fmtMoney } from "@/lib/pipelineRevenue";
import { computeDiscovery, type DiscoveryInputs } from "@/lib/discoveryNumbers";

/**
 * The pipeline as a board. Cold is the call list, so it's a single count tile
 * (→ Dialer); the board itself is Warm / Hot / Won (Expired behind a toggle).
 * Every card says what needs doing — flags: outcome overdue, no-show timer,
 * Pay & Sign waiting, no next meeting — and flagged deals sort to the top.
 * Money on a card: Warm = their gap to goal (discovery numbers), Hot = the
 * Form 2 price, Won = the Form 2 price they paid.
 * `scope="team"` = all salesmen (admin, optional filter); `"mine"` = the salesman.
 */
type StageKey = "cold" | "warm" | "hot" | "won" | "expired_no_close_prep";
const BOARD: { key: StageKey; label: string; color: string; hint: string }[] = [
  { key: "warm", label: "Warm", color: "hsl(38,92%,55%)", hint: "Form 1 booked" },
  { key: "hot", label: "Hot", color: "hsl(14,90%,58%)", hint: "Form 2 done" },
  { key: "won", label: "Won", color: "hsl(142,72%,42%)", hint: "Paid + signed" },
];
const EXPIRED = { key: "expired_no_close_prep" as StageKey, label: "Expired — No Form 2", color: "hsl(215,12%,55%)", hint: "Form 1 but no Form 2 in time" };
const COLD = { key: "cold" as StageKey, label: "Cold", color: "hsl(211,90%,60%)", hint: "No Form 1 yet" };
const PER_COLUMN = 150;
const TRACKED = ["discovery", "closing", "onboarding", "check_in"];

interface LeadCard {
  id: string; user_id: string; business_name: string; owner_name: string | null;
  pipeline_stage: string | null; updated_at: string; unattended_since: string | null; crm_deal_id: string | null;
}
interface Flag { label: string; tone: "red" | "amber" }

export default function PipelineBoard({ scope, repUserId }: { scope: "team" | "mine"; repUserId?: string }) {
  const [cols, setCols] = useState<Record<string, { rows: LeadCard[]; count: number }>>({});
  const [nextMeeting, setNextMeeting] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, Flag[]>>({});
  const [money, setMoney] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [showExpired, setShowExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openLead, setOpenLead] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  // Phone view: colored stage tiles; tap one to open its leads as a list.
  const [picked, setPicked] = useState<StageKey>("warm");

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
      const stages: StageKey[] = ["cold", "warm", "hot", "won", "expired_no_close_prep"];
      const results = await Promise.all(stages.map((st) => {
        // Cold: count only, unless searching.
        const coldCountOnly = st === "cold" && !query;
        let q = db.from("nl_bdr_leads")
          .select("id, user_id, business_name, owner_name, pipeline_stage, updated_at, unattended_since, crm_deal_id", { count: "exact", head: coldCountOnly })
          .order("updated_at", { ascending: false }).limit(st === "cold" ? 40 : PER_COLUMN);
        q = st === "cold" ? q.or("pipeline_stage.is.null,pipeline_stage.eq.cold") : q.eq("pipeline_stage", st);
        if (uid) q = q.eq("user_id", uid);
        if (query) q = q.ilike("business_name", `%${query.replace(/[%_]/g, "")}%`);
        return q;
      }));
      if (cancelled) return;
      const next: Record<string, { rows: LeadCard[]; count: number }> = {};
      stages.forEach((st, i) => { next[st] = { rows: results[i].data || [], count: results[i].count ?? 0 }; });

      const active = (["warm", "hot", "won", "expired_no_close_prep"] as StageKey[]).flatMap((st) => next[st].rows);
      const ids = [...active, ...next.cold.rows].map((r) => r.id).slice(0, 600);
      const nm: Record<string, string> = {};
      const fl: Record<string, Flag[]> = {};
      const mo: Record<string, string> = {};
      if (ids.length) {
        const nowIso = new Date().toISOString();
        const dealIds = active.map((r) => r.crm_deal_id).filter(Boolean) as string[];
        const [{ data: evts }, { data: outs }, { data: deals }, { data: disc }] = await Promise.all([
          db.from("bdr_calendar_events").select("id, lead_id, starts_at, meeting_kind")
            .in("lead_id", ids).in("meeting_kind", TRACKED)
            .or("attendance.is.null,attendance.not.in.(rescheduled,cancelled)").limit(3000),
          db.from("bdr_meeting_outcomes").select("event_id, lead_id, meeting_kind, result, logged_at").in("lead_id", ids).limit(3000),
          dealIds.length
            ? db.from("crm_deals").select("id, pricing_model, initial_fee, recurring_fee, commission_rate, pay_sign_status, pay_sign_sent_at").in("id", dealIds)
            : Promise.resolve({ data: [] }),
          db.from("nl_discovery_numbers").select("*").in("lead_id", ids),
        ]);
        const logged = new Set((outs || []).filter((o: any) => o.meeting_kind !== "pay_sign").map((o: any) => o.event_id));
        const overdue = new Set<string>();
        (evts || []).forEach((e: any) => {
          if (e.starts_at > nowIso) { if (!nm[e.lead_id] || e.starts_at < nm[e.lead_id]) nm[e.lead_id] = e.starts_at; }
          else if (!logged.has(e.id)) overdue.add(e.lead_id);
        });
        const dealMap = new Map((deals || []).map((d: any) => [d.id, d]));
        const closingWon = new Map<string, string>();
        (outs || []).forEach((o: any) => { if (o.meeting_kind === "closing" && o.result === "won") closingWon.set(o.lead_id, o.logged_at); });
        const discMap = new Map((disc || []).map((d: any) => [d.lead_id, d]));

        for (const l of [...active, ...next.cold.rows]) {
          const f: Flag[] = [];
          const st = l.pipeline_stage || "cold";
          if (overdue.has(l.id)) f.push({ label: "Outcome overdue", tone: "red" });
          if (l.unattended_since) f.push({ label: "No-show timer", tone: "red" });
          const deal: any = l.crm_deal_id ? dealMap.get(l.crm_deal_id) : null;
          if (st === "hot" && (deal?.pay_sign_sent_at || closingWon.has(l.id)) && deal?.pay_sign_status !== "paid_signed") {
            // Counts from when the Pay & Sign link was emailed (falls back to the closing outcome).
            const since = deal?.pay_sign_sent_at || closingWon.get(l.id)!;
            const days = Math.floor((Date.now() - new Date(since).getTime()) / 86400_000);
            f.push({ label: `Pay & Sign waiting ${days}d`, tone: days >= 7 ? "red" : "amber" });
          }
          if ((st === "warm" || st === "hot") && !nm[l.id] && !closingWon.has(l.id) && !overdue.has(l.id)) {
            f.push({ label: "No next meeting", tone: "amber" });
          }
          if (f.length) fl[l.id] = f;

          if (st === "warm") {
            const d: any = discMap.get(l.id);
            if (d) {
              const n = (v: any) => (v == null ? null : Number(v));
              const r = computeDiscovery({
                firm_type: d.firm_type, goal_revenue: n(d.goal_revenue), goal_revenue_period: d.goal_revenue_period,
                goal_clients: n(d.goal_clients), current_revenue: n(d.current_revenue), current_revenue_period: d.current_revenue_period,
                current_clients: n(d.current_clients), new_leads: n(d.new_leads), new_leads_period: d.new_leads_period,
                leads_per_client: n(d.leads_per_client),
              } as DiscoveryInputs);
              if (r.gapRevenue != null) mo[l.id] = `Gap ${fmtMoney(r.gapRevenue)}/yr`;
            }
          } else if ((st === "hot" || st === "won") && deal) {
            const init = deal.initial_fee != null ? fmtMoney(Number(deal.initial_fee)) : null;
            const tail = deal.pricing_model === "commission"
              ? (deal.commission_rate != null ? `${Number(deal.commission_rate)}% commission` : null)
              : (deal.recurring_fee != null ? `${fmtMoney(Number(deal.recurring_fee))}/mo` : null);
            const txt = [init, tail].filter(Boolean).join(" + ");
            if (txt) mo[l.id] = txt;
          }
        }
        // Flagged first (red before amber), then most recently active.
        const weight = (id: string) => (fl[id]?.some((x) => x.tone === "red") ? 2 : fl[id] ? 1 : 0);
        for (const st of ["warm", "hot", "won", "expired_no_close_prep"] as StageKey[]) {
          next[st].rows = [...next[st].rows].sort((a, b) => weight(b.id) - weight(a.id));
        }
      }
      if (cancelled) return;
      setCols(next); setNextMeeting(nm); setFlags(fl); setMoney(mo);

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

  const columns = [...(query ? [COLD] : []), ...BOARD, ...(showExpired ? [EXPIRED] : [])];
  const fmtWhen = (iso: string) => new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const flaggedCount = Object.keys(flags).length;
  const renderCard = (l: LeadCard) => {
                  const f = flags[l.id] || [];
                  return (
                    <button key={l.id} onClick={() => setOpenLead(l.id)}
                      className={`w-full text-left rounded-lg px-2.5 py-2 bg-white/[0.03] hover:bg-white/[0.07] border transition-colors ${f.some((x) => x.tone === "red") ? "border-red-500/40" : f.length ? "border-amber-400/30" : "border-white/[0.06]"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-semibold truncate">{l.business_name}</div>
                        {money[l.id] && <span className="text-[10px] tabular-nums text-white/70 shrink-0">{money[l.id]}</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {[l.owner_name, scope === "team" ? names[l.user_id] : null].filter(Boolean).join(" · ") || "—"}
                      </div>
                      {(nextMeeting[l.id] || f.length > 0) && (
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {nextMeeting[l.id] && (
                            <span className="text-[10px] inline-flex items-center gap-1 text-sky-300"><CalendarClock className="h-3 w-3" />{fmtWhen(nextMeeting[l.id])}</span>
                          )}
                          {f.map((x) => (
                            <span key={x.label} className={`text-[10px] px-1.5 py-0.5 rounded ${x.tone === "red" ? "bg-red-500/15 text-red-300" : "bg-amber-400/15 text-amber-300"}`}>{x.label}</span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
  };
  const flaggedIn = (st: StageKey) => (cols[st]?.rows || []).filter((r) => flags[r.id]).length;

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
        {flaggedCount > 0 && (
          <span className="text-xs inline-flex items-center gap-1 text-amber-300"><AlertTriangle className="h-3.5 w-3.5" />{flaggedCount} need attention</span>
        )}
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Cold = the call list: a count, not a column */}
      {!query && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 flex items-center justify-between gap-3"
          style={{ boxShadow: `inset 3px 0 0 ${COLD.color}` }}>
          <div>
            <div className="text-xs font-semibold" style={{ color: COLD.color }}>Cold · to call</div>
            <div className="text-[11px] text-muted-foreground">Leads with no Form 1 yet — they live in the Dialer, not on the board.</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tabular-nums">{(cols.cold?.count ?? 0).toLocaleString()}</span>
            {scope === "mine" ? (
              <Link to="/employee/dialer" className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[hsla(211,96%,60%,.18)] hover:bg-[hsla(211,96%,60%,.28)]">
                <Phone className="h-3.5 w-3.5" /> Dialer
              </Link>
            ) : (
              <Link to="/admin/territories" className="text-xs text-primary hover:underline">Territories →</Link>
            )}
          </div>
        </div>
      )}

      {/* Phone: colored stage tiles — tap to open that stage's leads as a list */}
      <div className="md:hidden space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {columns.map((c) => {
            const on = picked === c.key;
            const f = flaggedIn(c.key);
            return (
              <button key={c.key} onClick={() => setPicked(c.key)}
                className="rounded-xl px-3 py-2.5 text-left border transition-colors"
                style={{ borderColor: on ? c.color : "hsla(0,0%,100%,.1)", background: on ? `color-mix(in srgb, ${c.color} 16%, transparent)` : "hsla(0,0%,100%,.03)" }}>
                <div className="text-xs font-semibold" style={{ color: c.color }}>{c.label}</div>
                <div className="text-2xl font-bold tabular-nums leading-tight">{cols[c.key]?.count ?? 0}</div>
                <div className="text-[10px] text-muted-foreground">{f ? `${f} need attention` : c.hint}</div>
              </button>
            );
          })}
        </div>
        {(() => {
          const c = columns.find((x) => x.key === picked) || columns[0];
          const col = cols[c.key] || { rows: [], count: 0 };
          return (
            <div className="rounded-xl border bg-white/[0.02] p-2 space-y-1.5" style={{ borderColor: c.color }}>
              <div className="px-1 pb-1 text-xs font-semibold" style={{ color: c.color }}>{c.label} · {col.count}</div>
              {col.rows.length === 0 && !loading && <p className="text-[11px] text-muted-foreground text-center py-6">No leads</p>}
              {col.rows.map(renderCard)}
              {col.count > col.rows.length && (
                <p className="text-[10px] text-muted-foreground text-center py-1">+{col.count - col.rows.length} more — search to find them</p>
              )}
            </div>
          );
        })()}
      </div>

      <div className={`hidden md:grid gap-3 ${columns.length >= 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3"}`}>
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
                {col.rows.map(renderCard)}
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
