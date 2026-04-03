import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DataCard } from "@/components/DataCard";
import {
  Search, Star, Globe, Users, Megaphone, Share2,
  FileText, Zap, TrendingUp, Brain, Calendar, DollarSign,
  CheckCircle, Send, UserPlus, Briefcase
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

const ACTIVITY_ICONS: Record<string, any> = {
  contact_created: UserPlus,
  deal_created: Briefcase,
  stage_changed: TrendingUp,
  appointment_booked: Calendar,
  appointment_confirmed: CheckCircle,
  appointment_completed: CheckCircle,
  appointment_cancelled: Zap,
  appointment_rescheduled: Calendar,
  appointment_status_changed: CheckCircle,
  no_show: Users,
  review_request_sent: Send,
  review_request_auto: Star,
  review_feedback_received: Star,
  negative_feedback: Star,
  task_completed: Zap,
  default: Globe,
};

export function ActivityFeed() {
  const { activeClientId } = useWorkspace();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    const fetchActivities = async () => {
      const { data } = await supabase
        .from("crm_activities")
        .select("*")
        .eq("client_id", activeClientId)
        .order("created_at", { ascending: false })
        .limit(8);
      setActivities(data || []);
      setLoading(false);
    };
    fetchActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`activity-feed-${activeClientId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "crm_activities",
        filter: `client_id=eq.${activeClientId}`,
      }, (payload) => {
        setActivities((prev) => [payload.new, ...prev.slice(0, 7)]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeClientId]);

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  // Show placeholder when no real data
  if (!activeClientId || (activities.length === 0 && !loading)) {
    const placeholders = [
      { text: "AI discovered 3 new SEO keyword opportunities", icon: Search, time: "Just now" },
      { text: "New 5-star review received on Google", icon: Star, time: "2 min ago" },
      { text: "Website optimization suggestion generated", icon: Globe, time: "5 min ago" },
      { text: "New lead entered CRM from Google Ads", icon: Users, time: "8 min ago" },
      { text: "Ad performance report ready", icon: Megaphone, time: "15 min ago" },
      { text: "Social media post scheduled for tomorrow", icon: Share2, time: "20 min ago" },
    ];
    return (
      <DataCard title="Live System Activity">
        <div className="space-y-1">
          {placeholders.map((a, i) => (
            <div key={i} className="flex items-start gap-2.5 py-2 opacity-50">
              <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "hsla(211,96%,56%,.08)", border: "1px solid hsla(211,96%,56%,.06)" }}>
                <a.icon className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">{a.text}</p>
                <p className="text-[10px] text-muted-foreground">{a.time}</p>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground text-center pt-2">
            Activity will appear here as you use the platform
          </p>
        </div>
      </DataCard>
    );
  }

  return (
    <DataCard title="Live System Activity">
      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {activities.map((a, i) => {
            const Icon = ACTIVITY_ICONS[a.activity_type] || ACTIVITY_ICONS.default;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -12, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 12, height: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-2.5 py-2"
              >
                <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "hsla(211,96%,56%,.08)", border: "1px solid hsla(211,96%,56%,.06)" }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">{a.activity_note || a.activity_type}</p>
                  <p className="text-[10px] text-muted-foreground">{formatTime(a.created_at)}</p>
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
            );
          })}
        </AnimatePresence>
      </div>
    </DataCard>
  );
}
