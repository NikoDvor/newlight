import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft, FileSignature, CreditCard, Wrench, CheckCircle2, Clock,
  AlertTriangle, Package, RefreshCw, Send, Copy, Link2, Eye, Plus,
  FileText, DollarSign, Upload, ExternalLink, History, ChevronRight
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────
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
  portal_access_enabled: boolean;
  portal_invite_status: string;
}

interface ProposalRow {
  id: string;
  proposal_title: string;
  proposal_status: string;
  setup_fee: number | null;
  monthly_fee: number | null;
  contract_term: string | null;
  share_token: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  created_at: string;
}

interface AgreementRow {
  id: string;
  agreement_title: string;
  agreement_status: string;
  agreement_url: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  declined_at: string | null;
  signer_name: string | null;
  signer_email: string | null;
  internal_notes: string | null;
  created_at: string;
}

interface InvoiceRow {
  id: string;
  invoice_number: string | null;
  invoice_status: string;
  total_amount: number | null;
  amount_paid: number | null;
  due_date: string | null;
  paid_at: string | null;
  sent_at: string | null;
  payment_link_url: string | null;
  payment_method: string | null;
  payment_notes: string | null;
  created_at: string;
}

interface TimelineEvent {
  id: string;
  action: string;
  artifact_type: string;
  method: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Status configs ──────────────────────────────────────────────
const PROPOSAL_STEPS = [
  { value: "not_created", label: "Not Created" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const AGREEMENT_STEPS = [
  { value: "not_created", label: "Not Created" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "signed", label: "Signed" },
  { value: "declined", label: "Declined" },
];

const PAYMENT_STEPS = [
  { value: "unpaid", label: "Unpaid" },
  { value: "sent", label: "Sent" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "waived", label: "Waived" },
];

const IMPL_STEPS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_on_client", label: "Waiting on Client" },
  { value: "complete", label: "Complete" },
];

function stepColor(value: string, current: string, steps: { value: string }[]) {
  const ci = steps.findIndex(s => s.value === current);
  const ti = steps.findIndex(s => s.value === value);
  if (value === current) {
    if (["approved", "signed", "paid", "complete", "waived"].includes(value)) return "bg-emerald-500 text-white";
    if (["rejected", "declined", "overdue"].includes(value)) return "bg-red-500 text-white";
    return "bg-[hsl(var(--nl-electric))] text-white";
  }
  if (ti < ci) return "bg-emerald-500/20 text-emerald-300";
  return "bg-white/5 text-white/25";
}

function formatCurrency(n: number | null) {
  if (n == null) return "—";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(d: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ─── Component ───────────────────────────────────────────────────
export default function AdminCloseCenter() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientData | null>(null);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [agreements, setAgreements] = useState<AgreementRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    const [cRes, pRes, aRes, iRes, tRes] = await Promise.all([
      supabase.from("clients").select("id, business_name, workspace_slug, owner_email, owner_name, proposal_status, agreement_status, payment_status, implementation_status, portal_access_enabled, portal_invite_status").eq("id", clientId).single(),
      supabase.from("proposals").select("id, proposal_title, proposal_status, setup_fee, monthly_fee, contract_term, share_token, sent_at, viewed_at, accepted_at, declined_at, created_at").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("client_agreements").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("invoices").select("id, invoice_number, invoice_status, total_amount, amount_paid, due_date, paid_at, sent_at, payment_link_url, payment_method, payment_notes, created_at").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("lifecycle_send_logs").select("id, action, artifact_type, method, notes, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(50),
    ]);
    if (cRes.data) setClient(cRes.data as any);
    setProposals((pRes.data || []) as any);
    setAgreements((aRes.data || []) as any);
    setInvoices((iRes.data || []) as any);
    setTimeline((tRes.data || []) as any);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // ─── Actions ─────────────────────────────────────────────────
  const logAction = async (artifactType: string, artifactId: string | null, action: string, method = "manual", notes?: string) => {
    await supabase.from("lifecycle_send_logs").insert({
      client_id: clientId!,
      artifact_type: artifactType,
      artifact_id: artifactId,
      action,
      method,
      notes: notes || null,
    } as any);
    await supabase.from("audit_logs").insert({
      client_id: clientId!,
      action: `${artifactType}_${action}`,
      module: "close_center",
      metadata: { artifact_id: artifactId, method } as any,
    });
  };

  const updateClientStatus = async (field: string, value: string) => {
    setActing(true);
    await supabase.from("clients").update({ [field]: value } as any).eq("id", clientId!);
    await logAction(field.replace("_status", ""), null, value);

    // Auto-unlock portal when payment becomes paid
    if (field === "payment_status" && value === "paid") {
      await supabase.from("clients").update({
        portal_access_enabled: true,
      } as any).eq("id", clientId!);
      await logAction("portal", null, "auto_unlocked", "system", "Payment marked paid — portal auto-unlocked");
      toast.success("Payment confirmed — Setup Portal unlocked!");
    } else {
      toast.success(`Updated ${field.replace(/_/g, " ")}`);
    }

    setClient(prev => prev ? {
      ...prev,
      [field]: value,
      ...(field === "payment_status" && value === "paid" ? { portal_access_enabled: true } : {}),
    } : prev);
    setActing(false);
    load();
  };

  // ─── Proposal actions ────────────────────────────────────────
  const createProposal = async () => {
    setActing(true);
    const title = `${client?.business_name || "Client"} — Service Proposal`;
    const { data, error } = await supabase.from("proposals").insert({
      client_id: clientId!,
      proposal_title: title,
      proposal_status: "generated",
      proposal_type: "service_proposal",
      version_number: proposals.length + 1,
    } as any).select("id").single();
    if (error) { toast.error("Failed to create proposal"); setActing(false); return; }
    await updateClientStatus("proposal_status", "draft");
    await logAction("proposal", data.id, "created");
    toast.success("Proposal created");
    setActing(false);
    load();
  };

  const markProposalSent = async (p: ProposalRow) => {
    setActing(true);
    const now = new Date().toISOString();
    await supabase.from("proposals").update({ proposal_status: "sent", sent_at: now } as any).eq("id", p.id);
    await updateClientStatus("proposal_status", "sent");
    await logAction("proposal", p.id, "sent", "link");
    setActing(false);
    load();
  };

  const markProposalApproved = async (p: ProposalRow) => {
    setActing(true);
    const now = new Date().toISOString();
    await supabase.from("proposals").update({ proposal_status: "accepted", accepted_at: now } as any).eq("id", p.id);
    await updateClientStatus("proposal_status", "approved");
    await logAction("proposal", p.id, "approved");
    setActing(false);
    load();
  };

  const copyProposalLink = (p: ProposalRow) => {
    if (p.share_token) {
      navigator.clipboard.writeText(`${window.location.origin}/proposal/${p.share_token}`);
      toast.success("Proposal link copied!");
    } else {
      toast.error("No share token — proposal link unavailable");
    }
  };

  // ─── Agreement actions ───────────────────────────────────────
  const createAgreement = async () => {
    setActing(true);
    const title = `${client?.business_name || "Client"} — Service Agreement`;
    const latestProposal = proposals[0];
    const { data, error } = await supabase.from("client_agreements").insert({
      client_id: clientId!,
      agreement_title: title,
      agreement_status: "draft",
      proposal_id: latestProposal?.id || null,
      signer_email: client?.owner_email || null,
      signer_name: client?.owner_name || null,
    }).select("id").single();
    if (error) { toast.error("Failed to create agreement"); setActing(false); return; }
    await updateClientStatus("agreement_status", "draft");
    await logAction("agreement", data.id, "created");
    toast.success("Agreement created");
    setActing(false);
    load();
  };

  const markAgreementSent = async (a: AgreementRow) => {
    setActing(true);
    const now = new Date().toISOString();
    await supabase.from("client_agreements").update({ agreement_status: "sent", sent_at: now }).eq("id", a.id);
    await updateClientStatus("agreement_status", "sent");
    await logAction("agreement", a.id, "sent", "link");
    setActing(false);
    load();
  };

  const markAgreementSigned = async (a: AgreementRow) => {
    setActing(true);
    const now = new Date().toISOString();
    await supabase.from("client_agreements").update({ agreement_status: "signed", signed_at: now }).eq("id", a.id);
    await updateClientStatus("agreement_status", "signed");
    await logAction("agreement", a.id, "signed");
    setActing(false);
    load();
  };

  const updateAgreementUrl = async (a: AgreementRow, url: string) => {
    await supabase.from("client_agreements").update({ agreement_url: url }).eq("id", a.id);
    toast.success("Agreement URL saved");
    load();
  };

  const updateAgreementNotes = async (a: AgreementRow, notes: string) => {
    await supabase.from("client_agreements").update({ internal_notes: notes }).eq("id", a.id);
  };

  // ─── Invoice/Payment actions ─────────────────────────────────
  const createInvoice = async () => {
    setActing(true);
    const latestProposal = proposals[0];
    const setupFee = latestProposal?.setup_fee || 0;
    const monthlyFee = latestProposal?.monthly_fee || 0;
    const total = setupFee + monthlyFee;
    const num = `INV-${Date.now().toString(36).toUpperCase()}`;

    // Get or create billing account for this client
    let billingAccountId: string;
    const { data: existingBa } = await supabase.from("billing_accounts").select("id").eq("client_id", clientId!).limit(1).single();
    if (existingBa) {
      billingAccountId = existingBa.id;
    } else {
      const { data: newBa, error: baErr } = await supabase.from("billing_accounts").insert({
        client_id: clientId!,
        billing_status: "active",
        billing_email: client?.owner_email || null,
        setup_fee: setupFee,
        monthly_fee: monthlyFee,
      }).select("id").single();
      if (baErr || !newBa) { toast.error("Failed to create billing account"); setActing(false); return; }
      billingAccountId = newBa.id;
    }

    const { data, error } = await supabase.from("invoices").insert({
      client_id: clientId!,
      billing_account_id: billingAccountId,
      invoice_number: num,
      invoice_type: "Setup",
      invoice_status: "Draft",
      subtotal_amount: total,
      tax_amount: 0,
      total_amount: total,
      amount_paid: 0,
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    }).select("id").single();
    if (error) { toast.error("Failed to create invoice"); setActing(false); return; }
    await updateClientStatus("payment_status", "sent");
    await logAction("invoice", data.id, "created");
    toast.success("Invoice created");
    setActing(false);
    load();
  };

  const markInvoiceSent = async (inv: InvoiceRow) => {
    setActing(true);
    const now = new Date().toISOString();
    await supabase.from("invoices").update({ sent_at: now, invoice_status: "sent" } as any).eq("id", inv.id);
    await logAction("invoice", inv.id, "sent", "link");
    toast.success("Invoice marked as sent");
    setActing(false);
    load();
  };

  const markInvoicePaid = async (inv: InvoiceRow) => {
    setActing(true);
    const now = new Date().toISOString();
    await supabase.from("invoices").update({ invoice_status: "paid", paid_at: now, amount_paid: inv.total_amount } as any).eq("id", inv.id);
    await updateClientStatus("payment_status", "paid");
    await logAction("invoice", inv.id, "paid");
    setActing(false);
    load();
  };

  const updateInvoicePaymentLink = async (inv: InvoiceRow, url: string) => {
    await supabase.from("invoices").update({ payment_link_url: url } as any).eq("id", inv.id);
    toast.success("Payment link saved");
    load();
  };

  const updateInvoiceNotes = async (inv: InvoiceRow, notes: string) => {
    await supabase.from("invoices").update({ payment_notes: notes } as any).eq("id", inv.id);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      <p className="text-sm text-muted-foreground">Loading close center…</p>
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

  const isPaid = client.payment_status === "paid" || client.payment_status === "waived";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/clients")} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="h-4 w-4 text-white/40" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{client.business_name}</h1>
          <p className="text-sm text-white/40">Close Center — Proposal · Agreement · Payment</p>
        </div>
        <Button variant="outline" onClick={load} className="border-white/10 text-white hover:bg-white/10 gap-1.5 text-xs h-8">
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      {/* ─── Status Pipeline ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {([
          { key: "proposal_status", label: "Proposal", icon: FileSignature, steps: PROPOSAL_STEPS },
          { key: "agreement_status", label: "Agreement", icon: Package, steps: AGREEMENT_STEPS },
          { key: "payment_status", label: "Payment", icon: CreditCard, steps: PAYMENT_STEPS },
          { key: "implementation_status", label: "Implementation", icon: Wrench, steps: IMPL_STEPS },
        ]).map(({ key, label, icon: Icon, steps }) => {
          const current = (client as any)[key] as string;
          return (
            <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
                    {label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {steps.map(step => (
                      <button
                        key={step.value}
                        onClick={() => updateClientStatus(key, step.value)}
                        disabled={acting}
                        className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer ${stepColor(step.value, current, steps)}`}
                      >
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

      {/* Auto-unlock indicator */}
      {isPaid && (
        <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "hsla(152,60%,44%,.06)", border: "1px solid hsla(152,60%,44%,.15)" }}>
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-300">Payment confirmed — Setup Portal is unlocked. Client can be invited.</p>
          <Button size="sm" variant="outline" onClick={() => navigate(`/admin/clients/${clientId}/lifecycle`)} className="ml-auto border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-xs h-7 gap-1">
            <ChevronRight className="h-3 w-3" /> Setup Center
          </Button>
        </div>
      )}

      {!isPaid && (
        <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "hsla(38,92%,50%,.06)", border: "1px solid hsla(38,92%,50%,.15)" }}>
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">Setup Portal locked until payment is confirmed.</p>
        </div>
      )}

      {/* ─── Proposals ────────────────────────────────────────── */}
      <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <FileSignature className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
            Proposals
          </CardTitle>
          <Button size="sm" onClick={createProposal} disabled={acting} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white gap-1 text-xs h-7">
            <Plus className="h-3 w-3" /> Create Proposal
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {proposals.length === 0 && <p className="text-xs text-white/30">No proposals yet</p>}
          {proposals.map(p => (
            <div key={p.id} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{p.proposal_title}</p>
                  <p className="text-[10px] text-white/30">Created {formatDate(p.created_at)} · Status: <span className="text-white/60">{p.proposal_status}</span></p>
                </div>
                <Badge variant="outline" className="text-[10px] border-white/10 text-white/50">
                  {formatCurrency(p.setup_fee)} setup + {formatCurrency(p.monthly_fee)}/mo
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-white/30">
                {p.sent_at && <span>Sent {formatDate(p.sent_at)}</span>}
                {p.viewed_at && <span>Viewed {formatDate(p.viewed_at)}</span>}
                {p.accepted_at && <span className="text-emerald-400">Approved {formatDate(p.accepted_at)}</span>}
                {p.declined_at && <span className="text-red-400">Declined {formatDate(p.declined_at)}</span>}
              </div>
              <div className="flex gap-2 flex-wrap">
                {p.proposal_status === "generated" && (
                  <Button size="sm" onClick={() => markProposalSent(p)} disabled={acting} className="text-xs h-7 gap-1 bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
                    <Send className="h-3 w-3" /> Mark Sent
                  </Button>
                )}
                {(p.proposal_status === "sent" || p.proposal_status === "viewed") && (
                  <Button size="sm" onClick={() => markProposalApproved(p)} disabled={acting} className="text-xs h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircle2 className="h-3 w-3" /> Mark Approved
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => copyProposalLink(p)} className="text-xs h-7 gap-1 border-white/10 text-white hover:bg-white/10">
                  <Copy className="h-3 w-3" /> Copy Link
                </Button>
                {p.share_token && (
                  <Button size="sm" variant="outline" onClick={() => window.open(`/proposal/${p.share_token}`, "_blank")} className="text-xs h-7 gap-1 border-white/10 text-white hover:bg-white/10">
                    <Eye className="h-3 w-3" /> Preview
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ─── Agreements ───────────────────────────────────────── */}
      <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
            Agreements
          </CardTitle>
          <Button size="sm" onClick={createAgreement} disabled={acting} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white gap-1 text-xs h-7">
            <Plus className="h-3 w-3" /> Create Agreement
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {agreements.length === 0 && <p className="text-xs text-white/30">No agreements yet</p>}
          {agreements.map(a => (
            <div key={a.id} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{a.agreement_title}</p>
                  <p className="text-[10px] text-white/30">
                    Created {formatDate(a.created_at)} · Status: <span className="text-white/60">{a.agreement_status}</span>
                    {a.signer_name && <> · Signer: {a.signer_name}</>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-white/30">
                {a.sent_at && <span>Sent {formatDate(a.sent_at)}</span>}
                {a.viewed_at && <span>Viewed {formatDate(a.viewed_at)}</span>}
                {a.signed_at && <span className="text-emerald-400">Signed {formatDate(a.signed_at)}</span>}
                {a.declined_at && <span className="text-red-400">Declined {formatDate(a.declined_at)}</span>}
              </div>
              {/* URL field */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Paste agreement URL or file link…"
                  defaultValue={a.agreement_url || ""}
                  onBlur={e => { if (e.target.value !== (a.agreement_url || "")) updateAgreementUrl(a, e.target.value); }}
                  className="text-xs h-7 bg-white/[0.04] border-white/10 text-white placeholder:text-white/20 flex-1"
                />
                {a.agreement_url && (
                  <a href={a.agreement_url} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--nl-sky))] hover:text-white">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              {/* Notes */}
              <Input
                placeholder="Internal notes…"
                defaultValue={a.internal_notes || ""}
                onBlur={e => { if (e.target.value !== (a.internal_notes || "")) updateAgreementNotes(a, e.target.value); }}
                className="text-[10px] h-6 bg-white/[0.03] border-white/[0.05] text-white/40 placeholder:text-white/15"
              />
              <div className="flex gap-2 flex-wrap">
                {a.agreement_status === "draft" && (
                  <Button size="sm" onClick={() => markAgreementSent(a)} disabled={acting} className="text-xs h-7 gap-1 bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
                    <Send className="h-3 w-3" /> Mark Sent
                  </Button>
                )}
                {(a.agreement_status === "sent" || a.agreement_status === "viewed") && (
                  <Button size="sm" onClick={() => markAgreementSigned(a)} disabled={acting} className="text-xs h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircle2 className="h-3 w-3" /> Mark Signed
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ─── Invoices / Payments ──────────────────────────────── */}
      <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
            Invoices & Payments
          </CardTitle>
          <Button size="sm" onClick={createInvoice} disabled={acting} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white gap-1 text-xs h-7">
            <Plus className="h-3 w-3" /> Create Invoice
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoices.length === 0 && <p className="text-xs text-white/30">No invoices yet</p>}
          {invoices.map(inv => (
            <div key={inv.id} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{inv.invoice_number || "Invoice"}</p>
                  <p className="text-[10px] text-white/30">
                    Created {formatDate(inv.created_at)} · Due {formatDate(inv.due_date)} · Status: <span className="text-white/60">{inv.invoice_status}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{formatCurrency(inv.total_amount)}</p>
                  {(inv.amount_paid ?? 0) > 0 && <p className="text-[10px] text-emerald-400">Paid: {formatCurrency(inv.amount_paid)}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-white/30">
                {inv.sent_at && <span>Sent {formatDate(inv.sent_at)}</span>}
                {inv.paid_at && <span className="text-emerald-400">Paid {formatDate(inv.paid_at)}</span>}
                {inv.payment_method && <span>Method: {inv.payment_method}</span>}
              </div>
              {/* Payment link field */}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Paste payment link URL…"
                  defaultValue={inv.payment_link_url || ""}
                  onBlur={e => { if (e.target.value !== (inv.payment_link_url || "")) updateInvoicePaymentLink(inv, e.target.value); }}
                  className="text-xs h-7 bg-white/[0.04] border-white/10 text-white placeholder:text-white/20 flex-1"
                />
                {inv.payment_link_url && (
                  <a href={inv.payment_link_url} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--nl-sky))] hover:text-white">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              {/* Notes */}
              <Input
                placeholder="Payment notes…"
                defaultValue={inv.payment_notes || ""}
                onBlur={e => { if (e.target.value !== (inv.payment_notes || "")) updateInvoiceNotes(inv, e.target.value); }}
                className="text-[10px] h-6 bg-white/[0.03] border-white/[0.05] text-white/40 placeholder:text-white/15"
              />
              <div className="flex gap-2 flex-wrap">
                {inv.invoice_status === "pending" && (
                  <Button size="sm" onClick={() => markInvoiceSent(inv)} disabled={acting} className="text-xs h-7 gap-1 bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
                    <Send className="h-3 w-3" /> Mark Sent
                  </Button>
                )}
                {(inv.invoice_status === "sent" || inv.invoice_status === "pending") && (
                  <Button size="sm" onClick={() => markInvoicePaid(inv)} disabled={acting} className="text-xs h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <DollarSign className="h-3 w-3" /> Mark Paid
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(inv.payment_link_url || ""); toast.success("Payment link copied"); }} disabled={!inv.payment_link_url} className="text-xs h-7 gap-1 border-white/10 text-white hover:bg-white/10">
                  <Copy className="h-3 w-3" /> Copy Payment Link
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ─── Timeline ─────────────────────────────────────────── */}
      <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 && <p className="text-xs text-white/30">No activity yet</p>}
          <div className="space-y-2">
            {timeline.map(ev => (
              <div key={ev.id} className="flex items-start gap-3 py-1.5 border-b border-white/[0.04] last:border-0">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--nl-sky))] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70">
                    <span className="text-white/40 capitalize">{ev.artifact_type}</span>{" "}
                    <span className="font-medium text-white">{ev.action}</span>
                    {ev.method && ev.method !== "manual" && <span className="text-white/30"> via {ev.method}</span>}
                  </p>
                  {ev.notes && <p className="text-[10px] text-white/30 mt-0.5">{ev.notes}</p>}
                </div>
                <span className="text-[9px] text-white/20 shrink-0">{formatDate(ev.created_at)} {formatTime(ev.created_at)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick navigation */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => navigate(`/admin/clients/${clientId}/lifecycle`)} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white gap-1.5 text-xs">
          <Wrench className="h-3.5 w-3.5" /> Setup Center
        </Button>
        <Button onClick={() => navigate(`/admin/clients/${clientId}/activate`)} variant="outline" className="border-white/10 text-white hover:bg-white/10 gap-1.5 text-xs">
          <FileText className="h-3.5 w-3.5" /> Master Activation
        </Button>
      </div>
    </div>
  );
}
