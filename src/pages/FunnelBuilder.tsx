import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  GitBranch, Plus, ArrowRight, MousePointerClick, Users, TrendingUp,
  Eye, Pencil, GripVertical, Trash2
} from "lucide-react";
import { motion } from "framer-motion";

interface FunnelStep {
  id: string;
  name: string;
  type: "landing" | "form" | "thank_you" | "upsell";
  visitors: number;
  conversions: number;
}

interface Funnel {
  id: string;
  name: string;
  client: string;
  status: "Draft" | "Published" | "Archived";
  conversionRate: string;
  totalLeads: number;
  steps: FunnelStep[];
}

const mockFunnels: Funnel[] = [
  {
    id: "f1", name: "Free Consultation Funnel", client: "TechCorp Inc.", status: "Published", conversionRate: "12.3%", totalLeads: 263,
    steps: [
      { id: "fs1", name: "Landing Page", type: "landing", visitors: 2140, conversions: 680 },
      { id: "fs2", name: "Consultation Form", type: "form", visitors: 680, conversions: 320 },
      { id: "fs3", name: "Thank You Page", type: "thank_you", visitors: 320, conversions: 263 },
    ],
  },
  {
    id: "f2", name: "SEO Audit Funnel", client: "Bloom Agency", status: "Published", conversionRate: "8.7%", totalLeads: 145,
    steps: [
      { id: "fs4", name: "SEO Landing Page", type: "landing", visitors: 1670, conversions: 410 },
      { id: "fs5", name: "Audit Request Form", type: "form", visitors: 410, conversions: 145 },
      { id: "fs6", name: "Confirmation Page", type: "thank_you", visitors: 145, conversions: 145 },
    ],
  },
  {
    id: "f3", name: "Starter Package Funnel", client: "GrowthLab", status: "Draft", conversionRate: "—", totalLeads: 0,
    steps: [
      { id: "fs7", name: "Offer Page", type: "landing", visitors: 0, conversions: 0 },
      { id: "fs8", name: "Lead Form", type: "form", visitors: 0, conversions: 0 },
      { id: "fs9", name: "Upsell Page", type: "upsell", visitors: 0, conversions: 0 },
      { id: "fs10", name: "Thank You", type: "thank_you", visitors: 0, conversions: 0 },
    ],
  },
];

const STEP_COLORS: Record<string, string> = {
  landing: "bg-blue-50 border-blue-200 text-blue-700",
  form: "bg-violet-50 border-violet-200 text-violet-700",
  thank_you: "bg-emerald-50 border-emerald-200 text-emerald-700",
  upsell: "bg-amber-50 border-amber-200 text-amber-700",
};

const STATUS_STYLE: Record<string, string> = {
  Draft: "bg-amber-50 text-amber-700 border-amber-200",
  Published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Archived: "bg-secondary text-muted-foreground",
};

export default function FunnelBuilder() {
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);

  return (
    <div>
      <PageHeader title="Funnel Builder" description="Create and manage conversion funnels">
        <Button className="gap-1.5"><Plus className="h-4 w-4" /> New Funnel</Button>
      </PageHeader>

      <WidgetGrid columns="repeat(auto-fit, minmax(200px, 1fr))">
        <MetricCard label="Total Funnels" value="3" change="2 published" changeType="positive" icon={GitBranch} />
        <MetricCard label="Total Leads" value="408" change="+24% this month" changeType="positive" icon={Users} />
        <MetricCard label="Avg. Conversion" value="10.5%" change="+2.1% vs last month" changeType="positive" icon={TrendingUp} />
        <MetricCard label="Funnel Views" value="3,810" change="+18% this month" changeType="positive" icon={Eye} />
      </WidgetGrid>

      {/* Funnels grid */}
      <div className="grid gap-6 mt-8">
        {mockFunnels.map((funnel) => (
          <motion.div
            key={funnel.id}
            className="card-widget p-6 rounded-2xl cursor-pointer card-widget-clickable"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onClick={() => setSelectedFunnel(funnel)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold">{funnel.name}</h3>
                <p className="text-xs text-muted-foreground">{funnel.client}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_STYLE[funnel.status]}>{funnel.status}</Badge>
              </div>
            </div>

            {/* Funnel flow visualization */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {funnel.steps.map((step, i) => (
                <div key={step.id} className="flex items-center gap-2 shrink-0">
                  <div className={`rounded-xl border px-4 py-3 min-w-[140px] ${STEP_COLORS[step.type]}`}>
                    <p className="text-xs font-semibold">{step.name}</p>
                    <div className="flex gap-3 mt-1.5">
                      <span className="text-[10px] tabular-nums">{step.visitors.toLocaleString()} visits</span>
                      <span className="text-[10px] tabular-nums">{step.conversions.toLocaleString()} conv.</span>
                    </div>
                  </div>
                  {i < funnel.steps.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
              <span>Conversion Rate: <span className="font-semibold text-foreground tabular-nums">{funnel.conversionRate}</span></span>
              <span>Total Leads: <span className="font-semibold text-foreground tabular-nums">{funnel.totalLeads}</span></span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Funnel Detail Sheet */}
      <Sheet open={!!selectedFunnel} onOpenChange={(open) => !open && setSelectedFunnel(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedFunnel && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedFunnel.name}</SheetTitle>
                <SheetDescription>{selectedFunnel.client} · {selectedFunnel.status}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-3">
                <p className="metric-label">Funnel Steps</p>
                {selectedFunnel.steps.map((step, i) => (
                  <div key={step.id} className="flex items-center gap-3 group">
                    <div className="flex flex-col items-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${STEP_COLORS[step.type]}`}>
                        {i + 1}
                      </div>
                      {i < selectedFunnel.steps.length - 1 && <div className="w-px h-6 bg-border" />}
                    </div>
                    <div className="flex-1 bg-secondary rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{step.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{step.type.replace("_", " ")}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-7 w-7"><Pencil className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7"><GripVertical className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="tabular-nums">{step.visitors.toLocaleString()} visitors</span>
                        <span className="tabular-nums">{step.conversions.toLocaleString()} conversions</span>
                        <span className="tabular-nums">
                          {step.visitors > 0 ? ((step.conversions / step.visitors) * 100).toFixed(1) : "0"}% CVR
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <Button variant="outline" className="w-full gap-1.5">
                  <Plus className="h-4 w-4" /> Add Step
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
