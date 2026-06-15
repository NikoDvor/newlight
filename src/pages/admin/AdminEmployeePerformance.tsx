import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Users, Clock, Calendar, TrendingUp, Loader2 } from "lucide-react";

interface Worker {
  id: string;
  full_name: string;
  role_title: string | null;
  department: string | null;
  status: string;
  client_id: string;
  worker_type: string;
}

interface WorkerStats {
  worker: Worker;
  clientName: string;
  hoursThisPeriod: number;
  appointmentsCompleted: number;
  appointmentsTotal: number;
  dealsAssigned: number;
  dealsWon: number;
  tasksCompleted: number;
  tasksTotal: number;
  meetingsLogged: number;
  earningsThisPeriod: number;
}

export default function AdminEmployeePerformance() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [stats, setStats] = useState<WorkerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [periodDays, setPeriodDays] = useState("30");

  useEffect(() => {
    fetchAll();
  }, [periodDays]);

  const fetchAll = async () => {
    setLoading(true);

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - parseInt(periodDays));
    const periodStartStr = periodStart.toISOString();

    const [wRes, cRes, timeRes, apptRes, dealRes, taskRes, meetRes, payRes] = await Promise.all([
      supabase.from("workers").select("id, full_name, role_title, department, status, client_id, worker_type").eq("status", "Active").order("full_name"),
      supabase.from("clients").select("id, business_name").order("business_name"),
      supabase.from("time_entries").select("worker_id, total_minutes").gte("entry_date", periodStartStr.split("T")[0]),
      supabase.from("appointments").select("assigned_user_id, status").gte("created_at", periodStartStr),
      supabase.from("crm_deals").select("assigned_user, pipeline_stage").gte("created_at", periodStartStr),
      supabase.from("crm_tasks").select("assigned_worker_id, status").gte("created_at", periodStartStr),
      supabase.from("sales_meetings").select("assigned_salesman_user_id, status").gte("created_at", periodStartStr),
      supabase.from("payroll_line_items").select("worker_id, net_pay").gte("created_at", periodStartStr),
    ]);

    const workerList = (wRes.data || []) as Worker[];
    const clientList = cRes.data || [];
    const timeEntries = timeRes.data || [];
    const appointments = apptRes.data || [];
    const deals = dealRes.data || [];
    const tasks = taskRes.data || [];
    const meetings = meetRes.data || [];
    const payroll = payRes.data || [];

    const clientMap = Object.fromEntries(clientList.map((c: any) => [c.id, c.business_name]));

    const workerStats: WorkerStats[] = workerList.map(worker => {
      const hoursThisPeriod = timeEntries
        .filter((e: any) => e.worker_id === worker.id)
        .reduce((s: number, e: any) => s + (e.total_minutes || 0), 0) / 60;

      const workerAppts = appointments.filter((a: any) => a.assigned_user_id === worker.id);
      const workerDeals = deals.filter((d: any) => d.assigned_user === worker.id);
      const workerTasks = tasks.filter((t: any) => t.assigned_worker_id === worker.id);
      const workerMeetings = meetings.filter((m: any) => m.assigned_salesman_user_id === worker.id);
      const workerPay = payroll
        .filter((p: any) => p.worker_id === worker.id)
        .reduce((s: number, p: any) => s + (Number(p.net_pay) || 0), 0);

      return {
        worker,
        clientName: clientMap[worker.client_id] || "NewLight Internal",
        hoursThisPeriod: Math.round(hoursThisPeriod * 10) / 10,
        appointmentsCompleted: workerAppts.filter((a: any) => a.status === "completed").length,
        appointmentsTotal: workerAppts.length,
        dealsAssigned: workerDeals.length,
        dealsWon: workerDeals.filter((d: any) => d.pipeline_stage === "closed_won").length,
        tasksCompleted: workerTasks.filter((t: any) => t.status === "completed").length,
        tasksTotal: workerTasks.length,
        meetingsLogged: workerMeetings.length,
        earningsThisPeriod: Math.round(workerPay * 100) / 100,
      };
    });

    setWorkers(workerList);
    setClients(clientList);
    setStats(workerStats);
    setLoading(false);
  };

  const departments = [...new Set(workers.map(w => w.department).filter(Boolean))] as string[];

  const filtered = stats.filter(s => {
    if (filterClient !== "all" && s.worker.client_id !== filterClient) return false;
    if (filterDept !== "all" && s.worker.department !== filterDept) return false;
    return true;
  });

  const totalHours = filtered.reduce((s, w) => s + w.hoursThisPeriod, 0);
  const totalAppts = filtered.reduce((s, w) => s + w.appointmentsCompleted, 0);
  const totalDealsWon = filtered.reduce((s, w) => s + w.dealsWon, 0);
  const totalEarnings = filtered.reduce((s, w) => s + w.earningsThisPeriod, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Employee Performance</h1>
          <p className="text-sm text-white/50 mt-1">
            Monitor all employee activity and performance across every workspace
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-[140px] bg-white/[0.06] border-white/10 text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(218_35%_12%)] border-white/10">
              <SelectItem value="7" className="text-white text-xs">Last 7 days</SelectItem>
              <SelectItem value="14" className="text-white text-xs">Last 14 days</SelectItem>
              <SelectItem value="30" className="text-white text-xs">Last 30 days</SelectItem>
              <SelectItem value="60" className="text-white text-xs">Last 60 days</SelectItem>
              <SelectItem value="90" className="text-white text-xs">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-[160px] bg-white/[0.06] border-white/10 text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(218_35%_12%)] border-white/10">
              <SelectItem value="all" className="text-white text-xs">All Workspaces</SelectItem>
              {clients.map((c: any) => (
                <SelectItem key={c.id} value={c.id} className="text-white text-xs">{c.business_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {departments.length > 0 && (
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-[160px] bg-white/[0.06] border-white/10 text-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(218_35%_12%)] border-white/10">
                <SelectItem value="all" className="text-white text-xs">All Departments</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d} value={d} className="text-white text-xs">{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Active Employees", value: String(filtered.length), icon: Users },
          { label: "Total Hours", value: `${Math.round(totalHours * 10) / 10}h`, icon: Clock },
          { label: "Appts Completed", value: String(totalAppts), icon: Calendar },
          { label: "Deals Won", value: String(totalDealsWon), icon: TrendingUp },
        ].map(card => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-4 bg-white/[0.03] border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-7 w-7 rounded-lg bg-white/[0.06] flex items-center justify-center">
                  <card.icon className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
                </div>
              </div>
              <p className="text-lg font-bold text-white">{card.value}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">{card.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Employee Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-white/30 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center bg-white/[0.03] border-white/[0.06]">
          <Users className="h-8 w-8 text-white/20 mx-auto mb-3" />
          <h3 className="text-white font-medium">No active employees found</h3>
          <p className="text-white/40 text-sm mt-1">
            Add workers in Workforce to start tracking performance
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden bg-white/[0.03] border-white/[0.06]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Employee", "Workspace", "Role", "Hours", "Appts", "Deals Won", "Tasks", "Meetings", "Earnings"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <motion.tr
                    key={s.worker.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/60 text-xs font-medium">
                          {(s.worker.full_name || "?").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{s.worker.full_name}</p>
                          {s.worker.department && (
                            <Badge variant="secondary" className="text-[10px] bg-white/[0.06] text-white/40 border-0 mt-0.5">
                              {s.worker.department}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">{s.clientName}</td>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">{s.worker.role_title || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-white font-medium">{s.hoursThisPeriod}h</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-white font-medium">{s.appointmentsCompleted}</span>
                      {s.appointmentsTotal > 0 && (
                        <span className="text-white/40 text-xs ml-1">/ {s.appointmentsTotal}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`font-medium ${s.dealsWon > 0 ? "text-emerald-400" : "text-white/40"}`}>
                        {s.dealsWon}
                      </span>
                      {s.dealsAssigned > 0 && (
                        <span className="text-white/40 text-xs ml-1">/ {s.dealsAssigned}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-white font-medium">{s.tasksCompleted}</span>
                      {s.tasksTotal > 0 && (
                        <span className="text-white/40 text-xs ml-1">/ {s.tasksTotal}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">{s.meetingsLogged}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`font-medium ${s.earningsThisPeriod > 0 ? "text-emerald-400" : "text-white/40"}`}>
                        {s.earningsThisPeriod > 0 ? `$${s.earningsThisPeriod.toLocaleString()}` : "—"}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
