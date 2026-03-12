import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import {
  Users, Target, Globe, Star, TrendingUp, Calendar, Heart, MousePointerClick
} from "lucide-react";

export default function ClientReport() {
  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="Performance Report" description="TechCorp Inc. — March 2026" />

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Total Leads" value="142" change="+18% vs prior" changeType="positive" icon={Users} />
        <MetricCard label="Appointments Booked" value="34" change="+8 this month" changeType="positive" icon={Calendar} />
        <MetricCard label="Website Traffic" value="12,450" change="+15% vs prior" changeType="positive" icon={Globe} />
        <MetricCard label="Conversion Rate" value="4.2%" change="+0.6% vs prior" changeType="positive" icon={Target} />
        <MetricCard label="Reviews Gained" value="12" change="4.8 avg rating" changeType="positive" icon={Star} />
        <MetricCard label="Social Engagement" value="5.8%" change="+0.4% vs prior" changeType="positive" icon={Heart} />
      </WidgetGrid>

      <div className="mt-8 space-y-6">
        <div className="card-widget p-6 rounded-2xl">
          <h3 className="section-title mb-4">Traffic Sources</h3>
          <div className="space-y-4">
            {[
              { source: "Organic Search", value: "5,240", pct: 42 },
              { source: "Paid Ads", value: "3,610", pct: 29 },
              { source: "Social Media", value: "2,120", pct: 17 },
              { source: "Direct", value: "980", pct: 8 },
              { source: "Referral", value: "500", pct: 4 },
            ].map((s) => (
              <div key={s.source}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{s.source}</span>
                  <span className="text-muted-foreground tabular-nums">{s.value} ({s.pct}%)</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-widget p-6 rounded-2xl">
          <h3 className="section-title mb-4">Top Performing Funnels</h3>
          <div className="space-y-3">
            {[
              { name: "Free Consultation Funnel", leads: 263, cvr: "12.3%" },
              { name: "SEO Audit Funnel", leads: 145, cvr: "8.7%" },
            ].map((f) => (
              <div key={f.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <span className="text-sm font-medium">{f.name}</span>
                <div className="text-right">
                  <span className="text-sm font-semibold tabular-nums">{f.leads} leads</span>
                  <span className="text-xs text-muted-foreground ml-2 tabular-nums">{f.cvr} CVR</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-widget p-6 rounded-2xl">
          <h3 className="section-title mb-4">Top Social Posts</h3>
          <div className="space-y-3">
            {[
              { content: "Behind the scenes: Our creative process", platform: "Instagram", engagement: "4.2K" },
              { content: "5 marketing trends for 2026", platform: "LinkedIn", engagement: "2.8K" },
              { content: "Client success story spotlight", platform: "Facebook", engagement: "1.9K" },
            ].map((p) => (
              <div key={p.content} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.content}</p>
                  <span className="text-xs text-muted-foreground">{p.platform}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums">{p.engagement}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
