import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft, Wrench, RefreshCw, Plus, CheckCircle2, AlertTriangle,
  Clock, Users, CalendarDays, ChevronRight, Zap, Package
} from "lucide-react";
import { generateImplementationTasks, TASK_STATUS_OPTIONS, PRIORITY_OPTIONS, TASK_CATEGORIES } from "@/lib/implementationTaskGenerator";
import { useSetupProgress } from "@/hooks/useSetupProgress";

interface ClientInfo {
  id: string;
  business_name: string;
  service_package: string | null;
  payment_status: string;
  implementation_status: string;
  portal_access_enabled: boolean;
}

interface ImplTask {
  id: string;
  task_key: string;
  task_label: string;
  category: string;
  task_status: string;
  assigned_to: string | null;
  due_date: string | null;
  priority: string;
  blocked_by: string | null;
  internal_notes: string | null;
  source_profile: string | null;
  completed_at: string | null;
  created_at: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export default function AdminImplementationDetail() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [tasks, setTasks] = useState<ImplTask[]>([]);
  const [profileType, setProfileType] = useState<string>("—");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { progress: setupProgress } = useSetupProgress(clientId || null);

  const load = useCallback(async () => {
    if (!clientId) return;
    const [cRes, tRes, pRes, mRes] = await Promise.all([
      supabase.from("clients").select("id, business_name, service_package, payment_status, implementation_status, portal_access_enabled").eq("id", clientId).single(),
      supabase.from("implementation_tasks").select("*").eq("client_id", clientId).order("priority", { ascending: true }).order("category").order("created_at"),
      supabase.from("workspace_profiles").select("profile_type").eq("client_id", clientId).limit(1).single(),
      // Get admin/operator users for assignment
      supabase.from("workspace_users").select("id, user_id, full_name, email").in("role_preset", ["admin", "operator", "manager"]).limit(50),
    ]);
    if (cRes.data) setClient(cRes.data as any);
    setTasks((tRes.data || []) as any);
    setProfileType((pRes.data as any)?.profile_type || "—");
    setTeamMembers((mRes.data || []) as any);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    if (!clientId) return;
    setGenerating(true);
    const result = await generateImplementationTasks(clientId);
    toast.success(`Generated ${result.created} tasks (${result.skipped} already existed)`);
    setGenerating(false);
    load();
  };

  const updateTask = async (taskId: string, field: string, value: any) => {
    const updates: any = { [field]: value };
    // Auto-set completed_at when marking complete
    if (field === "task_status" && value === "complete") {
      updates.completed_at = new Date().toISOString();
    } else if (field === "task_status" && value !== "complete") {
      updates.completed_at = null;
    }

    await supabase.from("implementation_tasks").update(updates).eq("id", taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

    // Log status changes
    if (field === "task_status") {
      await supabase.from("audit_logs").insert({
        client_id: clientId!,
        action: `impl_task_${value}`,
        module: "implementation",
        metadata: { task_id: taskId, field, value } as any,
      });
    }

    // Auto-update client implementation_status based on task states
    if (field === "task_status") {
      const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, task_status: value } : t);
      const allComplete = updatedTasks.every(t => t.task_status === "complete" || t.task_status === "canceled");
      const anyInProgress = updatedTasks.some(t => ["in_progress", "in_review", "queued"].includes(t.task_status));
      const anyWaiting = updatedTasks.some(t => t.task_status === "waiting_on_client");

      let newImplStatus = client?.implementation_status;
      if (allComplete && updatedTasks.length > 0) newImplStatus = "complete";
      else if (anyWaiting && !anyInProgress) newImplStatus = "waiting_on_client";
      else if (anyInProgress) newImplStatus = "in_progress";

      if (newImplStatus && newImplStatus !== client?.implementation_status) {
        await supabase.from("clients").update({ implementation_status: newImplStatus } as any).eq("id", clientId!);
        setClient(prev => prev ? { ...prev, implementation_status: newImplStatus! } : prev);
        await supabase.from("audit_logs").insert({
          client_id: clientId!,
          action: `implementation_status_auto_${newImplStatus}`,
          module: "implementation",
          metadata: { triggered_by: "task_update" } as any,
        });
      }
    }
  };

  if (loading || !client) return <div className="text-white/40 text-center py-20">Loading…</div>;

  const isPaid = client.payment_status === "paid" || client.payment_status === "waived";
  const totalTasks = tasks.length;
  const completeTasks = tasks.filter(t => t.task_status === "complete").length;
  const blockedTasks = tasks.filter(t => t.task_status === "blocked").length;
  const waitingTasks = tasks.filter(t => t.task_status === "waiting_on_client").length;
  const activeTasks = tasks.filter(t => ["in_progress", "queued", "in_review"].includes(t.task_status)).length;
  const taskPct = totalTasks > 0 ? Math.round((completeTasks / totalTasks) * 100) : 0;

  const now = new Date();
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.task_status !== "complete" && t.task_status !== "canceled").length;

  // Group by category
  const categories = Object.keys(TASK_CATEGORIES);
  const grouped = categories
    .map(cat => ({ cat, label: TASK_CATEGORIES[cat], items: tasks.filter(t => t.category === cat) }))
    .filter(g => g.items.length > 0);

  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/implementation-queue")} className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="h-4 w-4 text-white/40" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{client.business_name}</h1>
          <p className="text-sm text-white/40">Implementation Workspace</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleGenerate} disabled={generating} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white gap-1.5 text-xs h-8">
            {generating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            {tasks.length === 0 ? "Generate Tasks" : "Re-check Tasks"}
          </Button>
          <Button size="sm" variant="outline" onClick={load} className="border-white/10 text-white hover:bg-white/10 gap-1.5 text-xs h-8">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* Client info bar */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-white/40">
        <span>Profile: <span className="text-white/70 capitalize">{profileType.replace(/_/g, " ")}</span></span>
        <span>Package: <span className="text-white/70">{client.service_package || "—"}</span></span>
        <span>Payment: <span className={isPaid ? "text-emerald-400" : "text-amber-400"}>{client.payment_status}</span></span>
        <span>Impl: <span className="text-white/70 capitalize">{client.implementation_status.replace(/_/g, " ")}</span></span>
      </div>

      {/* Payment gate */}
      {!isPaid && (
        <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "hsla(38,92%,50%,.06)", border: "1px solid hsla(38,92%,50%,.15)" }}>
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">Payment not confirmed — implementation actions are flagged.</p>
        </div>
      )}

      {/* Progress summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Total Tasks", value: totalTasks, color: "hsl(var(--nl-sky))" },
          { label: "Active", value: activeTasks, color: "hsl(211, 96%, 60%)" },
          { label: "Complete", value: completeTasks, color: "hsl(152, 60%, 44%)" },
          { label: "Waiting", value: waitingTasks, color: "hsl(38, 92%, 50%)" },
          { label: "Blocked", value: blockedTasks, color: "hsl(0, 70%, 60%)" },
          { label: "Overdue", value: overdueTasks, color: "hsl(0, 70%, 50%)" },
          { label: "Setup %", value: `${setupProgress.percentage}%`, color: "hsl(var(--nl-sky))" },
        ].map(s => (
          <Card key={s.label} className="border-0 bg-white/[0.04]">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] text-white/40 uppercase tracking-wider">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Task progress bar */}
      <div>
        <div className="flex justify-between text-xs text-white/40 mb-1.5">
          <span>Implementation Progress</span>
          <span className="text-[hsl(var(--nl-sky))] font-bold">{taskPct}%</span>
        </div>
        <Progress value={taskPct} className="h-2" />
      </div>

      {/* Empty state */}
      {tasks.length === 0 && (
        <Card className="border-0 bg-white/[0.04]">
          <CardContent className="p-8 text-center">
            <Wrench className="h-8 w-8 text-white/20 mx-auto mb-3" />
            <p className="text-white/50 text-sm mb-3">No implementation tasks yet</p>
            <Button onClick={handleGenerate} disabled={generating} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white gap-1.5">
              <Zap className="h-4 w-4" /> Generate Tasks from Profile
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tasks by category */}
      {grouped.map(group => (
        <Card key={group.cat} className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              {group.label} ({group.items.filter(t => t.task_status === "complete").length}/{group.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {group.items
              .sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2))
              .map(task => {
                const statusOpt = TASK_STATUS_OPTIONS.find(o => o.value === task.task_status);
                const prioOpt = PRIORITY_OPTIONS.find(o => o.value === task.priority);
                const isOverdue = task.due_date && new Date(task.due_date) < now && task.task_status !== "complete" && task.task_status !== "canceled";
                const isComplete = task.task_status === "complete";

                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border transition-colors ${isComplete ? "opacity-60" : ""}`}
                    style={{
                      borderColor: isOverdue ? "hsla(0,70%,50%,.2)" : task.task_status === "blocked" ? "hsla(0,70%,60%,.15)" : "hsla(211,96%,60%,.06)",
                      background: isOverdue ? "hsla(0,70%,50%,.04)" : "hsla(211,96%,60%,.02)",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-xs font-medium ${isComplete ? "line-through text-white/40" : "text-white"}`}>{task.task_label}</p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${prioOpt?.color || "text-white/30"} bg-white/5`}>{task.priority}</span>
                          {isOverdue && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">overdue</span>}
                        </div>
                        {task.blocked_by && (
                          <p className="text-[10px] text-red-400 mb-1">⚠ Blocked: {task.blocked_by}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status select */}
                        <select
                          value={task.task_status}
                          onChange={e => updateTask(task.id, "task_status", e.target.value)}
                          className="text-[10px] rounded-md px-2 py-1 bg-white/[0.06] border border-white/10 text-white"
                          style={{ color: statusOpt?.color?.replace("text-", "") }}
                        >
                          {TASK_STATUS_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>

                        {/* Priority select */}
                        <select
                          value={task.priority}
                          onChange={e => updateTask(task.id, "priority", e.target.value)}
                          className="text-[10px] rounded-md px-2 py-1 bg-white/[0.06] border border-white/10 text-white w-20"
                        >
                          {PRIORITY_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Assignment row */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {/* Assign to */}
                      <select
                        value={task.assigned_to || ""}
                        onChange={e => updateTask(task.id, "assigned_to", e.target.value || null)}
                        className="text-[10px] rounded-md px-2 py-1 bg-white/[0.04] border border-white/[0.06] text-white/60 flex-1 min-w-[120px] max-w-[200px]"
                      >
                        <option value="">Unassigned</option>
                        {teamMembers.map(m => (
                          <option key={m.id} value={m.user_id}>{m.full_name || m.email || m.user_id.slice(0, 8)}</option>
                        ))}
                      </select>

                      {/* Due date */}
                      <input
                        type="date"
                        value={task.due_date || ""}
                        onChange={e => updateTask(task.id, "due_date", e.target.value || null)}
                        className="text-[10px] rounded-md px-2 py-1 bg-white/[0.04] border border-white/[0.06] text-white/60"
                      />

                      {/* Blocker input */}
                      <Input
                        placeholder="Blocked by…"
                        defaultValue={task.blocked_by || ""}
                        onBlur={e => {
                          if (e.target.value !== (task.blocked_by || "")) updateTask(task.id, "blocked_by", e.target.value || null);
                        }}
                        className="text-[10px] h-6 bg-white/[0.03] border-white/[0.05] text-white/40 placeholder:text-white/15 flex-1 min-w-[100px]"
                      />
                    </div>

                    {/* Notes */}
                    <Input
                      placeholder="Internal notes…"
                      defaultValue={task.internal_notes || ""}
                      onBlur={e => {
                        if (e.target.value !== (task.internal_notes || "")) updateTask(task.id, "internal_notes", e.target.value);
                      }}
                      className="text-[10px] h-6 bg-white/[0.03] border-white/[0.05] text-white/30 placeholder:text-white/10 mt-1.5"
                    />
                  </div>
                );
              })}
          </CardContent>
        </Card>
      ))}

      {/* Quick nav */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => navigate(`/admin/clients/${clientId}/close`)} variant="outline" className="border-white/10 text-white hover:bg-white/10 gap-1.5 text-xs">
          <Package className="h-3.5 w-3.5" /> Close Center
        </Button>
        <Button onClick={() => navigate(`/admin/clients/${clientId}/lifecycle`)} variant="outline" className="border-white/10 text-white hover:bg-white/10 gap-1.5 text-xs">
          <Wrench className="h-3.5 w-3.5" /> Setup Center
        </Button>
        <Button onClick={() => navigate(`/admin/clients/${clientId}/activate`)} variant="outline" className="border-white/10 text-white hover:bg-white/10 gap-1.5 text-xs">
          <Zap className="h-3.5 w-3.5" /> Master Activation
        </Button>
      </div>
    </div>
  );
}
