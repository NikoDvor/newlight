import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, AlertTriangle, XCircle, Zap, Mail, Plug } from "lucide-react";

/** Normalized, reusable status badge with consistent color-coding across the platform. */

const statusMap: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  // Deal / Pipeline
  new_lead: { label: "New Lead", color: "hsl(211 96% 56%)", bg: "hsla(211,96%,56%,.1)", icon: Circle },
  contacted: { label: "Contacted", color: "hsl(211 96% 56%)", bg: "hsla(211,96%,56%,.08)", icon: Zap },
  qualified: { label: "Qualified", color: "hsl(280 60% 50%)", bg: "hsla(280,60%,50%,.1)", icon: CheckCircle2 },
  proposal_sent: { label: "Proposal Sent", color: "hsl(38 92% 50%)", bg: "hsla(38,92%,50%,.1)", icon: Mail },
  closed_won: { label: "Closed Won", color: "hsl(152 60% 44%)", bg: "hsla(152,60%,44%,.1)", icon: CheckCircle2 },
  closed_lost: { label: "Closed Lost", color: "hsl(var(--muted-foreground))", bg: "hsla(210,40%,94%,.6)", icon: XCircle },

  // General
  active: { label: "Active", color: "hsl(152 60% 44%)", bg: "hsla(152,60%,44%,.1)", icon: CheckCircle2 },
  inactive: { label: "Inactive", color: "hsl(var(--muted-foreground))", bg: "hsla(210,40%,94%,.6)", icon: Circle },
  pending: { label: "Pending", color: "hsl(38 92% 50%)", bg: "hsla(38,92%,50%,.1)", icon: Clock },
  draft: { label: "Draft", color: "hsl(var(--muted-foreground))", bg: "hsla(210,40%,94%,.6)", icon: Circle },
  live: { label: "Live", color: "hsl(152 60% 44%)", bg: "hsla(152,60%,44%,.1)", icon: CheckCircle2 },
  archived: { label: "Archived", color: "hsl(var(--muted-foreground))", bg: "hsla(210,40%,94%,.4)", icon: XCircle },
  open: { label: "Open", color: "hsl(211 96% 56%)", bg: "hsla(211,96%,56%,.1)", icon: Circle },
  completed: { label: "Completed", color: "hsl(152 60% 44%)", bg: "hsla(152,60%,44%,.1)", icon: CheckCircle2 },
  failed: { label: "Failed", color: "hsl(0 72% 51%)", bg: "hsla(0,72%,51%,.1)", icon: XCircle },
  cancelled: { label: "Cancelled", color: "hsl(var(--muted-foreground))", bg: "hsla(210,40%,94%,.5)", icon: XCircle },
  no_show: { label: "No Show", color: "hsl(0 72% 51%)", bg: "hsla(0,72%,51%,.08)", icon: AlertTriangle },

  // Booking
  booked: { label: "Booked", color: "hsl(211 96% 56%)", bg: "hsla(211,96%,56%,.1)", icon: CheckCircle2 },
  confirmed: { label: "Confirmed", color: "hsl(152 60% 44%)", bg: "hsla(152,60%,44%,.08)", icon: CheckCircle2 },
  rescheduled: { label: "Rescheduled", color: "hsl(38 92% 50%)", bg: "hsla(38,92%,50%,.08)", icon: Clock },

  // Billing
  paid: { label: "Paid", color: "hsl(152 60% 44%)", bg: "hsla(152,60%,44%,.1)", icon: CheckCircle2 },
  overdue: { label: "Overdue", color: "hsl(0 72% 51%)", bg: "hsla(0,72%,51%,.1)", icon: AlertTriangle },
  billing_hold: { label: "Billing Hold", color: "hsl(0 72% 51%)", bg: "hsla(0,72%,51%,.08)", icon: AlertTriangle },

  // Integration
  connected: { label: "Connected", color: "hsl(152 60% 44%)", bg: "hsla(152,60%,44%,.1)", icon: CheckCircle2 },
  disconnected: { label: "Disconnected", color: "hsl(var(--muted-foreground))", bg: "hsla(210,40%,94%,.6)", icon: XCircle },
  not_started: { label: "Not Started", color: "hsl(var(--muted-foreground))", bg: "hsla(210,40%,94%,.6)", icon: Circle },
  access_needed: { label: "Access Needed", color: "hsl(38 92% 50%)", bg: "hsla(38,92%,50%,.1)", icon: Mail },
  ready_to_connect: { label: "Ready to Connect", color: "hsl(152 60% 44%)", bg: "hsla(152,60%,44%,.08)", icon: Plug },
  needs_reconnect: { label: "Needs Reconnect", color: "hsl(38 92% 50%)", bg: "hsla(38,92%,50%,.1)", icon: AlertTriangle },
  awaiting_operator: { label: "Awaiting Operator", color: "hsl(38 92% 50%)", bg: "hsla(38,92%,50%,.06)", icon: Clock },
  awaiting_client: { label: "Awaiting Client", color: "hsl(222 68% 44%)", bg: "hsla(222,68%,44%,.08)", icon: Clock },

  // Proposal
  sent: { label: "Sent", color: "hsl(211 96% 56%)", bg: "hsla(211,96%,56%,.1)", icon: Mail },
  viewed: { label: "Viewed", color: "hsl(280 60% 50%)", bg: "hsla(280,60%,50%,.08)", icon: CheckCircle2 },
  accepted: { label: "Accepted", color: "hsl(152 60% 44%)", bg: "hsla(152,60%,44%,.1)", icon: CheckCircle2 },
  declined: { label: "Declined", color: "hsl(0 72% 51%)", bg: "hsla(0,72%,51%,.1)", icon: XCircle },
  expired: { label: "Expired", color: "hsl(var(--muted-foreground))", bg: "hsla(210,40%,94%,.5)", icon: Clock },

  // Automation
  running: { label: "Running", color: "hsl(211 96% 56%)", bg: "hsla(211,96%,56%,.1)", icon: Zap },
  enabled: { label: "Enabled", color: "hsl(152 60% 44%)", bg: "hsla(152,60%,44%,.1)", icon: CheckCircle2 },
  disabled: { label: "Disabled", color: "hsl(var(--muted-foreground))", bg: "hsla(210,40%,94%,.6)", icon: Circle },

  // Workspace
  demo: { label: "Demo", color: "hsl(280 60% 50%)", bg: "hsla(280,60%,50%,.1)", icon: Zap },
  provisioning: { label: "Provisioning", color: "hsl(38 92% 50%)", bg: "hsla(38,92%,50%,.1)", icon: Clock },
  suspended: { label: "Suspended", color: "hsl(0 72% 51%)", bg: "hsla(0,72%,51%,.1)", icon: AlertTriangle },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status?.toLowerCase().replace(/[\s-]+/g, "_") || "draft";
  const meta = statusMap[normalized] || { label: status, color: "hsl(var(--muted-foreground))", bg: "hsla(210,40%,94%,.6)", icon: Circle };
  const Icon = meta.icon;

  return (
    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 gap-1 ${className || ""}`}
      style={{ color: meta.color, background: meta.bg, borderColor: "transparent" }}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  );
}
