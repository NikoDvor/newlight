import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, PauseCircle, TrendingDown } from "lucide-react";
import { MOCK_CLIENTS } from "@/lib/clientHealthMock";

const STATUS_META = {
  "at-risk": { icon: AlertTriangle, color: "hsl(0 72% 61%)", bg: "bg-red-500/15", text: "text-red-300", label: "At Risk" },
  "inactive": { icon: PauseCircle, color: "hsl(210 20% 60%)", bg: "bg-white/10", text: "text-white/60", label: "Inactive" },
  "underperforming": { icon: TrendingDown, color: "hsl(38 92% 60%)", bg: "bg-amber-500/15", text: "text-amber-300", label: "Underperforming" },
  "healthy": { icon: AlertCircle, color: "hsl(152 60% 55%)", bg: "bg-emerald-500/15", text: "text-emerald-300", label: "Healthy" },
} as const;

export default function AdminPriorityAlerts() {
  const flagged = MOCK_CLIENTS.filter(c => c.status !== "healthy");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Priority Alerts</h1>
        <p className="text-sm text-white/50 mt-1">Clients flagged for immediate attention.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(["at-risk", "underperforming", "inactive"] as const).map(s => {
          const M = STATUS_META[s];
          const count = MOCK_CLIENTS.filter(c => c.status === s).length;
          return (
            <Card key={s} className="border-0 bg-white/[0.04]"><CardContent className="p-4 flex items-center gap-3">
              <M.icon className="h-5 w-5" style={{ color: M.color }} />
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{M.label}</p>
                <p className="text-2xl font-bold text-white">{count}</p>
              </div>
            </CardContent></Card>
          );
        })}
      </div>

      <div className="space-y-3">
        {flagged.map(c => {
          const M = STATUS_META[c.status];
          return (
            <Card key={c.id} className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ background: `${M.color}20` }}>
                      <M.icon className="h-4 w-4" style={{ color: M.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{c.name}</p>
                      <p className="text-[11px] text-white/40">{c.industry} · Score {c.score}</p>
                    </div>
                  </div>
                  <Badge className={`${M.bg} ${M.text} border-0`}>{M.label}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.reasons.map(r => (
                    <span key={r} className="text-[11px] px-2 py-1 rounded-md bg-white/[0.04] text-white/70 border border-white/[0.06]">
                      {r}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
