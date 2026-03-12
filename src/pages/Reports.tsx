import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { MetricCard } from "@/components/MetricCard";
import { FileText, BarChart3, TrendingUp, Globe } from "lucide-react";

const reports = [
  { title: "Weekly Performance Report", date: "Mar 10, 2026", type: "Performance", status: "Ready" },
  { title: "Traffic Analysis — February", date: "Mar 1, 2026", type: "Traffic", status: "Ready" },
  { title: "Campaign ROI Report", date: "Feb 28, 2026", type: "Campaign", status: "Ready" },
  { title: "Q1 Marketing Summary", date: "Feb 15, 2026", type: "Quarterly", status: "In Progress" },
];

export default function Reports() {
  return (
    <div>
      <PageHeader title="Reports" description="Access marketing reports and performance summaries" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Reports Generated" value="24" change="This quarter" changeType="neutral" icon={FileText} />
        <MetricCard label="Marketing Metrics" value="142" change="Tracked across channels" changeType="neutral" icon={BarChart3} />
        <MetricCard label="Traffic Reports" value="12" change="Monthly reports" changeType="neutral" icon={Globe} />
        <MetricCard label="Growth Score" value="87%" change="+5% this quarter" changeType="positive" icon={TrendingUp} />
      </WidgetGrid>

      <DataCard title="Available Reports" className="mt-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground py-3">Report</th>
              <th className="text-left text-xs font-medium text-muted-foreground py-3">Type</th>
              <th className="text-left text-xs font-medium text-muted-foreground py-3">Date</th>
              <th className="text-right text-xs font-medium text-muted-foreground py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.title} className="border-b border-border last:border-0 hover:bg-secondary transition-colors cursor-pointer">
                <td className="text-sm font-medium py-3">{r.title}</td>
                <td className="text-sm text-muted-foreground py-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-secondary">{r.type}</span>
                </td>
                <td className="text-sm text-muted-foreground py-3">{r.date}</td>
                <td className="text-right py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${r.status === "Ready" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataCard>
    </div>
  );
}
