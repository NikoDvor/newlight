import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Calendar, Clock, FileText, Brain } from "lucide-react";

const upcoming = [
  { title: "Q2 Strategy Planning", date: "Mar 13, 2:00 PM", duration: "60 min", attendees: "Marketing Team, Client" },
  { title: "Campaign Review", date: "Mar 14, 10:00 AM", duration: "30 min", attendees: "Account Manager" },
  { title: "Monthly Performance Review", date: "Mar 15, 3:00 PM", duration: "45 min", attendees: "Full Team" },
];

const past = [
  { title: "Onboarding Call", date: "Mar 10", score: 92, summary: "Discussed goals, set KPIs, and aligned on Q2 strategy. Client prioritizes lead gen." },
  { title: "Ad Strategy Session", date: "Mar 7", score: 88, summary: "Reviewed Google Ads performance. Decided to increase budget for brand keywords." },
  { title: "Content Planning", date: "Mar 3", score: 95, summary: "Mapped out social media calendar for March. Approved 12 posts and 2 video concepts." },
];

export default function Meetings() {
  return (
    <div>
      <PageHeader title="Meetings" description="Track meetings, notes, and AI-powered summaries" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Upcoming Meetings" value="3" change="Next: Today, 2:00 PM" changeType="neutral" icon={Calendar} />
        <MetricCard label="Meetings This Month" value="8" change="+2 vs last month" changeType="positive" icon={Clock} />
        <MetricCard label="Meeting Notes" value="24" change="All synced" changeType="positive" icon={FileText} />
        <MetricCard label="Avg Meeting Score" value="92" change="Excellent engagement" changeType="positive" icon={Brain} />
      </WidgetGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DataCard title="Upcoming Meetings">
          <div className="space-y-3">
            {upcoming.map((m, i) => (
              <div key={i} className="py-3 border-b border-border last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{m.title}</p>
                  <span className="text-xs text-muted-foreground">{m.duration}</span>
                </div>
                <p className="text-xs text-muted-foreground">{m.date} · {m.attendees}</p>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Past Meetings">
          <div className="space-y-4">
            {past.map((m, i) => (
              <div key={i} className="py-3 border-b border-border last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{m.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{m.date}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600">{m.score}/100</span>
                  </div>
                </div>
                <div className="mt-2 p-3 rounded-lg bg-secondary">
                  <p className="text-xs font-medium text-muted-foreground mb-1">AI Summary</p>
                  <p className="text-sm">{m.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      </div>
    </div>
  );
}
