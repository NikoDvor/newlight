import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  systemModules, allCategories, getModulesByCategory,
  statusColor, dependencyLabel, type SystemModule, type SystemCategory,
  getNativeModules, getExternalModules,
} from "@/lib/systemRegistry";
import {
  Server, Layers, Link2, ArrowRight, Search, CheckCircle2, AlertTriangle,
  Clock, CircleDot, Shield, Plug, Activity,
} from "lucide-react";
import { motion } from "framer-motion";

const statusIcon = (s: string) => {
  if (s === "Production Ready" || s === "Operational") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (s === "Partially Operational" || s === "In Progress") return <Clock className="h-3.5 w-3.5" />;
  if (s === "Needs Hardening") return <AlertTriangle className="h-3.5 w-3.5" />;
  return <CircleDot className="h-3.5 w-3.5" />;
};

function ModuleCard({ mod }: { mod: SystemModule }) {
  const dep = dependencyLabel[mod.dependency];
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold truncate">{mod.name}</CardTitle>
            <div className="flex items-center gap-1.5 shrink-0" style={{ color: statusColor[mod.status] }}>
              {statusIcon(mod.status)}
              <span className="text-[10px] font-semibold whitespace-nowrap">{mod.status}</span>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] w-fit" style={{ borderColor: dep.color, color: dep.color }}>
            {dep.label}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <p className="text-muted-foreground leading-relaxed">{mod.description}</p>

          {mod.routes.length > 0 && (
            <div>
              <span className="font-medium text-foreground">Routes:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {mod.routes.map((r) => (
                  <code key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{r}</code>
                ))}
              </div>
            </div>
          )}

          {mod.dataModels.length > 0 && (
            <div>
              <span className="font-medium text-foreground">Data:</span>
              <span className="text-muted-foreground ml-1">{mod.dataModels.join(", ")}</span>
            </div>
          )}

          {mod.feedsInto.length > 0 && (
            <div className="flex items-start gap-1">
              <ArrowRight className="h-3 w-3 mt-0.5 text-primary shrink-0" />
              <span className="text-muted-foreground">Feeds: {mod.feedsInto.join(", ")}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SummaryCards() {
  const native = getNativeModules().length;
  const external = getExternalModules().length;
  const operational = systemModules.filter((m) => m.status === "Operational" || m.status === "Production Ready").length;
  const partial = systemModules.filter((m) => m.status === "Partially Operational" || m.status === "In Progress").length;

  const cards = [
    { label: "Total Modules", value: systemModules.length, icon: Layers, color: "hsl(var(--primary))" },
    { label: "Native Systems", value: native, icon: Server, color: "hsl(var(--primary))" },
    { label: "External Integrations", value: external, icon: Plug, color: "hsl(25 95% 53%)" },
    { label: "Operational", value: operational, icon: CheckCircle2, color: "hsl(142 72% 42%)" },
    { label: "Needs Work", value: partial, icon: AlertTriangle, color: "hsl(38 92% 50%)" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="relative overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: `${c.color}15` }}>
              <c.icon className="h-5 w-5" style={{ color: c.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-[11px] text-muted-foreground font-medium">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BoundaryMap() {
  const groups: { title: string; dep: "Native" | "External-Required" | "External-Optional"; icon: any }[] = [
    { title: "Native NewLight Systems", dep: "Native", icon: Shield },
    { title: "External — Required", dep: "External-Required", icon: Link2 },
    { title: "External — Optional", dep: "External-Optional", icon: Plug },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {groups.map((g) => {
        const mods = systemModules.filter((m) => m.dependency === g.dep);
        const info = dependencyLabel[g.dep];
        return (
          <Card key={g.dep}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <g.icon className="h-4 w-4" style={{ color: info.color }} />
                <CardTitle className="text-sm">{g.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {mods.map((m) => (
                <div key={m.key} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="text-xs font-medium">{m.name}</span>
                  <span className="text-[10px] font-semibold" style={{ color: statusColor[m.status] }}>{m.status}</span>
                </div>
              ))}
              {mods.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DataFlowView() {
  const revenueChain: { from: string; to: string; label: string }[] = [
    { from: "CRM", to: "Proposals", label: "Deal → Quote" },
    { from: "Proposals", to: "Billing", label: "Accepted → Invoice" },
    { from: "Billing", to: "Activation", label: "Paid → Provision" },
    { from: "Activation", to: "Health Scoring", label: "Live → Track" },
    { from: "Health Scoring", to: "AI Insights", label: "Signals → Insights" },
    { from: "AI Insights", to: "Upsell Engine", label: "Opportunity → Offer" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Revenue & Operations Data Flow</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          {revenueChain.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs font-semibold text-primary">{step.from}</p>
              </div>
              <div className="text-[10px] text-muted-foreground whitespace-nowrap">{step.label}</div>
            </div>
          ))}
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs font-semibold text-primary">Revenue Growth</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminArchitecture() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("overview");

  const filtered = search.trim()
    ? systemModules.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.key.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase())
      )
    : systemModules;

  return (
    <div className="space-y-6">
      <PageHeader title="Platform Architecture" subtitle="System map, module readiness, and integration boundaries." />

      <SummaryCards />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search modules..." className="pl-9 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="boundaries" className="text-xs">Boundaries</TabsTrigger>
          <TabsTrigger value="data-flow" className="text-xs">Data Flow</TabsTrigger>
          {allCategories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="text-xs">{cat}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {allCategories.map((cat) => {
            const mods = filtered.filter((m) => m.category === cat);
            if (mods.length === 0) return null;
            return (
              <div key={cat}>
                <h3 className="text-sm font-semibold text-foreground mb-3">{cat}</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {mods.map((m) => <ModuleCard key={m.key} mod={m} />)}
                </div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="boundaries" className="mt-4">
          <BoundaryMap />
        </TabsContent>

        <TabsContent value="data-flow" className="mt-4 space-y-4">
          <DataFlowView />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {systemModules.filter((m) => m.feedsInto.length > 0).map((m) => <ModuleCard key={m.key} mod={m} />)}
          </div>
        </TabsContent>

        {allCategories.map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.filter((m) => m.category === cat).map((m) => <ModuleCard key={m.key} mod={m} />)}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
