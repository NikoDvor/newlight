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
  const [view, setView] = useState<"auto" | "board" | "table" | "cards">("auto");
  const [more, setMore] = useState<Record<string, number>>({});
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

  const hue = (id: string) => id === "none" ? "0 0% 55%" : `${(Math.max(0, reps.findIndex(r => r.id === id)) * 47 + 12) % 360} 65% 48%`;
  const byStage = useMemo(() => {
    const m: Record<string, Row[]> = { cold: [], warm: [], hot: [], won: [], lost: [] };
    open.forEach(r => m[r.stage].push(r));
    return m;
  }, [open]);

  const list = useMemo(() => open.filter(r =>
    (fRep === "all" || (fRep === "none" ? !r.user_id : r.user_id === fRep)) &&
    (fStage === "all" || r.stage === fStage) && (!fUp || r.next) &&
    (!q || `${r.business_name} ${r.city} ${r.state} ${r.list_name}`.toLowerCase().includes(q.toLowerCase()))
  ), [open, fRep, fStage, fUp, q]);
  useEffect(() => setPage(0), [fRep, fStage, fUp, q]);
  const shown = list.slice(page * PAGE, page * PAGE + PAGE);
  
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
  const moveOne = async (id: string, to: string) => {
    const { error } = await (supabase as any).rpc("admin_reassign_leads", { _lead_ids: [id], _new_user: to });
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: `Moved to ${repName[to]}` });
    load();
  };
  const effView = view === "auto" ? (isMobile ? "cards" : "board") : view;
  const stagesShown = fStage === "all" ? STAGES : [fStage as CanonStage];
  const repCount = (id: string) => open.filter(r => (fStage === "all" || r.stage === fStage) && (id === "all" || (id === "none" ? !r.user_id : r.user_id === id))).length;
  const Card = ({ r }: { r: Row }) => (
    <div className={`rounded-md border bg-card p-2 text-sm ${sel.has(r.id) ? "border-primary bg-primary/5" : "border-border"}`}
      style={{ borderLeft: `4px solid hsl(${hue(r.user_id || "none")})` }}>
      <div className="flex gap-2 items-start">
        <Checkbox checked={sel.has(r.id)} onCheckedChange={() => toggle(r.id)} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{r.business_name || "Unnamed"}</div>
          <div className="text-[11px] text-muted-foreground truncate">{[r.city, r.state].filter(Boolean).join(", ") || "—"}{r.next && ` · 📅 ${new Date(r.next).toLocaleDateString([], { month: "short", day: "numeric" })}`}</div>
        </div>
      </div>
      <Select value={r.user_id || ""} onValueChange={v => moveOne(r.id, v)}>
        <SelectTrigger className="h-7 mt-1.5 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
        <SelectContent>{reps.map(x => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );

  if (loading) return <div className="text-sm text-muted-foreground p-6">Loading every lead…</div>;

  return (
    <div className="space-y-4">
      {/* STAGE STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {STAGES.map(st => {
          const rowsS = byStage[st];
          const active = fStage === st;
          return (
            <button key={st} onClick={() => setFStage(active ? "all" : st)}
              className={`rounded-lg border p-3 text-left transition ${active ? "border-primary ring-2 ring-primary/40 bg-primary/5" : "border-border bg-card hover:border-primary/50"}`}>
              <div className="text-xs text-muted-foreground">{STAGE_NAME[st]}</div>
              <div className="text-3xl font-semibold tabular-nums leading-tight">{rowsS.length.toLocaleString()}</div>
              <div className="flex h-2 rounded overflow-hidden mt-2 bg-muted">
                {[...reps.map(r => r.id), "none"].map(id => {
                  const n = rowsS.filter(x => (x.user_id || "none") === id).length;
                  return n ? <div key={id} title={`${id === "none" ? "Unassigned" : repName[id]}: ${n}`} style={{ width: `${(n / rowsS.length) * 100}%`, background: `hsl(${hue(id)})` }} /> : null;
                })}
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-xs text-muted-foreground -mt-2">
        {open.length.toLocaleString()} open leads · {pool.toLocaleString()} more unassigned in the big pool · bar under each stage shows who holds them. Warm/Hot come from booked meetings; Won from paid and signed.
      </div>

      {/* REP CHIPS */}
      <div className="flex flex-wrap gap-1.5">
        {[{ id: "all", name: "All reps" }, { id: "none", name: "Unassigned" }, ...reps].map(r => {
          const on = fRep === r.id;
          return (
            <button key={r.id} onClick={() => setFRep(on && r.id !== "all" ? "all" : r.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/50"}`}>
              {r.id !== "all" && <span className="h-2.5 w-2.5 rounded-full" style={{ background: `hsl(${hue(r.id)})` }} />}
              {r.name}<span className={on ? "opacity-80" : "text-muted-foreground"}>{repCount(r.id)}</span>
            </button>
          );
        })}
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search business, city, list…" value={q} onChange={e => setQ(e.target.value)} className="w-56 h-9" />
        <label className="flex items-center gap-1.5 text-sm"><Checkbox checked={fUp} onCheckedChange={v => setFUp(!!v)} />Meeting upcoming</label>
        {(fRep !== "all" || fStage !== "all" || fUp || q) && (
          <Button variant="ghost" size="sm" onClick={() => { setFRep("all"); setFStage("all"); setFUp(false); setQ(""); }}>Clear</Button>
        )}
        <div className="ml-auto flex gap-1">
          {(["auto", "board", "table", "cards"] as const).map(v => (
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
        {effView === "table" && list.length > shown.length && ` · showing ${page * PAGE + 1}–${page * PAGE + shown.length}`}
        {list.length > 0 && (
          <button className="ml-3 underline" onClick={() => setSel(new Set(list.map(r => r.id)))}>Select all {list.length.toLocaleString()}</button>
        )}
      </div>
      {effView === "board" ? (
        <div className="grid gap-3 items-start" style={{ gridTemplateColumns: `repeat(${stagesShown.length}, minmax(200px, 1fr))` }}>
          {stagesShown.map(st => {
            const col = list.filter(r => r.stage === st);
            const n = more[st] || 25;
            return (
              <div key={st} className="rounded-lg bg-muted/40 p-2 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <b className="text-sm">{STAGE_NAME[st]}</b>
                  <button className="text-xs text-muted-foreground underline" onClick={() => setSel(s => { const x = new Set(s); col.forEach(r => x.add(r.id)); return x; })}>select {col.length}</button>
                </div>
                {col.slice(0, n).map(r => <Card key={r.id} r={r} />)}
                {col.length > n && <Button variant="ghost" size="sm" className="w-full" onClick={() => setMore(m => ({ ...m, [st]: n + 50 }))}>Show {Math.min(50, col.length - n)} more</Button>}
                {col.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">None</div>}
              </div>
            );
          })}
        </div>
      ) : effView === "cards" ? (
        <div className="space-y-2">
          {shown.map(r => <Card key={r.id} r={r} />)}
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
      {effView === "table" && list.length > PAGE && (
        <div className="flex items-center gap-2 justify-end">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= list.length} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
