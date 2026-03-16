import { useState, useEffect, useCallback, useMemo } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Users, Clock, Plus, Play, Square, FileText, Search,
  CheckCircle, XCircle, AlertCircle, Timer, Briefcase, CalendarDays,
  Eye, Lock, MessageSquare, Send, ShieldCheck, ClipboardList
} from "lucide-react";

// ---------- types ----------
interface Worker {
  id: string; client_id: string; worker_type: string; first_name: string; last_name: string;
  full_name: string; email: string | null; phone: string | null; role_title: string | null;
  department: string | null; status: string; pay_type: string; hourly_rate: number | null;
  salary_amount: number | null; commission_rate: number | null; bonus_eligible: boolean;
  overtime_eligible: boolean; payroll_frequency: string | null; start_date: string | null;
  end_date: string | null; payout_method: string | null; default_cost_center: string | null;
  created_at: string; updated_at: string;
}

interface TimeEntry {
  id: string; client_id: string; worker_id: string; entry_date: string;
  start_time: string | null; end_time: string | null; break_minutes: number;
  total_minutes: number; total_hours: number; entry_method: string; entry_status: string;
  note_summary: string | null; detailed_notes: string | null; linked_module: string | null;
  labor_category: string | null; billable_status: string | null;
  linked_task_id: string | null; linked_contact_id: string | null;
  linked_company_id: string | null; linked_deal_id: string | null;
  linked_appointment_id: string | null; timesheet_id: string | null; created_at: string;
}

interface Timesheet {
  id: string; client_id: string; worker_id: string;
  pay_period_start: string; pay_period_end: string;
  total_hours: number; total_overtime_hours: number;
  total_billable_hours: number; total_nonbillable_hours: number;
  total_notes_count: number; status: string;
  submitted_at: string | null; approved_at: string | null; approved_by: string | null;
  rejected_at: string | null; rejection_reason: string | null;
  approval_comment: string | null; locked_at: string | null;
  created_at: string; updated_at: string;
}

// ---------- constants ----------
const WORKER_TYPES = ["Employee", "Contractor", "Freelancer", "Manager", "Admin Staff", "Service Provider"];
const PAY_TYPES = ["Hourly", "Salary", "Commission", "Salary + Commission", "Flat Rate", "Hourly + Bonus", "Contractor Hourly", "Contractor Fixed"];
const MODULES = ["Calendar", "CRM", "Reviews", "Ads", "Social", "SEO", "Website", "Finance", "Admin", "Operations"];
const LABOR_CATEGORIES = ["Appointment Delivery", "Sales", "Admin", "Client Support", "Content Creation", "Website Work", "SEO Work", "Ad Management", "Review Recovery", "Internal Ops"];
const PAY_FREQUENCIES = ["Weekly", "Biweekly", "Semimonthly", "Monthly"];

const statusColor = (s: string) => {
  switch (s?.toLowerCase()) {
    case "active": case "approved": case "paid": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "inactive": case "terminated": case "rejected": return "bg-red-500/15 text-red-400 border-red-500/30";
    case "on leave": case "open": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "draft": return "bg-muted text-muted-foreground border-border";
    case "submitted": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "locked": return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString() : "—";
const fmtTime = (d: string | null) => d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

function getPayPeriodBounds(freq: string, refDate: Date = new Date()): { start: Date; end: Date } {
  const y = refDate.getFullYear(), m = refDate.getMonth(), d = refDate.getDate();
  const dow = refDate.getDay();
  switch (freq) {
    case "Weekly": {
      const s = new Date(y, m, d - dow);
      return { start: s, end: new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6) };
    }
    case "Biweekly": {
      const epoch = new Date(2024, 0, 1);
      const diff = Math.floor((refDate.getTime() - epoch.getTime()) / (14 * 86400000));
      const s = new Date(epoch.getTime() + diff * 14 * 86400000);
      return { start: s, end: new Date(s.getFullYear(), s.getMonth(), s.getDate() + 13) };
    }
    case "Semimonthly":
      return d <= 15
        ? { start: new Date(y, m, 1), end: new Date(y, m, 15) }
        : { start: new Date(y, m, 16), end: new Date(y, m + 1, 0) };
    case "Monthly": default:
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) };
  }
}

function dateStr(d: Date) { return d.toISOString().split("T")[0]; }

export default function Workforce() {
  const { activeClientId, user } = useWorkspace();
  const [tab, setTab] = useState("directory");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // dialog states
  const [addWorkerOpen, setAddWorkerOpen] = useState(false);
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [clockedIn, setClockedIn] = useState<string | null>(null);
  const [viewTimesheetId, setViewTimesheetId] = useState<string | null>(null);
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvalComment, setApprovalComment] = useState("");

  // forms
  const [wf, setWf] = useState({ first_name: "", last_name: "", email: "", phone: "", role_title: "", department: "", worker_type: "Employee", pay_type: "Hourly", hourly_rate: "", salary_amount: "", payroll_frequency: "Biweekly" });
  const [tf, setTf] = useState({ worker_id: "", entry_date: new Date().toISOString().split("T")[0], start_time: "09:00", end_time: "17:00", break_minutes: "0", note_summary: "", detailed_notes: "", linked_module: "", labor_category: "", entry_method: "Manual Entry" });

  const fetchData = useCallback(async () => {
    if (!activeClientId) return;
    setLoading(true);
    const [wRes, eRes, tRes] = await Promise.all([
      supabase.from("workers").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("time_entries").select("*").eq("client_id", activeClientId).order("entry_date", { ascending: false }).limit(500),
      supabase.from("timesheets").select("*").eq("client_id", activeClientId).order("pay_period_start", { ascending: false }).limit(200),
    ]);
    if (wRes.data) setWorkers(wRes.data as any);
    if (eRes.data) setEntries(eRes.data as any);
    if (tRes.data) setTimesheets(tRes.data as any);
    const activeEntry = (eRes.data as any[])?.find((e: any) => e.entry_method === "Clock In/Out" && e.entry_status === "Draft" && !e.end_time);
    setClockedIn(activeEntry?.id ?? null);
    setLoading(false);
  }, [activeClientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const workerMap = useMemo(() => Object.fromEntries(workers.map(w => [w.id, w])), [workers]);
  const filteredWorkers = useMemo(() => workers.filter(w => !search || w.full_name?.toLowerCase().includes(search.toLowerCase()) || w.email?.toLowerCase().includes(search.toLowerCase())), [workers, search]);
  const filteredEntries = useMemo(() => entries.filter(e => !search || workerMap[e.worker_id]?.full_name?.toLowerCase().includes(search.toLowerCase()) || e.note_summary?.toLowerCase().includes(search.toLowerCase())), [entries, search, workerMap]);

  // stats
  const totalWorkers = workers.filter(w => w.status === "Active").length;
  const totalHoursToday = entries.filter(e => e.entry_date === new Date().toISOString().split("T")[0]).reduce((s, e) => s + (e.total_minutes || 0), 0) / 60;
  const pendingTimesheets = timesheets.filter(t => t.status === "Submitted").length;
  const draftEntries = entries.filter(e => e.entry_status === "Draft").length;

  // ---------- audit helper ----------
  const logAudit = async (action: string, meta?: any) => {
    await supabase.from("audit_logs").insert({ client_id: activeClientId, user_id: user?.id, action, module: "Workforce", metadata: meta || {} } as any);
  };
  const logActivity = async (type: string, note: string) => {
    await supabase.from("crm_activities").insert({ client_id: activeClientId, activity_type: type, activity_note: note } as any);
  };

  // ---------- WORKER CRUD ----------
  const addWorker = async () => {
    if (!activeClientId || !wf.first_name || !wf.last_name) return;
    const { error } = await supabase.from("workers").insert({
      client_id: activeClientId, first_name: wf.first_name, last_name: wf.last_name,
      email: wf.email || null, phone: wf.phone || null, role_title: wf.role_title || null,
      department: wf.department || null, worker_type: wf.worker_type, pay_type: wf.pay_type,
      hourly_rate: wf.hourly_rate ? Number(wf.hourly_rate) : 0,
      salary_amount: wf.salary_amount ? Number(wf.salary_amount) : 0,
      payroll_frequency: wf.payroll_frequency,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Worker added" });
    setAddWorkerOpen(false);
    setWf({ first_name: "", last_name: "", email: "", phone: "", role_title: "", department: "", worker_type: "Employee", pay_type: "Hourly", hourly_rate: "", salary_amount: "", payroll_frequency: "Biweekly" });
    fetchData();
  };

  // ---------- CLOCK IN/OUT ----------
  const clockIn = async () => {
    if (!activeClientId || workers.length === 0) { toast({ title: "Add a worker first", variant: "destructive" }); return; }
    const workerId = workers[0].id;
    const now = new Date();
    const { data, error } = await supabase.from("time_entries").insert({
      client_id: activeClientId, worker_id: workerId, entry_date: now.toISOString().split("T")[0],
      start_time: now.toISOString(), entry_method: "Clock In/Out", entry_status: "Draft", total_minutes: 0,
    } as any).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setClockedIn((data as any).id);
    toast({ title: "Clocked in", description: fmtTime(now.toISOString()) });
    await logActivity("Clock In", `Worker clocked in at ${fmtTime(now.toISOString())}`);
    await logAudit("worker_clock_in", { worker_id: workerId });
    fetchData();
  };

  const clockOut = async () => {
    if (!clockedIn) return;
    const now = new Date();
    const entry = entries.find(e => e.id === clockedIn);
    const startMs = entry?.start_time ? new Date(entry.start_time).getTime() : now.getTime();
    const totalMin = Math.max(0, Math.round((now.getTime() - startMs) / 60000));
    const { error } = await supabase.from("time_entries").update({
      end_time: now.toISOString(), total_minutes: totalMin, entry_status: "Draft",
    } as any).eq("id", clockedIn);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setClockedIn(null);
    toast({ title: "Clocked out", description: `${(totalMin / 60).toFixed(1)} hours logged` });
    await logActivity("Clock Out", `Worker clocked out. ${(totalMin / 60).toFixed(1)}h logged.`);
    await logAudit("worker_clock_out", { entry_id: clockedIn, total_minutes: totalMin });
    fetchData();
  };

  // ---------- MANUAL TIME ENTRY ----------
  const addManualEntry = async () => {
    if (!activeClientId || !tf.worker_id || !tf.entry_date || !tf.start_time || !tf.end_time) {
      toast({ title: "Fill required fields", variant: "destructive" }); return;
    }
    const start = new Date(`${tf.entry_date}T${tf.start_time}`);
    const end = new Date(`${tf.entry_date}T${tf.end_time}`);
    if (end <= start) { toast({ title: "End time must be after start time", variant: "destructive" }); return; }
    const breakMin = Number(tf.break_minutes) || 0;
    const totalMin = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000) - breakMin);
    const { error } = await supabase.from("time_entries").insert({
      client_id: activeClientId, worker_id: tf.worker_id, entry_date: tf.entry_date,
      start_time: start.toISOString(), end_time: end.toISOString(), break_minutes: breakMin,
      total_minutes: totalMin, entry_method: tf.entry_method, entry_status: "Draft",
      note_summary: tf.note_summary || null, detailed_notes: tf.detailed_notes || null,
      linked_module: tf.linked_module || null, labor_category: tf.labor_category || null,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Time entry added" });
    setAddEntryOpen(false);
    setTf({ worker_id: "", entry_date: new Date().toISOString().split("T")[0], start_time: "09:00", end_time: "17:00", break_minutes: "0", note_summary: "", detailed_notes: "", linked_module: "", labor_category: "", entry_method: "Manual Entry" });
    await logActivity("Manual Time Entry", `Manual entry: ${(totalMin / 60).toFixed(1)}h on ${tf.entry_date}`);
    await logAudit("manual_time_entry", { worker_id: tf.worker_id, total_minutes: totalMin });
    fetchData();
  };

  // ---------- ENTRY ACTIONS ----------
  const submitEntry = async (id: string) => {
    await supabase.from("time_entries").update({ entry_status: "Submitted", submitted_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Entry submitted" }); fetchData();
  };
  const approveEntry = async (id: string) => {
    await supabase.from("time_entries").update({ entry_status: "Approved", approved_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Entry approved" }); fetchData();
  };
  const rejectEntry = async (id: string) => {
    await supabase.from("time_entries").update({ entry_status: "Rejected" } as any).eq("id", id);
    toast({ title: "Entry rejected" }); fetchData();
  };

  // ---------- TIMESHEET GENERATION ----------
  const generateTimesheet = async (workerId: string) => {
    if (!activeClientId) return;
    const worker = workerMap[workerId];
    const freq = worker?.payroll_frequency || "Biweekly";
    const { start, end } = getPayPeriodBounds(freq);
    const periodStart = dateStr(start), periodEnd = dateStr(end);

    // Check if timesheet already exists for this period
    const existing = timesheets.find(t => t.worker_id === workerId && t.pay_period_start === periodStart && t.pay_period_end === periodEnd);
    if (existing) { toast({ title: "Timesheet already exists for this period" }); return; }

    // Calculate totals from entries in this period
    const periodEntries = entries.filter(e =>
      e.worker_id === workerId && e.entry_date >= periodStart && e.entry_date <= periodEnd
    );
    const totalMin = periodEntries.reduce((s, e) => s + (e.total_minutes || 0), 0);
    const totalHrs = totalMin / 60;
    const overtimeHrs = worker?.overtime_eligible ? Math.max(0, totalHrs - 40) : 0;
    const billableHrs = periodEntries.filter(e => e.billable_status === "Billable").reduce((s, e) => s + (e.total_minutes || 0), 0) / 60;
    const notesCount = periodEntries.filter(e => e.note_summary || e.detailed_notes).length;

    const { data, error } = await supabase.from("timesheets").insert({
      client_id: activeClientId, worker_id: workerId,
      pay_period_start: periodStart, pay_period_end: periodEnd,
      total_hours: Math.round(totalHrs * 100) / 100,
      total_overtime_hours: Math.round(overtimeHrs * 100) / 100,
      total_billable_hours: Math.round(billableHrs * 100) / 100,
      total_nonbillable_hours: Math.round((totalHrs - billableHrs) * 100) / 100,
      total_notes_count: notesCount, status: "Open",
    } as any).select().single();

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    // Link entries to timesheet
    const entryIds = periodEntries.map(e => e.id);
    if (entryIds.length > 0 && data) {
      await supabase.from("time_entries").update({ timesheet_id: (data as any).id } as any).in("id", entryIds);
    }

    toast({ title: "Timesheet generated", description: `${periodStart} – ${periodEnd}` });
    await logAudit("timesheet_created", { worker_id: workerId, period: `${periodStart} – ${periodEnd}` });
    await logActivity("Timesheet Created", `Timesheet generated for ${worker?.full_name}: ${periodStart} – ${periodEnd}`);
    fetchData();
  };

  // ---------- TIMESHEET ACTIONS ----------
  const submitTimesheet = async (id: string) => {
    const ts = timesheets.find(t => t.id === id);
    await supabase.from("timesheets").update({ status: "Submitted", submitted_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Timesheet submitted for approval" });
    await logAudit("timesheet_submitted", { timesheet_id: id });
    await logActivity("Timesheet Submitted", `Timesheet submitted for ${workerMap[ts?.worker_id || ""]?.full_name || "worker"}`);
    fetchData();
  };

  const approveTimesheet = async (id: string) => {
    const ts = timesheets.find(t => t.id === id);
    await supabase.from("timesheets").update({
      status: "Approved", approved_at: new Date().toISOString(),
      approved_by: user?.id, approval_comment: approvalComment || null,
    } as any).eq("id", id);

    // Approve linked time entries
    const linked = entries.filter(e => e.timesheet_id === id);
    if (linked.length > 0) {
      await supabase.from("time_entries").update({ entry_status: "Approved", approved_at: new Date().toISOString() } as any).in("id", linked.map(e => e.id));
    }

    toast({ title: "Timesheet approved" });
    await logAudit("timesheet_approved", { timesheet_id: id, approver: user?.id, comment: approvalComment });
    await logActivity("Timesheet Approved", `Timesheet approved for ${workerMap[ts?.worker_id || ""]?.full_name || "worker"}`);
    setApprovalComment("");
    setViewTimesheetId(null);
    fetchData();
  };

  const rejectTimesheet = async () => {
    if (!rejectDialogId) return;
    const ts = timesheets.find(t => t.id === rejectDialogId);
    await supabase.from("timesheets").update({
      status: "Rejected", rejected_at: new Date().toISOString(), rejection_reason: rejectReason || null,
    } as any).eq("id", rejectDialogId);

    // Reopen linked entries for editing
    const linked = entries.filter(e => e.timesheet_id === rejectDialogId);
    if (linked.length > 0) {
      await supabase.from("time_entries").update({ entry_status: "Draft" } as any).in("id", linked.map(e => e.id));
    }

    toast({ title: "Timesheet rejected", description: rejectReason || undefined });
    await logAudit("timesheet_rejected", { timesheet_id: rejectDialogId, reason: rejectReason });
    await logActivity("Timesheet Rejected", `Timesheet rejected for ${workerMap[ts?.worker_id || ""]?.full_name || "worker"}: ${rejectReason || "No reason given"}`);
    setRejectDialogId(null);
    setRejectReason("");
    fetchData();
  };

  const lockTimesheet = async (id: string) => {
    await supabase.from("timesheets").update({ status: "Locked", locked_at: new Date().toISOString() } as any).eq("id", id);
    const linked = entries.filter(e => e.timesheet_id === id);
    if (linked.length > 0) {
      await supabase.from("time_entries").update({ entry_status: "Locked" } as any).in("id", linked.map(e => e.id));
    }
    toast({ title: "Timesheet locked" });
    await logAudit("timesheet_locked", { timesheet_id: id });
    fetchData();
  };

  // ---------- VIEWED TIMESHEET ----------
  const viewedTS = viewTimesheetId ? timesheets.find(t => t.id === viewTimesheetId) : null;
  const viewedTSEntries = viewedTS ? entries.filter(e => e.timesheet_id === viewedTS.id || (e.worker_id === viewedTS.worker_id && e.entry_date >= viewedTS.pay_period_start && e.entry_date <= viewedTS.pay_period_end)) : [];

  if (!activeClientId) {
    return (
      <div className="p-6">
        <PageHeader title="Workforce" description="Select a workspace to manage your workforce." />
        <Card className="mt-6 border-dashed"><CardContent className="py-12 text-center text-muted-foreground">No workspace selected.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Workforce" description="Team directory, time tracking, timesheets, and approvals." />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{totalWorkers}</p><p className="text-xs text-muted-foreground">Active Workers</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Timer className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{totalHoursToday.toFixed(1)}h</p><p className="text-xs text-muted-foreground">Hours Today</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><ClipboardList className="h-5 w-5 text-amber-500" /></div>
          <div><p className="text-2xl font-bold">{pendingTimesheets}</p><p className="text-xs text-muted-foreground">Pending Timesheets</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center"><FileText className="h-5 w-5 text-muted-foreground" /></div>
          <div><p className="text-2xl font-bold">{draftEntries}</p><p className="text-xs text-muted-foreground">Draft Entries</p></div>
        </CardContent></Card>
      </div>

      {/* Clock In/Out Bar */}
      <Card className="border-primary/20">
        <CardContent className="py-3 flex flex-wrap items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Quick Clock</span>
          {clockedIn ? (
            <Button size="sm" variant="destructive" onClick={clockOut} className="gap-1.5"><Square className="h-3.5 w-3.5" /> Clock Out</Button>
          ) : (
            <Button size="sm" onClick={clockIn} className="gap-1.5"><Play className="h-3.5 w-3.5" /> Clock In</Button>
          )}
          {clockedIn && <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 animate-pulse">● Clocked In</Badge>}
        </CardContent>
      </Card>

      {/* Search + Actions */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search workers, entries, timesheets…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {/* Add Worker Dialog */}
        <Dialog open={addWorkerOpen} onOpenChange={setAddWorkerOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Worker</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Worker</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>First Name *</Label><Input value={wf.first_name} onChange={e => setWf(p => ({ ...p, first_name: e.target.value }))} /></div>
              <div><Label>Last Name *</Label><Input value={wf.last_name} onChange={e => setWf(p => ({ ...p, last_name: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={wf.email} onChange={e => setWf(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={wf.phone} onChange={e => setWf(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>Role Title</Label><Input value={wf.role_title} onChange={e => setWf(p => ({ ...p, role_title: e.target.value }))} /></div>
              <div><Label>Department</Label><Input value={wf.department} onChange={e => setWf(p => ({ ...p, department: e.target.value }))} /></div>
              <div><Label>Worker Type</Label><Select value={wf.worker_type} onValueChange={v => setWf(p => ({ ...p, worker_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{WORKER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Pay Type</Label><Select value={wf.pay_type} onValueChange={v => setWf(p => ({ ...p, pay_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Pay Frequency</Label><Select value={wf.payroll_frequency} onValueChange={v => setWf(p => ({ ...p, payroll_frequency: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAY_FREQUENCIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Hourly Rate</Label><Input type="number" value={wf.hourly_rate} onChange={e => setWf(p => ({ ...p, hourly_rate: e.target.value }))} /></div>
              <div className="col-span-2"><Label>Salary Amount</Label><Input type="number" value={wf.salary_amount} onChange={e => setWf(p => ({ ...p, salary_amount: e.target.value }))} /></div>
            </div>
            <Button onClick={addWorker} className="mt-4 w-full">Save Worker</Button>
          </DialogContent>
        </Dialog>
        {/* Manual Entry Dialog */}
        <Dialog open={addEntryOpen} onOpenChange={setAddEntryOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Manual Entry</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Time Entry</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Worker *</Label><Select value={tf.worker_id} onValueChange={v => setTf(p => ({ ...p, worker_id: v }))}><SelectTrigger><SelectValue placeholder="Select worker" /></SelectTrigger><SelectContent>{workers.map(w => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Date *</Label><Input type="date" value={tf.entry_date} onChange={e => setTf(p => ({ ...p, entry_date: e.target.value }))} /></div>
                <div><Label>Start *</Label><Input type="time" value={tf.start_time} onChange={e => setTf(p => ({ ...p, start_time: e.target.value }))} /></div>
                <div><Label>End *</Label><Input type="time" value={tf.end_time} onChange={e => setTf(p => ({ ...p, end_time: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Break (min)</Label><Input type="number" value={tf.break_minutes} onChange={e => setTf(p => ({ ...p, break_minutes: e.target.value }))} /></div>
                <div><Label>Module</Label><Select value={tf.linked_module} onValueChange={v => setTf(p => ({ ...p, linked_module: v }))}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{MODULES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div><Label>Labor Category</Label><Select value={tf.labor_category} onValueChange={v => setTf(p => ({ ...p, labor_category: v }))}><SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{LABOR_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Note Summary</Label><Input value={tf.note_summary} onChange={e => setTf(p => ({ ...p, note_summary: e.target.value }))} placeholder="Brief description of work done" /></div>
              <div><Label>Detailed Notes</Label><Textarea value={tf.detailed_notes} onChange={e => setTf(p => ({ ...p, detailed_notes: e.target.value }))} placeholder="What did you work on? What was completed? Any blockers?" rows={4} /></div>
            </div>
            <Button onClick={addManualEntry} className="mt-4 w-full">Save Entry</Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="directory" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Directory</TabsTrigger>
          <TabsTrigger value="time" className="gap-1.5 text-xs"><Clock className="h-3.5 w-3.5" /> Time Entries</TabsTrigger>
          <TabsTrigger value="timesheets" className="gap-1.5 text-xs"><CalendarDays className="h-3.5 w-3.5" /> Timesheets</TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1.5 text-xs"><ShieldCheck className="h-3.5 w-3.5" /> Approvals{pendingTimesheets > 0 && <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/30">{pendingTimesheets}</Badge>}</TabsTrigger>
        </TabsList>

        {/* ==================== DIRECTORY ==================== */}
        <TabsContent value="directory">
          {filteredWorkers.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-16 text-center space-y-3">
              <Briefcase className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="font-medium">No workers yet</p>
              <p className="text-sm text-muted-foreground">Add your first team member to start tracking workforce operations.</p>
              <Button size="sm" onClick={() => setAddWorkerOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add Worker</Button>
            </CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Role</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Pay Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Rate</TableHead>
                  <TableHead className="hidden lg:table-cell">Frequency</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredWorkers.map(w => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{w.full_name}</div>
                        <div className="text-xs text-muted-foreground">{w.email || "—"}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{w.role_title || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{w.worker_type}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{w.pay_type}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {w.pay_type.toLowerCase().includes("hourly") ? `$${w.hourly_rate ?? 0}/hr` : w.pay_type.toLowerCase().includes("salary") ? `$${(w.salary_amount ?? 0).toLocaleString()}/yr` : "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{w.payroll_frequency || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${statusColor(w.status)}`}>{w.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ==================== TIME ENTRIES ==================== */}
        <TabsContent value="time">
          {filteredEntries.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-16 text-center space-y-3">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="font-medium">No time entries yet</p>
              <p className="text-sm text-muted-foreground">Clock in or add a manual time entry to get started.</p>
              <div className="flex gap-2 justify-center">
                <Button size="sm" onClick={clockIn} className="gap-1.5"><Play className="h-3.5 w-3.5" /> Clock In</Button>
                <Button size="sm" variant="outline" onClick={() => setAddEntryOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Manual Entry</Button>
              </div>
            </CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden md:table-cell">Start</TableHead>
                  <TableHead className="hidden md:table-cell">End</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="hidden lg:table-cell">Module</TableHead>
                  <TableHead className="hidden lg:table-cell">Category</TableHead>
                  <TableHead className="hidden md:table-cell">Notes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filteredEntries.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm font-medium">{workerMap[e.worker_id]?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{fmt(e.entry_date)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{fmtTime(e.start_time)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{fmtTime(e.end_time)}</TableCell>
                      <TableCell className="text-sm font-medium">{((e.total_minutes || 0) / 60).toFixed(1)}h</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{e.linked_module || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{e.labor_category || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm max-w-[200px] truncate">{e.note_summary || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${statusColor(e.entry_status)}`}>{e.entry_status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {e.entry_status === "Draft" && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => submitEntry(e.id)} title="Submit"><Send className="h-3.5 w-3.5 text-blue-400" /></Button>}
                          {e.entry_status === "Submitted" && (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => approveEntry(e.id)} title="Approve"><CheckCircle className="h-3.5 w-3.5 text-emerald-400" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => rejectEntry(e.id)} title="Reject"><XCircle className="h-3.5 w-3.5 text-red-400" /></Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ==================== TIMESHEETS ==================== */}
        <TabsContent value="timesheets">
          <div className="space-y-4">
            {/* Generate Timesheet Controls */}
            {workers.filter(w => w.status === "Active").length > 0 && (
              <Card className="border-primary/20">
                <CardContent className="py-3 flex flex-wrap items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Generate Timesheet</span>
                  {workers.filter(w => w.status === "Active").map(w => (
                    <Button key={w.id} size="sm" variant="outline" onClick={() => generateTimesheet(w.id)} className="gap-1.5 text-xs">
                      <Plus className="h-3 w-3" /> {w.full_name}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}

            {timesheets.length === 0 ? (
              <Card className="border-dashed"><CardContent className="py-16 text-center space-y-3">
                <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="font-medium">No timesheets yet</p>
                <p className="text-sm text-muted-foreground">Generate a timesheet from worker time entries to get started.</p>
              </CardContent></Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Pay Period</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead className="hidden md:table-cell">Overtime</TableHead>
                    <TableHead className="hidden lg:table-cell">Notes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Submitted</TableHead>
                    <TableHead className="w-[160px]">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {timesheets.map(ts => (
                      <TableRow key={ts.id}>
                        <TableCell className="text-sm font-medium">{workerMap[ts.worker_id]?.full_name ?? "—"}</TableCell>
                        <TableCell className="text-sm">{fmt(ts.pay_period_start)} – {fmt(ts.pay_period_end)}</TableCell>
                        <TableCell className="text-sm font-medium">{ts.total_hours}h</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{ts.total_overtime_hours > 0 ? `${ts.total_overtime_hours}h` : "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{ts.total_notes_count}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-xs ${statusColor(ts.status)}`}>{ts.status}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{fmt(ts.submitted_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewTimesheetId(ts.id)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                            {ts.status === "Open" && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => submitTimesheet(ts.id)} title="Submit"><Send className="h-3.5 w-3.5 text-blue-400" /></Button>}
                            {ts.status === "Approved" && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => lockTimesheet(ts.id)} title="Lock"><Lock className="h-3.5 w-3.5 text-purple-400" /></Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ==================== APPROVALS ==================== */}
        <TabsContent value="approvals">
          {(() => {
            const pending = timesheets.filter(t => t.status === "Submitted");
            const pendingEntries = entries.filter(e => e.entry_status === "Submitted" && !e.timesheet_id);
            const allPending = [...pending.map(t => ({ type: "timesheet" as const, ...t })), ...pendingEntries.map(e => ({ type: "entry" as const, ...e }))];

            if (allPending.length === 0) {
              return (
                <Card className="border-dashed"><CardContent className="py-16 text-center space-y-2">
                  <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="font-medium">No pending approvals</p>
                  <p className="text-sm text-muted-foreground">Submitted timesheets and time entries will appear here for review.</p>
                </CardContent></Card>
              );
            }

            return (
              <Card>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period / Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead className="hidden md:table-cell">Notes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[160px]">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {pending.map(ts => (
                      <TableRow key={ts.id}>
                        <TableCell className="font-medium text-sm">{workerMap[ts.worker_id]?.full_name ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">Timesheet</Badge></TableCell>
                        <TableCell className="text-sm">{fmt(ts.pay_period_start)} – {fmt(ts.pay_period_end)}</TableCell>
                        <TableCell className="text-sm font-medium">{ts.total_hours}h</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{ts.total_notes_count} notes</TableCell>
                        <TableCell><Badge variant="outline" className={`text-xs ${statusColor(ts.status)}`}>{ts.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewTimesheetId(ts.id)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setViewTimesheetId(ts.id); }} title="Approve"><CheckCircle className="h-3.5 w-3.5 text-emerald-400" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setRejectDialogId(ts.id)} title="Reject"><XCircle className="h-3.5 w-3.5 text-red-400" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pendingEntries.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium text-sm">{workerMap[e.worker_id]?.full_name ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">Entry</Badge></TableCell>
                        <TableCell className="text-sm">{fmt(e.entry_date)}</TableCell>
                        <TableCell className="text-sm font-medium">{((e.total_minutes || 0) / 60).toFixed(1)}h</TableCell>
                        <TableCell className="hidden md:table-cell text-sm truncate max-w-[200px]">{e.note_summary || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-xs ${statusColor(e.entry_status)}`}>{e.entry_status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => approveEntry(e.id)} title="Approve"><CheckCircle className="h-3.5 w-3.5 text-emerald-400" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => rejectEntry(e.id)} title="Reject"><XCircle className="h-3.5 w-3.5 text-red-400" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* ==================== TIMESHEET DETAIL DIALOG ==================== */}
      <Dialog open={!!viewTimesheetId} onOpenChange={open => { if (!open) setViewTimesheetId(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewedTS && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  Timesheet: {workerMap[viewedTS.worker_id]?.full_name}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Period</p>
                  <p className="text-sm font-medium">{fmt(viewedTS.pay_period_start)} – {fmt(viewedTS.pay_period_end)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Total Hours</p>
                  <p className="text-sm font-bold">{viewedTS.total_hours}h</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Overtime</p>
                  <p className="text-sm font-medium">{viewedTS.total_overtime_hours}h</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="outline" className={`text-xs mt-1 ${statusColor(viewedTS.status)}`}>{viewedTS.status}</Badge>
                </div>
              </div>

              {viewedTS.rejection_reason && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-xs font-medium text-red-400">Rejection Reason</p>
                  <p className="text-sm">{viewedTS.rejection_reason}</p>
                </div>
              )}
              {viewedTS.approval_comment && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <p className="text-xs font-medium text-emerald-400">Approval Comment</p>
                  <p className="text-sm">{viewedTS.approval_comment}</p>
                </div>
              )}

              {/* Entries in this timesheet */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5"><Clock className="h-4 w-4" /> Time Entries ({viewedTSEntries.length})</h4>
                {viewedTSEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No entries found for this period.</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {viewedTSEntries.map(e => (
                      <div key={e.id} className="rounded-lg border p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{fmt(e.entry_date)} · {fmtTime(e.start_time)} – {fmtTime(e.end_time)}</span>
                          <span className="text-sm font-bold">{((e.total_minutes || 0) / 60).toFixed(1)}h</span>
                        </div>
                        {e.linked_module && <Badge variant="outline" className="text-[10px]">{e.linked_module}</Badge>}
                        {e.labor_category && <Badge variant="outline" className="text-[10px] ml-1">{e.labor_category}</Badge>}
                        {e.note_summary && <p className="text-sm text-muted-foreground">{e.note_summary}</p>}
                        {e.detailed_notes && <p className="text-xs text-muted-foreground border-t pt-1 mt-1">{e.detailed_notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Approval actions for submitted timesheets */}
              {viewedTS.status === "Submitted" && (
                <div className="space-y-3 border-t pt-3">
                  <div>
                    <Label>Approval Comment (optional)</Label>
                    <Textarea value={approvalComment} onChange={e => setApprovalComment(e.target.value)} placeholder="Add a comment for this approval…" rows={2} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => approveTimesheet(viewedTS.id)} className="flex-1 gap-1.5">
                      <CheckCircle className="h-4 w-4" /> Approve Timesheet
                    </Button>
                    <Button variant="outline" onClick={() => { setViewTimesheetId(null); setRejectDialogId(viewedTS.id); }} className="gap-1.5 text-red-400 border-red-500/30 hover:bg-red-500/10">
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== REJECT DIALOG ==================== */}
      <Dialog open={!!rejectDialogId} onOpenChange={open => { if (!open) { setRejectDialogId(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <XCircle className="h-5 w-5" /> Reject Timesheet
            </DialogTitle>
          </DialogHeader>
          <div>
            <Label>Rejection Reason</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Explain what needs correction…" rows={3} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setRejectDialogId(null); setRejectReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={rejectTimesheet} className="gap-1.5"><XCircle className="h-4 w-4" /> Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
