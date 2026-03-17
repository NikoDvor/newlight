import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen, FileText, Search, FolderOpen, GraduationCap,
  ChevronRight, Clock, Eye
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { motion } from "framer-motion";

const CATEGORIES = [
  { name: "Getting Started", count: 4, icon: "🚀" },
  { name: "CRM & Sales", count: 6, icon: "👥" },
  { name: "Calendar & Booking", count: 5, icon: "📅" },
  { name: "Reviews & Reputation", count: 3, icon: "⭐" },
  { name: "SEO & Website", count: 4, icon: "🔍" },
  { name: "Ads & Social", count: 3, icon: "📣" },
  { name: "Finance & Payroll", count: 4, icon: "💰" },
  { name: "Automations", count: 3, icon: "⚡" },
];

const ARTICLES = [
  { title: "How to Add Your First Contact", category: "Getting Started", type: "Guide", readTime: "3 min", views: 142 },
  { title: "Setting Up Your Calendar & Availability", category: "Getting Started", type: "Guide", readTime: "5 min", views: 98 },
  { title: "Understanding Pipeline Stages", category: "CRM & Sales", type: "Guide", readTime: "4 min", views: 87 },
  { title: "Sending Review Requests", category: "Reviews & Reputation", type: "SOP", readTime: "3 min", views: 65 },
  { title: "Connecting Google Ads", category: "Ads & Social", type: "Guide", readTime: "6 min", views: 54 },
  { title: "Running Payroll", category: "Finance & Payroll", type: "SOP", readTime: "8 min", views: 43 },
  { title: "Creating Automations", category: "Automations", type: "Guide", readTime: "7 min", views: 71 },
  { title: "SEO Keyword Tracking", category: "SEO & Website", type: "Guide", readTime: "4 min", views: 56 },
];

const SOPS = [
  { title: "New Client Onboarding Process", dept: "Operations", steps: 12, lastUpdated: "2026-03-10" },
  { title: "Review Recovery Workflow", dept: "Customer Success", steps: 8, lastUpdated: "2026-03-05" },
  { title: "Monthly Report Generation", dept: "Marketing", steps: 6, lastUpdated: "2026-02-28" },
  { title: "Lead Qualification Checklist", dept: "Sales", steps: 10, lastUpdated: "2026-03-12" },
];

export default function KnowledgeBase() {
  const { activeClientId } = useWorkspace();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredArticles = ARTICLES.filter(a => {
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || a.category === selectedCategory;
    return matchSearch && matchCat;
  });

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Knowledge Base" description="Help articles, SOPs, and training guides" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6"><p className="text-muted-foreground">Select a workspace to view Knowledge Base.</p></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Knowledge Base" description="Help articles, SOPs, and training guides" />

      <ModuleHelpPanel
        moduleName="Knowledge Base"
        description="A centralized hub for help articles, standard operating procedures (SOPs), and training guides. Use this to onboard team members, document processes, and provide self-service help."
        tips={[
          "Browse by category or search for specific topics",
          "SOPs document step-by-step internal processes",
          "Articles are linked to relevant platform modules",
        ]}
      />

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={e => { setSearch(e.target.value); setSelectedCategory(null); }}
          placeholder="Search articles, SOPs, and guides..." className="pl-10 h-11 text-sm" />
      </div>

      <WidgetGrid columns="repeat(auto-fit, minmax(160px, 1fr))">
        <MetricCard label="Articles" value={String(ARTICLES.length)} change="Help guides" icon={BookOpen} />
        <MetricCard label="SOPs" value={String(SOPS.length)} change="Procedures" icon={FileText} />
        <MetricCard label="Categories" value={String(CATEGORIES.length)} change="Topics" icon={FolderOpen} />
        <MetricCard label="Total Views" value={String(ARTICLES.reduce((s, a) => s + a.views, 0))} change="All time" icon={Eye} />
      </WidgetGrid>

      <Tabs defaultValue="articles" className="mt-6">
        <TabsList className="bg-secondary h-10 rounded-lg">
          <TabsTrigger value="articles" className="rounded-md text-sm">Articles</TabsTrigger>
          <TabsTrigger value="sops" className="rounded-md text-sm">SOPs</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-md text-sm">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="articles">
          <DataCard title={`Articles (${filteredArticles.length})`}>
            {filteredArticles.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors border-b border-border last:border-0 cursor-pointer">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-primary/10 shrink-0">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.category} · {a.readTime} read · {a.views} views</p>
                </div>
                <Badge variant="secondary" className="text-[10px] h-5">{a.type}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </motion.div>
            ))}
          </DataCard>
        </TabsContent>

        <TabsContent value="sops">
          <DataCard title="Standard Operating Procedures">
            {SOPS.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors border-b border-border last:border-0 cursor-pointer">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-accent/10 shrink-0">
                  <FileText className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.dept} · {s.steps} steps · Updated {new Date(s.lastUpdated).toLocaleDateString()}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </motion.div>
            ))}
          </DataCard>
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CATEGORIES.map((c, i) => (
              <motion.button key={i} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                onClick={() => { setSelectedCategory(c.name); }}
                className={`card-widget text-left transition-all hover:shadow-md ${selectedCategory === c.name ? "ring-2 ring-primary" : ""}`}>
                <div className="text-2xl mb-2">{c.icon}</div>
                <p className="text-sm font-semibold text-foreground">{c.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{c.count} articles</p>
              </motion.button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}