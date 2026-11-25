import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { bdrLeadStage, isLiveMeeting } from "@/lib/bdrPipelineRevenue";
import type { CanonStage } from "@/lib/pipelineRevenue";
import AdminTerritories from "@/pages/admin/AdminTerritories";
import AdminLeadImport from "@/pages/admin/AdminLeadImport";

const TABS = [
  { key: "organize", label: "Organize", url: "/admin/lead-organization" },
  { key: "territories", label: "Territories", url: "/admin/lead-organization/territories" },
  { key: "import", label: "Import", url: "/admin/lead-organization/import" },
];
const STAGES: CanonStage[] = ["cold", "warm", "hot", "won", "lost"];
const STAGE_NAME: Record<string, string> = { cold: "Cold", warm: "Warm", hot: "Hot", won: "Won", lost: "Lost" };
const PAGE = 100;

type Row = {
  id: string; user_id: string | null; business_name: string | null; city: string | null; state: string | null;
  list_name: string | null; called: boolean | null; closed_out_at: string | null; stage: CanonStage; next?: string | null;
  [k: string]: any;
};

export default function AdminLeadOrganization() {
  const { tab = "organize" } = useParams();
  if (!TABS.some(t => t.key === tab)) return <Navigate to="/admin/lead-organization" replace />;
  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map(t => (
          <NavLink key={t.key} to={t.url} end
            className={() => `px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${t.key === tab ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </NavLink>
        ))}
      </div>
      {tab === "organize" && <Organize />}
      {tab === "territories" && <AdminTerritories />}
      {tab === "import" && <AdminLeadImport />}
    </div>
  );
}

function Organize() {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [reps, setReps] = useState<{ id: string; name: string }[]>([]);
  const [pool, setPool] = useState(0);
  const [view, setView] = useState<"auto" | "table" | "cards">("auto");
  const [fRep, setFRep] = useState("all");
  const [fStage, setFStage] = useState("all");
  const [fUp, setFUp] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const db = supabase as any;
    const leads: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await db.from("nl_bdr_leads")
        .select("id,user_id,business_name,city,state,list_name,called,closed_out_at,pipeline_stage,status,meeting_booked,crm_deal_id,created_at,updated_at,objection_category,estimated_annual_value")
        .order("created_at", { ascending: false }).range(from, from + 999);
      if (!data) break;
      leads.push(...data);
      if (data.length < 1000) break;
    }
    const [{ data: ev }, { data: prof }, { data: roles }, { data: st }] = await Promise.all([
      db.from("bdr_calendar_events").select("id,lead_id,user_id,source,attendance,starts_at,meeting_kind"),
      db.from("employee_profiles").select("user_id,full_name,email"),
      db.from("user_roles").select("user_id,role"),
      db.rpc("nl_pool_stats"),
    ]);
    const live = ((ev as any[]) || []).filter(isLiveMeeting);
    const dealIds = Array.from(new Set(leads.map(l => l.crm_deal_id).filter(Boolean)));
    let deals: any[] = [];
    if (dealIds.length) {
      const { data: d } = await db.from("crm_deals")
        .select("id,deal_value,initial_fee,recurring_fee,pricing_model,pay_sign_status,pipeline_stage,close_prep_completed_at").in("id", dealIds);
      deals = d || [];
    }
    const byLead = new Map<string, any[]>();
    live.forEach(e => { if (e.lead_id) byLead.set(e.lead_id, [...(byLead.get(e.lead_id) || []), e]); });
    const dealMap = new Map(deals.map(d => [d.id, d]));
    const now = Date.now();
    setRows(leads.map(l => {
      const evs = byLead.get(l.id) || [];
      const upcoming = evs.map(e => e.starts_at).filter((s: string) => s && new Date(s).getTime() >= now).sort()[0] ?? null;
      return { ...l, stage: bdrLeadStage(l, l.crm_deal_id ? dealMap.get(l.crm_deal_id) : undefined, evs), next: upcoming };
    }));
    const salesIds = new Set(((roles as any[]) || []).filter(r => ["marketing_staff", "admin", "operator"].includes(r.role)).map(r => r.user_id));
    setReps(((prof as any[]) || []).filter(p => p.user_id && (salesIds.has(p.user_id) || leads.some(l => l.user_id === p.user_id)))
      .map(p => ({ id: p.user_id, name: p.full_name || p.email || "Unnamed" })).sort((a, b) => a.name.localeCompare(b.name)));
    setPool(((st as any[]) || []).reduce((s, r) => s + (r.available || 0), 0));
    setSel(new Set());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const repName = useMemo(() => Object.fromEntries(reps.map(r => [r.id, r.name])), [reps]);
  const open = useMemo(() => rows.filter(r => !r.closed_out_at), [rows]);

  // Big visual: reps × stage
  const grid = useMemo(() => {
    const m = new Map<string, Record<string, number> & { upcoming: number; total: number }>();
    open.forEach(r => {
      const k = r.user_id || "none";
      const g = m.get(k) || { cold: 0, warm: 0, hot: 0, won: 0, lost: 0, upcoming: 0, total: 0 } as any;
      g[r.stage]++; g.total++; if (r.next) g.upcoming++;
      m.set(k, g);
    });
    return m;
  }, [open]);
  const gridMax = useMemo(() => Math.max(1, ...Array.from(grid.values()).flatMap(g => STAGES.map(s => g[s]))), [grid]);
  const gridRepIds = useMemo(() => Array.from(grid.keys()).sort((a, b) => (grid.get(b)!.total - grid.get(a)!.total)), [grid]);

  const list = useMemo(() => open.filter(r =>
    (fRep === "all" || (fRep === "none" ? !r.user_id : r.user_id === fRep)) &&
    (fStage === "all" || r.stage === fStage) && (!fUp || r.next) &&
    (!q || `${r.business_name} ${r.city} ${r.state} ${r.list_name}`.toLowerCase().includes(q.toLowerCase()))
  ), [open, fRep, fStage, fUp, q]);
  useEffect(() => setPage(0), [fRep, fStage, fUp, q]);
  const shown = list.slice(page * PAGE, page * PAGE + PAGE);
  const asCards = view === "cards" || (view === "auto" && isMobile);

  const toggle = (id: string) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allShown = shown.length > 0 && shown.every(r => sel.has(r.id));
  const ids = Array.from(sel);

  const act = async (fn: string, args: any, ok: (n: number) => string) => {
    if (!ids.length) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc(fn, { _lead_ids: ids, ...args });
    setBusy(false);
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: ok(Number(data) || 0) });
    load();
  };
  const cell = (n: number, s: string, onClick: () => void) => (
    <button onClick={onClick} disabled={!n}
      className="h-12 w-full rounded text-sm font-medium tabular-nums transition hover:ring-2 hover:ring-primary disabled:opacity-40"
      style={{ background: n ? `hsl(var(--primary) / ${0.12 + 0.7 * (n / gridMax)})` : "hsl(var(--muted))", color: n / gridMax > 0.5 ? "hsl(var(--primary-foreground))" : undefined }}>
      {n}
    </button>
  );

  if (loading) return <div className="text-sm text-muted-foreground p-6">Loading every lead…</div>;

  return (
    <div className="space-y-4">
      {/* BIG VISUAL */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <div>
            <h2 className="font-semibold">Every open lead, by rep and stage</h2>
            <p className="text-xs text-muted-foreground">{open.length.toLocaleString()} open leads · tap any box to filter the list below.</p>
          </div>
          <div className="text-xs text-muted-foreground">Unassigned in the big pool: <b className="text-foreground">{pool.toLocaleString()}</b></div>
        </div>
        <div className="overflow-x-auto">
          <div className="grid gap-1.5 min-w-[560px] items-center" style={{ gridTemplateColumns: "minmax(110px,1.4fr) repeat(5, minmax(60px,1fr)) minmax(70px,1fr) 64px" }}>
            <div />
            {STAGES.map(s => <div key={s} className="text-xs text-center text-muted-foreground">{STAGE_NAME[s]}</div>)}
            <div className="text-xs text-center text-muted-foreground">Meeting soon</div>
            <div className="text-xs text-right text-muted-foreground">Total</div>
            {gridRepIds.map(id => {
              const g = grid.get(id)!;
              return (
                <div key={id} className="contents">
                  <button className="text-sm text-left truncate hover:underline" onClick={() => { setFRep(id); setFStage("all"); setFUp(false); }}>
                    {id === "none" ? "Unassigned" : repName[id] || "Unknown"}
                  </button>
                  {STAGES.map(s => <div key={s}>{cell(g[s], s, () => { setFRep(id); setFStage(s); setFUp(false); })}</div>)}
                  <div>{cell(g.upcoming, "up", () => { setFRep(id); setFStage("all"); setFUp(true); })}</div>
                  <div className="text-sm text-right tabular-nums font-medium">{g.total}</div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">Warm and Hot come from booked meetings automatically. Won comes from a paid and signed deal.</p>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search business, city, list…" value={q} onChange={e => setQ(e.target.value)} className="w-56 h-9" />
        <Select value={fRep} onValueChange={setFRep}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Rep" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reps</SelectItem><SelectItem value="none">Unassigned</SelectItem>
            {reps.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fStage} onValueChange={setFStage}>
          <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_NAME[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 text-sm"><Checkbox checked={fUp} onCheckedChange={v => setFUp(!!v)} />Meeting upcoming</label>
        {(fRep !== "all" || fStage !== "all" || fUp || q) && (
          <Button variant="ghost" size="sm" onClick={() => { setFRep("all"); setFStage("all"); setFUp(false); setQ(""); }}>Clear</Button>
        )}
        <div className="ml-auto flex gap-1">
          {(["auto", "table", "cards"] as const).map(v => (
            <Button key={v} size="sm" variant={view === v ? "default" : "outline"} onClick={() => setView(v)} className="h-8 capitalize">{v}</Button>
          ))}
        </div>
      </div>

      {/* BULK BAR */}
      {sel.size > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-primary bg-card p-2 shadow">
          <b className="text-sm px-1">{sel.size} selected</b>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Move to rep…" /></SelectTrigger>
            <SelectContent>{reps.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" disabled={!target || busy} onClick={() => act("admin_reassign_leads", { _new_user: target }, n => `Moved ${n} lead${n === 1 ? "" : "s"} to ${repName[target]}`)}>Move</Button>
          <span className="text-muted-foreground text-xs mx-1">|</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act("admin_set_lead_stage", { _stage: "cold" }, n => `${n} set to Cold`)}>Set Cold</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act("admin_set_lead_stage", { _stage: "lost" }, n => `${n} set to Lost`)}>Set Lost</Button>
          <Button size="sm" variant="ghost" onClick={() => setSel(new Set())}>Deselect</Button>
        </div>
      )}

      {/* LIST */}
      <div className="text-xs text-muted-foreground">
        {list.length.toLocaleString()} leads
        {list.length > shown.length && ` · showing ${page * PAGE + 1}–${page * PAGE + shown.length}`}
        {list.length > 0 && (
          <button className="ml-3 underline" onClick={() => setSel(new Set(list.map(r => r.id)))}>Select all {list.length.toLocaleString()}</button>
        )}
      </div>
      {asCards ? (
        <div className="space-y-2">
          {shown.map(r => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-3 flex gap-3" onClick={() => toggle(r.id)}>
              <Checkbox checked={sel.has(r.id)} className="mt-1" />
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{r.business_name || "Unnamed"}</div>
                <div className="text-xs text-muted-foreground">{[r.city, r.state].filter(Boolean).join(", ") || "—"} · {r.user_id ? repName[r.user_id] || "Unknown" : "Unassigned"}</div>
                <div className="text-xs mt-1">{STAGE_NAME[r.stage]}{r.next && ` · meeting ${new Date(r.next).toLocaleDateString()}`}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="w-10 p-2"><Checkbox checked={allShown} onCheckedChange={v => setSel(s => { const n = new Set(s); shown.forEach(r => v ? n.add(r.id) : n.delete(r.id)); return n; })} /></th>
                <th className="text-left p-2 font-medium">Business</th><th className="text-left p-2 font-medium">Location</th>
                <th className="text-left p-2 font-medium">Rep</th><th className="text-left p-2 font-medium">Stage</th>
                <th className="text-left p-2 font-medium">Next meeting</th><th className="text-left p-2 font-medium">List</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(r => (
                <tr key={r.id} className={`border-t border-border hover:bg-muted/30 ${sel.has(r.id) ? "bg-primary/5" : ""}`}>
                  <td className="p-2"><Checkbox checked={sel.has(r.id)} onCheckedChange={() => toggle(r.id)} /></td>
                  <td className="p-2 font-medium max-w-[260px] truncate">{r.business_name || "Unnamed"}</td>
                  <td className="p-2 text-muted-foreground">{[r.city, r.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="p-2">{r.user_id ? repName[r.user_id] || "Unknown" : "Unassigned"}</td>
                  <td className="p-2">{STAGE_NAME[r.stage]}</td>
                  <td className="p-2 text-muted-foreground">{r.next ? new Date(r.next).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}</td>
                  <td className="p-2 text-muted-foreground truncate max-w-[160px]">{r.list_name || "—"}</td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No leads match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {list.length > PAGE && (
        <div className="flex items-center gap-2 justify-end">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= list.length} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
