import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Receipt, CheckCircle, Clock, FileText, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const statusColor: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-600",
  Paid: "bg-emerald-50 text-emerald-600",
  Signed: "bg-emerald-50 text-emerald-600",
  "Pending Setup": "bg-amber-50 text-amber-600",
  "Pending Payment": "bg-amber-50 text-amber-600",
  Issued: "bg-sky-50 text-sky-600",
  Sent: "bg-sky-50 text-sky-600",
  "Past Due": "bg-red-50 text-red-600",
  Failed: "bg-red-50 text-red-600",
  Draft: "bg-muted text-muted-foreground",
  Cancelled: "bg-muted text-muted-foreground",
};

export default function Billing() {
  const { activeClientId } = useWorkspace();
  const [sub, setSub] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contract, setContract] = useState<any>(null);
  const [billingAccount, setBillingAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    Promise.all([
      supabase.from("billing_accounts").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(1).maybeSingle().then(r => setBillingAccount(r.data)),
      supabase.from("subscriptions").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(1).maybeSingle().then(r => setSub(r.data)),
      supabase.from("invoices").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(10).then(r => setInvoices(r.data ?? [])),
      supabase.from("contract_records").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(1).maybeSingle().then(r => setContract(r.data)),
    ]).finally(() => setLoading(false));
  }, [activeClientId]);

  if (loading) return <div className="p-8 text-muted-foreground text-sm">Loading billing…</div>;

  const hasData = !!billingAccount;
  const monthlyAmount = sub ? `$${Number(sub.monthly_amount || 0).toLocaleString()}` : "—";
  const subStatus = sub?.subscription_status || "—";
  const contractStatus = contract?.contract_status || "—";
  const paidCount = invoices.filter(i => i.invoice_status === "Paid").length;

  return (
    <div>
      <PageHeader title="Billing" description="Your plan, invoices, and payment status" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Billing Status" value={billingAccount?.billing_status || "Not Set Up"} change={hasData ? "Account active" : "Pending"} changeType={hasData ? "positive" : "neutral"} icon={CheckCircle} />
        <MetricCard label="Monthly Amount" value={monthlyAmount} change={sub ? `Next: ${sub.next_invoice_date || "TBD"}` : "No subscription"} changeType="neutral" icon={CreditCard} />
        <MetricCard label="Invoices" value={invoices.length.toString()} change={`${paidCount} paid`} changeType="positive" icon={Receipt} />
        <MetricCard label="Contract" value={contractStatus} change={contract ? `${contract.contract_length_months}mo term` : "No contract"} changeType={contract ? "positive" : "neutral"} icon={Clock} />
      </WidgetGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Current Plan */}
        <DataCard title="Current Plan">
          {sub ? (
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Package</span>
                <span className="text-sm font-medium">{sub.subscription_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-md ${statusColor[subStatus] || "bg-muted text-muted-foreground"}`}>{subStatus}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Monthly</span>
                <span className="text-sm font-medium tabular-nums">{monthlyAmount}/mo</span>
              </div>
              {Number(sub.setup_fee_amount) > 0 && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Setup Fee</span>
                  <span className="text-sm font-medium tabular-nums">${Number(sub.setup_fee_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Contract Term</span>
                <span className="text-sm font-medium">{sub.contract_length_months} months</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-muted-foreground">Billing Frequency</span>
                <span className="text-sm font-medium">{sub.billing_frequency}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No active subscription. Your billing will appear here once your plan is set up.</p>
          )}
        </DataCard>

        {/* Invoice History */}
        <DataCard title="Invoice History">
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No invoices yet.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground py-3">Invoice</th>
                  <th className="text-left text-xs font-medium text-muted-foreground py-3">Type</th>
                  <th className="text-right text-xs font-medium text-muted-foreground py-3">Amount</th>
                  <th className="text-right text-xs font-medium text-muted-foreground py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                    <td className="text-sm font-medium py-3">{inv.invoice_number}</td>
                    <td className="text-sm text-muted-foreground py-3">{inv.invoice_type}</td>
                    <td className="text-sm font-medium text-right py-3 tabular-nums">${Number(inv.total_amount || 0).toLocaleString()}</td>
                    <td className="text-right py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-md ${statusColor[inv.invoice_status] || "bg-muted text-muted-foreground"}`}>{inv.invoice_status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DataCard>
      </div>
    </div>
  );
}
