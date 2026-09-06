import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign, Send, AlertTriangle, Wrench, CheckCircle2,
  Clock, ExternalLink, Copy, Users, ShieldAlert, ClipboardList,
  Eye, ArrowRight, Activity, X, Smartphone
} from "lucide-react";
import { toast } from "sonner";
import { SendAppLinkDialog } from "@/components/admin/SendAppLinkDialog";

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
  owner_name?: string | null;
  owner_email: string | null;
  owner_phone?: string | null;
  sms_consent?: boolean | null;
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
  item_label: string;
  item_status: string;
  target_due_date: string | null;
  category: string | null;
}

interface ImplTask {
  id: string;
  task_label: string;
  task_status: string;
  due_date: string | null;
  blocked_by: string | null;
  assigned_to: string | null;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  provisioning_status: string | null;
  role_preset: string | null;
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

function money(v: any): string {
  const n = Number(v);
  if (v == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function pct(v: any): string {
  const n = Number(v);
  if (v == null || Number.isNaN(n)) return "";
  return `${n}%`;
}


export default function ClientDetailDrawer({ client, open, onClose }: Props) {
  const [setupItems, setSetupItems] = useState<SetupItem[]>([]);
  const [implTasks, setImplTasks] = useState<ImplTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [deal, setDeal] = useState<any | null>(null);
  const [repName, setRepName] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<any | null>(null);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [invoiceList, setInvoiceList] = useState<any[]>([]);
  const [lead, setLead] = useState<any | null>(null);
  const [legalDocs, setLegalDocs] = useState<any[]>([]);
  const [discoveryAt, setDiscoveryAt] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showAppLink, setShowAppLink] = useState(false);

  useEffect(() => {
    if (!client || !open) return;
    loadDetail(client.id);
  }, [client?.id, open]);

  async function loadDetail(clientId: string) {
    setLoadingDetail(true);
    const [setupRes, implRes, teamRes, auditRes, dealRes, envRes, invRes, leadRes, docsRes] = await Promise.all([
      supabase.from("client_setup_items" as any).select("id, item_label, item_status, target_due_date, category").eq("client_id", clientId).order("target_due_date", { ascending: true, nullsFirst: false }),
      supabase.from("implementation_tasks").select("id, task_label, task_status, due_date, blocked_by, assigned_to").eq("client_id", clientId).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("workspace_users").select("id, full_name, email, provisioning_status, role_preset").eq("client_id", clientId),
      supabase.from("audit_logs").select("id, action, module, created_at, status").eq("client_id", clientId).order("created_at", { ascending: false }).limit(15),
      supabase.from("crm_deals").select("id, pricing_model, initial_fee, recurring_fee, commission_rate, commission_rate_ongoing, billing_cadence, next_charge_at, pay_sign_status, assigned_user, created_at").eq("provisioned_client_id", clientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("document_envelopes").select("id, status, completed_at, sent_at, viewed_at, attorney_reviewed, legal_review_note, share_token, title, document_envelope_items(id, document_name, document_url)").eq("provisioned_client_id", clientId).eq("envelope_type", "service_agreement" as any).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("invoices").select("id, invoice_number, invoice_type, total_amount, invoice_status, paid_at, created_at").eq("provisioned_client_id", clientId).order("created_at", { ascending: false }).limit(20),
      supabase.from("nl_bdr_leads" as any).select("id, lead_source, source_type, crd, notes, created_at, business_name").eq("provisioned_client_id", clientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("client_legal_documents" as any).select("id, document_type, document_name, file_url, notes, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(50),
    ]);
    setSetupItems((setupRes.data || []) as any[]);
    setLegalDocs((docsRes.data || []) as any[]);
    setImplTasks((implRes.data || []) as any[]);
    setTeamMembers((teamRes.data || []) as any[]);
    setAuditLogs((auditRes.data || []) as any[]);

    const dealRow = (dealRes.data || null) as any;
    setDeal(dealRow);
    setRepName(null);
    if (dealRow?.assigned_user) {
      const { data: emp } = await supabase.from("employee_profiles").select("full_name, email").eq("user_id", dealRow.assigned_user).maybeSingle();
      if (emp?.full_name || emp?.email) setRepName(emp.full_name || emp.email);
      else {
        const { data: wu } = await supabase.from("workspace_users").select("full_name, email").eq("user_id", dealRow.assigned_user).limit(1).maybeSingle();
        setRepName((wu as any)?.full_name || (wu as any)?.email || null);
      }
    }

    const envRow = (envRes.data || null) as any;
    setEnvelope(envRow);
    setSignatures([]);
    if (envRow?.id) {
      const { data: sigs } = await supabase.from("document_envelope_signatures").select("id, signer_name, signer_email, signed_at").eq("envelope_id", envRow.id).order("signed_at", { ascending: false });
      setSignatures((sigs || []) as any[]);
    }

    setInvoiceList((invRes.data || []) as any[]);

    const leadRow = (leadRes.data || null) as any;
    setLead(leadRow);
    setDiscoveryAt(null);
    if (leadRow?.id) {
      const { data: ev } = await supabase.from("bdr_calendar_events").select("starts_at").eq("lead_id", leadRow.id).order("starts_at", { ascending: true }).limit(1).maybeSingle();
      setDiscoveryAt((ev as any)?.starts_at || null);
    }

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
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col border-l" side="right" style={{
          boxShadow: "-12px 0 60px -16px hsla(211,96%,56%,.14), -2px 0 20px -4px hsla(0,0%,0%,.2)",
          borderColor: "hsla(211,96%,60%,.10)",
          background: "linear-gradient(180deg, hsl(218 35% 10%) 0%, hsl(220 30% 13%) 100%)"
        }}>
          <SheetHeader className="px-5 pt-6 pb-4">
            <SheetTitle className="text-lg font-bold text-white tracking-tight">{client.business_name}</SheetTitle>
            {client.profile_name && <div className="text-xs text-white/40">{client.profile_name} · {client.owner_email || "No email"}</div>}
        </SheetHeader>

        <ScrollArea className="flex-1 px-5 pb-5">
          <div className="space-y-5">
            {/* ── Operator Recommendation ── */}
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded-xl border p-4 space-y-2"
              style={{
                background: nba.color !== "text-muted-foreground"
                  ? "linear-gradient(135deg, hsla(211,96%,60%,.08), hsla(197,92%,68%,.04))"
                  : "hsla(215,20%,16%,.5)",
                borderColor: nba.color !== "text-muted-foreground" ? "hsla(211,96%,60%,.20)" : "hsla(0,0%,100%,.06)",
                boxShadow: nba.color !== "text-muted-foreground"
                  ? "0 0 28px -8px hsla(211,96%,60%,.15), inset 0 1px 0 0 hsla(211,96%,70%,.06)"
                  : "none"
              }}
            >
              <div className={`flex items-center gap-2 text-sm font-semibold ${nba.color}`}>
                <NbaIcon className="h-4 w-4 shrink-0" />
                {nba.label}
              </div>
              <p className="text-xs text-white/40 leading-relaxed">{nba.reason}</p>
            </motion.div>

            {/* ── A. Client Summary ── */}
            <Section title="Client Summary">
              <div className="grid grid-cols-2 gap-3">
                <SummaryItem label="Payment" value={client.payment_status} />
                <SummaryItem label="Portal" value={client.portal_invite_status} />
                <SummaryItem label="Last Login" value={client.portal_last_login_at ? new Date(client.portal_last_login_at).toLocaleDateString() : "Never"} raw />
                <SummaryItem label="Implementation" value={client.implementation_status} />
              </div>
              <div className="mt-3 flex items-center gap-4">
                <ProgressMini label="Setup" pct={setupPct} color="bg-primary" />
                <ProgressMini label="Impl" pct={implPct} color="bg-[hsl(152,60%,44%)]" />
              </div>
            </Section>

            <Separator />

            {/* ── A2. Deal & Pricing ── */}
            <Section title="Deal & Pricing">
              {loadingDetail ? <LoadingSkeleton /> : deal ? (
                <div className="grid grid-cols-2 gap-3">
                  <SummaryItem label="Pricing Model" value={deal.pricing_model} />
                  <SummaryItem label="Billing" value={deal.billing_cadence} />
                  <SummaryItem label="Initial Fee" value={money(deal.initial_fee)} raw />
                  {deal.pricing_model === "commission" ? (
                    <SummaryItem label="Commission" value={[pct(deal.commission_rate), pct(deal.commission_rate_ongoing)].filter(Boolean).join(" / ") || "—"} raw />
                  ) : (
                    <SummaryItem label="Recurring" value={deal.recurring_fee != null ? `${money(deal.recurring_fee)} / mo` : "—"} raw />
                  )}
                  <SummaryItem label="Next Charge" value={deal.next_charge_at ? new Date(deal.next_charge_at).toLocaleDateString() : "Not scheduled"} raw />
                  <SummaryItem label="Pay & Sign" value={deal.pay_sign_status} />
                  <SummaryItem label="Assigned Rep" value={repName || "Unassigned"} raw />
                </div>
              ) : <p className="text-xs text-muted-foreground">No deal linked to this workspace yet.</p>}
            </Section>

            <Separator />

            {/* ── A3. Signed Agreement ── */}
            <Section title="Signed Agreement">
              {loadingDetail ? <LoadingSkeleton /> : envelope ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <SummaryItem label="Status" value={envelope.status} />
                    <SummaryItem label="Completed" value={envelope.completed_at ? new Date(envelope.completed_at).toLocaleDateString() : "—"} raw />
                  </div>
                  <div className={`text-[11px] ${envelope.attorney_reviewed ? "text-emerald-400/80" : "text-amber-400/80"}`}>
                    Attorney reviewed: {envelope.attorney_reviewed ? "Yes" : "No"}
                    {envelope.attorney_reviewed && envelope.legal_review_note ? ` — ${envelope.legal_review_note}` : ""}
                  </div>
                  {signatures.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {signatures.map((s) => (
                        <div key={s.id} className="text-xs">
                          <span className="text-foreground">{s.signer_name || "Unnamed signer"}</span>
                          <span className="text-muted-foreground"> · {s.signer_email || "—"}</span>
                          <div className="text-[10px] text-muted-foreground">
                            Signed {s.signed_at ? new Date(s.signed_at).toLocaleString() : "—"}
                          </div>
                        </div>
                      ))}
                      <p className="text-[10px] text-white/30">Full audit trail available.</p>
                    </div>
                  )}
                  {(() => {
                    const item = (envelope.document_envelope_items || []).find((i: any) => i.document_url);
                    if (item) {
                      return (
                        <Button variant="outline" size="sm" className="text-xs h-8 gap-2" onClick={() => window.open(item.document_url, "_blank")}>
                          <ExternalLink className="h-3.5 w-3.5 text-primary" /> View signed document
                        </Button>
                      );
                    }
                    if (envelope.share_token) {
                      return (
                        <Button variant="outline" size="sm" className="text-xs h-8 gap-2" onClick={() => window.open(`${window.location.origin}/sign/${envelope.share_token}`, "_blank")}>
                          <ExternalLink className="h-3.5 w-3.5 text-primary" /> Open agreement
                        </Button>
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : <p className="text-xs text-muted-foreground">No service agreement yet.</p>}
            </Section>

            <Separator />

            {/* ── A3b. Documents & Files ── */}
            <Section title="Documents & Files">
              {loadingDetail ? <LoadingSkeleton /> : legalDocs.length > 0 ? (
                <div className="space-y-1.5">
                  {legalDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between text-xs gap-2">
                      <div className="min-w-0">
                        <span className="text-foreground truncate">{doc.document_name}</span>
                        <div className="text-[10px] text-muted-foreground">
                          {String(doc.document_type || "other").replace(/_/g, " ")} · {new Date(doc.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs h-8 gap-2 shrink-0" onClick={() => openLegalDoc(doc.file_url)}>
                        <ExternalLink className="h-3.5 w-3.5 text-primary" /> View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground">No additional documents uploaded yet.</p>}
            </Section>

            <Separator />



            {/* ── A4. Payment History ── */}
            <Section title="Payment History">
              {loadingDetail ? <LoadingSkeleton /> : invoiceList.length > 0 ? (
                <div className="space-y-1.5">
                  {invoiceList.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between text-xs gap-2">
                      <div className="min-w-0">
                        <span className="text-foreground truncate">{inv.invoice_number || "—"}</span>
                        {inv.invoice_type && <span className="text-muted-foreground"> · {String(inv.invoice_type).replace(/_/g, " ")}</span>}
                        <div className="text-[10px] text-muted-foreground">
                          {inv.paid_at ? `Paid ${new Date(inv.paid_at).toLocaleDateString()}` : "Not paid"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="tabular-nums text-foreground">{money(inv.total_amount)}</span>
                        <Badge variant="outline" className={`text-[9px] ${statusColor(inv.invoice_status)}`}>
                          {(inv.invoice_status || "—").replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground">No payments recorded yet.</p>}
            </Section>

            <Separator />

            {/* ── A5. Lead Origin ── */}
            <Section title="Lead Origin">
              {loadingDetail ? <LoadingSkeleton /> : lead ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <SummaryItem label="Lead Source" value={lead.lead_source || "—"} raw />
                    <SummaryItem label="Source Type" value={lead.source_type || "—"} raw />
                    <SummaryItem label="CRD" value={lead.crd || "—"} raw />
                    <SummaryItem label="First Booked" value={discoveryAt ? new Date(discoveryAt).toLocaleString() : "No meeting booked"} raw />
                  </div>
                  {lead.notes ? (
                    <div>
                      <div className="text-[10px] text-muted-foreground mb-1">Origin notes</div>
                      <pre className="text-[11px] text-white/60 whitespace-pre-wrap font-sans leading-relaxed">{lead.notes}</pre>
                    </div>
                  ) : <p className="text-[11px] text-muted-foreground">No origin notes recorded.</p>}
                </div>
              ) : <p className="text-xs text-muted-foreground">No originating lead linked to this workspace.</p>}
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
                            <span className="text-foreground truncate">{si.item_label}</span>
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

            {/* ── D. Step 3 · Implementation Snapshot ── */}
            <Section title="Step 3 · Implementation">
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
                      Next due: <span className="text-foreground font-medium">{nearestImpl.task_label}</span> — {new Date(nearestImpl.due_date!).toLocaleDateString()}
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
                  <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-9 hover:bg-primary/[0.04] hover:border-primary/20 transition-all duration-200">
                    <ExternalLink className="h-3.5 w-3.5 text-primary" /> Step 1 · Intake & Setup
                  </Button>
                </Link>
                <Link to={`/admin/clients/${client.id}/close`}>
                  <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-9 hover:bg-primary/[0.04] hover:border-primary/20 transition-all duration-200">
                    <DollarSign className="h-3.5 w-3.5 text-primary" /> Meeting 2 · Close & Payment
                  </Button>
                </Link>
                <Link to={`/admin/clients/${client.id}/implementation`}>
                  <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-9 hover:bg-primary/[0.04] hover:border-primary/20 transition-all duration-200">
                    <Wrench className="h-3.5 w-3.5 text-primary" /> Step 3 · Implementation
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-9 hover:bg-primary/[0.04] hover:border-primary/20 transition-all duration-200"
                  onClick={() => window.open(`${window.location.origin}/auth?redirect=/setup-portal`, "_blank")}>
                  <Eye className="h-3.5 w-3.5 text-primary" /> Preview Portal
                </Button>
                <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-9 hover:bg-primary/[0.04] hover:border-primary/20 transition-all duration-200" onClick={copyPortalLink}>
                  <Copy className="h-3.5 w-3.5 text-primary" /> Copy Portal Link
                </Button>
                <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 h-9 hover:bg-primary/[0.04] hover:border-primary/20 transition-all duration-200" onClick={() => setShowAppLink(true)}>
                  <Smartphone className="h-3.5 w-3.5 text-primary" /> Send App Link
                </Button>
              </div>
            </Section>
          </div>
        </ScrollArea>
        <SendAppLinkDialog client={client} open={showAppLink} onOpenChange={setShowAppLink} onSent={() => loadDetail(client.id)} />
      </SheetContent>
    </Sheet>
  );
}

/* ── Shared helpers ── */
function ProgressMini({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-foreground tabular-nums">{pct}% {label.toLowerCase()}</div>
      <div className="h-1.5 w-28 bg-muted rounded-full overflow-hidden mt-1">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── Shared helpers ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-2.5">{title}</h3>
      {children}
    </motion.div>
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
