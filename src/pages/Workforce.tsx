import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Users, Clock, Plus, Play, Square, FileText, Search,
  CheckCircle, XCircle, AlertCircle, Timer, Briefcase, CalendarDays
} from "lucide-react";

// ---------- types ----------
interface Worker {
  id: string;
  client_id: string;
  worker_type: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role_title: string | null;
  department: string | null;
  status: string;
  pay_type: string;
  hourly_rate: number | null;
  salary_amount: number | null;
  commission_rate: number | null;
  bonus_eligible: boolean;
  overtime_eligible: boolean;
  payroll_frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  payout_method: string | null;
  default_cost_center: string | null;
  created_at: string;
  updated_at: string;
}

interface TimeEntry {
  id: string;
  client_id: string;
  worker_id: string;
  entry_date: string;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number;
  total_minutes: number;
  total_hours: number;
  entry_method: string;
  entry_status: string;
  note_summary: string | null;
  detailed_notes: string | null;
  linked_module: string | null;
  labor_category: string | null;
  billable_status: string | null;
  linked_task_id: string | null;
  linked_contact_id: string | null;
  linked_company_id: string | null;
  linked_deal_id: string | null;
  linked_appointment_id: string | null;
  created_at: string;
}

// ---------- constants ----------
const WORKER_TYPES = ["Employee", "Contractor", "Freelancer", "Manager", "Admin Staff", "Service Provider"];
const WORKER_STATUSES = ["Active", "Inactive", "On Leave", "Terminated"];
const PAY_TYPES = ["Hourly", "Salary", "Commission", "Salary + Commission", "Flat Rate", "Hourly + Bonus", "Contractor Hourly", "Contractor Fixed"];
const ENTRY_STATUSES = ["Draft", "Submitted", "Approved", "Rejected", "Paid", "Locked"];
const MODULES = ["Calendar", "CRM", "Reviews", "Ads", "Social", "SEO", "Website", "Finance", "Admin", "Operations"];
const LABOR_CATEGORIES = ["Appointment Delivery", "Sales", "Admin", "Client Support", "Content Creation", "Website Work", "SEO Work", "Ad Management", "Review Recovery", "Internal Ops"];

const statusColor = (s: string) => {
  switch (s.toLowerCase()) {
    case "active": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "inactive": case "terminated": return "bg-red-500/15 text-red-400 border-red-500/30";
    case "on leave": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "draft": return "bg-muted text-muted-foreground border-border";
    case "submitted": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "approved": case "paid": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "rejected": return "bg-red-500/15 text-red-400 border-red-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString() : "—";
const fmtTime = (d: string | null) => d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

export default function Workforce() {
  const { activeClientId } = useWorkspace();
  const [tab, setTab] = useState("directory");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // dialog states
  const [addWorkerOpen, setAddWorkerOpen] = useState(false);
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [clockedIn, setClockedIn] = useState<string | null>(null); // active entry id

  // new worker form
  const [wf, setWf] = useState({ first_name: "", last_name: "", email: "", phone: "", role_title: "", department: "", worker_type: "Employee", pay_type: "Hourly", hourly_rate: "", salary_amount: "" });

  // new time entry form
  const [tf, setTf] = useState({ worker_id: "", entry_date: new Date().toISOString().split("T")[0], start_time: "09:00", end_time: "17:00", break_minutes: "0", note_summary: "", detailed_notes: "", linked_module: "", labor_category: "", entry_method: "Manual Entry" });

  const fetchData = useCallback(async () => {
    if (!activeClientId) return;
    setLoading(true);
    const [wRes, eRes] = await Promise.all([
      supabase.from("workers").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("time_entries").select("*").eq("client_id", activeClientId).order("entry_date", { ascending: false }).limit(200),
    ]);
    if (wRes.data) setWorkers(wRes.data as any);
    if (eRes.data) setEntries(eRes.data as any);

    // check for active clock-in
    const activeEntry = (eRes.data as any[])?.find((e: any) => e.entry_method === "Clock In/Out" && e.entry_status === "Draft" && !e.end_time);
    setClockedIn(activeEntry?.id ?? null);
    setLoading(false);
  }, [activeClientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---------- CRUD ----------
  const addWorker = async () => {
    if (!activeClientId || !wf.first_name || !wf.last_name) return;
    const { error } = await supabase.from("workers").insert({
      client_id: activeClientId,
      first_name: wf.first_name,
      last_name: wf.last_name,
      email: wf.email || null,
      phone: wf.phone || null,
      role_title: wf.role_title || null,
      department: wf.department || null,
      worker_type: wf.worker_type,
      pay_type: wf.pay_type,
      hourly_rate: wf.hourly_rate ? Number(wf.hourly_rate) : 0,
      salary_amount: wf.salary_amount ? Number(wf.salary_amount) : 0,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Worker added" });
    setAddWorkerOpen(false);
    setWf({ first_name: "", last_name: "", email: "", phone: "", role_title: "", department: "", worker_type: "Employee", pay_type: "Hourly", hourly_rate: "", salary_amount: "" });
    fetchData();
  };

  const clockIn = async () => {
    if (!activeClientId || workers.length === 0) {
      toast({ title: "Add a worker first", variant: "destructive" }); return;
    }
    const workerId = workers[0].id; // default to first worker; in production, link to logged-in user
    const now = new Date();
    const { data, error } = await supabase.from("time_entries").insert({
      client_id: activeClientId,
      worker_id: workerId,
      entry_date: now.toISOString().split("T")[0],
      start_time: now.toISOString(),
      entry_method: "Clock In/Out",
      entry_status: "Draft",
      total_minutes: 0,
    } as any).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setClockedIn((data as any).id);
    toast({ title: "Clocked in", description: fmtTime(now.toISOString()) });
    await supabase.from("crm_activities").insert({ client_id: activeClientId, activity_type: "Clock In", activity_note: `Worker clocked in at ${fmtTime(now.toISOString())}` } as any);
    fetchData();
  };

  const clockOut = async () => {
    if (!clockedIn) return;
    const now = new Date();
    const entry = entries.find(e => e.id === clockedIn);
    const startMs = entry?.start_time ? new Date(entry.start_time).getTime() : now.getTime();
    const totalMin = Math.max(0, Math.round((now.getTime() - startMs) / 60000));
    const { error } = await supabase.from("time_entries").update({
      end_time: now.toISOString(),
      total_minutes: totalMin,
      entry_status: "Draft",
    } as any).eq("id", clockedIn);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setClockedIn(null);
    toast({ title: "Clocked out", description: `${(totalMin / 60).toFixed(1)} hours logged` });
    await supabase.from("crm_activities").insert({ client_id: activeClientId, activity_type: "Clock Out", activity_note: `Worker clocked out. ${(totalMin / 60).toFixed(1)}h logged.` } as any);
    fetchData();
  };

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
      client_id: activeClientId,
      worker_id: tf.worker_id,
      entry_date: tf.entry_date,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      break_minutes: breakMin,
      total_minutes: totalMin,
      entry_method: tf.entry_method,
      entry_status: "Draft",
      note_summary: tf.note_summary || null,
      detailed_notes: tf.detailed_notes || null,
      linked_module: tf.linked_module || null,
      labor_category: tf.labor_category || null,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Time entry added" });
    setAddEntryOpen(false);
    setTf({ worker_id: "", entry_date: new Date().toISOString().split("T")[0], start_time: "09:00", end_time: "17:00", break_minutes: "0", note_summary: "", detailed_notes: "", linked_module: "", labor_category: "", entry_method: "Manual Entry" });
    await supabase.from("crm_activities").insert({ client_id: activeClientId, activity_type: "Manual Time Entry", activity_note: `Manual time entry added: ${(totalMin / 60).toFixed(1)}h on ${tf.entry_date}` } as any);
    fetchData();
  };

  const submitEntry = async (id: string) => {
    await supabase.from("time_entries").update({ entry_status: "Submitted", submitted_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Entry submitted for approval" });
    fetchData();
  };

  const approveEntry = async (id: string) => {
    await supabase.from("time_entries").update({ entry_status: "Approved", approved_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Entry approved" });
    fetchData();
  };

  const rejectEntry = async (id: string) => {
    await supabase.from("time_entries").update({ entry_status: "Rejected" } as any).eq("id", id);
    toast({ title: "Entry rejected" });
    fetchData();
  };

  // ---------- filtered data ----------
  const workerMap = Object.fromEntries(workers.map(w => [w.id, w]));
  const filteredWorkers = workers.filter(w => !search || w.full_name.toLowerCase().includes(search.toLowerCase()) || w.email?.toLowerCase().includes(search.toLowerCase()));
  const filteredEntries = entries.filter(e => !search || workerMap[e.worker_id]?.full_name?.toLowerCase().includes(search.toLowerCase()) || e.note_summary?.toLowerCase().includes(search.toLowerCase()));

  // stats
  const totalWorkers = workers.filter(w => w.status === "Active").length;
  const totalHoursToday = entries.filter(e => e.entry_date === new Date().toISOString().split("T")[0]).reduce((s, e) => s + (e.total_minutes || 0), 0) / 60;
  const pendingApprovals = entries.filter(e => e.entry_status === "Submitted").length;
  const draftEntries = entries.filter(e => e.entry_status === "Draft").length;

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
      <PageHeader title="Workforce" description="Team directory, time tracking, and workforce operations." />

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
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><AlertCircle className="h-5 w-5 text-amber-500" /></div>
          <div><p className="text-2xl font-bold">{pendingApprovals}</p><p className="text-xs text-muted-foreground">Pending Approvals</p></div>
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
          <Input placeholder="Search workers or entries…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
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
              <div><Label>Hourly Rate</Label><Input type="number" value={wf.hourly_rate} onChange={e => setWf(p => ({ ...p, hourly_rate: e.target.value }))} /></div>
              <div><Label>Salary Amount</Label><Input type="number" value={wf.salary_amount} onChange={e => setWf(p => ({ ...p, salary_amount: e.target.value }))} /></div>
            </div>
            <Button onClick={addWorker} className="mt-4 w-full">Save Worker</Button>
          </DialogContent>
        </Dialog>
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
          <TabsTrigger value="approvals" className="gap-1.5 text-xs"><CheckCircle className="h-3.5 w-3.5" /> Approvals</TabsTrigger>
        </TabsList>

        {/* DIRECTORY */}
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
                        {w.pay_type.toLowerCase().includes("hourly") || w.pay_type === "Hourly" ? `$${w.hourly_rate ?? 0}/hr` : w.pay_type.toLowerCase().includes("salary") ? `$${(w.salary_amount ?? 0).toLocaleString()}/yr` : "—"}
                      </TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${statusColor(w.status)}`}>{w.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* TIME ENTRIES */}
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
                      <TableCell className="text-sm font-medium">{e.total_hours != null ? `${e.total_hours}h` : "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{e.linked_module || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm max-w-[200px] truncate">{e.note_summary || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${statusColor(e.entry_status)}`}>{e.entry_status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {e.entry_status === "Draft" && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => submitEntry(e.id)} title="Submit"><CheckCircle className="h-3.5 w-3.5 text-blue-400" /></Button>}
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

        {/* TIMESHEETS */}
        <TabsContent value="timesheets">
          <Card><CardHeader><CardTitle className="text-base">Timesheets Summary</CardTitle></CardHeader><CardContent>
            {workers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Add workers to view timesheet summaries.</p>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Entries</TableHead>
                  <TableHead>Draft</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Approved</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {workers.filter(w => w.status === "Active").map(w => {
                    const wEntries = entries.filter(e => e.worker_id === w.id);
                    const total = wEntries.reduce((s, e) => s + (e.total_minutes || 0), 0) / 60;
                    return (
                      <TableRow key={w.id}>
                        <TableCell className="font-medium text-sm">{w.full_name}</TableCell>
                        <TableCell className="text-sm">{total.toFixed(1)}h</TableCell>
                        <TableCell className="text-sm">{wEntries.length}</TableCell>
                        <TableCell className="text-sm">{wEntries.filter(e => e.entry_status === "Draft").length}</TableCell>
                        <TableCell className="text-sm">{wEntries.filter(e => e.entry_status === "Submitted").length}</TableCell>
                        <TableCell className="text-sm">{wEntries.filter(e => e.entry_status === "Approved").length}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* APPROVALS */}
        <TabsContent value="approvals">
          {entries.filter(e => e.entry_status === "Submitted").length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-16 text-center space-y-2">
              <CheckCircle className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="font-medium">No pending approvals</p>
              <p className="text-sm text-muted-foreground">Submitted time entries will appear here for review.</p>
            </CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {entries.filter(e => e.entry_status === "Submitted").map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium text-sm">{workerMap[e.worker_id]?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{fmt(e.entry_date)}</TableCell>
                      <TableCell className="text-sm">{e.total_hours ?? 0}h</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{e.note_summary || "—"}</TableCell>
                      <TableCell className="text-sm">{e.linked_module || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => approveEntry(e.id)}><CheckCircle className="h-3 w-3" /> Approve</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400" onClick={() => rejectEntry(e.id)}><XCircle className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
