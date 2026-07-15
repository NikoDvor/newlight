import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Calendar, Handshake, DollarSign } from "lucide-react";
import { MOCK_CLIENTS } from "@/lib/clientHealthMock";

export default function AdminWinTracking() {
  const leaderboard = [...MOCK_CLIENTS].sort((a, b) => b.wins.deals - a.wins.deals);
  const totalAppts = MOCK_CLIENTS.reduce((s, c) => s + c.wins.appointments, 0);
  const totalDeals = MOCK_CLIENTS.reduce((s, c) => s + c.wins.deals, 0);
  const totalRev = MOCK_CLIENTS.reduce((s, c) => s + c.wins.revenue, 0);

  const feed = leaderboard.slice(0, 5).flatMap(c => [
    { client: c.name, action: `Closed deal — $${(c.wins.revenue / c.wins.deals || 0).toFixed(0)}`, time: "2h ago" },
    { client: c.name, action: `${c.wins.appointments} appointments booked this month`, time: "1d ago" },
  ]).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Win Tracking</h1>
        <p className="text-sm text-white/50 mt-1">Appointments booked and deals closed across all clients.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Appointments", value: totalAppts, icon: Calendar, color: "hsl(211 96% 62%)" },
          { label: "Deals Closed", value: totalDeals, icon: Handshake, color: "hsl(152 60% 55%)" },
          { label: "Revenue Generated", value: `$${(totalRev / 1000).toFixed(1)}K`, icon: DollarSign, color: "hsl(197 88% 58%)" },
        ].map(s => (
          <Card key={s.label} className="border-0 bg-white/[0.04]"><CardContent className="p-4 flex items-center gap-3">
            <s.icon className="h-5 w-5" style={{ color: s.color }} />
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{s.label}</p>
              <p className="text-2xl font-bold text-white">{s.value}</p>
            </div>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader><CardTitle className="text-sm font-semibold text-white/80 flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-400" /> Leaderboard</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 p-2 rounded-md bg-white/[0.03]">
                <span className="w-6 text-center text-sm font-bold" style={{ color: i === 0 ? "hsl(45 100% 60%)" : "hsl(210 20% 60%)" }}>#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{c.name}</p>
                  <p className="text-[10px] text-white/40">{c.wins.appointments} appts · ${c.wins.revenue.toLocaleString()}</p>
                </div>
                <span className="text-sm font-bold text-emerald-400">{c.wins.deals}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader><CardTitle className="text-sm font-semibold text-white/80">Recent Wins</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {feed.map((f, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-white/[0.03] border-l-2 border-emerald-500/50">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white">{f.client}</p>
                  <p className="text-[11px] text-white/50">{f.action}</p>
                </div>
                <span className="text-[10px] text-white/30">{f.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
