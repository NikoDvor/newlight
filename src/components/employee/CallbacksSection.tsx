import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, Check, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "@/hooks/use-toast";
import { callingHoursBlock, leadLocalTime } from "@/lib/callingHours";

type CB = {
  id: string; business_name: string | null; owner_name: string | null; state: string | null; city: string | null;
  callback_at: string; pool_firm_id: string | null; phone: string | null; owner_direct_phone: string | null; front_desk_phone: string | null;
};

/** Scheduled callbacks, soonest first, with the date/time and the lead's local time. Sits at the bottom of the dashboard. */
export function CallbacksSection() {
  const { user } = useWorkspace();
  const userId = user?.id;
  const [rows, setRows] = useState<CB[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await (supabase as any).from("nl_bdr_leads")
      .select("id, business_name, owner_name, state, city, callback_at, pool_firm_id, phone, owner_direct_phone, front_desk_phone, pipeline_stage")
      .eq("user_id", userId).not("callback_at", "is", null).neq("pipeline_stage", "won")
      .order("callback_at", { ascending: true }).limit(200);
    setRows((data || []) as CB[]);
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);

  const markDone = async (r: CB) => {
    setRows(prev => prev.filter(x => x.id !== r.id));
    const { error } = await (supabase as any).from("nl_bdr_leads").update({ callback_at: null }).eq("id", r.id).eq("user_id", userId);
    if (error) { toast({ title: "Couldn't clear callback", description: error.message, variant: "destructive" }); load(); }
  };

  return (
    <Card className="p-5 border-white/10 bg-white/[0.04]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /> Callbacks</h2>
        <span className="text-xs text-muted-foreground">{rows.length} scheduled</span>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-6 text-sm text-muted-foreground text-center">No callbacks scheduled. Log "Schedule Callback" in the dialer.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border/60">
                <th className="text-left font-medium py-2 pr-3">Lead</th>
                <th className="text-left font-medium py-2 pr-3">Date & Time</th>
                <th className="text-left font-medium py-2 pr-3">Their time</th>
                <th className="text-left font-medium py-2 pr-3">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const when = new Date(r.callback_at);
                const diff = when.getTime() - now;
                const overdue = diff <= 0;
                const soon = !overdue && diff <= 3600000;
                const blocked = callingHoursBlock(r.state, new Date());
                const phone = r.owner_direct_phone || r.phone || r.front_desk_phone;
                const outside = callingHoursBlock(r.state, when);
                return (
                  <tr key={r.id} className="border-b border-border/40" style={{ borderLeft: `3px solid ${overdue ? "hsl(0,72%,55%)" : soon ? "hsl(45,95%,55%)" : "transparent"}` }}>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-foreground truncate max-w-[240px]">{r.business_name || r.owner_name || "Lead"}</div>
                      <div className="text-xs text-muted-foreground">{[r.owner_name, [r.city, r.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-foreground">
                      {when.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground">
                      {leadLocalTime(r.state, when) || "—"}
                      {outside && <span title={outside} className="ml-1 text-[hsl(45,95%,60%)]">⚠</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      {overdue ? <span className="inline-flex items-center gap-1 text-[hsl(0,72%,65%)]"><AlertTriangle className="h-3.5 w-3.5" />Overdue</span>
                        : soon ? <span className="text-[hsl(45,95%,60%)]">Within the hour</span>
                        : <span className="text-muted-foreground">Scheduled</span>}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      {phone && !blocked ? (
                        <Button asChild size="sm" variant="ghost" className="h-7 gap-1"><a href={`tel:${phone}`}><Phone className="h-3.5 w-3.5" />Call</a></Button>
                      ) : (
                        <Button asChild size="sm" variant="ghost" className="h-7" title={blocked || undefined}><Link to="/employee/dialer">{blocked ? "Closed now" : "Open dialer"}</Link></Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => markDone(r)}><Check className="h-3.5 w-3.5" />Done</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
