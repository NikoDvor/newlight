import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { SetupBanner, DemoDataLabel } from "@/components/SetupBanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Palette, Calendar, FileText, Plus, CheckCircle, Clock, Edit, Eye,
  Lightbulb, Image, Video, Sparkles, ThumbsUp
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { motion } from "framer-motion";

const DEMO_IDEAS = [
  { title: "5 Signs You Need a New Roof", type: "Blog Post", status: "idea", priority: "High", channel: "Website" },
  { title: "Before & After: Kitchen Remodel Timelapse", type: "Short Video", status: "idea", priority: "High", channel: "Instagram, TikTok" },
  { title: "Customer Testimonial — Johnson Family", type: "Video Testimonial", status: "approved", priority: "Medium", channel: "YouTube, Website" },
  { title: "Spring Maintenance Checklist", type: "Carousel", status: "in_production", priority: "Medium", channel: "Instagram, Facebook" },
  { title: "FAQ: How Long Does a Roof Replacement Take?", type: "Blog Post", status: "published", priority: "Low", channel: "Website" },
  { title: "Meet the Team — Employee Spotlight", type: "Photo + Caption", status: "draft", priority: "Low", channel: "LinkedIn" },
];

const DEMO_TEMPLATES = [
  { name: "Before & After Post", type: "Social", uses: 12 },
  { name: "Customer Testimonial Script", type: "Video", uses: 8 },
  { name: "Weekly Tips Carousel", type: "Carousel", uses: 15 },
  { name: "Service Spotlight Blog", type: "Blog", uses: 6 },
];

const STATUS_STYLE: Record<string, string> = {
  idea: "bg-blue-50 text-blue-700",
  draft: "bg-amber-50 text-amber-700",
  in_production: "bg-cyan-50 text-cyan-700",
  pending_approval: "bg-violet-50 text-violet-700",
  approved: "bg-emerald-50 text-emerald-700",
  scheduled: "bg-indigo-50 text-indigo-700",
  published: "bg-primary/10 text-primary",
};

const STATUS_LABEL: Record<string, string> = {
  idea: "Idea", draft: "Draft", in_production: "In Production",
  pending_approval: "Pending Approval", approved: "Approved",
  scheduled: "Scheduled", published: "Published",
};

export default function ContentPlanner() {
  const { activeClientId } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const [ideas] = useState(DEMO_IDEAS);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? ideas : ideas.filter(i => i.status === filter);
  const ideaCount = ideas.filter(i => i.status === "idea").length;
  const draftCount = ideas.filter(i => i.status === "draft").length;
  const approvedCount = ideas.filter(i => ["approved", "published"].includes(i.status)).length;

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Content Planner" description="Plan, create, and manage content across all channels" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6"><p className="text-muted-foreground">Select a workspace to view Content Planner.</p></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Content Planner" description="Plan, create, and manage content across all channels">
        <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New Content
        </Button>
      </PageHeader>

      <ModuleHelpPanel
        moduleName="Content Planner"
        description="Plan and manage all your content — blog posts, social media, videos, and creative assets — in one place. Track ideas from concept to published, manage approvals, and reuse templates."
        tips={[
          "Content moves through: Idea → Draft → Approval → Scheduled → Published",
          "Link content to brand assets and social accounts",
          "Use templates to speed up recurring content types",
        ]}
      />

      <DemoDataLabel />

      <WidgetGrid columns="repeat(auto-fit, minmax(160px, 1fr))">
        <MetricCard label="Ideas" value={String(ideaCount)} change="In pipeline" icon={Lightbulb} />
        <MetricCard label="Drafts" value={String(draftCount)} change="Being created" icon={Edit} />
        <MetricCard label="Approved" value={String(approvedCount)} change="Ready to publish" icon={CheckCircle} />
        <MetricCard label="Templates" value={String(DEMO_TEMPLATES.length)} change="Reusable" icon={FileText} />
      </WidgetGrid>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 mt-6 mb-4">
        {["all", "idea", "draft", "in_production", "pending_approval", "approved", "published"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-colors capitalize ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}>
            {f === "all" ? "All" : STATUS_LABEL[f] || f}
          </button>
        ))}
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList className="bg-secondary h-10 rounded-lg">
          <TabsTrigger value="pipeline" className="rounded-md text-sm">Pipeline</TabsTrigger>
          <TabsTrigger value="templates" className="rounded-md text-sm">Templates</TabsTrigger>
          <TabsTrigger value="ai" className="rounded-md text-sm">AI Ideas</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <DataCard title={`Content Items (${filtered.length})`}>
            {filtered.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.type} · {item.channel}</p>
                </div>
                <Badge className={`text-[10px] h-5 ${STATUS_STYLE[item.status] || ""}`}>{STATUS_LABEL[item.status]}</Badge>
              </motion.div>
            ))}
          </DataCard>
        </TabsContent>

        <TabsContent value="templates">
          <DataCard title="Content Templates">
            {DEMO_TEMPLATES.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.type} · Used {t.uses} times</p>
                </div>
                <Button variant="outline" size="sm" className="text-xs h-7">Use</Button>
              </div>
            ))}
          </DataCard>
        </TabsContent>

        <TabsContent value="ai">
          <DataCard title="AI Content Ideas">
            <div className="space-y-3">
              {[
                { idea: "Create a 'Day in the Life' video of your team at work", type: "Video", impact: "High engagement" },
                { idea: "Write a comparison guide vs your top competitor", type: "Blog", impact: "SEO + authority" },
                { idea: "Share 3 customer success stories as carousel posts", type: "Social", impact: "Social proof" },
                { idea: "Record a FAQ video answering your top 5 customer questions", type: "Video", impact: "Trust + SEO" },
              ].map((ai, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{ai.idea}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{ai.type} · {ai.impact}</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs h-7 shrink-0">Add to Pipeline</Button>
                </div>
              ))}
            </div>
          </DataCard>
        </TabsContent>
      </Tabs>

      {/* Create Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Content Item</SheetTitle>
            <SheetDescription>Add a new content idea, draft, or project to your pipeline.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input placeholder="Content title or idea" /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select defaultValue="blog">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog">Blog Post</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="carousel">Carousel</SelectItem>
                  <SelectItem value="photo">Photo + Caption</SelectItem>
                  <SelectItem value="script">Script</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Channel</Label><Input placeholder="Instagram, Website, etc." /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Details, brief, or script..." className="min-h-[80px]" /></div>
            <Button className="w-full">Add to Pipeline</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}