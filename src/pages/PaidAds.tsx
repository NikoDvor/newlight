import { useState, useEffect } from "react";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { SetupBanner, DemoDataLabel } from "@/components/SetupBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, DollarSign, Target, TrendingUp, Plus, BarChart3, Zap } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";

const DEMO_CAMPAIGNS = [
  { name: "Google Ads — Brand Keywords", platform: "google_ads", status: "active", spend: 2450, leads: 89, cpl: 27.53, roas: 4.2 },
  { name: "Facebook — Retargeting", platform: "meta", status: "active", spend: 1820, leads: 56, cpl: 32.50, roas: 3.1 },
  { name: "Google Ads — Competitors", platform: "google_ads", status: "active", spend: 3100, leads: 42, cpl: 73.81, roas: 2.4 },
  { name: "Instagram — Awareness", platform: "meta", status: "paused", spend: 980, leads: 18, cpl: 54.44, roas: 1.8 },
  { name: "LinkedIn — B2B Lead Gen", platform: "linkedin", status: "active", spend: 1540, leads: 24, cpl: 64.17, roas: 3.5 },
];

const DEMO_CHART = [
  { name: "Google", spend: 5550, leads: 131 },
  { name: "Meta", spend: 2800, leads: 74 },
  { name: "LinkedIn", spend: 1540, leads: 24 },
];

const DEMO_RECS = [
  { title: "Increase brand keyword budget by 20%", impact: "Est. +18 leads/mo", priority: "High" },
  { title: "Pause underperforming Instagram campaign", impact: "Save $980/mo", priority: "Medium" },
  { title: "Test new retargeting audience on Meta", impact: "Est. +12% ROAS", priority: "High" },
];

export default function PaidAds() {
  const { activeClientId } = useWorkspace();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [perfRecords, setPerfRecords] = useState<any[]>([]);
  const [adRecs, setAdRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [perfOpen, setPerfOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [newCamp, setNewCamp] = useState({ campaign_name: "", platform: "google_ads", budget: "", spend: "", leads: "", roas: "" });
  const [newPerf, setNewPerf] = useState({ campaign_id: "", metric_date: "", spend_amount: "", clicks: "", leads: "", impressions: "", conversions: "", roas: "" });
  const [newAdRec, setNewAdRec] = useState({ title: "", description: "", priority: "medium", campaign_id: "" });

  const fetchData = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [cRes, pRes, rRes] = await Promise.all([
      supabase.from("ad_campaigns").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("ad_performance_records").select("*").eq("client_id", activeClientId).order("metric_date", { ascending: false }).limit(50),
      supabase.from("ad_recommendations").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
    ]);
    setCampaigns(cRes.data || []);
    setPerfRecords(pRes.data || []);
    setAdRecs(rRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeClientId]);

  const addCampaign = async () => {
    if (!activeClientId || !newCamp.campaign_name) return;
    const spend = parseFloat(newCamp.spend) || 0;
    const leads = parseInt(newCamp.leads) || 0;
    const { error } = await supabase.from("ad_campaigns").insert({
      client_id: activeClientId, campaign_name: newCamp.campaign_name,
      platform: newCamp.platform, budget: parseFloat(newCamp.budget) || 0,
      spend, leads, cpl: leads > 0 ? Math.round(spend / leads * 100) / 100 : 0,
      roas: parseFloat(newCamp.roas) || 0,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Campaign Added" });
    setNewCamp({ campaign_name: "", platform: "google_ads", budget: "", spend: "", leads: "", roas: "" });
    setCampaignOpen(false);
    fetchData();
  };

  const hasRealData = campaigns.length > 0;
  const displayCampaigns = hasRealData ? campaigns : [];
  const totalSpend = campaigns.reduce((s, c) => s + (Number(c.spend) || 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + (Number(c.leads) || 0), 0);
  const avgCpl = totalLeads > 0 ? (totalSpend / totalLeads).toFixed(2) : "0";
  const avgRoas = campaigns.length > 0 ? (campaigns.reduce((s, c) => s + (Number(c.roas) || 0), 0) / campaigns.length).toFixed(1) : "0";
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;

  const PLATFORM_LABELS: Record<string, string> = { google_ads: "Google Ads", meta: "Meta Ads", linkedin: "LinkedIn", tiktok: "TikTok" };

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Paid Ads" description="Track ad performance, spend, and ROI" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to view Ads data.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Paid Ads" description="Track ad performance, spend, and ROI">
        <Button className="gap-1.5" onClick={() => setCampaignOpen(true)}>
          <Plus className="h-4 w-4" /> Add Campaign
        </Button>
      </PageHeader>

      <ModuleHelpPanel moduleName="Paid Ads" description="Track campaign performance, spend, cost-per-lead, and ROAS across Google, Meta, LinkedIn, and more. Campaigns can be added manually or synced from ad platforms." tips={["Add campaigns manually or connect ad platforms from Integrations", "AI recommendations suggest budget optimizations", "Demo data shows until real campaigns are added"]} />

      {!hasRealData && (
        <SetupBanner
          icon={Megaphone}
          title="Connect Your Ad Platforms"
          description="Link your Google Ads, Meta Ads, or LinkedIn campaigns to track live performance, spend, and ROI in one dashboard."
          actionLabel="Add Campaign"
          onAction={() => setCampaignOpen(true)}
          secondaryLabel="Connect Ad Platforms"
          onSecondary={() => navigate("/integrations")}
        />
      )}

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Active Campaigns" value={hasRealData ? String(activeCampaigns) : "—"} change={hasRealData ? `${campaigns.length - activeCampaigns} paused` : "Add campaigns"} changeType="neutral" icon={Megaphone} />
        <MetricCard label="Total Ad Spend" value={hasRealData ? `$${totalSpend.toLocaleString()}` : "—"} change={hasRealData ? "This period" : "Connect to track"} changeType="neutral" icon={DollarSign} />
        <MetricCard label="Cost Per Lead" value={hasRealData ? `$${avgCpl}` : "—"} change={hasRealData ? `${totalLeads} leads` : "Connect to measure"} changeType={hasRealData ? "positive" : "neutral"} icon={Target} />
        <MetricCard label="Avg ROAS" value={hasRealData ? `${avgRoas}x` : "—"} change={hasRealData ? "Return on ad spend" : "Connect to measure"} changeType={hasRealData ? "positive" : "neutral"} icon={TrendingUp} />
      </WidgetGrid>

      {/* Spend by Platform Chart */}
      <DataCard title="Spend by Platform" className="mt-6">
        {!hasRealData && (
          <div className="flex items-center gap-2 mb-3">
            <DemoDataLabel />
            <span className="text-[10px] text-muted-foreground">Connect ad platforms to see your real performance</span>
          </div>
        )}
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hasRealData ? Object.entries(campaigns.reduce((acc: any, c) => {
            const p = PLATFORM_LABELS[c.platform] || c.platform;
            acc[p] = acc[p] || { name: p, spend: 0, leads: 0 };
            acc[p].spend += Number(c.spend) || 0;
            acc[p].leads += Number(c.leads) || 0;
            return acc;
          }, {})).map(([, v]) => v) : DEMO_CHART}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsla(211,96%,56%,.06)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(215 16% 50%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(215 16% 50%)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "hsla(210,50%,99%,.95)", border: "1px solid hsla(211,96%,56%,.12)", borderRadius: "12px", fontSize: "12px" }} />
            <Bar dataKey="spend" fill="hsl(211 96% 56%)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="leads" fill="hsl(197 92% 58%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </DataCard>

      <div className="mt-6">
        <Tabs defaultValue="campaigns">
          <TabsList className="bg-secondary h-10 rounded-lg">
            <TabsTrigger value="campaigns" className="rounded-md text-sm">Campaigns</TabsTrigger>
            <TabsTrigger value="recommendations" className="rounded-md text-sm">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-4">
            <DataCard title="Campaign Performance">
              {!hasRealData ? (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <DemoDataLabel />
                    <span className="text-[10px] text-muted-foreground">Example campaigns — add yours to see real data</span>
                  </div>
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
                      <tbody className="opacity-60">
                        {DEMO_CAMPAIGNS.map((c, i) => (
                          <tr key={i} className="border-b border-border last:border-0">
                            <td className="text-sm font-medium py-3 pr-4">{c.name}</td>
                            <td className="py-3">
                              <Badge className={`text-[10px] ${c.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-secondary text-muted-foreground"}`}>{c.status}</Badge>
                            </td>
                            <td className="text-sm text-right py-3 tabular-nums">${c.spend.toLocaleString()}</td>
                            <td className="text-sm text-right py-3 tabular-nums">{c.leads}</td>
                            <td className="text-sm text-right py-3 tabular-nums">${c.cpl.toFixed(2)}</td>
                            <td className="text-sm font-medium text-right py-3 tabular-nums">{c.roas}x</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-center mt-4">
                    <Button size="sm" onClick={() => setCampaignOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Your Campaigns</Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-medium text-muted-foreground py-3">Campaign</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3">Platform</th>
                        <th className="text-left text-xs font-medium text-muted-foreground py-3">Status</th>
                        <th className="text-right text-xs font-medium text-muted-foreground py-3">Spend</th>
                        <th className="text-right text-xs font-medium text-muted-foreground py-3">Leads</th>
                        <th className="text-right text-xs font-medium text-muted-foreground py-3">CPL</th>
                        <th className="text-right text-xs font-medium text-muted-foreground py-3">ROAS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((c) => (
                        <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                          <td className="text-sm font-medium py-3 pr-4">{c.campaign_name}</td>
                          <td className="text-xs text-muted-foreground py-3">{PLATFORM_LABELS[c.platform] || c.platform}</td>
                          <td className="py-3">
                            <Badge className={`text-[10px] ${c.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-secondary text-muted-foreground"}`}>{c.status}</Badge>
                          </td>
                          <td className="text-sm text-right py-3 tabular-nums">${Number(c.spend || 0).toLocaleString()}</td>
                          <td className="text-sm text-right py-3 tabular-nums">{c.leads || 0}</td>
                          <td className="text-sm text-right py-3 tabular-nums">${Number(c.cpl || 0).toFixed(2)}</td>
                          <td className="text-sm font-medium text-right py-3 tabular-nums">{Number(c.roas || 0).toFixed(1)}x</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DataCard>
          </TabsContent>

          <TabsContent value="recommendations" className="mt-4">
            <DataCard title="Ad Optimization Recommendations">
              <div className="flex items-center gap-2 mb-4">
                <DemoDataLabel />
                <span className="text-[10px] text-muted-foreground">Strategic recommendations based on best practices</span>
              </div>
              <div className="space-y-3">
                {DEMO_RECS.map((r, i) => (
                  <motion.div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0"
                    initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                        <Zap className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{r.title}</p>
                        <p className="text-xs" style={{ color: "hsl(197 92% 48%)" }}>{r.impact}</p>
                      </div>
                    </div>
                    <Badge className="text-[10px] bg-blue-50 text-blue-700">{r.priority}</Badge>
                  </motion.div>
                ))}
              </div>
            </DataCard>
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={campaignOpen} onOpenChange={setCampaignOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Add Campaign</SheetTitle><SheetDescription>Track an ad campaign</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Campaign Name *</Label><Input value={newCamp.campaign_name} onChange={e => setNewCamp(p => ({ ...p, campaign_name: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={newCamp.platform} onValueChange={v => setNewCamp(p => ({ ...p, platform: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="google_ads">Google Ads</SelectItem>
                  <SelectItem value="meta">Meta Ads</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Budget ($)</Label><Input type="number" value={newCamp.budget} onChange={e => setNewCamp(p => ({ ...p, budget: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Spend ($)</Label><Input type="number" value={newCamp.spend} onChange={e => setNewCamp(p => ({ ...p, spend: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Leads</Label><Input type="number" value={newCamp.leads} onChange={e => setNewCamp(p => ({ ...p, leads: e.target.value }))} /></div>
            <div className="space-y-2"><Label>ROAS</Label><Input type="number" step="0.1" value={newCamp.roas} onChange={e => setNewCamp(p => ({ ...p, roas: e.target.value }))} /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCampaignOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addCampaign}>Add Campaign</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
