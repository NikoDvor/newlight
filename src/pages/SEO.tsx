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
import { Search, TrendingUp, Shield, Eye, Plus, AlertTriangle, ArrowUp, ArrowDown, Minus, Target, MapPin, FileText, Sparkles, Loader2, BookOpen, Copy, CheckCheck, Link, RefreshCw, CheckCircle, XCircle } from "lucide-react";
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
  const { activeClientId, isAdmin } = useWorkspace();
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
  const [generating, setGenerating] = useState(false);
  const [runLog, setRunLog] = useState<any[]>([]);
  const [clientType, setClientType] = useState<string | null>(null);
  const [perfScore, setPerfScore] = useState<any>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefOpp, setBriefOpp] = useState<any>(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [gscConnection, setGscConnection] = useState<any>(null);
  const [syncingGsc, setSyncingGsc] = useState(false);

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
    const logRes = await supabase.from("seo_run_log").select("*").order("created_at", { ascending: false }).limit(3);
    setRunLog(logRes.data || []);
    const perfRes = await supabase
      .from("seo_performance_scores")
      .select("*")
      .eq("client_id", activeClientId)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setPerfScore(perfRes.data || null);
    const gscRes = await supabase
      .from("client_oauth_connections")
      .select("*")
      .eq("client_id", activeClientId)
      .eq("integration_type", "gsc")
      .maybeSingle();
    setGscConnection(gscRes.data || null);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeClientId]);

  useEffect(() => {
    if (!activeClientId) { setClientType(null); return; }
    supabase.from("clients").select("business_type").eq("id", activeClientId).maybeSingle()
      .then(({ data }) => setClientType((data as any)?.business_type ?? null));
  }, [activeClientId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("gsc_connected");
    const error = params.get("gsc_error");
    if (connected === "true") {
      toast({ title: "Google Search Console connected", description: "Your GSC data will sync shortly." });
      window.history.replaceState({}, "", window.location.pathname);
      fetchData();
    }
    if (error) {
      toast({ title: "GSC connection failed", description: error, variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

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

  const generatePlan = async () => {
    if (!activeClientId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-generate-plan", {
        body: { client_id: activeClientId },
      });
      if (error) throw error;
      toast({
        title: "SEO plan generated",
        description: `${data.keywords_created} keywords, ${data.content_created} content ideas, ${data.issues_created} issues found`,
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: "Error generating plan",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const connectGsc = async () => {
    if (!activeClientId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `${(supabase as any).supabaseUrl}/functions/v1/gsc-oauth-start?client_id=${activeClientId}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast({ title: "Failed to start GSC connection", variant: "destructive" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const syncGsc = async () => {
    if (!activeClientId) return;
    setSyncingGsc(true);
    try {
      const { data, error } = await supabase.functions.invoke("gsc-data-sync", {
        body: { client_id: activeClientId },
      });
      if (error) throw error;
      toast({
        title: "GSC sync complete",
        description: `${data.keywords_updated} keywords updated with real data.`,
      });
      fetchData();
    } catch (err: any) {
      toast({ title: "GSC sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncingGsc(false);
    }
  };

  const generateBrief = async (opp: any) => {
    if (!activeClientId) return;
    setGeneratingBrief(true);
    setBriefOpp(opp);
    setBriefOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-generate-brief", {
        body: { client_id: activeClientId, opp_id: opp.id },
      });
      if (error) throw error;
      setBriefOpp({ ...opp, brief: data.brief, brief_generated_at: data.brief_generated_at });
      fetchData();
    } catch (err: any) {
      toast({
        title: "Brief generation failed",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
      setBriefOpen(false);
    } finally {
      setGeneratingBrief(false);
    }
  };

  const viewBrief = (opp: any) => {
    setBriefOpp(opp);
    setBriefOpen(true);
  };

  const copyBrief = async (briefText: string) => {
    try {
      let parsed: any = {};
      try { parsed = JSON.parse(briefText); } catch { parsed = {}; }
      const formatted = [
        `PRIMARY KEYWORD: ${parsed.primary_keyword || ""}`,
        `SECONDARY KEYWORDS: ${(parsed.secondary_keywords || []).join(", ")}`,
        `SUGGESTED TITLE: ${parsed.suggested_title || ""}`,
        `META DESCRIPTION: ${parsed.meta_description || ""}`,
        `WORD COUNT: ${parsed.word_count || ""}`,
        `H2 STRUCTURE:`,
        ...(parsed.h2_sections || []).map((s: any, i: number) => `  H2 ${i + 1}: ${s.heading}\n  Note: ${s.note}`),
        `INTERNAL LINKS: ${parsed.internal_link_suggestions || ""}`,
        `CALL TO ACTION: ${parsed.call_to_action || ""}`,
        parsed.compliance_notes ? `COMPLIANCE NOTES:\n${parsed.compliance_notes}` : "",
      ].filter(Boolean).join("\n\n");
      await navigator.clipboard.writeText(formatted);
      toast({ title: "Brief copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const hasRealData = keywords.length > 0 || competitors.length > 0 || issues.length > 0 || contentOpps.length > 0 || localItems.length > 0;
  const rankedKws = keywords.filter(k => k.position);
  const openIssues = issues.filter(i => i.status === "open").length;

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Search Intelligence" description="Monitor search visibility and keyword performance" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to view SEO data.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Search Intelligence"
        description={
          <>
            Monitor search visibility and keyword performance
            {runLog[0] && (
              <span className="block mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                Last refreshed {new Date(runLog[0].created_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {new Date(runLog[0].created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()} · {runLog[0].triggered_by}
              </span>
            )}
          </> as any
        }
      >
        <div className="flex gap-2 items-center">
          {clientType === "financial_firm" && (
            <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-blue-950 text-blue-300 border border-blue-800">
              <Shield className="h-3 w-3" /> Compliance mode
            </span>
          )}
          <Button variant="outline" className="gap-1.5" onClick={generatePlan} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Generating…" : "Generate SEO Plan"}
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setIssueOpen(true)}>
            <AlertTriangle className="h-4 w-4" /> Log Issue
          </Button>
          <Button className="gap-1.5" onClick={() => setKwOpen(true)}>
            <Plus className="h-4 w-4" /> Add Keyword
          </Button>
        </div>
      </PageHeader>

      <ModuleHelpPanel moduleName="Search Intelligence" description="Track keyword rankings, run technical audits, manage content, monitor local visibility, and analyse competitors — all in one place." tips={["Connect Google Search Console to replace AI volume estimates with real ranking data", "Financial firm clients include E-E-A-T audit checks and compliance mode", "Run the weekly audit to keep all client data fresh automatically"]} />

      {!hasRealData && (
        <SetupBanner
          icon={Search}
          title="Track Your Search Rankings"
          description="Add your target keywords and competitors to start monitoring your SEO performance and discover growth opportunities."
          actionLabel="Generate SEO Plan"
          onAction={generatePlan}
          secondaryLabel="Connect Search Console"
          onSecondary={() => navigate("/integrations")}
        />
      )}

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Keywords Tracked" value={hasRealData ? String(keywords.length) : "—"} change={hasRealData ? `${rankedKws.length} ranked` : "Add keywords to track"} changeType="neutral" icon={Search} />
        <MetricCard label="Avg Position" value={rankedKws.length > 0 ? `#${Math.round(rankedKws.reduce((s, k) => s + k.position, 0) / rankedKws.length)}` : "—"} change={hasRealData ? "Tracked keywords" : "Track to measure"} changeType="neutral" icon={TrendingUp} />
        <MetricCard label="Open Issues" value={hasRealData ? String(openIssues) : "—"} change={hasRealData ? `${issues.length} total` : "Run SEO audit"} changeType={openIssues > 0 ? "negative" : "neutral"} icon={AlertTriangle} />
        <MetricCard label="Content Pipeline" value={String(contentOpps.length)} change="View in Content tab" changeType="neutral" icon={FileText} />
        <MetricCard
          label="GSC Status"
          value={gscConnection?.status === "active" ? "Connected" : "—"}
          change={gscConnection?.status === "active" ? gscConnection.property_url || "Active" : "Not connected"}
          changeType={gscConnection?.status === "active" ? "positive" : "neutral"}
          icon={Link}
        />
      </WidgetGrid>

      <div className="mt-6">
        <Tabs defaultValue="rankings">
          <TabsList className="bg-secondary h-10 rounded-lg">
            <TabsTrigger value="rankings" className="rounded-md text-sm">Rankings</TabsTrigger>
            <TabsTrigger value="audit" className="rounded-md text-sm">Site Audit</TabsTrigger>
            <TabsTrigger value="content" className="rounded-md text-sm">Content</TabsTrigger>
            <TabsTrigger value="local" className="rounded-md text-sm">Local</TabsTrigger>
            <TabsTrigger value="competitors" className="rounded-md text-sm">Competitors</TabsTrigger>
          </TabsList>

          <TabsContent value="rankings" className="mt-4">
            <DataCard title="Keyword Rankings">
              <div className="flex items-center justify-between -mt-2 mb-3">
                <p className="text-xs text-muted-foreground">
                  {gscConnection?.status === "active"
                    ? `Real data from Google Search Console · ${gscConnection.property_url || "Connected"}`
                    : "AI estimates · Connect GSC for real position data"}
                </p>
                <div className="flex gap-2">
                  {gscConnection?.status === "active" ? (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={syncGsc} disabled={syncingGsc}>
                      {syncingGsc ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      {syncingGsc ? "Syncing…" : "Sync GSC"}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-[11px] gap-1" onClick={connectGsc}>
                      <Link className="h-3 w-3" /> Connect GSC
                    </Button>
                  )}
                </div>
              </div>
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
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-medium text-muted-foreground py-3">Keyword</th>
                        <th className="text-right text-xs font-medium text-muted-foreground py-3">Position</th>
                        <th className="text-right text-xs font-medium text-muted-foreground py-3">
                          {gscConnection?.status === "active" ? "Impressions" : "Volume"}
                        </th>
                        {gscConnection?.status === "active" && (
                          <th className="text-right text-xs font-medium text-muted-foreground py-3">Clicks</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {keywords.map((k) => (
                        <tr key={k.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                          <td className="text-sm py-3">{k.keyword}</td>
                          <td className="text-sm font-medium text-right py-3 tabular-nums">{k.position ? `#${k.position}` : "—"}</td>
                          <td className="text-sm text-right py-3 tabular-nums text-muted-foreground">{(k.search_volume || 0).toLocaleString()}</td>
                          {gscConnection?.status === "active" && (
                            <td className="text-sm text-right py-3 tabular-nums text-muted-foreground">{(k.clicks || 0).toLocaleString()}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {gscConnection?.status !== "active" && (
                    <p className="text-xs text-muted-foreground mt-2 px-1">
                      Volumes are AI estimates until Search Console is connected.
                    </p>
                  )}
                  {gscConnection?.status === "active" && keywords.some(k => k.last_synced_at) && (
                    <p className="text-xs text-muted-foreground mt-2 px-1">
                      Last synced from Google Search Console · Showing last 28 days of data.
                    </p>
                  )}
                </>
              )}
            </DataCard>
            <DataCard title="Recent SEO runs" className="mt-4">
              {runLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No runs recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {runLog.map((run) => (
                    <div key={run.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(run.created_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {new Date(run.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">{run.triggered_by}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {run.total_keywords} kw · {run.total_content} content · {run.total_issues} issues
                        </span>
                        <Badge className={run.failures?.length > 0 ? "text-[10px] bg-amber-50 text-amber-700" : "text-[10px] bg-emerald-50 text-emerald-700"}>
                          {run.failures?.length > 0 ? `${run.failures.length} client failed` : "success"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
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

          <TabsContent value="audit" className="mt-4">
            {perfScore ? (
              <DataCard title="Core Web Vitals" className="mb-4">
                <p className="text-xs text-muted-foreground -mt-2 mb-4">
                  Powered by Google PageSpeed Insights · Last run {new Date(perfScore.fetched_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {new Date(perfScore.fetched_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()}
                </p>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {[
                    {
                      label: "Performance",
                      value: String(perfScore.performance_score),
                      unit: "/ 100",
                      good: perfScore.performance_score >= 90,
                      warn: perfScore.performance_score >= 50 && perfScore.performance_score < 90,
                    },
                    {
                      label: "Mobile",
                      value: String(perfScore.mobile_score),
                      unit: "/ 100",
                      good: perfScore.mobile_score >= 90,
                      warn: perfScore.mobile_score >= 50 && perfScore.mobile_score < 90,
                    },
                    {
                      label: "LCP",
                      value: perfScore.lcp_ms ? (perfScore.lcp_ms / 1000).toFixed(1) + "s" : "—",
                      unit: "target < 2.5s",
                      good: perfScore.lcp_ms <= 2500,
                      warn: perfScore.lcp_ms > 2500 && perfScore.lcp_ms <= 4000,
                    },
                    {
                      label: "TBT",
                      value: perfScore.tbt_ms ? perfScore.tbt_ms + "ms" : "—",
                      unit: "target < 200ms",
                      good: perfScore.tbt_ms <= 200,
                      warn: perfScore.tbt_ms > 200 && perfScore.tbt_ms <= 600,
                    },
                    {
                      label: "CLS",
                      value: perfScore.cls != null ? Number(perfScore.cls).toFixed(3) : "—",
                      unit: "target < 0.1",
                      good: Number(perfScore.cls) <= 0.1,
                      warn: Number(perfScore.cls) > 0.1 && Number(perfScore.cls) <= 0.25,
                    },
                  ].map((s) => (
                    <div key={s.label} className="bg-secondary rounded-lg p-3 text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">{s.label}</p>
                      <p className={`text-xl font-medium ${s.good ? "text-emerald-600" : s.warn ? "text-amber-600" : "text-red-500"}`}>
                        {s.value}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{s.unit}</p>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium mt-1 ${s.good ? "bg-emerald-50 text-emerald-700" : s.warn ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"}`}>
                        {s.good ? "good" : s.warn ? "needs work" : "poor"}
                      </span>
                    </div>
                  ))}
                </div>
                {issues.filter(i => i.category === "performance").length > 0 && (
                  <>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Performance issues</p>
                    <div className="space-y-1">
                      {issues.filter(i => i.category === "performance").map((i) => (
                        <div key={i.id} className="flex items-start justify-between py-2.5 border-b border-border last:border-0 gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{i.issue_title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{i.recommendation || "No recommendation"}</p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <Badge className={`text-[10px] ${i.severity === "high" ? "bg-red-50 text-red-600" : i.severity === "medium" ? "bg-amber-50 text-amber-700" : "bg-secondary text-muted-foreground"}`}>{i.severity}</Badge>
                            <Badge className={`text-[10px] ${i.status === "open" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{i.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <p className="text-xs text-muted-foreground mt-3">Performance issues refresh on each audit run.</p>
              </DataCard>
            ) : (
              <div className="card-widget p-6 rounded-2xl text-center mb-4">
                <p className="text-sm font-medium text-foreground mb-1">No performance data yet</p>
                <p className="text-xs text-muted-foreground mb-3">Run the SEO plan to fetch Core Web Vitals from Google PageSpeed Insights.</p>
                <Button size="sm" variant="outline" onClick={generatePlan} disabled={generating}>
                  {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  {generating ? "Running…" : "Run audit"}
                </Button>
              </div>
            )}
            <DataCard title="Technical issues">
              {issues.filter(i => i.category !== "performance").length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <AlertTriangle className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No technical issues found</p>
                  <p className="text-xs text-muted-foreground mb-4">Run the audit to check for technical SEO issues.</p>
                  <Button size="sm" onClick={() => setIssueOpen(true)}><AlertTriangle className="h-4 w-4 mr-1" /> Log Issue</Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {issues.filter(i => i.category !== "performance").map((i) => (
                    <div key={i.id} className="flex items-start justify-between py-2.5 border-b border-border last:border-0 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{i.issue_title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{i.category} · {i.recommendation || "No recommendation"}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Badge className={`text-[10px] ${i.severity === "high" ? "bg-red-50 text-red-600" : i.severity === "medium" ? "bg-amber-50 text-amber-700" : "bg-secondary text-muted-foreground"}`}>{i.severity}</Badge>
                        <Badge className={`text-[10px] ${i.status === "open" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{i.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">Technical issues refresh on each audit run. Resolve issues on the site then re-run to clear them.</p>
            </DataCard>
            {clientType === "financial_firm" && (
              <>
                <DataCard title="E-E-A-T signals" className="mt-4">
                  {[
                    { label: "Author bios with credentials", note: "Confirm credentials are visible on published content" },
                    { label: "ADV Part 2 link in footer", note: "Required disclosure for registered investment advisors" },
                    { label: "Disclaimer in footer", note: "Confirm regulatory disclaimer is present site-wide" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start justify-between py-3 border-b border-border last:border-0 gap-3">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>
                      </div>
                      <Badge className="text-[10px] bg-blue-50 text-blue-700 shrink-0">verify</Badge>
                    </div>
                  ))}
                </DataCard>
                <p className="text-xs text-muted-foreground mt-2">E-E-A-T signals support your compliance standard. Verify these are in place on the client's live site.</p>
              </>
            )}
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
                <div className="space-y-1">
                  {contentOpps.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-3 border-b border-border last:border-0 gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                          <FileText className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.topic_title}</p>
                          <p className="text-xs text-muted-foreground">{c.target_keyword ? `Target: ${c.target_keyword}` : c.opportunity_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className={`text-[10px] ${c.priority === "high" ? "bg-blue-50 text-blue-700" : c.priority === "medium" ? "bg-cyan-50 text-cyan-700" : "bg-secondary text-muted-foreground"}`}>{c.priority}</Badge>
                        {c.brief ? (
                          <Badge className="text-[10px] bg-emerald-50 text-emerald-700">brief ready</Badge>
                        ) : (
                          <Badge className={`text-[10px] ${c.status === "open" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{c.status}</Badge>
                        )}
                        {c.brief ? (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => viewBrief(c)}>
                            <BookOpen className="h-3 w-3 mr-1" /> View brief
                          </Button>
                        ) : isAdmin ? (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => generateBrief(c)}>
                            <Sparkles className="h-3 w-3 mr-1" /> Brief
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {clientType === "financial_firm" && (
                <p className="text-xs text-muted-foreground mt-3">Auto-publish is disabled for this client. All content requires compliance approval before publishing.</p>
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

      <Sheet open={briefOpen} onOpenChange={setBriefOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Content brief</SheetTitle>
            <SheetDescription>
              {briefOpp?.topic_title}
              {briefOpp?.brief_generated_at && (
                <span className="block mt-0.5 text-xs">
                  Generated {new Date(briefOpp.brief_generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </SheetDescription>
          </SheetHeader>
          {generatingBrief ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Generating brief…</p>
            </div>
          ) : briefOpp?.brief ? (() => {
            let parsed: any = {};
            try { parsed = JSON.parse(briefOpp.brief); } catch {}
            const isFinancial = clientType === "financial_firm";
            return (
              <div className="mt-6 space-y-5">
                {isFinancial && (
                  <div className="flex gap-2 items-start p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <Shield className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">This brief has been produced to SEC and FINRA standards by NewLight as part of your managed SEO service. Content is built compliant from the ground up. Review compliance notes below before sending to your approval contact.</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Primary keyword</p>
                  <p className="text-sm">{parsed.primary_keyword}</p>
                </div>
                {parsed.secondary_keywords?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Secondary keywords</p>
                    <div className="flex flex-wrap gap-1.5">
                      {parsed.secondary_keywords.map((kw: string, i: number) => (
                        <span key={i} className="px-2 py-1 rounded-full text-xs border border-border text-muted-foreground">{kw}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Suggested title</p>
                  <p className="text-sm font-medium">{parsed.suggested_title}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Meta description</p>
                  <p className="text-sm text-muted-foreground">{parsed.meta_description}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Recommended word count</p>
                  <p className="text-sm">{parsed.word_count}</p>
                </div>
                {parsed.h2_sections?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">H2 structure</p>
                    <div className="space-y-0">
                      {parsed.h2_sections.map((s: any, i: number) => (
                        <div key={i} className="flex gap-3 py-2.5 border-b border-border last:border-0">
                          <span className="text-xs font-medium text-primary shrink-0 min-w-[32px]">H2 {i + 1}</span>
                          <div>
                            <p className="text-sm font-medium">{s.heading}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Internal link suggestions</p>
                  <p className="text-sm text-muted-foreground">{parsed.internal_link_suggestions}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Call to action</p>
                  <p className="text-sm">{parsed.call_to_action}</p>
                </div>
                {isFinancial && parsed.compliance_notes && (
                  <div>
                    <p className="text-[10px] font-medium text-blue-700 uppercase tracking-wide mb-2">Compliance notes</p>
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-xs text-blue-800 leading-relaxed">{parsed.compliance_notes}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 gap-1.5" onClick={() => copyBrief(briefOpp.brief)}>
                    <Copy className="h-4 w-4" /> Copy brief
                  </Button>
                  {isAdmin && (
                    <Button variant="outline" className="gap-1.5" onClick={() => generateBrief(briefOpp)}>
                      <Sparkles className="h-4 w-4" /> Regenerate
                    </Button>
                  )}
                </div>
              </div>
            );
          })() : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
