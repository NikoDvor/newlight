import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { CreditCard, Receipt, CheckCircle, Clock } from "lucide-react";

const services = [
  { name: "SEO Management", status: "Active", price: "$1,200/mo", next: "Apr 1, 2026" },
  { name: "Google Ads Management", status: "Active", price: "$800/mo", next: "Apr 1, 2026" },
  { name: "Social Media Management", status: "Active", price: "$950/mo", next: "Apr 1, 2026" },
  { name: "Website Maintenance", status: "Paused", price: "$400/mo", next: "—" },
];

const invoices = [
  { id: "INV-2026-012", date: "Mar 1, 2026", amount: "$2,950", status: "Paid" },
  { id: "INV-2026-011", date: "Feb 1, 2026", amount: "$2,950", status: "Paid" },
  { id: "INV-2026-010", date: "Jan 1, 2026", amount: "$3,350", status: "Paid" },
  { id: "INV-2025-009", date: "Dec 1, 2025", amount: "$3,350", status: "Paid" },
];

export default function Billing() {
  return (
    <div>
      <PageHeader title="Billing" description="Manage services, invoices, and payment history" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Active Services" value="3" change="1 paused" changeType="neutral" icon={CheckCircle} />
        <MetricCard label="Monthly Total" value="$2,950" change="Next billing: Apr 1" changeType="neutral" icon={CreditCard} />
        <MetricCard label="Invoices" value="12" change="All paid" changeType="positive" icon={Receipt} />
        <MetricCard label="Subscription Status" value="Active" change="Since Jan 2025" changeType="positive" icon={Clock} />
      </WidgetGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DataCard title="Active Services">
          <div className="space-y-3">
            {services.map((s) => (
              <div key={s.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">Next billing: {s.next}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium tabular-nums">{s.price}</p>
                  <span className={`text-xs font-medium ${s.status === "Active" ? "text-emerald-600" : "text-muted-foreground"}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Invoice History">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground py-3">Invoice</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3">Date</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3">Amount</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                  <td className="text-sm font-medium py-3">{inv.id}</td>
                  <td className="text-sm text-muted-foreground py-3">{inv.date}</td>
                  <td className="text-sm font-medium text-right py-3 tabular-nums">{inv.amount}</td>
                  <td className="text-right py-3">
                    <span className="text-xs font-medium px-2 py-1 rounded-md bg-emerald-50 text-emerald-600">{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataCard>
      </div>
    </div>
  );
}
