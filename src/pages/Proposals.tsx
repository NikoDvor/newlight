import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { SetupBanner, DemoDataLabel } from "@/components/SetupBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Plus, CheckCircle, Clock, Send, DollarSign,
  PenTool, Eye, FileSignature, AlertCircle
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { motion } from "framer-motion";

const DEMO_PROPOSALS = [
  { title: "Website Redesign — Johnson Corp", value: 12500, status: "sent", created: "2026-03-10", client: "Johnson Corp" },
  { title: "SEO + Ads Package — Metro Dental", value: 3500, status: "viewed", created: "2026-03-08", client: "Metro Dental" },
  { title: "Monthly Marketing Retainer — Peak Fitness", value: 2000, status: "signed", created: "2026-02-28", client: "Peak Fitness" },
  { title: "Social Media Management — Local Eats", value: 1800, status: "draft", created: "2026-03-14", client: "Local Eats" },
  { title: "Brand Strategy — Apex Consulting", value: 8000, status: "expired", created: "2026-01-15", client: "Apex Consulting" },
];

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-amber-50 text-amber-700",
  sent: "bg-blue-50 text-blue-700",
  viewed: "bg-cyan-50 text-cyan-700",
  signed: "bg-emerald-50 text-emerald-700",
  expired: "bg-secondary text-muted-foreground",
  declined: "bg-red-50 text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", sent: "Sent", viewed: "Viewed",
  signed: "Signed", expired: "Expired", declined: "Declined",
};

export default function Proposals() {
  const { activeClientId } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? DEMO_PROPOSALS : DEMO_PROPOSALS.filter(p => p.status === filter);
  const totalValue = DEMO_PROPOSALS.reduce((s, p) => s + p.value, 0);
  const signedValue = DEMO_PROPOSALS.filter(p => p.status === "signed").reduce((s, p) => s + p.value, 0);
  const pendingCount = DEMO_PROPOSALS.filter(p => ["sent", "viewed"].includes(p.status)).length;

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
          "Proposals move through: Draft → Sent → Viewed → Signed",
          "Signed proposals can trigger deal creation in CRM",
          "Track total pipeline value and close rates",
        ]}
      />

      <DemoDataLabel />

      <WidgetGrid columns="repeat(auto-fit, minmax(160px, 1fr))">
        <MetricCard label="Total Proposals" value={String(DEMO_PROPOSALS.length)} change="All time" icon={FileText} />
        <MetricCard label="Pipeline Value" value={`$${totalValue.toLocaleString()}`} change="All proposals" icon={DollarSign} />
        <MetricCard label="Signed Value" value={`$${signedValue.toLocaleString()}`} change="Closed" changeType="positive" icon={CheckCircle} />
        <MetricCard label="Pending" value={String(pendingCount)} change="Awaiting response" icon={Clock} />
      </WidgetGrid>

      <div className="flex flex-wrap gap-1.5 mt-6 mb-4">
        {["all", "draft", "sent", "viewed", "signed", "expired"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-colors capitalize ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}>
            {f === "all" ? "All" : STATUS_LABEL[f] || f}
          </button>
        ))}
      </div>

      <DataCard title={`Proposals (${filtered.length})`}>
        {filtered.map((p, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors border-b border-border last:border-0">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-primary/10 shrink-0">
              <FileSignature className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{p.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{p.client} · {new Date(p.created).toLocaleDateString()}</p>
            </div>
            <span className="text-sm font-semibold text-foreground">${p.value.toLocaleString()}</span>
            <Badge className={`text-[10px] h-5 ${STATUS_STYLE[p.status] || ""}`}>{STATUS_LABEL[p.status]}</Badge>
          </motion.div>
        ))}
      </DataCard>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Proposal</SheetTitle>
            <SheetDescription>Create a new proposal or service agreement.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input placeholder="Proposal title" /></div>
            <div className="space-y-2"><Label>Client Name</Label><Input placeholder="Client or company" /></div>
            <div className="space-y-2"><Label>Value ($)</Label><Input type="number" placeholder="0" /></div>
            <div className="space-y-2"><Label>Scope / Description</Label><Textarea placeholder="Outline the services, deliverables, and terms..." className="min-h-[100px]" /></div>
            <Button className="w-full gap-1.5"><PenTool className="h-4 w-4" /> Create Proposal</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}