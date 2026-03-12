import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Users, Heart, Eye, TrendingUp } from "lucide-react";

const scheduledPosts = [
  { platform: "Instagram", content: "Spring campaign launch — carousel post", date: "Mar 13, 10:00 AM", status: "Scheduled" },
  { platform: "LinkedIn", content: "Case study: How we grew leads by 200%", date: "Mar 13, 2:00 PM", status: "Scheduled" },
  { platform: "Facebook", content: "Client testimonial video", date: "Mar 14, 11:00 AM", status: "Draft" },
  { platform: "Twitter", content: "Industry tips thread", date: "Mar 14, 3:00 PM", status: "Scheduled" },
];

const topPosts = [
  { content: "Behind the scenes: Our creative process", engagement: "4.2K", platform: "Instagram" },
  { content: "5 marketing trends for 2026", engagement: "2.8K", platform: "LinkedIn" },
  { content: "Client success story spotlight", engagement: "1.9K", platform: "Facebook" },
];

export default function SocialMedia() {
  return (
    <div>
      <PageHeader title="Social Media" description="Manage content, track engagement, and grow your audience" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Total Followers" value="28,450" change="+1,240 this month" changeType="positive" icon={Users} />
        <MetricCard label="Engagement Rate" value="5.8%" change="+0.4% vs last month" changeType="positive" icon={Heart} />
        <MetricCard label="Total Views" value="142K" change="+23% vs last month" changeType="positive" icon={Eye} />
        <MetricCard label="Growth Rate" value="+4.6%" change="Consistent upward trend" changeType="positive" icon={TrendingUp} />
      </WidgetGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DataCard title="Scheduled Posts">
          <div className="space-y-3">
            {scheduledPosts.map((p, i) => (
              <div key={i} className="flex items-start justify-between py-3 border-b border-border last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-secondary text-muted-foreground">{p.platform}</span>
                    <span className={`text-xs font-medium ${p.status === "Draft" ? "text-amber-600" : "text-emerald-600"}`}>{p.status}</span>
                  </div>
                  <p className="text-sm mt-1">{p.content}</p>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap ml-4">{p.date}</p>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Top Performing Posts">
          <div className="space-y-3">
            {topPosts.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.content}</p>
                  <span className="text-xs text-muted-foreground">{p.platform}</span>
                </div>
                <p className="text-sm font-semibold tabular-nums">{p.engagement}</p>
              </div>
            ))}
          </div>
        </DataCard>
      </div>

      <DataCard title="Content Calendar" className="mt-6">
        <div className="grid grid-cols-7 gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
          ))}
          {Array.from({ length: 28 }, (_, i) => (
            <div key={i} className={`text-center text-sm py-3 rounded-lg ${
              [2, 5, 8, 12, 15, 19, 22].includes(i) ? "bg-accent/10 text-accent font-medium" : "hover:bg-secondary"
            } transition-colors cursor-default`}>
              {i + 1}
            </div>
          ))}
        </div>
      </DataCard>
    </div>
  );
}
