import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Zap, DollarSign, TrendingUp, ArrowUpRight,
  Globe, Target, Star, Megaphone, Mail, Users,
  RefreshCw, Search, CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  { task: "Fix homepage load speed", impact: "$4,200/mo", urgency: "Critical", icon: Globe, module: "/website", moduleName: "Website" },
  { task: "Launch retargeting ads for abandoned leads", impact: "$5,100/mo", urgency: "Critical", icon: Megaphone, module: "/paid-ads", moduleName: "Ads" },
  { task: "Increase social posting frequency", impact: "$2,800/mo", urgency: "High", icon: Target, module: "/social-media", moduleName: "Social Media" },
  { task: "Respond to 3 negative reviews", impact: "$1,500/mo", urgency: "High", icon: Star, module: "/reviews", moduleName: "Reviews" },
  { task: "Improve landing page conversion rate", impact: "$3,600/mo", urgency: "High", icon: TrendingUp, module: "/website-builder", moduleName: "Website" },
  { task: "Set up lead nurture email sequence", impact: "$2,200/mo", urgency: "Medium", icon: Mail, module: "/automations", moduleName: "Automations" },
  { task: "Optimize for local SEO keywords", impact: "$1,800/mo", urgency: "Medium", icon: Search, module: "/seo", moduleName: "SEO" },
  { task: "Automate CRM follow-up sequences", impact: "$3,100/mo", urgency: "High", icon: Users, module: "/crm", moduleName: "CRM" },
];

const urgencyStyle = (u: string) =>
  u === "Critical"
    ? { bg: "hsla(215,75%,48%,.1)", text: "hsl(215 75% 42%)" }
    : u === "High"
    ? { bg: "hsla(211,96%,56%,.1)", text: "hsl(211 96% 46%)" }
    : { bg: "hsla(210,40%,94%,.6)", text: "hsl(215 16% 50%)" };

export default function PriorityActions() {
  return (
    <div>
      <PageHeader title="Priority Actions" description="Top AI-recommended actions ranked by revenue impact" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Total Revenue Impact" value="$24.3K/mo" change="If all actions completed" changeType="positive" icon={DollarSign} />
        <MetricCard label="Critical Actions" value={`${actions.filter(a => a.urgency === "Critical").length}`} change="Need immediate attention" changeType="neutral" icon={Zap} />
        <MetricCard label="Quick Wins" value="3" change="Can be done today" changeType="positive" icon={CheckCircle} />
        <MetricCard label="Growth Potential" value="+42%" change="Estimated improvement" changeType="positive" icon={TrendingUp} />
      </WidgetGrid>

      <DataCard title="Prioritized Action List" className="mt-6">
        <div className="space-y-2">
          {actions.map((a, i) => {
            const style = urgencyStyle(a.urgency);
            return (
              <motion.div
                key={i}
                className="flex items-center justify-between py-3 px-4 rounded-xl transition-all duration-200 hover:shadow-md"
                style={{ background: "hsla(210,50%,99%,.6)", border: "1px solid hsla(211,96%,56%,.06)" }}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ x: 4 }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <a.icon className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.task}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold" style={{ color: "hsl(197 92% 48%)" }}>
                        Est. {a.impact}
                      </span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <Link to={a.module} className="text-[10px] font-medium hover:underline" style={{ color: "hsl(211 96% 56%)" }}>
                        {a.moduleName}
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-md" style={{ background: style.bg, color: style.text }}>
                    {a.urgency}
                  </span>
                  <Button size="sm" className="btn-gradient h-7 px-3 rounded-lg text-[10px]">
                    <ArrowUpRight className="h-3 w-3 mr-1" /> Act
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </DataCard>
    </div>
  );
}
