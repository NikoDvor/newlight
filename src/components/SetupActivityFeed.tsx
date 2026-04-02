import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell, Send, CheckCircle2, RotateCcw, AlertTriangle, Ban,
  MessageSquare, Upload, Clock
} from "lucide-react";

interface FeedEntry {
  id: string;
  action: string;
  created_at: string;
  metadata: any;
}

const ACTION_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  setup_item_requested: { icon: Send, label: "Item requested by your team", color: "hsl(38 92% 50%)" },
  setup_item_reminded: { icon: Bell, label: "Reminder sent", color: "hsl(24 90% 50%)" },
  setup_item_received: { icon: CheckCircle2, label: "Submission received", color: "hsl(211 96% 56%)" },
  setup_item_completed: { icon: CheckCircle2, label: "Item completed", color: "hsl(152 60% 44%)" },
  setup_item_returned_for_revision: { icon: RotateCcw, label: "Revision requested", color: "hsl(270 60% 60%)" },
  setup_item_blocked: { icon: Ban, label: "Item blocked", color: "hsl(0 70% 50%)" },
  bulk_setup_request: { icon: Send, label: "Multiple items requested", color: "hsl(38 92% 50%)" },
  bulk_setup_reminder: { icon: Bell, label: "Bulk reminder sent", color: "hsl(24 90% 50%)" },
  client_setup_response_submitted: { icon: Upload, label: "You submitted an item", color: "hsl(152 60% 44%)" },
  client_setup_revision_resubmitted: { icon: RotateCcw, label: "Revision resubmitted", color: "hsl(152 60% 44%)" },
  client_setup_file_reuploaded: { icon: Upload, label: "File uploaded", color: "hsl(211 96% 56%)" },
  notification_request_email: { icon: Send, label: "Request email sent", color: "hsl(38 92% 50%)" },
  notification_reminder_email: { icon: Bell, label: "Reminder email sent", color: "hsl(24 90% 50%)" },
  notification_request_portal: { icon: MessageSquare, label: "New request posted", color: "hsl(38 92% 50%)" },
  notification_reminder_portal: { icon: Bell, label: "Reminder posted", color: "hsl(24 90% 50%)" },
  lifecycle_status_change: { icon: CheckCircle2, label: "Status updated", color: "hsl(211 96% 56%)" },
  portal_invite_sent: { icon: Send, label: "Portal invite sent", color: "hsl(211 96% 56%)" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface SetupActivityFeedProps {
  clientId: string;
  lastVisit?: string | null;
  maxItems?: number;
}

export function SetupActivityFeed({ clientId, lastVisit, maxItems = 20 }: SetupActivityFeedProps) {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      const setupActions = Object.keys(ACTION_CONFIG);
      const { data } = await supabase
        .from("audit_logs")
        .select("id, action, created_at, metadata")
        .eq("client_id", clientId)
        .in("action", setupActions)
        .order("created_at", { ascending: false })
        .limit(maxItems);
      setEntries((data || []) as FeedEntry[]);
      setLoading(false);
    };
    fetchFeed();
  }, [clientId, maxItems]);

  const newCount = useMemo(() => {
    if (!lastVisit) return entries.length;
    return entries.filter(e => new Date(e.created_at) > new Date(lastVisit)).length;
  }, [entries, lastVisit]);

  if (loading) return null;
  if (entries.length === 0) return null;

  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Recent Updates
          {newCount > 0 && (
            <Badge variant="default" className="text-[9px] ml-1 px-1.5 py-0">
              {newCount} new
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div className="space-y-1">
          {entries.map((entry) => {
            const config = ACTION_CONFIG[entry.action] || {
              icon: MessageSquare,
              label: entry.action.replace(/_/g, " "),
              color: "hsl(211 96% 56%)",
            };
            const Icon = config.icon;
            const isNew = lastVisit && new Date(entry.created_at) > new Date(lastVisit);
            const itemLabel = entry.metadata?.item_label || entry.metadata?.item_key || "";
            const count = entry.metadata?.count;

            return (
              <div
                key={entry.id}
                className={`flex items-start gap-2.5 py-2 px-2 rounded-lg transition-colors ${
                  isNew ? "bg-primary/[0.04]" : ""
                }`}
              >
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${config.color}15` }}
                >
                  <Icon className="h-3 w-3" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">
                    {config.label}
                    {itemLabel && <span className="font-medium"> — {itemLabel}</span>}
                    {count && <span className="text-muted-foreground"> ({count} items)</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{timeAgo(entry.created_at)}</p>
                </div>
                {isNew && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                    NEW
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
