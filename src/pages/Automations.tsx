import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { SetupBanner } from "@/components/SetupBanner";
import { MetricCard } from "@/components/MetricCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { DataCard } from "@/components/DataCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Workflow, Plus, Play, Pause, ArrowRight, Zap, Mail, MessageSquare,
  CheckSquare, GitBranch, Bell, Trash2, Star, Users, Search, Clock,
  RotateCcw, AlertTriangle, Activity
} from "lucide-react";
import { motion } from "framer-motion";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LockBadge } from "@/components/LockedFeature";
import { useLockContext } from "@/hooks/useLockContext";

const TRIGGER_OPTIONS = [
  "form_submitted", "new_lead", "pipeline_stage_changed", "appointment_completed",
  "appointment_cancelled", "appointment_no_show", "review_feedback_received",
  "task_completed", "deal_won", "deal_lost", "customer_inactive",
  "timesheet_submitted", "payroll_approval_needed",
];
const ACTION_OPTIONS = [
  "send_sms", "send_email", "assign_task", "move_pipeline_stage",
  "send_review_request", "notify_team", "create_notification",
  "update_contact_status", "create_follow_up_task", "log_activity",
];

const TRIGGER_LABELS: Record<string, string> = {
  form_submitted: "Form Submitted", new_lead: "New Lead Created",
  pipeline_stage_changed: "Pipeline Stage Changed", appointment_completed: "Appointment Completed",
  appointment_cancelled: "Appointment Cancelled", appointment_no_show: "No-Show Detected",
  review_feedback_received: "Review Feedback Received", task_completed: "Task Completed",
  deal_won: "Deal Won", deal_lost: "Deal Lost", customer_inactive: "Customer Inactive",
  timesheet_submitted: "Timesheet Submitted", payroll_approval_needed: "Payroll Needs Approval",
};

const ACTION_LABELS: Record<string, string> = {
  send_sms: "Send SMS", send_email: "Send Email", assign_task: "Assign Task",
  move_pipeline_stage: "Move Pipeline Stage", send_review_request: "Send Review Request",
  notify_team: "Notify Team", create_notification: "Create Notification",
  update_contact_status: "Update Contact Status", create_follow_up_task: "Create Follow-up Task",
  log_activity: "Log Activity",
};

const TRIGGER_ICONS: Record<string, typeof Zap> = {
  form_submitted: Zap, new_lead: Users, pipeline_stage_changed: GitBranch,
  appointment_completed: CheckSquare, appointment_cancelled: AlertTriangle,
  appointment_no_show: AlertTriangle, review_feedback_received: Star,
  task_completed: CheckSquare, deal_won: Zap, deal_lost: AlertTriangle,
  customer_inactive: RotateCcw, timesheet_submitted: Clock, payroll_approval_needed: Bell,
};

const statusColor = (enabled: boolean) =>
  enabled ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border";

interface Automation {
  id: string; client_id: string; name: string; trigger_event: string;
  action_type: string; action_config: any; enabled: boolean;
  created_at: string; updated_at: string;
}

interface AutomationRun {
  id: string; automation_id: string; client_id: string; status: string;
  started_at: string; completed_at: string | null; error: string | null; result: any;
}

export default function Automations() {
  const { activeClientId } = useWorkspace();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("workflows");

  // Builder
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", trigger_event: "form_submitted", action_type: "send_email", action_config: "{}" });

  const fetchData = useCallback(async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [aRes, rRes] = await Promise.all([
      supabase.from("automations").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("automation_runs").select("*").eq("client_id", activeClientId).order("started_at", { ascending: false }).limit(200),
    ]);
    setAutomations((aRes.data as any) || []);
    setRuns((rRes.data as any) || []);
    setLoading(false);
  }, [activeClientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openBuilder = (a?: Automation) => {
    if (a) {
      setEditingId(a.id);
      setForm({ name: a.name, trigger_event: a.trigger_event, action_type: a.action_type, action_config: JSON.stringify(a.action_config || {}) });
    } else {
      setEditingId(null);
      setForm({ name: "", trigger_event: "form_submitted", action_type: "send_email", action_config: "{}" });
    }
    setBuilderOpen(true);
  };

  const saveAutomation = async () => {
    if (!activeClientId || !form.name) return;
    let config: any = {};
    try { config = JSON.parse(form.action_config || "{}"); } catch { /* ignore */ }

    if (editingId) {
      const { error } = await supabase.from("automations").update({
        name: form.name, trigger_event: form.trigger_event,
        action_type: form.action_type, action_config: config,
      }).eq("id", editingId);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Automation updated" });
    } else {
      const { error } = await supabase.from("automations").insert({
        client_id: activeClientId, name: form.name, trigger_event: form.trigger_event,
        action_type: form.action_type, action_config: config, enabled: true,
      });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Automation created" });
    }
    setBuilderOpen(false);
    fetchData();
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    await supabase.from("automations").update({ enabled: !enabled }).eq("id", id);
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled: !enabled } : a));
    toast({ title: enabled ? "Automation paused" : "Automation activated" });
  };

  const deleteAutomation = async (id: string) => {
    await supabase.from("automations").delete().eq("id", id);
    toast({ title: "Automation deleted" });
    fetchData();
  };

  const activeCount = automations.filter(a => a.enabled).length;
  const totalRuns = runs.length;
  const failedRuns = runs.filter(r => r.status === "failed").length;
  const filtered = automations.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()));
  const hasData = automations.length > 0;

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Automations" description="Build workflows to automate marketing tasks" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6"><p className="text-muted-foreground">Select a workspace to view automations.</p></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Automations" description="Build workflows to automate marketing tasks">
        <Button className="gap-1.5" onClick={() => openBuilder()}>
          <Plus className="h-4 w-4" /> New Workflow
        </Button>
      </PageHeader>

      <ModuleHelpPanel
        moduleName="Automations"
        description="Create event-driven workflows that trigger actions automatically — like sending follow-up emails when a lead is created, requesting reviews after appointments, or notifying your team when a deal closes. Automations reduce manual work and ensure nothing falls through the cracks."
        tips={[
          "Each automation has one trigger event and one action",
          "Toggle automations on/off without deleting them",
          "Run history shows every execution with success/failure status",
          "Automations integrate with CRM, Calendar, Reviews, and Notifications",
        ]}
      />

      {!hasData && (
        <SetupBanner
          icon={Workflow}
          title="Create Your First Automation"
          description="Automate lead follow-ups, review requests, appointment reminders, and more. Click 'New Workflow' to get started."
          actionLabel="New Workflow"
          onAction={() => openBuilder()}
        />
      )}

      <WidgetGrid columns="repeat(auto-fit, minmax(180px, 1fr))">
        <MetricCard label="Workflows" value={String(automations.length)} change={`${activeCount} active`} changeType="positive" icon={Workflow} />
        <MetricCard label="Total Runs" value={String(totalRuns)} change="All time" changeType="positive" icon={Play} />
        <MetricCard label="Active" value={String(activeCount)} change="" icon={Zap} />
        <MetricCard label="Failed Runs" value={String(failedRuns)} change={failedRuns > 0 ? "Needs attention" : "All clear"} changeType={failedRuns > 0 ? "negative" : "positive"} icon={AlertTriangle} />
      </WidgetGrid>

      <div className="flex items-center gap-3 mt-6 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search automations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card border border-border h-auto gap-1 p-1">
          <TabsTrigger value="workflows" className="text-xs">Workflows</TabsTrigger>
          <TabsTrigger value="runs" className="text-xs">Run History</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <DataCard title="Workflows">
              <div className="py-12 text-center">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <Workflow className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No automations yet</p>
                <p className="text-xs text-muted-foreground">Create your first workflow to automate tasks.</p>
              </div>
            </DataCard>
          ) : (
            filtered.map((a, i) => {
              const TrigIcon = TRIGGER_ICONS[a.trigger_event] || Zap;
              const runCount = runs.filter(r => r.automation_id === a.id).length;
              const lastRun = runs.find(r => r.automation_id === a.id);
              return (
                <motion.div
                  key={a.id}
                  className="card-widget p-5 rounded-2xl"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-primary/10 mt-0.5">
                        <TrigIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{a.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{runCount} runs</span>
                          {lastRun && <span>Last: {new Date(lastRun.started_at).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={a.enabled} onCheckedChange={() => toggleEnabled(a.id, a.enabled)} />
                      <Badge variant="outline" className={statusColor(a.enabled)}>
                        {a.enabled ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  </div>

                  {/* Flow visualization */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <div className="rounded-xl border px-3 py-2 bg-blue-50 border-blue-200 text-blue-700 shrink-0">
                      <p className="text-[11px] font-semibold">{TRIGGER_LABELS[a.trigger_event] || a.trigger_event}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="rounded-xl border px-3 py-2 bg-emerald-50 border-emerald-200 text-emerald-700 shrink-0">
                      <p className="text-[11px] font-semibold">{ACTION_LABELS[a.action_type] || a.action_type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => openBuilder(a)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs gap-1 text-destructive hover:text-destructive" onClick={() => deleteAutomation(a.id)}>
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  </div>
                </motion.div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="runs" className="mt-4">
          <DataCard title="Run History">
            {runs.length === 0 ? (
              <div className="py-12 text-center">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <Activity className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No runs yet</p>
                <p className="text-xs text-muted-foreground">Automation runs will appear here when workflows are triggered.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Automation</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Started</TableHead>
                      <TableHead className="text-xs">Completed</TableHead>
                      <TableHead className="text-xs">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.slice(0, 50).map(r => {
                      const auto = automations.find(a => a.id === r.automation_id);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs font-medium">{auto?.name || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              r.status === "completed" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                              r.status === "failed" ? "bg-red-500/15 text-red-400 border-red-500/30" :
                              "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            }>{r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(r.started_at).toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.completed_at ? new Date(r.completed_at).toLocaleString() : "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.error || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </DataCard>
        </TabsContent>
      </Tabs>

      {/* Builder Sheet */}
      <Sheet open={builderOpen} onOpenChange={setBuilderOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit Automation" : "New Automation"}</SheetTitle>
            <SheetDescription>Configure trigger and action for this workflow</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            <div>
              <Label className="text-xs">Workflow Name</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. New Lead Follow-up" className="mt-1" />
            </div>

            <div>
              <Label className="text-xs">Trigger Event</Label>
              <Select value={form.trigger_event} onValueChange={v => setForm(p => ({ ...p, trigger_event: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map(t => (
                    <SelectItem key={t} value={t}>{TRIGGER_LABELS[t] || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Action</Label>
              <Select value={form.action_type} onValueChange={v => setForm(p => ({ ...p, action_type: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map(a => (
                    <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Action Config (JSON)</Label>
              <Textarea value={form.action_config} onChange={e => setForm(p => ({ ...p, action_config: e.target.value }))} rows={3} placeholder='{"template": "welcome"}' className="mt-1 font-mono text-xs" />
            </div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setBuilderOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={saveAutomation}>{editingId ? "Update" : "Create"} Workflow</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
