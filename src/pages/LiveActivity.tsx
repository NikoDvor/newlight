import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { DataCard } from "@/components/DataCard";
import { motion } from "framer-motion";
import {
  Activity, Zap, Bell, RefreshCw,
  Users, Star, Search, Globe, Megaphone, Share2,
  Mail, Calendar, FileText, TrendingUp
} from "lucide-react";

const activities = [
  { action: "New lead entered CRM", detail: "Sarah Johnson via Google Ads landing page", time: "Just now", icon: Users, type: "lead" },
  { action: "Review request sent", detail: "Automated request to Mike Chen after service", time: "2 min ago", icon: Star, type: "automation" },
  { action: "AI discovered SEO issue", detail: "Page speed regression on /services page", time: "5 min ago", icon: Search, type: "insight" },
  { action: "Competitor trend updated", detail: "Competitor A increased ad spend by 40%", time: "12 min ago", icon: TrendingUp, type: "intelligence" },
  { action: "Ad performance changed", detail: "Google Ads CPL improved 15% overnight", time: "18 min ago", icon: Megaphone, type: "ads" },
  { action: "Social media post scheduled", detail: "Instagram carousel for tomorrow 10:00 AM", time: "25 min ago", icon: Share2, type: "social" },
  { action: "Website opportunity detected", detail: "Exit-intent popup could capture 8% more leads", time: "32 min ago", icon: Globe, type: "insight" },
  { action: "Email campaign delivered", detail: "Spring Promo sent to 1,247 contacts", time: "45 min ago", icon: Mail, type: "email" },
  { action: "Meeting scheduled", detail: "Strategy review with Marketing Team at 2:00 PM", time: "1 hour ago", icon: Calendar, type: "meeting" },
  { action: "Report generated", detail: "Monthly performance report ready for review", time: "1 hour ago", icon: FileText, type: "report" },
  { action: "5-star review received", detail: "New Google review from Jennifer Williams", time: "2 hours ago", icon: Star, type: "review" },
  { action: "Lead follow-up triggered", detail: "Automated SMS sent to 3 warm leads", time: "2 hours ago", icon: Users, type: "automation" },
  { action: "SEO ranking improved", detail: "\"digital marketing\" moved from #8 to #5", time: "3 hours ago", icon: Search, type: "seo" },
  { action: "New form submission", detail: "Contact form from website — needs CRM assignment", time: "3 hours ago", icon: Globe, type: "lead" },
];

const typeColor = (type: string) => {
  switch (type) {
    case "lead": return "hsl(211 96% 56%)";
    case "automation": return "hsl(197 92% 58%)";
    case "insight": return "hsl(217 90% 62%)";
    case "intelligence": return "hsl(222 68% 44%)";
    default: return "hsl(211 80% 65%)";
  }
};

export default function LiveActivity() {
  return (
    <div>
      <PageHeader title="Live Activity Feed" description="Real-time platform actions and system events" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Events Today" value="47" change="+12 vs yesterday" changeType="positive" icon={Activity} />
        <MetricCard label="Automations Triggered" value="18" change="Running smoothly" changeType="positive" icon={Zap} />
        <MetricCard label="AI Insights Generated" value="6" change="2 critical" changeType="neutral" icon={Bell} />
        <MetricCard label="System Uptime" value="99.9%" change="All systems operational" changeType="positive" icon={RefreshCw} />
      </WidgetGrid>

      <DataCard title="Activity Stream" className="mt-6">
        <div className="space-y-1">
          {activities.map((item, i) => (
            <motion.div
              key={i}
              className="flex items-start gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-primary/[0.03]"
              initial={{ opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
            >
              <div className="mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${typeColor(item.type)}12` }}>
                <item.icon className="h-4 w-4" style={{ color: typeColor(item.type) }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.action}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 mt-1">{item.time}</span>
            </motion.div>
          ))}
        </div>
      </DataCard>
    </div>
  );
}
