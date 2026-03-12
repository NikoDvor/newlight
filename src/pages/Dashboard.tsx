import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { SystemStatusBar } from "@/components/SystemStatusBar";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Activity, TrendingUp, DollarSign, CheckSquare, Brain,
  Heart, Target, Zap, Globe, Search, Megaphone, Share2, Users, Star,
  ArrowUpRight
} from "lucide-react";
import { HealthScoreWidget } from "@/components/HealthScoreWidget";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { PredictiveGrowth } from "@/components/PredictiveGrowth";
import { RevenueCalculator } from "@/components/RevenueCalculator";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const trafficData = [
  { name: "Mon", visitors: 1200, leads: 32 },
  { name: "Tue", visitors: 1800, leads: 45 },
  { name: "Wed", visitors: 2100, leads: 52 },
  { name: "Thu", visitors: 1900, leads: 48 },
  { name: "Fri", visitors: 2400, leads: 61 },
  { name: "Sat", visitors: 1600, leads: 38 },
  { name: "Sun", visitors: 1400, leads: 30 },
];

const priorityActions = [
  { task: "Fix homepage load speed", impact: "$4,200/mo", icon: Globe },
  { task: "Launch retargeting ads", impact: "$5,100/mo", icon: Megaphone },
  { task: "Increase social posting", impact: "$2,800/mo", icon: Share2 },
  { task: "Respond to negative reviews", impact: "$1,500/mo", icon: Star },
];

const activityItems = [
  { action: "New lead entered CRM", detail: "Sarah Johnson via Google Ads", time: "2 min ago", icon: Users },
  { action: "AI discovered SEO issue", detail: "Page speed regression on /services", time: "5 min ago", icon: Search },
  { action: "Review request sent", detail: "Automated request to Mike Chen", time: "12 min ago", icon: Star },
  { action: "Competitor trend updated", detail: "Competitor A increased ad spend 40%", time: "18 min ago", icon: TrendingUp },
  { action: "Social post scheduled", detail: "Instagram carousel for tomorrow", time: "25 min ago", icon: Share2 },
];

const insights = [
  { text: "Your landing page conversion rate is below target (2.1% vs 4% goal)", severity: "Critical", module: "Website" },
  { text: "Review growth slowed — only 3 reviews this month vs avg 8", severity: "High", module: "Reviews" },
  { text: "SEO visibility dropped on 3 key terms this week", severity: "High", module: "SEO" },
  { text: "Ad cost per lead increased 22% over past 2 weeks", severity: "Medium", module: "Ads" },
];

const growthSystems = [
  { name: "Website", icon: Globe, score: 82, url: "/website", status: "Healthy" },
  { name: "SEO", icon: Search, score: 68, url: "/seo", status: "Warning" },
  { name: "Ads", icon: Megaphone, score: 85, url: "/paid-ads", status: "Healthy" },
  { name: "Social Media", icon: Share2, score: 54, url: "/social-media", status: "Critical" },
  { name: "CRM", icon: Users, score: 76, url: "/crm", status: "Healthy" },
  { name: "Reviews", icon: Star, score: 71, url: "/reviews", status: "Warning" },
];

const severityStyle = (s: string) =>
  s === "Critical" ? { bg: "hsla(215,75%,48%,.1)", text: "hsl(215 75% 42%)" }
  : s === "High" ? { bg: "hsla(211,96%,56%,.1)", text: "hsl(211 96% 46%)" }
  : { bg: "hsla(210,40%,94%,.6)", text: "hsl(215 16% 50%)" };

const scoreColor = (s: number) => s >= 75 ? "hsl(211 96% 56%)" : s >= 50 ? "hsl(211 80% 65%)" : "hsl(222 68% 44%)";

export default function Dashboard() {
  return (
    <div>
      <PageHeader title="Dashboard" description="Your AI-powered business command center" />

      {/* Health Score + Onboarding */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <HealthScoreWidget score={73} />
        <div className="lg:col-span-2">
          <OnboardingProgress steps={{
            business_info: true, website_connected: true, google_business_connected: true,
            review_platform_connected: false, ad_account_connected: false,
            crm_setup: true, team_setup: false, launch_ready: false,
          }} />
        </div>
      </div>

      {/* Row 1: Top Metrics */}
      <WidgetGrid columns="repeat(auto-fit, minmax(180px, 1fr))">
        <MetricCard label="Business Health" value="73" change="Across all systems" changeType="positive" icon={Heart} />
        <MetricCard label="Revenue Opportunities" value="$42.6K" change="Missed monthly revenue" changeType="neutral" icon={DollarSign} />
        <MetricCard label="Leads Generated" value="306" change="+18% vs last month" changeType="positive" icon={Target} />
        <MetricCard label="Conversion Rate" value="4.2%" change="+0.4% this week" changeType="positive" icon={TrendingUp} />
        <MetricCard label="Review Rating" value="4.2★" change="96 total reviews" changeType="neutral" icon={Star} />
        <MetricCard label="Active Campaigns" value="4" change="Ads running" changeType="positive" icon={Megaphone} />
      </WidgetGrid>

      {/* System Status */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Brain className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
          System Status
        </h3>
        <SystemStatusBar />
      </div>

      {/* Row 2: Priority Actions + Activity Feed + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <DataCard title="Priority Actions">
          <div className="space-y-2">
            {priorityActions.map((a, i) => (
              <motion.div key={i} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-primary/[0.03] transition-colors"
                initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <a.icon className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{a.task}</p>
                  <p className="text-[10px] font-semibold" style={{ color: "hsl(197 92% 48%)" }}>Est. {a.impact}</p>
                </div>
              </motion.div>
            ))}
            <Link to="/priority-actions" className="flex items-center gap-1 text-[11px] font-medium pt-2" style={{ color: "hsl(211 96% 56%)" }}>
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </DataCard>

        <DataCard title="Live Activity">
          <div className="space-y-2">
            {activityItems.map((item, i) => (
              <motion.div key={i} className="flex items-start gap-2.5 py-1.5"
                initial={{ opacity: 0, x: -4 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                <div className="mt-0.5 h-6 w-6 rounded-md flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <item.icon className="h-3 w-3" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">{item.action}</p>
                  <p className="text-[10px] text-muted-foreground">{item.detail} · {item.time}</p>
                </div>
              </motion.div>
            ))}
            <Link to="/live-activity" className="flex items-center gap-1 text-[11px] font-medium pt-2" style={{ color: "hsl(211 96% 56%)" }}>
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </DataCard>

        <DataCard title="AI Insights">
          <div className="space-y-2">
            {insights.map((item, i) => {
              const style = severityStyle(item.severity);
              return (
                <motion.div key={i} className="py-2 border-b last:border-0" style={{ borderColor: "hsla(211,96%,56%,.06)" }}
                  initial={{ opacity: 0, y: 4 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: style.bg, color: style.text }}>{item.severity}</span>
                    <span className="text-[9px] text-muted-foreground">{item.module}</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{item.text}</p>
                </motion.div>
              );
            })}
            <Link to="/ai-insights" className="flex items-center gap-1 text-[11px] font-medium pt-2" style={{ color: "hsl(211 96% 56%)" }}>
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </DataCard>
      </div>

      {/* Row 3: Traffic Chart */}
      <DataCard title="Traffic & Leads" className="mt-6">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trafficData}>
            <defs>
              <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(211 96% 56%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(211 96% 56%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(197 92% 58%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(197 92% 58%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsla(211,96%,56%,.06)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(215 16% 50%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(215 16% 50%)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "hsla(210,50%,99%,.95)", border: "1px solid hsla(211,96%,56%,.12)", borderRadius: "12px", fontSize: "12px" }} />
            <Area type="monotone" dataKey="visitors" stroke="hsl(211 96% 56%)" fill="url(#colorVisitors)" strokeWidth={2} animationDuration={1500} />
            <Area type="monotone" dataKey="leads" stroke="hsl(197 92% 58%)" fill="url(#colorLeads)" strokeWidth={2} animationDuration={1800} />
          </AreaChart>
        </ResponsiveContainer>
      </DataCard>

      {/* Row 4: Growth Systems */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
          Growth Systems
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {growthSystems.map((sys, i) => (
            <Link key={sys.name} to={sys.url}>
              <motion.div className="card-widget text-center cursor-pointer"
                initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}
                whileHover={{ y: -3, scale: 1.02 }}>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <sys.icon className="h-5 w-5" style={{ color: scoreColor(sys.score) }} />
                </div>
                <p className="text-xs font-semibold text-foreground">{sys.name}</p>
                <p className="metric-value text-lg mt-0.5">{sys.score}</p>
                <p className="text-[9px] font-semibold mt-0.5" style={{ color: scoreColor(sys.score) }}>{sys.status}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
      {/* Revenue Calculator */}
      <div className="mt-6">
        <RevenueCalculator />
      </div>

      {/* Predictive Growth */}
      <div className="mt-6">
        <PredictiveGrowth />
      </div>
    </div>
  );
}
