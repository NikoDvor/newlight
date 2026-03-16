import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Clock, DollarSign, Users, TrendingUp, AlertTriangle } from "lucide-react";

interface Worker {
  id: string; full_name: string; department: string | null; hourly_rate: number | null;
  overtime_eligible: boolean; pay_type: string;
}
interface TimeEntry {
  id: string; worker_id: string; entry_date: string; total_minutes: number;
  entry_status: string; billable_status: string | null; labor_category: string | null;
  linked_module: string | null; timesheet_id: string | null;
}
interface Timesheet {
  id: string; worker_id: string; status: string; total_hours: number;
  total_overtime_hours: number; submitted_at: string | null; pay_period_start: string; pay_period_end: string;
}
interface PayrollRun {
  id: string; payroll_status: string; gross_pay_total: number; net_pay_total: number;
  total_gross_pay: number; total_final_pay: number; paid_at: string | null;
  pay_period_start: string; pay_period_end: string;
}
interface Payout {
  id: string; payout_status: string; payout_amount: number;
}

const fmtCurrency = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function ReportCard({ icon: Icon, label, value, sub, color = "text-primary" }: { icon: any; label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4 flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10 shrink-0`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function WorkforceReports({ workers, entries, timesheets, payrollRuns, payouts }: {
  workers: Worker[]; entries: TimeEntry[]; timesheets: Timesheet[];
  payrollRuns: PayrollRun[]; payouts: Payout[];
}) {
  const now = new Date();
  const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisYearStart = new Date(now.getFullYear(), 0, 1);

  const hoursThisWeek = useMemo(() => entries.filter(e => new Date(e.entry_date) >= thisWeekStart).reduce((s, e) => s + (e.total_minutes || 0), 0) / 60, [entries]);
  const hoursThisMonth = useMemo(() => entries.filter(e => new Date(e.entry_date) >= thisMonthStart).reduce((s, e) => s + (e.total_minutes || 0), 0) / 60, [entries]);

  const paidRuns = payrollRuns.filter(r => r.payroll_status?.toLowerCase() === "paid");
  const payrollThisMonth = useMemo(() => paidRuns.filter(r => r.paid_at && new Date(r.paid_at) >= thisMonthStart).reduce((s, r) => s + (r.net_pay_total || r.total_final_pay || 0), 0), [paidRuns]);
  const payrollThisYear = useMemo(() => paidRuns.filter(r => r.paid_at && new Date(r.paid_at) >= thisYearStart).reduce((s, r) => s + (r.net_pay_total || r.total_final_pay || 0), 0), [paidRuns]);
  const lifetimePayroll = useMemo(() => paidRuns.reduce((s, r) => s + (r.net_pay_total || r.total_final_pay || 0), 0), [paidRuns]);

  const totalOvertimeHours = useMemo(() => timesheets.reduce((s, t) => s + (t.total_overtime_hours || 0), 0), [timesheets]);
  const unsubmittedTimesheets = timesheets.filter(t => t.status === "Open").length;

  const payoutsCompleted = payouts.filter(p => p.payout_status === "Completed").length;
  const payoutsPending = payouts.filter(p => ["Pending", "Processing"].includes(p.payout_status)).length;

  // Labor cost by department
  const byDept = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach(e => {
      const w = workers.find(w => w.id === e.worker_id);
      const dept = w?.department || "Unassigned";
      map.set(dept, (map.get(dept) || 0) + (e.total_minutes || 0) / 60);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [entries, workers]);

  // Labor by service category
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach(e => {
      const cat = e.labor_category || "Uncategorized";
      map.set(cat, (map.get(cat) || 0) + (e.total_minutes || 0) / 60);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [entries]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <ReportCard icon={Clock} label="Hours This Week" value={`${hoursThisWeek.toFixed(1)}h`} />
        <ReportCard icon={Clock} label="Hours This Month" value={`${hoursThisMonth.toFixed(1)}h`} />
        <ReportCard icon={DollarSign} label="Payroll This Month" value={fmtCurrency(payrollThisMonth)} />
        <ReportCard icon={DollarSign} label="Payroll This Year" value={fmtCurrency(payrollThisYear)} />
        <ReportCard icon={DollarSign} label="Lifetime Payroll" value={fmtCurrency(lifetimePayroll)} />
        <ReportCard icon={AlertTriangle} label="Total Overtime" value={`${totalOvertimeHours.toFixed(1)}h`} color="text-amber-500" />
        <ReportCard icon={BarChart3} label="Payout Status" value={`${payoutsCompleted} completed`} sub={`${payoutsPending} pending`} />
        <ReportCard icon={Users} label="Timesheet Compliance" value={`${unsubmittedTimesheets} unsubmitted`} sub={`${timesheets.filter(t => t.status === "Approved").length} approved`} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <p className="text-sm font-medium flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> Hours by Department</p>
            {byDept.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : byDept.map(([dept, hrs]) => (
              <div key={dept} className="flex justify-between text-sm">
                <span>{dept}</span>
                <span className="font-medium">{hrs.toFixed(1)}h</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <p className="text-sm font-medium flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-primary" /> Hours by Service Category</p>
            {byCategory.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : byCategory.map(([cat, hrs]) => (
              <div key={cat} className="flex justify-between text-sm">
                <span>{cat}</span>
                <span className="font-medium">{hrs.toFixed(1)}h</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
