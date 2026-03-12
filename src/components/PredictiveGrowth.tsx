import { motion } from "framer-motion";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

interface Projection {
  metric: string;
  current: string;
  d30: string;
  d60: string;
  d90: string;
  trend: "up" | "down" | "stable";
}

const projections: Projection[] = [
  { metric: "Leads", current: "306", d30: "345", d60: "388", d90: "430", trend: "up" },
  { metric: "Traffic", current: "12.4K", d30: "14.1K", d60: "16.2K", d90: "18.8K", trend: "up" },
  { metric: "Revenue", current: "$42.6K", d30: "$48.2K", d60: "$55.1K", d90: "$62.4K", trend: "up" },
  { metric: "Campaigns", current: "4", d30: "5", d60: "6", d90: "7", trend: "up" },
  { metric: "SEO Rank", current: "#8", d30: "#6", d60: "#5", d90: "#3", trend: "up" },
  { metric: "Review Score", current: "4.2★", d30: "4.3★", d60: "4.4★", d90: "4.5★", trend: "up" },
  { metric: "Social Reach", current: "8.2K", d30: "10.5K", d60: "13.1K", d90: "16.0K", trend: "up" },
];

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "up") return <ArrowUpRight className="h-3 w-3" style={{ color: "hsl(211 96% 56%)" }} />;
  if (trend === "down") return <ArrowDownRight className="h-3 w-3" style={{ color: "hsl(222 68% 44%)" }} />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
};

export function PredictiveGrowth() {
  return (
    <motion.div className="card-widget"
      initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.08)" }}>
          <TrendingUp className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Predictive Growth Engine</p>
          <p className="text-xs text-muted-foreground">AI-powered trend forecasting</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "hsla(211,96%,56%,.08)" }}>
              {["Metric", "Current", "30 Days", "60 Days", "90 Days", "Trend"].map(h => (
                <th key={h} className="text-left px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projections.map((p, i) => (
              <motion.tr key={p.metric}
                className="border-b last:border-0" style={{ borderColor: "hsla(211,96%,56%,.04)" }}
                initial={{ opacity: 0, x: -8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}>
                <td className="px-3 py-2.5 text-xs font-semibold text-foreground">{p.metric}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.current}</td>
                <td className="px-3 py-2.5 text-xs font-medium" style={{ color: "hsl(211 96% 56%)" }}>{p.d30}</td>
                <td className="px-3 py-2.5 text-xs font-medium" style={{ color: "hsl(197 92% 48%)" }}>{p.d60}</td>
                <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: "hsl(211 96% 56%)" }}>{p.d90}</td>
                <td className="px-3 py-2.5"><TrendIcon trend={p.trend} /></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
