import { useEffect, useState } from "react";
import { Trash2, ArrowUp, ArrowDown, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { FIRM_TYPES } from "@/components/employee/PullLeadsCard";

const STATES = "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(" ");

function StateSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-24"><SelectValue placeholder="State" /></SelectTrigger>
      <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
    </Select>
  );
}

type QueueRow = {
  id: string; rep_user_id: string; state: string; city: string | null; queue_position: number | null; status: string;
  source_exhausted: boolean; available: number; with_reps: number;
};
type PullLog = { rep_user_id: string; run_at: string; requested: number; pulled: number; cities: string[]; note: string | null };

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  current: { label: "Working", cls: "bg-emerald-500/15 text-emerald-400" },
  queued: { label: "Next up", cls: "bg-sky-500/15 text-sky-400" },
  done: { label: "Done", cls: "bg-muted text-muted-foreground" },
};

function RepCard({ rep, terrs, lastPull, perDay, reload }: {
  rep: { id: string; name: string; salesman: boolean }; terrs: QueueRow[]; lastPull?: PullLog; perDay: number; reload: () => void;
}) {
  const [st, setSt] = useState(""); const [city, setCity] = useState("");
  const [ast, setAst] = useState(""); const [acity, setAcity] = useState("");
  const [firm, setFirm] = useState("any"); const [count, setCount] = useState(50);
  const [busy, setBusy] = useState(false);
  const states = Array.from(new Set(terrs.map(t => t.state)));
  const waiting = terrs.filter(t => t.status !== "done").reduce((x, t) => x + (t.available || 0), 0);

  const add = async () => {
    if (!st) return;
    const { error } = await (supabase as any).from("nl_lead_territories")
      .insert({ rep_user_id: rep.id, state: st, city: city.trim() || null, active: true });
    if (error) {
      const taken = /city_one_rep|duplicate/i.test(error.message);
      return toast({ title: taken ? "That city already belongs to a salesman" : error.message, variant: "destructive" });
    }
    setCity(""); reload();
  };
  const del = async (id: string) => {
    const { error } = await (supabase as any).from("nl_lead_territories").delete().eq("id", id);
    if (error) toast({ title: error.message, variant: "destructive" }); else reload();
  };
  const move = async (id: string, dir: number) => {
    const { error } = await (supabase as any).rpc("nl_territory_move", { _id: id, _dir: dir });
    if (error) toast({ title: error.message, variant: "destructive" }); else reload();
  };
  const pullNow = async () => {
    if (busy) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("nl_auto_pull_now", { _rep: rep.id, _count: perDay });
    setBusy(false);
    if (error) toast({ title: error.message, variant: "destructive" });
    else { toast({ title: `Pulled ${data ?? 0} leads into ${rep.name}'s Dialer` }); reload(); }
  };
  const assign = async () => {
    if (!ast || busy) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("nl_pool_assign", {
      _rep: rep.id, _state: ast, _city: acity.trim() || null, _firm_type: firm, _count: count || 50,
    });
    setBusy(false);
    if (error) toast({ title: error.message, variant: "destructive" });
    else toast({ title: `Assigned ${data ?? 0} leads` });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            {rep.name}
            {states.length > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">{states.join(", ")}</span>}
          </CardTitle>
          {rep.salesman && terrs.length > 0 && (
            <Button size="sm" variant="outline" onClick={pullNow} disabled={busy}>
              <Zap className="mr-1 h-3.5 w-3.5" />{busy ? "Pulling…" : `Pull ${perDay} now`}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {rep.salesman ? `Gets ${perDay} new leads the evening before each work day, city by city in this order.` : "Not a salesman — no daily pull."}
          {rep.salesman && terrs.length > 0 && ` ${waiting} loaded and waiting${waiting < perDay ? " — below one day's pull" : ""}.`}
        </p>
        {lastPull && (
          <p className="text-xs text-muted-foreground">
            Last pull {new Date(lastPull.run_at).toLocaleString()}: {lastPull.pulled} of {lastPull.requested}
            {lastPull.cities?.length ? ` · ${lastPull.cities.join(", ")}` : ""}{lastPull.note ? ` · ${lastPull.note}` : ""}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {terrs.length === 0 ? <p className="text-sm text-muted-foreground">No cities yet. Add the first city they should work.</p> : (
          <ol className="space-y-1">{terrs.map((t, i) => {
            const style = STATUS_STYLE[t.status] || STATUS_STYLE.queued;
            return (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <span className="w-6 text-right tabular-nums text-muted-foreground">{i + 1}.</span>
                <span className="flex-1 min-w-0 truncate">{t.city || "Whole state"}, {t.state}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${style.cls}`}>{style.label}</span>
                <span className="w-24 text-right text-xs tabular-nums text-muted-foreground" title="Loaded in the pool and not yet pulled">
                  {t.available} waiting
                </span>
                <span className="w-28 text-right text-[11px] text-muted-foreground">
                  {t.source_exhausted ? "AdvizorPro: all loaded" : "AdvizorPro: more to load"}
                </span>
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(t.id, -1)} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === terrs.length - 1} onClick={() => move(t.id, 1)} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(t.id)} aria-label="Remove"><Trash2 className="h-3.5 w-3.5" /></Button>
              </li>
            );
          })}</ol>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <StateSelect value={st} onChange={setSt} />
          <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} className="w-44"
            onKeyDown={e => { if (e.key === "Enter") add(); }} />
          <Button variant="outline" onClick={add} disabled={!st}>Add city to the end</Button>
        </div>
        <div className="flex flex-wrap gap-2 items-center border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">Assign leads by hand:</span>
          <StateSelect value={ast} onChange={setAst} />
          <Input placeholder="City (optional)" value={acity} onChange={e => setAcity(e.target.value)} className="w-40" />
          <Select value={firm} onValueChange={setFirm}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{FIRM_TYPES.map(f => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" min={1} value={count} onChange={e => setCount(Number(e.target.value))} className="w-24" />
          <Button onClick={assign} disabled={!ast || busy}>{busy ? "Assigning…" : "Assign"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminTerritories() {
  const [reps, setReps] = useState<{ id: string; name: string; salesman: boolean }[]>([]);
  const [terrs, setTerrs] = useState<QueueRow[]>([]);
  const [logs, setLogs] = useState<Record<string, PullLog>>({});
  const [settings, setSettings] = useState<{ enabled: boolean; leads_per_day: number } | null>(null);
  const [perDayDraft, setPerDayDraft] = useState("150");
  const [stats, setStats] = useState<any[]>([]);
  const totals = stats.reduce((a, s) => ({
    available: a.available + (s.available ?? 0),
    claimed: a.claimed + (s.claimed ?? 0),
    resting: a.resting + (s.resting ?? 0),
    converted: a.converted + (s.converted ?? 0),
    removed: a.removed + (s.removed ?? 0),
    total: a.total + (s.total ?? 0),
  }), { available: 0, claimed: 0, resting: 0, converted: 0, removed: 0, total: 0 });

  const loadTerrs = async () => {
    const db = supabase as any;
    const [{ data }, { data: lg }] = await Promise.all([
      db.rpc("nl_territory_queue"),
      db.from("nl_lead_auto_pull_log").select("*").order("run_at", { ascending: false }).limit(200),
    ]);
    setTerrs(data || []);
    const latest: Record<string, PullLog> = {};
    (lg || []).forEach((l: PullLog) => { if (!latest[l.rep_user_id]) latest[l.rep_user_id] = l; });
    setLogs(latest);
  };
  const saveSettings = async (patch: Partial<{ enabled: boolean; leads_per_day: number }>) => {
    const { data, error } = await (supabase as any).from("nl_lead_auto_pull_settings")
      .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1).select().single();
    if (error) return toast({ title: error.message, variant: "destructive" });
    setSettings(data); setPerDayDraft(String(data.leads_per_day));
    toast({ title: "Saved" });
  };

  useEffect(() => {
    (async () => {
      const db = supabase as any;
      const [{ data }, { data: roles }, { data: cfg }] = await Promise.all([
        supabase.from("employee_profiles").select("user_id, full_name").order("full_name"),
        db.from("user_roles").select("user_id, role"),
        db.from("nl_lead_auto_pull_settings").select("*").eq("id", 1).maybeSingle(),
      ]);
      const sales = new Set(((roles as any[]) || []).filter(r => r.role === "marketing_staff").map(r => r.user_id));
      setReps(((data as any[]) || []).filter(r => r.user_id)
        .map(r => ({ id: r.user_id, name: r.full_name || "Unnamed", salesman: sales.has(r.user_id) }))
        .sort((a, b) => Number(b.salesman) - Number(a.salesman) || a.name.localeCompare(b.name)));
      if (cfg) { setSettings(cfg); setPerDayDraft(String(cfg.leads_per_day)); }
      loadTerrs();
      const { data: st } = await (supabase as any).rpc("nl_pool_stats");
      setStats(((st as any[]) || []).slice().sort((a, b) => (b.available ?? 0) - (a.available ?? 0)));
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Territories</h1>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Daily lead pull</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <Switch checked={!!settings?.enabled} onCheckedChange={(v) => saveSettings({ enabled: v })} disabled={!settings} />
            {settings?.enabled ? "On" : "Off"}
          </label>
          <span className="text-muted-foreground">Every salesman gets</span>
          <Input type="number" min={1} max={500} value={perDayDraft} onChange={e => setPerDayDraft(e.target.value)} className="w-20" />
          <span className="text-muted-foreground">new leads, Sunday–Thursday at 5pm Pacific (6pm in summer).</span>
          <Button size="sm" variant="outline" disabled={!settings || Number(perDayDraft) === settings.leads_per_day || !(Number(perDayDraft) >= 1 && Number(perDayDraft) <= 500)}
            onClick={() => saveSettings({ leads_per_day: Math.round(Number(perDayDraft)) })}>Save</Button>
          <p className="basis-full text-xs text-muted-foreground">
            Each salesman works their cities top to bottom. A city is done when AdvizorPro has nothing new there and every loaded firm has been pulled; then the next city starts. A city belongs to one salesman.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Pool — by state</CardTitle></CardHeader>
        <CardContent>
          {stats.length === 0 ? <span className="text-muted-foreground text-sm">No pool data.</span> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="pr-3 py-1 font-medium">State</th>
                    <th className="pr-3 py-1 font-medium text-right">Available</th>
                    <th className="pr-3 py-1 font-medium text-right">With reps</th>
                    <th className="pr-3 py-1 font-medium text-right">Resting</th>
                    <th className="pr-3 py-1 font-medium text-right">Converted</th>
                    <th className="pr-3 py-1 font-medium text-right">Removed</th>
                    <th className="py-1 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map(s => (
                    <tr key={s.state || "—"} className="border-t border-border">
                      <td className="pr-3 py-1">{s.state || "—"}</td>
                      <td className="pr-3 py-1 text-right tabular-nums">{s.available ?? 0}</td>
                      <td className="pr-3 py-1 text-right tabular-nums">{s.claimed ?? 0}</td>
                      <td className="pr-3 py-1 text-right tabular-nums">{s.resting ?? 0}</td>
                      <td className="pr-3 py-1 text-right tabular-nums">{s.converted ?? 0}</td>
                      <td className="pr-3 py-1 text-right tabular-nums">{s.removed ?? 0}</td>
                      <td className="py-1 text-right tabular-nums">{s.total ?? 0}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-border font-bold">
                    <td className="pr-3 py-1">Total</td>
                    <td className="pr-3 py-1 text-right tabular-nums">{totals.available}</td>
                    <td className="pr-3 py-1 text-right tabular-nums">{totals.claimed}</td>
                    <td className="pr-3 py-1 text-right tabular-nums">{totals.resting}</td>
                    <td className="pr-3 py-1 text-right tabular-nums">{totals.converted}</td>
                    <td className="pr-3 py-1 text-right tabular-nums">{totals.removed}</td>
                    <td className="py-1 text-right tabular-nums">{totals.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {reps.map(r => <RepCard key={r.id} rep={r} terrs={terrs.filter(t => t.rep_user_id === r.id)} lastPull={logs[r.id]}
        perDay={settings?.leads_per_day ?? 150} reload={loadTerrs} />)}
    </div>
  );
}
