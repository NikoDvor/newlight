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
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="metric-label">{label}</p>
          <p className="metric-value mt-2">{value}</p>
          {change && (
            <p className={`text-xs mt-1 font-medium ${
              changeType === "positive" ? "text-emerald-600" :
              changeType === "negative" ? "text-red-500" :
              "text-muted-foreground"
            }`}>
              {change}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-secondary">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
