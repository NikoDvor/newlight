import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Brain, TrendingUp, Target, Zap, ArrowUpRight, AlertTriangle,
  DollarSign, Globe, Search, Megaphone, Share2, Star, Users,
  CheckCircle2, ChevronRight, Lightbulb, BarChart3, Rocket
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from "recharts";

/* ─── Mock Data ─── */
const recommendations = [
  {
    priority: "Critical",
    title: "Invest more in Google Ads — highest ROI channel",
    explanation: "Google Ads delivers $6.20 per dollar spent, outperforming all other channels. Increasing budget by 30% could unlock significant growth.",
    impact: "Revenue could increase by $8,400/mo",
    action: "Increase Google Ads budget by 30%",
    revenue: "$8,400/mo",
    module: "/paid-ads",
    moduleName: "Ads",
    icon: Megaphone,
  },
  {
    priority: "Critical",
    title: "Review score is limiting trust and conversion",
    explanation: "Your current 4.2★ rating is below the 4.5★ trust threshold. Competitors average 4.6★, giving them an advantage in local search.",
    impact: "Improving to 4.5★ could lift conversions 15%",
    action: "Launch automated review request campaign",
    revenue: "$5,200/mo",
    module: "/reviews",
    moduleName: "Reviews",
    icon: Star,
  },
  {
    priority: "High",
    title: "Focus on SEO this quarter — organic traffic rising",
    explanation: "Organic traffic grew 22% last month with a 5.8% conversion rate, the highest of any channel.",
    impact: "Could become your top revenue channel",
    action: "Publish 4 SEO-optimized blog posts per month",
    revenue: "$6,100/mo",
    module: "/seo",
    moduleName: "SEO",
    icon: Search,
  },
  {
    priority: "High",
    title: "Referrals convert 2x higher than paid traffic",
    explanation: "Referral leads close at 18% vs 9% for paid. A structured referral program could double this channel.",
    impact: "Double referral volume in 60 days",
    action: "Build a referral incentive campaign",
    revenue: "$4,800/mo",
    module: "/crm",
    moduleName: "CRM",
    icon: Users,
  },
  {
    priority: "Medium",
    title: "Social media activity is low vs competitors",
    explanation: "You post 3x/week while competitors average 7x/week. Engagement is 40% below industry benchmarks.",
    impact: "Increased visibility and brand awareness",
    action: "Increase posting frequency to daily",
    revenue: "$2,800/mo",
    module: "/social-media",
    moduleName: "Social Media",
    icon: Share2,
  },
  {
    priority: "Medium",
    title: "Booking-to-close rate drops without 24hr follow-up",
    explanation: "Leads contacted within 24 hours close at 22%. After 48 hours, close rate drops to 8%.",
    impact: "Faster follow-up could rescue lost deals",
    action: "Set up automated 1-hour follow-up sequence",
    revenue: "$3,600/mo",
    module: "/automations",
    moduleName: "Automation",
    icon: Zap,
  },
];

const nextBestActions = [
  { action: "Launch retargeting ads", impact: "$5,100/mo", icon: Megaphone, module: "/paid-ads" },
  { action: "Improve homepage speed", impact: "$4,200/mo", icon: Globe, module: "/website" },
  { action: "Increase review requests", impact: "$3,800/mo", icon: Star, module: "/reviews" },
  { action: "Post more on Instagram", impact: "$2,800/mo", icon: Share2, module: "/social-media" },
  { action: "Follow up with leads faster", impact: "$3,600/mo", icon: Users, module: "/crm" },
  { action: "Improve booking funnel", impact: "$4,500/mo", icon: Target, module: "/crm" },
];

const strategyMetrics = [
  { label: "Top Growth Channel", value: "Google Ads", detail: "$6.20 ROI per $1 spent", icon: Megaphone },
  { label: "Weakest Area", value: "Social Media", detail: "Score: 54/100", icon: Share2 },
  { label: "Best Conversion Source", value: "Referrals", detail: "18% close rate", icon: Users },
  { label: "Highest ROI Channel", value: "SEO", detail: "$19,100 revenue, $0 ad spend", icon: Search },
  { label: "Largest Missed Revenue", value: "$42,600/mo", detail: "Across all channels", icon: DollarSign },
  { label: "Most Urgent Fix", value: "Review Score", detail: "4.2★ vs 4.5★ target", icon: AlertTriangle },
];

const goals = [
  { goal: "Increase monthly bookings by 20%", progress: 62, current: "124", target: "150" },
  { goal: "Increase conversion rate to 5%", progress: 84, current: "4.2%", target: "5%" },
  { goal: "Improve review score to 4.8★", progress: 52, current: "4.2★", target: "4.8★" },
  { goal: "Increase revenue from SEO by 40%", progress: 71, current: "$19.1K", target: "$26.7K" },
  { goal: "Reduce no-show rate to under 10%", progress: 45, current: "18%", target: "10%" },
];

const growthTrend = [
  { month: "Oct", score: 58 }, { month: "Nov", score: 62 }, { month: "Dec", score: 65 },
  { month: "Jan", score: 68 }, { month: "Feb", score: 71 }, { month: "Mar", score: 73 },
];

const channelROI = [
  { channel: "Google Ads", roi: 6.2 }, { channel: "SEO", roi: 8.4 },
  { channel: "Facebook", roi: 3.1 }, { channel: "Referrals", roi: 9.8 },
  { channel: "Social", roi: 1.4 },
];

const priorityColor = (p: string) =>
  p === "Critical" ? { bg: "hsla(215,75%,48%,.12)", text: "hsl(215 75% 42%)", border: "hsla(215,75%,48%,.2)" }
  : p === "High" ? { bg: "hsla(211,96%,56%,.1)", text: "hsl(211 96% 46%)", border: "hsla(211,96%,56%,.15)" }
  : { bg: "hsla(210,40%,94%,.6)", text: "hsl(215 16% 50%)", border: "hsla(210,40%,94%,.4)" };

export default function GrowthAdvisor() {
  return (
    <div>
      <PageHeader
        title="AI Growth Advisor"
        description="Your intelligent growth strategist — analyzing performance and recommending what to do next"
      />

      {/* AI Summary Banner */}
      <motion.div
        className="card-widget mb-6 relative overflow-hidden"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(135deg, hsla(211,96%,56%,.06) 0%, hsla(197,92%,68%,.04) 100%)"
        }} />
        <div className="relative flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{
            background: "hsla(211,96%,56%,.1)",
            boxShadow: "0 0 24px -4px hsla(211,96%,56%,.2)"
          }}>
            <Brain className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground mb-1">Growth Advisor Summary</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Based on your performance data, <strong className="text-foreground">Google Ads and SEO</strong> are your strongest growth channels.
              Your review score is limiting conversions — improving to 4.5★ could lift revenue by <strong className="text-foreground">$5,200/mo</strong>.
              Referrals convert 2x higher than paid traffic. Total missed revenue opportunity: <strong style={{ color: "hsl(211 96% 56%)" }}>$42,600/mo</strong>.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Strategy Dashboard */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
          Business Strategy View
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {strategyMetrics.map((m, i) => (
            <motion.div
              key={m.label}
              className="card-widget text-center"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="h-9 w-9 rounded-xl flex items-center justify-center mx-auto mb-2" style={{
                background: "hsla(211,96%,56%,.08)"
              }}>
                <m.icon className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium">{m.label}</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{m.value}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{m.detail}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Priority Recommendations + Next Best Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <DataCard title="Priority Recommendations">
            <div className="space-y-3">
              {recommendations.map((r, i) => {
                const style = priorityColor(r.priority);
                return (
                  <motion.div
                    key={i}
                    className="p-3 rounded-xl border transition-all hover:shadow-md"
                    style={{ borderColor: style.border, background: style.bg }}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{
                        background: "hsla(211,96%,56%,.1)"
                      }}>
                        <r.icon className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{
                            background: style.bg, color: style.text,
                            border: `1px solid ${style.border}`
                          }}>
                            {r.priority}
                          </span>
                          <span className="text-[9px] text-muted-foreground">{r.moduleName}</span>
                        </div>
                        <p className="text-xs font-semibold text-foreground mb-1">{r.title}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{r.explanation}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-semibold" style={{ color: "hsl(197 92% 48%)" }}>
                              Est. {r.revenue}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {r.impact}
                            </span>
                          </div>
                          <Link to={r.module} className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "hsl(211 96% 56%)" }}>
                            Take Action <ChevronRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </DataCard>
        </div>

        <div className="space-y-6">
          <DataCard title="Next Best Actions">
            <div className="space-y-2">
              {nextBestActions.map((a, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-primary/[0.03] transition-colors"
                  initial={{ opacity: 0, x: -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{
                    background: "hsla(211,96%,56%,.08)"
                  }}>
                    <a.icon className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{a.action}</p>
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(197 92% 48%)" }}>Est. {a.impact}</p>
                  </div>
                  <Link to={a.module}>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </DataCard>

          {/* Channel ROI Chart */}
          <DataCard title="Channel ROI">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={channelROI}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(211,96%,56%,.06)" />
                <XAxis dataKey="channel" tick={{ fontSize: 9, fill: "hsl(215 16% 50%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(215 16% 50%)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{
                  background: "hsla(210,50%,99%,.95)",
                  border: "1px solid hsla(211,96%,56%,.12)",
                  borderRadius: "12px", fontSize: "11px"
                }} />
                <Bar dataKey="roi" fill="hsl(211 96% 56%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </DataCard>
        </div>
      </div>

      {/* Goal Tracking + Growth Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DataCard title="AI-Suggested Goals">
          <div className="space-y-4">
            {goals.map((g, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-foreground">{g.goal}</p>
                  <span className="text-[10px] font-semibold" style={{ color: "hsl(211 96% 56%)" }}>
                    {g.progress}%
                  </span>
                </div>
                <Progress value={g.progress} className="h-1.5" />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-muted-foreground">Current: {g.current}</span>
                  <span className="text-[9px] text-muted-foreground">Target: {g.target}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Growth Score Trend">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growthTrend}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(211 96% 56%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(211 96% 56%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsla(211,96%,56%,.06)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(215 16% 50%)" }} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 100]} tick={{ fontSize: 10, fill: "hsl(215 16% 50%)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{
                background: "hsla(210,50%,99%,.95)",
                border: "1px solid hsla(211,96%,56%,.12)",
                borderRadius: "12px", fontSize: "12px"
              }} />
              <Area type="monotone" dataKey="score" stroke="hsl(211 96% 56%)" fill="url(#growthGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </DataCard>
      </div>
    </div>
  );
}
