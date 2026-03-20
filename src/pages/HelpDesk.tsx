import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/PageHeader";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { EmptyModuleState } from "@/components/EmptyModuleState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Headphones, Plus, AlertTriangle, Clock, CheckCircle, Search, MessageSquare
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = ["Technical", "Booking", "Billing", "Calendar", "CRM", "Website", "SEO", "Ads", "Social", "Team Access", "Training", "Other"];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

const STATUS_STYLE: Record<string, string> = {
  New: "bg-blue-50 text-blue-700",
  Open: "bg-cyan-50 text-cyan-700",
  "In Progress": "bg-indigo-50 text-indigo-700",
  "Waiting on Client": "bg-amber-50 text-amber-700",
  Escalated: "bg-red-50 text-red-600",
  Resolved: "bg-emerald-50 text-emerald-700",
  Closed: "bg-secondary text-muted-foreground",
};

const PRIORITY_STYLE: Record<string, string> = {
  Urgent: "bg-red-50 text-red-600",
  High: "bg-red-50 text-red-600",
  Medium: "bg-amber-50 text-amber-600",
  Low: "bg-secondary text-muted-foreground",
};

export default function HelpDesk() {
  const { activeClientId, user } = useWorkspace();
  const [tickets, setTickets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", category: "Other", priority: "Medium" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!activeClientId) return;
    const { data } = await supabase.from("support_tickets" as any).select("*").eq("client_id", activeClientId).order("created_at", { ascending: false });
    setTickets(data ?? []);
  };

  useEffect(() => { load(); }, [activeClientId]);

  const create = async () => {
    if (!activeClientId || !form.subject) return;
    setSaving(true);
    await supabase.from("support_tickets" as any).insert({
      client_id: activeClientId,
      subject: form.subject,
      description: form.description || null,
      category: form.category,
      priority: form.priority,
      status: "New",
      submitted_by: user?.id || null,
    });
    toast({ title: "Ticket created" });
    setForm({ subject: "", description: "", category: "Other", priority: "Medium" });
    setCreateOpen(false);
    setSaving(false);
    load();
  };

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Help Desk" description="Support tickets, issue tracking, and resolution" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6"><p className="text-muted-foreground">Select a workspace to view Help Desk.</p></div>
      </div>
    );
  }

  const filtered = tickets.filter(t => {
    const matchFilter = filter === "all" || t.status === filter;
    const matchSearch = !search || t.subject?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const openCount = tickets.filter(t => !["Resolved", "Closed"].includes(t.status)).length;
  const highPriority = tickets.filter(t => ["High", "Urgent"].includes(t.priority) && !["Resolved", "Closed"].includes(t.status)).length;
  const resolvedCount = tickets.filter(t => t.status === "Resolved").length;

  return (
    <div>
      <PageHeader title="Help Desk" description="Support tickets, issue tracking, and resolution management">
        <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Ticket
        </Button>
      </PageHeader>

      <ModuleHelpPanel
        moduleName="Help Desk"
        description="Track support requests, assign team members, manage priorities, and resolve issues."
        tips={[
          "Tickets move through: New → Open → In Progress → Resolved → Closed",
          "High priority and escalated tickets are flagged for immediate attention",
          "Link tickets to CRM contacts for customer context",
        ]}
      />

      {tickets.length === 0 ? (
        <EmptyModuleState
          icon={Headphones}
          title="No Support Tickets Yet"
          description="When you or your team need help, create a support ticket here. We'll track the issue through to resolution."
          features={[
            "Submit tickets for technical issues, billing, or service requests",
            "Track status, priority, and assignment in real time",
            "Get notified when tickets are updated or resolved",
          ]}
          actionLabel="Create First Ticket"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <>
          <WidgetGrid columns="repeat(auto-fit, minmax(160px, 1fr))">
            <MetricCard label="Open Tickets" value={String(openCount)} change="Active" icon={Headphones} />
            <MetricCard label="High Priority" value={String(highPriority)} change="Needs attention" changeType={highPriority > 0 ? "negative" : "neutral"} icon={AlertTriangle} />
            <MetricCard label="Resolved" value={String(resolvedCount)} change="This period" changeType="positive" icon={CheckCircle} />
            <MetricCard label="Total" value={String(tickets.length)} change="All time" changeType="neutral" icon={MessageSquare} />
          </WidgetGrid>

          <div className="mt-6 flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..." className="pl-8 h-9 text-xs" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["all", "New", "Open", "In Progress", "Waiting on Client", "Escalated", "Resolved"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}>
                  {f === "all" ? "All" : f}
                </button>
              ))}
            </div>
          </div>

          <DataCard title={`Tickets (${filtered.length})`} className="mt-4">
            {filtered.map((t: any, i: number) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors border-b border-border last:border-0">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <Headphones className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.subject}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.category} · {new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <Badge className={`text-[10px] h-5 ${PRIORITY_STYLE[t.priority] || ""}`}>{t.priority}</Badge>
                <Badge className={`text-[10px] h-5 ${STATUS_STYLE[t.status] || ""}`}>{t.status}</Badge>
              </motion.div>
            ))}
          </DataCard>
        </>
      )}

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Support Ticket</SheetTitle>
            <SheetDescription>Describe the issue and we'll get right on it.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Describe the issue" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Provide details..." className="min-h-[100px]" />
            </div>
            <Button className="w-full gap-1.5" onClick={create} disabled={saving || !form.subject}>
              <Plus className="h-4 w-4" /> Create Ticket
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
