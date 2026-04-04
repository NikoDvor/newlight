import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { SystemStatusBar } from "@/components/SystemStatusBar";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity, TrendingUp, DollarSign, CheckSquare,
  Target, Users, Star, ArrowUpRight, Calendar, Upload,
  Plug, Rocket, FileText, Clock, Briefcase,
  Plus, UserPlus, Send, BarChart3, Zap
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";

/* ── animation presets ── */
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] as any } } };

/* ── KPI Card ── */
function KpiCard({ label, value, sub, icon: Icon, accent = false, to }: {
  label: string; value: string; sub: string; icon: any; accent?: boolean; to?: string;
}) {
  const inner = (
    <motion.div variants={fadeUp}>
      <Card className={`relative overflow-hidden p-5 group transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] ${accent ? "border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent" : ""}`}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
            style={{ background: "linear-gradient(135deg, hsla(211,96%,56%,.12), hsla(197,92%,68%,.06))", boxShadow: "0 0 20px -6px hsla(211,96%,60%,.14)" }}>
            <Icon className="h-[18px] w-[18px] text-primary" />
          </div>
        </div>
        {to && <ArrowUpRight className="absolute top-3 right-3 h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </Card>
    </motion.div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

/* ── Empty state helper ── */
function EmptyBlock({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="py-10 text-center">
      <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
        style={{ background: "hsla(211,96%,56%,.08)" }}>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">{desc}</p>
    </div>
  );
}

export default function Dashboard() {
  const { activeClientId, branding } = useWorkspace();
  const navigate = useNavigate();
  const [onboardingStage, setOnboardingStage] = useState("lead");
  const [setupPct, setSetupPct] = useState(0);
  const [integrationStats, setIntegrationStats] = useState({ connected: 0, total: 0 });
  const [metrics, setMetrics] = useState({
    contacts: 0, openDeals: 0, pipelineValue: 0, wonValue: 0,
    upcomingEvents: 0, completedEvents: 0, reviewRequests: 0,
    avgRating: 0, ratingCount: 0, openTasks: 0, overdueFollowUps: 0,
    pendingProposals: 0,
  });
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (!activeClientId) return;
    Promise.all([
      supabase.from("onboarding_progress").select("*").eq("client_id", activeClientId).maybeSingle(),
      supabase.from("client_integrations").select("status").eq("client_id", activeClientId),
      supabase.from("clients").select("onboarding_stage").eq("id", activeClientId).single(),
      supabase.from("crm_contacts").select("id", { count: "exact", head: true }).eq("client_id", activeClientId),
      supabase.from("crm_deals").select("deal_value, pipeline_stage, status").eq("client_id", activeClientId),
      supabase.from("appointments").select("id, status, start_time").eq("client_id", activeClientId),
      supabase.from("review_requests" as any).select("rating").eq("client_id", activeClientId),
      supabase.from("crm_tasks").select("id", { count: "exact", head: true }).eq("client_id", activeClientId).eq("status", "open"),
      supabase.from("crm_activities").select("activity_type, activity_note, created_at").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(6),
      supabase.from("follow_up_queues" as any).select("id, status, due_at").eq("client_id", activeClientId).in("status", ["Pending"]),
      supabase.from("proposals").select("id", { count: "exact", head: true }).eq("client_id", activeClientId).eq("proposal_status", "sent"),
    ]).then(([onb, intg, clientStage, contacts, deals, events, reviews, tasks, acts, fuRes, proposals]) => {
      setOnboardingStage((clientStage.data as any)?.onboarding_stage || "lead");
      if (intg.data) setIntegrationStats({ connected: intg.data.filter((d: any) => d.status === "connected").length, total: intg.data.length });

      const onbData = onb.data || {};
      const completed = Object.values(onbData).filter(v => v === true).length;
      setSetupPct(Math.round((completed / 8) * 100));

      const dealsData = deals.data || [];
      const openDeals = dealsData.filter((d: any) => d.status === "open");
      const wonDeals = dealsData.filter((d: any) => d.pipeline_stage === "closed_won");
      const eventsData = events.data || [];
      const now = new Date();
      const reviewsData = (reviews.data || []) as any[];
      const rated = reviewsData.filter((r: any) => r.rating);
      const fuData = fuRes.data || [];

      setMetrics({
        contacts: contacts.count || 0,
        openDeals: openDeals.length,
        pipelineValue: openDeals.reduce((s: number, d: any) => s + (Number(d.deal_value) || 0), 0),
        wonValue: wonDeals.reduce((s: number, d: any) => s + (Number(d.deal_value) || 0), 0),
        upcomingEvents: eventsData.filter((e: any) => new Date(e.start_time) >= now && !["cancelled", "no_show"].includes(e.status)).length,
        completedEvents: eventsData.filter((e: any) => e.status === "completed").length,
        reviewRequests: reviewsData.length,
        avgRating: rated.length > 0 ? rated.reduce((s: number, r: any) => s + r.rating, 0) / rated.length : 0,
        ratingCount: rated.length,
        openTasks: tasks.count || 0,
        overdueFollowUps: fuData.filter((f: any) => f.due_at && new Date(f.due_at) < now).length,
        pendingProposals: proposals.count || 0,
      });
      setActivities(acts.data || []);
    });
  }, [activeClientId]);

  const isNewClient = setupPct < 50 && onboardingStage !== "active";
  const isLive = onboardingStage === "active";
  const hasData = metrics.contacts > 0 || metrics.openDeals > 0 || metrics.upcomingEvents > 0;

  const quickActions = [
    { label: "New Contact", icon: UserPlus, to: "/crm" },
    { label: "New Deal", icon: Plus, to: "/pipeline" },
    { label: "Send Proposal", icon: Send, to: "/proposals" },
    { label: "Book Meeting", icon: Calendar, to: "/calendar" },
    { label: "View Reports", icon: BarChart3, to: "/reports" },
    { label: "Automations", icon: Zap, to: "/automations" },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <PageHeader
        title={branding.welcome_message || (branding.company_name ? `Welcome back, ${branding.company_name}` : "Command Center")}
        description="Your client acquisition and onboarding hub"
      />

      {/* ── Live banner ── */}
      {isLive && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-2xl border"
          style={{ borderColor: "hsla(152,60%,44%,.18)", background: "hsla(152,60%,44%,.04)" }}>
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsla(152,60%,44%,.12)" }}>
            <CheckSquare className="h-4 w-4" style={{ color: "hsl(152 60% 55%)" }} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Workspace is live</p>
            <p className="text-xs text-muted-foreground">All systems operational — manage everything from here</p>
          </div>
        </motion.div>
      )}

      {/* ── Setup banner (new clients) ── */}
      {isNewClient && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/[0.05] to-transparent">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.1)" }}>
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Complete your setup</p>
                <p className="text-xs text-muted-foreground">Finish onboarding to unlock your full growth toolkit</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-primary tabular-nums">{setupPct}%</span>
          </div>
          <Progress value={setupPct} className="h-2 mb-4" />
          <div className="flex flex-wrap gap-2">
            <Link to="/setup-center"><Button size="sm" className="btn-gradient h-8 text-[11px]"><Upload className="h-3 w-3 mr-1" /> Complete Setup</Button></Link>
            <Link to="/integrations"><Button size="sm" variant="outline" className="h-8 text-[11px]"><Plug className="h-3 w-3 mr-1" /> Integrations ({integrationStats.connected}/{integrationStats.total})</Button></Link>
          </div>
        </motion.div>
      )}

      {/* ═══════════ KPI CARDS ═══════════ */}
      <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Contacts" value={hasData ? String(metrics.contacts) : "0"} sub="Total in CRM" icon={Users} to="/crm" />
        <KpiCard label="Open Deals" value={String(metrics.openDeals)} sub={hasData ? `$${metrics.pipelineValue.toLocaleString()} pipeline` : "No deals yet"} icon={Briefcase} accent to="/pipeline" />
        <KpiCard label="Appointments" value={String(metrics.upcomingEvents)} sub={`${metrics.completedEvents} completed`} icon={Calendar} to="/calendar" />
        <KpiCard label="Proposals" value={String(metrics.pendingProposals)} sub="Awaiting signature" icon={FileText} to="/proposals" />
        <KpiCard label="Revenue Won" value={`$${metrics.wonValue.toLocaleString()}`} sub="Closed deals" icon={DollarSign} accent={metrics.wonValue > 0} to="/pipeline" />
        <KpiCard label="Follow-Ups" value={String(metrics.overdueFollowUps)} sub={metrics.overdueFollowUps > 0 ? "Needs attention" : "All clear"} icon={Clock} to="/follow-up-queue" />
      </motion.div>

      {/* ═══════════ ONBOARDING PROGRESS BAR (live clients) ═══════════ */}
      {isLive && setupPct < 100 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Onboarding Progress</p>
            <span className="text-sm font-bold text-primary tabular-nums">{setupPct}%</span>
          </div>
          <Progress value={setupPct} className="h-1.5" />
        </Card>
      )}

      {/* ═══════════ QUICK ACTIONS ═══════════ */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map((a, i) => (
            <Link key={a.label} to={a.to}>
              <motion.div
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:border-primary/20 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 cursor-pointer group"
                initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                <div className="h-9 w-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <a.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-[11px] font-semibold text-foreground text-center leading-tight">{a.label}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT GRID ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Activity Feed — takes 3 cols */}
        <Card className="lg:col-span-3 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Recent Activity
            </h3>
            {activities.length > 0 && (
              <Link to="/live-activity" className="text-[11px] font-medium text-primary flex items-center gap-1 hover:underline">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          {activities.length === 0 ? (
            <EmptyBlock icon={Activity} title="No activity yet" desc="Activity will appear as you add contacts, book appointments, and complete tasks." />
          ) : (
            <div className="space-y-1">
              {activities.map((a, i) => (
                <motion.div key={a.id || i}
                  className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0"
                  initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                  <div className="mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "hsla(211,96%,56%,.08)" }}>
                    <Activity className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground leading-snug">{a.activity_note || a.activity_type}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        {/* Right column — takes 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pipeline snapshot */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-primary" /> Pipeline Snapshot
            </h3>
            {metrics.openDeals === 0 && metrics.wonValue === 0 ? (
              <EmptyBlock icon={Briefcase} title="No deals yet" desc="Create your first deal to start tracking revenue opportunities." />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-muted-foreground">Open Pipeline</p>
                    <p className="text-xl font-bold text-foreground">${metrics.pipelineValue.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Closed Won</p>
                    <p className="text-xl font-bold" style={{ color: "hsl(152 60% 44%)" }}>${metrics.wonValue.toLocaleString()}</p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden flex">
                  {metrics.pipelineValue + metrics.wonValue > 0 && (
                    <>
                      <div className="h-full rounded-full" style={{
                        width: `${(metrics.wonValue / (metrics.pipelineValue + metrics.wonValue)) * 100}%`,
                        background: "hsl(152 60% 44%)"
                      }} />
                      <div className="h-full bg-primary" style={{
                        width: `${(metrics.pipelineValue / (metrics.pipelineValue + metrics.wonValue)) * 100}%`
                      }} />
                    </>
                  )}
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{metrics.openDeals} open deals</span>
                  <span>·</span>
                  <span>{metrics.pendingProposals} proposals pending</span>
                </div>
              </div>
            )}
          </Card>

          {/* Reviews / Rating */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
              <Star className="h-4 w-4 text-primary" /> Reputation
            </h3>
            {metrics.ratingCount === 0 ? (
              <EmptyBlock icon={Star} title="No reviews yet" desc="Send review requests to start building social proof." />
            ) : (
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-4xl font-bold text-foreground">{metrics.avgRating.toFixed(1)}</p>
                  <div className="flex gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(metrics.avgRating) ? "text-amber-400 fill-amber-400" : "text-border"}`} />
                    ))}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pb-1">
                  <p>{metrics.ratingCount} ratings</p>
                  <p>{metrics.reviewRequests} requests sent</p>
                </div>
              </div>
            )}
          </Card>

          {/* Tasks summary */}
          <Card className="p-6">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
              <CheckSquare className="h-4 w-4 text-primary" /> Open Tasks
            </h3>
            {metrics.openTasks === 0 ? (
              <EmptyBlock icon={CheckSquare} title="All clear" desc="No open tasks — great work staying on top of things." />
            ) : (
              <div className="flex items-center gap-4">
                <p className="text-3xl font-bold text-foreground">{metrics.openTasks}</p>
                <div className="text-xs text-muted-foreground">
                  <p>tasks remaining</p>
                  <Link to="/tasks" className="text-primary font-medium hover:underline">View all →</Link>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ═══════════ SYSTEM STATUS ═══════════ */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">System Status</h2>
        <SystemStatusBar />
      </div>
    </div>
  );
}
