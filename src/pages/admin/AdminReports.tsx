import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, TrendingUp, DollarSign, Users, Download, BarChart3, Crown, Zap } from "lucide-react";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const clientPerformance = [
  { name: "Bright Dental", revenue: 58300, leads: 142, growth: "+18%", rank: 1 },
  { name: "AutoPro Motors", revenue: 52100, leads: 128, growth: "+24%", rank: 2 },
  { name: "Sunrise Café", revenue: 41800, leads: 96, growth: "+12%", rank: 3 },
  { name: "Peak Fitness", revenue: 38200, leads: 88, growth: "+15%", rank: 4 },
  { name: "Metro Plumbing", revenue: 34600, leads: 74, growth: "+9%", rank: 5 },
  { name: "Coastal Realty", revenue: 29400, leads: 62, growth: "+7%", rank: 6 },
];

const revenueChart = clientPerformance.map((c) => ({ name: c.name.split(" ")[0], revenue: c.revenue }));

const chartTooltipStyle = {
  contentStyle: {
    background: "hsl(222, 30%, 12%)",
    border: "1px solid hsla(211,96%,60%,.2)",
    borderRadius: "12px",
    color: "white",
    fontSize: "12px",
  },
};

const stats = [
  { label: "Total Reports Generated", value: "72", icon: FileText, color: "hsl(var(--nl-sky))" },
  { label: "Active Clients Reporting", value: "12", icon: Users, color: "hsl(var(--nl-electric))" },
  { label: "Total Revenue Tracked", value: "$254K", icon: DollarSign, color: "hsl(var(--nl-neon))" },
  { label: "Avg Growth Rate", value: "+14.2%", icon: TrendingUp, color: "hsl(var(--nl-cyan))" },
];

export default function AdminReports() {
  const [period, setPeriod] = useState("monthly");

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports Overview</h1>
          <p className="text-sm text-white/50 mt-1">Cross-client performance reporting</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] bg-white/[0.06] border-white/10 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white gap-1.5">
            <Download className="h-4 w-4" /> Export All
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/80">Revenue by Client</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(211,96%,60%,.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsla(0,0%,100%,.4)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsla(0,0%,100%,.4)" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip {...chartTooltipStyle} formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Bar dataKey="revenue" fill="hsl(211, 96%, 56%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Client rankings */}
        <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/80">Client Performance Rankings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {clientPerformance.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0"
              >
                <div className="h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{
                  background: i < 3 ? "hsla(211,96%,60%,.15)" : "hsla(0,0%,100%,.05)",
                  color: i < 3 ? "hsl(var(--nl-sky))" : "hsla(0,0%,100%,.4)"
                }}>
                  {i < 3 ? <Crown className="h-3 w-3" /> : c.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white/80 font-medium">{c.name}</span>
                </div>
                <span className="text-sm tabular-nums text-white/60 font-medium">${(c.revenue / 1000).toFixed(1)}k</span>
                <Badge
                  className="text-[10px] px-1.5 py-0 border-0"
                  style={{
                    background: "hsla(197,92%,68%,.12)",
                    color: "hsl(var(--nl-sky))"
                  }}
                >
                  {c.growth}
                </Badge>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
