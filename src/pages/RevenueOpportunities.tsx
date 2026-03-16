import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  DollarSign, TrendingUp, AlertCircle, Target,
  ArrowUpRight, Megaphone, Globe, Share2, Star, Search,
  Users, Calendar, RefreshCw
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

interface Opportunity {
  title: string; explanation: string; missedLeads: string;
  missedRevenue: string; action: string; icon: any; severity: string; module: string;
}

const severityStyle = (s: string) =>
  s === "Critical" ? { bg: "hsla(0,72%,51%,.08)", text: "hsl(0 72% 45%)" }
  : s === "High" ? { bg: "hsla(38,92%,50%,.08)", text: "hsl(38 92% 40%)" }
  : { bg: "hsla(211,96%,56%,.06)", text: "hsl(211 96% 46%)" };

export default function RevenueOpportunities() {
  const { activeClientId } = useWorkspace();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    detectOpportunities();
  }, [activeClientId]);

  const detectOpportunities = async () => {
    if (!activeClientId) return;
    setLoading(true);

    const [
      { count: contactCount },
      { data: deals },
      { data: events },
      { data: reviews },
      { data: integrations },
      { data: campaigns },
    ] = await Promise.all([
      supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
      supabase.from("crm_deals").select("deal_value, pipeline_stage, status").eq("client_id", activeClientId),
      supabase.from("calendar_events").select("calendar_status, contact_name").eq("client_id", activeClientId),
      supabase.from("review_requests").select("rating, status, recovery_needed").eq("client_id", activeClientId),
      supabase.from("client_integrations").select("integration_name, status").eq("client_id", activeClientId),
      supabase.from("ad_campaigns").select("spend, leads, roas, status").eq("client_id", activeClientId),
    ]);

    const d = deals || [];
    const e = events || [];
    const r = reviews || [];
    const intg = integrations || [];
    const contacts = contactCount || 0;

    const opps: Opportunity[] = [];

    // Missed leads - new leads not contacted
    const newLeads = d.filter(x => x.pipeline_stage === "new_lead").length;
    if (newLeads > 0) {
      opps.push({
        title: `${newLeads} uncontacted leads in pipeline`, severity: "Critical",
        explanation: `These leads are sitting idle. Each day without follow-up reduces conversion probability by 10%.`,
        missedLeads: `${newLeads} leads`, missedRevenue: `$${(newLeads * 500).toLocaleString()}/month`,
        action: "Follow up with all new leads", icon: Users, module: "/crm",
      });
    }

    // Missed reviews
    const completedAppts = e.filter(x => x.calendar_status === "completed").length;
    if (completedAppts > r.length + 3) {
      const missed = completedAppts - r.length;
      opps.push({
        title: `${missed} appointments without review requests`, severity: "High",
        explanation: `You completed ${completedAppts} appointments but only sent ${r.length} review requests. Each missed review is lost social proof.`,
        missedLeads: `${missed} reviews`, missedRevenue: `$${(missed * 200).toLocaleString()}/month`,
        action: "Enable automatic review requests", icon: Star, module: "/reviews",
      });
    }

    // Inactive customers - no shows
    const noShows = e.filter(x => x.calendar_status === "no_show").length;
    if (noShows > 0) {
      opps.push({
        title: `${noShows} no-show appointments — lost revenue`, severity: "High",
        explanation: `No-shows represent wasted time slots and missed revenue. Automated reminders can reduce no-shows by 50%.`,
        missedLeads: `${noShows} appointments`, missedRevenue: `$${(noShows * 300).toLocaleString()}/month`,
        action: "Set up appointment reminders", icon: Calendar, module: "/calendar",
      });
    }

    // Lost deals - upsell/recovery
    const lostDeals = d.filter(x => x.pipeline_stage === "closed_lost");
    if (lostDeals.length > 0) {
      const lostValue = lostDeals.reduce((s, x) => s + (Number(x.deal_value) || 0), 0);
      opps.push({
        title: `${lostDeals.length} lost deals — $${lostValue.toLocaleString()} in potential revenue`, severity: "High",
        explanation: `Not all lost deals are truly lost. Re-engagement campaigns can recover 15-20% of lost opportunities.`,
        missedLeads: `${lostDeals.length} deals`, missedRevenue: `$${Math.round(lostValue * 0.2).toLocaleString()}`,
        action: "Create win-back campaign for lost deals", icon: DollarSign, module: "/crm",
      });
    }

    // Missing integrations
    const disconnected = intg.filter(i => i.status !== "connected" && i.status !== "not_needed");
    if (disconnected.length > 2) {
      opps.push({
        title: `${disconnected.length} integrations not connected`, severity: "Medium",
        explanation: `Connecting all your tools unlocks full data visibility and automation capabilities.`,
        missedLeads: "Data gaps", missedRevenue: "Indirect revenue impact",
        action: "Connect remaining integrations", icon: Globe, module: "/integrations",
      });
    }

    // No ad campaigns
    if ((campaigns || []).length === 0) {
      opps.push({
        title: "No paid ad campaigns running", severity: "Medium",
        explanation: `Paid advertising can accelerate lead generation. Consider targeted campaigns on Google or Meta.`,
        missedLeads: "15-30 leads/month", missedRevenue: "$5,000-$15,000/month",
        action: "Launch targeted ad campaigns", icon: Megaphone, module: "/paid-ads",
      });
    }

    // Recovery tasks
    const recoveryNeeded = r.filter(x => x.recovery_needed).length;
    if (recoveryNeeded > 0) {
      opps.push({
        title: `${recoveryNeeded} customers need service recovery`, severity: "Critical",
        explanation: `These customers left negative feedback. Resolving their issues can turn them into advocates.`,
        missedLeads: `${recoveryNeeded} at-risk customers`, missedRevenue: `$${(recoveryNeeded * 800).toLocaleString()}`,
        action: "Address customer recovery tasks", icon: AlertCircle, module: "/reviews",
      });
    }

    // Sort by severity
    const order: Record<string, number> = { Critical: 0, High: 1, Medium: 2 };
    opps.sort((a, b) => (order[a.severity] || 3) - (order[b.severity] || 3));
    setOpportunities(opps);
    setLoading(false);
  };

  const totalMissed = opportunities.reduce((sum, o) => {
    const num = parseFloat(o.missedRevenue.replace(/[^0-9.]/g, ""));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Revenue Opportunities" description="AI-detected growth opportunities" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to detect opportunities.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Revenue Opportunities" description="AI-detected growth opportunities you're missing">
        <Button variant="outline" size="sm" onClick={detectOpportunities} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Rescan
        </Button>
      </PageHeader>

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Est. Missed Revenue" value={totalMissed > 0 ? `$${(totalMissed / 1000).toFixed(1)}K` : "—"} change="Detectable opportunities" changeType="neutral" icon={DollarSign} />
        <MetricCard label="Opportunities Found" value={`${opportunities.length}`} change={`${opportunities.filter(o => o.severity === "Critical").length} critical`} changeType={opportunities.length > 0 ? "negative" : "positive"} icon={AlertCircle} />
        <MetricCard label="Critical Issues" value={`${opportunities.filter(o => o.severity === "Critical").length}`} change="Need immediate action" changeType="neutral" icon={Target} />
        <MetricCard label="Recovery Potential" value={totalMissed > 0 ? `+${Math.round(totalMissed / 1000)}K` : "—"} change="If all fixed" changeType="positive" icon={TrendingUp} />
      </WidgetGrid>

      {opportunities.length === 0 && !loading && (
        <DataCard title="No Opportunities Detected" className="mt-6">
          <div className="py-8 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-3" style={{ color: "hsl(152 60% 44%)" }} />
            <p className="text-sm font-medium text-foreground">Great work!</p>
            <p className="text-xs text-muted-foreground mt-1">No missed opportunities detected. Continue building your pipeline and the system will flag issues as they arise.</p>
          </div>
        </DataCard>
      )}

      <div className="space-y-4 mt-6">
        {opportunities.map((opp, i) => {
          const style = severityStyle(opp.severity);
          return (
            <motion.div key={i} className="card-widget"
              initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.05 }} whileHover={{ y: -2 }}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <opp.icon className="h-5 w-5" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{opp.title}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: style.bg, color: style.text }}>{opp.severity}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{opp.explanation}</p>
                  <div className="flex flex-wrap gap-4 mb-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Impact</p>
                      <p className="text-sm font-bold" style={{ color: "hsl(211 96% 56%)" }}>{opp.missedLeads}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Est. Revenue</p>
                      <p className="text-sm font-bold" style={{ color: "hsl(197 92% 48%)" }}>{opp.missedRevenue}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: "hsla(211,96%,56%,.06)" }}>
                    <ArrowUpRight className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
                    <span className="text-xs font-medium" style={{ color: "hsl(211 96% 50%)" }}>{opp.action}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Link to={opp.module}>
                    <Button size="sm" className="btn-gradient h-8 px-4 rounded-lg text-xs w-full">Fix Now</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
