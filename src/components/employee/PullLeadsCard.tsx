import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

export const FIRM_TYPES = [
  { v: "any", l: "Any" }, { v: "ria", l: "RIA" }, { v: "ibd", l: "Independent BD" },
  { v: "hybrid", l: "Hybrid" }, { v: "independent_advisor", l: "Independent Advisor" },
];

export function PullLeadsCard() {
  const [terrs, setTerrs] = useState<any[] | null>(null);
  const [sel, setSel] = useState("");
  const [firm, setFirm] = useState("any");
  const [count, setCount] = useState(50);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setTerrs([]);
      const { data } = await (supabase as any).from("nl_lead_territories")
        .select("id,state,city").eq("rep_user_id", user.id).eq("active", true).order("state");
      setTerrs(data || []);
      if (data?.[0]) setSel(data[0].id);
    })();
  }, []);

  const pull = async () => {
    const t = terrs?.find(x => x.id === sel);
    if (!t || busy) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("nl_pool_pull", {
      _state: t.state, _city: t.city || null, _firm_type: firm, _count: Math.min(300, Math.max(1, count || 50)),
    });
    setBusy(false);
    if (error) toast({ title: error.message, variant: "destructive" });
    else toast({ title: `Pulled ${data ?? 0} leads into My Leads` });
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Pull leads</CardTitle></CardHeader>
      <CardContent>
        {terrs === null ? null : terrs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No territory assigned yet — ask your admin.</p>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={sel} onValueChange={setSel}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>{terrs.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.city ? `${t.city}, ${t.state}` : `${t.state} (whole state)`}</SelectItem>
              ))}</SelectContent>
            </Select>
            <Select value={firm} onValueChange={setFirm}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{FIRM_TYPES.map(f => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" min={1} max={300} value={count} className="w-24"
              onChange={e => setCount(Math.min(300, Number(e.target.value)))} />
            <Button onClick={pull} disabled={busy || !sel}>{busy ? "Pulling…" : "Pull leads"}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
