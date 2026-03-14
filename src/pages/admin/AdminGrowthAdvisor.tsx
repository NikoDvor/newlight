import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { motion } from "framer-motion";
import { Brain, TrendingUp, DollarSign, AlertTriangle, ArrowUpRight, Rocket } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const clientInsights = [
  { client: "Apex Dental", opportunity: "$12,400/mo", topAction: "Increase Google Ads budget", growth: 18, score: 82 },
  { client: "Metro Plumbing", opportunity: "$9,800/mo", topAction: "Launch review campaign", growth: 12, score: 71 },
  { client: "Sunrise Fitness", opportunity: "$15,200/mo", topAction: "Fix website speed", growth: -4, score: 54 },
  { client: "Bay Area Legal", opportunity: "$8,600/mo", topAction: "Improve SEO content", growth: 22, score: 78 },
  { client: "Peak Auto", opportunity: "$11,100/mo", topAction: "Retarget lost leads", growth: 8, score: 65 },
  { client: "Coastal Realty", opportunity: "$7,300/mo", topAction: "Increase social posting", growth: 15, score: 73 },
];

const platformSummary = [
  { label: "Total Missed Revenue", value: "$64,400/mo", icon: DollarSign },
  { label: "Clients Needing Attention", value: "3", icon: AlertTriangle },
  { label: "Avg Growth Rate", value: "+11.8%", icon: TrendingUp },
  { label: "Top Opportunity", value: "Sunrise Fitness", icon: Rocket },
];

export default function AdminGrowthAdvisor() {
  return (
    <div>
      <PageHeader
        title="AI Growth Advisor — All Clients"
        description="Cross-client growth intelligence and opportunity analysis"
      />

      {/* Platform Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {platformSummary.map((m, i) => (
          <motion.div
            key={m.label}
            className="card-widget text-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{
              background: "hsla(211,96%,56%,.1)"
            }}>
              <m.icon className="h-5 w-5" style={{ color: "hsl(211 96% 56%)" }} />
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">{m.label}</p>
            <p className="text-lg font-bold text-foreground">{m.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Client Growth Insights Table */}
      <DataCard title="Client Growth Opportunities">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "hsla(211,96%,56%,.08)" }}>
                <th className="text-left py-2 text-muted-foreground font-medium">Client</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Growth Score</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Revenue Opportunity</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Top Recommended Action</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Growth</th>
              </tr>
            </thead>
            <tbody>
              {clientInsights.map((c, i) => (
                <motion.tr
                  key={c.client}
                  className="border-b last:border-0 hover:bg-primary/[0.02]"
                  style={{ borderColor: "hsla(211,96%,56%,.06)" }}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <td className="py-3 font-semibold text-foreground">{c.client}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <Progress value={c.score} className="h-1.5 w-16" />
                      <span className="text-[10px] font-medium" style={{ color: "hsl(211 96% 56%)" }}>{c.score}</span>
                    </div>
                  </td>
                  <td className="py-3 font-semibold" style={{ color: "hsl(197 92% 48%)" }}>{c.opportunity}</td>
                  <td className="py-3 text-muted-foreground">{c.topAction}</td>
                  <td className="py-3 text-right">
                    <span className={`font-semibold ${c.growth >= 0 ? "text-primary" : "text-destructive"}`}>
                      {c.growth >= 0 ? "+" : ""}{c.growth}%
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>
    </div>
  );
}
