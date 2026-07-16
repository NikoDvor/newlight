import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Sparkles, TrendingUp } from "lucide-react";
import {
  Bar, BarChart, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  MOCK_ACQUISITION_CLIENTS, closeRate, bookingRate, severityColor,
} from "@/lib/clientAcquisitionMock";

// Scope this client-facing page to a single client's own data.
// Uses Sunrise Med Spa as the mock source; the "sourcedBy" BDR field is
// intentionally omitted — that's admin-only info.
const client =
  MOCK_ACQUISITION_CLIENTS.find((c) => c.name === "Sunrise Med Spa") ??
  MOCK_ACQUISITION_CLIENTS[0];

const TOOLTIP_STYLE = {
  background: "hsl(220 35% 10%)",
  border: "1px solid hsla(211,96%,60%,.25)",
  borderRadius: 8,
  fontSize: 12,
};

export default function TrackingAttribution() {
  const cr = closeRate(client);
  const br = bookingRate(client);
  const trendData = client.appointmentsTrend.map((v, i) => ({
    month: ["6mo", "5mo", "4mo", "3mo", "2mo", "Now"][i],
    appts: v,
  }));
  const first = client.appointmentsTrend[0];
  const last = client.appointmentsTrend[client.appointmentsTrend.length - 1];
  const trendPct = first > 0 ? Math.round(((last - first) / first) * 100) : 0;

  // Deterministic client-specific recommendation from this client's mocked mix.
  const topChannel = [...client.trafficSources].sort((a, b) => b.views - a.views)[0];
  const underused = [...client.trafficSources].sort((a, b) => a.views - b.views)[0];
  const recommendation =
    client.bottlenecks.length > 0
      ? `Your funnel is converting ${cr}% of booked appointments, but ${client.bottlenecks[0].label.toLowerCase()} is capping revenue. Prioritize fixing that before scaling ${topChannel.channel} spend.`
      : `${topChannel.channel} is driving the majority of your traffic (${topChannel.views.toLocaleString()} views) and your close rate is a healthy ${cr}%. Consider testing incremental spend into ${underused.channel} — it's currently your smallest source and represents untapped diversification.`;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Revenue Attribution & Tracking"
        description="Connect every touchpoint to revenue and understand what drives conversions."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Views" value={client.totalViews.toLocaleString()} accent="hsl(211 96% 62%)" />
        <StatCard label="Appointments" value={client.appointments.toString()} accent="hsl(280 70% 65%)" sub={`${trendPct >= 0 ? "+" : ""}${trendPct}% vs 6mo ago`} />
        <StatCard label="Booking Rate" value={`${br}%`} accent="hsl(197 92% 68%)" sub="views → appointments" />
        <StatCard label="Close Rate" value={`${cr}%`} accent="hsl(38 92% 60%)" sub={`${client.closedWon} closed won`} />
      </div>

      {/* Recommendation */}
      <Card className="border-0" style={{ background: "hsla(211,96%,60%,.06)" }}>
        <CardContent className="p-4 flex gap-3 items-start">
          <div className="p-2 rounded-full shrink-0" style={{ background: "hsla(211,96%,60%,.14)" }}>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-primary/80 font-semibold">Recommendation</p>
            <p className="text-sm text-white/85 mt-1 leading-relaxed">{recommendation}</p>
          </div>
        </CardContent>
      </Card>

      {/* Detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Traffic sources donut */}
        <Card className="border-0 bg-white/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-white/70 uppercase tracking-wider">Traffic Sources</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={client.trafficSources}
                    dataKey="views"
                    nameKey="channel"
                    cx="50%" cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {client.trafficSources.map((s) => (
                      <Cell key={s.channel} fill={s.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "white" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {client.trafficSources.map((s) => (
                <div key={s.channel} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-white/70">{s.channel}</span>
                  </div>
                  <span className="text-white/50 tabular-nums">{s.views.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Appointments trend */}
        <Card className="border-0 bg-white/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" /> Appointments — 6mo Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="month" stroke="hsl(0 0% 100% / 0.3)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(0 0% 100% / 0.3)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "white" }} />
                  <Line type="monotone" dataKey="appts" stroke="hsl(211 96% 62%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(211 96% 62%)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <MiniStat label="Appointments" value={client.appointments.toString()} color="hsl(211 96% 62%)" />
              <MiniStat label="Closed Won" value={client.closedWon.toString()} color="hsl(152 60% 55%)" />
              <MiniStat label="Close Rate" value={`${cr}%`} color="hsl(38 92% 60%)" />
              <MiniStat label="Booking Rate" value={`${br}%`} color="hsl(280 70% 65%)" />
            </div>
          </CardContent>
        </Card>

        {/* Bottlenecks + channel breakdown */}
        <Card className="border-0 bg-white/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> Bottlenecks
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {client.bottlenecks.length === 0 ? (
              <div className="text-xs text-emerald-300/80 bg-emerald-500/10 border border-emerald-500/20 rounded-md p-3">
                No bottlenecks detected. Funnel performing within expected range.
              </div>
            ) : (
              client.bottlenecks.map((b, i) => {
                const col = severityColor(b.severity);
                return (
                  <div key={i} className={`rounded-md p-3 border ${col.bg} ${col.border}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${col.text}`}>{b.severity}</span>
                      <span className={`text-xs font-semibold ${col.text}`}>{b.label}</span>
                    </div>
                    <p className="text-[11px] text-white/60 mt-1 leading-relaxed">{b.detail}</p>
                  </div>
                );
              })
            )}

            <div className="pt-2 mt-2 border-t border-white/[0.06]">
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Channel breakdown</p>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={client.trafficSources} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="channel" stroke="hsl(0 0% 100% / 0.5)" tick={{ fontSize: 9 }} width={100} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="views" radius={[0, 4, 4, 0]}>
                      {client.trafficSources.map((s) => (
                        <Cell key={s.channel} fill={s.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, sub }: { label: string; value: string; accent: string; sub?: string }) {
  return (
    <Card className="border-0 bg-white/[0.03]">
      <CardContent className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">{label}</p>
        <p className="text-2xl font-semibold mt-1 tabular-nums" style={{ color: accent }}>{value}</p>
        {sub && <p className="text-[11px] text-white/50 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-md p-2 bg-white/[0.03]">
      <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
      <p className="text-base font-semibold tabular-nums" style={{ color }}>{value}</p>
    </div>
  );
}
