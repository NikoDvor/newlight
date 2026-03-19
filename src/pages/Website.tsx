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
import { Globe, MousePointerClick, Users, TrendingUp, Plus, AlertTriangle, Zap, Target, BarChart3, Plug } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";

const DEMO_TRAFFIC = [
  { name: "Mon", visitors: 1200, leads: 32 },
  { name: "Tue", visitors: 1800, leads: 45 },
  { name: "Wed", visitors: 2100, leads: 52 },
  { name: "Thu", visitors: 1900, leads: 48 },
  { name: "Fri", visitors: 2400, leads: 61 },
  { name: "Sat", visitors: 1600, leads: 38 },
  { name: "Sun", visitors: 1400, leads: 30 },
];

const DEMO_OPPORTUNITIES = [
  { title: "Improve page load speed", impact: "Est. +12% conversion lift", severity: "high" },
  { title: "Add lead capture form to services page", impact: "Est. 15 new leads/mo", severity: "high" },
  { title: "Optimize mobile checkout flow", impact: "Est. +8% mobile CVR", severity: "medium" },
  { title: "Add social proof to landing page", impact: "Est. +5% trust factor", severity: "low" },
];

export default function Website() {
  const { activeClientId } = useWorkspace();
  const navigate = useNavigate();
  const [pages, setPages] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [trafficSources, setTrafficSources] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageOpen, setPageOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [newPage, setNewPage] = useState({ page_name: "", page_url: "", page_type: "page", visits: "", conversions: "" });
  const [newIssue, setNewIssue] = useState({ issue_title: "", description: "", severity: "medium" });
  const [newRec, setNewRec] = useState({ title: "", description: "", recommendation_type: "optimization", priority: "medium" });

  const fetchData = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [pRes, iRes, tRes, rRes] = await Promise.all([
      supabase.from("website_pages").select("*").eq("client_id", activeClientId).order("visits", { ascending: false }),
      supabase.from("website_issues").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("website_traffic_sources").select("*").eq("client_id", activeClientId).order("visits", { ascending: false }),
      supabase.from("website_recommendations").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
    ]);
    setPages(pRes.data || []);
    setIssues(iRes.data || []);
    setTrafficSources(tRes.data || []);
    setRecommendations(rRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeClientId]);

  const addPage = async () => {
    if (!activeClientId || !newPage.page_name) return;
    const visits = parseInt(newPage.visits) || 0;
    const conversions = parseInt(newPage.conversions) || 0;
    const { error } = await supabase.from("website_pages").insert({
      client_id: activeClientId, page_name: newPage.page_name, page_url: newPage.page_url || null,
      page_type: newPage.page_type, visits, conversions,
      conversion_rate: visits > 0 ? Math.round(conversions / visits * 1000) / 10 : 0,
      leads_generated: conversions,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Page Added" });
    setNewPage({ page_name: "", page_url: "", page_type: "page", visits: "", conversions: "" });
    setPageOpen(false);
    fetchData();
  };

  const addIssue = async () => {
    if (!activeClientId || !newIssue.issue_title) return;
    const { error } = await supabase.from("website_issues").insert({
      client_id: activeClientId, issue_title: newIssue.issue_title,
      description: newIssue.description || null, severity: newIssue.severity,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Issue Logged" });
    setNewIssue({ issue_title: "", description: "", severity: "medium" });
    setIssueOpen(false);
    fetchData();
  };

  const addRecommendation = async () => {
    if (!activeClientId || !newRec.title) return;
    const { error } = await supabase.from("website_recommendations").insert({
      client_id: activeClientId, title: newRec.title,
      description: newRec.description || null, recommendation_type: newRec.recommendation_type,
      priority: newRec.priority,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Recommendation Added" });
    setNewRec({ title: "", description: "", recommendation_type: "optimization", priority: "medium" });
    setRecOpen(false);
    fetchData();
  };

  const resolveRecommendation = async (id: string) => {
    await supabase.from("website_recommendations").update({ status: "resolved" }).eq("id", id);
    fetchData();
  };

  const hasRealData = pages.length > 0 || issues.length > 0 || recommendations.length > 0;
  const totalVisits = pages.reduce((s, p) => s + (p.visits || 0), 0);
  const totalLeads = pages.reduce((s, p) => s + (p.leads_generated || 0), 0);
  const avgCvr = totalVisits > 0 ? (totalLeads / totalVisits * 100).toFixed(1) : "0";
  const openIssues = issues.filter(i => i.status === "open").length;

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Website" description="Monitor website health, traffic, and conversions" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to view Website data.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Website" description="Monitor website health, traffic, and conversions">
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => setIssueOpen(true)}>
            <AlertTriangle className="h-4 w-4" /> Log Issue
          </Button>
          <Button className="gap-1.5" onClick={() => setPageOpen(true)}>
            <Plus className="h-4 w-4" /> Add Page
          </Button>
        </div>
      </PageHeader>

      <ModuleHelpPanel moduleName="Website" description="Monitor page performance, track conversions, and identify website issues. Pages can be added manually or synced from Google Analytics." tips={["Track visits and conversions per page", "Log website issues for prioritized fixes", "Demo traffic data shows until analytics are connected"]} />

      {!hasRealData && (
        <SetupBanner
          icon={Globe}
          title="Connect Your Website Analytics"
          description="Add your website pages and connect analytics to unlock live traffic data, conversion tracking, and optimization recommendations."
          actionLabel="Add Website Pages"
          onAction={() => setPageOpen(true)}
          secondaryLabel="Connect Analytics"
          onSecondary={() => navigate("/integrations")}
        />
      )}

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Tracked Pages" value={hasRealData ? String(pages.length) : "—"} change={hasRealData ? `${pages.filter(p => p.status === "active").length} active` : "Add pages to track"} changeType={hasRealData ? "neutral" : "neutral"} icon={Globe} />
        <MetricCard label="Conversion Rate" value={hasRealData ? `${avgCvr}%` : "—"} change={hasRealData ? `${totalLeads} leads total` : "Connect to measure"} changeType={hasRealData ? "positive" : "neutral"} icon={MousePointerClick} />
        <MetricCard label="Total Traffic" value={hasRealData ? totalVisits.toLocaleString() : "—"} change={hasRealData ? "All tracked pages" : "Connect analytics"} changeType="neutral" icon={Users} />
        <MetricCard label="Open Issues" value={hasRealData ? String(openIssues) : "—"} change={hasRealData ? `${issues.length} total` : "Log issues to track"} changeType={openIssues > 0 ? "negative" : "neutral"} icon={AlertTriangle} />
      </WidgetGrid>

      {/* Traffic Chart - demo or real */}
      <DataCard title={hasRealData ? "Traffic Overview" : "Traffic Overview"} className="mt-6">
        {!hasRealData && (
          <div className="flex items-center gap-2 mb-3">
            <DemoDataLabel />
            <span className="text-[10px] text-muted-foreground">Connect analytics to see your real traffic data</span>
          </div>
        )}
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={hasRealData ? pages.map(p => ({ name: p.page_name?.substring(0, 12), visitors: p.visits || 0, leads: p.leads_generated || 0 })) : DEMO_TRAFFIC}>
            <defs>
              <linearGradient id="wVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(211 96% 56%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(211 96% 56%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="wLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(197 92% 58%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(197 92% 58%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsla(211,96%,56%,.06)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(215 16% 50%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(215 16% 50%)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "hsla(210,50%,99%,.95)", border: "1px solid hsla(211,96%,56%,.12)", borderRadius: "12px", fontSize: "12px" }} />
            <Area type="monotone" dataKey="visitors" stroke="hsl(211 96% 56%)" fill="url(#wVisitors)" strokeWidth={2} />
            <Area type="monotone" dataKey="leads" stroke="hsl(197 92% 58%)" fill="url(#wLeads)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </DataCard>

      <div className="mt-6">
        <Tabs defaultValue="pages">
          <TabsList className="bg-secondary h-10 rounded-lg">
            <TabsTrigger value="pages" className="rounded-md text-sm">Pages</TabsTrigger>
            <TabsTrigger value="traffic" className="rounded-md text-sm">Traffic Sources</TabsTrigger>
            <TabsTrigger value="issues" className="rounded-md text-sm">Issues</TabsTrigger>
            <TabsTrigger value="recommendations" className="rounded-md text-sm">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="pages" className="mt-4">
            <DataCard title="Landing Pages">
              {pages.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <Globe className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No pages tracked yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Add your website pages to start tracking performance and conversions.</p>
                  <Button size="sm" onClick={() => setPageOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Page</Button>
                </div>
              ) : (
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
                    {pages.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                        <td className="py-3">
                          <p className="text-sm font-medium">{p.page_name}</p>
                          {p.page_url && <p className="text-[10px] text-muted-foreground">{p.page_url}</p>}
                        </td>
                        <td className="text-sm text-right py-3 tabular-nums">{(p.visits || 0).toLocaleString()}</td>
                        <td className="text-sm text-right py-3 tabular-nums">{p.conversion_rate || 0}%</td>
                        <td className="text-sm font-medium text-right py-3 tabular-nums">{p.leads_generated || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </DataCard>
          </TabsContent>

          <TabsContent value="traffic" className="mt-4">
            <DataCard title="Traffic Sources">
              {trafficSources.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <BarChart3 className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No traffic source data yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Connect your analytics to see where your visitors are coming from.</p>
                  <Button size="sm" variant="outline" onClick={() => navigate("/integrations")}><Plug className="h-4 w-4 mr-1" /> Connect Analytics</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {trafficSources.map((s) => (
                    <div key={s.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{s.source_name}</span>
                        <span className="text-muted-foreground tabular-nums">{(s.visits || 0).toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.percentage || 0}%`, background: "linear-gradient(90deg, hsl(211 96% 56%), hsl(197 92% 58%))" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>

          <TabsContent value="issues" className="mt-4">
            <DataCard title="Website Issues">
              {issues.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <AlertTriangle className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No issues logged</p>
                  <p className="text-xs text-muted-foreground mb-4">Log issues to track website problems and optimization opportunities.</p>
                  <Button size="sm" onClick={() => setIssueOpen(true)}><AlertTriangle className="h-4 w-4 mr-1" /> Log Issue</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {issues.map((i) => (
                    <div key={i.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">{i.issue_title}</p>
                        <p className="text-xs text-muted-foreground">{i.description || "No description"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] ${i.severity === "high" ? "bg-red-50 text-red-600" : i.severity === "medium" ? "bg-amber-50 text-amber-700" : "bg-secondary text-muted-foreground"}`}>{i.severity}</Badge>
                        <Badge className={`text-[10px] ${i.status === "open" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{i.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>

          <TabsContent value="recommendations" className="mt-4">
            <DataCard title="Recommendations" action={<Button size="sm" variant="outline" onClick={() => setRecOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add</Button>}>
              {recommendations.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <Zap className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No recommendations yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Add optimization recommendations to track website improvements.</p>
                  <Button size="sm" onClick={() => setRecOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Recommendation</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                          <Zap className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{r.title}</p>
                          <p className="text-xs text-muted-foreground">{r.description || r.recommendation_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] ${r.priority === "high" ? "bg-blue-50 text-blue-700" : r.priority === "medium" ? "bg-cyan-50 text-cyan-700" : "bg-secondary text-muted-foreground"}`}>{r.priority}</Badge>
                        {r.status === "open" ? (
                          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => resolveRecommendation(r.id)}>Resolve</Button>
                        ) : (
                          <Badge className="text-[10px] bg-emerald-50 text-emerald-700">Resolved</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={pageOpen} onOpenChange={setPageOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Add Page</SheetTitle><SheetDescription>Track a website page</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Page Name *</Label><Input value={newPage.page_name} onChange={e => setNewPage(p => ({ ...p, page_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>URL</Label><Input value={newPage.page_url} onChange={e => setNewPage(p => ({ ...p, page_url: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Visits</Label><Input type="number" value={newPage.visits} onChange={e => setNewPage(p => ({ ...p, visits: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Conversions</Label><Input type="number" value={newPage.conversions} onChange={e => setNewPage(p => ({ ...p, conversions: e.target.value }))} /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setPageOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addPage}>Add Page</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={issueOpen} onOpenChange={setIssueOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Log Issue</SheetTitle><SheetDescription>Report a website issue</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Issue Title *</Label><Input value={newIssue.issue_title} onChange={e => setNewIssue(p => ({ ...p, issue_title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={newIssue.description} onChange={e => setNewIssue(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={newIssue.severity} onValueChange={v => setNewIssue(p => ({ ...p, severity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setIssueOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addIssue}>Log Issue</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
