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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Headphones, Plus, AlertTriangle, Clock, CheckCircle, User,
  MessageSquare, ArrowUp, Search
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { motion } from "framer-motion";

const DEMO_TICKETS = [
  { id: "TK-001", subject: "Website contact form not working", priority: "high", status: "open", category: "Technical", created: "2026-03-14", assignee: "Sarah W." },
  { id: "TK-002", subject: "Update business hours on Google listing", priority: "medium", status: "in_progress", category: "Marketing", created: "2026-03-13", assignee: "Alex J." },
  { id: "TK-003", subject: "Need new social media graphics", priority: "low", status: "waiting_client", category: "Creative", created: "2026-03-12", assignee: "Mike C." },
  { id: "TK-004", subject: "Invoice discrepancy for February", priority: "high", status: "escalated", category: "Billing", created: "2026-03-11", assignee: "Admin" },
  { id: "TK-005", subject: "Add new service page to website", priority: "medium", status: "new", category: "Website", created: "2026-03-15", assignee: "Unassigned" },
  { id: "TK-006", subject: "Email campaign review request", priority: "low", status: "resolved", category: "Marketing", created: "2026-03-08", assignee: "Sarah W." },
];

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  open: "bg-cyan-50 text-cyan-700",
  in_progress: "bg-indigo-50 text-indigo-700",
  waiting_client: "bg-amber-50 text-amber-700",
  escalated: "bg-red-50 text-red-600",
  resolved: "bg-emerald-50 text-emerald-700",
  closed: "bg-secondary text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  new: "New", open: "Open", in_progress: "In Progress",
  waiting_client: "Waiting on Client", escalated: "Escalated",
  resolved: "Resolved", closed: "Closed",
};

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-red-50 text-red-600",
  medium: "bg-amber-50 text-amber-600",
  low: "bg-secondary text-muted-foreground",
};

export default function HelpDesk() {
  const { activeClientId } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = DEMO_TICKETS.filter(t => {
    const matchFilter = filter === "all" || t.status === filter;
    const matchSearch = !search || t.subject.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });
  const openCount = DEMO_TICKETS.filter(t => !["resolved", "closed"].includes(t.status)).length;
  const highPriority = DEMO_TICKETS.filter(t => t.priority === "high" && t.status !== "resolved").length;

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Help Desk" description="Support tickets, issue tracking, and resolution" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6"><p className="text-muted-foreground">Select a workspace to view Help Desk.</p></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Help Desk" description="Support tickets, issue tracking, and resolution management">
        <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </PageHeader>

      <ModuleHelpPanel
        moduleName="Help Desk"
        description="Track support requests, assign team members, manage priorities, and resolve issues. Tickets can be linked to CRM contacts and workspace records for full context."
        tips={[
          "Tickets move through: New → Open → In Progress → Resolved → Closed",
          "High priority and escalated tickets are flagged for immediate attention",
          "Link tickets to CRM contacts for customer context",
        ]}
      />

      <DemoDataLabel />

      <WidgetGrid columns="repeat(auto-fit, minmax(160px, 1fr))">
        <MetricCard label="Open Tickets" value={String(openCount)} change="Active" icon={Headphones} />
        <MetricCard label="High Priority" value={String(highPriority)} change="Needs attention" changeType={highPriority > 0 ? "negative" : "neutral"} icon={AlertTriangle} />
        <MetricCard label="Resolved" value={String(DEMO_TICKETS.filter(t => t.status === "resolved").length)} change="This period" changeType="positive" icon={CheckCircle} />
        <MetricCard label="Avg Response" value="2.4h" change="Target: <4h" changeType="positive" icon={Clock} />
      </WidgetGrid>

      <div className="mt-6 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." className="pl-8 h-9 text-xs" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["all", "new", "open", "in_progress", "waiting_client", "escalated", "resolved"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}>
              {f === "all" ? "All" : STATUS_LABEL[f] || f}
            </button>
          ))}
        </div>
      </div>

      <DataCard title={`Tickets (${filtered.length})`} className="mt-4">
        {filtered.map((t, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors border-b border-border last:border-0">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-primary/10 shrink-0">
              <Headphones className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">{t.id}</span>
                <p className="text-sm font-medium text-foreground truncate">{t.subject}</p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t.category} · {t.assignee} · {new Date(t.created).toLocaleDateString()}</p>
            </div>
            <Badge className={`text-[10px] h-5 ${PRIORITY_STYLE[t.priority] || ""}`}>{t.priority}</Badge>
            <Badge className={`text-[10px] h-5 ${STATUS_STYLE[t.status] || ""}`}>{STATUS_LABEL[t.status]}</Badge>
          </motion.div>
        ))}
      </DataCard>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Support Ticket</SheetTitle>
            <SheetDescription>Create a new support request or issue.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Subject *</Label><Input placeholder="Describe the issue" /></div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select defaultValue="general">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select defaultValue="medium">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Provide details..." className="min-h-[100px]" /></div>
            <Button className="w-full gap-1.5"><Plus className="h-4 w-4" /> Create Ticket</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}