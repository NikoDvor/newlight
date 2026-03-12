import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import {
  Users, Target, DollarSign, Star, TrendingUp, BarChart3,
  Heart, MousePointerClick, Globe, Calendar
} from "lucide-react";
import { motion } from "framer-motion";

export default function AgencyDashboard() {
  return (
    <div>
      <PageHeader title="Agency Overview" description="Master dashboard across all clients" />

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Total Clients" value="12" change="3 new this quarter" changeType="positive" icon={Users} />
        <MetricCard label="Total Leads" value="1,842" change="+22% this month" changeType="positive" icon={Target} />
        <MetricCard label="Appointments Booked" value="412" change="+18% this month" changeType="positive" icon={Calendar} />
        <MetricCard label="Pipeline Value" value="$633K" change="+15% vs prior" changeType="positive" icon={DollarSign} />
        <MetricCard label="Avg. Client Rating" value="4.7" change="Across 480 reviews" changeType="positive" icon={Star} />
        <MetricCard label="Overall Conversion" value="5.2%" change="+0.8% vs prior" changeType="positive" icon={MousePointerClick} />
      </WidgetGrid>

      <div className="grid gap-6 lg:grid-cols-2 mt-8">
        <DataCard title="Top Performing Funnels">
          <div className="space-y-3">
            {[
              { name: "Free Consultation Funnel", client: "TechCorp", leads: 263, cvr: "12.3%" },
              { name: "SEO Audit Funnel", client: "Bloom Agency", leads: 145, cvr: "8.7%" },
              { name: "Starter Package Funnel", client: "GrowthLab", leads: 52, cvr: "5.8%" },
              { name: "Contact Page Funnel", client: "FitLife", leads: 89, cvr: "6.4%" },
            ].map((f) => (
              <div key={f.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.client}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold tabular-nums">{f.leads} leads</span>
                  <span className="text-xs text-muted-foreground ml-2 tabular-nums">{f.cvr}</span>
                </div>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Top Performing Social Posts">
          <div className="space-y-3">
            {[
              { content: "Behind the scenes: Our creative process", client: "TechCorp", platform: "Instagram", engagement: "4.2K" },
              { content: "5 marketing trends for 2026", client: "Bloom Agency", platform: "LinkedIn", engagement: "2.8K" },
              { content: "Client success story spotlight", client: "GrowthLab", platform: "Facebook", engagement: "1.9K" },
              { content: "How we doubled leads in 60 days", client: "FitLife", platform: "Instagram", engagement: "1.6K" },
            ].map((p) => (
              <div key={p.content} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.content}</p>
                  <p className="text-xs text-muted-foreground">{p.client} · {p.platform}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{p.engagement}</span>
              </div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Client Leaderboard" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Client</th>
                  <th className="text-right text-xs font-medium text-muted-foreground py-3 pr-4">Leads</th>
                  <th className="text-right text-xs font-medium text-muted-foreground py-3 pr-4">Appts</th>
                  <th className="text-right text-xs font-medium text-muted-foreground py-3 pr-4">CVR</th>
                  <th className="text-right text-xs font-medium text-muted-foreground py-3 pr-4">Rating</th>
                  <th className="text-right text-xs font-medium text-muted-foreground py-3">Traffic</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "TechCorp Inc.", leads: 142, appts: 34, cvr: "4.2%", rating: "4.8", traffic: "12.4K" },
                  { name: "Bloom Agency", leads: 118, appts: 28, cvr: "5.1%", rating: "4.9", traffic: "8.1K" },
                  { name: "GrowthLab", leads: 86, appts: 18, cvr: "3.8%", rating: "4.6", traffic: "5.2K" },
                  { name: "FitLife Studios", leads: 72, appts: 15, cvr: "6.2%", rating: "4.5", traffic: "3.8K" },
                  { name: "RetailMax", leads: 64, appts: 12, cvr: "3.4%", rating: "4.7", traffic: "4.1K" },
                ].map((c) => (
                  <tr key={c.name} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                    <td className="text-sm font-medium py-3 pr-4">{c.name}</td>
                    <td className="text-sm text-right py-3 pr-4 tabular-nums">{c.leads}</td>
                    <td className="text-sm text-right py-3 pr-4 tabular-nums">{c.appts}</td>
                    <td className="text-sm text-right py-3 pr-4 tabular-nums">{c.cvr}</td>
                    <td className="text-sm text-right py-3 pr-4 tabular-nums">{c.rating}</td>
                    <td className="text-sm text-right py-3 tabular-nums">{c.traffic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataCard>
      </div>
    </div>
  );
}
