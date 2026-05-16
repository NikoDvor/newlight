import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { CalendarClock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CallbackLead {
  id: string;
  business_name: string;
  owner_name: string | null;
  callback_at: string;
}

function formatRemaining(ms: number) {
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  const seconds = Math.floor((abs % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function BDRCallbackCountdown({ userId }: { userId?: string | null }) {
  const [leads, setLeads] = useState<CallbackLead[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("nl_bdr_leads")
        .select("id, business_name, owner_name, callback_at")
        .eq("user_id", userId)
        .not("callback_at", "is", null)
        .order("callback_at", { ascending: true });
      if (active) setLeads((data || []) as CallbackLead[]);
    })();
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!leads.length) return null;

  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" /> Scheduled Callbacks
        </h2>
        <span className="text-xs text-muted-foreground">{leads.length} active</span>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {leads.map((lead) => {
          const target = new Date(lead.callback_at).getTime();
          const diff = target - now;
          const overdue = diff <= 0;
          return (
            <div
              key={lead.id}
              className="rounded-lg border p-3 flex items-center justify-between gap-3 transition-colors"
              style={{
                background: overdue ? "hsla(0,72%,55%,.12)" : "hsla(190,90%,55%,.06)",
                borderColor: overdue ? "hsl(0,72%,55%)" : "hsla(190,90%,55%,.25)",
              }}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{lead.business_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {lead.owner_name || "—"} · {new Date(lead.callback_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
              <div className="text-right shrink-0">
                {overdue ? (
                  <div className="flex items-center gap-1 text-[hsl(0,72%,65%)] font-bold text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Overdue {formatRemaining(diff)}</span>
                  </div>
                ) : (
                  <p className="font-mono font-bold text-sm text-[hsl(190,90%,65%)] tabular-nums">
                    {formatRemaining(diff)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
