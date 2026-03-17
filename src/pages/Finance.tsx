import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { MetricCard } from "@/components/MetricCard";
import { SetupBanner } from "@/components/SetupBanner";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Users, FileText, Plus, Check, Clock, AlertCircle, ArrowUpRight, CreditCard, Upload, Calendar, Shield, FolderOpen, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const statusStyle = (s: string) => {
  if (["Paid", "Active", "Ready", "Received", "Generated", "paid", "approved", "ready"].includes(s)) return "bg-primary/10 text-primary border-primary/20";
  if (["Awaiting Approval", "Upcoming", "In Progress", "Pending Review", "draft", "awaiting_approval", "missing"].includes(s)) return "bg-accent/10 text-accent border-accent/20";
  if (["Missing", "Error", "Overdue", "error"].includes(s)) return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-muted text-muted-foreground border-border";
};

export default function Finance() {
  const { activeClientId } = useWorkspace();
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [filingItems, setFilingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [newAdj, setNewAdj] = useState({ type: "revenue", amount: "", reason: "" });

  const fetchData = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [adjRes, prRes, tmRes, frRes] = await Promise.all([
      supabase.from("financial_adjustments").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("payroll_runs").select("*").eq("client_id", activeClientId).order("pay_period_start", { ascending: false }),
      supabase.from("team_members" as any).select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("filing_readiness").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
    ]);
    setAdjustments(adjRes.data || []);
    setPayrollRuns(prRes.data || []);
    setTeamMembers(tmRes.data || []);
    setFilingItems(frRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeClientId]);

  const addAdjustment = async () => {
    if (!activeClientId || !newAdj.amount) return;
    const { error } = await supabase.from("financial_adjustments").insert({
      client_id: activeClientId,
      type: newAdj.type,
      amount: parseFloat(newAdj.amount) || 0,
      reason: newAdj.reason || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("crm_activities").insert({
      client_id: activeClientId, activity_type: "financial_adjustment",
      activity_note: `${newAdj.type} adjustment: $${newAdj.amount} — ${newAdj.reason || "No reason"}`,
    });
    toast({ title: "Adjustment Added" });
    setNewAdj({ type: "revenue", amount: "", reason: "" });
    setAdjustOpen(false);
    fetchData();
  };

  const revenueAdj = adjustments.filter(a => a.type === "revenue");
  const totalRevenue = revenueAdj.reduce((s, a) => s + Number(a.amount), 0);
  const totalPayroll = payrollRuns.reduce((s, p) => s + (Number(p.total_final_pay) || 0), 0);
  const hasData = adjustments.length > 0 || payrollRuns.length > 0;

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Finance" description="Revenue tracking, payroll, and financial management" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6"><p className="text-muted-foreground">Select a workspace to view Finance.</p></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Finance" description="Revenue tracking, payroll, tax operations, and financial management" />

      <ModuleHelpPanel
        moduleName="Finance"
        description="Track revenue, manage payroll runs, log manual adjustments, and monitor filing readiness — all in one place. Revenue and payroll data flows automatically from the Workforce module. Manual adjustments are fully audited."
        tips={[
          "Revenue entries track income from deals, services, and manual sources",
          "Payroll runs are generated from approved timesheets in Workforce",
          "Manual adjustments (bonuses, deductions, refunds) are logged with audit trails",
          "Filing Readiness tracks tax-prep documents and compliance checklist items",
        ]}
      />

      {!hasData && (
        <SetupBanner icon={DollarSign} title="Set Up Financial Tracking"
          description="Track revenue, manage payroll, and prepare for tax filing. Add adjustments and payroll runs to get started."
          actionLabel="Add Revenue Entry" onAction={() => setAdjustOpen(true)} />
      )}

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Total Revenue" value={hasData ? `$${totalRevenue.toLocaleString()}` : "—"} change={hasData ? `${revenueAdj.length} entries` : "Track revenue"} icon={DollarSign} />
        <MetricCard label="Total Payroll" value={payrollRuns.length > 0 ? `$${totalPayroll.toLocaleString()}` : "—"} change={payrollRuns.length > 0 ? `${payrollRuns.length} runs` : "—"} icon={Users} />
        <MetricCard label="Adjustments" value={String(adjustments.length)} change="" icon={ArrowUpRight} />
        <MetricCard label="Filing Items" value={String(filingItems.length)} change={filingItems.filter(f => f.status === "ready").length + " ready"} icon={ClipboardCheck} />
      </WidgetGrid>

      <Tabs defaultValue="revenue" className="mt-6">
        <TabsList className="bg-card border border-border flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs">Payroll</TabsTrigger>
          <TabsTrigger value="adjustments" className="text-xs">Adjustments</TabsTrigger>
          <TabsTrigger value="filing" className="text-xs">Filing Readiness</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="mt-4">
          <DataCard title="Revenue Entries">
            {revenueAdj.length === 0 ? (
              <div className="py-8 text-center">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <DollarSign className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No revenue tracked yet</p>
                <p className="text-xs text-muted-foreground mb-4">Add revenue entries or connect Stripe to track automatically.</p>
                <Button size="sm" onClick={() => setAdjustOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Entry</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {revenueAdj.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-primary/10">
                        <ArrowUpRight className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">${Number(a.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{a.reason || "No reason"}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </DataCard>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="mt-4">
          <DataCard title="Payroll Runs">
            {payrollRuns.length === 0 ? (
              <div className="py-8 text-center">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <Users className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No payroll runs yet</p>
                <p className="text-xs text-muted-foreground">Payroll runs will appear here once created.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payrollRuns.map((run, i) => (
                  <motion.div key={run.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="card-widget p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-primary/10">
                        {run.payroll_status === "paid" ? <Check className="h-4 w-4 text-primary" /> : <Clock className="h-4 w-4 text-accent" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{new Date(run.pay_period_start).toLocaleDateString()} – {new Date(run.pay_period_end).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground">Gross: ${Number(run.total_gross_pay || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-foreground">${Number(run.total_final_pay || 0).toLocaleString()}</span>
                      <Badge variant="outline" className={statusStyle(run.payroll_status)}>{run.payroll_status}</Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </DataCard>
        </TabsContent>

        {/* Adjustments Tab */}
        <TabsContent value="adjustments" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Manual Adjustments</h3>
            <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" /> Add Adjustment</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle className="text-foreground">Add Manual Adjustment</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div><Label>Type</Label>
                    <Select value={newAdj.type} onValueChange={v => setNewAdj(p => ({ ...p, type: v }))}>
                      <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="bonus">Bonus</SelectItem>
                        <SelectItem value="deduction">Deduction</SelectItem>
                        <SelectItem value="refund">Refund</SelectItem>
                        <SelectItem value="tax_adjustment">Tax Adjustment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Amount ($)</Label><Input type="number" value={newAdj.amount} onChange={e => setNewAdj(p => ({ ...p, amount: e.target.value }))} className="bg-background border-border" /></div>
                  <div><Label>Reason</Label><Textarea value={newAdj.reason} onChange={e => setNewAdj(p => ({ ...p, reason: e.target.value }))} className="bg-background border-border" /></div>
                  <Button className="w-full" onClick={addAdjustment}>Save Adjustment</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <DataCard title="All Adjustments">
            {adjustments.length === 0 ? (
              <div className="py-8 text-center"><p className="text-sm text-muted-foreground">No adjustments yet.</p></div>
            ) : (
              <div className="space-y-3">
                {adjustments.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="card-widget p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${Number(a.amount) >= 0 ? "bg-primary/10" : "bg-accent/10"}`}>
                        {Number(a.amount) >= 0 ? <ArrowUpRight className="h-4 w-4 text-primary" /> : <AlertCircle className="h-4 w-4 text-accent" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground capitalize">{a.type}</p>
                        <p className="text-xs text-muted-foreground">{a.reason || "No reason"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-semibold ${Number(a.amount) >= 0 ? "text-primary" : "text-accent"}`}>
                        {Number(a.amount) >= 0 ? "+" : ""}${Number(a.amount).toLocaleString()}
                      </span>
                      <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </DataCard>
        </TabsContent>

        {/* Filing Readiness Tab */}
        <TabsContent value="filing" className="mt-4">
          <DataCard title="Filing Readiness">
            {filingItems.length === 0 ? (
              <div className="py-8 text-center"><p className="text-sm text-muted-foreground">No filing readiness items configured. These are created during workspace provisioning.</p></div>
            ) : (
              <div className="space-y-3">
                {filingItems.map((f, i) => (
                  <motion.div key={f.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="card-widget p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${f.status === "ready" ? "bg-primary/10" : f.status === "missing" ? "bg-destructive/10" : "bg-accent/10"}`}>
                        {f.status === "ready" ? <Check className="h-4 w-4 text-primary" /> : f.status === "missing" ? <AlertCircle className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4 text-accent" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{f.item_name}</p>
                        <p className="text-xs text-muted-foreground">{f.category}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={statusStyle(f.status)}>{f.status}</Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </DataCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
