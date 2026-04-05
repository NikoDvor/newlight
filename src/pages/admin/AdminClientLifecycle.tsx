import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft, FileSignature, CreditCard, Wrench, CheckCircle2, Clock,
  AlertTriangle, Package, RefreshCw, Mail, Copy, Link2, Send, UserCheck, Eye
} from "lucide-react";
import { seedSetupItems, CATEGORY_LABELS, CATEGORY_ORDER, ITEM_STATUS_OPTIONS } from "@/lib/setupItemsSeeder";
import { useSetupProgress } from "@/hooks/useSetupProgress";
import { TeamAccessReview } from "@/components/admin/TeamAccessReview";
import { SetupItemActions, BulkRequestActions, type SetupItemWithRequest } from "@/components/admin/SetupItemActions";
import { ProposalRevealControls } from "@/components/admin/ProposalRevealControls";
import { BusinessIntelligencePreview } from "@/components/BusinessIntelligencePreview";

interface ClientData {
  id: string;
  business_name: string;
  workspace_slug: string;
  owner_email: string | null;
  owner_name: string | null;
  proposal_status: string;
  agreement_status: string;
  payment_status: string;
  implementation_status: string;
  onboarding_stage: string;
  status: string;
  portal_invite_status: string;
  portal_last_invited_at: string | null;
  portal_last_login_at: string | null;
  portal_access_enabled: boolean;
}

const STATUS_CONFIGS: Record<string, { icon: any; steps: { value: string; label: string }[] }> = {
  proposal: {
    icon: FileSignature,
    steps: [
      { value: "not_sent", label: "Not Sent" },
      { value: "sent", label: "Sent" },
      { value: "viewed", label: "Viewed" },
      { value: "approved", label: "Approved" },
      { value: "declined", label: "Declined" },
    ],
  },
  agreement: {
    icon: Package,
    steps: [
      { value: "not_sent", label: "Not Sent" },
      { value: "sent", label: "Sent" },
      { value: "signed", label: "Signed" },
    ],
  },
  payment: {
    icon: CreditCard,
    steps: [
      { value: "unpaid", label: "Unpaid" },
      { value: "pending", label: "Pending" },
      { value: "paid", label: "Paid" },
      { value: "failed", label: "Failed" },
    ],
  },
  implementation: {
    icon: Wrench,
    steps: [
      { value: "not_started", label: "Not Started" },
      { value: "waiting_on_client", label: "Waiting on Client" },
      { value: "access_requested", label: "Access Requested" },
      { value: "access_received", label: "Access Received" },
      { value: "in_progress", label: "In Progress" },
      { value: "complete", label: "Complete" },
    ],
  },
};

const statusStepColor = (value: string, current: string, allSteps: { value: string }[]) => {
  const idx = allSteps.findIndex(s => s.value === current);
  const thisIdx = allSteps.findIndex(s => s.value === value);
  if (value === current) {
    if (["approved", "signed", "paid", "complete", "access_received"].includes(value)) return "bg-emerald-500 text-white";
    if (["declined", "failed"].includes(value)) return "bg-red-500 text-white";
    return "bg-[hsl(var(--nl-electric))] text-white";
  }
  if (thisIdx < idx) return "bg-emerald-500/20 text-emerald-300";
  return "bg-white/5 text-white/25";
};

const PORTAL_STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  not_sent: { label: "Not Sent", color: "text-white/40" },
  sent: { label: "Invite Sent", color: "text-amber-400" },
  accepted: { label: "Accepted", color: "text-emerald-400" },
  expired: { label: "Expired", color: "text-red-400" },
};

export default function AdminClientLifecycle() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientData | null>(null);
  const [setupItems, setSetupItems] = useState<SetupItemWithRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const { progress } = useSetupProgress(clientId || null);

  const load = async () => {
    if (!clientId) return;
    const [clientRes, itemsRes] = await Promise.all([
      supabase.from("clients").select("id, business_name, workspace_slug, owner_email, owner_name, proposal_status, agreement_status, payment_status, implementation_status, onboarding_stage, status, portal_invite_status, portal_last_invited_at, portal_last_login_at, portal_access_enabled").eq("id", clientId).single(),
      supabase.from("client_setup_items" as any).select("*").eq("client_id", clientId).order("created_at"),
    ]);
    if (clientRes.data) setClient(clientRes.data as any);
    const items = (itemsRes.data || []) as any as SetupItemWithRequest[];
    if (items.length === 0) {
      await seedSetupItems(clientId);
      const { data: seeded } = await supabase.from("client_setup_items" as any).select("*").eq("client_id", clientId).order("created_at");
      setSetupItems((seeded || []) as any as SetupItemWithRequest[]);
    } else {
      setSetupItems(items);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [clientId]);

  const updateLifecycleStatus = async (field: string, value: string) => {
    if (!clientId) return;
    setSaving(true);
    await supabase.from("clients").update({ [field]: value } as any).eq("id", clientId);
    await supabase.from("audit_logs").insert({
      client_id: clientId,
      action: `lifecycle_status_change`,
      module: "lifecycle",
      metadata: { field, value } as any,
    });
    setClient(prev => prev ? { ...prev, [field]: value } : prev);
    toast.success(`Updated ${field.replace(/_/g, " ")}`);
    setSaving(false);
  };

  const handleItemUpdate = (itemId: string, updates: Partial<SetupItemWithRequest>) => {
    setSetupItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updates } : i));
  };

  const handleBulkUpdate = (updates: Array<{ id: string; updates: Partial<SetupItemWithRequest> }>) => {
    setSetupItems(prev => prev.map(i => {
      const u = updates.find(u => u.id === i.id);
      return u ? { ...i, ...u.updates } : i;
    }));
  };

  const updateSetupItemNotes = async (itemId: string, notes: string) => {
    await supabase.from("client_setup_items" as any).update({ admin_notes: notes }).eq("id", itemId);
    setSetupItems(prev => prev.map(i => i.id === itemId ? { ...i, admin_notes: notes } : i));
  };

  const handleSendPortalInvite = async () => {
    if (!client?.owner_email || !clientId) return;
    if (sendingInvite) return; // double-click guard
    setSendingInvite(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email: client.owner_email, role: "client_owner", client_id: clientId },
      });
      const now = new Date().toISOString();
      await supabase.from("clients").update({
        portal_invite_status: "sent",
        portal_last_invited_at: now,
        portal_access_enabled: true,
      } as any).eq("id", clientId);

      if (error) {
        toast.error("Invite failed: " + error.message);
      } else if (data?.invite_email_sent) {
        toast.success("Setup portal invite sent!");
      } else if (data?.already_existed) {
        toast.success("User already has access — invite status updated.");
      } else if (data?.setup_link) {
        navigator.clipboard.writeText(data.setup_link);
        toast.success("Setup link copied to clipboard!");
      } else {
        toast.success("Invite processed");
      }

      await supabase.from("audit_logs").insert({
        client_id: clientId,
        action: "portal_invite_sent",
        module: "lifecycle",
        metadata: { email: client.owner_email, method: "admin_lifecycle" } as any,
      });
      setClient(prev => prev ? { ...prev, portal_invite_status: "sent", portal_last_invited_at: now, portal_access_enabled: true } : prev);
    } catch (err) {
      toast.error("Failed to send invite");
    }
    setSendingInvite(false);
  };

  const copyPortalLink = () => {
    if (!client) return;
    const link = `${window.location.origin}/auth?redirect=/setup-portal`;
    navigator.clipboard.writeText(link);
    toast.success("Setup portal link copied!");
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      <p className="text-sm text-muted-foreground">Loading lifecycle…</p>
    </div>
  );
  if (!client) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertTriangle className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Client not found</p>
      <Button variant="outline" size="sm" onClick={() => navigate("/admin/onboarding-command-center")}>
        Back to Command Center
      </Button>
    </div>
  );

  const isPaid = client.payment_status === "paid";
  const portalLink = `${window.location.origin}/auth?redirect=/setup-portal`;
  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    items: setupItems.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0);

  const totalItems = setupItems.length;
  const completedItems = setupItems.filter(i => i.item_status === "completed").length;
  const missingItems = setupItems.filter(i => i.item_status === "missing").length;
  const requestedItems = setupItems.filter(i => ["requested", "reminded"].includes(i.item_status)).length;
  const overdueItems = setupItems.filter(i => i.target_due_date && new Date(i.target_due_date) < new Date() && !["completed", "received"].includes(i.item_status)).length;
  const waitingItems = setupItems.filter(i => ["requested", "reminded", "revision_needed"].includes(i.item_status)).length;
  const blockedItems = setupItems.filter(i => i.item_status === "blocked").length;
  const portalStatus = PORTAL_STATUS_DISPLAY[client.portal_invite_status] || PORTAL_STATUS_DISPLAY.not_sent;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/clients")} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="h-4 w-4 text-white/40" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{client.business_name}</h1>
            <Badge variant="outline" className="text-[10px] bg-[hsl(var(--nl-electric))]/10 text-[hsl(var(--nl-sky))] border-[hsl(var(--nl-electric))]/20">Step 1</Badge>
          </div>
          <p className="text-sm text-white/40">Step 1 — Client Intake & Setup · Collect assets, credentials, and calendar/booking info</p>
        </div>
      </div>

      {/* Proposal Reveal & Payment Unlock Controls */}
      <ProposalRevealControls
        stages={{
          clientId: client.id,
          proposalStatus: client.proposal_status,
          agreementStatus: client.agreement_status,
          paymentStatus: client.payment_status,
          implementationStatus: client.implementation_status,
        }}
        onUpdate={load}
      />

      {/* Portal Invite & Access Card */}
      <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.12)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
            Client Portal Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Invite Status</p>
              <p className={`text-sm font-medium ${portalStatus.color}`}>{portalStatus.label}</p>
            </div>
            {client.portal_last_invited_at && (
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Last Invited</p>
                <p className="text-xs text-white/60">{new Date(client.portal_last_invited_at).toLocaleString()}</p>
              </div>
            )}
            {client.portal_last_login_at && (
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Last Login</p>
                <p className="text-xs text-emerald-400">{new Date(client.portal_last_login_at).toLocaleString()}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Access</p>
              <p className={`text-xs font-medium ${client.portal_access_enabled ? "text-emerald-400" : "text-white/30"}`}>
                {client.portal_access_enabled ? "Enabled" : "Disabled"}
              </p>
            </div>
          </div>
          {progress.total > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-white/40">Client Setup Completion</p>
                <span className="text-xs font-bold text-[hsl(var(--nl-sky))]">{progress.percentage}%</span>
              </div>
              <Progress value={progress.percentage} className="h-1.5" />
              <div className="flex gap-3 mt-1.5">
                {[
                  { label: "Completed", value: progress.completed, color: "text-emerald-400" },
                  { label: "Under Review", value: progress.received, color: "text-[hsl(var(--nl-sky))]" },
                  { label: "Missing", value: progress.missing, color: "text-red-400" },
                ].map(s => (
                  <span key={s.label} className="text-[9px] text-white/30">
                    <span className={`font-bold ${s.color}`}>{s.value}</span> {s.label}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            {isPaid ? (
              <>
                <Button size="sm" onClick={handleSendPortalInvite} disabled={sendingInvite || !client.owner_email} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white gap-1.5 text-xs h-8">
                  {sendingInvite ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  {client.portal_invite_status === "not_sent" ? "Send Setup Invite" : "Resend Invite"}
                </Button>
                <Button size="sm" variant="outline" onClick={copyPortalLink} className="border-white/10 text-white hover:bg-white/10 gap-1.5 text-xs h-8">
                  <Copy className="h-3 w-3" /> Copy Portal Link
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.open(`${window.location.origin}/auth?redirect=/setup-portal`, "_blank")} className="border-white/10 text-white hover:bg-white/10 gap-1.5 text-xs h-8">
                  <Eye className="h-3 w-3" /> Preview Portal
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Mark payment as "Paid" to enable portal invites
              </div>
            )}
          </div>
          {!client.owner_email && <p className="text-[10px] text-red-400">No owner email on file — cannot send invite</p>}
        </CardContent>
      </Card>

      {/* Team Access Provisioning */}
      <TeamAccessReview
        clientId={clientId!}
        teamMembersJson={setupItems.find(i => i.item_key === "team_members")?.client_value || null}
        onRefresh={load}
      />

      {/* Lifecycle Status Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(["proposal", "agreement", "payment", "implementation"] as const).map(key => {
          const config = STATUS_CONFIGS[key];
          const Icon = config.icon;
          const fieldName = `${key}_status`;
          const currentValue = (client as any)[fieldName] as string;
          return (
            <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
                    {key} Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {config.steps.map(step => (
                      <button key={step.value} onClick={() => updateLifecycleStatus(fieldName, step.value)} disabled={saving}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${statusStepColor(step.value, currentValue, config.steps)}`}>
                        {step.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Payment Gate Banner */}
      {!isPaid && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: "hsla(38,92%,50%,.08)", border: "1px solid hsla(38,92%,50%,.2)" }}>
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">Payment Required</p>
            <p className="text-xs text-white/50">Setup and implementation actions are blocked until payment is confirmed.</p>
          </div>
        </div>
      )}

      {/* Setup Request Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { label: "Total", value: totalItems, color: "hsl(var(--nl-sky))" },
          { label: "Missing", value: missingItems, color: "hsl(0 70% 60%)" },
          { label: "Requested", value: requestedItems, color: "hsl(38 92% 50%)" },
          { label: "Waiting", value: waitingItems, color: "hsl(38 92% 50%)" },
          { label: "Overdue", value: overdueItems, color: "hsl(0 70% 50%)" },
          { label: "Blocked", value: blockedItems, color: "hsl(0 70% 60%)" },
          { label: "Complete", value: completedItems, color: "hsl(152 60% 44%)" },
        ].map(s => (
          <Card key={s.label} className="border-0 bg-white/[0.04]">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] text-white/40 uppercase tracking-wider">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Global bulk actions */}
      <BulkRequestActions
        items={setupItems}
        clientId={clientId!}
        clientName={client.business_name}
        clientEmail={client.owner_email}
        portalLink={portalLink}
        onUpdate={handleBulkUpdate}
      />

      {/* Setup Items by Category */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Setup & Integration Tracker</h2>
        {grouped.map(group => (
          <Card key={group.category} className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-white/70">{group.label}</CardTitle>
                <BulkRequestActions
                  items={group.items}
                  clientId={clientId!}
                  clientName={client.business_name}
                  clientEmail={client.owner_email}
                  portalLink={portalLink}
                  category={group.category}
                  onUpdate={handleBulkUpdate}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.items.map(item => {
                const hasClientData = !!(item.client_value || item.client_file_url);
                return (
                  <div key={item.id} className={`p-3 rounded-xl border transition-colors ${
                    !isPaid && item.category !== "internal" ? "opacity-50 pointer-events-none" : ""
                  }`} style={{
                    borderColor: item.item_status === "blocked" ? "hsla(0,70%,50%,.2)" :
                      hasClientData ? "hsla(211,96%,60%,.15)" : "hsla(211,96%,60%,.06)",
                    background: item.item_status === "blocked" ? "hsla(0,70%,50%,.04)" :
                      hasClientData ? "hsla(211,96%,60%,.04)" : "hsla(211,96%,60%,.02)",
                  }}>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white">{item.item_label}</p>
                        {item.client_submitted_at && (
                          <p className="text-[9px] text-white/25 mt-0.5">
                            Client submitted {new Date(item.client_submitted_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Request actions */}
                    <div className="mt-2">
                      <SetupItemActions
                        item={item}
                        clientId={clientId!}
                        clientName={client.business_name}
                        clientEmail={client.owner_email}
                        portalLink={portalLink}
                        onUpdate={handleItemUpdate}
                      />
                    </div>

                    {item.client_value && (
                      <div className="mt-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                        <p className="text-[10px] text-white/30 mb-0.5 uppercase tracking-wider font-semibold">Client Response</p>
                        {item.item_key === "team_members" ? (() => {
                          try {
                            const employees = JSON.parse(item.client_value!);
                            if (Array.isArray(employees)) return (
                              <div className="space-y-2 mt-1">
                                {employees.map((emp: any, ei: number) => (
                                  <div key={ei} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-medium text-white">{emp.full_name || "Unnamed"}</span>
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{emp.permission_level}</span>
                                      {emp.invite_now && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">invite now</span>}
                                    </div>
                                    <p className="text-[10px] text-white/50">{emp.work_email}{emp.title ? ` · ${emp.title}` : ""}</p>
                                    {emp.modules_needed?.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-0.5">
                                        {emp.modules_needed.map((m: string) => (
                                          <span key={m} className="text-[8px] px-1.5 py-0.5 rounded-full bg-[hsla(211,96%,60%,.08)] text-[hsl(var(--nl-sky))]">{m}</span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          } catch {}
                          return <p className="text-xs text-white/70 whitespace-pre-wrap">{item.client_value}</p>;
                        })() : (
                          <p className="text-xs text-white/70 whitespace-pre-wrap">{item.client_value}</p>
                        )}
                      </div>
                    )}
                    {item.client_file_url && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <a href={item.client_file_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[hsl(var(--nl-sky))] hover:underline truncate flex items-center gap-1">
                          📎 {item.client_file_url.split("/").pop()}
                        </a>
                      </div>
                    )}
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Add internal note…"
                        defaultValue={item.admin_notes || ""}
                        onBlur={e => { if (e.target.value !== (item.admin_notes || "")) updateSetupItemNotes(item.id, e.target.value); }}
                        className="w-full text-[10px] px-2 py-1 rounded bg-white/[0.03] border border-white/[0.05] text-white/40 placeholder:text-white/15 focus:border-white/20 focus:text-white/60 outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => navigate(`/admin/clients/${clientId}/close`)} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white gap-1.5 text-xs">
          <CreditCard className="h-3.5 w-3.5" /> Close Center
        </Button>
        <Button onClick={() => navigate(`/admin/clients/${clientId}/activate`)} variant="outline" className="border-white/10 text-white hover:bg-white/10 gap-1.5 text-xs">
          <Wrench className="h-3.5 w-3.5" /> Master Activation
        </Button>
        <Button onClick={() => navigate(`/admin/clients/${clientId}/handoff`)} variant="outline" className="border-white/10 text-white hover:bg-white/10 gap-1.5 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5" /> Handoff Checklist
        </Button>
        <Button onClick={load} variant="outline" className="border-white/10 text-white hover:bg-white/10 gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>
    </div>
  );
}
