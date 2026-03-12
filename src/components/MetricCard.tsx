import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
}

export function MetricCard({ label, value, change, changeType = "neutral", icon: Icon }: MetricCardProps) {
  return (
    <motion.div
      className="card-widget"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="metric-label">{label}</p>
          <p className="metric-value mt-2">{value}</p>
          {change && (
            <p className={`text-xs mt-1.5 font-medium ${
              changeType === "positive" ? "text-[hsl(199,92%,45%)]" :
              changeType === "negative" ? "text-[hsl(222,70%,42%)]" :
              "text-muted-foreground"
            }`}>
              {change}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-2.5 rounded-xl" style={{
            background: "linear-gradient(135deg, hsla(199,92%,65%,0.12), hsla(217,91%,60%,0.06))",
            boxShadow: "0 0 12px -4px hsla(213,94%,60%,.15)"
          }}>
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
