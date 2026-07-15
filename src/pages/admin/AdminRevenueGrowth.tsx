import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { MOCK_CLIENTS } from "@/lib/clientHealthMock";

export default function AdminRevenueGrowth() {
  const totalRev = MOCK_CLIENTS.reduce((s, c) => s + c.monthlyRevenue[5], 0);
  const prevRev = MOCK_CLIENTS.reduce((s, c) => s + c.monthlyRevenue[0], 0);
  const delta = Math.round(((totalRev - prevRev) / prevRev) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Revenue Growth Tracker</h1>
        <p className="text-sm text-white/50 mt-1">Revenue trend per client — last 6 months.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 bg-white/[0.04]"><CardContent className="p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Total MRR</p>
          <p className="text-2xl font-bold text-white mt-1">${(totalRev / 1000).toFixed(1)}K</p>
        </CardContent></Card>
        <Card className="border-0 bg-white/[0.04]"><CardContent className="p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">6-Month Δ</p>
          <p className={`text-2xl font-bold mt-1 ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>{delta >= 0 ? "+" : ""}{delta}%</p>
        </CardContent></Card>
        <Card className="border-0 bg-white/[0.04]"><CardContent className="p-4">
          <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Growing Clients</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{MOCK_CLIENTS.filter(c => c.revenueTrend === "up").length}/{MOCK_CLIENTS.length}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_CLIENTS.map(c => {
          const first = c.monthlyRevenue[0];
          const last = c.monthlyRevenue[5];
          const pct = Math.round(((last - first) / first) * 100);
          const Icon = c.revenueTrend === "up" ? TrendingUp : c.revenueTrend === "down" ? TrendingDown : Minus;
          const color = c.revenueTrend === "up" ? "hsl(152 60% 55%)" : c.revenueTrend === "down" ? "hsl(0 72% 61%)" : "hsl(210 20% 60%)";
          return (
            <Card key={c.id} className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm text-white">{c.name}</CardTitle>
                    <p className="text-[10px] text-white/40 uppercase mt-0.5">{c.industry}</p>
                  </div>
                  <div className="flex items-center gap-1.5" style={{ color }}>
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-bold">{pct >= 0 ? "+" : ""}{pct}%</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={c.monthlyRevenue.map((v, i) => ({ m: i, v }))}>
                      <YAxis hide domain={["auto", "auto"]} />
                      <Tooltip
                        contentStyle={{ background: "hsl(220 30% 12%)", border: "1px solid hsla(211,96%,60%,.2)", borderRadius: 8, fontSize: 11 }}
                        formatter={(v: any) => [`$${v.toLocaleString()}`, "Revenue"]}
                        labelFormatter={() => ""}
                      />
                      <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-white/40">6 mo ago: <span className="text-white/70">${first.toLocaleString()}</span></span>
                  <span className="text-white/40">Current: <span className="text-white font-semibold">${last.toLocaleString()}</span></span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
