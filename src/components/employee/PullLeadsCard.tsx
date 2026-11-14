import { useEffect, useMemo, useState } from "react";
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
  const [avail, setAvail] = useState<Record<string, number>>({});

  const fetchAvail = async () => {
    const { data } = await (supabase as any).rpc("nl_pool_my_availability");
    const m: Record<string, number> = {};
    ((data as any[]) || []).forEach((r: any) => { m[`${r.state}|${r.city || ""}`] = Number(r.available) || 0; });
    setAvail(m);
    return m;
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setTerrs([]);
      const { data } = await (supabase as any).from("nl_lead_territories")
        .select("id,state,city").eq("rep_user_id", user.id).eq("active", true).order("state");
      setTerrs(data || []);
      const m = await fetchAvail();
      // Start on the city with the most leads left, not whichever came first.
      const best = [...(data || [])].sort((a: any, b: any) => (m[`${b.state}|${b.city || ""}`] || 0) - (m[`${a.state}|${a.city || ""}`] || 0))[0];
      if (best) setSel(best.id);
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
    else { toast({ title: `Pulled ${data ?? 0} leads into My Leads` }); fetchAvail(); }
  };

  // Cities with leads first (most available on top), empty ones at the bottom, A–Z within each group.
  const sorted = useMemo(() => {
    const n = (t: any) => avail[`${t.state}|${t.city || ""}`] || 0;
    return [...(terrs || [])].sort((a, b) => (n(b) > 0 ? 1 : 0) - (n(a) > 0 ? 1 : 0) || n(b) - n(a) || String(a.city || "").localeCompare(String(b.city || "")));
  }, [terrs, avail]);
  const firstEmpty = sorted.findIndex(t => (avail[`${t.state}|${t.city || ""}`] || 0) === 0);
  const selT = terrs?.find(x => x.id === sel);
  const selAvail = selT ? avail[`${selT.state}|${selT.city || ""}`] : undefined;

  return (
    <Card data-tour="pull">
      <CardHeader><CardTitle className="text-base">Pull leads</CardTitle></CardHeader>
      <CardContent>
        {terrs === null ? null : terrs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No territory assigned yet — ask your admin.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={sel} onValueChange={setSel}>
                <SelectTrigger className="w-full sm:w-80"><SelectValue /></SelectTrigger>
                <SelectContent>{sorted.map((t, i) => {
                  const n = avail[`${t.state}|${t.city || ""}`];
                  const base = t.city ? `${t.city}, ${t.state}` : `${t.state} (whole state)`;
                  return (
                    <div key={t.id}>
                      {i === firstEmpty && i > 0 && <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground border-t border-border/60 mt-1">No leads left</div>}
                      <SelectItem value={t.id} className={n === 0 ? "opacity-50" : ""}>{n == null ? base : `${base} — ${n}`}</SelectItem>
                    </div>
                  );
                })}</SelectContent>
              </Select>
              <Select value={firm} onValueChange={setFirm}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{FIRM_TYPES.map(f => <SelectItem key={f.v} value={f.v}>{f.l}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" min={1} max={300} value={count} className="w-24"
                onChange={e => setCount(Math.min(300, Number(e.target.value)))} />
              <Button onClick={pull} disabled={busy || !sel || selAvail === 0}>{busy ? "Pulling…" : "Pull leads"}</Button>
            </div>
            {selAvail === 0 && (
              <p className="text-xs text-muted-foreground mt-2">No leads left here — ask your admin to upload more</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
