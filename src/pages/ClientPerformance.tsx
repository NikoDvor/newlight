import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, Target, Globe, Star, TrendingUp, MousePointerClick,
  FileText, Calendar, BarChart3, Heart, MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";

export default function ClientPerformance() {
  return (
    <div>
      <PageHeader title="Client Performance" description="Performance dashboards for each client account">
        <Select defaultValue="techcorp">
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="techcorp">TechCorp Inc.</SelectItem>
            <SelectItem value="bloom">Bloom Agency</SelectItem>
            <SelectItem value="growthlab">GrowthLab</SelectItem>
            <SelectItem value="fitlife">FitLife Studios</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Leads Generated" value="142" change="+18% this month" changeType="positive" icon={Users} />
        <MetricCard label="Appointments Booked" value="34" change="+8 this month" changeType="positive" icon={Calendar} />
        <MetricCard label="Conversion Rate" value="4.2%" change="+0.6% vs prior" changeType="positive" icon={Target} />
        <MetricCard label="Website Visitors" value="12,450" change="+15% vs prior" changeType="positive" icon={Globe} />
        <MetricCard label="Form Submissions" value="398" change="+22% vs prior" changeType="positive" icon={FileText} />
        <MetricCard label="Reviews Received" value="12" change="This month" changeType="positive" icon={Star} />
        <MetricCard label="Avg. Rating" value="4.8" change="156 total reviews" changeType="positive" icon={Star} />
        <MetricCard label="Social Engagement" value="5.8%" change="+0.4% vs prior" changeType="positive" icon={Heart} />
      </WidgetGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DataCard title="Lead Generation Trend">
          <div className="space-y-3">
            {[
              { month: "January", leads: 98, bar: 56 },
              { month: "February", leads: 112, bar: 64 },
              { month: "March", leads: 142, bar: 82 },
            ].map((m) => (
              <div key={m.month}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{m.month}</span>
                  <span className="text-muted-foreground tabular-nums">{m.leads} leads</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${m.bar}%` }} />
                </div>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Channel Performance">
          <div className="space-y-3">
            {[
              { channel: "Organic Search", leads: 52, pct: 65 },
              { channel: "Paid Ads", leads: 38, pct: 48 },
              { channel: "Social Media", leads: 28, pct: 35 },
              { channel: "Referral", leads: 16, pct: 20 },
              { channel: "Direct", leads: 8, pct: 10 },
            ].map((c) => (
              <div key={c.channel}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{c.channel}</span>
                  <span className="text-muted-foreground tabular-nums">{c.leads} leads</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </DataCard>

        {/* AI Insights */}
        <DataCard title="AI Marketing Insights" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { insight: "Increase posting frequency on Instagram to improve reach.", icon: Heart, impact: "High" },
              { insight: "Your landing page conversion rate is below industry average (4.2% vs 6.1%).", icon: Target, impact: "High" },
              { insight: "Review growth slowed this month. Consider activating review request automation.", icon: Star, impact: "Medium" },
              { insight: "LinkedIn engagement is up 35% — double down on thought leadership content.", icon: TrendingUp, impact: "Medium" },
              { insight: "Top-performing funnel has 12.3% CVR. Replicate this structure for other services.", icon: MousePointerClick, impact: "High" },
              { insight: "Email open rate dropped 8%. Test new subject lines and send times.", icon: MessageSquare, impact: "Medium" },
            ].map((item, i) => (
              <motion.div
                key={i}
                className="bg-secondary rounded-xl p-4"
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <item.icon className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    item.impact === "High" ? "bg-blue-50 text-blue-700" : "bg-secondary text-muted-foreground"
                  }`}>{item.impact}</span>
                </div>
                <p className="text-sm">{item.insight}</p>
              </motion.div>
            ))}
          </div>
        </DataCard>
      </div>
    </div>
  );
}
