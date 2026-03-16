import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { MetricCard } from "@/components/MetricCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Brain, TrendingUp, Target, Zap, ArrowUpRight, AlertTriangle,
  DollarSign, Globe, Search, Megaphone, Share2, Star, Users,
  CheckCircle2, ChevronRight, Lightbulb, BarChart3, Rocket, RefreshCw
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from "recharts";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

interface Insight {
  priority: string; title: string; explanation: string;
  impact: string; action: string; revenue: string;
  module: string; moduleName: string; icon: any;
}

const priorityColor = (p: string) =>
  p === "Critical" ? { bg: "hsla(0,72%,51%,.08)", text: "hsl(0 72% 45%)", border: "hsla(0,72%,51%,.15)" }
  : p === "High" ? { bg: "hsla(38,92%,50%,.08)", text: "hsl(38 92% 40%)", border: "hsla(38,92%,50%,.12)" }
  : { bg: "hsla(211,96%,56%,.06)", text: "hsl(211 96% 46%)", border: "hsla(211,96%,56%,.1)" };

export default function GrowthAdvisor() {
  const { activeClientId } = useWorkspace();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState("");
  const [strategyMetrics, setStrategyMetrics] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);

  useEffect(() => {
    if (!activeClientId) { setLoading(false); return; }
    generateInsights();
  }, [activeClientId]);

  const generateInsights = async () => {
    if (!activeClientId) return;
    setLoading(true);

    const [
      { count: contactCount },
      { data: deals },
      { data: events },
      { data: reviews },
      { data: integrations },
      { data: campaigns },
      { data: healthScores },
    ] = await Promise.all([
      supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
      supabase.from("crm_deals").select("deal_value, pipeline_stage, status").eq("client_id", activeClientId),
      supabase.from("calendar_events").select("calendar_status").eq("client_id", activeClientId),
      supabase.from("review_requests").select("rating, status, recovery_needed, public_review_left").eq("client_id", activeClientId),
      supabase.from("client_integrations").select("integration_name, status").eq("client_id", activeClientId),
      supabase.from("ad_campaigns").select("spend, leads, roas, status, campaign_name").eq("client_id", activeClientId),
      supabase.from("client_health_scores").select("*").eq("client_id", activeClientId).maybeSingle(),
    ]);

    const d = deals || [];
    const e = events || [];
    const r = reviews || [];
    const c = campaigns || [];
    const intg = integrations || [];
    const contacts = contactCount || 0;

    const openDeals = d.filter(x => x.status === "open");
    const wonDeals = d.filter(x => x.pipeline_stage === "closed_won");
    const lostDeals = d.filter(x => x.pipeline_stage === "closed_lost");
    const pipelineValue = openDeals.reduce((s, x) => s + (Number(x.deal_value) || 0), 0);
    const wonValue = wonDeals.reduce((s, x) => s + (Number(x.deal_value) || 0), 0);
    const completedAppts = e.filter(x => x.calendar_status === "completed").length;
    const totalAppts = e.length;
    const noShows = e.filter(x => x.calendar_status === "no_show").length;
    const ratedReviews = r.filter(x => x.rating);
    const avgRating = ratedReviews.length > 0 ? ratedReviews.reduce((s, x) => s + x.rating, 0) / ratedReviews.length : 0;
    const connectedIntg = intg.filter(i => i.status === "connected").length;
    const totalSpend = c.reduce((s, x) => s + (Number(x.spend) || 0), 0);
    const totalAdLeads = c.reduce((s, x) => s + (Number(x.leads) || 0), 0);

    // Generate dynamic insights
    const generatedInsights: Insight[] = [];

    // Contact/Lead insights
    const newLeads = d.filter(x => x.pipeline_stage === "new_lead").length;
    if (newLeads > 5) {
      generatedInsights.push({
        priority: "Critical", title: `${newLeads} leads have not been contacted`,
        explanation: `You have ${newLeads} leads sitting in the "New Lead" stage. Each uncontacted lead is a missed opportunity.`,
        impact: `Could convert ${Math.round(newLeads * 0.3)} into appointments`, action: "Follow up with new leads today",
        revenue: `$${(newLeads * 500).toLocaleString()}/mo`, module: "/crm", moduleName: "CRM", icon: Users,
      });
    }

    // Appointment conversion
    if (totalAppts > 3) {
      const convRate = completedAppts / totalAppts * 100;
      if (convRate < 70) {
        generatedInsights.push({
          priority: "High", title: `Booking conversion rate is ${convRate.toFixed(0)}% — below benchmark`,
          explanation: `Industry benchmark is 75-85%. ${noShows} no-shows detected. Automated reminders could improve this.`,
          impact: `${Math.round(totalAppts * 0.15)} more completed appointments`, action: "Enable appointment reminders",
          revenue: `$${(Math.round(totalAppts * 0.15) * 300).toLocaleString()}/mo`, module: "/calendar", moduleName: "Calendar", icon: Target,
        });
      }
    }

    // Review insights
    if (avgRating > 0 && avgRating < 4.5) {
      generatedInsights.push({
        priority: "High", title: `Review rating ${avgRating.toFixed(1)}★ is below the 4.5★ trust threshold`,
        explanation: `Customers trust businesses with 4.5★+ ratings 32% more. Improving your rating could lift conversions significantly.`,
        impact: "15% conversion lift potential", action: "Launch automated review request campaign",
        revenue: `$${Math.round(wonValue * 0.15).toLocaleString()}/mo`, module: "/reviews", moduleName: "Reviews", icon: Star,
      });
    } else if (r.length < 5 && completedAppts > 3) {
      generatedInsights.push({
        priority: "High", title: `Low review volume relative to ${completedAppts} completed appointments`,
        explanation: `Only ${r.length} review requests sent despite ${completedAppts} completed appointments. You're missing review opportunities.`,
        impact: "Build social proof faster", action: "Automate review requests after appointments",
        revenue: "$2,500/mo", module: "/reviews", moduleName: "Reviews", icon: Star,
      });
    }

    // Integration insights
    if (connectedIntg < 3) {
      generatedInsights.push({
        priority: "Medium", title: `Only ${connectedIntg} integrations connected`,
        explanation: `Connecting Google Analytics, Search Console, and other tools gives you deeper performance data and enables AI-driven insights.`,
        impact: "Unlock full data-driven insights", action: "Connect remaining integrations",
        revenue: "Indirect", module: "/integrations", moduleName: "Integrations", icon: Globe,
      });
    }

    // CRM health
    if (contacts === 0) {
      generatedInsights.push({
        priority: "Critical", title: "CRM is empty — no contacts imported",
        explanation: "Your CRM has no contacts. Import your existing customer list to start tracking relationships and revenue.",
        impact: "Foundation for all growth systems", action: "Import contacts into CRM",
        revenue: "Foundation", module: "/crm", moduleName: "CRM", icon: Users,
      });
    }

    // Ad performance
    if (c.length > 0 && totalAdLeads > 0) {
      const avgCPL = totalSpend / totalAdLeads;
      if (avgCPL > 50) {
        generatedInsights.push({
          priority: "High", title: `Ad cost per lead is $${avgCPL.toFixed(0)} — optimize campaigns`,
          explanation: `Your average CPL of $${avgCPL.toFixed(0)} is above typical benchmarks. Optimizing targeting could reduce costs significantly.`,
          impact: `Save $${Math.round(totalSpend * 0.2).toLocaleString()}/mo`, action: "Optimize ad targeting and keywords",
          revenue: `$${Math.round(totalSpend * 0.2).toLocaleString()}/mo saved`, module: "/paid-ads", moduleName: "Ads", icon: Megaphone,
        });
      }
    } else if (c.length === 0) {
      generatedInsights.push({
        priority: "Medium", title: "No ad campaigns running",
        explanation: "Paid advertising can accelerate lead generation. Consider launching targeted Google or Meta campaigns.",
        impact: "New lead acquisition channel", action: "Set up first ad campaign",
        revenue: "Variable", module: "/paid-ads", moduleName: "Ads", icon: Megaphone,
      });
    }

    // Lost deals
    if (lostDeals.length > 3) {
      const lostValue = lostDeals.reduce((s, x) => s + (Number(x.deal_value) || 0), 0);
      generatedInsights.push({
        priority: "High", title: `${lostDeals.length} deals lost — $${lostValue.toLocaleString()} in potential revenue`,
        explanation: "Analyze lost deals for patterns. Common causes: slow follow-up, pricing issues, or competitor advantage.",
        impact: `Recover ${Math.round(lostDeals.length * 0.2)} deals`, action: "Review lost deal patterns and follow up",
        revenue: `$${Math.round(lostValue * 0.2).toLocaleString()}`, module: "/crm", moduleName: "CRM", icon: DollarSign,
      });
    }

    // Sort by priority
    const priorityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    generatedInsights.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

    setInsights(generatedInsights);

    // Strategy metrics
    setStrategyMetrics([
      { label: "Total Contacts", value: String(contacts), detail: "In CRM", icon: Users },
      { label: "Pipeline Value", value: `$${(pipelineValue / 1000).toFixed(1)}K`, detail: `${openDeals.length} open deals`, icon: DollarSign },
      { label: "Revenue Won", value: `$${(wonValue / 1000).toFixed(1)}K`, detail: `${wonDeals.length} closed`, icon: TrendingUp },
      { label: "Avg Rating", value: avgRating > 0 ? `${avgRating.toFixed(1)}★` : "—", detail: `${r.length} reviews`, icon: Star },
      { label: "Appt Rate", value: totalAppts > 0 ? `${(completedAppts / totalAppts * 100).toFixed(0)}%` : "—", detail: `${completedAppts}/${totalAppts}`, icon: Target },
      { label: "Integrations", value: `${connectedIntg}/${intg.length}`, detail: "Connected", icon: Globe },
    ]);

    // Goals
    setGoals([
      { goal: "Grow contacts to 50+", progress: Math.min(100, (contacts / 50) * 100), current: String(contacts), target: "50" },
      { goal: "Close 10 deals", progress: Math.min(100, (wonDeals.length / 10) * 100), current: String(wonDeals.length), target: "10" },
      { goal: "Reach 4.5★ review rating", progress: avgRating > 0 ? Math.min(100, (avgRating / 4.5) * 100) : 0, current: avgRating > 0 ? `${avgRating.toFixed(1)}★` : "—", target: "4.5★" },
      { goal: "Connect all integrations", progress: intg.length > 0 ? (connectedIntg / intg.length) * 100 : 0, current: String(connectedIntg), target: String(intg.length) },
    ]);

    // Summary
    const totalMissed = generatedInsights.reduce((s, i) => {
      const num = parseFloat(i.revenue.replace(/[^0-9.]/g, ""));
      return s + (isNaN(num) ? 0 : num);
    }, 0);
    const critCount = generatedInsights.filter(i => i.priority === "Critical").length;
    setSummary(
      `Based on your workspace data: ${generatedInsights.length} growth insights detected. ` +
      (critCount > 0 ? `${critCount} critical items need immediate attention. ` : "") +
      (totalMissed > 0 ? `Estimated missed opportunity: $${totalMissed.toLocaleString()}/mo. ` : "") +
      (contacts === 0 ? "Start by importing contacts into your CRM. " : "") +
      (avgRating > 0 && avgRating < 4.5 ? `Review rating (${avgRating.toFixed(1)}★) needs improvement. ` : "")
    );

    setLoading(false);
  };

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="AI Growth Advisor" description="Analyzing performance and recommending growth actions" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to view growth insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="AI Growth Advisor" description="Your intelligent growth strategist — analyzing performance and recommending what to do next">
        <Button variant="outline" size="sm" onClick={generateInsights} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </PageHeader>

      {/* AI Summary Banner */}
      {summary && (
        <motion.div className="card-widget mb-6 relative overflow-hidden"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            background: "linear-gradient(135deg, hsla(211,96%,56%,.06) 0%, hsla(197,92%,68%,.04) 100%)"
          }} />
          <div className="relative flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{
              background: "hsla(211,96%,56%,.1)", boxShadow: "0 0 24px -4px hsla(211,96%,56%,.2)"
            }}>
              <Brain className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground mb-1">Growth Advisor Summary</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{summary}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Strategy Dashboard */}
      <WidgetGrid columns="repeat(auto-fit, minmax(140px, 1fr))">
        {strategyMetrics.map((m, i) => (
          <motion.div key={m.label} className="card-widget text-center"
            initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
            <div className="h-9 w-9 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: "hsla(211,96%,56%,.08)" }}>
              <m.icon className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">{m.label}</p>
            <p className="text-sm font-bold text-foreground mt-0.5">{m.value}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{m.detail}</p>
          </motion.div>
        ))}
      </WidgetGrid>

      {/* Priority Recommendations + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 mb-6">
        <div className="lg:col-span-2">
          <DataCard title={`Priority Insights (${insights.length})`}>
            {insights.length === 0 && !loading ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-3" style={{ color: "hsl(152 60% 44%)" }} />
                <p className="text-sm font-medium text-foreground">Looking good!</p>
                <p className="text-xs text-muted-foreground mt-1">No critical issues detected. Keep building your pipeline.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {insights.map((r, i) => {
                  const style = priorityColor(r.priority);
                  return (
                    <motion.div key={i} className="p-3 rounded-xl border transition-all hover:shadow-md"
                      style={{ borderColor: style.border, background: style.bg }}
                      initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: "hsla(211,96%,56%,.1)" }}>
                          <r.icon className="h-4 w-4" style={{ color: "hsl(211 96% 56%)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{
                              background: style.bg, color: style.text, border: `1px solid ${style.border}`
                            }}>{r.priority}</span>
                            <span className="text-[9px] text-muted-foreground">{r.moduleName}</span>
                          </div>
                          <p className="text-xs font-semibold text-foreground mb-1">{r.title}</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{r.explanation}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold" style={{ color: "hsl(197 92% 48%)" }}>Est. {r.revenue}</span>
                            <Link to={r.module} className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "hsl(211 96% 56%)" }}>
                              Take Action <ChevronRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </DataCard>
        </div>

        <div className="space-y-6">
          <DataCard title="Growth Goals">
            <div className="space-y-4">
              {goals.map((g, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 4 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium text-foreground">{g.goal}</p>
                    <span className="text-[10px] font-semibold" style={{ color: "hsl(211 96% 56%)" }}>{g.progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={g.progress} className="h-1.5" />
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-muted-foreground">Current: {g.current}</span>
                    <span className="text-[9px] text-muted-foreground">Target: {g.target}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </DataCard>

          <DataCard title="Top 3 Priority Actions">
            <div className="space-y-2">
              {insights.slice(0, 3).map((a, i) => (
                <motion.div key={i} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-primary/[0.03] transition-colors"
                  initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                  <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <a.icon className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{a.action}</p>
                    <p className="text-[10px] font-semibold" style={{ color: "hsl(197 92% 48%)" }}>Est. {a.revenue}</p>
                  </div>
                  <Link to={a.module}>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                  </Link>
                </motion.div>
              ))}
              {insights.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Add data to generate priority actions</p>
              )}
            </div>
          </DataCard>
        </div>
      </div>
    </div>
  );
}
