import { SystemStatusBar } from "@/components/SystemStatusBar";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity, TrendingUp, DollarSign, CheckSquare,
  Target, Users, Star, ArrowUpRight, Calendar, Upload,
  Plug, Rocket, FileText, Clock, Briefcase,
  Plus, UserPlus, Send, BarChart3, Zap, Cpu, Radio,
  Wifi, Shield
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCountUp } from "@/hooks/useCountUp";

/* ── animation presets ── */
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as any } },
};

/* ── Drifting light streaks (mid layer) ── */
function LightStreaks() {
  const streaks = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    id: i,
    top: `${15 + i * 18}%`,
    width: `${120 + Math.random() * 200}px`,
    duration: 14 + Math.random() * 12,
    delay: i * 4 + Math.random() * 3,
    opacity: 0.12 + Math.random() * 0.08,
  })), []);

  return (
    <div className="dash-streaks">
      {streaks.map(s => (
        <div key={s.id} className="dash-streak" style={{
          top: s.top,
          width: s.width,
          opacity: s.opacity,
          animation: `dash-streak-drift ${s.duration}s linear ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

/* ── AI System indicator ── */
function AIIndicator() {
  return (
    <div className="flex items-center gap-3">
      <div className="dash-ai-dots">
        <div className="dash-ai-dot" />
        <div className="dash-ai-dot" />
        <div className="dash-ai-dot" />
      </div>
      <span className="text-[9px] font-bold uppercase tracking-[0.15em]"
        style={{ color: "hsla(211,96%,68%,.4)" }}>AI Active</span>
    </div>
  );
}

/* ── Waveform accent ── */
function Waveform() {
  return (
    <div className="dash-waveform">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="dash-wave-bar" />
      ))}
    </div>
  );
}

/* ── Section header ── */
function SectionHeader({ icon: Icon, label, extra }: { icon: any; label: string; extra?: React.ReactNode }) {
  return (
    <div className="dash-section-header">
      <Icon className="h-3.5 w-3.5" style={{ color: "hsla(211,96%,68%,.45)" }} />
      <span className="dash-section-label">{label}</span>
      <div className="dash-section-line" />
      {extra}
    </div>
  );
}

/* ── Futuristic KPI Card ── */
function KpiCard({ label, value, sub, icon: Icon, accent = false, to, isCurrency = false }: {
  label: string; value: number; sub: string; icon: any; accent?: boolean; to?: string; isCurrency?: boolean;
}) {
  const count = useCountUp(value, 1400);
  const display = isCurrency ? `$${count.toLocaleString()}` : String(count);

  const inner = (
    <motion.div variants={fadeUp} className="h-full">
      <div className={`dash-kpi h-full group relative ${accent ? "glow-pulse" : ""}`}>
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "hsla(210,50%,70%,.55)" }}>{label}</p>
            <motion.p
              className="text-2xl font-bold tracking-tight tabular-nums"
              style={{
                background: accent
                  ? "linear-gradient(135deg, hsl(187 80% 55%), hsl(211 96% 68%))"
                  : "linear-gradient(135deg, hsl(210 50% 94%), hsl(210 50% 76%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: accent ? "drop-shadow(0 0 8px hsla(211,96%,60%,.15))" : undefined,
              }}
            >{display}</motion.p>
            <p className="text-[11px]" style={{ color: "hsla(215,18%,55%,.7)" }}>{sub}</p>
          </div>
          <motion.div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(145deg, hsla(211,96%,60%,.1), hsla(187,80%,55%,.04))",
              border: "1px solid hsla(211,96%,60%,.08)",
              boxShadow: "0 0 24px -8px hsla(211,96%,60%,.12)",
            }}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{ scale: 1.18, rotate: 6 }}
          >
            <Icon className="h-[18px] w-[18px]" style={{ color: "hsl(211 96% 68%)" }} />
          </motion.div>
        </div>
        {to && <ArrowUpRight className="absolute top-3 right-3 h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity duration-300" style={{ color: "hsl(211 96% 68%)" }} />}
      </div>
    </motion.div>
  );
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}

/* ── Futuristic Empty state ── */
function EmptyBlock({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="py-12 text-center">
      <div className="dash-empty-icon mx-auto mb-5">
        <motion.div
          className="h-16 w-16 rounded-2xl flex items-center justify-center"
          style={{
            background: "linear-gradient(145deg, hsla(211,96%,60%,.08), hsla(187,80%,55%,.04))",
            border: "1px solid hsla(211,96%,60%,.08)",
          }}
          animate={{ y: [0, -6, 0], rotate: [0, 1, -1, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon className="h-7 w-7" style={{ color: "hsl(211 96% 68%)" }} />
        </motion.div>
      </div>
      <p className="text-sm font-semibold mb-1.5" style={{ color: "hsl(210 50% 85%)" }}>{title}</p>
      <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: "hsla(215,18%,55%,.6)" }}>{desc}</p>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeClientId) return;
    setLoading(true);
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
      setLoading(false);
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

  /* Skeleton loader */
  if (loading) {
    return (
      <div className="dash-dark">
        <div className="dash-bg-main p-4 sm:p-6 lg:p-10 min-h-screen space-y-8">
          <div className="dash-neural-grid" />
          <div className="dash-orb dash-orb--primary" />
          <div className="dash-orb dash-orb--cyan" />
          <div className="space-y-3 relative z-10">
            <div className="skeleton-loading h-3 w-24" />
            <div className="skeleton-loading h-10 w-72" />
            <div className="skeleton-loading h-4 w-48" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 relative z-10">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-loading h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 relative z-10">
            <div className="lg:col-span-3 skeleton-loading h-72 rounded-2xl" />
            <div className="lg:col-span-2 space-y-6">
              <div className="skeleton-loading h-52 rounded-2xl" />
              <div className="skeleton-loading h-40 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-dark -m-4 sm:-m-6 lg:-m-10">
      <div className="dash-bg-main p-4 sm:p-6 lg:p-10 min-h-screen">
        {/* ═══ Multi-layer atmospheric system ═══ */}
        <div className="dash-neural-grid" />
        <LightStreaks />
        <div className="dash-scanline" />
        <div className="dash-orb dash-orb--primary" />
        <div className="dash-orb dash-orb--cyan" />
        <div className="dash-orb dash-orb--violet" />

        <div className="relative z-10 space-y-10">

          {/* ══════ HERO — Command Center Header ══════ */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            {/* Top bar: Status + AI indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{
                    color: isLive ? "hsl(152 60% 60%)" : "hsl(211 96% 68%)",
                    background: isLive ? "hsla(152,60%,44%,.08)" : "hsla(211,96%,60%,.06)",
                    border: `1px solid ${isLive ? "hsla(152,60%,44%,.18)" : "hsla(211,96%,60%,.12)"}`,
                  }}
                  animate={{ boxShadow: [
                    `0 0 16px -4px ${isLive ? "hsla(152,60%,44%,.15)" : "hsla(211,96%,60%,.1)"}`,
                    `0 0 28px -4px ${isLive ? "hsla(152,60%,44%,.3)" : "hsla(211,96%,60%,.25)"}`,
                    `0 0 16px -4px ${isLive ? "hsla(152,60%,44%,.15)" : "hsla(211,96%,60%,.1)"}`,
                  ]}}
                  transition={{ duration: 3.5, repeat: Infinity }}
                >
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ background: isLive ? "hsl(152 60% 55%)" : "hsl(211 96% 65%)" }}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  {isLive ? "System Online" : "Setting Up"}
                </motion.div>
                <Waveform />
              </div>
              <AIIndicator />
            </div>

            {/* Main title */}
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold"
                style={{
                  background: "linear-gradient(140deg, hsl(210 50% 96%) 0%, hsl(211 96% 74%) 40%, hsl(187 80% 62%) 70%, hsl(260 60% 72%) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.035em",
                  lineHeight: "1.1",
                }}>
                {branding.welcome_message || (branding.company_name ? `Welcome back, ${branding.company_name}` : "Command Center")}
              </h1>
              <p className="text-sm mt-3 max-w-lg leading-relaxed" style={{ color: "hsla(215,18%,60%,.6)" }}>
                Your intelligent growth engine — tracking, optimizing, and automating your business in real time.
              </p>
            </div>

            {/* Double accent lines */}
            <div className="max-w-lg">
              <div className="dash-hero-bar" />
              <div className="dash-hero-bar-secondary" />
            </div>
          </motion.div>

          {/* ══════ SETUP BANNER ══════ */}
          {isNewClient && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="dash-card p-5">
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="h-11 w-11 rounded-xl flex items-center justify-center"
                    style={{ background: "hsla(211,96%,60%,.08)", border: "1px solid hsla(211,96%,60%,.1)" }}
                    animate={{ rotate: [0, 3, -3, 0], scale: [1, 1.03, 1] }}
                    transition={{ duration: 5, repeat: Infinity }}
                  >
                    <Rocket className="h-5 w-5" style={{ color: "hsl(211 96% 68%)" }} />
                  </motion.div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "hsl(210 50% 90%)" }}>Complete your setup</p>
                    <p className="text-xs" style={{ color: "hsla(215,18%,55%,.6)" }}>Finish onboarding to unlock your full growth toolkit</p>
                  </div>
                </div>
                <span className="text-3xl font-bold tabular-nums"
                  style={{
                    background: "linear-gradient(135deg, hsl(211 96% 68%), hsl(187 80% 55%))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter: "drop-shadow(0 0 6px hsla(211,96%,60%,.15))",
                  }}>{setupPct}%</span>
              </div>
              <Progress value={setupPct} className="h-2 mb-4" />
              <div className="flex flex-wrap gap-2 relative z-10">
                <Link to="/setup-center"><Button size="sm" className="btn-gradient h-8 text-[11px]"><Upload className="h-3 w-3 mr-1" /> Complete Setup</Button></Link>
                <Link to="/integrations"><Button size="sm" variant="outline" className="h-8 text-[11px] border-[hsla(211,96%,60%,.12)] text-[hsl(211,96%,68%)] hover:bg-[hsla(211,96%,60%,.06)]"><Plug className="h-3 w-3 mr-1" /> Integrations ({integrationStats.connected}/{integrationStats.total})</Button></Link>
              </div>
            </motion.div>
          )}

          {/* ══════ LIVE BANNER ══════ */}
          {isLive && !isNewClient && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="dash-card p-4">
              <div className="flex items-center gap-3 relative z-10">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "hsla(152,60%,44%,.08)", border: "1px solid hsla(152,60%,44%,.12)" }}>
                  <Shield className="h-4 w-4" style={{ color: "hsl(152 60% 55%)" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: "hsl(210 50% 90%)" }}>All systems operational</p>
                  <p className="text-xs" style={{ color: "hsla(215,18%,55%,.6)" }}>Your workspace is live and tracking data in real time</p>
                </div>
                <Waveform />
              </div>
            </motion.div>
          )}

          {/* ══════ KPI MODULES ══════ */}
          <div>
            <SectionHeader icon={Cpu} label="System Metrics" extra={<AIIndicator />} />
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
              <KpiCard label="Contacts" value={metrics.contacts} sub="Total in CRM" icon={Users} to="/crm" />
              <KpiCard label="Open Deals" value={metrics.openDeals} sub={hasData ? `$${metrics.pipelineValue.toLocaleString()} pipeline` : "No deals yet"} icon={Briefcase} accent to="/pipeline" />
              <KpiCard label="Appointments" value={metrics.upcomingEvents} sub={`${metrics.completedEvents} completed`} icon={Calendar} to="/calendar" />
              <KpiCard label="Proposals" value={metrics.pendingProposals} sub="Awaiting signature" icon={FileText} to="/proposals" />
              <KpiCard label="Revenue Won" value={metrics.wonValue} isCurrency sub="Closed deals" icon={DollarSign} accent={metrics.wonValue > 0} to="/pipeline" />
              <KpiCard label="Follow-Ups" value={metrics.overdueFollowUps} sub={metrics.overdueFollowUps > 0 ? "Needs attention" : "All clear"} icon={Clock} to="/follow-up-queue" />
            </motion.div>
          </div>

          {/* ══════ ONBOARDING PROGRESS ══════ */}
          {isLive && setupPct < 100 && (
            <div className="dash-card p-4">
              <div className="flex items-center justify-between mb-2 relative z-10">
                <p className="dash-section-label">Onboarding Progress</p>
                <span className="text-sm font-bold tabular-nums" style={{ color: "hsl(211 96% 68%)" }}>{setupPct}%</span>
              </div>
              <Progress value={setupPct} className="h-1.5 relative z-10" />
            </div>
          )}

          {/* ══════ QUICK ACTIONS ══════ */}
          <div>
            <SectionHeader icon={Zap} label="Quick Actions" />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {quickActions.map((a, i) => (
                <Link key={a.label} to={a.to}>
                  <motion.div
                    className="dash-action group"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.45 }}
                  >
                    <motion.div
                      className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(145deg, hsla(211,96%,60%,.08), hsla(187,80%,55%,.03))",
                        border: "1px solid hsla(211,96%,60%,.07)",
                        boxShadow: "0 0 16px -6px hsla(211,96%,60%,.1)",
                      }}
                      whileHover={{ scale: 1.15, rotate: 8 }}
                      transition={{ type: "spring", stiffness: 280 }}
                    >
                      <a.icon className="h-4 w-4" style={{ color: "hsl(211 96% 68%)" }} />
                    </motion.div>
                    <span className="text-[11px] font-semibold text-center leading-tight" style={{ color: "hsl(210 50% 78%)" }}>{a.label}</span>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>

          {/* ══════ MAIN CONTENT GRID ══════ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Activity Feed */}
            <div className="dash-card lg:col-span-3 p-6">
              <div className="flex items-center justify-between mb-5 relative z-10">
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(210 50% 88%)" }}>
                  <Activity className="h-4 w-4" style={{ color: "hsl(211 96% 68%)" }} /> Recent Activity
                </h3>
                <div className="flex items-center gap-3">
                  <Waveform />
                  {activities.length > 0 && (
                    <Link to="/live-activity" className="text-[11px] font-medium flex items-center gap-1 hover:underline transition-colors duration-300" style={{ color: "hsl(211 96% 68%)" }}>
                      View all <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
              <div className="relative z-10">
                {activities.length === 0 ? (
                  <EmptyBlock icon={Activity} title="No activity yet" desc="Activity will appear as you add contacts, book appointments, and complete tasks." />
                ) : (
                  <div className="space-y-1">
                    {activities.map((a, i) => (
                      <motion.div key={a.id || i}
                        className="flex items-start gap-3 py-3.5 last:border-0 group/item"
                        style={{ borderBottom: "1px solid hsla(211,40%,16%,.4)" }}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06, duration: 0.45 }}>
                        <motion.div className="mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: "linear-gradient(145deg, hsla(211,96%,60%,.08), hsla(187,80%,55%,.03))",
                            border: "1px solid hsla(211,96%,60%,.06)",
                          }}
                          whileHover={{ scale: 1.1 }}
                        >
                          <Activity className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 68%)" }} />
                        </motion.div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug transition-colors duration-300 group-hover/item:text-[hsl(210,50%,92%)]"
                            style={{ color: "hsl(210 50% 82%)" }}>{a.activity_note || a.activity_type}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: "hsla(215,18%,50%,.5)" }}>{new Date(a.created_at).toLocaleString()}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pipeline snapshot */}
              <div className="dash-card p-6">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-5 relative z-10" style={{ color: "hsl(210 50% 88%)" }}>
                  <Target className="h-4 w-4" style={{ color: "hsl(211 96% 68%)" }} /> Pipeline Snapshot
                </h3>
                <div className="relative z-10">
                  {metrics.openDeals === 0 && metrics.wonValue === 0 ? (
                    <EmptyBlock icon={Briefcase} title="No deals yet" desc="Create your first deal to start tracking revenue opportunities." />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "hsla(215,18%,55%,.55)" }}>Open Pipeline</p>
                          <p className="text-xl font-bold" style={{ color: "hsl(210 50% 90%)" }}>${metrics.pipelineValue.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "hsla(215,18%,55%,.55)" }}>Closed Won</p>
                          <p className="text-xl font-bold" style={{ color: "hsl(152 60% 55%)" }}>${metrics.wonValue.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: "hsla(222,26%,14%,.9)" }}>
                        {metrics.pipelineValue + metrics.wonValue > 0 && (
                          <>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: "linear-gradient(90deg, hsl(152 60% 40%), hsl(152 60% 50%))", boxShadow: "0 0 12px -2px hsla(152,60%,44%,.4)" }}
                              initial={{ width: 0 }}
                              whileInView={{ width: `${(metrics.wonValue / (metrics.pipelineValue + metrics.wonValue)) * 100}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                            />
                            <motion.div
                              className="h-full"
                              style={{ background: "linear-gradient(90deg, hsl(211 96% 55%), hsl(211 96% 65%))", boxShadow: "0 0 12px -2px hsla(211,96%,60%,.3)" }}
                              initial={{ width: 0 }}
                              whileInView={{ width: `${(metrics.pipelineValue / (metrics.pipelineValue + metrics.wonValue)) * 100}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
                            />
                          </>
                        )}
                      </div>
                      <div className="flex gap-4 text-[11px]" style={{ color: "hsla(215,18%,55%,.6)" }}>
                        <span>{metrics.openDeals} open deals</span>
                        <span style={{ color: "hsla(211,96%,60%,.2)" }}>·</span>
                        <span>{metrics.pendingProposals} proposals pending</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reputation */}
              <div className="dash-card p-6">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-5 relative z-10" style={{ color: "hsl(210 50% 88%)" }}>
                  <Star className="h-4 w-4" style={{ color: "hsl(211 96% 68%)" }} /> Reputation
                </h3>
                <div className="relative z-10">
                  {metrics.ratingCount === 0 ? (
                    <EmptyBlock icon={Star} title="No reviews yet" desc="Send review requests to start building social proof." />
                  ) : (
                    <div className="flex items-end gap-4">
                      <div>
                        <p className="text-4xl font-bold" style={{
                          background: "linear-gradient(135deg, hsl(45 90% 60%), hsl(35 90% 55%))",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}>{metrics.avgRating.toFixed(1)}</p>
                        <div className="flex gap-0.5 mt-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(metrics.avgRating) ? "text-amber-400 fill-amber-400" : ""}`}
                              style={s > Math.round(metrics.avgRating) ? { color: "hsla(215,18%,25%,.5)" } : undefined} />
                          ))}
                        </div>
                      </div>
                      <div className="text-xs pb-1" style={{ color: "hsla(215,18%,55%,.6)" }}>
                        <p>{metrics.ratingCount} ratings</p>
                        <p>{metrics.reviewRequests} requests sent</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tasks */}
              <div className="dash-card p-6">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-5 relative z-10" style={{ color: "hsl(210 50% 88%)" }}>
                  <CheckSquare className="h-4 w-4" style={{ color: "hsl(211 96% 68%)" }} /> Open Tasks
                </h3>
                <div className="relative z-10">
                  {metrics.openTasks === 0 ? (
                    <EmptyBlock icon={CheckSquare} title="All clear" desc="No open tasks — great work staying on top of things." />
                  ) : (
                    <div className="flex items-center gap-4">
                      <p className="text-3xl font-bold" style={{
                        background: "linear-gradient(135deg, hsl(210 50% 94%), hsl(211 96% 72%))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}>{metrics.openTasks}</p>
                      <div className="text-xs" style={{ color: "hsla(215,18%,55%,.6)" }}>
                        <p>tasks remaining</p>
                        <Link to="/tasks" className="font-medium hover:underline transition-colors duration-300" style={{ color: "hsl(211 96% 68%)" }}>View all →</Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ══════ SYSTEM STATUS ══════ */}
          <div>
            <SectionHeader icon={Wifi} label="System Status" extra={
              <div className="flex items-center gap-2">
                <motion.div className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "hsl(152 60% 50%)" }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "hsla(152,60%,55%,.5)" }}>Healthy</span>
              </div>
            } />
            <SystemStatusBar />
          </div>

          {/* Powered by */}
          <div className="text-center py-4 text-[10px] tracking-widest" style={{ color: "hsla(215,18%,45%,.25)" }}>
            Powered by <span className="font-semibold" style={{ color: "hsla(211,96%,60%,.3)" }}>NewLight</span>
          </div>
        </div>
      </div>
    </div>
  );
}
