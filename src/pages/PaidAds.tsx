import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Megaphone, DollarSign, Target, TrendingUp } from "lucide-react";

const campaigns = [
  { name: "Google Ads — Brand Keywords", status: "Active", spend: "$2,450", leads: 89, cpl: "$27.53", roas: "4.2x" },
  { name: "Facebook — Retargeting", status: "Active", spend: "$1,820", leads: 56, cpl: "$32.50", roas: "3.1x" },
  { name: "Google Ads — Competitors", status: "Active", spend: "$3,100", leads: 42, cpl: "$73.81", roas: "2.4x" },
  { name: "Instagram — Awareness", status: "Paused", spend: "$980", leads: 18, cpl: "$54.44", roas: "1.8x" },
  { name: "LinkedIn — B2B Lead Gen", status: "Active", spend: "$1,540", leads: 24, cpl: "$64.17", roas: "3.5x" },
];

export default function PaidAds() {
  return (
    <div>
      <PageHeader title="Paid Ads" description="Track ad performance, spend, and ROI" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Active Campaigns" value="4" change="1 paused" changeType="neutral" icon={Megaphone} />
        <MetricCard label="Total Ad Spend" value="$9,890" change="72% of budget used" changeType="neutral" icon={DollarSign} />
        <MetricCard label="Cost Per Lead" value="$43.12" change="-8.3% vs last month" changeType="positive" icon={Target} />
        <MetricCard label="Return on Ad Spend" value="3.2x" change="+0.4x vs last month" changeType="positive" icon={TrendingUp} />
      </WidgetGrid>

      <DataCard title="Campaign Performance" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground py-3">Campaign</th>
                <th className="text-left text-xs font-medium text-muted-foreground py-3">Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3">Spend</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3">Leads</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3">CPL</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.name} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                  <td className="text-sm font-medium py-3 pr-4">{c.name}</td>
                  <td className="py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-md ${c.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-secondary text-muted-foreground"}`}>{c.status}</span>
                  </td>
                  <td className="text-sm text-right py-3 tabular-nums">{c.spend}</td>
                  <td className="text-sm text-right py-3 tabular-nums">{c.leads}</td>
                  <td className="text-sm text-right py-3 tabular-nums">{c.cpl}</td>
                  <td className="text-sm font-medium text-right py-3 tabular-nums">{c.roas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>

      <DataCard title="Conversion Rate by Platform" className="mt-6">
        <div className="space-y-4">
          {[
            { platform: "Google Ads", rate: 3.8, pct: 76 },
            { platform: "Facebook", rate: 2.9, pct: 58 },
            { platform: "Instagram", rate: 2.1, pct: 42 },
            { platform: "LinkedIn", rate: 4.2, pct: 84 },
          ].map((p) => (
            <div key={p.platform}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{p.platform}</span>
                <span className="tabular-nums">{p.rate}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full" style={{ width: `${p.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </DataCard>
    </div>
  );
}
