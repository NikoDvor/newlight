import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { MetricCard } from "@/components/MetricCard";
import { motion } from "framer-motion";
import { useState } from "react";
import { DollarSign, TrendingUp, Users, FileText, Plus, Check, Clock, AlertCircle, ArrowUpRight, CreditCard, Upload, Calendar, Shield, FolderOpen, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const monthlyRevenue = [
  { month: "Jan", revenue: 42000 }, { month: "Feb", revenue: 48000 }, { month: "Mar", revenue: 51000 },
  { month: "Apr", revenue: 47000 }, { month: "May", revenue: 55000 }, { month: "Jun", revenue: 62000 },
  { month: "Jul", revenue: 58000 }, { month: "Aug", revenue: 64000 }, { month: "Sep", revenue: 71000 },
  { month: "Oct", revenue: 68000 }, { month: "Nov", revenue: 75000 }, { month: "Dec", revenue: 82000 },
];

const revenueBySource = [
  { name: "Google Ads", value: 185000, color: "hsl(211 96% 56%)" },
  { name: "Organic SEO", value: 142000, color: "hsl(197 92% 68%)" },
  { name: "Referrals", value: 98000, color: "hsl(187 70% 58%)" },
  { name: "Social Media", value: 67000, color: "hsl(222 68% 44%)" },
  { name: "Direct", value: 45000, color: "hsl(210 55% 86%)" },
];

const revenueByService = [
  { service: "Consulting", revenue: 220000 },
  { service: "Services", revenue: 180000 },
  { service: "Products", revenue: 95000 },
  { service: "Maintenance", revenue: 42000 },
];

const teamMembers = [
  { name: "Sarah Johnson", role: "Manager", payType: "Salary", rate: "$6,500/mo", status: "Active" },
  { name: "Mike Chen", role: "Sales Rep", payType: "Salary + Commission", rate: "$4,200/mo + 8%", status: "Active" },
  { name: "Lisa Park", role: "Specialist", payType: "Hourly", rate: "$45/hr", status: "Active" },
  { name: "James Wilson", role: "Contractor", payType: "Contractor Flat Rate", rate: "$3,000/mo", status: "Active" },
  { name: "Ana Rodriguez", role: "Marketing", payType: "Salary", rate: "$5,800/mo", status: "Active" },
];

const payrollRuns = [
  { period: "Mar 1-15, 2026", status: "Awaiting Approval", gross: "$24,800", final: "$24,200", date: "Mar 16" },
  { period: "Feb 16-28, 2026", status: "Paid", gross: "$24,800", final: "$24,100", date: "Mar 1" },
  { period: "Feb 1-15, 2026", status: "Paid", gross: "$24,500", final: "$23,900", date: "Feb 16" },
  { period: "Jan 16-31, 2026", status: "Paid", gross: "$25,100", final: "$24,500", date: "Feb 1" },
];

const adjustments = [
  { type: "Bonus", amount: "+$2,500", reason: "Q1 performance bonus - Mike Chen", by: "Admin", date: "Mar 10" },
  { type: "Deduction", amount: "-$350", reason: "Equipment advance repayment", by: "Admin", date: "Mar 5" },
  { type: "Revenue Correction", amount: "+$1,200", reason: "Late invoice reconciliation", by: "System", date: "Feb 28" },
];

const taxDeadlines = [
  { title: "Q1 Estimated Tax Payment", date: "Apr 15, 2026", type: "Quarterly", status: "Upcoming", daysLeft: 32 },
  { title: "Payroll Tax Deposit (March)", date: "Apr 15, 2026", type: "Payroll Tax", status: "Upcoming", daysLeft: 32 },
  { title: "Q2 Estimated Tax Payment", date: "Jun 15, 2026", type: "Quarterly", status: "Upcoming", daysLeft: 93 },
  { title: "Year-End W-2/1099 Prep", date: "Jan 31, 2027", type: "Year-End", status: "Pending", daysLeft: 323 },
];

const taxDocuments = [
  { name: "W-9 - James Wilson", type: "W-9", status: "Received", date: "Jan 15, 2026", by: "Admin" },
  { name: "Q4 2025 Revenue Summary", type: "Revenue Summary", status: "Generated", date: "Jan 5, 2026", by: "System" },
  { name: "2025 Payroll Summary", type: "Payroll Summary", status: "Generated", date: "Jan 10, 2026", by: "System" },
  { name: "Contractor Agreement - Lisa Park", type: "Contract", status: "Pending Review", date: "Feb 20, 2026", by: "Admin" },
];

const filingItems = [
  { item: "All W-9s collected", category: "Contractor Records", status: "Ready" },
  { item: "Q4 revenue reconciled", category: "Revenue", status: "Ready" },
  { item: "Payroll tax deposits current", category: "Payroll", status: "In Progress" },
  { item: "1099 preparation", category: "Year-End", status: "Missing" },
  { item: "End-of-year payroll summary", category: "Payroll", status: "Missing" },
  { item: "Revenue by category export", category: "Revenue", status: "Ready" },
];

const statusStyle = (s: string) => {
  if (["Paid", "Active", "Ready", "Received", "Generated"].includes(s)) return "bg-primary/10 text-primary border-primary/20";
  if (["Awaiting Approval", "Upcoming", "In Progress", "Pending Review"].includes(s)) return "bg-accent/10 text-accent border-accent/20";
  if (["Missing", "Error", "Overdue"].includes(s)) return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-muted text-muted-foreground border-border";
};

export default function Finance() {
  const { toast } = useToast();
  const [adjustOpen, setAdjustOpen] = useState(false);

  return (
    <div>
      <PageHeader title="Finance" description="Revenue tracking, payroll, tax operations, and financial management" />

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Revenue This Month" value="$82,400" change="+12.4%" icon={DollarSign} />
        <MetricCard label="Revenue This Year" value="$723,000" change="+18.2%" icon={TrendingUp} />
        <MetricCard label="Lifetime Revenue" value="$2.14M" change="" icon={ArrowUpRight} />
        <MetricCard label="Avg Per Deal" value="$4,820" change="+5.1%" icon={CreditCard} />
        <MetricCard label="Payroll This Period" value="$24,800" change="" icon={Users} />
      </WidgetGrid>

      <Tabs defaultValue="revenue" className="mt-6">
        <TabsList className="bg-card border border-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs">Payroll</TabsTrigger>
          <TabsTrigger value="team" className="text-xs">Team</TabsTrigger>
          <TabsTrigger value="adjustments" className="text-xs">Adjustments</TabsTrigger>
          <TabsTrigger value="tax" className="text-xs">Tax Operations</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs">Document Vault</TabsTrigger>
          <TabsTrigger value="filing" className="text-xs">Filing Readiness</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs">Reports</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="mt-4 space-y-6">
          <WidgetGrid columns="1fr 1fr">
            <DataCard title="Monthly Revenue Trend">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(211 96% 56%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(211 96% 56%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 28% 89%)" />
                    <XAxis dataKey="month" stroke="hsl(215 16% 50%)" fontSize={12} />
                    <YAxis stroke="hsl(215 16% 50%)" fontSize={12} tickFormatter={v => `$${v / 1000}k`} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(211 96% 56%)" fill="url(#revGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </DataCard>

            <DataCard title="Revenue by Source">
              <div className="h-64 flex items-center gap-4">
                <div className="w-1/2">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={revenueBySource} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={2}>
                        {revenueBySource.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-2">
                  {revenueBySource.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-muted-foreground flex-1">{s.name}</span>
                      <span className="font-medium text-foreground">${(s.value / 1000).toFixed(0)}k</span>
                    </div>
                  ))}
                </div>
              </div>
            </DataCard>
          </WidgetGrid>

          <DataCard title="Revenue by Service">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByService} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 28% 89%)" />
                  <XAxis type="number" stroke="hsl(215 16% 50%)" fontSize={12} tickFormatter={v => `$${v / 1000}k`} />
                  <YAxis type="category" dataKey="service" stroke="hsl(215 16% 50%)" fontSize={12} width={100} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="hsl(211 96% 56%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DataCard>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Payroll Runs</h3>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Payroll Run
            </Button>
          </div>
          <div className="space-y-3">
            {payrollRuns.map((run, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-widget p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10">
                    {run.status === "Paid" ? <Check className="h-4 w-4 text-primary" /> : <Clock className="h-4 w-4 text-accent" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{run.period}</p>
                    <p className="text-xs text-muted-foreground">Due: {run.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{run.final}</p>
                    <p className="text-xs text-muted-foreground">Gross: {run.gross}</p>
                  </div>
                  <Badge variant="outline" className={statusStyle(run.status)}>{run.status}</Badge>
                  {run.status === "Awaiting Approval" && (
                    <Button size="sm" variant="outline" className="text-xs border-primary/20 text-primary hover:bg-primary/5">Approve</Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Team & Compensation</h3>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Team Member
            </Button>
          </div>
          <div className="space-y-3">
            {teamMembers.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-widget p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {m.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{m.rate}</p>
                    <p className="text-xs text-muted-foreground">{m.payType}</p>
                  </div>
                  <Badge variant="outline" className={statusStyle(m.status)}>{m.status}</Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Adjustments Tab */}
        <TabsContent value="adjustments" className="mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Manual Adjustments</h3>
            <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Adjustment
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle className="text-foreground">Add Manual Adjustment</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-foreground">Type</Label>
                    <Select>
                      <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Revenue Correction</SelectItem>
                        <SelectItem value="bonus">Bonus</SelectItem>
                        <SelectItem value="deduction">Deduction</SelectItem>
                        <SelectItem value="refund">Refund</SelectItem>
                        <SelectItem value="tax_adjustment">Tax Adjustment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-foreground">Amount ($)</Label>
                    <Input type="number" placeholder="0.00" className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-foreground">Reason</Label>
                    <Textarea placeholder="Reason for adjustment..." className="bg-background border-border" />
                  </div>
                  <Button className="w-full bg-primary text-primary-foreground" onClick={() => { toast({ title: "Adjustment added", description: "Logged in audit trail." }); setAdjustOpen(false); }}>Save Adjustment</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {adjustments.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-widget p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${a.amount.startsWith("+") ? "bg-primary/10" : "bg-accent/10"}`}>
                    {a.amount.startsWith("+") ? <ArrowUpRight className="h-4 w-4 text-primary" /> : <AlertCircle className="h-4 w-4 text-accent" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.type}</p>
                    <p className="text-xs text-muted-foreground">{a.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-semibold ${a.amount.startsWith("+") ? "text-primary" : "text-accent"}`}>{a.amount}</span>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{a.by}</p>
                    <p className="text-xs text-muted-foreground">{a.date}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Tax Operations Tab */}
        <TabsContent value="tax" className="mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Tax Operations</h3>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">Tax-Prep Management</Badge>
          </div>

          <WidgetGrid columns="repeat(auto-fit, minmax(240px, 1fr))">
            <MetricCard label="Next Tax Deadline" value="Apr 15" change="32 days" icon={Calendar} />
            <MetricCard label="Documents Collected" value="4 / 6" change="67%" icon={FolderOpen} />
            <MetricCard label="Filing Readiness" value="67%" change="In Progress" icon={ClipboardCheck} />
            <MetricCard label="Estimated Q1 Tax" value="$18,400" change="" icon={Shield} />
          </WidgetGrid>

          <DataCard title="Tax Deadlines & Reminders">
            <div className="space-y-3">
              {taxDeadlines.map((d, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${d.daysLeft <= 30 ? "bg-accent/10" : "bg-primary/10"}`}>
                      <Calendar className={`h-4 w-4 ${d.daysLeft <= 30 ? "text-accent" : "text-primary"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{d.title}</p>
                      <p className="text-xs text-muted-foreground">{d.date} · {d.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{d.daysLeft} days</span>
                    <Badge variant="outline" className={statusStyle(d.status)}>{d.status}</Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </DataCard>

          <DataCard title="Accountant Checklist">
            <div className="space-y-2">
              {["Revenue reconciliation complete", "All contractor W-9s collected", "Payroll tax deposits current", "Quarterly estimated payments reviewed", "Expense categorization complete"].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className={`h-5 w-5 rounded-md border flex items-center justify-center ${i < 2 ? "bg-primary/10 border-primary/30" : "border-border"}`}>
                    {i < 2 && <Check className="h-3 w-3 text-primary" />}
                  </div>
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </DataCard>
        </TabsContent>

        {/* Document Vault Tab */}
        <TabsContent value="documents" className="mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Document Vault</h3>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload Document
            </Button>
          </div>
          <div className="space-y-3">
            {taxDocuments.map((d, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-widget p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.type} · Uploaded {d.date} by {d.by}</p>
                  </div>
                </div>
                <Badge variant="outline" className={statusStyle(d.status)}>{d.status}</Badge>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Filing Readiness Tab */}
        <TabsContent value="filing" className="mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Filing Readiness</h3>
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20 text-xs">4 of 6 items ready</Badge>
          </div>
          <div className="space-y-3">
            {filingItems.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card-widget p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${f.status === "Ready" ? "bg-primary/10" : f.status === "Missing" ? "bg-destructive/10" : "bg-accent/10"}`}>
                    {f.status === "Ready" ? <Check className="h-4 w-4 text-primary" /> : f.status === "Missing" ? <AlertCircle className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4 text-accent" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.item}</p>
                    <p className="text-xs text-muted-foreground">{f.category}</p>
                  </div>
                </div>
                <Badge variant="outline" className={statusStyle(f.status)}>{f.status}</Badge>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4">
          <WidgetGrid columns="repeat(auto-fit, minmax(260px, 1fr))">
            {[
              { title: "Monthly Revenue Summary", desc: "Current month breakdown by source and service", icon: DollarSign },
              { title: "Year-to-Date Summary", desc: "Revenue performance vs goals", icon: TrendingUp },
              { title: "Payroll Summary", desc: "Compensation overview and pay history", icon: Users },
              { title: "Revenue vs Payroll", desc: "Profitability snapshot", icon: FileText },
              { title: "Revenue by Channel", desc: "Attribution breakdown", icon: ArrowUpRight },
              { title: "Compensation Report", desc: "Team member pay details", icon: CreditCard },
              { title: "Tax Prep Summary", desc: "Tax deadlines and document status", icon: Shield },
              { title: "Filing Readiness Report", desc: "Accountant handoff checklist", icon: ClipboardCheck },
            ].map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="card-widget p-5 cursor-pointer hover:shadow-[var(--shadow-card-hover)] transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10">
                    <r.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </WidgetGrid>
        </TabsContent>
      </Tabs>
    </div>
  );
}
