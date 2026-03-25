import { useState, useEffect } from "react";
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
import {
  Globe, Plus, AlertTriangle, Zap, BarChart3, Plug, Eye,
  Upload, Palette, Search, FileText, Pencil, CheckCircle,
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";

// Website editor components
import { WebsitePageList } from "@/components/website/WebsitePageList";
import { WebsiteSectionEditor } from "@/components/website/WebsiteSectionEditor";
import { WebsiteThemeEditor } from "@/components/website/WebsiteThemeEditor";
import { WebsiteSeoPanel } from "@/components/website/WebsiteSeoPanel";
import { WebsitePreviewFrame } from "@/components/website/WebsitePreviewFrame";
import { WebsitePublishPanel } from "@/components/website/WebsitePublishPanel";
import { WebsiteModeSwitcher } from "@/components/website/WebsiteModeSwitcher";
import { WebsiteExportPanel } from "@/components/website/WebsiteExportPanel";

// Hooks
import { useWebsiteSite } from "@/hooks/useWebsiteSite";
import { useWebsitePages, type WebsitePage } from "@/hooks/useWebsitePages";
import { useWebsiteSections } from "@/hooks/useWebsiteSections";

const DEMO_TRAFFIC = [
  { name: "Mon", visitors: 1200, leads: 32 },
  { name: "Tue", visitors: 1800, leads: 45 },
  { name: "Wed", visitors: 2100, leads: 52 },
  { name: "Thu", visitors: 1900, leads: 48 },
  { name: "Fri", visitors: 2400, leads: 61 },
  { name: "Sat", visitors: 1600, leads: 38 },
  { name: "Sun", visitors: 1400, leads: 30 },
];

export default function Website() {
  const { activeClientId } = useWorkspace();
  const navigate = useNavigate();

  // Website CMS hooks
  const { site, loading: siteLoading, updateSite, refetch: refetchSite } = useWebsiteSite();
  const { pages, loading: pagesLoading, createPage, updatePage, deletePage, refetch: refetchPages } = useWebsitePages();
  const [selectedPage, setSelectedPage] = useState<WebsitePage | null>(null);
  const pageKey = selectedPage?.slug || selectedPage?.page_name?.toLowerCase().replace(/\s+/g, "-") || null;
  const { sections, loading: sectionsLoading, addSection, updateSection, deleteSection, refetch: refetchSections } = useWebsiteSections(pageKey);

  // Analytics data (existing)
  const [issues, setIssues] = useState<any[]>([]);
  const [trafficSources, setTrafficSources] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Sheets for analytics
  const [issueOpen, setIssueOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [newIssue, setNewIssue] = useState({ issue_title: "", description: "", severity: "medium" });
  const [newRec, setNewRec] = useState({ title: "", description: "", recommendation_type: "optimization", priority: "medium" });

  // Auto-select first page
  useEffect(() => {
    if (pages.length > 0 && !selectedPage) {
      setSelectedPage(pages[0]);
    }
  }, [pages]);

  // Load analytics data
  useEffect(() => {
    if (!activeClientId) { setAnalyticsLoading(false); return; }
    setAnalyticsLoading(true);
    Promise.all([
      supabase.from("website_issues").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("website_traffic_sources").select("*").eq("client_id", activeClientId).order("visits", { ascending: false }),
      supabase.from("website_recommendations").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
    ]).then(([iRes, tRes, rRes]) => {
      setIssues(iRes.data || []);
      setTrafficSources(tRes.data || []);
      setRecommendations(rRes.data || []);
      setAnalyticsLoading(false);
    });
  }, [activeClientId]);

  const addIssue = async () => {
    if (!activeClientId || !newIssue.issue_title) return;
    await supabase.from("website_issues").insert({ client_id: activeClientId, issue_title: newIssue.issue_title, description: newIssue.description || null, severity: newIssue.severity });
    toast({ title: "Issue Logged" });
    setNewIssue({ issue_title: "", description: "", severity: "medium" });
    setIssueOpen(false);
    const { data } = await supabase.from("website_issues").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false });
    setIssues(data || []);
  };

  const addRecommendation = async () => {
    if (!activeClientId || !newRec.title) return;
    await supabase.from("website_recommendations").insert({ client_id: activeClientId, title: newRec.title, description: newRec.description || null, recommendation_type: newRec.recommendation_type, priority: newRec.priority });
    toast({ title: "Recommendation Added" });
    setNewRec({ title: "", description: "", recommendation_type: "optimization", priority: "medium" });
    setRecOpen(false);
    const { data } = await supabase.from("website_recommendations").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false });
    setRecommendations(data || []);
  };

  const resolveRecommendation = async (id: string) => {
    await supabase.from("website_recommendations").update({ status: "resolved" }).eq("id", id);
    const { data } = await supabase.from("website_recommendations").select("*").eq("client_id", activeClientId!).order("created_at", { ascending: false });
    setRecommendations(data || []);
  };

  const openIssues = issues.filter(i => i.status === "open").length;
  const draftPages = pages.filter(p => p.publish_status !== "published").length;
  const isExternal = site?.website_mode === "external";

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Website" description="Build and manage your workspace website" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to manage your website.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Website" description="Build, edit, and publish your website">
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => setIssueOpen(true)}>
            <AlertTriangle className="h-4 w-4" /> Log Issue
          </Button>
        </div>
      </PageHeader>

      {/* Status bar */}
      <WidgetGrid columns="repeat(auto-fit, minmax(180px, 1fr))">
        <MetricCard label="Pages" value={String(pages.length)} change={draftPages > 0 ? `${draftPages} draft` : "All published"} changeType={draftPages > 0 ? "neutral" : "positive"} icon={FileText} />
        <MetricCard label="Site Status" value={site?.publish_status === "published" ? "Published" : "Draft"} change={site?.last_published_at ? `Last: ${new Date(site.last_published_at).toLocaleDateString()}` : "Not yet published"} changeType={site?.publish_status === "published" ? "positive" : "neutral"} icon={site?.publish_status === "published" ? CheckCircle : Globe} />
        <MetricCard label="Open Issues" value={String(openIssues)} change={`${issues.length} total`} changeType={openIssues > 0 ? "negative" : "neutral"} icon={AlertTriangle} />
        <MetricCard label="Sections" value={String(sections.length)} change={selectedPage ? `On ${selectedPage.page_name}` : "Select a page"} changeType="neutral" icon={Pencil} />
      </WidgetGrid>

      <div className="mt-6">
        <Tabs defaultValue="pages">
          <TabsList className="bg-secondary h-10 rounded-lg flex-wrap">
            <TabsTrigger value="pages" className="rounded-md text-sm">Pages</TabsTrigger>
            <TabsTrigger value="content" className="rounded-md text-sm">Content</TabsTrigger>
            <TabsTrigger value="theme" className="rounded-md text-sm">Theme</TabsTrigger>
            <TabsTrigger value="seo" className="rounded-md text-sm">SEO</TabsTrigger>
            <TabsTrigger value="preview" className="rounded-md text-sm">Preview</TabsTrigger>
            <TabsTrigger value="publish" className="rounded-md text-sm">Publish</TabsTrigger>
            <TabsTrigger value="traffic" className="rounded-md text-sm">Traffic</TabsTrigger>
            <TabsTrigger value="issues" className="rounded-md text-sm">Issues</TabsTrigger>
            <TabsTrigger value="recs" className="rounded-md text-sm">Recs</TabsTrigger>
          </TabsList>

          {/* ─── Pages Tab ─── */}
          <TabsContent value="pages" className="mt-4">
            <DataCard title="Website Pages">
              <WebsitePageList
                pages={pages}
                selectedPageId={selectedPage?.id}
                onSelectPage={setSelectedPage}
                onCreatePage={createPage}
                onDeletePage={deletePage}
                onUpdatePage={updatePage}
              />
            </DataCard>
          </TabsContent>

          {/* ─── Content Tab ─── */}
          <TabsContent value="content" className="mt-4">
            <DataCard title={selectedPage ? `Editing: ${selectedPage.page_name}` : "Select a page"}>
              {!selectedPage ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-4">Select a page from the Pages tab to edit its content.</p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {pages.slice(0, 5).map(p => (
                      <Button key={p.id} size="sm" variant="outline" onClick={() => setSelectedPage(p)}>{p.page_name}</Button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Page selector */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {pages.map(p => (
                      <Button key={p.id} size="sm" variant={selectedPage?.id === p.id ? "default" : "outline"} className="text-xs h-7"
                        onClick={() => setSelectedPage(p)}>{p.page_name}</Button>
                    ))}
                  </div>
                  <WebsiteSectionEditor
                    sections={sections}
                    pageKey={pageKey!}
                    onAdd={addSection}
                    onUpdate={updateSection}
                    onDelete={deleteSection}
                    clientId={activeClientId!}
                  />
                </>
              )}
            </DataCard>
          </TabsContent>

          {/* ─── Theme Tab ─── */}
          <TabsContent value="theme" className="mt-4">
            <DataCard title="Theme & Branding">
              {site ? (
                <WebsiteThemeEditor site={site} onSave={updateSite} />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading site settings...</p>
              )}
            </DataCard>
          </TabsContent>

          {/* ─── SEO Tab ─── */}
          <TabsContent value="seo" className="mt-4">
            <DataCard title="SEO Settings">
              {selectedPage ? (
                <WebsiteSeoPanel page={selectedPage} onSave={(id, updates) => { updatePage(id, updates); setSelectedPage(p => p ? { ...p, ...updates } : p); }} clientId={activeClientId!} />
              ) : (
                <div className="py-8 text-center">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Select a page to manage its SEO settings.</p>
                  <div className="flex gap-2 justify-center flex-wrap mt-3">
                    {pages.slice(0, 5).map(p => (
                      <Button key={p.id} size="sm" variant="outline" onClick={() => setSelectedPage(p)}>{p.page_name}</Button>
                    ))}
                  </div>
                </div>
              )}
            </DataCard>
          </TabsContent>

          {/* ─── Preview Tab ─── */}
          <TabsContent value="preview" className="mt-4">
            <DataCard title="Website Preview">
              {selectedPage ? (
                <WebsitePreviewFrame sections={sections} site={site} pageName={selectedPage.page_name} />
              ) : (
                <div className="py-8 text-center">
                  <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Select a page to preview.</p>
                </div>
              )}
            </DataCard>
          </TabsContent>

          {/* ─── Publish Tab ─── */}
          <TabsContent value="publish" className="mt-4">
            <DataCard title="Publish">
              <WebsitePublishPanel site={site} pages={pages} onPublish={() => { refetchSite(); refetchPages(); }} />
            </DataCard>
          </TabsContent>

          {/* ─── Traffic Tab ─── */}
          <TabsContent value="traffic" className="mt-4">
            <DataCard title="Traffic Overview">
              {trafficSources.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <DemoDataLabel />
                  <p className="text-xs text-muted-foreground mt-2 mb-4">Connect analytics to see real traffic data. Website editing works without analytics.</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={DEMO_TRAFFIC}>
                      <defs>
                        <linearGradient id="wVis" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsla(var(--primary),.06)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" fill="url(#wVis)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <Button size="sm" variant="outline" className="mt-4" onClick={() => navigate("/integrations")}>
                    <Plug className="h-4 w-4 mr-1" /> Connect Analytics
                  </Button>
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
                        <div className="h-full rounded-full bg-primary" style={{ width: `${s.percentage || 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>

          {/* ─── Issues Tab ─── */}
          <TabsContent value="issues" className="mt-4">
            <DataCard title="Website Issues" action={<Button size="sm" variant="outline" onClick={() => setIssueOpen(true)}><Plus className="h-4 w-4 mr-1" /> Log Issue</Button>}>
              {issues.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium mb-1">No issues logged</p>
                  <p className="text-xs text-muted-foreground mb-4">Track website problems and fixes here.</p>
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
                        <Badge className={`text-[10px] ${i.severity === "high" ? "bg-destructive/10 text-destructive" : i.severity === "medium" ? "bg-amber-50 text-amber-700" : "bg-secondary text-muted-foreground"}`}>{i.severity}</Badge>
                        <Badge className={`text-[10px] ${i.status === "open" ? "bg-primary/10 text-primary" : "bg-emerald-50 text-emerald-700"}`}>{i.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>

          {/* ─── Recs Tab ─── */}
          <TabsContent value="recs" className="mt-4">
            <DataCard title="Recommendations" action={<Button size="sm" variant="outline" onClick={() => setRecOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add</Button>}>
              {recommendations.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium mb-1">No recommendations yet</p>
                  <p className="text-xs text-muted-foreground">Track optimization recommendations here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Zap className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{r.title}</p>
                          <p className="text-xs text-muted-foreground">{r.description || r.recommendation_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{r.priority}</Badge>
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

      {/* Issue Sheet */}
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

      {/* Recommendation Sheet */}
      <Sheet open={recOpen} onOpenChange={setRecOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Add Recommendation</SheetTitle></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={newRec.title} onChange={e => setNewRec(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={newRec.description} onChange={e => setNewRec(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newRec.recommendation_type} onValueChange={v => setNewRec(p => ({ ...p, recommendation_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="optimization">Optimization</SelectItem>
                  <SelectItem value="conversion">Conversion</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="ux">UX/Design</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={newRec.priority} onValueChange={v => setNewRec(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setRecOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addRecommendation}>Add</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
