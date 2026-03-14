import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, MousePointerClick, Users, TrendingUp, Plus, AlertTriangle } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Website() {
  const { activeClientId } = useWorkspace();
  const [pages, setPages] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [trafficSources, setTrafficSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageOpen, setPageOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [newPage, setNewPage] = useState({ page_name: "", page_url: "", page_type: "page", visits: "", conversions: "" });
  const [newIssue, setNewIssue] = useState({ issue_title: "", description: "", severity: "medium" });

  const fetchData = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [pRes, iRes, tRes] = await Promise.all([
      supabase.from("website_pages").select("*").eq("client_id", activeClientId).order("visits", { ascending: false }),
      supabase.from("website_issues").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("website_traffic_sources").select("*").eq("client_id", activeClientId).order("visits", { ascending: false }),
    ]);
    setPages(pRes.data || []);
    setIssues(iRes.data || []);
    setTrafficSources(tRes.data || []);
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

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Tracked Pages" value={String(pages.length)} change={`${pages.filter(p => p.status === "active").length} active`} changeType="neutral" icon={Globe} />
        <MetricCard label="Conversion Rate" value={`${avgCvr}%`} change={`${totalLeads} leads total`} changeType="positive" icon={MousePointerClick} />
        <MetricCard label="Total Traffic" value={totalVisits.toLocaleString()} change="All tracked pages" changeType="neutral" icon={Users} />
        <MetricCard label="Open Issues" value={String(openIssues)} change={`${issues.length} total`} changeType={openIssues > 0 ? "negative" : "positive"} icon={AlertTriangle} />
      </WidgetGrid>

      <div className="mt-6">
        <Tabs defaultValue="pages">
          <TabsList className="bg-secondary h-10 rounded-lg">
            <TabsTrigger value="pages" className="rounded-md text-sm">Pages</TabsTrigger>
            <TabsTrigger value="traffic" className="rounded-md text-sm">Traffic</TabsTrigger>
            <TabsTrigger value="issues" className="rounded-md text-sm">Issues</TabsTrigger>
          </TabsList>

          <TabsContent value="pages" className="mt-4">
            <DataCard title="Landing Pages">
              {pages.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No pages tracked yet. Add pages or connect analytics.</p>
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
                        <td className="text-sm font-medium py-3">{p.page_name}</td>
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
                  <p className="text-sm text-muted-foreground">No traffic source data yet. Connect analytics or enter manually.</p>
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
                        <div className="h-full bg-accent rounded-full" style={{ width: `${s.percentage || 0}%` }} />
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
                  <p className="text-sm text-muted-foreground mb-3">No issues logged.</p>
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
                        <Badge className={`text-[10px] ${i.severity === "high" ? "bg-red-50 text-red-600" : i.severity === "medium" ? "bg-amber-50 text-amber-700" : "bg-secondary text-muted-foreground"}`}>
                          {i.severity}
                        </Badge>
                        <Badge className={`text-[10px] ${i.status === "open" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {i.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DataCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Page Sheet */}
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

      {/* Log Issue Sheet */}
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
