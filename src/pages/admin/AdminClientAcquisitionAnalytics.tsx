import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import {
  TrendingUp, Users, CalendarCheck, Target, AlertTriangle, ChevronDown, Eye,
  Sparkles, Trophy, Zap, Lightbulb,
} from "lucide-react";
import {
  MOCK_ACQUISITION_CLIENTS, AcquisitionClient,
  closeRate, bookingRate, severityColor,
} from "@/lib/clientAcquisitionMock";

interface ChannelAggregate {
  channel: string;
  color: string;
  views: number;
  attributedAppts: number;
  attributedClosed: number;
  closeRate: number; // %
  viewShare: number; // % of total roster views
  score: number; // combined ranking score
  label: string;
}

function useMarketInsights() {
  return useMemo(() => {
    const map = new Map<string, ChannelAggregate>();
    let totalViews = 0;

    for (const client of MOCK_ACQUISITION_CLIENTS) {
      totalViews += client.totalViews;
      for (const src of client.trafficSources) {
        const share = client.totalViews > 0 ? src.views / client.totalViews : 0;
        const prev = map.get(src.channel) ?? {
          channel: src.channel, color: src.color, views: 0,
          attributedAppts: 0, attributedClosed: 0, closeRate: 0, viewShare: 0, score: 0, label: "",
        };
        prev.views += src.views;
        prev.attributedAppts += share * client.appointments;
        prev.attributedClosed += share * client.closedWon;
        map.set(src.channel, prev);
      }
    }

    const channels = Array.from(map.values()).map((c) => ({
      ...c,
      closeRate: c.attributedAppts > 0 ? (c.attributedClosed / c.attributedAppts) * 100 : 0,
      viewShare: totalViews > 0 ? (c.views / totalViews) * 100 : 0,
    }));

    const maxViews = Math.max(...channels.map((c) => c.views), 1);
    const maxClose = Math.max(...channels.map((c) => c.closeRate), 1);

    for (const c of channels) {
      const volNorm = c.views / maxViews;
      const convNorm = c.closeRate / maxClose;
      c.score = Math.round((volNorm * 0.5 + convNorm * 0.5) * 100);
      const highVol = volNorm >= 0.66;
      const midVol = volNorm >= 0.33;
      const highConv = convNorm >= 0.66;
      const midConv = convNorm >= 0.33;
      if (highVol && highConv) c.label = "Balanced performer";
      else if (highVol && !midConv) c.label = "High volume, low conversion";
      else if (!midVol && highConv) c.label = "Low volume, high conversion";
      else if (midVol && midConv) c.label = "Steady contributor";
      else if (highVol) c.label = "Volume-driven";
      else if (highConv) c.label = "Conversion-driven";
      else c.label = "Underperforming";
    }

    const topByViews = [...channels].sort((a, b) => b.views - a.views)[0];
    const topByClose = [...channels].sort((a, b) => b.closeRate - a.closeRate)[0];
    const ranked = [...channels].sort((a, b) => b.score - a.score);

    return { channels, ranked, topByViews, topByClose, totalViews };
  }, []);
}

function buildRecommendation(i: ReturnType<typeof useMarketInsights>): string {
  const { topByClose, topByViews } = i;
  const variants = [
    `${topByClose.channel} traffic is converting at ${topByClose.closeRate.toFixed(1)}% — roughly ${(topByClose.closeRate / Math.max(topByViews.closeRate, 0.1)).toFixed(1)}x ${topByViews.channel} — yet only accounts for ${topByClose.viewShare.toFixed(0)}% of total views. Shifting acquisition investment toward ${topByClose.channel} should meaningfully lift roster-wide close rates.`,
    `${topByViews.channel} drives the majority of top-of-funnel volume (${topByViews.viewShare.toFixed(0)}% of views) but converts at only ${topByViews.closeRate.toFixed(1)}%. Prioritize funnel + landing optimizations on ${topByViews.channel} clients while doubling down on ${topByClose.channel} as the highest-quality source.`,
    `Roster analysis shows a clear volume-vs-conversion gap: ${topByViews.channel} leads in reach, ${topByClose.channel} leads in close rate. Recommended play is a 60/40 split — protect ${topByViews.channel} spend, aggressively grow ${topByClose.channel} presence across new client onboardings.`,
  ];
  // Deterministic pick so mock stays stable per render session.
  return variants[0];
}



export default function AdminClientAcquisitionAnalytics() {
  const [expandedId, setExpandedId] = useState<string | null>(MOCK_ACQUISITION_CLIENTS[0]?.id ?? null);

  const totals = useMemo(() => {
    const views = MOCK_ACQUISITION_CLIENTS.reduce((s, c) => s + c.totalViews, 0);
    const appts = MOCK_ACQUISITION_CLIENTS.reduce((s, c) => s + c.appointments, 0);
    const closed = MOCK_ACQUISITION_CLIENTS.reduce((s, c) => s + c.closedWon, 0);
    const avgClose = appts > 0 ? Math.round((closed / appts) * 1000) / 10 : 0;
    return { views, appts, closed, avgClose };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Client Acquisition Analytics</h1>
        <p className="text-sm text-white/50 mt-1">
          Traffic sources, appointment flow, close rates and bottlenecks per client.
        </p>
      </div>

      <MarketInsights />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {[
          { label: "Total Views", value: totals.views.toLocaleString(), icon: Eye, color: "hsl(211 96% 62%)" },
          { label: "Appointments", value: totals.appts.toLocaleString(), icon: CalendarCheck, color: "hsl(280 70% 65%)" },
          { label: "Closed Won", value: totals.closed.toLocaleString(), icon: Target, color: "hsl(152 60% 55%)" },
          { label: "Avg Close Rate", value: `${totals.avgClose}%`, icon: TrendingUp, color: "hsl(38 92% 60%)" },
        ].map((s) => (
          <Card key={s.label} className="border-0 bg-white/[0.04]">
            <CardContent className="p-4 flex items-start justify-between">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{s.label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
              </div>
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 bg-white/[0.04] overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-white/80 flex items-center gap-2">
            <Users className="h-4 w-4" /> Client Roster — click to expand
          </CardTitle>
        </CardHeader>
        <div className="divide-y divide-white/[0.04]">
          {MOCK_ACQUISITION_CLIENTS.map((c) => (
            <ClientRow
              key={c.id}
              client={c}
              expanded={expandedId === c.id}
              onToggle={() => setExpandedId((prev) => (prev === c.id ? null : c.id))}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

function ClientRow({
  client, expanded, onToggle,
}: { client: AcquisitionClient; expanded: boolean; onToggle: () => void }) {
  const cr = closeRate(client);
  const br = bookingRate(client);
  const crColor = cr >= 35 ? "text-emerald-300" : cr >= 20 ? "text-amber-300" : "text-red-300";
  const flagCount = client.bottlenecks.length;

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-12 gap-3 items-center px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="col-span-3 flex items-center gap-3 min-w-0">
          <ChevronDown className={`h-3.5 w-3.5 text-white/40 transition-transform ${expanded ? "" : "-rotate-90"}`} />
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{client.name}</p>
            <p className="text-white/40 text-xs truncate">{client.industry}</p>
          </div>
        </div>
        <div className="col-span-2 flex items-center gap-2 min-w-0">
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
            style={{ background: `${client.sourcedBy.color}22`, color: client.sourcedBy.color, boxShadow: `inset 0 0 0 1px ${client.sourcedBy.color}55` }}
          >
            {client.sourcedBy.initial}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Sourced by</p>
            <p className="text-xs text-white/80 truncate">{client.sourcedBy.name}</p>
          </div>
        </div>
        <MetricCell label="Views" value={client.totalViews.toLocaleString()} />
        <MetricCell label="Appointments" value={client.appointments.toString()} />
        <MetricCell label="Booking %" value={`${br}%`} />
        <MetricCell label="Close %" value={`${cr}%`} valueClass={crColor} />
        <div className="col-span-1 flex justify-end">
          {flagCount > 0 ? (
            <Badge variant="outline" className="border-red-500/30 text-red-300 bg-red-500/10 gap-1">
              <AlertTriangle className="h-3 w-3" /> {flagCount}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
              Healthy
            </Badge>
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <ClientDetail client={client} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricCell({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="col-span-1">
      <p className="text-[10px] text-white/40 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

function ClientDetail({ client }: { client: AcquisitionClient }) {
  const trendData = client.appointmentsTrend.map((v, i) => ({
    month: ["6mo", "5mo", "4mo", "3mo", "2mo", "Now"][i], appts: v,
  }));

  return (
    <div className="px-4 pb-5 pt-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                <Tooltip
                  contentStyle={{ background: "hsl(220 35% 10%)", border: "1px solid hsla(211,96%,60%,.25)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "white" }}
                />
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

      <Card className="border-0 bg-white/[0.03]">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-white/70 uppercase tracking-wider">Appointments — 6mo Trend</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis dataKey="month" stroke="hsl(0 0% 100% / 0.3)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis stroke="hsl(0 0% 100% / 0.3)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{ background: "hsl(220 35% 10%)", border: "1px solid hsla(211,96%,60%,.25)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "white" }}
                />
                <Line type="monotone" dataKey="appts" stroke="hsl(211 96% 62%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(211 96% 62%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <StatBox label="Appointments" value={client.appointments.toString()} color="hsl(211 96% 62%)" />
            <StatBox label="Closed Won" value={client.closedWon.toString()} color="hsl(152 60% 55%)" />
            <StatBox label="Close Rate" value={`${closeRate(client)}%`} color="hsl(38 92% 60%)" />
            <StatBox label="Booking Rate" value={`${bookingRate(client)}%`} color="hsl(280 70% 65%)" />
          </div>
        </CardContent>
      </Card>

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
                  <Tooltip contentStyle={{ background: "hsl(220 35% 10%)", border: "1px solid hsla(211,96%,60%,.25)", borderRadius: 8, fontSize: 12 }} />
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
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-md p-2 bg-white/[0.03]">
      <p className="text-[9px] text-white/40 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}
