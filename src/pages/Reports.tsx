import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { MetricCard } from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, BarChart3, TrendingUp, Globe, Download, Calendar,
  MousePointerClick, Users, Heart, Star, Share2
} from "lucide-react";

export default function Reports() {
  const [dateRange, setDateRange] = useState("30d");

  return (
    <div>
      <PageHeader title="Reports" description="Generate and view marketing performance reports">
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-1.5"><Download className="h-4 w-4" /> Export</Button>
        </div>
      </PageHeader>

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Reports Generated" value="24" change="This quarter" changeType="neutral" icon={FileText} />
        <MetricCard label="Metrics Tracked" value="142" change="Across all channels" changeType="neutral" icon={BarChart3} />
        <MetricCard label="Growth Score" value="87%" change="+5% this quarter" changeType="positive" icon={TrendingUp} />
        <MetricCard label="Active Clients" value="12" change="All reporting" changeType="neutral" icon={Users} />
      </WidgetGrid>

      <div className="mt-8">
        <Tabs defaultValue="website">
          <TabsList className="bg-secondary h-10 rounded-lg">
            <TabsTrigger value="website" className="rounded-md text-sm">Website</TabsTrigger>
            <TabsTrigger value="funnels" className="rounded-md text-sm">Funnels</TabsTrigger>
            <TabsTrigger value="social" className="rounded-md text-sm">Social</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-md text-sm">Reviews</TabsTrigger>
            <TabsTrigger value="leads" className="rounded-md text-sm">Leads</TabsTrigger>
          </TabsList>

          <TabsContent value="website" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <DataCard title="Website Performance">
                <div className="space-y-4">
                  {[
                    { metric: "Visitors", value: "23,630", change: "+15.2%", pct: 75 },
                    { metric: "Page Views", value: "68,400", change: "+12.1%", pct: 65 },
                    { metric: "Avg. Session", value: "2m 34s", change: "+8.3%", pct: 55 },
                    { metric: "Bounce Rate", value: "42.1%", change: "-3.2%", pct: 42 },
                  ].map((m) => (
                    <div key={m.metric}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{m.metric}</span>
                        <span className="text-muted-foreground tabular-nums">{m.value} <span className="text-emerald-600 text-xs">{m.change}</span></span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${m.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </DataCard>
              <DataCard title="Top Pages">
                <div className="space-y-3">
                  {[
                    { page: "/", visits: "12,450", cvr: "3.2%" },
                    { page: "/services", visits: "5,230", cvr: "4.1%" },
                    { page: "/contact", visits: "3,810", cvr: "8.7%" },
                    { page: "/free-consultation", visits: "2,140", cvr: "12.3%" },
                  ].map((p) => (
                    <div key={p.page} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm font-medium">{p.page}</span>
                      <div className="text-right">
                        <span className="text-sm tabular-nums">{p.visits}</span>
                        <span className="text-xs text-muted-foreground ml-2 tabular-nums">{p.cvr} CVR</span>
                      </div>
                    </div>
                  ))}
                </div>
              </DataCard>
            </div>
          </TabsContent>

          <TabsContent value="funnels" className="mt-4">
            <DataCard title="Funnel Conversions">
              <div className="space-y-4">
                {[
                  { name: "Free Consultation Funnel", visitors: 2140, leads: 263, cvr: "12.3%", pct: 80 },
                  { name: "SEO Audit Funnel", visitors: 1670, leads: 145, cvr: "8.7%", pct: 55 },
                  { name: "Starter Package Funnel", visitors: 890, leads: 52, cvr: "5.8%", pct: 35 },
                ].map((f) => (
                  <div key={f.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{f.name}</span>
                      <span className="text-muted-foreground tabular-nums">{f.leads} leads · {f.cvr}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${f.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </DataCard>
          </TabsContent>

          <TabsContent value="social" className="mt-4">
            <DataCard title="Social Media Engagement">
              <div className="space-y-4">
                {[
                  { platform: "Instagram", posts: 18, engagement: "7.2%", reach: "52K", pct: 72 },
                  { platform: "Facebook", posts: 14, engagement: "4.1%", reach: "38K", pct: 50 },
                  { platform: "LinkedIn", posts: 10, engagement: "6.5%", reach: "32K", pct: 60 },
                  { platform: "X (Twitter)", posts: 6, engagement: "3.8%", reach: "20K", pct: 38 },
                ].map((p) => (
                  <div key={p.platform}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{p.platform}</span>
                      <span className="text-muted-foreground text-xs">{p.posts} posts · {p.engagement} eng. · {p.reach} reach</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${p.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </DataCard>
          </TabsContent>

          <TabsContent value="reviews" className="mt-4">
            <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
              <MetricCard label="Avg. Rating" value="4.8" change="156 total" changeType="positive" icon={Star} />
              <MetricCard label="New Reviews" value="12" change="This month" changeType="positive" icon={Star} />
              <MetricCard label="Response Rate" value="92%" change="Replied to" changeType="positive" icon={Share2} />
              <MetricCard label="Growth" value="+24%" change="vs prior quarter" changeType="positive" icon={TrendingUp} />
            </WidgetGrid>
          </TabsContent>

          <TabsContent value="leads" className="mt-4">
            <DataCard title="Lead Generation Trends">
              <div className="space-y-4">
                {[
                  { month: "January", leads: 98, appointments: 22, pct: 56 },
                  { month: "February", leads: 112, appointments: 28, pct: 64 },
                  { month: "March (so far)", leads: 142, appointments: 34, pct: 82 },
                ].map((m) => (
                  <div key={m.month}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{m.month}</span>
                      <span className="text-muted-foreground tabular-nums">{m.leads} leads · {m.appointments} appts</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${m.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </DataCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
