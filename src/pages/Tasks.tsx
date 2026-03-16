import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  CheckSquare, Clock, User, AlertTriangle, Plus, Search,
  Calendar, ArrowRight, MoreHorizontal, Trash2, Check
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-blue-50 text-blue-700",
  in_progress: "bg-cyan-50 text-cyan-700",
  waiting: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
  completed: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  open: "To Do",
  in_progress: "In Progress",
  waiting: "Waiting",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
  overdue: "Overdue",
};

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-red-50 text-red-600",
  medium: "bg-amber-50 text-amber-600",
  low: "bg-secondary text-muted-foreground",
};

const STATUSES = ["open", "in_progress", "waiting", "approved", "rejected", "completed"];
const PRIORITIES = ["high", "medium", "low"];

export default function Tasks() {
  const { activeClientId, user } = useWorkspace();
  const [tasks, setTasks] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [newTask, setNewTask] = useState({
    title: "", description: "", due_date: "", priority: "medium", status: "open",
    related_type: "", related_id: "",
  });

  const fetchData = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [tRes, cRes] = await Promise.all([
      supabase.from("crm_tasks").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("crm_contacts").select("id, full_name").eq("client_id", activeClientId).limit(200),
    ]);
    setTasks(tRes.data || []);
    setContacts(cRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeClientId]);

  const createTask = async () => {
    if (!activeClientId || !newTask.title.trim()) return;
    const { error } = await supabase.from("crm_tasks").insert({
      client_id: activeClientId,
      title: newTask.title.trim(),
      description: newTask.description || null,
      due_date: newTask.due_date || null,
      priority: newTask.priority,
      status: newTask.status,
      related_type: newTask.related_type || null,
      related_id: newTask.related_id || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("crm_activities").insert({
      client_id: activeClientId, activity_type: "task_created",
      activity_note: `Task "${newTask.title}" created`,
    });
    toast({ title: "Task created" });
    setNewTask({ title: "", description: "", due_date: "", priority: "medium", status: "open", related_type: "", related_id: "" });
    setCreateOpen(false);
    fetchData();
  };

  const updateStatus = async (taskId: string, status: string) => {
    await supabase.from("crm_tasks").update({ status }).eq("id", taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    if (status === "completed") {
      await supabase.from("crm_activities").insert({
        client_id: activeClientId, activity_type: "task_completed",
        activity_note: `Task completed`, related_type: "task", related_id: taskId,
      });
    }
    toast({ title: `Task ${STATUS_LABEL[status] || status}` });
  };

  const deleteTask = async (taskId: string) => {
    await supabase.from("crm_tasks").delete().eq("id", taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setDetailTask(null);
    toast({ title: "Task deleted" });
  };

  // Filters
  const q = search.toLowerCase();
  const filtered = tasks.filter(t => {
    const matchSearch = !q || t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const openTasks = tasks.filter(t => !["completed", "approved", "rejected"].includes(t.status));
  const completedTasks = tasks.filter(t => t.status === "completed");
  const highPriority = tasks.filter(t => t.priority === "high" && t.status !== "completed");
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed");

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Tasks" description="Manage and track tasks across the platform" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6"><p className="text-muted-foreground">Select a workspace to view tasks.</p></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Tasks" description="Manage and track tasks across the platform">
        <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </PageHeader>

      <ModuleHelpPanel
        moduleName="Tasks"
        description="Tasks are created automatically from platform events (appointments, deals, reviews) or manually. They can be linked to CRM contacts, deals, and appointments for full visibility."
        tips={[
          "Tasks are auto-created for no-shows, negative reviews, and deal follow-ups",
          "Link tasks to contacts or deals for cross-module tracking",
          "Overdue tasks are flagged automatically",
        ]}
      />

      {tasks.length === 0 && !loading && (
        <SetupBanner
          icon={CheckSquare}
          title="Create Your First Task"
          description="Add tasks to track follow-ups, approvals, and action items across the platform."
          actionLabel="Create Task"
          onAction={() => setCreateOpen(true)}
        />
      )}

      <WidgetGrid columns="repeat(auto-fit, minmax(160px, 1fr))">
        <MetricCard label="Open Tasks" value={String(openTasks.length)} change={`${overdueTasks.length} overdue`} changeType={overdueTasks.length > 0 ? "negative" : "neutral"} icon={CheckSquare} />
        <MetricCard label="Completed" value={String(completedTasks.length)} change="All time" changeType="positive" icon={Check} />
        <MetricCard label="High Priority" value={String(highPriority.length)} change="Open" changeType={highPriority.length > 0 ? "negative" : "neutral"} icon={AlertTriangle} />
        <MetricCard label="Overdue" value={String(overdueTasks.length)} change="Needs attention" changeType={overdueTasks.length > 0 ? "negative" : "neutral"} icon={Clock} />
      </WidgetGrid>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="pl-8 h-9 text-xs" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[130px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-9 w-[120px] text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      <DataCard title={`Tasks (${filtered.length})`} className="mt-4">
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No tasks match your filters</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((t, i) => {
              const isCompleted = t.status === "completed";
              const isOverdue = t.due_date && new Date(t.due_date) < new Date() && !isCompleted;
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-secondary/50 cursor-pointer ${isCompleted ? "opacity-60" : ""}`}
                  onClick={() => setDetailTask(t)}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); updateStatus(t.id, isCompleted ? "open" : "completed"); }}
                    className={`shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      isCompleted ? "bg-primary border-primary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    {isCompleted && <Check className="h-3 w-3 text-primary-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {t.due_date && (
                        <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          <Calendar className="h-2.5 w-2.5" />
                          {new Date(t.due_date).toLocaleDateString()}
                          {isOverdue && " (overdue)"}
                        </span>
                      )}
                      {t.related_type && (
                        <span className="text-[10px] text-muted-foreground">• {t.related_type}</span>
                      )}
                    </div>
                  </div>
                  <Badge className={`text-[10px] h-5 ${PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.low}`}>{t.priority}</Badge>
                  <Badge className={`text-[10px] h-5 ${STATUS_STYLE[isOverdue ? "overdue" : t.status] || STATUS_STYLE.open}`}>
                    {isOverdue ? "Overdue" : STATUS_LABEL[t.status] || t.status}
                  </Badge>
                </motion.div>
              );
            })}
          </div>
        )}
      </DataCard>

      {/* Create Task Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Task</SheetTitle>
            <SheetDescription>Add a new task to track follow-ups, approvals, or action items.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="Task title" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={newTask.description} onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))} placeholder="Details..." className="min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={newTask.due_date} onChange={e => setNewTask(p => ({ ...p, due_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={v => setNewTask(p => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newTask.status} onValueChange={v => setNewTask(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Linked Module</Label>
              <Select value={newTask.related_type} onValueChange={v => setNewTask(p => ({ ...p, related_type: v }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="deal">Deal</SelectItem>
                  <SelectItem value="calendar_event">Appointment</SelectItem>
                  <SelectItem value="review_request">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="flex-1 gap-1.5" onClick={createTask} disabled={!newTask.title.trim()}>
                <Plus className="h-4 w-4" /> Create
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail Sheet */}
      <Sheet open={!!detailTask} onOpenChange={v => !v && setDetailTask(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detailTask && (
            <>
              <SheetHeader>
                <SheetTitle>{detailTask.title}</SheetTitle>
                <SheetDescription>Created {new Date(detailTask.created_at).toLocaleDateString()}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {detailTask.description && (
                  <div>
                    <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Description</Label>
                    <p className="text-sm text-foreground mt-1">{detailTask.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Status</Label>
                    <Select value={detailTask.status} onValueChange={v => { updateStatus(detailTask.id, v); setDetailTask((p: any) => ({ ...p, status: v })); }}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Priority</Label>
                    <Badge className={`mt-2 ${PRIORITY_STYLE[detailTask.priority] || ""}`}>{detailTask.priority}</Badge>
                  </div>
                </div>
                {detailTask.due_date && (
                  <div>
                    <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Due Date</Label>
                    <p className="text-sm mt-1 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {new Date(detailTask.due_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {detailTask.related_type && (
                  <div>
                    <Label className="text-muted-foreground text-[10px] uppercase tracking-wider">Linked To</Label>
                    <p className="text-sm mt-1 capitalize">{detailTask.related_type}</p>
                  </div>
                )}
                <div className="pt-2 border-t border-border">
                  <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => deleteTask(detailTask.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete Task
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}