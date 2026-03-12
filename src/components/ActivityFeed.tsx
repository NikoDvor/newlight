import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DataCard } from "@/components/DataCard";
import {
  Search, Star, Globe, Users, Megaphone, Share2,
  FileText, Zap, TrendingUp, Brain
} from "lucide-react";

const allActivities = [
  { text: "AI discovered 3 new SEO keyword opportunities", icon: Search, time: "Just now" },
  { text: "New 5-star review received on Google", icon: Star, time: "2 min ago" },
  { text: "Website optimization suggestion generated", icon: Globe, time: "5 min ago" },
  { text: "New lead entered CRM from Google Ads", icon: Users, time: "8 min ago" },
  { text: "Market research data updated", icon: TrendingUp, time: "12 min ago" },
  { text: "Ad performance report ready", icon: Megaphone, time: "15 min ago" },
  { text: "Social media post scheduled for tomorrow", icon: Share2, time: "20 min ago" },
  { text: "AI analyzed competitor pricing strategy", icon: Brain, time: "25 min ago" },
  { text: "Monthly report auto-generated", icon: FileText, time: "30 min ago" },
  { text: "Lead scoring model updated", icon: Zap, time: "35 min ago" },
  { text: "Email campaign performance analyzed", icon: TrendingUp, time: "40 min ago" },
  { text: "New backlink opportunity discovered", icon: Search, time: "45 min ago" },
];

export function ActivityFeed() {
  const [activities, setActivities] = useState(allActivities.slice(0, 6));

  useEffect(() => {
    const newItems = [
      { text: "AI detected conversion rate improvement opportunity", icon: Brain, time: "Just now" },
      { text: "New lead from Facebook retargeting campaign", icon: Users, time: "Just now" },
      { text: "Review response drafted by AI", icon: Star, time: "Just now" },
    ];
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < newItems.length) {
        setActivities((prev) => [newItems[idx], ...prev.slice(0, 7)]);
        idx++;
      } else {
        idx = 0;
      }
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DataCard title="Live System Activity">
      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {activities.map((a, i) => (
            <motion.div
              key={a.text + i}
              initial={{ opacity: 0, x: -12, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, x: 12, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-2.5 py-2"
            >
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: "hsla(211,96%,56%,.08)",
                  border: "1px solid hsla(211,96%,56%,.06)",
                }}
              >
                <a.icon className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">{a.text}</p>
                <p className="text-[10px] text-muted-foreground">{a.time}</p>
              </div>
              {i === 0 && (
                <motion.div
                  className="h-1.5 w-1.5 rounded-full shrink-0 mt-2"
                  style={{ background: "hsl(197 92% 58%)" }}
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </DataCard>
  );
}
