import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { MetricCard } from "@/components/MetricCard";
import { SystemStatusBar } from "@/components/SystemStatusBar";
import { ActivityFeed } from "@/components/ActivityFeed";
import { motion } from "framer-motion";
import {
  Brain, Sparkles, TrendingUp, AlertCircle, Target,
  Zap, ArrowUpRight, BarChart3, RefreshCw, Mail,
  MessageSquare, Star, Globe, Search, Megaphone, Users
} from "lucide-react";

const insights = [
  { insight: "Your competitors are posting 4x more content on Instagram. Increase frequency to maintain visibility.", icon: Target, impact: "High", action: "Schedule 12 more posts this month" },
  { insight: "Website load speed is 4.2s — above the 2.5s threshold. This is hurting conversions by an estimated 18%.", icon: Globe, impact: "Critical", action: "Compress images and enable CDN caching" },
  { insight: "Google ranking dropped for 3 key terms this week. Content refresh needed.", icon: Search, impact: "High", action: "Update blog posts targeting these keywords" },
  { insight: "Ad cost per lead increased 22% over the past 2 weeks. Budget reallocation recommended.", icon: Megaphone, impact: "High", action: "Shift budget to better-performing campaigns" },
  { insight: "Your review rating (4.2★) is lower than top competitors (4.6★). Review velocity has slowed.", icon: Star, impact: "Medium", action: "Activate automated review request campaign" },
  { insight: "Email open rate dropped 8% this month. Subject lines may be underperforming.", icon: Mail, impact: "Medium", action: "A/B test new subject line formats" },
];

const priorityActions = [
  { task: "Fix homepage load speed", impact: "$4,200/mo", urgency: "Critical", icon: Globe },
  { task: "Increase social posting frequency", impact: "$2,800/mo", urgency: "High", icon: Target },
  { task: "Respond to 3 negative reviews", impact: "$1,500/mo", urgency: "High", icon: Star },
  { task: "Improve landing page conversion rate", impact: "$3,600/mo", urgency: "High", icon: TrendingUp },
  { task: "Launch retargeting ads for abandoned leads", impact: "$5,100/mo", urgency: "Medium", icon: Megaphone },
  { task: "Set up lead nurture email sequence", impact: "$2,200/mo", urgency: "Medium", icon: Mail },
];

const recommendations = [
  { title: "Launch competitor keyword campaign", category: "Paid Ads", description: "Target 12 competitor brand keywords with low CPC. Estimated 45 new leads/month.", icon: Megaphone },
  { title: "Create video testimonial series", category: "Social Media", description: "Video posts get 3x engagement. Schedule 4 customer story videos.", icon: MessageSquare },
  { title: "Optimize for 'near me' searches", category: "SEO", description: "Local search volume up 28%. Update Google Business profile and add location pages.", icon: Search },
  { title: "Add exit-intent popup", category: "Website", description: "Capture 8-12% of leaving visitors with a discount offer popup.", icon: Globe },
  { title: "Automate lead follow-up sequences", category: "CRM", description: "42% of leads go cold after 7 days. Set up 5-touch automated sequence.", icon: Users },
];

const automationSuggestions = [
  { name: "Follow-up text reminders", description: "Send automated text 24h after inquiry if no response", status: "Recommended", impact: "+15% response rate" },
  { name: "Lead nurturing sequence", description: "5-email drip campaign for new leads over 14 days", status: "Recommended", impact: "+20% conversion" },
  { name: "Review request campaign", description: "Auto-request reviews 48h after service completion", status: "Recommended", impact: "+8 reviews/month" },
  { name: "Appointment reminders", description: "SMS + email reminder 24h and 1h before meetings", status: "Active", impact: "-35% no-shows" },
  { name: "Retention offers", description: "Automated discount for clients inactive 60+ days", status: "Recommended", impact: "+12% retention" },
  { name: "Birthday/anniversary messages", description: "Personalized messages with special offers", status: "Recommended", impact: "+5% repeat business" },
];

const urgencyStyle = (u: string) =>
  u === "Critical"
    ? { bg: "hsla(215,75%,48%,.1)", text: "hsl(215 75% 42%)" }
    : u === "High"
    ? { bg: "hsla(211,96%,56%,.1)", text: "hsl(211 96% 46%)" }
    : { bg: "hsla(210,40%,94%,.6)", text: "hsl(215 16% 50%)" };

export default function AIInsights() {
  return (
    <div>
      <PageHeader title="AI Insights" description="Your AI-powered business intelligence center" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="AI Insights Generated" value="24" change="6 critical findings" changeType="positive" icon={Brain} />
        <MetricCard label="Revenue at Risk" value="$19,400" change="Without action" changeType="neutral" icon={AlertCircle} />
        <MetricCard label="Growth Potential" value="+42%" change="If all actions completed" changeType="positive" icon={TrendingUp} />
        <MetricCard label="Automations Suggested" value="6" change="4 new this week" changeType="positive" icon={Zap} />
      </WidgetGrid>

      {/* System Status */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
          System Status
        </h3>
        <SystemStatusBar />
      </div>

      {/* AI Insights */}
      <DataCard title="AI Insights Engine" className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((item, i) => {
            const style = urgencyStyle(item.impact);
            return (
              <motion.div
                key={i}
                className="rounded-xl p-4 transition-all duration-200 hover:shadow-md cursor-default"
                style={{
                  background: "hsla(210,50%,99%,.8)",
                  border: "1px solid hsla(211,96%,56%,.08)",
                }}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className="h-4 w-4 shrink-0" style={{ color: "hsl(211 96% 56%)" }} />
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: style.bg, color: style.text }}
                  >
                    {item.impact}
                  </span>
                </div>
                <p className="text-xs text-foreground leading-relaxed mb-2">{item.insight}</p>
                <div className="flex items-center gap-1.5 pt-2 border-t" style={{ borderColor: "hsla(211,96%,56%,.06)" }}>
                  <ArrowUpRight className="h-3 w-3" style={{ color: "hsl(211 96% 56%)" }} />
                  <span className="text-[10px] font-medium" style={{ color: "hsl(211 96% 50%)" }}>{item.action}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </DataCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Priority Actions */}
        <DataCard title="Priority Actions (by Revenue Impact)">
          <div className="space-y-3">
            {priorityActions.map((a, i) => {
              const style = urgencyStyle(a.urgency);
              return (
                <motion.div
                  key={i}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                  style={{ borderColor: "hsla(211,96%,56%,.06)" }}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "hsla(211,96%,56%,.08)" }}
                    >
                      <a.icon className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.task}</p>
                      <p className="text-xs font-semibold" style={{ color: "hsl(197 92% 48%)" }}>
                        Est. {a.impact} revenue impact
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-1 rounded-md shrink-0 ml-2"
                    style={{ background: style.bg, color: style.text }}
                  >
                    {a.urgency}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </DataCard>

        {/* Activity Feed */}
        <ActivityFeed />
      </div>

      {/* Marketing Recommendations */}
      <DataCard title="AI Marketing Recommendations" className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recommendations.map((r, i) => (
            <motion.div
              key={i}
              className="rounded-xl p-4 transition-all duration-200 hover:shadow-md cursor-default"
              style={{
                background: "hsla(210,50%,99%,.8)",
                border: "1px solid hsla(211,96%,56%,.08)",
              }}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <r.icon className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "hsla(211,96%,56%,.08)", color: "hsl(211 96% 46%)" }}
                >
                  {r.category}
                </span>
              </div>
              <p className="text-sm font-medium text-foreground mb-1">{r.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{r.description}</p>
            </motion.div>
          ))}
        </div>
      </DataCard>

      {/* Automation Suggestions */}
      <DataCard title="AI Automation Suggestions" className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {automationSuggestions.map((a, i) => (
            <motion.div
              key={i}
              className="rounded-xl p-4 transition-all duration-200 hover:shadow-md cursor-default"
              style={{
                background: "hsla(210,50%,99%,.8)",
                border: "1px solid hsla(211,96%,56%,.08)",
              }}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -2 }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">{a.name}</p>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: a.status === "Active" ? "hsla(197,92%,58%,.12)" : "hsla(211,96%,56%,.08)",
                    color: a.status === "Active" ? "hsl(197 80% 42%)" : "hsl(211 96% 46%)",
                  }}
                >
                  {a.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{a.description}</p>
              <p className="text-[10px] font-semibold" style={{ color: "hsl(197 92% 48%)" }}>
                {a.impact}
              </p>
            </motion.div>
          ))}
        </div>
      </DataCard>
    </div>
  );
}
