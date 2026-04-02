import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign, Send, AlertTriangle, Wrench, CheckCircle2,
  Clock, ExternalLink, Copy, Users, ShieldAlert, ClipboardList,
  Eye, ArrowRight, Activity, X
} from "lucide-react";
import { toast } from "sonner";

interface ClientSummary {
  id: string;
  business_name: string;
  business_type: string | null;
  payment_status: string | null;
  portal_invite_status: string | null;
  portal_last_login_at: string | null;
  implementation_status: string | null;
  portal_access_enabled: boolean;
  workspace_slug: string | null;
  owner_email: string | null;
  profile_name: string | null;
  // Aggregate counts from parent
  setup_total: number;
  setup_completed: number;
  setup_overdue: number;
  setup_action_needed: number;
  setup_requested: number;
  setup_reminded: number;
  setup_revision: number;
  setup_blocked: number;
  team_pending: number;
  impl_total: number;
  impl_done: number;
  impl_blocked: number;
  next_due: string | null;
}

interface SetupItem {
  id: string;
  item_name: string;
  item_status: string;
  target_due_date: string | null;
  category: string | null;
}

interface ImplTask {
  id: string;
  task_title: string;
  task_status: string;
  due_date: string | null;
  blocked_by: string | null;
  assigned_to: string | null;
}

interface TeamMember {
  id: string;
  display_name: string | null;
  email: string | null;
  provisioning_status: string | null;
  workspace_role: string | null;
}

interface AuditEntry {
  id: string;
  action: string;
  module: string | null;
  created_at: string;
  status: string | null;
}

interface Props {
  client: ClientSummary | null;
  open: boolean;
  onClose: () => void;
}

function getNextBestAction(c: ClientSummary): { label: string; reason: string; icon: any; color: string } {
  if (c.payment_status !== "paid")
    return { label: "Collect payment", reason: "Portal and setup remain locked until payment is received.", icon: DollarSign, color: "text-amber-400" };
  if (!c.portal_access_enabled || c.portal_invite_status === "not_sent")
    return { label: "Send setup invite", reason: "Client is paid but has not received portal access yet.", icon: Send, color: "text-orange-400" };
  if (c.portal_invite_status === "sent" && !c.portal_last_login_at)
    return { label: "Follow up on invite", reason: "Invite was sent but client has not logged in yet.", icon: Clock, color: "text-blue-400" };
  if (c.setup_overdue > 0)
    return { label: `${c.setup_overdue} overdue item${c.setup_overdue > 1 ? "s" : ""}`, reason: "Setup items past their due date need follow-up.", icon: AlertTriangle, color: "text-red-400" };
  if (c.setup_action_needed > 0) {
    const parts: string[] = [];
    if (c.setup_requested > 0) parts.push(`${c.setup_requested} requested`);
    if (c.setup_reminded > 0) parts.push(`${c.setup_reminded} reminded`);
    if (c.setup_revision > 0) parts.push(`${c.setup_revision} revision`);
    return { label: "Follow up on setup", reason: `${parts.join(", ")} — awaiting client response.`, icon: ClipboardList, color: "text-amber-400" };
  }
  if (c.team_pending > 0)
    return { label: "Review team access", reason: `${c.team_pending} employee submission${c.team_pending > 1 ? "s" : ""} waiting for admin review.`, icon: Users, color: "text-purple-400" };
  if (c.impl_blocked > 0)
    return { label: "Resolve blocker", reason: `${c.impl_blocked} implementation task${c.impl_blocked > 1 ? "s" : ""} blocked.`, icon: ShieldAlert, color: "text-red-500" };
  if (c.payment_status === "paid" && c.implementation_status !== "complete" && c.setup_completed >= c.setup_total * 0.5)
    return { label: "Start implementation", reason: "Payment received and setup mostly complete — ready for internal work.", icon: Wrench, color: "text-emerald-400" };
  if (c.impl_total > 0 && c.impl_done >= c.impl_total * 0.9)
    return { label: "Final QA / complete", reason: "Implementation nearly done — run final checks.", icon: CheckCircle2, color: "text-green-400" };
  return { label: "Review status", reason: "No urgent action identified.", icon: Eye, color: "text-muted-foreground" };
}

function statusColor(status: string | null): string {
  const map: Record<string, string> = {
    paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    signed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    complete: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    in_progress: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    sent: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    unpaid: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    not_sent: "bg-muted text-muted-foreground border-border",
    not_started: "bg-muted text-muted-foreground border-border",
    waiting_on_client: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    failed: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  return map[status || ""] || "bg-muted text-muted-foreground border-border";
}

export default function ClientDetailDrawer({ client, open, onClose }: Props) {
  const [setupItems, setSetupItems] = useState<SetupItem[]>([]);
  const [implTasks, setImplTasks] = useState<ImplTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!client || !open) return;
    loadDetail(client.id);
  }, [client?.id, open]);

  async function loadDetail(clientId: string) {
    setLoadingDetail(true);
    const [setupRes, implRes, teamRes, auditRes] = await Promise.all([
      supabase.from("client_setup_items" as any).select("id, item_name, item_status, target_due_date, category").eq("client_id", clientId).order("target_due_date", { ascending: true, nullsFirst: false }),
      supabase.from("implementation_tasks").select("id, task_title, task_status, due_date, blocked_by, assigned_to").eq("client_id", clientId).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("workspace_users").select("id, display_name, email, provisioning_status, workspace_role").eq("client_id", clientId),
      supabase.from("audit_logs").select("id, action, module, created_at, status").eq("client_id", clientId).order("created_at", { ascending: false }).limit(15),
    ]);
    setSetupItems((setupRes.data || []) as any[]);
    setImplTasks((implRes.data || []) as any[]);
    setTeamMembers((teamRes.data || []) as any[]);
    setAuditLogs((auditRes.data || []) as any[]);
    setLoadingDetail(false);
  }

  if (!client) return null;

  const nba = getNextBestAction(client);
  const NbaIcon = nba.icon;
  const setupPct = client.setup_total > 0 ? Math.round((client.setup_completed / client.setup_total) * 100) : 0;
  const implPct = client.impl_total > 0 ? Math.round((client.impl_done / client.impl_total) * 100) : 0;

  // Urgent setup items: overdue/blocked/revision/requested first, limit 5
  const urgentOrder = ["overdue", "blocked", "revision_needed", "reminded", "requested", "missing", "received", "completed"];
  const sortedSetup = [...setupItems].sort((a, b) => urgentOrder.indexOf(a.item_status) - urgentOrder.indexOf(b.item_status));
  const topSetup = sortedSetup.slice(0, 5);

  // Team counts
  const teamActive = teamMembers.filter((t) => t.provisioning_status === "active").length;
  const teamInvited = teamMembers.filter((t) => t.provisioning_status === "invited").length;
  const teamPendingReview = teamMembers.filter((t) => t.provisioning_status && !["active", "deferred", "invited"].includes(t.provisioning_status)).length;

  // Impl breakdown
  const implNotStarted = implTasks.filter((t) => t.task_status === "todo" || t.task_status === "not_started").length;
  const implInProgress = implTasks.filter((t) => t.task_status === "in_progress").length;
  const implWaiting = implTasks.filter((t) => t.task_status === "waiting_on_client").length;
  const implBlocked = implTasks.filter((t) => t.blocked_by).length;
  const implDone = implTasks.filter((t) => t.task_status === "done").length;
  const nearestImpl = implTasks.find((t) => t.due_date && t.task_status !== "done");
  const blockerSummary = implTasks.filter((t) => t.blocked_by).map((t) => t.blocked_by!);

  const copyPortalLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/setup-portal`);
    toast.success("Portal link copied");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col" side="right">
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle className="text-lg font-bold text-foreground">{client.business_name}</SheetTitle>
          {client.profile_name && <div className="text-xs text-muted-foreground">{client.profile_name} · {client.owner_email || "No email"}</div>}
        </SheetHeader>

        <ScrollArea className="flex-1 px-5 pb-5">
          <div className="space-y-5">
            {/* ── Operator Recommendation ── */}
            <div className={`rounded-lg border p-3 space-y-1 ${nba.color === "text-muted-foreground" ? "border-border bg-muted/30" : "border-amber-500/20 bg-amber-500/5"}`}>
              <div className={`flex items-center gap-2 text-sm font-semibold ${nba.color}`}>
                <NbaIcon className="h-4 w-4 shrink-0" />
                {nba.label}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{nba.reason}</p>
            </div>

            {/* ── A. Client Summary ── */}
            <Section title="Client Summary">
              <div className="grid grid-cols-2 gap-3">
                <SummaryItem label="Payment" value={client.payment_status} />
                <SummaryItem label="Portal" value={client.portal_invite_status} />
                <SummaryItem label="Last Login" value={client.portal_last_login_at ? new Date(client.portal_last_login_at).toLocaleDateString() : "Never"} raw />
                <SummaryItem label="Implementation" value={client.implementation_status} />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div>
                  <div className="text-xs font-medium text-foreground">{setupPct}% setup</div>
                  <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${setupPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-foreground">{implPct}% impl</div>
                  <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${implPct}%` }} />
                  </div>
                </div>
              </div>
            </Section>

            <Separator />

            {/* ── B. Setup Snapshot ── */}
            <Section title="Setup Snapshot">
              {loadingDetail ? <LoadingSkeleton /> : (
                <>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <CountBadge n={setupItems.filter(s => s.item_status === "missing").length} label="missing" cls="bg-muted text-muted-foreground" />
                    <CountBadge n={client.setup_requested} label="requested" cls="bg-blue-500/10 text-blue-300" />
                    <CountBadge n={client.setup_reminded} label="reminded" cls="bg-amber-500/10 text-amber-300" />
                    <CountBadge n={client.setup_revision} label="revision" cls="bg-amber-500/10 text-amber-300" />
                    <CountBadge n={client.setup_blocked} label="blocked" cls="bg-red-500/10 text-red-400" />
                    <CountBadge n={client.setup_completed} label="done" cls="bg-emerald-500/10 text-emerald-300" />
                  </div>
                  {topSetup.length > 0 ? (
                    <div className="space-y-1.5">
                      {topSetup.map((si) => (
                        <div key={si.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className={`text-[9px] shrink-0 ${statusColor(si.item_status)}`}>
                              {si.item_status.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-foreground truncate">{si.item_name}</span>
                          </div>
                          {si.target_due_date && (
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                              {new Date(si.target_due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                      {setupItems.length > 5 && (
                        <Link to={`/admin/clients/${client.id}/lifecycle`} className="text-[11px] text-primary hover:underline">
                          View all {setupItems.length} items →
                        </Link>
                      )}
                    </div>
                  ) : <p className="text-xs text-muted-foreground">No setup items yet.</p>}
                </>
              )}
            </Section>

            <Separator />

            {/* ── C. Team Access Snapshot ── */}
            <Section title="Team Access">
              {loadingDetail ? <LoadingSkeleton /> : (
                <>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <CountBadge n={teamMembers.length} label="total" cls="bg-muted text-muted-foreground" />
                    <CountBadge n={teamPendingReview} label="pending" cls="bg-purple-500/10 text-purple-300" />
                    <CountBadge n={teamInvited} label="invited" cls="bg-blue-500/10 text-blue-300" />
                    <CountBadge n={teamActive} label="active" cls="bg-emerald-500/10 text-emerald-300" />
                  </div>
                  {teamMembers.length > 0 && (
                    <Link to={`/admin/clients/${client.id}/lifecycle`} className="text-[11px] text-primary hover:underline">
                      Open Team Access Review →
                    </Link>
                  )}
                </>
              )}
            </Section>

            <Separator />

            {/* ── D. Implementation Snapshot ── */}
            <Section title="Implementation">
              {loadingDetail ? <LoadingSkeleton /> : (
                <>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <CountBadge n={implNotStarted} label="not started" cls="bg-muted text-muted-foreground" />
                    <CountBadge n={implInProgress} label="in progress" cls="bg-blue-500/10 text-blue-300" />
                    <CountBadge n={implWaiting} label="waiting" cls="bg-amber-500/10 text-amber-300" />
                    <CountBadge n={implBlocked} label="blocked" cls="bg-red-500/10 text-red-400" />
                    <CountBadge n={implDone} label="done" cls="bg-emerald-500/10 text-emerald-300" />
                  </div>
                  {nearestImpl && (
                    <div className="text-xs text-muted-foreground">
                      Next due: <span className="text-foreground font-medium">{nearestImpl.task_title}</span> — {new Date(nearestImpl.due_date!).toLocaleDateString()}
                    </div>
                  )}
                  {blockerSummary.length > 0 && (
                    <div className="text-xs text-red-400 mt-1">
                      Blockers: {blockerSummary.slice(0, 3).join(", ")}{blockerSummary.length > 3 ? ` +${blockerSummary.length - 3} more` : ""}
                    </div>
                  )}
                  {implTasks.length > 0 && (
                    <Link to={`/admin/clients/${client.id}/implementation`} className="text-[11px] text-primary hover:underline mt-1 block">
                      Open Implementation →
                    </Link>
                  )}
                </>
              )}
            </Section>

            <Separator />

            {/* ── E. Recent Activity ── */}
            <Section title="Recent Activity">
              {loadingDetail ? <LoadingSkeleton /> : (
                auditLogs.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-xs">
                        <Activity className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-foreground">{log.action}</span>
                          {log.module && <span className="text-muted-foreground"> · {log.module}</span>}
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
              )}
            </Section>

            <Separator />

            {/* ── Quick Actions ── */}
            <Section title="Quick Actions">
              <div className="grid grid-cols-2 gap-2">
                <Link to={`/admin/clients/${client.id}/lifecycle`}>
                  <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-8">
                    <ExternalLink className="h-3.5 w-3.5" /> Lifecycle & Setup
                  </Button>
                </Link>
                <Link to={`/admin/clients/${client.id}/close`}>
                  <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-8">
                    <DollarSign className="h-3.5 w-3.5" /> Close Center
                  </Button>
                </Link>
                <Link to={`/admin/clients/${client.id}/implementation`}>
                  <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-8">
                    <Wrench className="h-3.5 w-3.5" /> Implementation
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-8" onClick={copyPortalLink}>
                  <Copy className="h-3.5 w-3.5" /> Copy Portal Link
                </Button>
              </div>
            </Section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/* ── Shared helpers ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

function CountBadge({ n, label, cls }: { n: number; label: string; cls: string }) {
  if (n === 0) return null;
  return <Badge variant="outline" className={`text-[9px] border-transparent ${cls}`}>{n} {label}</Badge>;
}

function SummaryItem({ label, value, raw }: { label: string; value: string | null; raw?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      {raw ? (
        <div className="text-xs text-foreground font-medium">{value || "—"}</div>
      ) : (
        <Badge variant="outline" className={`text-[10px] mt-0.5 ${statusColor(value)}`}>
          {(value || "—").replace(/_/g, " ")}
        </Badge>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return <div className="h-8 bg-muted/50 rounded animate-pulse" />;
}
