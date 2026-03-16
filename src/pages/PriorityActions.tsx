import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Zap, DollarSign, TrendingUp, ArrowUpRight,
  Globe, Target, Star, Megaphone, Users,
  RefreshCw, CheckCircle, Calendar
} from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

interface Action {
  task: string; impact: string; urgency: string;
  icon: any; module: string; moduleName: string;
}

const urgencyStyle = (u: string) =>
  u === "Critical" ? { bg: "hsla(0,72%,51%,.08)", text: "hsl(0 72% 45%)" }
  : u === "High" ? { bg: "hsla(38,92%,50%,.08)", text: "hsl(38 92% 40%)" }
  : { bg: "hsla(211,96%,56%,.06)", text: "hsl(211 96% 46%)" };

export default function PriorityActions() {
  const { activeClientId } = useWorkspace();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    computeActions();
  }, [activeClientId]);

  const computeActions = async () => {
    if (!activeClientId) return;
    setLoading(true);

    const [
      { count: contactCount },
      { data: deals },
      { data: events },
      { data: reviews },
      { data: integrations },
    ] = await Promise.all([
      supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
      supabase.from("crm_deals").select("deal_value, pipeline_stage, status").eq("client_id", activeClientId),
      supabase.from("calendar_events").select("calendar_status").eq("client_id", activeClientId),
      supabase.from("review_requests").select("rating, recovery_needed").eq("client_id", activeClientId),
      supabase.from("client_integrations").select("integration_name, status").eq("client_id", activeClientId),
    ]);

    const d = deals || [];
    const e = events || [];
    const r = reviews || [];
    const intg = integrations || [];
    const contacts = contactCount || 0;

    const acts: Action[] = [];

    // CRM empty
    if (contacts === 0) {
      acts.push({ task: "Import contacts into CRM", impact: "Foundation", urgency: "Critical", icon: Users, module: "/crm", moduleName: "CRM" });
    }

    // Uncontacted leads
    const newLeads = d.filter(x => x.pipeline_stage === "new_lead").length;
    if (newLeads > 3) {
      acts.push({ task: `Follow up with ${newLeads} new leads`, impact: `$${(newLeads * 500).toLocaleString()}/mo`, urgency: "Critical", icon: Users, module: "/crm", moduleName: "CRM" });
    }

    // Recovery needed
    const recovery = r.filter(x => x.recovery_needed).length;
    if (recovery > 0) {
      acts.push({ task: `Resolve ${recovery} customer recovery tasks`, impact: `$${(recovery * 800).toLocaleString()}`, urgency: "Critical", icon: Star, module: "/reviews", moduleName: "Reviews" });
    }

    // No-shows
    const noShows = e.filter(x => x.calendar_status === "no_show").length;
    if (noShows > 0) {
      acts.push({ task: `Set up reminders to reduce ${noShows} no-shows`, impact: `$${(noShows * 300).toLocaleString()}/mo`, urgency: "High", icon: Calendar, module: "/calendar", moduleName: "Calendar" });
    }

    // Review automation
    const completed = e.filter(x => x.calendar_status === "completed").length;
    if (completed > r.length + 2) {
      acts.push({ task: "Enable automatic review requests", impact: `${completed - r.length} missed reviews`, urgency: "High", icon: Star, module: "/reviews", moduleName: "Reviews" });
    }

    // Integrations
    const disconnected = intg.filter(i => i.status !== "connected" && i.status !== "not_needed").length;
    if (disconnected > 2) {
      acts.push({ task: `Connect ${disconnected} remaining integrations`, impact: "Data visibility", urgency: "Medium", icon: Globe, module: "/integrations", moduleName: "Integrations" });
    }

    // Lost deals
    const lost = d.filter(x => x.pipeline_stage === "closed_lost");
    if (lost.length > 2) {
      const lostVal = lost.reduce((s, x) => s + (Number(x.deal_value) || 0), 0);
      acts.push({ task: `Re-engage ${lost.length} lost deals`, impact: `$${Math.round(lostVal * 0.2).toLocaleString()}`, urgency: "High", icon: DollarSign, module: "/crm", moduleName: "CRM" });
    }

    // Sort
    const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2 };
    acts.sort((a, b) => (order[a.urgency] || 3) - (order[b.urgency] || 3));
    setActions(acts);
    setLoading(false);
  };

  const totalImpact = actions.reduce((sum, a) => {
    const num = parseFloat(a.impact.replace(/[^0-9.]/g, ""));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Priority Actions" description="Top AI-recommended actions" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to view priority actions.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Priority Actions" description="Top AI-recommended actions ranked by revenue impact">
        <Button variant="outline" size="sm" onClick={computeActions} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </PageHeader>

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Total Impact" value={totalImpact > 0 ? `$${(totalImpact / 1000).toFixed(1)}K` : "—"} change="If all completed" changeType="positive" icon={DollarSign} />
        <MetricCard label="Critical Actions" value={`${actions.filter(a => a.urgency === "Critical").length}`} change="Need immediate attention" changeType="neutral" icon={Zap} />
        <MetricCard label="Total Actions" value={`${actions.length}`} change="Identified" changeType="neutral" icon={Target} />
        <MetricCard label="Quick Wins" value={`${actions.filter(a => a.urgency === "Medium").length}`} change="Lower effort" changeType="positive" icon={CheckCircle} />
      </WidgetGrid>

      <DataCard title="Prioritized Action List" className="mt-6">
        {actions.length === 0 && !loading ? (
          <div className="py-8 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-3" style={{ color: "hsl(152 60% 44%)" }} />
            <p className="text-sm font-medium text-foreground">All clear!</p>
            <p className="text-xs text-muted-foreground mt-1">No priority actions detected. Keep building your pipeline.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {actions.map((a, i) => {
              const style = urgencyStyle(a.urgency);
              return (
                <motion.div key={i}
                  className="flex items-center justify-between py-3 px-4 rounded-xl transition-all duration-200 hover:shadow-md"
                  style={{ background: "hsla(210,50%,99%,.6)", border: "1px solid hsla(211,96%,56%,.06)" }}
                  initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.04 }} whileHover={{ x: 4 }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                      <a.icon className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.task}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-semibold" style={{ color: "hsl(197 92% 48%)" }}>Est. {a.impact}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <Link to={a.module} className="text-[10px] font-medium hover:underline" style={{ color: "hsl(211 96% 56%)" }}>{a.moduleName}</Link>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-md" style={{ background: style.bg, color: style.text }}>{a.urgency}</span>
                    <Link to={a.module}>
                      <Button size="sm" className="btn-gradient h-7 px-3 rounded-lg text-[10px]">
                        <ArrowUpRight className="h-3 w-3 mr-1" /> Act
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </DataCard>
    </div>
  );
}
