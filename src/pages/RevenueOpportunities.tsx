import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { LockedFeature } from "@/components/LockedFeature";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DollarSign, TrendingUp, AlertCircle, Target,
  ArrowUpRight, Megaphone, Globe, Share2, Star, Search
} from "lucide-react";

const opportunities = [
  {
    title: "Your competitors are running Google Ads — you are not",
    explanation: "3 direct competitors have active search campaigns targeting your core services. They are capturing leads searching for your services.",
    missedLeads: "37 leads/month",
    missedRevenue: "$12,400/month",
    action: "Launch targeted Google Ads campaign",
    icon: Megaphone,
    severity: "Critical",
  },
  {
    title: "Your website has no booking funnel",
    explanation: "Visitors can browse your site but have no clear path to book a consultation. You are losing warm leads at the conversion point.",
    missedLeads: "22 leads/month",
    missedRevenue: "$9,400/month",
    action: "Build a conversion-optimized booking funnel",
    icon: Globe,
    severity: "Critical",
  },
  {
    title: "Instagram posting frequency is below industry standard",
    explanation: "You averaged 4 posts this month. Top competitors in your space average 18 posts/month. Visibility and engagement are declining.",
    missedLeads: "15 leads/month",
    missedRevenue: "$4,800/month",
    action: "Increase to 4-5 posts per week with content calendar",
    icon: Share2,
    severity: "High",
  },
  {
    title: "Google rating is below industry average",
    explanation: "Your rating is 4.2★ vs industry average of 4.6★. Lower ratings reduce click-through rates on Google search by up to 25%.",
    missedLeads: "12 leads/month",
    missedRevenue: "$3,200/month",
    action: "Activate automated review request campaign",
    icon: Star,
    severity: "High",
  },
  {
    title: "No retargeting ads for website visitors",
    explanation: "87% of website visitors leave without converting. Without retargeting, these warm prospects are lost to competitors.",
    missedLeads: "28 leads/month",
    missedRevenue: "$7,600/month",
    action: "Set up Facebook and Google retargeting campaigns",
    icon: Target,
    severity: "High",
  },
  {
    title: "SEO content gap on high-value keywords",
    explanation: "You have no content ranking for 8 high-volume keywords that competitors dominate. These keywords drive an estimated 2,400 monthly searches.",
    missedLeads: "18 leads/month",
    missedRevenue: "$5,200/month",
    action: "Create targeted blog content for gap keywords",
    icon: Search,
    severity: "Medium",
  },
];

const severityStyle = (s: string) =>
  s === "Critical"
    ? { bg: "hsla(215,75%,48%,.1)", text: "hsl(215 75% 42%)" }
    : s === "High"
    ? { bg: "hsla(211,96%,56%,.1)", text: "hsl(211 96% 46%)" }
    : { bg: "hsla(210,40%,94%,.6)", text: "hsl(215 16% 50%)" };

export default function RevenueOpportunities() {
  const totalMissed = opportunities.reduce((sum, o) => {
    const num = parseFloat(o.missedRevenue.replace(/[^0-9.]/g, ""));
    return sum + num;
  }, 0);

  return (
    <div>
      <PageHeader title="Revenue Opportunities" description="AI-detected growth opportunities you're missing" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Total Missed Revenue" value={`$${(totalMissed / 1000).toFixed(1)}K/mo`} change="Detectable opportunities" changeType="neutral" icon={DollarSign} />
        <MetricCard label="Opportunities Found" value={`${opportunities.length}`} change={`${opportunities.filter(o => o.severity === "Critical").length} critical`} changeType="positive" icon={AlertCircle} />
        <MetricCard label="Missed Leads" value="132/mo" change="Across all channels" changeType="neutral" icon={Target} />
        <MetricCard label="Recovery Potential" value="+68%" change="If all fixed" changeType="positive" icon={TrendingUp} />
      </WidgetGrid>

      <div className="space-y-4 mt-6">
        {opportunities.map((opp, i) => {
          const style = severityStyle(opp.severity);
          return (
            <motion.div
              key={i}
              className="card-widget"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -2 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <opp.icon className="h-5 w-5" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{opp.title}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: style.bg, color: style.text }}>
                      {opp.severity}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{opp.explanation}</p>
                  <div className="flex flex-wrap gap-4 mb-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Missed Leads</p>
                      <p className="text-sm font-bold" style={{ color: "hsl(211 96% 56%)" }}>{opp.missedLeads}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Missed Revenue</p>
                      <p className="text-sm font-bold" style={{ color: "hsl(197 92% 48%)" }}>{opp.missedRevenue}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "hsla(211,96%,56%,.06)" }}>
                    <ArrowUpRight className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
                    <span className="text-xs font-medium" style={{ color: "hsl(211 96% 50%)" }}>{opp.action}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button size="sm" className="btn-gradient h-8 px-4 rounded-lg text-xs">Fix Now</Button>
                  <Button size="sm" variant="outline" className="h-8 px-4 rounded-lg text-xs">Contact Expert</Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
