import { motion } from "framer-motion";
import { Globe, Search, Share2, Users, Megaphone, Shield } from "lucide-react";

const statuses = [
  { label: "Website", icon: Globe, status: "healthy" as const, detail: "99.8% uptime" },
  { label: "SEO", icon: Search, status: "warning" as const, detail: "Rankings dropped" },
  { label: "Social", icon: Share2, status: "healthy" as const, detail: "Active" },
  { label: "CRM", icon: Users, status: "healthy" as const, detail: "Automations running" },
  { label: "Ads", icon: Megaphone, status: "warning" as const, detail: "CPA rising" },
  { label: "Security", icon: Shield, status: "healthy" as const, detail: "All clear" },
];

const statusStyles = {
  healthy: { bg: "hsla(211,96%,56%,.1)", dot: "hsl(197 92% 58%)", text: "hsl(211 96% 46%)" },
  warning: { bg: "hsla(211,60%,56%,.1)", dot: "hsl(211 80% 70%)", text: "hsl(211 60% 50%)" },
  critical: { bg: "hsla(215,75%,48%,.1)", dot: "hsl(215 75% 48%)", text: "hsl(215 75% 40%)" },
};

export function SystemStatusBar() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {statuses.map((s, i) => {
        const style = statusStyles[s.status];
        return (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-3 flex items-center gap-2.5 transition-all duration-200 hover:shadow-md cursor-default"
            style={{
              background: "hsla(210,50%,99%,.8)",
              backdropFilter: "blur(12px)",
              border: "1px solid hsla(211,96%,56%,.08)",
            }}
          >
            <div className="relative">
              <s.icon className="h-4 w-4" style={{ color: style.text }} />
              <motion.div
                className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full"
                style={{ background: style.dot, boxShadow: `0 0 8px ${style.dot}` }}
                animate={s.status === "warning" ? { opacity: [1, 0.4, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-foreground truncate">{s.label}</p>
              <p className="text-[10px] truncate" style={{ color: style.text }}>{s.detail}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
