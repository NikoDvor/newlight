import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { SystemStatusBar } from "@/components/SystemStatusBar";
import { ActivityFeed } from "@/components/ActivityFeed";
import { motion } from "framer-motion";
import {
  Activity, TrendingUp, DollarSign, CheckSquare,
  Calendar, BarChart3, ArrowUpRight, Brain
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
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

const conversionData = [
  { name: "Week 1", rate: 3.2 },
  { name: "Week 2", rate: 3.8 },
  { name: "Week 3", rate: 4.1 },
  { name: "Week 4", rate: 4.6 },
];

const adData = [
  { name: "Google", spend: 2400, leads: 89 },
  { name: "Facebook", spend: 1800, leads: 56 },
  { name: "LinkedIn", spend: 1200, leads: 34 },
  { name: "Instagram", spend: 900, leads: 28 },
];

const recentActivity = [
  { action: "New lead captured", detail: "Sarah Johnson — Google Ads", time: "2 min ago" },
  { action: "Campaign launched", detail: "Spring Promo — Email", time: "1 hour ago" },
  { action: "Review received", detail: "5 stars on Google", time: "3 hours ago" },
  { action: "Task completed", detail: "Update landing page copy", time: "5 hours ago" },
];

const upcomingMeetings = [
  { title: "Strategy Review", time: "Today, 2:00 PM", attendees: "Marketing Team" },
  { title: "Client Onboarding", time: "Tomorrow, 10:00 AM", attendees: "New Client Co." },
  { title: "Monthly Report Review", time: "Mar 15, 3:00 PM", attendees: "Account Manager" },
];

const tasks = [
  { title: "Review ad copy for Q2 campaign", priority: "High", due: "Today" },
  { title: "Approve social media calendar", priority: "Medium", due: "Tomorrow" },
  { title: "Update website hero section", priority: "Low", due: "Mar 16" },
  { title: "Prepare monthly report", priority: "High", due: "Mar 15" },
];

const priorityStyle = (p: string) =>
  p === "High"
    ? { bg: "hsla(215,75%,48%,.1)", text: "hsl(215 75% 42%)" }
    : p === "Medium"
    ? { bg: "hsla(211,96%,56%,.1)", text: "hsl(211 96% 46%)" }
    : { bg: "hsla(210,40%,94%,.6)", text: "hsl(215 16% 50%)" };

export default function Dashboard() {
  return (
    <div>
      <PageHeader title="Dashboard" description="Your AI-powered business command center" />

      {/* Top metrics */}
      <WidgetGrid columns="repeat(auto-fit, minmax(240px, 1fr))">
        <MetricCard label="Business Health Score" value="87" change="+5 from last month" changeType="positive" icon={Activity} />
        <MetricCard label="Revenue Pipeline" value="$142,800" change="+12.3% vs last month" changeType="positive" icon={DollarSign} />
        <MetricCard label="Marketing Performance" value="94.2%" change="+2.1% this week" changeType="positive" icon={TrendingUp} />
        <MetricCard label="Tasks Due" value="4" change="2 high priority" changeType="neutral" icon={CheckSquare} />
      </WidgetGrid>

      {/* System Status */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Brain className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
          System Status
        </h3>
        <SystemStatusBar />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <DataCard title="Traffic & Leads" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
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
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215 16% 50%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215 16% 50%)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "hsla(210,50%,99%,.95)",
                  border: "1px solid hsla(211,96%,56%,.12)",
                  borderRadius: "12px",
                  backdropFilter: "blur(12px)",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="visitors" stroke="hsl(211 96% 56%)" fill="url(#colorVisitors)" strokeWidth={2} animationDuration={1500} />
              <Area type="monotone" dataKey="leads" stroke="hsl(197 92% 58%)" fill="url(#colorLeads)" strokeWidth={2} animationDuration={1800} />
            </AreaChart>
          </ResponsiveContainer>
        </DataCard>

        <DataCard title="Conversion Rate">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={conversionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsla(211,96%,56%,.06)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(215 16% 50%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215 16% 50%)" }} axisLine={false} tickLine={false} domain={[2, 6]} unit="%" />
              <Tooltip
                contentStyle={{
                  background: "hsla(210,50%,99%,.95)",
                  border: "1px solid hsla(211,96%,56%,.12)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Line type="monotone" dataKey="rate" stroke="hsl(211 96% 56%)" strokeWidth={2.5} dot={{ fill: "hsl(211 96% 56%)", r: 4 }} animationDuration={1500} />
            </LineChart>
          </ResponsiveContainer>
        </DataCard>
      </div>

      {/* Ad Performance + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DataCard title="Ad Performance by Channel">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={adData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsla(211,96%,56%,.06)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215 16% 50%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215 16% 50%)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "hsla(210,50%,99%,.95)",
                  border: "1px solid hsla(211,96%,56%,.12)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="spend" fill="hsl(211 96% 56%)" radius={[6, 6, 0, 0]} animationDuration={1200} />
              <Bar dataKey="leads" fill="hsl(197 92% 58%)" radius={[6, 6, 0, 0]} animationDuration={1500} />
            </BarChart>
          </ResponsiveContainer>
        </DataCard>

        <ActivityFeed />
      </div>

      {/* Campaign + Notifications (existing) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DataCard title="Campaign Performance Overview">
          <div className="space-y-4">
            {[
              { name: "Spring Email Campaign", status: "Active", leads: 142, conversion: "4.2%" },
              { name: "Google Ads — Brand", status: "Active", leads: 89, conversion: "3.1%" },
              { name: "Facebook Retargeting", status: "Paused", leads: 56, conversion: "2.8%" },
              { name: "LinkedIn Outreach", status: "Active", leads: 34, conversion: "5.7%" },
            ].map((campaign) => (
              <div key={campaign.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{campaign.name}</p>
                  <span className={`text-xs font-medium`} style={{ color: campaign.status === "Active" ? "hsl(197 92% 48%)" : "hsl(215 16% 50%)" }}>
                    {campaign.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium tabular-nums">{campaign.leads} leads</p>
                  <p className="text-xs text-muted-foreground tabular-nums">{campaign.conversion} CVR</p>
                </div>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Notifications">
          <div className="space-y-3">
            {[
              { text: "Your monthly report is ready for review", type: "info", time: "1h ago" },
              { text: "Ad spend is 15% above budget for Google Ads", type: "warning", time: "3h ago" },
              { text: "New 5-star review received on Google", type: "success", time: "5h ago" },
              { text: "Meeting with account manager tomorrow at 10 AM", type: "info", time: "6h ago" },
            ].map((n, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <div className="mt-1 h-2 w-2 rounded-full shrink-0" style={{
                  background: n.type === "warning" ? "hsl(211 80% 65%)" : n.type === "success" ? "hsl(197 92% 58%)" : "hsl(211 96% 56%)",
                }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{n.text}</p>
                  <p className="text-xs text-muted-foreground">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      </div>

      {/* Activity + Meetings + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <DataCard title="Recent Activity">
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "hsl(211 96% 56%)" }} />
                <div>
                  <p className="text-sm font-medium">{item.action}</p>
                  <p className="text-xs text-muted-foreground">{item.detail} · {item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Upcoming Meetings">
          <div className="space-y-3">
            {upcomingMeetings.map((m, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <Calendar className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(211 96% 56%)" }} />
                <div>
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.time} · {m.attendees}</p>
                </div>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Task Center">
          <div className="space-y-3">
            {tasks.map((t, i) => {
              const s = priorityStyle(t.priority);
              return (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <CheckSquare className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(211 96% 56%)" }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">Due: {t.due}</p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-md shrink-0 ml-2"
                    style={{ background: s.bg, color: s.text }}
                  >
                    {t.priority}
                  </span>
                </div>
              );
            })}
          </div>
        </DataCard>
      </div>
    </div>
  );
}
