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
  const [pool, setPool] = useState<[string, number][]>([]);

  const loadTerrs = async () => {
    const { data } = await (supabase as any).from("nl_lead_territories").select("*").order("state");
    setTerrs(data || []);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("employee_profiles").select("user_id, full_name").order("full_name");
      setReps(((data as any[]) || []).filter(r => r.user_id).map(r => ({ id: r.user_id, name: r.full_name || "Unnamed" })));
      loadTerrs();
      const counts: Record<string, number> = {};
      for (let from = 0; ; from += 1000) {
        const { data: rows } = await (supabase as any).from("nl_lead_pool_firms")
          .select("state").eq("status", "available").range(from, from + 999);
        (rows || []).forEach((r: any) => { const k = r.state || "—"; counts[k] = (counts[k] || 0) + 1; });
        if (!rows || rows.length < 1000) break;
      }
      setPool(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10));
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Territories</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Pool — available firms by state</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          {pool.length === 0 ? <span className="text-muted-foreground">No available firms.</span> :
            pool.map(([s, n]) => <span key={s} className="rounded-md border border-border px-2 py-1">{s}: {n}</span>)}
        </CardContent>
      </Card>
      {reps.map(r => <RepCard key={r.id} rep={r} terrs={terrs.filter(t => t.rep_user_id === r.id)} reload={loadTerrs} />)}
    </div>
  );
}
