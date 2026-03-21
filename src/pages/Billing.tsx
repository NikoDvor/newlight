import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Receipt, CheckCircle, Clock, FileText, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const statusColor: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-600",
  active: "bg-emerald-50 text-emerald-600",
  Paid: "bg-emerald-50 text-emerald-600",
  Signed: "bg-emerald-50 text-emerald-600",
  "Pending Setup": "bg-amber-50 text-amber-600",
  pending_payment: "bg-amber-50 text-amber-600",
  "Pending Payment": "bg-amber-50 text-amber-600",
  awaiting_confirmation: "bg-sky-50 text-sky-600",
  Issued: "bg-sky-50 text-sky-600",
  Sent: "bg-sky-50 text-sky-600",
  "Past Due": "bg-red-50 text-red-600",
  Failed: "bg-red-50 text-red-600",
  Draft: "bg-muted text-muted-foreground",
  Cancelled: "bg-muted text-muted-foreground",
};

const statusLabel: Record<string, string> = {
  active: "Active",
  pending_payment: "Pending Payment",
  awaiting_confirmation: "Awaiting Wire Confirmation",
  "Pending Setup": "Pending Setup",
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
  const billingStatus = billingAccount?.billing_status || "Not Set Up";
  const displayStatus = statusLabel[billingStatus] || billingStatus;

  // Read payment data from canonical billing_accounts columns
  const ba = billingAccount as any;
  const paymentMethod = ba?.payment_method || sub?.billing_frequency || "—";
  const setupFee = ba?.setup_fee || (sub ? sub.setup_fee_amount : null);
  const monthlyFee = ba?.monthly_fee || (sub ? sub.monthly_amount : null);
  const contractTerm = ba?.contract_term || (contract ? `${contract.contract_length_months}mo` : null);
  const wireRef = ba?.wire_reference || null;
  const receiptUrl = ba?.payment_receipt_url || null;
  const internalNotes = ba?.internal_payment_notes || null;
  const servicePackage = ba?.service_package || sub?.subscription_name || null;

  const monthlyAmount = monthlyFee ? `$${Number(monthlyFee).toLocaleString()}` : "—";
  const subStatus = sub?.subscription_status || "—";
  const contractStatus = contract?.contract_status || "—";
  const paidCount = invoices.filter(i => i.invoice_status === "Paid").length;

  const paymentMethodLabel: Record<string, string> = {
    wire_transfer: "Wire Transfer",
    ach: "ACH",
    check: "Check",
    credit_card: "Credit Card",
  };

  return (
    <div>
      <PageHeader title="Billing" description="Your plan, invoices, and payment status" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard
          label="Billing Status"
          value={displayStatus}
          change={hasData ? (billingStatus === "active" ? "Fully active" : "Action needed") : "Pending"}
          changeType={billingStatus === "active" ? "positive" : hasData ? "neutral" : "neutral"}
          icon={CheckCircle}
        />
        <MetricCard label="Monthly Amount" value={monthlyAmount} change={sub ? `Next: ${sub.next_invoice_date || "TBD"}` : "No subscription"} changeType="neutral" icon={CreditCard} />
        <MetricCard label="Invoices" value={invoices.length.toString()} change={`${paidCount} paid`} changeType="positive" icon={Receipt} />
        <MetricCard label="Contract" value={contractStatus} change={contract ? `${contract.contract_length_months}mo term` : contractTerm || "No contract"} changeType={contract || contractTerm ? "positive" : "neutral"} icon={Clock} />
      </WidgetGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Current Plan */}
        <DataCard title="Current Plan">
          {(sub || hasData) ? (
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Package</span>
                <span className="text-sm font-medium">{servicePackage || sub?.subscription_name || "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Billing Status</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-md ${statusColor[billingStatus] || "bg-muted text-muted-foreground"}`}>
                  {displayStatus}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Payment Method</span>
                <span className="text-sm font-medium">{paymentMethodLabel[paymentMethod] || paymentMethod}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Monthly</span>
                <span className="text-sm font-medium tabular-nums">{monthlyAmount}/mo</span>
              </div>
              {Number(setupFee) > 0 && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Setup Fee</span>
                  <span className="text-sm font-medium tabular-nums">${Number(setupFee).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Contract Term</span>
                <span className="text-sm font-medium">{contractTerm || (sub ? `${sub.contract_length_months} months` : "—")}</span>
              </div>
              {wireRef && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Wire Reference</span>
                  <span className="text-sm font-medium font-mono">{wireRef}</span>
                </div>
              )}
              {receiptUrl && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Payment Receipt</span>
                  <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline">View Receipt</a>
                </div>
              )}
              {sub && (
                <div className="flex justify-between py-2">
                  <span className="text-sm text-muted-foreground">Billing Frequency</span>
                  <span className="text-sm font-medium">{sub.billing_frequency}</span>
                </div>
              )}
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
