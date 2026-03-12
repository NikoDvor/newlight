import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { motion } from "framer-motion";
import {
  Activity, Globe, Search, Share2, Users, Star, Megaphone,
  Heart, Shield, TrendingUp, CheckCircle, AlertTriangle, XCircle
} from "lucide-react";

const healthCategories = [
  { name: "Website Health", score: 82, status: "Good", icon: Globe, detail: "Load speed: 2.1s | Uptime: 99.8% | Mobile score: 91" },
  { name: "SEO Health", score: 68, status: "Warning", icon: Search, detail: "Rankings dropped on 3 terms | 12 indexing issues | Backlinks: 142" },
  { name: "Social Activity", score: 54, status: "Critical", icon: Share2, detail: "Posts this month: 6 | Avg engagement: 2.1% | Competitors avg: 18 posts" },
  { name: "CRM Conversion Health", score: 76, status: "Good", icon: Users, detail: "Conversion rate: 4.2% | Pipeline: $142K | Follow-up rate: 78%" },
  { name: "Review Reputation", score: 71, status: "Warning", icon: Star, detail: "Rating: 4.2★ | Reviews this month: 3 | Industry avg: 4.6★" },
  { name: "Ad Performance", score: 85, status: "Good", icon: Megaphone, detail: "ROAS: 3.8x | CPL: $24 | Active campaigns: 4" },
];

const statusIcon = (status: string) => {
  if (status === "Good") return <CheckCircle className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />;
  if (status === "Warning") return <AlertTriangle className="h-4 w-4" style={{ color: "hsl(211 80% 65%)" }} />;
  return <XCircle className="h-4 w-4" style={{ color: "hsl(222 68% 44%)" }} />;
};

const scoreColor = (score: number) => {
  if (score >= 75) return "hsl(211 96% 56%)";
  if (score >= 50) return "hsl(211 80% 65%)";
  return "hsl(222 68% 44%)";
};

export default function BusinessHealth() {
  const overallScore = Math.round(healthCategories.reduce((s, c) => s + c.score, 0) / healthCategories.length);

  return (
    <div>
      <PageHeader title="Business Health" description="Complete health overview of your business systems" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Overall Health Score" value={`${overallScore}`} change="Across all systems" changeType="positive" icon={Activity} />
        <MetricCard label="Systems Healthy" value={`${healthCategories.filter(c => c.status === "Good").length}/${healthCategories.length}`} change="Systems performing well" changeType="positive" icon={Shield} />
        <MetricCard label="Issues Detected" value={`${healthCategories.filter(c => c.status !== "Good").length}`} change="Need attention" changeType="neutral" icon={AlertTriangle} />
        <MetricCard label="Growth Potential" value="+38%" change="If all issues resolved" changeType="positive" icon={TrendingUp} />
      </WidgetGrid>

      {/* Overall Score Visual */}
      <DataCard title="Business Health Overview" className="mt-6">
        <div className="flex items-center justify-center py-6">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="absolute inset-0" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="56" fill="none" stroke="hsla(211,96%,56%,.1)" strokeWidth="8" />
              <circle cx="64" cy="64" r="56" fill="none" stroke={scoreColor(overallScore)} strokeWidth="8"
                strokeDasharray={`${overallScore * 3.52} ${352 - overallScore * 3.52}`}
                strokeDashoffset="88" strokeLinecap="round" />
            </svg>
            <div className="text-center">
              <span className="metric-value text-4xl">{overallScore}</span>
              <p className="text-xs text-muted-foreground mt-1">Score</p>
            </div>
          </div>
        </div>
      </DataCard>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {healthCategories.map((cat, i) => (
          <motion.div
            key={cat.name}
            className="card-widget"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ y: -3 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <cat.icon className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {statusIcon(cat.status)}
                    <span className="text-[10px] font-semibold" style={{ color: scoreColor(cat.score) }}>{cat.status}</span>
                  </div>
                </div>
              </div>
              <span className="metric-value text-2xl">{cat.score}</span>
            </div>
            <div className="w-full h-1.5 rounded-full mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: scoreColor(cat.score) }}
                initial={{ width: 0 }}
                whileInView={{ width: `${cat.score}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.05 }}
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{cat.detail}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
