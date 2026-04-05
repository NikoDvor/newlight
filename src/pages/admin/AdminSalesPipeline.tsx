import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { executeSalesIntake } from "@/lib/salesAutomation";
import { WORKFLOW_STEPS, PROPOSAL_STATUSES, type WorkflowStepKey, type ProposalStatusKey } from "@/contexts/ActiveSalesContext";
import { NICHE_REGISTRY } from "@/lib/workspaceNiches";
import { resolveOperationType } from "@/lib/businessOperationTypes";
import { generateClientIntelligence } from "@/lib/clientIntelligenceEngine";
import { computeQuote } from "@/lib/workspaceQuoteEngine";
import { generatePackageFitNarrative } from "@/lib/packageFitNarrative";
import { DEFAULT_WORKSPACE_PROFILE } from "@/lib/workspaceProfileTypes";
import {
  Plus, GripVertical, DollarSign, Users, Calendar, FileText,
  CheckCircle2, Target, UserPlus, Briefcase, Eye, Zap,
  AlertTriangle, Clock, Shield, ArrowRight, Filter,
  ChevronRight, Brain, Lock, Unlock, Clipboard, X, Search,
  BarChart3, Star, Package, Layers
} from "lucide-react";

// ═══════════════════════════════════════════════
// Pipeline Kanban Stages
// ═══════════════════════════════════════════════
const STAGES = [
  { key: "new_lead", label: "New Lead", color: "hsla(211,96%,60%,.6)" },
  { key: "contacted", label: "Contacted", color: "hsla(197,92%,68%,.6)" },
  { key: "booked_meeting", label: "Booked Meeting", color: "hsla(187,70%,58%,.6)" },
  { key: "meeting_completed", label: "Meeting Done", color: "hsla(160,70%,50%,.6)" },
  { key: "qualified", label: "Qualified", color: "hsla(140,60%,50%,.6)" },
  { key: "proposal_drafted", label: "Proposal Draft", color: "hsla(45,90%,55%,.6)" },
  { key: "proposal_sent", label: "Proposal Sent", color: "hsla(30,90%,55%,.6)" },
  { key: "negotiation", label: "Negotiation", color: "hsla(280,60%,60%,.6)" },
  { key: "closed_won", label: "Won", color: "hsla(140,70%,45%,.8)" },
  { key: "closed_lost", label: "Lost", color: "hsla(0,70%,50%,.6)" },
];
const STAGE_LABELS: Record<string, string> = {};
STAGES.forEach(s => { STAGE_LABELS[s.key] = s.label; });

// ═══════════════════════════════════════════════
// Client Sales Record (in-memory, per-client)
// ═══════════════════════════════════════════════
interface ClientSalesRecord {
  id: string;
  business_name: string;
  business_type: string | null;
  industry: string;
  niche: string;
  archetype: string;
  opType: string;
  nicheLabel: string;
  salesStage: WorkflowStepKey;
  proposalStatus: ProposalStatusKey;
  activeVersionName: string;
  presentedVersionName: string | null;
  readyToPresent: boolean;
  readyToClose: boolean;
  proposalRevealed: boolean;
  paymentReady: boolean;
  paymentStatus: string | null;
  riskIndicator: string;
  riskColor: string;
  modulesCount: number;
  quoteMonthly: number;
  quoteSetup: number;
}

function deriveClientSalesRecord(client: any): ClientSalesRecord {
  const profile = {
    ...DEFAULT_WORKSPACE_PROFILE,
    industry: client.business_type || "",
    archetype: client.business_type === "agency" ? "agency" : "local_business",
    niche: client.business_type || "",
  };
  const niche = NICHE_REGISTRY[profile.niche] || null;
  const opType = resolveOperationType(profile.archetype as any, profile.industry);
  const nicheLabel = niche?.label || profile.niche || "General";

  // Derive sales stage from client statuses
  const ps = client.proposal_status || "not_sent";
  const payStatus = client.payment_status || "unpaid";
  const implStatus = client.implementation_status || "not_started";

  let salesStage: WorkflowStepKey = "booked";
  let proposalStatus: ProposalStatusKey = "draft";
  let proposalRevealed = false;
  let paymentReady = false;

  if (payStatus === "paid") {
    salesStage = "paid";
    proposalStatus = "accepted";
    proposalRevealed = true;
    paymentReady = true;
  } else if (ps === "approved") {
    salesStage = "payment_ready";
    proposalStatus = "accepted";
    proposalRevealed = true;
    paymentReady = true;
  } else if (ps === "viewed") {
    salesStage = "proposal_revealed";
    proposalStatus = "revealed";
    proposalRevealed = true;
  } else if (ps === "sent") {
    salesStage = "final_meeting";
    proposalStatus = "ready_final";
  } else if (ps === "not_sent" && implStatus !== "not_started") {
    salesStage = "proposal_drafted";
    proposalStatus = "draft";
  } else {
    salesStage = "first_meeting";
    proposalStatus = "draft";
  }

  const readyToPresent = !!(profile.industry && profile.niche);
  const readyToClose = proposalRevealed && paymentReady;

  // Risk
  let riskIndicator = "On Track";
  let riskColor = "text-emerald-400";
  if (payStatus === "paid") { riskIndicator = "Handed Off"; riskColor = "text-emerald-400"; }
  else if (proposalRevealed && !paymentReady) { riskIndicator = "Revealed — Awaiting Close"; riskColor = "text-amber-400"; }
  else if (salesStage === "first_meeting") { riskIndicator = "Waiting on First Meeting"; riskColor = "text-blue-400"; }
  else if (!readyToPresent) { riskIndicator = "Missing Profile Data"; riskColor = "text-red-400"; }
  else if (proposalStatus === "draft") { riskIndicator = "Proposal Not Ready"; riskColor = "text-amber-400"; }

  return {
    id: client.id,
    business_name: client.business_name || "Unnamed",
    business_type: client.business_type,
    industry: profile.industry,
    niche: profile.niche,
    archetype: profile.archetype,
    opType,
    nicheLabel,
    salesStage,
    proposalStatus,
    activeVersionName: "Version A",
    presentedVersionName: proposalRevealed ? "Version A" : null,
    readyToPresent,
    readyToClose,
    proposalRevealed,
    paymentReady,
    paymentStatus: payStatus,
    riskIndicator,
    riskColor,
    modulesCount: 0,
    quoteMonthly: 0,
    quoteSetup: 0,
  };
}

// ═══════════════════════════════════════════════
// Stage badge component
// ═══════════════════════════════════════════════
function StageBadge({ stage }: { stage: WorkflowStepKey }) {
  const step = WORKFLOW_STEPS.find(s => s.key === stage);
  const idx = WORKFLOW_STEPS.findIndex(s => s.key === stage);
  const colors = idx <= 3 ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
    : idx <= 6 ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/20"
    : idx <= 8 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
    : "bg-emerald-500/25 text-emerald-300 border-emerald-500/30";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${colors}`}>{step?.label || stage}</span>;
}

function BoolDot({ value, yesLabel = "Yes", noLabel = "No" }: { value: boolean; yesLabel?: string; noLabel?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${value ? "text-emerald-400" : "text-white/30"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${value ? "bg-emerald-400" : "bg-white/20"}`} />
      {value ? yesLabel : noLabel}
    </span>
  );
}

// ═══════════════════════════════════════════════
// Client Detail Summary Panel (Sheet)
// ═══════════════════════════════════════════════
function ClientSalesSummaryPanel({ client, open, onClose }: { client: ClientSalesRecord | null; open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  if (!client) return null;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="bg-[hsl(220,35%,8%)] border-l border-white/[0.06] text-white w-full sm:max-w-md p-0">
        <ScrollArea className="h-full">
          <div className="p-5 space-y-5">
            <SheetHeader className="pb-0">
              <SheetTitle className="text-white text-lg">{client.business_name}</SheetTitle>
              <p className="text-xs text-white/40">{client.nicheLabel} · {client.opType}</p>
            </SheetHeader>

            {/* Summary Strip */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Sales Stage", value: <StageBadge stage={client.salesStage} /> },
                { label: "Proposal", value: PROPOSAL_STATUSES.find(s => s.key === client.proposalStatus)?.label || client.proposalStatus },
                { label: "Active Version", value: client.activeVersionName },
                { label: "Presented", value: client.presentedVersionName || "—" },
                { label: "Ready to Present", value: <BoolDot value={client.readyToPresent} /> },
                { label: "Ready to Close", value: <BoolDot value={client.readyToClose} /> },
                { label: "Revealed", value: <BoolDot value={client.proposalRevealed} /> },
                { label: "Payment", value: client.paymentStatus || "—" },
              ].map((item, i) => (
                <div key={i} className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.04]">
                  <p className="text-[9px] text-white/35 uppercase tracking-wider">{item.label}</p>
                  <div className="text-xs font-medium text-white/80 mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>

            {/* Risk Flags */}
            <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.04]">
              <p className="text-[9px] text-white/35 uppercase tracking-wider mb-1.5">Risk / Status</p>
              <p className={`text-sm font-semibold ${client.riskColor} mb-2`}>{client.riskIndicator}</p>
              <div className="space-y-1">
                {client.riskFlags.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-amber-400/80">
                    <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
                {client.riskFlags.length === 0 && <p className="text-[10px] text-emerald-400/60">No active risk flags</p>}
              </div>
            </div>

            <Separator className="bg-white/[0.06]" />

            {/* Quick Actions */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-white/35 uppercase tracking-wider font-semibold">Actions</p>
              {[
                { label: "Sales Control Center", icon: DollarSign, action: () => navigate("/admin/sales-control-center") },
                { label: "Proposal Wizard", icon: FileText, action: () => navigate(`/admin/clients/${client.id}/proposal-wizard`) },
                { label: "Client Lifecycle", icon: Layers, action: () => navigate(`/admin/clients/${client.id}/lifecycle`) },
                { label: "Handoff Checklist", icon: Clipboard, action: () => navigate(`/admin/clients/${client.id}/handoff`) },
                { label: "Close Center", icon: Target, action: () => navigate(`/admin/clients/${client.id}/close`) },
                { label: "Mark Final Meeting Scheduled", icon: Calendar, action: () => toast.success("Final meeting marked as scheduled") },
                { label: "Flag as At Risk", icon: AlertTriangle, action: () => toast.success("Flagged as at risk") },
              ].map(a => (
                <Button key={a.label} variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/[0.06] h-9 text-xs" onClick={a.action}>
                  <a.icon className="h-3.5 w-3.5 mr-2 text-[hsl(var(--nl-sky))]" />
                  {a.label}
                  <ChevronRight className="h-3 w-3 ml-auto text-white/20" />
                </Button>
              ))}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════
export default function AdminSalesPipeline() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIntake, setShowIntake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [selectedClient, setSelectedClient] = useState<ClientSalesRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [form, setForm] = useState({
    businessName: "", contactName: "", email: "", phone: "",
    website: "", industry: "", location: "", source: "admin_intake",
  });

  const fetchData = useCallback(async () => {
    const [dealsRes, clientsRes] = await Promise.all([
      supabase.from("crm_deals").select("*, crm_contacts(full_name, email), crm_companies(company_name)").order("created_at", { ascending: false }).limit(500),
      supabase.from("clients").select("id, business_name, business_type, proposal_status, payment_status, implementation_status, agreement_status, portal_access_enabled, created_at").order("created_at", { ascending: false }).limit(200),
    ]);
    setDeals(dealsRes.data || []);
    setClients(clientsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derive sales records from clients
  const salesRecords = useMemo(() => clients.map(deriveClientSalesRecord), [clients]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    let r = salesRecords;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      r = r.filter(c => c.business_name.toLowerCase().includes(q) || c.nicheLabel.toLowerCase().includes(q) || c.opType.toLowerCase().includes(q));
    }
    if (stageFilter !== "all") r = r.filter(c => c.salesStage === stageFilter);
    if (riskFilter === "at_risk") r = r.filter(c => c.riskColor !== "text-emerald-400");
    if (riskFilter === "ready_present") r = r.filter(c => c.readyToPresent && !c.proposalRevealed);
    if (riskFilter === "ready_close") r = r.filter(c => c.readyToClose);
    if (riskFilter === "revealed") r = r.filter(c => c.proposalRevealed);
    return r;
  }, [salesRecords, searchQuery, stageFilter, riskFilter]);

  const moveDeal = async (dealId: string, stage: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, pipeline_stage: stage } : d));
    await supabase.from("crm_deals").update({ pipeline_stage: stage } as any).eq("id", dealId);
    toast.success(`Moved to ${STAGE_LABELS[stage] || stage}`);
  };

  const handleIntake = async () => {
    if (!form.businessName || !form.contactName || !form.email) { toast.error("Business name, contact name, and email are required"); return; }
    setSubmitting(true);
    try {
      await executeSalesIntake(form);
      toast.success("Sales intake created");
      setShowIntake(false);
      setForm({ businessName: "", contactName: "", email: "", phone: "", website: "", industry: "", location: "", source: "admin_intake" });
      fetchData();
    } catch (err: any) { toast.error(err.message || "Failed"); }
    setSubmitting(false);
  };

  const totalPipeline = deals.filter(d => !["closed_won", "closed_lost"].includes(d.pipeline_stage)).reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  const wonValue = deals.filter(d => d.pipeline_stage === "closed_won").reduce((s, d) => s + (Number(d.deal_value) || 0), 0);

  // Enhanced summary metrics
  const readyToPresentCount = salesRecords.filter(c => c.readyToPresent && !c.proposalRevealed).length;
  const readyToCloseCount = salesRecords.filter(c => c.readyToClose).length;
  const revealedNotClosed = salesRecords.filter(c => c.proposalRevealed && !c.readyToClose && c.paymentStatus !== "paid").length;
  const paymentReadyCount = salesRecords.filter(c => c.paymentReady).length;
  const atRiskCount = salesRecords.filter(c => c.riskColor !== "text-emerald-400").length;

  const stats = [
    { label: "Open Pipeline", value: `$${totalPipeline.toLocaleString()}`, icon: DollarSign },
    { label: "Active Opps", value: String(salesRecords.filter(c => c.paymentStatus !== "paid").length), icon: Briefcase },
    { label: "Ready to Present", value: String(readyToPresentCount), icon: Eye },
    { label: "Ready to Close", value: String(readyToCloseCount), icon: CheckCircle2 },
    { label: "Revealed / Open", value: String(revealedNotClosed), icon: AlertTriangle },
    { label: "Payment Ready", value: String(paymentReadyCount), icon: DollarSign },
    { label: "At Risk", value: String(atRiskCount), icon: Shield },
    { label: "Won Revenue", value: `$${wonValue.toLocaleString()}`, icon: Target },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales Pipeline</h1>
          <p className="text-sm text-white/50 mt-1">Pipeline · Client Sales State · Quick Actions</p>
        </div>
        <Button className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white" onClick={() => setShowIntake(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> New Intake
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.06)" }}>
              <CardContent className="p-3 flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,60%,.1)" }}>
                  <s.icon className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{s.value}</p>
                  <p className="text-[9px] text-white/35 truncate">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs: Pipeline + Sales List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/[0.04] border border-white/[0.06]">
          <TabsTrigger value="pipeline" className="text-xs data-[state=active]:bg-[hsl(var(--nl-electric))]/20 data-[state=active]:text-[hsl(var(--nl-sky))]">
            <Briefcase className="h-3.5 w-3.5 mr-1.5" /> Deal Pipeline
          </TabsTrigger>
          <TabsTrigger value="sales_list" className="text-xs data-[state=active]:bg-[hsl(var(--nl-electric))]/20 data-[state=active]:text-[hsl(var(--nl-sky))]">
            <Users className="h-3.5 w-3.5 mr-1.5" /> Client Sales List
          </TabsTrigger>
        </TabsList>

        {/* ── PIPELINE TAB ── */}
        <TabsContent value="pipeline" className="mt-4">
          <div className="flex gap-2.5 overflow-x-auto pb-4 -mx-2 px-2">
            {STAGES.map(({ key, label, color }) => {
              const stageDeals = deals.filter(d => d.pipeline_stage === key);
              const stageValue = stageDeals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
              return (
                <div key={key} className="min-w-[200px] flex-1 flex flex-col"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { const id = e.dataTransfer.getData("dealId"); if (id) moveDeal(id, key); }}>
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06]" style={{ borderTopColor: color, borderTopWidth: 2 }}>
                    <div className="px-3 py-2 border-b border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-semibold text-white/70">{label}</h3>
                        <span className="text-[10px] text-white/30">{stageDeals.length}</span>
                      </div>
                      {stageValue > 0 && <p className="text-[10px] text-[hsl(var(--nl-sky))]">${stageValue.toLocaleString()}</p>}
                    </div>
                    <div className="p-1.5 space-y-1.5 min-h-[120px]">
                      {stageDeals.map(deal => (
                        <div key={deal.id} draggable
                          onDragStart={e => e.dataTransfer.setData("dealId", deal.id)}
                          onClick={() => navigate(`/admin/deals/${deal.id}`)}
                          className="p-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] cursor-grab active:cursor-grabbing transition-colors">
                          <p className="text-xs font-medium text-white truncate">{deal.deal_name}</p>
                          <p className="text-[10px] text-white/40 truncate mt-0.5">
                            {deal.crm_companies?.company_name || deal.crm_contacts?.full_name || "—"}
                          </p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-[10px] font-medium text-[hsl(var(--nl-sky))]">
                              ${Number(deal.deal_value || 0).toLocaleString()}
                            </span>
                            <GripVertical className="h-3 w-3 text-white/20" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── CLIENT SALES LIST TAB ── */}
        <TabsContent value="sales_list" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search clients..." className="pl-8 h-8 text-xs bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/30" />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs bg-white/[0.04] border-white/[0.08] text-white">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(220,35%,12%)] border-white/10 text-white">
                <SelectItem value="all" className="text-xs">All Stages</SelectItem>
                {WORKFLOW_STEPS.map(s => <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs bg-white/[0.04] border-white/[0.08] text-white">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(220,35%,12%)] border-white/10 text-white">
                <SelectItem value="all" className="text-xs">All</SelectItem>
                <SelectItem value="at_risk" className="text-xs">At Risk</SelectItem>
                <SelectItem value="ready_present" className="text-xs">Ready to Present</SelectItem>
                <SelectItem value="ready_close" className="text-xs">Ready to Close</SelectItem>
                <SelectItem value="revealed" className="text-xs">Proposal Revealed</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[10px] text-white/30 ml-auto">{filteredRecords.length} client{filteredRecords.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Client</TableHead>
                  <TableHead className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Niche / Type</TableHead>
                  <TableHead className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Stage</TableHead>
                  <TableHead className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Version</TableHead>
                  <TableHead className="text-[10px] text-white/40 font-semibold uppercase tracking-wider text-center">Present</TableHead>
                  <TableHead className="text-[10px] text-white/40 font-semibold uppercase tracking-wider text-center">Revealed</TableHead>
                  <TableHead className="text-[10px] text-white/40 font-semibold uppercase tracking-wider text-center">Close</TableHead>
                  <TableHead className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Risk</TableHead>
                  <TableHead className="text-[10px] text-white/40 font-semibold uppercase tracking-wider w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((c, i) => (
                  <TableRow key={c.id} className="border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-colors" onClick={() => { setSelectedClient(c); setDrawerOpen(true); }}>
                    <TableCell className="py-2.5">
                      <p className="text-xs font-medium text-white">{c.business_name}</p>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <p className="text-[11px] text-white/60">{c.nicheLabel}</p>
                      <p className="text-[9px] text-white/30">{c.opType}</p>
                    </TableCell>
                    <TableCell className="py-2.5"><StageBadge stage={c.salesStage} /></TableCell>
                    <TableCell className="py-2.5">
                      <p className="text-[11px] text-white/70">{c.activeVersionName}</p>
                      {c.presentedVersionName && <p className="text-[9px] text-emerald-400/70">Presented: {c.presentedVersionName}</p>}
                    </TableCell>
                    <TableCell className="py-2.5 text-center"><BoolDot value={c.readyToPresent} /></TableCell>
                    <TableCell className="py-2.5 text-center"><BoolDot value={c.proposalRevealed} /></TableCell>
                    <TableCell className="py-2.5 text-center"><BoolDot value={c.readyToClose} /></TableCell>
                    <TableCell className="py-2.5">
                      <span className={`text-[10px] font-medium ${c.riskColor}`}>{c.riskIndicator}</span>
                    </TableCell>
                    <TableCell className="py-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/[0.06]" title="Sales Control" onClick={() => navigate("/admin/sales-control-center")}>
                          <DollarSign className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/[0.06]" title="Proposal Wizard" onClick={() => navigate(`/admin/clients/${c.id}/proposal-wizard`)}>
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/[0.06]" title="Lifecycle" onClick={() => navigate(`/admin/clients/${c.id}/lifecycle`)}>
                          <Layers className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRecords.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-white/30 text-xs py-8">No clients match filters</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {filteredRecords.map(c => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} onClick={() => { setSelectedClient(c); setDrawerOpen(true); }}>
                <Card className="border-0 bg-white/[0.04] hover:bg-white/[0.06] cursor-pointer transition-colors">
                  <CardContent className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{c.business_name}</p>
                        <p className="text-[10px] text-white/40">{c.nicheLabel} · {c.opType}</p>
                      </div>
                      <StageBadge stage={c.salesStage} />
                    </div>
                    <div className="flex gap-3 text-[10px]">
                      <BoolDot value={c.readyToPresent} yesLabel="Present" noLabel="Not Ready" />
                      <BoolDot value={c.proposalRevealed} yesLabel="Revealed" noLabel="Hidden" />
                      <BoolDot value={c.readyToClose} yesLabel="Closeable" noLabel="Not Yet" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-medium ${c.riskColor}`}>{c.riskIndicator}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-white/20" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Client Detail Summary Panel */}
      <ClientSalesSummaryPanel client={selectedClient} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Intake Dialog */}
      <Dialog open={showIntake} onOpenChange={setShowIntake}>
        <DialogContent className="bg-[hsl(220,35%,10%)] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">New Sales Intake</DialogTitle>
            <DialogDescription className="text-white/50">Create a new lead with contact, company, and deal records.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[
              { k: "businessName", l: "Business Name *", span: true },
              { k: "contactName", l: "Contact Name *" },
              { k: "email", l: "Email *" },
              { k: "phone", l: "Phone" },
              { k: "website", l: "Website" },
              { k: "industry", l: "Industry" },
              { k: "location", l: "Location" },
            ].map(f => (
              <div key={f.k} className={`space-y-1 ${f.span ? "col-span-2" : ""}`}>
                <Label className="text-white/70 text-xs">{f.l}</Label>
                <Input value={(form as any)[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 text-sm" />
              </div>
            ))}
          </div>
          <Button className="w-full mt-3 bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))]" onClick={handleIntake} disabled={submitting}>
            {submitting ? "Creating..." : "Create Sales Intake"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
