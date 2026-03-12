import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { Button } from "@/components/ui/button";
import {
  Bell, Users, Star, Zap, CheckSquare, GitBranch,
  MessageSquare, Calendar, FileText, X
} from "lucide-react";
import { motion } from "framer-motion";

interface Notification {
  id: string;
  text: string;
  type: "lead" | "review" | "workflow" | "task" | "pipeline";
  time: string;
  read: boolean;
}

const NOTIF_ICON: Record<string, typeof Bell> = {
  lead: Users,
  review: Star,
  workflow: Zap,
  task: CheckSquare,
  pipeline: GitBranch,
};

const mockNotifications: Notification[] = [
  { id: "n1", text: "New lead captured: Rachel Green from FitLife Studios", type: "lead", time: "2 min ago", read: false },
  { id: "n2", text: "5-star review received on Google from John D.", type: "review", time: "1 hour ago", read: false },
  { id: "n3", text: "Automation 'New Lead Nurture' triggered for Tom Harris", type: "workflow", time: "2 hours ago", read: false },
  { id: "n4", text: "Task due soon: Review ad copy for Q2 campaign", type: "task", time: "3 hours ago", read: true },
  { id: "n5", text: "Pipeline updated: Lisa Park moved to 'Proposal Booked'", type: "pipeline", time: "4 hours ago", read: true },
  { id: "n6", text: "New lead captured: James Brooks from BrooksCPA", type: "lead", time: "5 hours ago", read: true },
  { id: "n7", text: "Review request completed by Maria Santos", type: "review", time: "6 hours ago", read: true },
  { id: "n8", text: "Task completed: Update landing page copy", type: "task", time: "8 hours ago", read: true },
];

const activityFeed = [
  { text: "Lead added to CRM: Rachel Green", icon: Users, time: "2 min ago" },
  { text: "Post scheduled on Instagram: Spring campaign", icon: MessageSquare, time: "30 min ago" },
  { text: "Review request sent to Tom Harris", icon: Star, time: "1 hour ago" },
  { text: "Pipeline updated: Lisa Park → Proposal Booked", icon: GitBranch, time: "2 hours ago" },
  { text: "Meeting booked: Strategy Review at 2:00 PM", icon: Calendar, time: "3 hours ago" },
  { text: "Report generated: Weekly Performance", icon: FileText, time: "4 hours ago" },
  { text: "Automation triggered: Post-Service Review for David Smith", icon: Zap, time: "5 hours ago" },
  { text: "Task assigned to Alex M.: Prepare audit pack", icon: CheckSquare, time: "6 hours ago" },
];

export default function Notifications() {
  return (
    <div>
      <PageHeader title="Notifications & Activity" description="Alerts and team activity feed">
        <Button variant="outline" size="sm">Mark All Read</Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Notifications */}
        <DataCard title="Notifications">
          <div className="space-y-2">
            {mockNotifications.map((n) => {
              const Icon = NOTIF_ICON[n.type];
              return (
                <motion.div
                  key={n.id}
                  className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                    n.read ? "" : "bg-accent/5"
                  }`}
                  initial={{ opacity: 0, x: -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                >
                  <div className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                    n.read ? "bg-secondary" : "bg-accent/10"
                  }`}>
                    <Icon className={`h-3.5 w-3.5 ${n.read ? "text-muted-foreground" : "text-accent"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.read ? "text-muted-foreground" : "font-medium"}`}>{n.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                  </div>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-accent shrink-0 mt-2" />}
                </motion.div>
              );
            })}
          </div>
        </DataCard>

        {/* Activity Feed */}
        <DataCard title="Team Activity">
          <div className="space-y-1">
            {activityFeed.map((item, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                initial={{ opacity: 0, x: 6 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{item.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </DataCard>
      </div>
    </div>
  );
}
