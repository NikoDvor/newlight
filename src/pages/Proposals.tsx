import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { SetupBanner } from "@/components/SetupBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, Plus, CheckCircle, Clock, Send, DollarSign,
  PenTool, Eye, FileSignature, AlertCircle, Copy, ExternalLink, Loader2
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700",
  generated: "bg-amber-50 text-amber-700",
  sent: "bg-blue-50 text-blue-700",
  viewed: "bg-cyan-50 text-cyan-700",
  accepted: "bg-emerald-50 text-emerald-700",
  signed: "bg-emerald-50 text-emerald-700",
  expired: "bg-secondary text-muted-foreground",
  declined: "bg-red-50 text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", generated: "Generated", sent: "Sent", viewed: "Viewed",
  accepted: "Accepted", signed: "Signed", expired: "Expired", declined: "Declined",
};

export default function Proposals() {
  const { activeClientId } = useWorkspace();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", setup_fee: "", monthly_fee: "", contract_term: "6 months", description: "" });

  const fetchProposals = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("proposals")
      .select("*")
      .eq("client_id", activeClientId)
      .order("created_at", { ascending: false });
    setProposals(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchProposals(); }, [activeClientId]);

  const filtered = filter === "all" ? proposals : proposals.filter(p => p.proposal_status === filter);
  const totalValue = proposals.reduce((s, p) => s + Number(p.monthly_fee || 0) + Number(p.setup_fee || 0), 0);
  const signedValue = proposals.filter(p => ["accepted", "signed"].includes(p.proposal_status)).reduce((s, p) => s + Number(p.monthly_fee || 0) + Number(p.setup_fee || 0), 0);
  const pendingCount = proposals.filter(p => ["sent", "viewed", "generated"].includes(p.proposal_status)).length;

  const createProposal = async () => {
    if (!activeClientId || !form.title.trim()) { toast({ title: "Title required" }); return; }
    setCreating(true);

    const shareToken = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, "0")).join("");
    const { data, error } = await supabase.from("proposals").insert({
      client_id: activeClientId,
      proposal_title: form.title,
      proposal_type: "service_proposal",
      proposal_status: "draft",
      setup_fee: parseFloat(form.setup_fee) || 0,
      monthly_fee: parseFloat(form.monthly_fee) || 0,
      contract_term: form.contract_term,
      share_token: shareToken,
      pricing_model: "monthly_retainer",
      version_number: 1,
      expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    } as any).select("id").single();

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setCreating(false); return; }

    if (form.description && data) {
      await supabase.from("proposal_sections").insert({
        proposal_id: data.id,
        section_key: "overview",
        section_title: "Proposal Overview",
        content: form.description,
        section_order: 0,
      });
    }

    await supabase.from("audit_logs").insert({ action: "proposal_created", module: "sales", metadata: { proposal_id: data?.id }, client_id: activeClientId });

    toast({ title: "Proposal created" });
    setCreateOpen(false);
    setForm({ title: "", setup_fee: "", monthly_fee: "", contract_term: "6 months", description: "" });
    setCreating(false);
    fetchProposals();
  };

  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/proposal/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied" });
  };

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Proposals" description="Create, send, and track proposals and agreements" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6"><p className="text-muted-foreground">Select a workspace to view Proposals.</p></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Proposals & Agreements" description="Create, send, and track proposals and service agreements">
        <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Proposal
        </Button>
      </PageHeader>

      <ModuleHelpPanel
        moduleName="Proposals & Agreements"
        description="Build proposals, define service scopes, track client approvals, and manage signed agreements. Proposals can be linked to CRM contacts and deals for full revenue tracking."
        tips={[
          "Proposals move through: Draft → Sent → Viewed → Accepted",
          "Share proposals via unique links with built-in e-signature",
          "Accepted proposals automatically trigger billing and activation",
        ]}
      />

      {proposals.length === 0 && !loading && (
        <SetupBanner
          icon={FileSignature}
          title="No Proposals Yet"
          description="Create your first proposal to start tracking service agreements and close deals."
          actionLabel="Create Proposal"
          onAction={() => setCreateOpen(true)}
        />
      )}

      <WidgetGrid columns="repeat(auto-fit, minmax(160px, 1fr))">
        <MetricCard label="Total Proposals" value={String(proposals.length)} change="All time" icon={FileText} />
        <MetricCard label="Pipeline Value" value={`$${totalValue.toLocaleString()}`} change="All proposals" icon={DollarSign} />
        <MetricCard label="Signed Value" value={`$${signedValue.toLocaleString()}`} change="Closed" changeType="positive" icon={CheckCircle} />
        <MetricCard label="Pending" value={String(pendingCount)} change="Awaiting response" icon={Clock} />
      </WidgetGrid>

      <div className="flex flex-wrap gap-1.5 mt-6 mb-4">
        {["all", "draft", "generated", "sent", "viewed", "accepted", "declined", "expired"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-colors capitalize ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}>
            {f === "all" ? "All" : STATUS_LABEL[f] || f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <DataCard title="Proposals">
          <div className="text-center py-8">
            <FileSignature className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground mb-3">No proposals yet</p>
            <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Create First Proposal</Button>
          </div>
        </DataCard>
      ) : (
        <DataCard title={`Proposals (${filtered.length})`}>
          {filtered.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors border-b border-border last:border-0 cursor-pointer group">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-primary/10 shrink-0">
                <FileSignature className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{p.proposal_title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(p.created_at).toLocaleDateString()}
                  {p.contract_term ? ` · ${p.contract_term}` : ""}
                </p>
              </div>
              <span className="text-sm font-semibold text-foreground">
                ${(Number(p.monthly_fee || 0) + Number(p.setup_fee || 0)).toLocaleString()}
              </span>
              <Badge className={`text-[10px] h-5 ${STATUS_STYLE[p.proposal_status] || "bg-secondary text-muted-foreground"}`}>
                {STATUS_LABEL[p.proposal_status] || p.proposal_status}
              </Badge>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {p.share_token && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); copyShareLink(p.share_token); }}
                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-secondary" title="Copy link">
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); window.open(`/proposal/${p.share_token}`, "_blank"); }}
                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-secondary" title="Preview">
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </DataCard>
      )}

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Proposal</SheetTitle>
            <SheetDescription>Create a new proposal or service agreement.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input placeholder="Proposal title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Setup Fee ($)</Label><Input type="number" placeholder="0" value={form.setup_fee} onChange={e => setForm(f => ({ ...f, setup_fee: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Monthly Fee ($)</Label><Input type="number" placeholder="0" value={form.monthly_fee} onChange={e => setForm(f => ({ ...f, monthly_fee: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>Contract Term</Label>
              <Select value={form.contract_term} onValueChange={v => setForm(f => ({ ...f, contract_term: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3 months">3 months</SelectItem>
                  <SelectItem value="6 months">6 months</SelectItem>
                  <SelectItem value="12 months">12 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Outline the services, deliverables, and terms..." className="min-h-[100px]" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <Button className="w-full gap-1.5" onClick={createProposal} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4" />} Create Proposal
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
