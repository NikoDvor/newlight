import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Globe, MousePointerClick, Users, TrendingUp } from "lucide-react";

const landingPages = [
  { name: "Homepage", visits: "12,450", conversion: "3.2%", leads: 398 },
  { name: "Services Page", visits: "5,230", conversion: "4.1%", leads: 214 },
  { name: "Contact Us", visits: "3,810", conversion: "8.7%", leads: 331 },
  { name: "Free Consultation", visits: "2,140", conversion: "12.3%", leads: 263 },
];

export default function Website() {
  return (
    <div>
      <PageHeader title="Website" description="Monitor website health, traffic, and conversions" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Website Health" value="96%" change="All systems operational" changeType="positive" icon={Globe} />
        <MetricCard label="Conversion Rate" value="4.2%" change="+0.8% vs last month" changeType="positive" icon={MousePointerClick} />
        <MetricCard label="Monthly Traffic" value="23,630" change="+15.2% vs last month" changeType="positive" icon={Users} />
        <MetricCard label="Leads Generated" value="1,206" change="+22% vs last month" changeType="positive" icon={TrendingUp} />
      </WidgetGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DataCard title="Landing Pages">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground py-3">Page</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3">Visits</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3">CVR</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3">Leads</th>
              </tr>
            </thead>
            <tbody>
              {landingPages.map((p) => (
                <tr key={p.name} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                  <td className="text-sm font-medium py-3">{p.name}</td>
                  <td className="text-sm text-right py-3 tabular-nums">{p.visits}</td>
                  <td className="text-sm text-right py-3 tabular-nums">{p.conversion}</td>
                  <td className="text-sm font-medium text-right py-3 tabular-nums">{p.leads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataCard>

        <DataCard title="Traffic Overview">
          <div className="space-y-4">
            {[
              { source: "Organic Search", visits: "9,420", pct: 40 },
              { source: "Paid Ads", visits: "6,130", pct: 26 },
              { source: "Social Media", visits: "4,720", pct: 20 },
              { source: "Direct", visits: "2,150", pct: 9 },
              { source: "Referral", visits: "1,210", pct: 5 },
            ].map((s) => (
              <div key={s.source}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{s.source}</span>
                  <span className="text-muted-foreground tabular-nums">{s.visits}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      </div>
    </div>
  );
}
