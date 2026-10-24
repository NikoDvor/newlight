import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

function RepCard({ rep, terrs, reload }: { rep: { id: string; name: string }; terrs: any[]; reload: () => void }) {
  const [st, setSt] = useState(""); const [city, setCity] = useState("");
  const [ast, setAst] = useState(""); const [acity, setAcity] = useState("");
  const [firm, setFirm] = useState("any"); const [count, setCount] = useState(50);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!st) return;
    const { error } = await (supabase as any).from("nl_lead_territories")
      .insert({ rep_user_id: rep.id, state: st, city: city.trim() || null, active: true });
    if (error) return toast({ title: error.message, variant: "destructive" });
    setCity(""); reload();
  };
  const del = async (id: string) => {
    const { error } = await (supabase as any).from("nl_lead_territories").delete().eq("id", id);
    if (error) toast({ title: error.message, variant: "destructive" }); else reload();
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
      <CardHeader><CardTitle className="text-base">{rep.name}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {terrs.length === 0 ? <p className="text-sm text-muted-foreground">No territories.</p> : (
          <ul className="space-y-1">{terrs.map(t => (
            <li key={t.id} className="flex items-center justify-between text-sm">
              <span>{t.state} — {t.city || "Whole state"}</span>
              <Button size="icon" variant="ghost" onClick={() => del(t.id)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}</ul>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <StateSelect value={st} onChange={setSt} />
          <Input placeholder="City (optional)" value={city} onChange={e => setCity(e.target.value)} className="w-44" />
          <Button variant="outline" onClick={add} disabled={!st}>Add territory</Button>
        </div>
        <div className="flex flex-wrap gap-2 items-center border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">Assign leads:</span>
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
  const [reps, setReps] = useState<{ id: string; name: string }[]>([]);
  const [terrs, setTerrs] = useState<any[]>([]);
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
    const { data } = await (supabase as any).from("nl_lead_territories").select("*").order("state");
    setTerrs(data || []);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("employee_profiles").select("user_id, full_name").order("full_name");
      setReps(((data as any[]) || []).filter(r => r.user_id).map(r => ({ id: r.user_id, name: r.full_name || "Unnamed" })));
      loadTerrs();
      const { data: st } = await (supabase as any).rpc("nl_pool_stats");
      setStats(((st as any[]) || []).slice().sort((a, b) => (b.available ?? 0) - (a.available ?? 0)));
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Territories</h1>
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
      {reps.map(r => <RepCard key={r.id} rep={r} terrs={terrs.filter(t => t.rep_user_id === r.id)} reload={loadTerrs} />)}
    </div>
  );
}
