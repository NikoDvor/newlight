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
import { Search, TrendingUp, Shield, Eye, Plus, AlertTriangle, ArrowUp, ArrowDown, Minus, Target, MapPin, FileText } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const DEMO_KEYWORDS = [
  { keyword: "best plumber near me", position: 3, volume: 8100, change: 2 },
  { keyword: "emergency plumbing service", position: 7, volume: 4400, change: -1 },
  { keyword: "24 hour plumber", position: 12, volume: 6600, change: 3 },
  { keyword: "drain cleaning service", position: 5, volume: 3200, change: 0 },
  { keyword: "water heater repair", position: 18, volume: 2900, change: -4 },
];

const DEMO_CONTENT = [
  { title: "Write blog: 'Top 10 Plumbing Tips for Homeowners'", keyword: "plumbing tips", potential: "High" },
  { title: "Create FAQ page for common questions", keyword: "plumbing FAQ", potential: "Medium" },
  { title: "Update service area pages with local keywords", keyword: "local SEO", potential: "High" },
];

export default function SEO() {
  const { activeClientId } = useWorkspace();
  const navigate = useNavigate();
  const [keywords, setKeywords] = useState<any[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [contentOpps, setContentOpps] = useState<any[]>([]);
  const [localItems, setLocalItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kwOpen, setKwOpen] = useState(false);
  const [compOpen, setCompOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);
  const [localOpen, setLocalOpen] = useState(false);
  const [newKw, setNewKw] = useState({ keyword: "", position: "", search_volume: "" });
  const [newComp, setNewComp] = useState({ domain: "", authority_score: "", keywords_count: "", estimated_traffic: "" });
  const [newIssue, setNewIssue] = useState({ issue_title: "", category: "technical", severity: "medium", recommendation: "" });
  const [newContent, setNewContent] = useState({ topic_title: "", target_keyword: "", opportunity_type: "blog_post", priority: "medium" });
  const [newLocal, setNewLocal] = useState({ location_name: "", visibility_status: "unknown", notes: "" });

  const fetchData = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [kRes, cRes, iRes, coRes, lRes] = await Promise.all([
      supabase.from("seo_keywords").select("*").eq("client_id", activeClientId).order("position", { ascending: true }),
      supabase.from("seo_competitors").select("*").eq("client_id", activeClientId).order("authority_score", { ascending: false }),
      supabase.from("seo_issues").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("seo_content_opportunities").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("seo_local_visibility").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
    ]);
    setKeywords(kRes.data || []);
    setCompetitors(cRes.data || []);
    setIssues(iRes.data || []);
    setContentOpps(coRes.data || []);
    setLocalItems(lRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeClientId]);

  const addKeyword = async () => {
    if (!activeClientId || !newKw.keyword) return;
    const { error } = await supabase.from("seo_keywords").insert({
      client_id: activeClientId, keyword: newKw.keyword,
      position: parseInt(newKw.position) || null,
      search_volume: parseInt(newKw.search_volume) || 0,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Keyword Added" });
    setNewKw({ keyword: "", position: "", search_volume: "" });
    setKwOpen(false);
    fetchData();
  };

  const addCompetitor = async () => {
    if (!activeClientId || !newComp.domain) return;
    const { error } = await supabase.from("seo_competitors").insert({
      client_id: activeClientId, domain: newComp.domain,
      authority_score: parseInt(newComp.authority_score) || 0,
      keywords_count: parseInt(newComp.keywords_count) || 0,
      estimated_traffic: newComp.estimated_traffic || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Competitor Added" });
    setNewComp({ domain: "", authority_score: "", keywords_count: "", estimated_traffic: "" });
    setCompOpen(false);
    fetchData();
  };

  const addIssue = async () => {
    if (!activeClientId || !newIssue.issue_title) return;
    const { error } = await supabase.from("seo_issues").insert({
      client_id: activeClientId, issue_title: newIssue.issue_title,
      category: newIssue.category, severity: newIssue.severity,
      recommendation: newIssue.recommendation || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Issue Logged" });
    setNewIssue({ issue_title: "", category: "technical", severity: "medium", recommendation: "" });
    setIssueOpen(false);
    fetchData();
  };

  const addContentOpp = async () => {
    if (!activeClientId || !newContent.topic_title) return;
    const { error } = await supabase.from("seo_content_opportunities").insert({
      client_id: activeClientId, topic_title: newContent.topic_title,
      target_keyword: newContent.target_keyword || null, opportunity_type: newContent.opportunity_type,
      priority: newContent.priority,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Content Opportunity Added" });
    setNewContent({ topic_title: "", target_keyword: "", opportunity_type: "blog_post", priority: "medium" });
    setContentOpen(false);
    fetchData();
  };

  const addLocalItem = async () => {
    if (!activeClientId || !newLocal.location_name) return;
    const { error } = await supabase.from("seo_local_visibility").insert({
      client_id: activeClientId, location_name: newLocal.location_name,
      visibility_status: newLocal.visibility_status, notes: newLocal.notes || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Location Added" });
    setNewLocal({ location_name: "", visibility_status: "unknown", notes: "" });
    setLocalOpen(false);
    fetchData();
  };

  const hasRealData = keywords.length > 0 || competitors.length > 0 || issues.length > 0 || contentOpps.length > 0 || localItems.length > 0;
  const rankedKws = keywords.filter(k => k.position);
  const openIssues = issues.filter(i => i.status === "open").length;

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="SEO" description="Monitor search visibility and keyword performance" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to view SEO data.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="SEO" description="Monitor search visibility and keyword performance">
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => setIssueOpen(true)}>
            <AlertTriangle className="h-4 w-4" /> Log Issue
          </Button>
          <Button className="gap-1.5" onClick={() => setKwOpen(true)}>
            <Plus className="h-4 w-4" /> Add Keyword
          </Button>
        </div>
      </PageHeader>

      <ModuleHelpPanel moduleName="SEO" description="Track keyword rankings, monitor competitors, detect technical SEO issues, and discover content opportunities. Data can be manually entered or synced from Google Search Console." tips={["Add target keywords to track ranking positions over time", "Log competitors to compare authority and traffic", "SEO issues are flagged for action and can be resolved inline"]} />

      {!hasRealData && (
        <SetupBanner
          icon={Search}
          title="Track Your Search Rankings"
          description="Add your target keywords and competitors to start monitoring your SEO performance and discover growth opportunities."
          actionLabel="Add Keywords"
          onAction={() => setKwOpen(true)}
          secondaryLabel="Connect Search Console"
          onSecondary={() => navigate("/integrations")}
        />
      )}

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Keywords Tracked" value={hasRealData ? String(keywords.length) : "—"} change={hasRealData ? `${rankedKws.length} ranked` : "Add keywords to track"} changeType="neutral" icon={Search} />
        <MetricCard label="Avg Position" value={rankedKws.length > 0 ? `#${Math.round(rankedKws.reduce((s, k) => s + k.position, 0) / rankedKws.length)}` : "—"} change={hasRealData ? "Tracked keywords" : "Track to measure"} changeType="neutral" icon={TrendingUp} />
        <MetricCard label="Competitors" value={hasRealData ? String(competitors.length) : "—"} change={hasRealData ? "Being tracked" : "Add competitors"} changeType="neutral" icon={Shield} />
        <MetricCard label="Open Issues" value={hasRealData ? String(openIssues) : "—"} change={hasRealData ? `${issues.length} total` : "Run SEO audit"} changeType={openIssues > 0 ? "negative" : "neutral"} icon={AlertTriangle} />
      </WidgetGrid>

      <div className="mt-6">
        <Tabs defaultValue="keywords">
          <TabsList className="bg-secondary h-10 rounded-lg">
            <TabsTrigger value="keywords" className="rounded-md text-sm">Keywords</TabsTrigger>
            <TabsTrigger value="competitors" className="rounded-md text-sm">Competitors</TabsTrigger>
            <TabsTrigger value="issues" className="rounded-md text-sm">Issues</TabsTrigger>
            <TabsTrigger value="content" className="rounded-md text-sm">Content Opps</TabsTrigger>
            <TabsTrigger value="local" className="rounded-md text-sm">Local SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="keywords" className="mt-4">
            <DataCard title="Keyword Rankings">
              {keywords.length === 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <DemoDataLabel />
                    <span className="text-[10px] text-muted-foreground">Example rankings — add your keywords to see real data</span>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-medium text-muted-foreground py-3">Keyword</th>
                        <th className="text-right text-xs font-medium text-muted-foreground py-3">Position</th>
                        <th className="text-right text-xs font-medium text-muted-foreground py-3">Volume</th>
                        <th className="text-right text-xs font-medium text-muted-foreground py-3">Change</th>
                      </tr>
                    </thead>
                    <tbody className="opacity-60">
                      {DEMO_KEYWORDS.map((k, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="text-sm py-3">{k.keyword}</td>
                          <td className="text-sm font-medium text-right py-3 tabular-nums">#{k.position}</td>
                          <td className="text-sm text-right py-3 tabular-nums text-muted-foreground">{k.volume.toLocaleString()}</td>
                          <td className="text-right py-3">
                            <span className={`text-xs flex items-center justify-end gap-0.5 ${k.change > 0 ? "text-emerald-600" : k.change < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                              {k.change > 0 ? <ArrowUp className="h-3 w-3" /> : k.change < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                              {Math.abs(k.change)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-center mt-4">
                    <Button size="sm" onClick={() => setKwOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Your Keywords</Button>
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground py-3">Keyword</th>
                      <th className="text-right text-xs font-medium text-muted-foreground py-3">Position</th>
                      <th className="text-right text-xs font-medium text-muted-foreground py-3">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((k) => (
                      <tr key={k.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                        <td className="text-sm py-3">{k.keyword}</td>
                        <td className="text-sm font-medium text-right py-3 tabular-nums">{k.position ? `#${k.position}` : "—"}</td>
                        <td className="text-sm text-right py-3 tabular-nums text-muted-foreground">{(k.search_volume || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </DataCard>
          </TabsContent>

          <TabsContent value="competitors" className="mt-4">
            <DataCard title="Competitor Overview">
              {competitors.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <Shield className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">Track Your Competitors</p>
                  <p className="text-xs text-muted-foreground mb-4">Add competitor domains to monitor their SEO performance and find opportunities.</p>
                  <Button size="sm" onClick={() => setCompOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Competitor</Button>
                </div>
              ) : (
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
                      <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                        <td className="text-sm font-medium py-3">{c.domain}</td>
                        <td className="text-sm text-right py-3 tabular-nums">{c.authority_score}</td>
                        <td className="text-sm text-right py-3 tabular-nums">{(c.keywords_count || 0).toLocaleString()}</td>
                        <td className="text-sm text-right py-3 tabular-nums">{c.estimated_traffic || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </DataCard>
          </TabsContent>

          <TabsContent value="issues" className="mt-4">
            <DataCard title="SEO Issues">
              {issues.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <AlertTriangle className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No SEO issues logged</p>
                  <p className="text-xs text-muted-foreground mb-4">Log issues to track and resolve SEO problems systematically.</p>
                  <Button size="sm" onClick={() => setIssueOpen(true)}><AlertTriangle className="h-4 w-4 mr-1" /> Log Issue</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {issues.map((i) => (
                    <div key={i.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">{i.issue_title}</p>
                        <p className="text-xs text-muted-foreground">{i.category} · {i.recommendation || "No recommendation"}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={`text-[10px] ${i.severity === "high" ? "bg-red-50 text-red-600" : i.severity === "medium" ? "bg-amber-50 text-amber-700" : "bg-secondary text-muted-foreground"}`}>{i.severity}</Badge>
                        <Badge className={`text-[10px] ${i.status === "open" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{i.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>

          <TabsContent value="content" className="mt-4">
            <DataCard title="Content Opportunities" action={<Button size="sm" variant="outline" onClick={() => setContentOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add</Button>}>
              {contentOpps.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <FileText className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No content opportunities logged</p>
                  <p className="text-xs text-muted-foreground mb-4">Add topics and keywords to plan your content strategy.</p>
                  <Button size="sm" onClick={() => setContentOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Opportunity</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {contentOpps.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                          <FileText className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{c.topic_title}</p>
                          <p className="text-xs text-muted-foreground">{c.target_keyword ? `Target: ${c.target_keyword}` : c.opportunity_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] ${c.priority === "high" ? "bg-blue-50 text-blue-700" : c.priority === "medium" ? "bg-cyan-50 text-cyan-700" : "bg-secondary text-muted-foreground"}`}>{c.priority}</Badge>
                        <Badge className={`text-[10px] ${c.status === "open" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{c.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>

          <TabsContent value="local" className="mt-4">
            <DataCard title="Local SEO Visibility" action={<Button size="sm" variant="outline" onClick={() => setLocalOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add</Button>}>
              {localItems.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <MapPin className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No local visibility data</p>
                  <p className="text-xs text-muted-foreground mb-4">Track your local SEO presence across different locations.</p>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" onClick={() => setLocalOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Location</Button>
                    <Button size="sm" variant="outline" onClick={() => navigate("/integrations")}>Connect Google Business</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {localItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                          <MapPin className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.location_name}</p>
                          {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                        </div>
                      </div>
                      <Badge className={`text-[10px] ${item.visibility_status === "visible" ? "bg-emerald-50 text-emerald-700" : item.visibility_status === "partially_visible" ? "bg-amber-50 text-amber-700" : "bg-secondary text-muted-foreground"}`}>{item.visibility_status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sheets */}
      <Sheet open={kwOpen} onOpenChange={setKwOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Add Keyword</SheetTitle><SheetDescription>Track a search keyword</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Keyword *</Label><Input value={newKw.keyword} onChange={e => setNewKw(p => ({ ...p, keyword: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Current Position</Label><Input type="number" value={newKw.position} onChange={e => setNewKw(p => ({ ...p, position: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Search Volume</Label><Input type="number" value={newKw.search_volume} onChange={e => setNewKw(p => ({ ...p, search_volume: e.target.value }))} /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setKwOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addKeyword}>Add</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={compOpen} onOpenChange={setCompOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Add Competitor</SheetTitle><SheetDescription>Track a competitor domain</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Domain *</Label><Input placeholder="competitor.com" value={newComp.domain} onChange={e => setNewComp(p => ({ ...p, domain: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Authority Score</Label><Input type="number" value={newComp.authority_score} onChange={e => setNewComp(p => ({ ...p, authority_score: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Keywords Count</Label><Input type="number" value={newComp.keywords_count} onChange={e => setNewComp(p => ({ ...p, keywords_count: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Estimated Traffic</Label><Input placeholder="45K" value={newComp.estimated_traffic} onChange={e => setNewComp(p => ({ ...p, estimated_traffic: e.target.value }))} /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCompOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addCompetitor}>Add</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={issueOpen} onOpenChange={setIssueOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Log SEO Issue</SheetTitle><SheetDescription>Report an SEO issue</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={newIssue.issue_title} onChange={e => setNewIssue(p => ({ ...p, issue_title: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newIssue.category} onValueChange={v => setNewIssue(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="backlinks">Backlinks</SelectItem>
                  <SelectItem value="local">Local SEO</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <div className="space-y-2"><Label>Recommendation</Label><Input value={newIssue.recommendation} onChange={e => setNewIssue(p => ({ ...p, recommendation: e.target.value }))} /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setIssueOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addIssue}>Log Issue</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={contentOpen} onOpenChange={setContentOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Add Content Opportunity</SheetTitle><SheetDescription>Plan content for SEO growth</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Topic Title *</Label><Input value={newContent.topic_title} onChange={e => setNewContent(p => ({ ...p, topic_title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Target Keyword</Label><Input value={newContent.target_keyword} onChange={e => setNewContent(p => ({ ...p, target_keyword: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newContent.opportunity_type} onValueChange={v => setNewContent(p => ({ ...p, opportunity_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog_post">Blog Post</SelectItem>
                  <SelectItem value="new_page">New Page</SelectItem>
                  <SelectItem value="location_page">Location Page</SelectItem>
                  <SelectItem value="faq">FAQ</SelectItem>
                  <SelectItem value="optimization">Optimization</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={newContent.priority} onValueChange={v => setNewContent(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setContentOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addContentOpp}>Add</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={localOpen} onOpenChange={setLocalOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Add Location</SheetTitle><SheetDescription>Track local SEO visibility</SheetDescription></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Location Name *</Label><Input placeholder="e.g. Downtown Office" value={newLocal.location_name} onChange={e => setNewLocal(p => ({ ...p, location_name: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Visibility Status</Label>
              <Select value={newLocal.visibility_status} onValueChange={v => setNewLocal(p => ({ ...p, visibility_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visible">Visible</SelectItem>
                  <SelectItem value="partially_visible">Partially Visible</SelectItem>
                  <SelectItem value="not_visible">Not Visible</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Input value={newLocal.notes} onChange={e => setNewLocal(p => ({ ...p, notes: e.target.value }))} /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setLocalOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addLocalItem}>Add</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
