import { SystemStatusBar } from "@/components/SystemStatusBar";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity, TrendingUp, DollarSign, CheckSquare,
  Target, Users, Star, ArrowUpRight, Calendar, Upload,
  Plug, Rocket, FileText, Clock, Briefcase,
  Plus, UserPlus, Send, BarChart3, Zap, Cpu, Radio,
  Wifi, Brain, Sparkles, AlertTriangle,
  ChevronRight, LineChart
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCountUp } from "@/hooks/useCountUp";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";

/* ── animation presets ── */
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as any } },
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getSystemStatus(isLive: boolean, hasData: boolean): string {
  if (!isLive) return "System initializing — complete setup to go live";
  if (hasData) return "Growth engine active · Tracking leads, revenue & performance";
  return "System online · Ready to capture your first leads";
}

/* ── Lightning streaks (mid layer) ── */
function LightningStreaks() {
  const streaks = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    id: i,
    top: `${8 + i * 12}%`,
    width: `${120 + Math.random() * 260}px`,
    duration: 18 + Math.random() * 16,
    delay: i * 2.8 + Math.random() * 3,
    opacity: 0.06 + Math.random() * 0.07,
  })), []);

  return (
    <div className="dash-streaks">
      {streaks.map(s => (
        <div key={s.id} className="dash-streak" style={{
          top: s.top, width: s.width, opacity: s.opacity,
          animation: `dash-streak-drift ${s.duration}s linear ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

/* ── Sparkline chart (inline SVG for KPI cards) ── */
function Sparkline({ data, color = "hsl(211 96% 62%)", height = 28, width = 80 }: {
  data: number[]; color?: string; height?: number; width?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#spark-${color.replace(/[^a-z0-9]/gi, "")})`} />
    </svg>
  );
}

/* ── AI System indicator ── */
function AIIndicator({ label = "AI Active" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="dash-ai-dots">
        <div className="dash-ai-dot" /><div className="dash-ai-dot" /><div className="dash-ai-dot" />
      </div>
      <span className="text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: "hsla(211,96%,68%,.35)" }}>{label}</span>
    </div>
  );
}

/* ── Waveform ── */
function Waveform() {
  return (
    <div className="dash-waveform">
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="dash-wave-bar" />)}
    </div>
  );
}

/* ── Section header ── */
function SectionHeader({ icon: Icon, label, extra }: { icon: any; label: string; extra?: React.ReactNode }) {
  return (
    <div className="dash-section-header">
      <Icon className="h-3.5 w-3.5" style={{ color: "hsla(211,96%,68%,.4)" }} />
      <span className="dash-section-label">{label}</span>
      <div className="dash-section-line" />
      {extra}
    </div>
  );
}

/* ── Revenue Glow Card ── */
function RevenueGlowCard({ label, value, sub, icon: Icon, intensity = "high", to, sparkData }: {
  label: string; value: number; sub: string; icon: any; intensity?: "high" | "med" | "low"; to?: string; sparkData?: number[];
}) {
  const count = useCountUp(value, 1600);
  const display = `$${count.toLocaleString()}`;
  const intensities = {
    high: { grad: "linear-gradient(135deg, hsl(211 96% 70%), hsl(211 96% 55%))", glow: "hsla(211,96%,60%,.22)", bg: "hsla(211,96%,60%,.07)" },
    med:  { grad: "linear-gradient(135deg, hsl(197 88% 62%), hsl(211 96% 58%))", glow: "hsla(197,88%,55%,.18)", bg: "hsla(197,88%,55%,.06)" },
    low:  { grad: "linear-gradient(135deg, hsl(205 80% 68%), hsl(211 96% 60%))", glow: "hsla(205,80%,60%,.14)", bg: "hsla(205,80%,60%,.05)" },
  };
  const c = intensities[intensity];

  const inner = (
    <motion.div variants={fadeUp} className="h-full">
      <div className="dash-revenue-card group relative h-full" style={{ "--glow-color": c.glow, "--glow-bg": c.bg } as any}>
        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <motion.div className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ background: c.bg, border: `1px solid ${c.glow}` }}
                animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 4, repeat: Infinity }}>
                <Icon className="h-4 w-4" style={{ color: "hsl(211 96% 68%)" }} />
              </motion.div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "hsla(210,50%,75%,.45)" }}>{label}</p>
            </div>
            {sparkData && <Sparkline data={sparkData} color="hsl(211 96% 62%)" width={64} height={24} />}
          </div>
          <div>
            <motion.p className="text-3xl sm:text-4xl font-bold tabular-nums tracking-tight"
              style={{ background: c.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: `drop-shadow(0 0 10px ${c.glow})` }}
            >{display}</motion.p>
            <p className="text-[11px] mt-1" style={{ color: "hsla(210,50%,65%,.45)" }}>{sub}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}

/* ── KPI Card with sparkline ── */
function KpiCard({ label, value, sub, icon: Icon, accent = false, to, sparkData }: {
  label: string; value: number; sub: string; icon: any; accent?: boolean; to?: string; sparkData?: number[];
}) {
  const count = useCountUp(value, 1400);

  const inner = (
    <motion.div variants={fadeUp} className="h-full">
      <div className={`dash-kpi h-full group relative ${accent ? "glow-pulse" : ""}`}>
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1.5 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "hsla(210,50%,75%,.45)" }}>{label}</p>
            <motion.p className="text-2xl font-bold tracking-tight tabular-nums"
              style={{
                background: accent
                  ? "linear-gradient(135deg, hsl(197 88% 60%), hsl(211 96% 68%))"
                  : "linear-gradient(135deg, hsl(210 40% 88%), hsl(211 60% 72%))",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                filter: accent ? "drop-shadow(0 0 6px hsla(211,96%,60%,.12))" : undefined,
              }}
            >{count}</motion.p>
            <p className="text-[11px]" style={{ color: "hsla(210,50%,65%,.5)" }}>{sub}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <motion.div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(145deg, hsla(211,96%,60%,.1), hsla(211,96%,60%,.03))",
                border: "1px solid hsla(211,96%,60%,.08)",
                boxShadow: "0 0 20px -6px hsla(211,96%,60%,.1)",
              }}
              animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ scale: 1.15, rotate: 5 }}>
              <Icon className="h-[17px] w-[17px]" style={{ color: "hsl(211 96% 68%)" }} />
            </motion.div>
            {sparkData && <Sparkline data={sparkData} color="hsla(211,96%,65%,.6)" width={48} height={18} />}
          </div>
        </div>
        {to && <ArrowUpRight className="absolute top-3 right-3 h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity duration-300" style={{ color: "hsl(211 96% 68%)" }} />}
      </div>
    </motion.div>
  );
  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}

/* ── Recharts custom tooltip ── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2" style={{
      background: "hsla(222,30%,8%,.95)", border: "1px solid hsla(211,96%,60%,.15)",
      boxShadow: "0 8px 32px -8px hsla(0,0%,0%,.6)",
    }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "hsla(211,96%,65%,.6)" }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs font-semibold" style={{ color: "hsl(211 96% 72%)" }}>
          {p.name}: {typeof p.value === "number" && p.name?.includes("$") ? `$${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
}

/* ── System Activity Pulse ── */
function SystemActivityPulse({ activities }: { activities: any[] }) {
  const recent = activities.slice(0, 4);
  return (
    <div className="dash-card p-5">
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(210 40% 85%)" }}>
          <Radio className="h-4 w-4" style={{ color: "hsl(211 96% 62%)" }} /> System Activity
        </h3>
        <div className="flex items-center gap-2">
          <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(211 96% 62%)" }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
          <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "hsla(211,96%,62%,.45)" }}>Live</span>
        </div>
      </div>
      <div className="relative z-10 space-y-0.5">
        {recent.length === 0 ? (
          <div className="py-6 text-center">
            <motion.div className="flex justify-center gap-1.5 mb-3"
              animate={{ opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, repeat: Infinity }}>
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div key={i} className="w-1 rounded-full" style={{ background: "hsla(211,96%,60%,.25)" }}
                  animate={{ height: [4, 8 + i * 3, 4] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </motion.div>
            <p className="text-[11px] font-medium" style={{ color: "hsla(210,50%,70%,.4)" }}>Monitoring — activity will appear here</p>
          </div>
        ) : recent.map((a, i) => (
          <motion.div key={a.id || i} className="flex items-center gap-3 py-2.5"
            style={{ borderBottom: i < recent.length - 1 ? "1px solid hsla(211,40%,16%,.25)" : undefined }}
            initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
            <motion.div className="w-2 h-2 rounded-full shrink-0" style={{ background: "hsl(211 96% 60%)" }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "hsl(210 40% 78%)" }}>{a.activity_note || a.activity_type}</p>
            </div>
            <span className="text-[10px] tabular-nums shrink-0" style={{ color: "hsla(210,40%,55%,.35)" }}>
              {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Priority Insights ── */
function PriorityInsights({ metrics, isNewClient }: { metrics: any; isNewClient: boolean }) {
  const insights: { label: string; desc: string; icon: any; type: "alert" | "opportunity" | "info"; to: string }[] = [];

  if (metrics.overdueFollowUps > 0) insights.push({ label: `${metrics.overdueFollowUps} overdue follow-up${metrics.overdueFollowUps > 1 ? "s" : ""}`, desc: "Revenue at risk — take action now", icon: AlertTriangle, type: "alert", to: "/follow-up-queue" });
  if (metrics.pendingProposals > 0) insights.push({ label: `${metrics.pendingProposals} proposal${metrics.pendingProposals > 1 ? "s" : ""} awaiting signature`, desc: "Follow up to close revenue", icon: FileText, type: "opportunity", to: "/proposals" });
  if (metrics.openDeals > 0 && metrics.pipelineValue > 0) insights.push({ label: `$${metrics.pipelineValue.toLocaleString()} in open pipeline`, desc: "Move deals forward to close", icon: TrendingUp, type: "opportunity", to: "/pipeline" });
  if (isNewClient) insights.push({ label: "Complete your setup", desc: "Unlock full system capabilities", icon: Rocket, type: "info", to: "/setup-center" });
  if (metrics.contacts === 0) insights.push({ label: "Add your first contact", desc: "Start building your CRM", icon: UserPlus, type: "info", to: "/crm" });

  if (insights.length === 0) return null;

  const typeStyles = {
    alert:       { border: "hsla(211,96%,55%,.25)", glow: "hsla(211,96%,55%,.08)", iconColor: "hsl(211 96% 65%)" },
    opportunity: { border: "hsla(197,88%,55%,.2)",  glow: "hsla(197,88%,55%,.07)", iconColor: "hsl(197 88% 60%)" },
    info:        { border: "hsla(211,96%,60%,.15)", glow: "hsla(211,96%,60%,.05)", iconColor: "hsl(211 96% 68%)" },
  };

  return (
    <div>
      <SectionHeader icon={Sparkles} label="Priority Insights" extra={<AIIndicator label="Analyzing" />} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {insights.slice(0, 4).map((ins, i) => {
          const s = typeStyles[ins.type];
          return (
            <Link key={ins.label} to={ins.to}>
              <motion.div className="dash-insight-card group" style={{ borderColor: s.border, background: s.glow }}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: s.glow, border: `1px solid ${s.border}` }}>
                    <ins.icon className="h-4 w-4" style={{ color: s.iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: "hsl(210 40% 88%)" }}>{ins.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "hsla(210,40%,65%,.5)" }}>{ins.desc}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 mt-1 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: "hsl(211 96% 68%)" }} />
                </div>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ── AI Assistant Presence ── */
function AIAssistantPresence() {
  return (
    <motion.div className="dash-ai-presence" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.5 }}>
      <div className="flex items-center gap-3">
        <motion.div className="h-7 w-7 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, hsla(211,96%,60%,.15), hsla(197,88%,55%,.08))", border: "1px solid hsla(211,96%,60%,.12)" }}
          animate={{ boxShadow: ["0 0 10px -3px hsla(211,96%,60%,.15)", "0 0 20px -3px hsla(211,96%,60%,.3)", "0 0 10px -3px hsla(211,96%,60%,.15)"] }}
          transition={{ duration: 3, repeat: Infinity }}>
          <Brain className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 68%)" }} />
        </motion.div>
        <div>
          <p className="text-[11px] font-bold" style={{ color: "hsl(210 40% 82%)" }}>AI Growth Engine</p>
          <div className="flex items-center gap-2">
            <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(211 96% 62%)" }}
              animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
            <span className="text-[9px]" style={{ color: "hsla(211,96%,62%,.5)" }}>Optimizing performance</span>
          </div>
        </div>
        <Waveform />
      </div>
    </motion.div>
  );
}

/* ── Empty state ── */
function EmptyBlock({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="py-10 text-center">
      <div className="dash-empty-icon mx-auto mb-5">
        <motion.div className="h-14 w-14 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(145deg, hsla(211,96%,60%,.08), hsla(211,96%,60%,.03))", border: "1px solid hsla(211,96%,60%,.08)" }}
          animate={{ y: [0, -5, 0], rotate: [0, 1, -1, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
          <Icon className="h-6 w-6" style={{ color: "hsl(211 96% 68%)" }} />
        </motion.div>
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: "hsl(210 40% 82%)" }}>{title}</p>
      <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: "hsla(210,40%,65%,.4)" }}>{desc}</p>
    </div>
  );
}

/* ── Generate chart data ── */
function generateChartData(base: number, len = 7): { name: string; value: number }[] {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return Array.from({ length: len }, (_, i) => ({
    name: labels[i] || `P${i + 1}`,
    value: Math.max(0, Math.round(base * (0.5 + Math.random() * 1.0))),
  }));
}

function generateBarData(base: number, len = 12): { name: string; value: number }[] {
  return Array.from({ length: len }, (_, i) => ({
    name: `W${i + 1}`,
    value: Math.max(0, Math.round(base * (0.3 + Math.random() * 1.2))),
  }));
}

function fakeSparkline(base: number, len = 7): number[] {
  if (base === 0) return Array.from({ length: len }, () => 0);
  return Array.from({ length: len }, () => Math.max(0, base * (0.6 + Math.random() * 0.8)));
}

/* ── Circular Progress ── */
function CircularProgress({ value, size = 56, stroke = 4 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="hsla(211,96%,60%,.08)" strokeWidth={stroke} />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#circGrad)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        whileInView={{ strokeDashoffset: offset }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
      />
      <defs>
        <linearGradient id="circGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(211 96% 62%)" />
          <stop offset="100%" stopColor="hsl(197 88% 58%)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Dashboard() {
  const { activeClientId, branding, activeClientName } = useWorkspace();
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
      supabase.from("crm_activities").select("activity_type, activity_note, created_at").eq("client_id", activeClientId).order("created_at", { ascending: false }).limit(8),
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
  const displayName = branding.company_name || activeClientName || "your business";

  const sparkPipeline = useMemo(() => fakeSparkline(metrics.pipelineValue), [metrics.pipelineValue]);
  const sparkWon = useMemo(() => fakeSparkline(metrics.wonValue), [metrics.wonValue]);
  const sparkContacts = useMemo(() => fakeSparkline(metrics.contacts), [metrics.contacts]);
  const sparkEvents = useMemo(() => fakeSparkline(metrics.upcomingEvents), [metrics.upcomingEvents]);

  const areaChartData = useMemo(() => generateChartData(Math.max(metrics.pipelineValue / 1000, metrics.contacts, 5)), [metrics.pipelineValue, metrics.contacts]);
  const barChartData = useMemo(() => generateBarData(Math.max(metrics.contacts, metrics.openDeals, 3)), [metrics.contacts, metrics.openDeals]);

  const quickActions = [
    { label: "New Contact", icon: UserPlus, to: "/crm" },
    { label: "New Deal", icon: Plus, to: "/pipeline" },
    { label: "Send Proposal", icon: Send, to: "/proposals" },
    { label: "Book Meeting", icon: Calendar, to: "/calendar" },
    { label: "View Reports", icon: BarChart3, to: "/reports" },
    { label: "Automations", icon: Zap, to: "/automations" },
  ];

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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 relative z-10">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-loading h-32 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-loading h-28 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-dark -m-4 sm:-m-6 lg:-m-10">
      <div className="dash-bg-main p-5 sm:p-8 lg:p-12 min-h-screen">
        {/* ═══ Atmospheric layers ═══ */}
        <div className="dash-neural-grid" />
        <LightningStreaks />
        <div className="dash-scanline" />
        <div className="dash-orb dash-orb--primary" />
        <div className="dash-orb dash-orb--cyan" />
        <div className="dash-orb dash-orb--secondary" />

        <div className="relative z-10 space-y-12">

          {/* ══════ HERO ══════ */}
          <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <motion.div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{
                    color: "hsl(211 96% 68%)",
                    background: "hsla(211,96%,60%,.06)",
                    border: "1px solid hsla(211,96%,60%,.12)",
                  }}
                  animate={{ boxShadow: [
                    "0 0 14px -4px hsla(211,96%,60%,.1)",
                    "0 0 26px -4px hsla(211,96%,60%,.25)",
                    "0 0 14px -4px hsla(211,96%,60%,.1)",
                  ]}}
                  transition={{ duration: 3.5, repeat: Infinity }}>
                  <motion.div className="w-2 h-2 rounded-full" style={{ background: "hsl(211 96% 62%)" }}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
                  {isLive ? "System Online" : "Setting Up"}
                </motion.div>
                <Waveform />
              </div>
              <AIAssistantPresence />
            </div>

            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: "hsla(211,96%,68%,.45)" }}>{getGreeting()}</p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold"
                style={{
                  background: "linear-gradient(140deg, hsl(210 40% 92%) 0%, hsl(211 96% 72%) 40%, hsl(197 88% 62%) 80%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                  letterSpacing: "-0.035em", lineHeight: "1.1",
                }}>
                {displayName}
              </h1>
              <p className="text-xs sm:text-sm mt-2.5 max-w-lg leading-relaxed" style={{ color: "hsla(210,40%,65%,.45)" }}>
                {getSystemStatus(isLive, hasData)}
              </p>
            </div>

            <div className="max-w-lg">
              <div className="dash-hero-bar" />
              <div className="dash-hero-bar-secondary" />
            </div>
          </motion.div>

          {/* ══════ SETUP BANNER ══════ */}
          {isNewClient && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="dash-card p-6">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <CircularProgress value={setupPct} size={52} stroke={3} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Rocket className="h-4 w-4" style={{ color: "hsl(211 96% 68%)" }} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "hsl(210 40% 88%)" }}>Complete your setup</p>
                    <p className="text-xs" style={{ color: "hsla(210,40%,65%,.5)" }}>Finish onboarding to unlock your full growth toolkit</p>
                  </div>
                </div>
                <span className="text-3xl font-bold tabular-nums"
                  style={{
                    background: "linear-gradient(135deg, hsl(211 96% 68%), hsl(197 88% 58%))",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                    filter: "drop-shadow(0 0 6px hsla(211,96%,60%,.12))",
                  }}>{setupPct}%</span>
              </div>
              <Progress value={setupPct} className="h-2 mb-4" />
              <div className="flex flex-wrap gap-2 relative z-10">
                <Link to="/setup-center"><Button size="sm" className="btn-gradient h-8 text-[11px]"><Upload className="h-3 w-3 mr-1" /> Complete Setup</Button></Link>
                <Link to="/integrations"><Button size="sm" variant="outline" className="h-8 text-[11px] border-[hsla(211,96%,60%,.12)] text-[hsl(211,96%,68%)] hover:bg-[hsla(211,96%,60%,.06)]"><Plug className="h-3 w-3 mr-1" /> Integrations ({integrationStats.connected}/{integrationStats.total})</Button></Link>
              </div>
            </motion.div>
          )}

          {/* ══════ REVENUE ══════ */}
          <div>
            <SectionHeader icon={DollarSign} label="Revenue & Growth" extra={
              <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "hsla(211,96%,62%,.35)" }}>
                {hasData ? "Tracking" : "Ready"}
              </span>
            } />
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <RevenueGlowCard label="Pipeline Value" value={metrics.pipelineValue} sub={`${metrics.openDeals} open deal${metrics.openDeals !== 1 ? "s" : ""}`} icon={TrendingUp} intensity="high" to="/pipeline" sparkData={sparkPipeline} />
              <RevenueGlowCard label="Revenue Won" value={metrics.wonValue} sub="Closed deals" icon={DollarSign} intensity="med" to="/pipeline" sparkData={sparkWon} />
              <RevenueGlowCard label="Revenue Influenced" value={metrics.pipelineValue + metrics.wonValue} sub="Total tracked value" icon={LineChart} intensity="low" />
            </motion.div>
          </div>

          {/* ══════ KPI MODULES ══════ */}
          <div>
            <SectionHeader icon={Cpu} label="System Metrics" extra={<AIIndicator />} />
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Contacts" value={metrics.contacts} sub="Total in CRM" icon={Users} to="/crm" sparkData={sparkContacts} />
              <KpiCard label="Appointments" value={metrics.upcomingEvents} sub={`${metrics.completedEvents} completed`} icon={Calendar} accent to="/calendar" sparkData={sparkEvents} />
              <KpiCard label="Proposals" value={metrics.pendingProposals} sub="Awaiting signature" icon={FileText} to="/proposals" />
              <KpiCard label="Follow-Ups" value={metrics.overdueFollowUps} sub={metrics.overdueFollowUps > 0 ? "Needs attention" : "All clear"} icon={Clock} to="/follow-up-queue" />
            </motion.div>
          </div>

          {/* ══════ GRAPHS SECTION (Recharts) ══════ */}
          <div>
            <SectionHeader icon={BarChart3} label="Performance Overview" extra={<Waveform />} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Area chart — Growth Trend */}
              <motion.div className="dash-card p-6" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <div className="flex items-center justify-between mb-5 relative z-10">
                  <h3 className="text-sm font-bold" style={{ color: "hsl(210 40% 85%)" }}>Growth Trend</h3>
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: "hsla(211,96%,62%,.35)" }}>7 days</span>
                </div>
                <div className="relative z-10" style={{ height: 160 }}>
                  {metrics.contacts === 0 && metrics.openDeals === 0 ? (
                    <EmptyBlock icon={LineChart} title="Trends loading" desc="Data will populate as your system tracks activity." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={areaChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(211 96% 62%)" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="hsl(211 96% 62%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsla(211,96%,60%,.06)" />
                        <XAxis dataKey="name" tick={{ fill: "hsla(210,40%,65%,.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "hsla(210,40%,65%,.25)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="value" name="Growth"
                          stroke="hsl(211 96% 62%)" strokeWidth={2}
                          fill="url(#areaGrad)"
                          dot={false}
                          activeDot={{ r: 4, fill: "hsl(211 96% 65%)", stroke: "hsla(211,96%,60%,.3)", strokeWidth: 6 }}
                          style={{ filter: "drop-shadow(0 0 6px hsla(211,96%,60%,.3))" }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </motion.div>

              {/* Bar chart — Activity Volume */}
              <motion.div className="dash-card p-6" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <div className="flex items-center justify-between mb-5 relative z-10">
                  <h3 className="text-sm font-bold" style={{ color: "hsl(210 40% 85%)" }}>Activity Volume</h3>
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: "hsla(211,96%,62%,.35)" }}>12 weeks</span>
                </div>
                <div className="relative z-10" style={{ height: 160 }}>
                  {metrics.contacts === 0 && activities.length === 0 ? (
                    <EmptyBlock icon={BarChart3} title="Activity ready" desc="Volume data will appear as your system captures events." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(211 96% 62%)" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="hsl(211 96% 62%)" stopOpacity={0.15} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsla(211,96%,60%,.06)" />
                        <XAxis dataKey="name" tick={{ fill: "hsla(210,40%,65%,.35)", fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "hsla(210,40%,65%,.25)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="value" name="Activity" fill="url(#barGrad)" radius={[4, 4, 0, 0]}
                          style={{ filter: "drop-shadow(0 0 4px hsla(211,96%,60%,.15))" }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </motion.div>
            </div>
          </div>

          {/* ══════ PRIORITY INSIGHTS ══════ */}
          <PriorityInsights metrics={metrics} isNewClient={isNewClient} />

          {/* ══════ QUICK ACTIONS ══════ */}
          <div>
            <SectionHeader icon={Zap} label="Quick Actions" />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {quickActions.map((a, i) => (
                <Link key={a.label} to={a.to}>
                  <motion.div className="dash-action group"
                    initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.04, duration: 0.4 }}>
                    <motion.div className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(145deg, hsla(211,96%,60%,.08), hsla(211,96%,60%,.02))",
                        border: "1px solid hsla(211,96%,60%,.07)",
                        boxShadow: "0 0 14px -5px hsla(211,96%,60%,.08)",
                      }}
                      whileHover={{ scale: 1.12, rotate: 6 }} transition={{ type: "spring", stiffness: 280 }}>
                      <a.icon className="h-4 w-4" style={{ color: "hsl(211 96% 68%)" }} />
                    </motion.div>
                    <span className="text-[11px] font-semibold text-center leading-tight" style={{ color: "hsl(210 40% 75%)" }}>{a.label}</span>
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
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(210 40% 85%)" }}>
                  <Activity className="h-4 w-4" style={{ color: "hsl(211 96% 62%)" }} /> Recent Activity
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
                  <EmptyBlock icon={Activity} title="Your system is ready" desc="Activity will appear here as your growth engine captures leads, books appointments, and closes deals." />
                ) : (
                  <div className="space-y-1">
                    {activities.map((a, i) => (
                      <motion.div key={a.id || i} className="flex items-start gap-3 py-3.5 last:border-0 group/item"
                        style={{ borderBottom: "1px solid hsla(211,40%,14%,.35)" }}
                        initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                        transition={{ delay: i * 0.05, duration: 0.4 }}>
                        <motion.div className="mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "linear-gradient(145deg, hsla(211,96%,60%,.08), hsla(211,96%,60%,.02))", border: "1px solid hsla(211,96%,60%,.06)" }}
                          whileHover={{ scale: 1.1 }}>
                          <Activity className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 65%)" }} />
                        </motion.div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug transition-colors duration-300 group-hover/item:text-[hsl(210,40%,90%)]"
                            style={{ color: "hsl(210 40% 78%)" }}>{a.activity_note || a.activity_type}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: "hsla(210,40%,55%,.4)" }}>{new Date(a.created_at).toLocaleString()}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="lg:col-span-2 space-y-6">
              <SystemActivityPulse activities={activities} />

              {/* Pipeline snapshot */}
              <div className="dash-card p-6">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-5 relative z-10" style={{ color: "hsl(210 40% 85%)" }}>
                  <Target className="h-4 w-4" style={{ color: "hsl(211 96% 62%)" }} /> Pipeline Snapshot
                </h3>
                <div className="relative z-10">
                  {metrics.openDeals === 0 && metrics.wonValue === 0 ? (
                    <EmptyBlock icon={Briefcase} title="Pipeline ready" desc="Create your first deal — your system will track and optimize from here." />
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "hsla(210,40%,65%,.45)" }}>Open Pipeline</p>
                          <p className="text-xl font-bold" style={{ color: "hsl(210 40% 88%)" }}>${metrics.pipelineValue.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "hsla(210,40%,65%,.45)" }}>Closed Won</p>
                          <p className="text-xl font-bold" style={{ color: "hsl(197 88% 60%)" }}>${metrics.wonValue.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: "hsla(222,26%,12%,.9)" }}>
                        {metrics.pipelineValue + metrics.wonValue > 0 && (
                          <>
                            <motion.div className="h-full rounded-full"
                              style={{ background: "linear-gradient(90deg, hsl(197 88% 45%), hsl(197 88% 55%))", boxShadow: "0 0 12px -2px hsla(197,88%,55%,.4)" }}
                              initial={{ width: 0 }}
                              whileInView={{ width: `${(metrics.wonValue / (metrics.pipelineValue + metrics.wonValue)) * 100}%` }}
                              viewport={{ once: true }} transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }} />
                            <motion.div className="h-full"
                              style={{ background: "linear-gradient(90deg, hsl(211 96% 55%), hsl(211 96% 65%))", boxShadow: "0 0 12px -2px hsla(211,96%,60%,.3)" }}
                              initial={{ width: 0 }}
                              whileInView={{ width: `${(metrics.pipelineValue / (metrics.pipelineValue + metrics.wonValue)) * 100}%` }}
                              viewport={{ once: true }} transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }} />
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Reputation */}
              <div className="dash-card p-6">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-5 relative z-10" style={{ color: "hsl(210 40% 85%)" }}>
                  <Star className="h-4 w-4" style={{ color: "hsl(211 96% 62%)" }} /> Reputation
                </h3>
                <div className="relative z-10">
                  {metrics.ratingCount === 0 ? (
                    <EmptyBlock icon={Star} title="Reputation tracking ready" desc="Your system will collect and display reviews automatically." />
                  ) : (
                    <div className="flex items-end gap-4">
                      <div>
                        <p className="text-4xl font-bold" style={{
                          background: "linear-gradient(135deg, hsl(211 96% 70%), hsl(197 88% 58%))",
                          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                        }}>{metrics.avgRating.toFixed(1)}</p>
                        <div className="flex gap-0.5 mt-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(metrics.avgRating) ? "fill-[hsl(211,96%,65%)]" : ""}`}
                              style={{ color: s <= Math.round(metrics.avgRating) ? "hsl(211 96% 65%)" : "hsla(211,40%,25%,.4)" }} />
                          ))}
                        </div>
                      </div>
                      <div className="text-xs pb-1" style={{ color: "hsla(210,40%,65%,.5)" }}>
                        <p>{metrics.ratingCount} ratings</p>
                        <p>{metrics.reviewRequests} requests sent</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ══════ ONBOARDING PROGRESS ══════ */}
          {isLive && setupPct < 100 && (
            <div className="dash-card p-5">
              <div className="flex items-center justify-between mb-2 relative z-10">
                <p className="dash-section-label">Onboarding Progress</p>
                <span className="text-sm font-bold tabular-nums" style={{ color: "hsl(211 96% 68%)" }}>{setupPct}%</span>
              </div>
              <Progress value={setupPct} className="h-1.5 relative z-10" />
            </div>
          )}

          {/* ══════ SYSTEM STATUS ══════ */}
          <div>
            <SectionHeader icon={Wifi} label="System Status" extra={
              <div className="flex items-center gap-2">
                <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(211 96% 62%)" }}
                  animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
                <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "hsla(211,96%,62%,.45)" }}>Healthy</span>
              </div>
            } />
            <SystemStatusBar />
          </div>

          {/* Powered by */}
          <div className="text-center py-6 text-[10px] tracking-widest" style={{ color: "hsla(211,96%,55%,.2)" }}>
            Powered by <span className="font-semibold" style={{ color: "hsla(211,96%,60%,.28)" }}>NewLight</span>
          </div>
        </div>
      </div>
    </div>
  );
}
