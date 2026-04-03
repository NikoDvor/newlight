import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { DataCard } from "@/components/DataCard";
import { motion } from "framer-motion";
import {
  Activity, Zap, Bell, RefreshCw,
  Users, Star, Search, Globe, Megaphone, Share2,
  Mail, Calendar, FileText, TrendingUp, UserPlus,
  Briefcase, CheckCircle, Send
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

const ACTIVITY_ICONS: Record<string, any> = {
  contact_created: UserPlus,
  deal_created: Briefcase,
  stage_changed: TrendingUp,
  appointment_booked: Calendar,
  appointment_status_changed: CheckCircle,
  review_request_sent: Send,
  review_request_auto: Star,
  task_completed: Zap,
  default: Globe,
};

const typeColor = (type: string) => {
  switch (type) {
    case "contact_created": case "deal_created": return "hsl(211 96% 56%)";
    case "appointment_booked": case "appointment_status_changed": return "hsl(197 92% 58%)";
    case "review_request_sent": case "review_request_auto": return "hsl(38 92% 50%)";
    case "stage_changed": return "hsl(152 60% 44%)";
    default: return "hsl(211 80% 65%)";
  }
};

export default function LiveActivity() {
  const { activeClientId } = useWorkspace();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from("crm_activities")
        .select("*")
        .eq("client_id", activeClientId)
        .order("created_at", { ascending: false })
        .limit(50);
      setActivities(data || []);
      setLoading(false);
    };
    fetch();

    const channel = supabase
      .channel(`live-activity-page-${activeClientId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "crm_activities",
        filter: `client_id=eq.${activeClientId}`,
      }, (payload) => {
        setActivities((prev) => [payload.new, ...prev.slice(0, 49)]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeClientId]);

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const todayCount = activities.filter(a => {
    const d = new Date(a.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  const automationCount = activities.filter(a =>
    a.activity_type?.includes("auto") || a.activity_type?.includes("automation")
  ).length;

  return (
    <div>
      <PageHeader title="Live Activity Feed" description="Real-time platform actions and system events" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Events Today" value={String(todayCount)} change="Live tracking" changeType="positive" icon={Activity} />
        <MetricCard label="Total Activities" value={String(activities.length)} change="Last 50 shown" changeType="neutral" icon={Zap} />
        <MetricCard label="Automations" value={String(automationCount)} change="Auto-triggered" changeType="positive" icon={Bell} />
        <MetricCard label="System Status" value="Online" change="All systems operational" changeType="positive" icon={RefreshCw} />
      </WidgetGrid>

      <DataCard title="Activity Stream" className="mt-6">
        <div className="space-y-1">
          {activities.length === 0 && !loading && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No activity recorded yet. Events will appear as you use CRM, Calendar, and Reviews.</p>
            </div>
          )}
          {activities.map((item, i) => {
            const Icon = ACTIVITY_ICONS[item.activity_type] || ACTIVITY_ICONS.default;
            const color = typeColor(item.activity_type);
            return (
              <motion.div
                key={item.id}
                className="flex items-start gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-primary/[0.03]"
                initial={{ opacity: 0, x: -6 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.02 }}
              >
                <div className="mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}12` }}>
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.activity_note || item.activity_type}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.activity_type?.replace(/_/g, " ")}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 mt-1">{formatTime(item.created_at)}</span>
              </motion.div>
            );
          })}
        </div>
      </DataCard>
    </div>
  );
}
