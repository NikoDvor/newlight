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
  Upload, Palette, Search, FileText, Pencil, CheckCircle, ExternalLink,
  Code2, Copy, CheckCircle2, Loader2, ExternalLink as ExternalLinkIcon, Settings, Wand2,
  MessageSquare,
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
import { WebsiteVisualEditor } from "@/components/website/WebsiteVisualEditor";
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
  const { activeClientId, isAdmin } = useWorkspace();
  const navigate = useNavigate();

  // Website CMS hooks
  const { site, loading: siteLoading, updateSite, refetch: refetchSite } = useWebsiteSite();
  const { pages, loading: pagesLoading, createPage, updatePage, deletePage, refetch: refetchPages } = useWebsitePages();
  const [selectedPage, setSelectedPage] = useState<WebsitePage | null>(null);
  const pageKey = selectedPage?.slug || selectedPage?.page_name?.toLowerCase().replace(/\s+/g, "-") || null;
  const { sections, loading: sectionsLoading, addSection, updateSection, deleteSection, reorderSections, refetch: refetchSections } = useWebsiteSections(pageKey);

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

  // client_websites state
  const [clientWebsite, setClientWebsite] = useState<any>(null);
  const [cwLoading, setCwLoading] = useState(true);
  const [cwSheetOpen, setCwSheetOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeForm, setChangeForm] = useState({
    page_area: '',
    change_type: 'copy_edit',
    priority: 'medium',
    description: '',
    reference_url: '',
  });
  const [cwForm, setCwForm] = useState({
    site_type: 'newlight_build',
    published_url: '',
    lovable_project_url: '',
    custom_domain: '',
    domain_status: 'none',
    build_status: 'not_started',
    external_url: '',
    snippet_status: 'not_installed',
    notes: '',
  });
  const [briefLoading, setBriefLoading] = useState(false);
  const [websiteBrief, setWebsiteBrief] = useState<string | null>(null);
  const [buildUrl, setBuildUrl] = useState<string | null>(null);

  // AI Chat widget local settings
  const [aiWidgetName, setAiWidgetName] = useState("");
  const [aiGreeting, setAiGreeting] = useState("");
  const [aiAssignTo, setAiAssignTo] = useState("");




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

  useEffect(() => {
    if (!activeClientId) { setCwLoading(false); return; }
    setCwLoading(true);
    supabase.from('client_websites').select('*').eq('client_id', activeClientId).maybeSingle()
      .then(({ data }) => { setClientWebsite(data); setCwLoading(false); });
  }, [activeClientId]);

  useEffect(() => {
    if (clientWebsite?.website_brief) setWebsiteBrief(clientWebsite.website_brief);
    if (clientWebsite?.website_build_url) setBuildUrl(clientWebsite.website_build_url);
  }, [clientWebsite]);

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

  const saveCw = async () => {
    if (!activeClientId) return;
    if (clientWebsite) {
      const { data } = await supabase.from('client_websites').update({ ...cwForm, last_updated_at: new Date().toISOString() }).eq('client_id', activeClientId).select().single();
      setClientWebsite(data);
    } else {
      const { data } = await supabase.from('client_websites').insert({ client_id: activeClientId, ...cwForm }).select().single();
      setClientWebsite(data);
    }
    toast({ title: 'Website record saved' });
    setCwSheetOpen(false);
  };

  const openCwSheet = () => {
    if (clientWebsite) setCwForm({
      site_type: clientWebsite.site_type || 'newlight_build',
      published_url: clientWebsite.published_url || '',
      lovable_project_url: clientWebsite.lovable_project_url || '',
      custom_domain: clientWebsite.custom_domain || '',
      domain_status: clientWebsite.domain_status || 'none',
      build_status: clientWebsite.build_status || 'not_started',
      external_url: clientWebsite.external_url || '',
      snippet_status: clientWebsite.snippet_status || 'not_installed',
      notes: clientWebsite.notes || '',
    });
    setCwSheetOpen(true);
  };

  const submitChangeRequest = async () => {
    if (!activeClientId || !changeForm.description.trim()) {
      toast({ title: 'Description required', variant: 'destructive' }); return;
    }
    const structured = [
      `Page/Area: ${changeForm.page_area || 'Not specified'}`,
      `Change Type: ${changeForm.change_type.replace(/_/g, ' ')}`,
      `Priority: ${changeForm.priority}`,
      `Description: ${changeForm.description}`,
      changeForm.reference_url ? `Reference: ${changeForm.reference_url}` : null,
    ].filter(Boolean).join('\n');
    await supabase.from('website_issues').insert({
      client_id: activeClientId,
      issue_title: `Change Request: ${changeForm.change_type.replace(/_/g, ' ')} — ${changeForm.page_area || 'General'}`,
      description: structured,
      severity: changeForm.priority === 'urgent' ? 'high' : changeForm.priority === 'high' ? 'high' : changeForm.priority === 'medium' ? 'medium' : 'low',
      status: 'open',
    });
    toast({ title: 'Change request submitted' });
    setChangeForm({ page_area: '', change_type: 'copy_edit', priority: 'medium', description: '', reference_url: '' });
    setChangeOpen(false);
    const { data } = await supabase.from('website_issues').select('*').eq('client_id', activeClientId).order('created_at', { ascending: false });
    setIssues(data || []);
  };

  const snippetCode = `<!-- NewLight Analytics -->
<script>
  window.__NL_CLIENT__ = "${activeClientId}";
</script>
<script async src="https://cdn.newlightapp.com/tracker.js"></script>`;

  const DOMAIN_STEPS = [
    { key: 'dns_record', label: 'Wildcard DNS record set on domain registrar' },
    { key: 'lovable_domain', label: 'Custom domain configured in Lovable project' },
    { key: 'dns_propagated', label: 'DNS propagation confirmed (allow 24–48h)' },
    { key: 'ssl_active', label: 'SSL certificate active (https:// loads correctly)' },
    { key: 'final_test', label: 'Final URL tested and confirmed working' },
  ];

  const toggleDomainStep = async (key: string) => {
    if (!activeClientId || !clientWebsite) return;
    const current = (clientWebsite.domain_checklist as Record<string, boolean>) || {};
    const updated = { ...current, [key]: !current[key] };
    const { data } = await supabase
      .from('client_websites')
      .update({ domain_checklist: updated })
      .eq('client_id', activeClientId)
      .select()
      .single();
    if (data) setClientWebsite(data);
  };

  const generateBrief = async () => {
    if (!activeClientId) return;
    setBriefLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Calling edge function at:", `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-website-brief`);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-website-brief`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ client_id: activeClientId }),
        }
      );
      const json = await res.json();
      if (json.brief) {
        setWebsiteBrief(json.brief);
        setBuildUrl(json.build_url);
        toast({ title: 'Site brief generated' });
      } else {
        toast({ title: 'Generation failed', description: json.error || 'Unknown error', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setBriefLoading(false);
    }
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
      <PageHeader title="Website" description={isExternal ? "Manage content for your external website" : "Build, edit, and publish your website"}>
        <div className="flex gap-2 items-center">
          {isExternal && (
            <Badge variant="outline" className="text-xs border-primary/30 text-primary gap-1">
              <ExternalLink className="h-3 w-3" /> External Site
            </Badge>
          )}
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
          <TabsTrigger value="site" className="rounded-md text-sm">Site</TabsTrigger>
            <TabsTrigger value="pages" className="rounded-md text-sm">Pages</TabsTrigger>
            <TabsTrigger value="content" className="rounded-md text-sm">Content</TabsTrigger>
            <TabsTrigger value="theme" className="rounded-md text-sm">Theme</TabsTrigger>
            <TabsTrigger value="seo" className="rounded-md text-sm">SEO</TabsTrigger>
            <TabsTrigger value="preview" className="rounded-md text-sm">Preview</TabsTrigger>
            <TabsTrigger value="publish" className="rounded-md text-sm">Publish</TabsTrigger>
            {isExternal && <TabsTrigger value="export" className="rounded-md text-sm">Export</TabsTrigger>}
            <TabsTrigger value="settings" className="rounded-md text-sm">Settings</TabsTrigger>
            <TabsTrigger value="ai-chat" className="rounded-md text-sm">AI Chat</TabsTrigger>
            <TabsTrigger value="traffic" className="rounded-md text-sm">Traffic</TabsTrigger>
            <TabsTrigger value="issues" className="rounded-md text-sm">Issues</TabsTrigger>
            <TabsTrigger value="recs" className="rounded-md text-sm">Recs</TabsTrigger>
          </TabsList>

          {/* ─── Site Tab ─── */}
          <TabsContent value="site" className="mt-4">
            {cwLoading ? (
              <div className="card-widget p-8 rounded-2xl text-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
              </div>
            ) : !clientWebsite ? (
              <DataCard title="Website Tracking">
                <div className="py-10 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No website record yet</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {isAdmin ? "Set up website tracking for this client — choose a NewLight Build or link their existing site." : "Your website is being set up. Check back soon."}
                  </p>
                  {isAdmin && (
                    <Button size="sm" onClick={openCwSheet}><Plus className="h-4 w-4 mr-1" /> Set Up Website</Button>
                  )}
                </div>
              </DataCard>
            ) : clientWebsite.site_type === 'newlight_build' ? (
              /* ── TRACK 1: NewLight Build ── */
              <div className="space-y-4">
                <DataCard title="Your NewLight Website">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase mb-1">Live URL</p>
                        {clientWebsite.published_url ? (
                          <a href={clientWebsite.published_url} target="_blank" rel="noopener noreferrer"
                            className="text-sm font-medium text-primary flex items-center gap-1 hover:underline">
                            {clientWebsite.published_url} <ExternalLinkIcon className="h-3 w-3" />
                          </a>
                        ) : (
                          <p className="text-sm text-muted-foreground">Not yet published</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] ${clientWebsite.domain_status === 'connected' ? 'bg-emerald-50 text-emerald-700' : clientWebsite.domain_status === 'pending' ? 'bg-amber-50 text-amber-700' : clientWebsite.domain_status === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
                          Domain: {clientWebsite.domain_status}
                        </Badge>
                        <Badge className={`text-[10px] ${clientWebsite.build_status === 'live' ? 'bg-emerald-50 text-emerald-700' : clientWebsite.build_status === 'in_progress' ? 'bg-primary/10 text-primary' : clientWebsite.build_status === 'needs_update' ? 'bg-amber-50 text-amber-700' : 'bg-secondary text-muted-foreground'}`}>
                          {clientWebsite.build_status?.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    {clientWebsite.custom_domain && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase mb-1">Custom Domain</p>
                        <p className="text-sm font-medium">{clientWebsite.custom_domain}</p>
                      </div>
                    )}
                    {isAdmin && clientWebsite.lovable_project_url && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase mb-1">Lovable Project</p>
                        <a href={clientWebsite.lovable_project_url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-primary flex items-center gap-1 hover:underline">
                          Open in Lovable <ExternalLinkIcon className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {clientWebsite.last_updated_at && (
                      <p className="text-xs text-muted-foreground">Last updated: {new Date(clientWebsite.last_updated_at).toLocaleDateString()}</p>
                    )}
                    <div className="flex gap-2 pt-2 flex-wrap">
                      <Button size="sm" onClick={() => setChangeOpen(true)}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Request a Change
                      </Button>
                      {isAdmin && (
                        <Button size="sm" variant="outline" onClick={openCwSheet}>
                          <Settings className="h-3.5 w-3.5 mr-1" /> Edit Record
                        </Button>
                      )}
                    </div>
                  </div>
                </DataCard>
                <DataCard title="Domain Connection Checklist">
                  <div className="space-y-1">
                    {DOMAIN_STEPS.map(step => {
                      const checklist = (clientWebsite.domain_checklist as Record<string, boolean>) || {};
                      const checked = checklist[step.key] === true;
                      return (
                        <div key={step.key}
                          onClick={() => isAdmin && toggleDomainStep(step.key)}
                          className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${isAdmin ? 'cursor-pointer hover:bg-secondary/50' : ''}`}>
                          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-border'}`}>
                            {checked && <CheckCircle2 className="h-3 w-3 text-white" />}
                          </div>
                          <span className={`text-sm ${checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-muted-foreground pt-2 px-2">
                      {isAdmin ? 'Click each step to mark complete.' : 'Your NewLight team manages domain connection.'}
                    </p>
                  </div>
                </DataCard>
                {isAdmin && (
                  <DataCard title="AI Site Brief">
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Generate a complete Lovable prompt for this client's website using their business details, service areas, and SEO keywords.
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={generateBrief}
                          disabled={briefLoading}
                        >
                          {briefLoading ? (
                            <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Generating...</>
                          ) : (
                            <><Wand2 className="h-3.5 w-3.5 mr-1" /> Generate Site Brief</>
                          )}
                        </Button>
                        {buildUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(buildUrl, '_blank')}
                          >
                            <ExternalLinkIcon className="h-3.5 w-3.5 mr-1" /> Build Site in Lovable
                          </Button>
                        )}
                      </div>
                      {websiteBrief && (
                        <div className="relative mt-2">
                          <div className="max-h-48 overflow-y-auto rounded-lg bg-secondary p-3 text-xs text-foreground font-mono leading-relaxed whitespace-pre-wrap">
                            {websiteBrief}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-7 gap-1"
                            onClick={() => { navigator.clipboard.writeText(websiteBrief); toast({ title: 'Brief copied' }); }}
                          >
                            <Copy className="h-3 w-3" /> Copy
                          </Button>
                        </div>
                      )}
                    </div>
                  </DataCard>
                )}
              </div>
            ) : (
              /* ── TRACK 2: External Site ── */
              <div className="space-y-4">
                <DataCard title="Your Existing Website">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase mb-1">Website URL</p>
                      {clientWebsite.external_url ? (
                        <a href={clientWebsite.external_url} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-medium text-primary flex items-center gap-1 hover:underline">
                          {clientWebsite.external_url} <ExternalLinkIcon className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground">No URL on file</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] ${clientWebsite.snippet_status === 'installed' ? 'bg-emerald-50 text-emerald-700' : clientWebsite.snippet_status === 'pending' ? 'bg-amber-50 text-amber-700' : clientWebsite.snippet_status === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}>
                        Snippet: {clientWebsite.snippet_status?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </DataCard>
                <DataCard title="Install Tracking Snippet">
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Add this snippet to your website's &lt;head&gt; section to connect analytics and CRM tracking.</p>
                    <div className="relative">
                      <pre className="text-[11px] bg-secondary rounded-lg p-3 overflow-x-auto text-foreground font-mono leading-relaxed whitespace-pre-wrap">{snippetCode}</pre>
                      <Button size="sm" variant="ghost" className="absolute top-2 right-2 h-7 gap-1"
                        onClick={() => { navigator.clipboard.writeText(snippetCode); toast({ title: 'Snippet copied' }); }}>
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {isAdmin && (
                        <>
                          <Button size="sm" variant="outline" onClick={async () => {
                            const { data } = await supabase.from('client_websites').update({ snippet_status: 'installed', snippet_installed: true }).eq('client_id', activeClientId!).select().single();
                            setClientWebsite(data);
                            toast({ title: 'Marked as installed' });
                          }}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark as Installed
                          </Button>
                          <Button size="sm" variant="outline" onClick={openCwSheet}>
                            <Settings className="h-3.5 w-3.5 mr-1" /> Edit Record
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </DataCard>
              </div>
            )}
          </TabsContent>

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
                websiteMode={site?.website_mode}
              />
            </DataCard>
          </TabsContent>

          {/* ─── Content Tab (Visual Editor) ─── */}
          <TabsContent value="content" className="mt-4">
            {!selectedPage ? (
              <DataCard title="Select a page">
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-4">Select a page from the Pages tab to edit its content.</p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {pages.slice(0, 5).map(p => (
                      <Button key={p.id} size="sm" variant="outline" onClick={() => setSelectedPage(p)}>{p.page_name}</Button>
                    ))}
                  </div>
                </div>
              </DataCard>
            ) : (
              <div>
                {/* Page selector */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {pages.filter(p => p.page_source !== "external").map(p => (
                    <Button key={p.id} size="sm" variant={selectedPage?.id === p.id ? "default" : "outline"} className="text-xs h-7"
                      onClick={() => setSelectedPage(p)}>{p.page_name}</Button>
                  ))}
                </div>
                <WebsiteVisualEditor
                  sections={sections}
                  site={site}
                  pageName={selectedPage.page_name}
                  pageKey={pageKey!}
                  onAdd={addSection}
                  onUpdate={updateSection}
                  onDelete={deleteSection}
                  onReorder={reorderSections}
                  clientId={activeClientId!}
                  isExternal={selectedPage.page_source === "external"}
                />
              </div>
            )}
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
                <WebsitePreviewFrame sections={sections} site={site} pageName={selectedPage.page_name} pageSlug={selectedPage.slug || undefined} />
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

          {/* ─── Export Tab (External mode only) ─── */}
          {isExternal && (
            <TabsContent value="export" className="mt-4">
              <DataCard title="Export & Sync">
                <WebsiteExportPanel
                  sections={sections}
                  site={site}
                  pageName={selectedPage?.page_name || "No page selected"}
                />
              </DataCard>
            </TabsContent>
          )}

          {/* ─── Settings Tab ─── */}
          <TabsContent value="settings" className="mt-4">
            <DataCard title="Website Mode & Settings">
              {site ? (
                <WebsiteModeSwitcher site={site} onSave={updateSite} />
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
              )}
            </DataCard>
          </TabsContent>

          {/* ─── AI Chat Tab ─── */}
          <TabsContent value="ai-chat" className="mt-4">
            <DataCard title="AI Chat Widget">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground max-w-md">
                  Embed a chat widget on your website to capture leads and answer visitor questions automatically.
                </p>
              </div>

              <div className="space-y-4 max-w-md mx-auto">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-widget-name" className="text-sm">Widget Name</Label>
                  <Input
                    id="ai-widget-name"
                    value={aiWidgetName}
                    onChange={(e) => setAiWidgetName(e.target.value)}
                    placeholder="e.g. Chat with us"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ai-greeting" className="text-sm">Greeting Message</Label>
                  <Input
                    id="ai-greeting"
                    value={aiGreeting}
                    onChange={(e) => setAiGreeting(e.target.value)}
                    placeholder="e.g. Hi! How can we help you today?"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ai-assign-to" className="text-sm">Assign to</Label>
                  <Select value={aiAssignTo} onValueChange={setAiAssignTo}>
                    <SelectTrigger id="ai-assign-to" className="w-full">
                      <SelectValue placeholder="Select assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_available">First available</SelectItem>
                      <SelectItem value="specific_team_member">Specific team member</SelectItem>
                      <SelectItem value="ai_only">AI only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end mt-6 max-w-md mx-auto">
                <Button size="sm" onClick={() => toast({ title: "AI Chat settings saved" })}>
                  Save Settings
                </Button>
              </div>
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

      {/* Website Record Sheet */}
      <Sheet open={cwSheetOpen} onOpenChange={setCwSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>{clientWebsite ? 'Edit Website Record' : 'Set Up Website'}</SheetTitle></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Site Type</Label>
              <Select value={cwForm.site_type} onValueChange={v => setCwForm(p => ({ ...p, site_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newlight_build">NewLight Build</SelectItem>
                  <SelectItem value="external">External Site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {cwForm.site_type === 'newlight_build' ? (
              <>
                <div className="space-y-2"><Label>Published URL</Label><Input value={cwForm.published_url} onChange={e => setCwForm(p => ({ ...p, published_url: e.target.value }))} placeholder="https://riviera-salon.newlightapp.com" /></div>
                <div className="space-y-2"><Label>Lovable Project URL</Label><Input value={cwForm.lovable_project_url} onChange={e => setCwForm(p => ({ ...p, lovable_project_url: e.target.value }))} placeholder="https://lovable.dev/projects/..." /></div>
                <div className="space-y-2"><Label>Custom Domain</Label><Input value={cwForm.custom_domain} onChange={e => setCwForm(p => ({ ...p, custom_domain: e.target.value }))} placeholder="www.rivierasalon.com" /></div>
                <div className="space-y-2"><Label>Domain Status</Label>
                  <Select value={cwForm.domain_status} onValueChange={v => setCwForm(p => ({ ...p, domain_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="connected">Connected</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Build Status</Label>
                  <Select value={cwForm.build_status} onValueChange={v => setCwForm(p => ({ ...p, build_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="needs_update">Needs Update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2"><Label>External Website URL</Label><Input value={cwForm.external_url} onChange={e => setCwForm(p => ({ ...p, external_url: e.target.value }))} placeholder="https://www.clientsite.com" /></div>
                <div className="space-y-2"><Label>Snippet Status</Label>
                  <Select value={cwForm.snippet_status} onValueChange={v => setCwForm(p => ({ ...p, snippet_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_installed">Not Installed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="installed">Installed</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="space-y-2"><Label>Notes</Label><Input value={cwForm.notes} onChange={e => setCwForm(p => ({ ...p, notes: e.target.value }))} placeholder="Internal notes..." /></div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCwSheetOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={saveCw}>Save</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Change Request Sheet */}
      <Sheet open={changeOpen} onOpenChange={setChangeOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Request a Change</SheetTitle>
            <SheetDescription>Describe what needs to be updated on your website</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label>Page or Area</Label>
              <Input value={changeForm.page_area} onChange={e => setChangeForm(p => ({ ...p, page_area: e.target.value }))} placeholder="e.g. Home page, Services section, Contact form" />
            </div>
            <div className="space-y-2">
              <Label>Type of Change</Label>
              <Select value={changeForm.change_type} onValueChange={v => setChangeForm(p => ({ ...p, change_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="copy_edit">Copy / Text Edit</SelectItem>
                  <SelectItem value="design_change">Design Change</SelectItem>
                  <SelectItem value="new_section">Add New Section</SelectItem>
                  <SelectItem value="new_page">Add New Page</SelectItem>
                  <SelectItem value="bug_fix">Bug Fix</SelectItem>
                  <SelectItem value="image_update">Image Update</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={changeForm.priority} onValueChange={v => setChangeForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low — whenever you get to it</SelectItem>
                  <SelectItem value="medium">Medium — this week</SelectItem>
                  <SelectItem value="high">High — within 48 hours</SelectItem>
                  <SelectItem value="urgent">Urgent — today</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                value={changeForm.description}
                onChange={e => setChangeForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe exactly what you want changed. The more detail the better."
              />
            </div>
            <div className="space-y-2">
              <Label>Reference URL</Label>
              <Input value={changeForm.reference_url} onChange={e => setChangeForm(p => ({ ...p, reference_url: e.target.value }))} placeholder="Link to example, screenshot, or inspiration" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setChangeOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={submitChangeRequest}>Submit Request</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
