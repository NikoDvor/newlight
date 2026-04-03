import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { SetupBanner } from "@/components/SetupBanner";
import { DataCard } from "@/components/DataCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell, Users, Star, Zap, CheckSquare, GitBranch,
  MessageSquare, Calendar, Plug, Check, Trash2
} from "lucide-react";
import { motion } from "framer-motion";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const TYPE_ICON: Record<string, typeof Bell> = {
  lead: Users, review: Star, automation: Zap, task: CheckSquare,
  pipeline: GitBranch, chat: MessageSquare, calendar: Calendar,
  integration: Plug, system: Bell,
};

const TYPE_STYLE: Record<string, string> = {
  lead: "bg-blue-50 text-blue-600", review: "bg-amber-50 text-amber-600",
  automation: "bg-violet-50 text-violet-600", task: "bg-emerald-50 text-emerald-600",
  pipeline: "bg-cyan-50 text-cyan-600", chat: "bg-indigo-50 text-indigo-600",
  calendar: "bg-pink-50 text-pink-600", integration: "bg-orange-50 text-orange-600",
  system: "bg-secondary text-muted-foreground",
};

export default function Notifications() {
  const { activeClientId } = useWorkspace();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchNotifications = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("client_id", activeClientId)
      .order("created_at", { ascending: false })
      .limit(100);
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, [activeClientId]);

  // Realtime subscription
  useEffect(() => {
    if (!activeClientId) return;
    const channel = supabase
      .channel(`notifications-realtime-${activeClientId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `client_id=eq.${activeClientId}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as any, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeClientId]);

  const markAllRead = async () => {
    if (!activeClientId) return;
    await supabase.from("notifications").update({ is_read: true }).eq("client_id", activeClientId).eq("is_read", false);
    toast({ title: "All notifications marked as read" });
    fetchNotifications();
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const hasRealData = notifications.length > 0;
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const filtered = filter === "all" ? notifications : filter === "unread" ? notifications.filter(n => !n.is_read) : notifications.filter(n => n.type === filter);

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Notifications" description="Alerts and system updates" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to view notifications.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Notifications" description="Alerts, updates, and system events">
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={markAllRead}>
            <Check className="h-3.5 w-3.5" /> Mark All Read ({unreadCount})
          </Button>
        )}
      </PageHeader>

      <ModuleHelpPanel
        moduleName="Notifications"
        description="Notifications are triggered automatically across the platform — new leads, booked appointments, review feedback, task assignments, integration issues, and more. All events are logged here in real time."
        tips={[
          "Notifications are created automatically by platform events",
          "Unread notifications show a blue indicator dot",
          "Click a notification to mark it as read",
        ]}
      />

      {!hasRealData && (
        <SetupBanner
          icon={Bell}
          title="No Notifications Yet"
          description="Notifications will appear here automatically as you use the platform — new leads, appointments, reviews, tasks, and system events will all trigger alerts."
        />
      )}

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {["all", "unread", "lead", "review", "calendar", "task", "chat", "integration", "system"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-colors capitalize ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {f === "all" ? "All" : f === "unread" ? `Unread (${unreadCount})` : f}
          </button>
        ))}
      </div>

      <DataCard title={`Notifications${filtered.length > 0 ? ` (${filtered.length})` : ""}`}>
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
              <Bell className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <p className="text-xs text-muted-foreground">Platform events will appear here in real time.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((n, i) => {
              const Icon = TYPE_ICON[n.type] || Bell;
              const style = TYPE_STYLE[n.type] || TYPE_STYLE.system;
              return (
                <motion.button
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-colors ${
                    n.is_read ? "opacity-60" : "hover:bg-secondary/50"
                  }`}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <div className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${style}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.is_read ? "text-muted-foreground" : "font-medium text-foreground"}`}>{n.title}</p>
                    {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
                </motion.button>
              );
            })}
          </div>
        )}
      </DataCard>
    </div>
  );
}
