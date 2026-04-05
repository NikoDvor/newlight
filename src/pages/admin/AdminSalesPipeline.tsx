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
import { DEFAULT_WORKSPACE_PROFILE } from "@/lib/workspaceProfileTypes";
import {
  Plus, GripVertical, DollarSign, Users, Calendar, FileText,
  CheckCircle2, Target, UserPlus, Briefcase, Eye, Zap,
  AlertTriangle, Clock, Shield, ArrowRight, Filter,
  ChevronRight, Brain, Lock, Unlock, Clipboard, X, Search,
  BarChart3, Star, Package, Layers, TrendingUp, Activity
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
// Client Sales Record
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
  riskLevel: "low" | "moderate" | "high";
  riskFlags: string[];
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

  const ps = client.proposal_status || "not_sent";
  const payStatus = client.payment_status || "unpaid";
  const implStatus = client.implementation_status || "not_started";

  let salesStage: WorkflowStepKey = "booked";
  let proposalStatus: ProposalStatusKey = "draft";
  let proposalRevealed = false;
  let paymentReady = false;

  if (payStatus === "paid") {
    salesStage = "paid"; proposalStatus = "accepted"; proposalRevealed = true; paymentReady = true;
  } else if (ps === "approved") {
    salesStage = "payment_ready"; proposalStatus = "accepted"; proposalRevealed = true; paymentReady = true;
  } else if (ps === "viewed") {
    salesStage = "proposal_revealed"; proposalStatus = "revealed"; proposalRevealed = true;
  } else if (ps === "sent") {
    salesStage = "final_meeting"; proposalStatus = "ready_final";
  } else if (ps === "not_sent" && implStatus !== "not_started") {
    salesStage = "proposal_drafted"; proposalStatus = "draft";
  } else {
    salesStage = "first_meeting"; proposalStatus = "draft";
  }

  const readyToPresent = !!(profile.industry && profile.niche);
  const readyToClose = proposalRevealed && paymentReady;

  let riskIndicator = "On Track";
  let riskLevel: "low" | "moderate" | "high" = "low";
  if (payStatus === "paid") { riskIndicator = "Handed Off"; riskLevel = "low"; }
  else if (proposalRevealed && !paymentReady) { riskIndicator = "Revealed — Awaiting Close"; riskLevel = "moderate"; }
  else if (salesStage === "first_meeting") { riskIndicator = "Awaiting First Meeting"; riskLevel = "moderate"; }
  else if (!readyToPresent) { riskIndicator = "Missing Profile Data"; riskLevel = "high"; }
  else if (proposalStatus === "draft") { riskIndicator = "Proposal Not Ready"; riskLevel = "moderate"; }

  const riskFlagsList: string[] = [];
  if (!readyToPresent) riskFlagsList.push("Missing profile data");
  if (proposalRevealed && !paymentReady) riskFlagsList.push("Revealed but not progressing");
  if (salesStage === "first_meeting") riskFlagsList.push("Awaiting first meeting");
  if (proposalStatus === "draft" && salesStage !== "first_meeting" && salesStage !== ("booked" as WorkflowStepKey)) riskFlagsList.push("Proposal not finalized");

  return {
    id: client.id, business_name: client.business_name || "Unnamed", business_type: client.business_type,
    industry: profile.industry, niche: profile.niche, archetype: profile.archetype,
    opType, nicheLabel, salesStage, proposalStatus,
    activeVersionName: "Version A", presentedVersionName: proposalRevealed ? "Version A" : null,
    readyToPresent, readyToClose, proposalRevealed, paymentReady,
    paymentStatus: payStatus, riskIndicator, riskLevel, riskFlags: riskFlagsList,
    modulesCount: 0, quoteMonthly: 0, quoteSetup: 0,
  };
}

// ═══════════════════════════════════════════════
// Polished Stage Badge
// ═══════════════════════════════════════════════
function StageBadge({ stage }: { stage: WorkflowStepKey }) {
  const step = WORKFLOW_STEPS.find(s => s.key === stage);
  const idx = WORKFLOW_STEPS.findIndex(s => s.key === stage);
  const colors = idx <= 3
    ? "bg-primary/15 text-primary border-primary/20"
    : idx <= 6
    ? "bg-accent/15 text-accent border-accent/20"
    : idx <= 8
    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
    : "bg-emerald-500/25 text-emerald-300 border-emerald-500/30";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur-sm ${colors}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${idx <= 3 ? "bg-primary" : idx <= 6 ? "bg-accent" : "bg-emerald-400"} animate-pulse`} />
      {step?.label || stage}
    </span>
  );
}

function RiskPill({ level, label }: { level: "low" | "moderate" | "high"; label: string }) {
  const colors = level === "low"
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
    : level === "moderate"
    ? "bg-amber-500/10 text-amber-400 border-amber-500/15"
    : "bg-red-500/10 text-red-400 border-red-500/15";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${colors}`}>
      {level === "high" && <AlertTriangle className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

function ReadinessDot({ value, yesLabel = "Yes", noLabel = "No" }: { value: boolean; yesLabel?: string; noLabel?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium ${value ? "text-emerald-400" : "text-muted-foreground/40"}`}>
      <span className={`h-2 w-2 rounded-full border ${value ? "bg-emerald-400/80 border-emerald-400/30 shadow-[0_0_6px_hsla(160,70%,50%,.3)]" : "bg-muted/20 border-muted-foreground/10"}`} />
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

  const actions = [
    { label: "Sales Control Center", icon: DollarSign, primary: true, action: () => navigate("/admin/sales-control-center") },
    { label: "Proposal Wizard", icon: FileText, primary: true, action: () => navigate(`/admin/clients/${client.id}/proposal-wizard`) },
    { label: "Client Lifecycle", icon: Layers, primary: false, action: () => navigate(`/admin/clients/${client.id}/lifecycle`) },
    { label: "Handoff Checklist", icon: Clipboard, primary: false, action: () => navigate(`/admin/clients/${client.id}/handoff`) },
    { label: "Close Center", icon: Target, primary: false, action: () => navigate(`/admin/clients/${client.id}/close`) },
  ];

  const quickActions = [
    { label: "Mark Final Meeting Scheduled", icon: Calendar, action: () => toast.success("Final meeting marked as scheduled") },
    { label: "Flag as At Risk", icon: AlertTriangle, action: () => toast.success("Flagged as at risk") },
  ];

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="bg-card border-l border-border/30 text-foreground w-full sm:max-w-md p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            <SheetHeader className="pb-0 space-y-1">
              <SheetTitle className="text-foreground text-lg font-bold">{client.business_name}</SheetTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{client.nicheLabel}</span>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-xs text-muted-foreground">{client.opType}</span>
              </div>
            </SheetHeader>

            {/* Summary Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Sales Stage", value: <StageBadge stage={client.salesStage} /> },
                { label: "Proposal Status", value: PROPOSAL_STATUSES.find(s => s.key === client.proposalStatus)?.label || client.proposalStatus },
                { label: "Active Version", value: client.activeVersionName },
                { label: "Presented Version", value: client.presentedVersionName || <span className="text-muted-foreground/30 italic text-[10px]">Not yet presented</span> },
                { label: "Ready to Present", value: <ReadinessDot value={client.readyToPresent} /> },
                { label: "Ready to Close", value: <ReadinessDot value={client.readyToClose} /> },
                { label: "Proposal Revealed", value: <ReadinessDot value={client.proposalRevealed} /> },
                { label: "Payment", value: client.paymentStatus === "paid" ? <span className="text-emerald-400 font-semibold text-[10px]">Paid</span> : <span className="text-muted-foreground/40 text-[10px]">Unpaid</span> },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-muted/20 rounded-lg p-3 border border-border/20">
                  <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-medium">{item.label}</p>
                  <div className="text-xs font-medium text-foreground/80 mt-1">{item.value}</div>
                </motion.div>
              ))}
            </div>

            {/* Risk */}
            <div className="bg-muted/15 rounded-xl p-4 border border-border/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Risk Assessment</p>
                <RiskPill level={client.riskLevel} label={client.riskIndicator} />
              </div>
              <div className="space-y-1.5">
                {client.riskFlags.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-amber-400/80">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
                {client.riskFlags.length === 0 && (
                  <div className="flex items-center gap-2 text-[10px] text-emerald-400/60">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>No active risk flags</span>
                  </div>
                )}
              </div>
            </div>

            <Separator className="bg-border/20" />

            {/* Primary Actions */}
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-semibold">Navigate</p>
              <div className="grid grid-cols-2 gap-2">
                {actions.map(a => (
                  <Button key={a.label} variant={a.primary ? "outline" : "ghost"}
                    className={`justify-start h-10 text-xs ${a.primary ? "border-primary/20 text-primary hover:bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted/20"}`}
                    onClick={a.action}>
                    <a.icon className="h-3.5 w-3.5 mr-2 shrink-0" />
                    <span className="truncate">{a.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-semibold">Quick Actions</p>
              {quickActions.map(a => (
                <Button key={a.label} variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/20 h-9 text-xs" onClick={a.action}>
                  <a.icon className="h-3.5 w-3.5 mr-2 text-primary/60" />
                  {a.label}
                  <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground/20" />
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
// Metric Card
// ═══════════════════════════════════════════════
function PipelineMetric({ label, value, icon: Icon, accent, delay }: { label: string; value: string; icon: any; accent?: boolean; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }}>
      <Card className={`border border-border/20 ${accent ? "bg-primary/5 border-primary/15" : "bg-card/60"} backdrop-blur-sm hover:shadow-[var(--shadow-card-hover)] transition-shadow duration-300`}>
        <CardContent className="p-3.5 flex items-center gap-3">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${accent ? "bg-primary/15" : "bg-muted/30"}`}>
            <Icon className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground/60"}`} />
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-bold ${accent ? "text-primary" : "text-foreground"} truncate`}>{value}</p>
            <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider truncate">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
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

  const salesRecords = useMemo(() => clients.map(deriveClientSalesRecord), [clients]);

  const filteredRecords = useMemo(() => {
    let r = salesRecords;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      r = r.filter(c => c.business_name.toLowerCase().includes(q) || c.nicheLabel.toLowerCase().includes(q) || c.opType.toLowerCase().includes(q));
    }
    if (stageFilter !== "all") r = r.filter(c => c.salesStage === stageFilter);
    if (riskFilter === "at_risk") r = r.filter(c => c.riskLevel !== "low");
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

  const readyToPresentCount = salesRecords.filter(c => c.readyToPresent && !c.proposalRevealed).length;
  const readyToCloseCount = salesRecords.filter(c => c.readyToClose).length;
  const revealedNotClosed = salesRecords.filter(c => c.proposalRevealed && !c.readyToClose && c.paymentStatus !== "paid").length;
  const paymentReadyCount = salesRecords.filter(c => c.paymentReady).length;
  const atRiskCount = salesRecords.filter(c => c.riskLevel !== "low").length;

  const stats = [
    { label: "Open Pipeline", value: `$${totalPipeline.toLocaleString()}`, icon: DollarSign, accent: true },
    { label: "Active Opps", value: String(salesRecords.filter(c => c.paymentStatus !== "paid").length), icon: Briefcase },
    { label: "Ready to Present", value: String(readyToPresentCount), icon: Eye },
    { label: "Ready to Close", value: String(readyToCloseCount), icon: CheckCircle2 },
    { label: "Revealed / Open", value: String(revealedNotClosed), icon: Activity },
    { label: "Payment Ready", value: String(paymentReadyCount), icon: Unlock },
    { label: "At Risk", value: String(atRiskCount), icon: AlertTriangle },
    { label: "Won Revenue", value: `$${wonValue.toLocaleString()}`, icon: TrendingUp, accent: true },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <motion.div className="flex items-start justify-between gap-4" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Sales Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Pipeline · Client Sales State · Quick Actions</p>
        </div>
        <Button onClick={() => setShowIntake(true)} className="shrink-0">
          <UserPlus className="h-4 w-4 mr-1.5" /> New Intake
        </Button>
      </motion.div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {stats.map((s, i) => (
          <PipelineMetric key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.accent} delay={i * 0.04} />
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/60 border border-border/20 backdrop-blur-sm p-1 h-auto">
          <TabsTrigger value="pipeline" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg px-4 py-2 transition-all">
            <Briefcase className="h-3.5 w-3.5 mr-1.5" /> Deal Pipeline
          </TabsTrigger>
          <TabsTrigger value="sales_list" className="text-xs data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg px-4 py-2 transition-all">
            <Users className="h-3.5 w-3.5 mr-1.5" /> Client Sales List
          </TabsTrigger>
        </TabsList>

        {/* ── PIPELINE TAB ── */}
        <TabsContent value="pipeline" className="mt-5">
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
            {STAGES.map(({ key, label, color }) => {
              const stageDeals = deals.filter(d => d.pipeline_stage === key);
              const stageValue = stageDeals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
              return (
                <div key={key} className="min-w-[210px] flex-1 flex flex-col"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { const id = e.dataTransfer.getData("dealId"); if (id) moveDeal(id, key); }}>
                  <div className="rounded-xl bg-card/40 border border-border/20 backdrop-blur-sm overflow-hidden" style={{ borderTopColor: color, borderTopWidth: 2 }}>
                    <div className="px-3.5 py-2.5 border-b border-border/15 bg-muted/5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[11px] font-semibold text-foreground/70">{label}</h3>
                        <Badge variant="outline" className="text-[9px] h-4 border-border/20 text-muted-foreground/50">{stageDeals.length}</Badge>
                      </div>
                      {stageValue > 0 && <p className="text-[10px] text-primary/80 font-medium mt-0.5">${stageValue.toLocaleString()}</p>}
                    </div>
                    <div className="p-2 space-y-1.5 min-h-[120px]">
                      {stageDeals.map(deal => (
                        <motion.div key={deal.id} draggable whileHover={{ scale: 1.02, y: -1 }} transition={{ duration: 0.15 }}
                          onDragStart={e => (e as any).dataTransfer?.setData("dealId", deal.id)}
                          onClick={() => navigate(`/admin/deals/${deal.id}`)}
                          className="p-3 rounded-lg bg-muted/15 hover:bg-muted/25 border border-border/10 hover:border-primary/15 cursor-grab active:cursor-grabbing transition-colors">
                          <p className="text-xs font-medium text-foreground truncate">{deal.deal_name}</p>
                          <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                            {deal.crm_companies?.company_name || deal.crm_contacts?.full_name || "—"}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] font-semibold text-primary">${Number(deal.deal_value || 0).toLocaleString()}</span>
                            <GripVertical className="h-3 w-3 text-muted-foreground/20" />
                          </div>
                        </motion.div>
                      ))}
                      {stageDeals.length === 0 && (
                        <div className="flex items-center justify-center h-20 text-[10px] text-muted-foreground/25">No deals</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── CLIENT SALES LIST TAB ── */}
        <TabsContent value="sales_list" className="mt-5 space-y-4">
          {/* Filters */}
          <motion.div className="flex flex-wrap gap-2.5 items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search clients..."
                className="pl-9 h-9 text-xs bg-card/60 border-border/20 text-foreground placeholder:text-muted-foreground/30 focus:border-primary/30" />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[160px] h-9 text-xs bg-card/60 border-border/20 text-foreground">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/30 text-foreground">
                <SelectItem value="all" className="text-xs">All Stages</SelectItem>
                {WORKFLOW_STEPS.map(s => <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[170px] h-9 text-xs bg-card/60 border-border/20 text-foreground">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/30 text-foreground">
                <SelectItem value="all" className="text-xs">All</SelectItem>
                <SelectItem value="at_risk" className="text-xs">At Risk</SelectItem>
                <SelectItem value="ready_present" className="text-xs">Ready to Present</SelectItem>
                <SelectItem value="ready_close" className="text-xs">Ready to Close</SelectItem>
                <SelectItem value="revealed" className="text-xs">Proposal Revealed</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[10px] text-muted-foreground/40 ml-auto font-medium">{filteredRecords.length} client{filteredRecords.length !== 1 ? "s" : ""}</span>
          </motion.div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl border border-border/20 bg-card/40 backdrop-blur-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/15 hover:bg-transparent bg-muted/5">
                  <TableHead className="text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-wider">Client</TableHead>
                  <TableHead className="text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-wider">Niche / Type</TableHead>
                  <TableHead className="text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-wider">Stage</TableHead>
                  <TableHead className="text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-wider">Version</TableHead>
                  <TableHead className="text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-wider text-center">Present</TableHead>
                  <TableHead className="text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-wider text-center">Revealed</TableHead>
                  <TableHead className="text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-wider text-center">Close</TableHead>
                  <TableHead className="text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-wider">Risk</TableHead>
                  <TableHead className="text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-wider w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((c, i) => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="border-border/10 hover:bg-primary/[0.03] cursor-pointer transition-colors group"
                    onClick={() => { setSelectedClient(c); setDrawerOpen(true); }}>
                    <TableCell className="py-3">
                      <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{c.business_name}</p>
                    </TableCell>
                    <TableCell className="py-3">
                      <p className="text-[11px] text-foreground/60">{c.nicheLabel}</p>
                      <p className="text-[9px] text-muted-foreground/40">{c.opType}</p>
                    </TableCell>
                    <TableCell className="py-3"><StageBadge stage={c.salesStage} /></TableCell>
                    <TableCell className="py-3">
                      <p className="text-[11px] text-foreground/70">{c.activeVersionName}</p>
                      {c.presentedVersionName
                        ? <p className="text-[9px] text-emerald-400/70 flex items-center gap-1"><Eye className="h-2.5 w-2.5" /> {c.presentedVersionName}</p>
                        : <p className="text-[9px] text-muted-foreground/25 italic">No presented version</p>
                      }
                    </TableCell>
                    <TableCell className="py-3 text-center"><ReadinessDot value={c.readyToPresent} /></TableCell>
                    <TableCell className="py-3 text-center"><ReadinessDot value={c.proposalRevealed} /></TableCell>
                    <TableCell className="py-3 text-center"><ReadinessDot value={c.readyToClose} /></TableCell>
                    <TableCell className="py-3"><RiskPill level={c.riskLevel} label={c.riskIndicator} /></TableCell>
                    <TableCell className="py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors" title="Sales Control" onClick={() => navigate("/admin/sales-control-center")}>
                          <DollarSign className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors" title="Proposal Wizard" onClick={() => navigate(`/admin/clients/${c.id}/proposal-wizard`)}>
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors" title="Lifecycle" onClick={() => navigate(`/admin/clients/${c.id}/lifecycle`)}>
                          <Layers className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
                {filteredRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-6 w-6 text-muted-foreground/20" />
                        <p className="text-sm text-muted-foreground/40">No clients match your filters</p>
                        <p className="text-[10px] text-muted-foreground/25">Try adjusting your search or filter criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2.5">
            {filteredRecords.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                onClick={() => { setSelectedClient(c); setDrawerOpen(true); }}>
                <Card className="border-border/15 bg-card/60 hover:bg-card/80 hover:border-primary/15 cursor-pointer transition-all duration-200 backdrop-blur-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{c.business_name}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">{c.nicheLabel} · {c.opType}</p>
                      </div>
                      <StageBadge stage={c.salesStage} />
                    </div>
                    <div className="flex gap-4 text-[10px]">
                      <ReadinessDot value={c.readyToPresent} yesLabel="Present" noLabel="Not Ready" />
                      <ReadinessDot value={c.proposalRevealed} yesLabel="Revealed" noLabel="Hidden" />
                      <ReadinessDot value={c.readyToClose} yesLabel="Closeable" noLabel="Not Yet" />
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/10">
                      <RiskPill level={c.riskLevel} label={c.riskIndicator} />
                      <ChevronRight className="h-4 w-4 text-muted-foreground/20" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {filteredRecords.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12">
                <Search className="h-6 w-6 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground/40">No clients match your filters</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Client Detail Summary Panel */}
      <ClientSalesSummaryPanel client={selectedClient} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Intake Dialog */}
      <Dialog open={showIntake} onOpenChange={setShowIntake}>
        <DialogContent className="bg-card border-border/30 text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle>New Sales Intake</DialogTitle>
            <DialogDescription className="text-muted-foreground">Create a new lead with contact, company, and deal records.</DialogDescription>
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
              <div key={f.k} className={`space-y-1.5 ${f.span ? "col-span-2" : ""}`}>
                <Label className="text-muted-foreground text-xs">{f.l}</Label>
                <Input value={(form as any)[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} className="bg-muted/15 border-border/20 text-foreground h-9 text-sm" />
              </div>
            ))}
          </div>
          <Button className="w-full mt-4" onClick={handleIntake} disabled={submitting}>
            {submitting ? "Creating..." : "Create Sales Intake"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
