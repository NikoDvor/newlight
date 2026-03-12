import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { MetricCard } from "@/components/MetricCard";
import { Brain, Lightbulb, TrendingUp, AlertCircle } from "lucide-react";

const opportunities = [
  { title: "Expand Google Ads to competitor keywords", impact: "High", category: "Paid Ads", description: "Competitors are spending 40% less on brand keywords. Opportunity to capture market share." },
  { title: "Launch email nurture sequence", impact: "High", category: "Email", description: "42% of leads go cold after 7 days. An automated nurture sequence could recover 15-20%." },
  { title: "Optimize landing page CTA", impact: "Medium", category: "Website", description: "A/B testing shows 'Get Free Quote' converts 23% better than 'Contact Us'." },
  { title: "Increase LinkedIn posting frequency", impact: "Medium", category: "Social", description: "Engagement peaks on Tues-Thurs. Doubling posts on those days could increase reach by 35%." },
];

const priorityActions = [
  { action: "Review and approve Q2 ad budget", urgency: "Urgent", due: "Today" },
  { action: "Update website meta descriptions for SEO", urgency: "High", due: "This week" },
  { action: "Schedule Q2 social media content", urgency: "Medium", due: "Mar 20" },
  { action: "Respond to 3 pending review requests", urgency: "High", due: "Tomorrow" },
];

export default function Intelligence() {
  return (
    <div>
      <PageHeader title="Intelligence" description="AI-powered insights and growth recommendations" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Business Opportunities" value="8" change="4 high impact" changeType="positive" icon={Lightbulb} />
        <MetricCard label="Recommendations" value="12" change="Based on last 30 days" changeType="neutral" icon={Brain} />
        <MetricCard label="Growth Potential" value="+34%" change="If all actions completed" changeType="positive" icon={TrendingUp} />
        <MetricCard label="Priority Actions" value="4" change="1 urgent" changeType="neutral" icon={AlertCircle} />
      </WidgetGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DataCard title="Business Opportunities">
          <div className="space-y-4">
            {opportunities.map((o, i) => (
              <div key={i} className="py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium">{o.title}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${o.impact === "High" ? "bg-accent/10 text-accent" : "bg-secondary text-muted-foreground"}`}>{o.impact}</span>
                </div>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">{o.category}</span>
                <p className="text-sm text-muted-foreground mt-2">{o.description}</p>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Priority Actions">
          <div className="space-y-3">
            {priorityActions.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{a.action}</p>
                  <p className="text-xs text-muted-foreground">Due: {a.due}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                  a.urgency === "Urgent" ? "bg-red-50 text-red-600" :
                  a.urgency === "High" ? "bg-amber-50 text-amber-600" :
                  "bg-secondary text-muted-foreground"
                }`}>{a.urgency}</span>
              </div>
            ))}
          </div>
        </DataCard>
      </div>
    </div>
  );
}
