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
import { Search, TrendingUp, Shield, Eye, Plus, AlertTriangle } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function SEO() {
  const { activeClientId } = useWorkspace();
  const [keywords, setKeywords] = useState<any[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [kwOpen, setKwOpen] = useState(false);
  const [compOpen, setCompOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [newKw, setNewKw] = useState({ keyword: "", position: "", search_volume: "" });
  const [newComp, setNewComp] = useState({ domain: "", authority_score: "", keywords_count: "", estimated_traffic: "" });
  const [newIssue, setNewIssue] = useState({ issue_title: "", category: "technical", severity: "medium", recommendation: "" });

  const fetchData = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [kRes, cRes, iRes] = await Promise.all([
      supabase.from("seo_keywords").select("*").eq("client_id", activeClientId).order("position", { ascending: true }),
      supabase.from("seo_competitors").select("*").eq("client_id", activeClientId).order("authority_score", { ascending: false }),
      supabase.from("seo_issues").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
    ]);
    setKeywords(kRes.data || []);
    setCompetitors(cRes.data || []);
    setIssues(iRes.data || []);
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

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Keywords Tracked" value={String(keywords.length)} change={`${rankedKws.length} ranked`} changeType="neutral" icon={Search} />
        <MetricCard label="Competitors" value={String(competitors.length)} change="Being tracked" changeType="neutral" icon={Shield} />
        <MetricCard label="Open Issues" value={String(openIssues)} change={`${issues.length} total`} changeType={openIssues > 0 ? "negative" : "positive"} icon={AlertTriangle} />
        <MetricCard label="Avg Position" value={rankedKws.length > 0 ? `#${Math.round(rankedKws.reduce((s, k) => s + k.position, 0) / rankedKws.length)}` : "—"} change="Tracked keywords" changeType="neutral" icon={TrendingUp} />
      </WidgetGrid>

      <div className="mt-6">
        <Tabs defaultValue="keywords">
          <TabsList className="bg-secondary h-10 rounded-lg">
            <TabsTrigger value="keywords" className="rounded-md text-sm">Keywords</TabsTrigger>
            <TabsTrigger value="competitors" className="rounded-md text-sm">Competitors</TabsTrigger>
            <TabsTrigger value="issues" className="rounded-md text-sm">Issues</TabsTrigger>
          </TabsList>

          <TabsContent value="keywords" className="mt-4">
            <DataCard title="Keyword Rankings">
              {keywords.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-3">No keywords tracked yet.</p>
                  <Button size="sm" onClick={() => setKwOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Keyword</Button>
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
                  <p className="text-sm text-muted-foreground mb-3">No competitors tracked.</p>
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
                  <p className="text-sm text-muted-foreground mb-3">No issues logged.</p>
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
        </Tabs>
      </div>

      {/* Add Keyword Sheet */}
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

      {/* Add Competitor Sheet */}
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

      {/* Log Issue Sheet */}
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
    </div>
  );
}
