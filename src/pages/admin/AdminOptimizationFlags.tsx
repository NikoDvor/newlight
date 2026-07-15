import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap } from "lucide-react";
import { MOCK_CLIENTS } from "@/lib/clientHealthMock";

const PRI = {
  high: { bg: "bg-red-500/15", text: "text-red-300", label: "High" },
  med: { bg: "bg-amber-500/15", text: "text-amber-300", label: "Medium" },
  low: { bg: "bg-white/10", text: "text-white/60", label: "Low" },
} as const;

export default function AdminOptimizationFlags() {
  const suggestions = MOCK_CLIENTS.flatMap(c => c.optimizations.map(o => ({ ...o, client: c.name, industry: c.industry })));
  const high = suggestions.filter(s => s.priority === "high").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Optimization Flags</h1>
        <p className="text-sm text-white/50 mt-1">Suggested actions to unlock more growth per client.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 bg-white/[0.04]"><CardContent className="p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Total Suggestions</p>
          <p className="text-2xl font-bold text-white mt-1">{suggestions.length}</p>
        </CardContent></Card>
        <Card className="border-0 bg-white/[0.04]"><CardContent className="p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">High Priority</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{high}</p>
        </CardContent></Card>
        <Card className="border-0 bg-white/[0.04]"><CardContent className="p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Clients with Actions</p>
          <p className="text-2xl font-bold text-[hsl(211,96%,68%)] mt-1">{MOCK_CLIENTS.filter(c => c.optimizations.length > 0).length}</p>
        </CardContent></Card>
      </div>

      <div className="space-y-3">
        {suggestions.map((s, i) => {
          const P = PRI[s.priority];
          return (
            <Card key={i} className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-[hsla(211,96%,62%,0.12)]">
                      <Sparkles className="h-4 w-4 text-[hsl(211,96%,68%)]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{s.title}</p>
                      <p className="text-xs text-white/60 mt-0.5">{s.detail}</p>
                      <p className="text-[10px] text-white/40 mt-1.5">{s.client} · {s.industry}</p>
                    </div>
                  </div>
                  <Badge className={`${P.bg} ${P.text} border-0 shrink-0`}>{P.label}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
