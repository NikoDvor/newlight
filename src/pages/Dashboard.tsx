import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import {
  Activity, TrendingUp, DollarSign, CheckSquare,
  Calendar, Bell, BarChart3, Target
} from "lucide-react";

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

export default function Dashboard() {
  return (
    <div>
      <PageHeader title="Dashboard" description="Your business growth command center" />

      {/* Top metrics */}
      <WidgetGrid columns="repeat(auto-fit, minmax(240px, 1fr))">
        <MetricCard label="Business Health Score" value="87" change="+5 from last month" changeType="positive" icon={Activity} />
        <MetricCard label="Revenue Pipeline" value="$142,800" change="+12.3% vs last month" changeType="positive" icon={DollarSign} />
        <MetricCard label="Marketing Performance" value="94.2%" change="+2.1% this week" changeType="positive" icon={TrendingUp} />
        <MetricCard label="Tasks Due" value="4" change="2 high priority" changeType="neutral" icon={CheckSquare} />
      </WidgetGrid>

      {/* Campaign Performance + Notifications */}
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
                  <span className={`text-xs font-medium ${campaign.status === "Active" ? "text-emerald-600" : "text-muted-foreground"}`}>
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
                <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                  n.type === "warning" ? "bg-amber-500" : n.type === "success" ? "bg-emerald-500" : "bg-accent"
                }`} />
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
                <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
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
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
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
            {tasks.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-start gap-3 min-w-0">
                  <CheckSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">Due: {t.due}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-md shrink-0 ml-2 ${
                  t.priority === "High" ? "bg-red-50 text-red-600" :
                  t.priority === "Medium" ? "bg-amber-50 text-amber-600" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {t.priority}
                </span>
              </div>
            ))}
          </div>
        </DataCard>
      </div>
    </div>
  );
}
