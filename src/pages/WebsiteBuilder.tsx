import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { MetricCard } from "@/components/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Globe, Plus, Eye, Upload, GripVertical, Type, Image, Video,
  MousePointerClick, MessageSquare, DollarSign, FileText, Smartphone,
  Monitor, MoreHorizontal, ExternalLink, Pencil, Trash2
} from "lucide-react";
import { motion } from "framer-motion";

interface SiteData {
  id: string;
  name: string;
  client: string;
  domain: string;
  status: "Draft" | "Published" | "Archived";
  lastUpdated: string;
  pages: string[];
  visitors: string;
  conversions: string;
}

const mockSites: SiteData[] = [
  { id: "s1", name: "TechCorp Website", client: "TechCorp Inc.", domain: "techcorp.com", status: "Published", lastUpdated: "Mar 11, 2026", pages: ["Home", "About", "Services", "Contact"], visitors: "12,450", conversions: "398" },
  { id: "s2", name: "Bloom Agency Site", client: "Bloom Agency", domain: "bloom.co", status: "Published", lastUpdated: "Mar 10, 2026", pages: ["Home", "Portfolio", "Services", "Contact", "Blog"], visitors: "8,120", conversions: "245" },
  { id: "s3", name: "GrowthLab Landing", client: "GrowthLab", domain: "growthlab.io", status: "Draft", lastUpdated: "Mar 8, 2026", pages: ["Home", "Services"], visitors: "—", conversions: "—" },
  { id: "s4", name: "FitLife Studios", client: "FitLife Studios", domain: "fitlife.com", status: "Archived", lastUpdated: "Feb 20, 2026", pages: ["Home", "About", "Classes", "Contact"], visitors: "3,200", conversions: "89" },
];

const sectionTypes = [
  { name: "Text Block", icon: Type },
  { name: "Image Block", icon: Image },
  { name: "Video Block", icon: Video },
  { name: "CTA Button", icon: MousePointerClick },
  { name: "Testimonials", icon: MessageSquare },
  { name: "Pricing", icon: DollarSign },
  { name: "Contact Form", icon: FileText },
];

const STATUS_STYLE: Record<string, string> = {
  Draft: "bg-amber-50 text-amber-700 border-amber-200",
  Published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Archived: "bg-secondary text-muted-foreground",
};

export default function WebsiteBuilder() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<SiteData | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [editorSections, setEditorSections] = useState([
    { id: "h1", type: "Hero", content: "Welcome to Your Business" },
    { id: "t1", type: "Text Block", content: "We help businesses grow with modern marketing strategies." },
    { id: "i1", type: "Image Block", content: "hero-image.jpg" },
    { id: "c1", type: "CTA Button", content: "Get Started Today" },
    { id: "ts1", type: "Testimonials", content: "3 testimonials" },
    { id: "cf1", type: "Contact Form", content: "Name, Email, Phone, Message" },
  ]);

  const openEditor = (site: SiteData) => {
    setSelectedSite(site);
    setEditorOpen(true);
  };

  const removeSection = (id: string) => {
    setEditorSections((prev) => prev.filter((s) => s.id !== id));
  };

  const addSection = (type: string) => {
    setEditorSections((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, type, content: `New ${type}` },
    ]);
  };

  return (
    <div>
      <PageHeader title="Website Builder" description="Create and manage client websites">
        <Button className="gap-1.5" onClick={() => openEditor(mockSites[0])}>
          <Plus className="h-4 w-4" /> New Website
        </Button>
      </PageHeader>

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Total Sites" value="4" change="2 published" changeType="positive" icon={Globe} />
        <MetricCard label="Total Visitors" value="23,770" change="+12% this month" changeType="positive" icon={Eye} />
        <MetricCard label="Conversions" value="732" change="+18% this month" changeType="positive" icon={MousePointerClick} />
        <MetricCard label="Pages Created" value="15" change="Across all sites" changeType="neutral" icon={FileText} />
      </WidgetGrid>

      {/* Sites grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mt-8">
        {mockSites.map((site) => (
          <motion.div
            key={site.id}
            className="card-widget card-widget-clickable p-5 rounded-2xl cursor-pointer"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onClick={() => openEditor(site)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate">{site.name}</h3>
                <p className="text-xs text-muted-foreground">{site.client}</p>
              </div>
              <Badge className={`shrink-0 ${STATUS_STYLE[site.status]}`}>{site.status}</Badge>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <Globe className="h-3 w-3" />
              <span>{site.domain}</span>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {site.pages.map((p) => (
                <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{p}</span>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border">
              <span>Updated {site.lastUpdated}</span>
              <div className="flex gap-3">
                <span className="tabular-nums">{site.visitors} visits</span>
                <span className="tabular-nums">{site.conversions} conv.</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Page Editor Sheet */}
      <Sheet open={editorOpen} onOpenChange={setEditorOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {selectedSite && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedSite.name} — Page Editor</SheetTitle>
                <SheetDescription>Drag sections to reorder · Click to edit content</SheetDescription>
              </SheetHeader>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant={previewMode === "desktop" ? "default" : "outline"}
                    onClick={() => setPreviewMode("desktop")}
                    className="gap-1"
                  >
                    <Monitor className="h-3.5 w-3.5" /> Desktop
                  </Button>
                  <Button
                    size="sm"
                    variant={previewMode === "mobile" ? "default" : "outline"}
                    onClick={() => setPreviewMode("mobile")}
                    className="gap-1"
                  >
                    <Smartphone className="h-3.5 w-3.5" /> Mobile
                  </Button>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="gap-1">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Button>
                  <Button size="sm" className="gap-1">
                    <Upload className="h-3.5 w-3.5" /> Publish
                  </Button>
                </div>
              </div>

              {/* Section list */}
              <div className={`mt-6 space-y-3 mx-auto ${previewMode === "mobile" ? "max-w-[375px]" : ""}`}>
                {editorSections.map((section) => (
                  <div
                    key={section.id}
                    className="flex items-center gap-3 bg-secondary rounded-xl p-4 group"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{section.type}</p>
                      <p className="text-sm mt-0.5 truncate">{section.content}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-7 w-7"><Pencil className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeSection(section.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add section buttons */}
              <div className="mt-6">
                <p className="metric-label mb-3">Add Section</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {sectionTypes.map((st) => (
                    <button
                      key={st.name}
                      onClick={() => addSection(st.name)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-dashed border-border hover:bg-secondary transition-colors text-center"
                    >
                      <st.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[11px] font-medium text-muted-foreground">{st.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
