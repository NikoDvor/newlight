import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { MetricCard } from "@/components/MetricCard";
import {
  Brain, Lightbulb, TrendingUp, AlertCircle, Target,
  Star, Heart, MousePointerClick, MessageSquare, Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

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

const aiInsights = [
  { insight: "Increase posting frequency on Instagram to improve reach. Current: 4/week. Recommended: 7/week.", icon: Heart, impact: "High" },
  { insight: "Your landing page conversion rate is below industry average (4.2% vs 6.1%). Test new headlines and CTAs.", icon: Target, impact: "High" },
  { insight: "Your review growth slowed this month (12 vs 18 last month). Activate review request automation.", icon: Star, impact: "Medium" },
  { insight: "LinkedIn engagement is up 35% — double down on thought leadership content.", icon: TrendingUp, impact: "Medium" },
  { insight: "Top-performing funnel has 12.3% CVR. Replicate this structure for other services.", icon: MousePointerClick, impact: "High" },
  { insight: "Email open rate dropped 8%. Test new subject lines and send times.", icon: MessageSquare, impact: "Medium" },
  { insight: "Google Ads CPC decreased 12% this week — increase budget to capture more leads.", icon: Lightbulb, impact: "High" },
  { insight: "3 leads have been idle in 'Contacted' stage for 7+ days. Create follow-up tasks.", icon: AlertCircle, impact: "Urgent" },
];

export default function Intelligence() {
  return (
    <div>
      <PageHeader title="Intelligence" description="AI-powered insights, recommendations, and growth analysis" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Business Opportunities" value="8" change="4 high impact" changeType="positive" icon={Lightbulb} />
        <MetricCard label="AI Insights" value="8" change="Analyzed this week" changeType="neutral" icon={Sparkles} />
        <MetricCard label="Growth Potential" value="+34%" change="If all actions completed" changeType="positive" icon={TrendingUp} />
        <MetricCard label="Priority Actions" value="4" change="1 urgent" changeType="neutral" icon={AlertCircle} />
      </WidgetGrid>

      {/* AI Marketing Insights */}
      <DataCard title="AI Marketing Insights" className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {aiInsights.map((item, i) => (
            <motion.div
              key={i}
              className="bg-secondary rounded-xl p-4"
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <item.icon className="h-4 w-4 text-accent shrink-0" />
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  item.impact === "Urgent" ? "bg-red-50 text-red-700" :
                  item.impact === "High" ? "bg-blue-50 text-blue-700" :
                  "bg-secondary text-muted-foreground"
                }`}>{item.impact}</span>
              </div>
              <p className="text-sm">{item.insight}</p>
            </motion.div>
          ))}
        </div>
      </DataCard>

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
