import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Search, TrendingUp, Shield, Eye } from "lucide-react";

const keywords = [
  { keyword: "marketing agency near me", position: 3, change: "+2", volume: "2,400" },
  { keyword: "digital marketing services", position: 7, change: "+5", volume: "8,100" },
  { keyword: "SEO services", position: 12, change: "-1", volume: "12,000" },
  { keyword: "social media management", position: 5, change: "+3", volume: "6,500" },
  { keyword: "PPC management company", position: 8, change: "+1", volume: "3,200" },
];

const competitors = [
  { name: "CompetitorA.com", authority: 62, keywords: 1240, traffic: "45K" },
  { name: "CompetitorB.com", authority: 55, keywords: 890, traffic: "32K" },
  { name: "CompetitorC.com", authority: 48, keywords: 670, traffic: "21K" },
];

export default function SEO() {
  return (
    <div>
      <PageHeader title="SEO" description="Monitor search visibility and keyword performance" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Search Visibility" value="72%" change="+8% this month" changeType="positive" icon={Eye} />
        <MetricCard label="Keywords Ranked" value="248" change="+18 new keywords" changeType="positive" icon={Search} />
        <MetricCard label="Website Authority" value="54" change="+3 this quarter" changeType="positive" icon={Shield} />
        <MetricCard label="Organic Traffic" value="9,420" change="+15% vs last month" changeType="positive" icon={TrendingUp} />
      </WidgetGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DataCard title="Keyword Rankings">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground py-3">Keyword</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3">Position</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3">Change</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3">Volume</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((k) => (
                <tr key={k.keyword} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                  <td className="text-sm py-3">{k.keyword}</td>
                  <td className="text-sm font-medium text-right py-3 tabular-nums">#{k.position}</td>
                  <td className={`text-sm text-right py-3 tabular-nums ${k.change.startsWith("+") ? "text-emerald-600" : "text-red-500"}`}>{k.change}</td>
                  <td className="text-sm text-right py-3 tabular-nums text-muted-foreground">{k.volume}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataCard>

        <DataCard title="Competitor Overview">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground py-3">Domain</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3">Authority</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3">Keywords</th>
                <th className="text-right text-xs font-medium text-muted-foreground py-3">Traffic</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((c) => (
                <tr key={c.name} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                  <td className="text-sm font-medium py-3">{c.name}</td>
                  <td className="text-sm text-right py-3 tabular-nums">{c.authority}</td>
                  <td className="text-sm text-right py-3 tabular-nums">{c.keywords.toLocaleString()}</td>
                  <td className="text-sm text-right py-3 tabular-nums">{c.traffic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataCard>
      </div>
    </div>
  );
}
