import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, CreditCard, Receipt, FileText, ShieldCheck, TrendingUp, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const statusColor: Record<string, string> = {
  Active: "bg-emerald-500/20 text-emerald-400",
  Paid: "bg-emerald-500/20 text-emerald-400",
  Succeeded: "bg-emerald-500/20 text-emerald-400",
  Signed: "bg-emerald-500/20 text-emerald-400",
  "Pending Setup": "bg-amber-500/20 text-amber-400",
  "Pending Payment": "bg-amber-500/20 text-amber-400",
  Draft: "bg-white/10 text-white/50",
  Issued: "bg-sky-500/20 text-sky-400",
  Sent: "bg-sky-500/20 text-sky-400",
  "Past Due": "bg-red-500/20 text-red-400",
  Failed: "bg-red-500/20 text-red-400",
  Delinquent: "bg-red-500/20 text-red-400",
  Cancelled: "bg-white/10 text-white/40",
  Expired: "bg-white/10 text-white/40",
};

function SBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={`border-0 text-[10px] font-semibold ${statusColor[status] || "bg-white/10 text-white/50"}`}>{status}</Badge>;
}

export default function AdminBilling() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ mrr: 0, setupCollected: 0, activeSubs: 0, pastDue: 0, totalInvoiced: 0, totalPaid: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from("billing_accounts").select("*, clients(business_name)").order("created_at", { ascending: false }).then(r => setAccounts(r.data ?? [])),
      supabase.from("subscriptions").select("*, clients(business_name)").order("created_at", { ascending: false }).then(r => {
        const data = r.data ?? [];
        setSubs(data);
        const active = data.filter((s: any) => s.subscription_status === "Active");
        const pastDue = data.filter((s: any) => s.subscription_status === "Past Due");
        const mrr = active.reduce((sum: number, s: any) => sum + Number(s.monthly_amount || 0), 0);
        setMetrics(prev => ({ ...prev, mrr, activeSubs: active.length, pastDue: pastDue.length }));
      }),
      supabase.from("invoices").select("*, clients(business_name)").order("created_at", { ascending: false }).then(r => {
        const data = r.data ?? [];
        setInvoices(data);
        const totalInvoiced = data.reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
        const totalPaid = data.filter((i: any) => i.invoice_status === "Paid").reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
        const setupCollected = data.filter((i: any) => i.invoice_type === "Setup Fee" && i.invoice_status === "Paid").reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
        setMetrics(prev => ({ ...prev, totalInvoiced, totalPaid, setupCollected }));
      }),
      supabase.from("payment_records").select("*, clients(business_name)").order("created_at", { ascending: false }).then(r => setPayments(r.data ?? [])),
      supabase.from("contract_records").select("*, clients(business_name)").order("created_at", { ascending: false }).then(r => setContracts(r.data ?? [])),
    ]);
  }, []);

  const stats = [
    { label: "Monthly Recurring", value: `$${metrics.mrr.toLocaleString()}`, icon: TrendingUp, color: "hsl(var(--nl-neon))" },
    { label: "Active Subscriptions", value: metrics.activeSubs.toString(), icon: CreditCard, color: "hsl(var(--nl-sky))" },
    { label: "Setup Fees Collected", value: `$${metrics.setupCollected.toLocaleString()}`, icon: DollarSign, color: "hsl(var(--nl-cyan))" },
    { label: "Total Invoiced", value: `$${metrics.totalInvoiced.toLocaleString()}`, icon: Receipt, color: "hsl(var(--nl-electric))" },
    { label: "Total Paid", value: `$${metrics.totalPaid.toLocaleString()}`, icon: ShieldCheck, color: "hsl(var(--nl-neon))" },
    { label: "Past Due", value: metrics.pastDue.toString(), icon: FileText, color: metrics.pastDue > 0 ? "#ef4444" : "hsl(var(--nl-sky))" },
  ];

  const cellCls = "text-sm text-white/70 py-3 px-4";
  const headCls = "text-[10px] text-white/40 uppercase tracking-wider font-semibold py-3 px-4 text-left";

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue & Billing</h1>
          <p className="text-sm text-white/50 mt-1">Billing accounts, subscriptions, invoices, and payments</p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 bg-white/[0.04] backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList className="bg-white/[0.04] border border-white/[0.06]">
          <TabsTrigger value="accounts" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10">Accounts</TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10">Subscriptions</TabsTrigger>
          <TabsTrigger value="invoices" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10">Invoices</TabsTrigger>
          <TabsTrigger value="payments" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10">Payments</TabsTrigger>
          <TabsTrigger value="contracts" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10">Contracts</TabsTrigger>
        </TabsList>

        {/* ACCOUNTS */}
        <TabsContent value="accounts">
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Billing Accounts</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              {accounts.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-8">No billing accounts yet. They are created automatically when proposals are accepted.</p>
              ) : (
                <table className="w-full">
                  <thead><tr className="border-b border-white/[0.06]">
                    <th className={headCls}>Company</th><th className={headCls}>Status</th><th className={headCls}>Email</th><th className={headCls}>Created</th>
                  </tr></thead>
                  <tbody>
                    {accounts.map((a: any) => (
                      <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className={cellCls + " font-medium text-white"}>{(a.clients as any)?.business_name || "—"}</td>
                        <td className={cellCls}><SBadge status={a.billing_status} /></td>
                        <td className={cellCls}>{a.billing_email || "—"}</td>
                        <td className={cellCls}>{new Date(a.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUBSCRIPTIONS */}
        <TabsContent value="subscriptions">
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Subscriptions</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              {subs.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-8">No subscriptions yet.</p>
              ) : (
                <table className="w-full">
                  <thead><tr className="border-b border-white/[0.06]">
                    <th className={headCls}>Name</th><th className={headCls}>Company</th><th className={headCls}>Status</th><th className={headCls}>Monthly</th><th className={headCls}>Setup Fee</th><th className={headCls}>Term</th><th className={headCls}>Next Invoice</th>
                  </tr></thead>
                  <tbody>
                    {subs.map((s: any) => (
                      <tr key={s.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className={cellCls + " font-medium text-white"}>{s.subscription_name}</td>
                        <td className={cellCls}>{(s.clients as any)?.business_name || "—"}</td>
                        <td className={cellCls}><SBadge status={s.subscription_status} /></td>
                        <td className={cellCls + " tabular-nums"}>${Number(s.monthly_amount || 0).toLocaleString()}</td>
                        <td className={cellCls + " tabular-nums"}>${Number(s.setup_fee_amount || 0).toLocaleString()}</td>
                        <td className={cellCls}>{s.contract_length_months}mo</td>
                        <td className={cellCls}>{s.next_invoice_date || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVOICES */}
        <TabsContent value="invoices">
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Invoices</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              {invoices.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-8">No invoices yet.</p>
              ) : (
                <table className="w-full">
                  <thead><tr className="border-b border-white/[0.06]">
                    <th className={headCls}>Invoice #</th><th className={headCls}>Company</th><th className={headCls}>Type</th><th className={headCls}>Status</th><th className={headCls}>Total</th><th className={headCls}>Due Date</th><th className={headCls}>Paid At</th>
                  </tr></thead>
                  <tbody>
                    {invoices.map((inv: any) => (
                      <tr key={inv.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className={cellCls + " font-medium text-white"}>{inv.invoice_number}</td>
                        <td className={cellCls}>{(inv.clients as any)?.business_name || "—"}</td>
                        <td className={cellCls}>{inv.invoice_type}</td>
                        <td className={cellCls}><SBadge status={inv.invoice_status} /></td>
                        <td className={cellCls + " tabular-nums"}>${Number(inv.total_amount || 0).toLocaleString()}</td>
                        <td className={cellCls}>{inv.due_date || "—"}</td>
                        <td className={cellCls}>{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYMENTS */}
        <TabsContent value="payments">
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Payment Records</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              {payments.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-8">No payment records yet.</p>
              ) : (
                <table className="w-full">
                  <thead><tr className="border-b border-white/[0.06]">
                    <th className={headCls}>Company</th><th className={headCls}>Provider</th><th className={headCls}>Method</th><th className={headCls}>Status</th><th className={headCls}>Amount</th><th className={headCls}>Date</th>
                  </tr></thead>
                  <tbody>
                    {payments.map((p: any) => (
                      <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className={cellCls + " font-medium text-white"}>{(p.clients as any)?.business_name || "—"}</td>
                        <td className={cellCls}>{p.payment_provider}</td>
                        <td className={cellCls}>{p.payment_method_type}</td>
                        <td className={cellCls}><SBadge status={p.payment_status} /></td>
                        <td className={cellCls + " tabular-nums"}>${Number(p.amount || 0).toLocaleString()}</td>
                        <td className={cellCls}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTRACTS */}
        <TabsContent value="contracts">
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Contract Records</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              {contracts.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-8">No contracts yet.</p>
              ) : (
                <table className="w-full">
                  <thead><tr className="border-b border-white/[0.06]">
                    <th className={headCls}>Company</th><th className={headCls}>Status</th><th className={headCls}>Term</th><th className={headCls}>Start</th><th className={headCls}>End</th><th className={headCls}>Auto-Renew</th><th className={headCls}>Enforcement</th>
                  </tr></thead>
                  <tbody>
                    {contracts.map((c: any) => (
                      <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className={cellCls + " font-medium text-white"}>{(c.clients as any)?.business_name || "—"}</td>
                        <td className={cellCls}><SBadge status={c.contract_status} /></td>
                        <td className={cellCls}>{c.contract_length_months}mo</td>
                        <td className={cellCls}>{c.start_date || "—"}</td>
                        <td className={cellCls}>{c.end_date || "—"}</td>
                        <td className={cellCls}>{c.auto_renew ? "Yes" : "No"}</td>
                        <td className={cellCls}>{c.enforcement_mode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
