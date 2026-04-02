import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Wrench, Search, Users, Clock, AlertTriangle, CheckCircle2,
  ChevronRight, RefreshCw, Play, Pause, Package, Zap, CalendarDays
} from "lucide-react";

interface QueueClient {
  id: string;
  business_name: string;
  workspace_slug: string;
  payment_status: string;
  implementation_status: string;
  portal_access_enabled: boolean;
  owner_name: string | null;
  service_package: string | null;
}

interface TaskCount {
  client_id: string;
  total: number;
  complete: number;
  in_progress: number;
  blocked: number;
  waiting: number;
  overdue: number;
  due_soon: number;
}

export default function AdminImplementationQueue() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<QueueClient[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, TaskCount>>({});
  const [setupCounts, setSetupCounts] = useState<Record<string, { total: number; completed: number; received: number }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    // Get clients that are paid or have implementation started
    const { data: allClients } = await supabase
      .from("clients")
      .select("id, business_name, workspace_slug, payment_status, implementation_status, portal_access_enabled, owner_name, service_package")
      .in("status", ["active", "onboarding", "provisioned"])
      .order("created_at", { ascending: false });

    const cls = (allClients || []) as QueueClient[];
    setClients(cls);

    if (cls.length > 0) {
      const clientIds = cls.map(c => c.id);

      // Get task counts
      const { data: tasks } = await supabase
        .from("implementation_tasks")
        .select("client_id, task_status, due_date")
        .in("client_id", clientIds);

      const now = new Date();
      const threeDays = new Date(now.getTime() + 3 * 86400000);
      const counts: Record<string, TaskCount> = {};
      for (const t of (tasks || []) as any[]) {
        if (!counts[t.client_id]) counts[t.client_id] = { client_id: t.client_id, total: 0, complete: 0, in_progress: 0, blocked: 0, waiting: 0, overdue: 0, due_soon: 0 };
        const c = counts[t.client_id];
        c.total++;
        if (t.task_status === "complete") c.complete++;
        if (t.task_status === "in_progress") c.in_progress++;
        if (t.task_status === "blocked") c.blocked++;
        if (t.task_status === "waiting_on_client") c.waiting++;
        if (t.due_date) {
          const d = new Date(t.due_date);
          if (d < now && t.task_status !== "complete" && t.task_status !== "canceled") c.overdue++;
          else if (d <= threeDays && t.task_status !== "complete" && t.task_status !== "canceled") c.due_soon++;
        }
      }
      setTaskCounts(counts);

      // Get setup counts
      const { data: setupItems } = await supabase
        .from("client_setup_items" as any)
        .select("client_id, item_status, submitted_by_client")
        .in("client_id", clientIds);

      const sc: Record<string, { total: number; completed: number; received: number }> = {};
      for (const s of (setupItems || []) as any[]) {
        if (!s.submitted_by_client) continue;
        if (!sc[s.client_id]) sc[s.client_id] = { total: 0, completed: 0, received: 0 };
        sc[s.client_id].total++;
        if (s.item_status === "completed") sc[s.client_id].completed++;
        if (s.item_status === "received") sc[s.client_id].received++;
      }
      setSetupCounts(sc);
    }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let result = clients;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.business_name.toLowerCase().includes(q));
    }
    if (filter === "paid_ready") result = result.filter(c => c.payment_status === "paid" && c.implementation_status !== "complete");
    else if (filter === "waiting_admin") result = result.filter(c => {
      const tc = taskCounts[c.id];
      return tc && (tc.in_progress > 0 || tc.total > 0 && tc.complete < tc.total) && c.implementation_status === "in_progress";
    });
    else if (filter === "waiting_client") result = result.filter(c => c.implementation_status === "waiting_on_client" || (taskCounts[c.id]?.waiting || 0) > 0);
    else if (filter === "blocked") result = result.filter(c => (taskCounts[c.id]?.blocked || 0) > 0);
    else if (filter === "overdue") result = result.filter(c => (taskCounts[c.id]?.overdue || 0) > 0);
    else if (filter === "complete") result = result.filter(c => c.implementation_status === "complete");
    else if (filter === "not_started") result = result.filter(c => c.implementation_status === "not_started" && c.payment_status === "paid");
    return result;
  }, [clients, search, filter, taskCounts]);

  // Summary stats
  const stats = useMemo(() => {
    const paid = clients.filter(c => c.payment_status === "paid" || c.payment_status === "waived");
    const inProgress = clients.filter(c => c.implementation_status === "in_progress");
    const waiting = clients.filter(c => c.implementation_status === "waiting_on_client" || (taskCounts[c.id]?.waiting || 0) > 0);
    const blocked = clients.filter(c => (taskCounts[c.id]?.blocked || 0) > 0);
    const overdue = clients.filter(c => (taskCounts[c.id]?.overdue || 0) > 0);
    const complete = clients.filter(c => c.implementation_status === "complete");
    const ready = paid.filter(c => c.implementation_status === "not_started");
    return { paid: paid.length, inProgress: inProgress.length, waiting: waiting.length, blocked: blocked.length, overdue: overdue.length, complete: complete.length, ready: ready.length };
  }, [clients, taskCounts]);

  if (loading) return <div className="text-white/40 text-center py-20">Loading…</div>;

  const FILTERS = [
    { key: "all", label: "All Clients", count: clients.length },
    { key: "paid_ready", label: "Paid & Active", count: stats.paid },
    { key: "not_started", label: "Ready to Start", count: stats.ready },
    { key: "waiting_admin", label: "In Progress", count: stats.inProgress },
    { key: "waiting_client", label: "Waiting on Client", count: stats.waiting },
    { key: "blocked", label: "Blocked", count: stats.blocked },
    { key: "overdue", label: "Overdue", count: stats.overdue },
    { key: "complete", label: "Complete", count: stats.complete },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Implementation Queue</h1>
          <p className="text-sm text-white/40">Internal delivery operations — track, assign, and complete client work</p>
        </div>
        <Button variant="outline" onClick={load} className="border-white/10 text-white hover:bg-white/10 gap-1.5 text-xs h-8">
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Paid", value: stats.paid, color: "hsl(var(--nl-sky))", icon: CheckCircle2 },
          { label: "Ready", value: stats.ready, color: "hsl(152, 60%, 44%)", icon: Zap },
          { label: "In Progress", value: stats.inProgress, color: "hsl(211, 96%, 60%)", icon: Play },
          { label: "Waiting", value: stats.waiting, color: "hsl(38, 92%, 50%)", icon: Pause },
          { label: "Blocked", value: stats.blocked, color: "hsl(0, 70%, 60%)", icon: AlertTriangle },
          { label: "Overdue", value: stats.overdue, color: "hsl(0, 70%, 50%)", icon: Clock },
          { label: "Complete", value: stats.complete, color: "hsl(152, 60%, 55%)", icon: CheckCircle2 },
        ].map(s => (
          <Card key={s.label} className="border-0 bg-white/[0.04]">
            <CardContent className="p-3 text-center">
              <s.icon className="h-4 w-4 mx-auto mb-1" style={{ color: s.color }} />
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] text-white/40 uppercase tracking-wider">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-[10px] px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === f.key ? "bg-[hsl(var(--nl-electric))] text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…" className="pl-9 bg-white/[0.06] border-white/10 text-white placeholder:text-white/30" />
      </div>

      {/* Client rows */}
      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-center text-white/30 py-12">No clients match this filter</p>}
        {filtered.map((c, i) => {
          const tc = taskCounts[c.id] || { total: 0, complete: 0, in_progress: 0, blocked: 0, waiting: 0, overdue: 0, due_soon: 0 };
          const sc = setupCounts[c.id] || { total: 0, completed: 0, received: 0 };
          const taskPct = tc.total > 0 ? Math.round((tc.complete / tc.total) * 100) : 0;
          const setupPct = sc.total > 0 ? Math.round(((sc.completed + sc.received) / sc.total) * 100) : 0;
          const isPaid = c.payment_status === "paid" || c.payment_status === "waived";

          return (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card
                className="border-0 bg-white/[0.04] hover:bg-white/[0.06] transition-colors cursor-pointer"
                style={{ borderColor: tc.overdue > 0 ? "hsla(0,70%,50%,.2)" : tc.blocked > 0 ? "hsla(0,70%,60%,.15)" : "hsla(211,96%,60%,.08)" }}
                onClick={() => navigate(`/admin/clients/${c.id}/implementation`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-white truncate">{c.business_name}</p>
                        {!isPaid && <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-400">Unpaid</Badge>}
                        {c.implementation_status === "complete" && <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">Complete</Badge>}
                        {tc.overdue > 0 && <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-400">{tc.overdue} overdue</Badge>}
                        {tc.blocked > 0 && <Badge variant="outline" className="text-[9px] border-red-400/30 text-red-300">{tc.blocked} blocked</Badge>}
                        {tc.due_soon > 0 && <Badge variant="outline" className="text-[9px] border-amber-400/30 text-amber-300">{tc.due_soon} due soon</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-white/30">
                        <span>{c.owner_name || "—"}</span>
                        <span>{c.service_package || "—"}</span>
                        <span className="capitalize">{c.implementation_status.replace(/_/g, " ")}</span>
                      </div>
                    </div>

                    {/* Progress bars */}
                    <div className="w-40 space-y-1.5 shrink-0 hidden sm:block">
                      <div>
                        <div className="flex justify-between text-[9px] text-white/30 mb-0.5">
                          <span>Setup</span>
                          <span className="text-[hsl(var(--nl-sky))]">{setupPct}%</span>
                        </div>
                        <Progress value={setupPct} className="h-1" />
                      </div>
                      <div>
                        <div className="flex justify-between text-[9px] text-white/30 mb-0.5">
                          <span>Tasks</span>
                          <span className="text-emerald-400">{taskPct}%</span>
                        </div>
                        <Progress value={taskPct} className="h-1" />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-3 shrink-0 text-center hidden md:flex">
                      {[
                        { label: "Total", value: tc.total, color: "text-white/50" },
                        { label: "Active", value: tc.in_progress, color: "text-[hsl(var(--nl-sky))]" },
                        { label: "Done", value: tc.complete, color: "text-emerald-400" },
                        { label: "Wait", value: tc.waiting, color: "text-amber-400" },
                      ].map(s => (
                        <div key={s.label}>
                          <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-[8px] text-white/20 uppercase">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
