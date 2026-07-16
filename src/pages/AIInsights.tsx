import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, RefreshCw, TrendingUp, ChevronDown, X, Clock, ThumbsUp,
  ThumbsDown, CheckCircle2, Megaphone, Search, Share2, Star, Globe,
  Users, Zap, Loader2, ArrowRight, ListChecks, BarChart3, Activity,
  AlertTriangle, Flame, BookOpen, TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ── Executable action mapping ────────────────────────────────────
// Keyword-based detection: if a recommendation's action_label matches an
// automatable capability we already ship, it becomes a one-click "Execute".
// Everything else falls back to a guided step-by-step modal.
const EXECUTABLE_KEYWORDS = [
  "review request", "request review", "ask for review",
  "instant response", "auto-respond", "auto reply", "instant reply",
  "reminder", "appointment reminder", "no-show",
  "follow-up", "follow up", "nurture",
  "send sms", "send text", "send email",
  "re-engage", "reactivation",
];

function isExecutable(rec: { action_label: string | null; title: string | null; category: string | null }): boolean {
  const hay = `${rec.action_label ?? ""} ${rec.title ?? ""}`.toLowerCase();
  return EXECUTABLE_KEYWORDS.some((k) => hay.includes(k));
}

function buildGuidedSteps(rec: { category: string | null; action_label: string | null; why_reasoning: string | null }): string[] {
  const cat = (rec.category || "").toLowerCase();
  const label = rec.action_label || "this action";
  const base: Record<string, string[]> = {
    ads:     [
      "Open your Paid Ads dashboard and pull the last 30 days of performance by campaign.",
      "Identify the 1–2 campaigns driving the majority of qualified leads and pause the underperformers.",
      `Reallocate budget toward the winners — this directly supports: ${label}.`,
      "Set a 7-day check-in to compare cost-per-lead before and after the change.",
    ],
    seo:     [
      "Open the SEO module and review the pages flagged with the biggest ranking gap.",
      "Update titles, meta descriptions, and the first paragraph to match target intent.",
      `Publish the changes and submit the URL for re-indexing (${label}).`,
      "Re-check rankings in 10–14 days and note movement in the tracker.",
    ],
    social:  [
      "Review your last 30 days of posts and identify your top 3 by engagement.",
      "Draft 4–6 new posts modeled on those winners.",
      `Schedule them across your peak posting windows (${label}).`,
      "Track engagement lift weekly and iterate on what works.",
    ],
    reviews: [
      "Pull the list of clients from the last 30 days who had a positive outcome.",
      "Send each one a personalized review request with a direct link to Google.",
      `Follow up once after 3 days if there's no response (${label}).`,
      "Reply publicly to every new review within 24 hours.",
    ],
    website: [
      "Open the Website module and locate the page called out in the recommendation.",
      "Apply the suggested change (headline, CTA, layout, or copy).",
      `Publish and confirm the change is live (${label}).`,
      "Monitor conversion rate on that page for the next 14 days.",
    ],
    crm:     [
      "Open the CRM and filter contacts matching the recommendation's segment.",
      "Draft an outreach message tailored to that segment.",
      `Send from the CRM and log the touchpoint (${label}).`,
      "Set a task to review outcomes in 7 days.",
    ],
  };
  return base[cat] ?? [
    "Review the recommendation context and confirm it applies to your business right now.",
    `Take the primary action: ${label}.`,
    "Log the change in the relevant module so it's tracked.",
    "Re-check the outcome in 7–14 days.",
  ];
}

type Category = "ads" | "seo" | "social" | "reviews" | "website" | "crm";
type Status = "new" | "accepted" | "acted" | "dismissed" | "snoozed";

interface Recommendation {
  id: string;
  client_id: string | null;
  category: string | null;
  title: string | null;
  why_reasoning: string | null;
  expected_impact_value: number | null;
  impact_unit: string | null;
  confidence_pct: number | null;
  effort_level: string | null;
  rice_score: number | null;
  status: string;
  action_label: string | null;
  generated_at: string;
}

const CATEGORY_META: Record<Category, { label: string; icon: typeof Megaphone; hue: string }> = {
  ads:      { label: "Paid Ads", icon: Megaphone, hue: "24 95% 54%" },
  seo:      { label: "SEO",      icon: Search,    hue: "142 71% 45%" },
  social:   { label: "Social",   icon: Share2,   hue: "280 75% 60%" },
  reviews:  { label: "Reviews",  icon: Star,     hue: "45 93% 50%" },
  website:  { label: "Website",  icon: Globe,    hue: "197 92% 48%" },
  crm:      { label: "CRM",      icon: Users,    hue: "211 96% 56%" },
};

const FILTERS: Array<{ key: "all" | Category; label: string }> = [
  { key: "all",     label: "All" },
  { key: "ads",     label: "Ads" },
  { key: "seo",     label: "SEO" },
  { key: "social",  label: "Social" },
  { key: "reviews", label: "Reviews" },
  { key: "website", label: "Website" },
  { key: "crm",     label: "CRM" },
];

function normalizeCategory(c: string | null): Category {
  const k = (c || "").toLowerCase();
  if (k in CATEGORY_META) return k as Category;
  return "crm";
}

function formatImpact(v: number | null, unit: string | null): string {
  if (v == null) return "Impact TBD";
  const u = (unit || "$").trim();
  if (u === "$" || u === "$/mo") {
    const rounded = Math.round(v);
    if (rounded >= 1000) return `+$${(rounded / 1000).toFixed(1)}K/mo estimated`;
    return `+$${rounded}/mo estimated`;
  }
  if (u === "%") return `+${v}% estimated`;
  return `+${Math.round(v)} ${u}/mo estimated`;
}

function confidenceStyle(pct: number | null): { bg: string; text: string; label: string } {
  const p = pct ?? 0;
  if (p >= 80) return { bg: "hsla(142,71%,45%,.12)", text: "hsl(142 71% 35%)", label: `${p}% confidence` };
  if (p >= 50) return { bg: "hsla(45,93%,50%,.14)",  text: "hsl(38 90% 38%)",  label: `${p}% confidence` };
  return { bg: "hsla(0,80%,60%,.12)", text: "hsl(0 75% 45%)", label: `${p}% confidence` };
}

function effortStyle(level: string | null): { bg: string; text: string; label: string } {
  const l = (level || "medium").toLowerCase();
  if (l === "low") return { bg: "hsla(142,71%,45%,.1)", text: "hsl(142 71% 35%)", label: "Low effort" };
  if (l === "high") return { bg: "hsla(0,80%,60%,.1)", text: "hsl(0 75% 45%)", label: "High effort" };
  return { bg: "hsla(211,96%,56%,.1)", text: "hsl(211 96% 46%)", label: "Medium effort" };
}

export default function AIInsights() {
  const { activeClientId, activeClientName } = useWorkspace();
  const { toast } = useToast();

  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [wins, setWins] = useState<Recommendation[]>([]);
  const [signals, setSignals] = useState<WeaknessSignal[]>([]);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | Category>("all");

  const fetchAll = useCallback(async () => {
    if (!activeClientId) return;
    setLoading(true);
    const [{ data: recsData }, { data: winsData }, { data: healthData }, { data: snapshotData }] = await Promise.all([
      supabase
        .from("ai_recommendations")
        .select("*")
        .eq("client_id", activeClientId)
        .in("status", ["new", "accepted"])
        .order("rice_score", { ascending: false, nullsFirst: false }),
      supabase
        .from("ai_recommendations")
        .select("*")
        .eq("client_id", activeClientId)
        .eq("status", "acted")
        .order("generated_at", { ascending: false })
        .limit(12),
      supabase
        .from("client_health_scores")
        .select("overall_score")
        .eq("client_id", activeClientId)
        .maybeSingle(),
      supabase
        .from("client_signal_snapshots")
        .select("signals")
        .eq("client_id", activeClientId)
        .maybeSingle(),
    ]);
    setRecs((recsData ?? []) as Recommendation[]);
    setWins((winsData ?? []) as Recommendation[]);
    const rawSignals = (snapshotData?.signals ?? []) as unknown;
    setSignals(Array.isArray(rawSignals) ? (rawSignals as WeaknessSignal[]) : []);
    if (healthData?.overall_score != null) {
      setHealthScore(Number(healthData.overall_score));
    } else if ((recsData ?? []).length > 0) {
      const avg = (recsData ?? []).reduce((s, r) => s + (r.confidence_pct ?? 0), 0) / (recsData ?? []).length;
      setHealthScore(Math.round(avg));
    } else {
      setHealthScore(null);
    }
    setLoading(false);
  }, [activeClientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRefresh = async () => {
    if (!activeClientId || refreshing) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-insights", {
        body: { client_id: activeClientId },
      });
      if (error) throw error;
      const count = Array.isArray(data?.recommendations) ? data.recommendations.length : 0;
      toast({
        title: count > 0 ? "Insights refreshed" : "No new signals",
        description: count > 0
          ? `${count} recommendation${count === 1 ? "" : "s"} generated from your latest data.`
          : "Your business is meeting or beating every tracked benchmark right now.",
      });
      await fetchAll();
    } catch (e) {
      toast({
        title: "Couldn't refresh insights",
        description: e instanceof Error ? e.message : "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const updateStatus = async (id: string, status: Status) => {
    const prev = recs;
    setRecs((r) => r.filter((x) => x.id !== id || status === "accepted"));
    const { error } = await supabase.from("ai_recommendations").update({ status }).eq("id", id);
    if (error) {
      setRecs(prev);
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    if (status === "accepted") {
      setRecs((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
      toast({ title: "Recommendation accepted", description: "Moved to your active plan." });
    } else if (status === "dismissed") {
      toast({ title: "Dismissed" });
    } else if (status === "snoozed") {
      toast({ title: "Snoozed for later" });
    } else if (status === "acted") {
      await fetchAll();
    }
  };

  const filtered = useMemo(() => {
    if (filter === "all") return recs;
    return recs.filter((r) => normalizeCategory(r.category) === filter);
  }, [recs, filter]);

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="AI Insights" description="Your AI-powered growth engine" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to view AI Insights.</p>
        </div>
      </div>
    );
  }

  const scoreDisplay = healthScore != null ? Math.round(healthScore) : null;
  const scoreHue =
    scoreDisplay == null ? "215 16% 55%"
    : scoreDisplay >= 80 ? "142 71% 45%"
    : scoreDisplay >= 55 ? "45 93% 50%"
    : "0 75% 55%";

  return (
    <div>
      <PageHeader title="AI Insights" description="Your AI-powered growth engine" />

      <ModuleHelpPanel
        moduleName="AI Insights"
        description="AI Insights pulls signals from your CRM, calendar, reviews, and website — compares them against industry benchmarks — and ranks growth actions by projected revenue impact."
        tips={[
          "Refresh whenever you want a new pass against your latest data",
          "Cards are ranked by RICE score (reach × impact × confidence / effort)",
          "Accept an action to move it into your active plan",
          "Wins accumulate at the bottom as recommendations are completed",
        ]}
      />

      {/* ── HERO: Business Health Score ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-6 rounded-3xl overflow-hidden relative"
        style={{
          background: "linear-gradient(135deg, hsl(215 40% 12%) 0%, hsl(215 55% 18%) 50%, hsl(211 80% 24%) 100%)",
          boxShadow: "0 20px 60px -20px hsla(211,96%,40%,.35)",
        }}
      >
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 85% 20%, hsla(197,92%,58%,.25), transparent 50%), radial-gradient(circle at 15% 90%, hsla(280,75%,60%,.18), transparent 55%)",
          }}
        />
        <div className="relative p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex items-center gap-6">
            <div className="relative">
              <svg width="140" height="140" viewBox="0 0 140 140" className="drop-shadow-lg">
                <circle cx="70" cy="70" r="60" fill="none" stroke="hsla(210,40%,90%,.12)" strokeWidth="10" />
                <motion.circle
                  cx="70" cy="70" r="60" fill="none"
                  stroke={`hsl(${scoreHue})`} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 60}
                  initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - (scoreDisplay ?? 0) / 100) }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  transform="rotate(-90 70 70)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold tracking-tight" style={{ color: "hsl(210 40% 98%)" }}>
                  {scoreDisplay ?? "—"}
                </span>
                <span className="text-[10px] uppercase tracking-widest" style={{ color: "hsl(210 30% 75%)" }}>
                  / 100
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4" style={{ color: "hsl(197 92% 68%)" }} />
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "hsl(197 60% 78%)" }}>
                  Business Health
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold leading-tight max-w-md" style={{ color: "hsl(210 40% 98%)" }}>
                {scoreDisplay == null
                  ? "Generate your first insight report"
                  : scoreDisplay >= 80 ? "You're outperforming your industry."
                  : scoreDisplay >= 55 ? "Room to grow — key levers ready."
                  : "Multiple high-impact levers waiting."}
              </h2>
              <p className="text-sm mt-2 max-w-md" style={{ color: "hsl(210 30% 80%)" }}>
                {recs.length > 0
                  ? `${recs.length} prioritized action${recs.length === 1 ? "" : "s"} in your queue below.`
                  : "Click Refresh to analyze your live data against industry benchmarks."}
              </p>
            </div>
          </div>
          <div className="md:ml-auto">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              size="lg"
              className="rounded-xl font-semibold shadow-lg border-0"
              style={{
                background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(197 92% 48%))",
                color: "hsl(210 40% 98%)",
              }}
            >
              {refreshing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" /> Refresh Insights</>
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Category Performance ─────────────────────────────────── */}
      <CategoryPerformanceGrid recs={recs} onSelect={(k) => setFilter(k)} activeFilter={filter} />

      {/* ── Weaknesses ───────────────────────────────────────────── */}
      <WeaknessesPanel signals={signals} />

      {/* ── Category filter tabs ─────────────────────────────────── */}
      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = f.key === "all" ? recs.length : recs.filter((r) => normalizeCategory(r.category) === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 border flex items-center gap-1.5",
                active ? "shadow-md" : "hover:bg-muted/60"
              )}
              style={{
                background: active
                  ? "linear-gradient(135deg, hsl(211 96% 56%), hsl(197 92% 48%))"
                  : "hsla(210,50%,99%,.8)",
                color: active ? "hsl(210 40% 98%)" : "hsl(215 25% 30%)",
                borderColor: active ? "transparent" : "hsla(211,96%,56%,.15)",
              }}
            >
              {f.label}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: active ? "hsla(210,40%,98%,.2)" : "hsla(211,96%,56%,.1)",
                  color: active ? "hsl(210 40% 98%)" : "hsl(211 96% 46%)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Priority / Roadmap / Homework strips ─────────────────── */}
      <PriorityActionsStrip recs={recs} />
      <NextStepsRoadmap recs={recs} wins={wins} />
      <HomeworkPanel recs={recs} />

      {/* ── Do This Next ─────────────────────────────────────────── */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(197 92% 48%))" }}
          >
            <TrendingUp className="h-4 w-4" style={{ color: "hsl(210 40% 98%)" }} />
          </div>
          <h3 className="text-lg font-bold text-foreground">Do This Next</h3>
          <span className="text-xs text-muted-foreground">Ranked by projected impact</span>
        </div>

        {loading ? (
          <div className="rounded-2xl p-12 text-center card-widget">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onRefresh={handleRefresh} refreshing={refreshing} hasAny={recs.length > 0} />
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {filtered.map((rec, i) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  index={i}
                  expanded={!!expanded[rec.id]}
                  businessName={activeClientName || "your business"}
                  onToggle={() => setExpanded((e) => ({ ...e, [rec.id]: !e[rec.id] }))}
                  onAction={(s) => updateStatus(rec.id, s)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Wins ─────────────────────────────────────────────────── */}
      {wins.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: "hsla(142,71%,45%,.15)" }}
            >
              <CheckCircle2 className="h-4 w-4" style={{ color: "hsl(142 71% 40%)" }} />
            </div>
            <h3 className="text-lg font-bold text-foreground">Wins</h3>
            <span className="text-xs text-muted-foreground">Recommendations you've acted on</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {wins.map((w, i) => {
              const cat = normalizeCategory(w.category);
              const meta = CATEGORY_META[cat];
              return (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl p-4 flex items-start gap-3"
                  style={{
                    background: "linear-gradient(135deg, hsla(142,71%,45%,.06), hsla(197,92%,58%,.04))",
                    border: "1px solid hsla(142,71%,45%,.15)",
                  }}
                >
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "hsla(142,71%,45%,.15)" }}
                  >
                    <CheckCircle2 className="h-4 w-4" style={{ color: "hsl(142 71% 40%)" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: `hsl(${meta.hue})` }}>
                      {meta.label}
                    </p>
                    <p className="text-sm font-semibold text-foreground leading-snug">{w.title}</p>
                    {w.expected_impact_value != null && (
                      <p className="text-xs mt-1" style={{ color: "hsl(142 71% 35%)" }}>
                        {formatImpact(w.expected_impact_value, w.impact_unit)}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Insights & Feedback ──────────────────────────────────── */}
      <InsightsFeedback recs={recs} wins={wins} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
function EmptyState({ onRefresh, refreshing, hasAny }: { onRefresh: () => void; refreshing: boolean; hasAny: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl p-12 text-center"
      style={{
        background: "linear-gradient(135deg, hsla(211,96%,56%,.04), hsla(197,92%,58%,.06))",
        border: "1px dashed hsla(211,96%,56%,.25)",
      }}
    >
      <div
        className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(197 92% 48%))" }}
      >
        <Sparkles className="h-7 w-7" style={{ color: "hsl(210 40% 98%)" }} />
      </div>
      <h4 className="text-lg font-bold text-foreground mb-1">
        {hasAny ? "Nothing in this category yet" : "Ready for your first insight scan"}
      </h4>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
        {hasAny
          ? "Try another category — or refresh to look for new signals across the board."
          : "We'll compare your live CRM, calendar, and review data against industry benchmarks and rank the highest-impact moves."}
      </p>
      <Button
        onClick={onRefresh}
        disabled={refreshing}
        className="rounded-xl font-semibold border-0"
        style={{
          background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(197 92% 48%))",
          color: "hsl(210 40% 98%)",
        }}
      >
        {refreshing ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…</>
        ) : (
          <><Zap className="mr-2 h-4 w-4" /> Generate Insights</>
        )}
      </Button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
interface CardProps {
  rec: Recommendation;
  index: number;
  expanded: boolean;
  businessName: string;
  onToggle: () => void;
  onAction: (status: Status) => void;
}

function RecommendationCard({ rec, index, expanded, businessName, onToggle, onAction }: CardProps) {
  const { toast } = useToast();
  const cat = normalizeCategory(rec.category);
  const meta = CATEGORY_META[cat];
  const CatIcon = meta.icon;
  const conf = confidenceStyle(rec.confidence_pct);
  const eff = effortStyle(rec.effort_level);
  const isAccepted = rec.status === "accepted";
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const executable = useMemo(() => isExecutable(rec), [rec]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const steps = useMemo(() => buildGuidedSteps(rec), [rec]);
  const actionLabel = rec.action_label || "Take action";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="rounded-2xl overflow-hidden group"
      style={{
        background: "hsla(210,50%,99%,.95)",
        border: `1px solid ${isAccepted ? `hsla(${meta.hue},.35)` : "hsla(211,96%,56%,.1)"}`,
        boxShadow: isAccepted ? `0 8px 24px -12px hsla(${meta.hue},.3)` : "0 2px 8px -4px hsla(215,25%,20%,.06)",
      }}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Left accent bar */}
          <div
            className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, hsla(${meta.hue},.15), hsla(${meta.hue},.08))`,
            }}
          >
            <CatIcon className="h-5 w-5" style={{ color: `hsl(${meta.hue})` }} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: `hsla(${meta.hue},.1)`, color: `hsl(${meta.hue})` }}
              >
                {meta.label}
              </span>
              {isAccepted && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: "hsla(211,96%,56%,.12)", color: "hsl(211 96% 42%)" }}
                >
                  <CheckCircle2 className="h-3 w-3" /> Accepted
                </span>
              )}
            </div>

            <h4 className="text-base font-bold text-foreground leading-snug">{rec.title}</h4>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className="text-sm font-bold px-3 py-1 rounded-lg"
                style={{
                  background: "linear-gradient(135deg, hsla(142,71%,45%,.12), hsla(197,92%,58%,.08))",
                  color: "hsl(142 71% 32%)",
                }}
              >
                {formatImpact(rec.expected_impact_value, rec.impact_unit)}
              </span>
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: conf.bg, color: conf.text }}
              >
                {conf.label}
              </span>
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: eff.bg, color: eff.text }}
              >
                {eff.label}
              </span>
            </div>

            {/* Expandable Why */}
            <button
              onClick={onToggle}
              className="mt-3 flex items-center gap-1 text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ color: `hsl(${meta.hue})` }}
            >
              Why this?
              <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="h-3.5 w-3.5" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  key="why"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div
                    className="mt-3 p-3 rounded-lg text-xs leading-relaxed"
                    style={{
                      background: `hsla(${meta.hue},.04)`,
                      color: "hsl(215 20% 30%)",
                      borderLeft: `2px solid hsl(${meta.hue})`,
                    }}
                  >
                    {rec.why_reasoning || "No reasoning captured for this recommendation."}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Action row */}
        <div
          className="mt-4 pt-4 flex items-center justify-between gap-3 flex-wrap border-t"
          style={{ borderColor: "hsla(215,25%,60%,.1)" }}
        >
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFeedback(feedback === "up" ? null : "up")}
              className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                feedback === "up" ? "" : "hover:bg-muted")}
              style={feedback === "up" ? { background: "hsla(142,71%,45%,.15)", color: "hsl(142 71% 40%)" } : { color: "hsl(215 16% 55%)" }}
              aria-label="Helpful"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setFeedback(feedback === "down" ? null : "down")}
              className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                feedback === "down" ? "" : "hover:bg-muted")}
              style={feedback === "down" ? { background: "hsla(0,80%,60%,.15)", color: "hsl(0 75% 45%)" } : { color: "hsl(215 16% 55%)" }}
              aria-label="Not helpful"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
            <div className="w-px h-5 mx-1" style={{ background: "hsla(215,25%,60%,.15)" }} />
            <button
              onClick={() => onAction("snoozed")}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-all"
              style={{ color: "hsl(215 16% 55%)" }}
              aria-label="Snooze"
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onAction("dismissed")}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted transition-all"
              style={{ color: "hsl(215 16% 55%)" }}
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {isAccepted && (
              <Button
                onClick={() => onAction("acted")}
                variant="outline"
                size="sm"
                className="rounded-lg text-xs font-semibold"
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark done
              </Button>
            )}
            {!isAccepted && executable && (
              <Button
                onClick={() => setConfirmOpen(true)}
                size="sm"
                className="rounded-lg text-xs font-semibold border-0 shadow-md flex items-center"
                style={{
                  background: `linear-gradient(135deg, hsl(${meta.hue}), hsla(${meta.hue},.75))`,
                  color: "hsl(210 40% 98%)",
                }}
              >
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                Execute: {actionLabel}
              </Button>
            )}
            {!isAccepted && !executable && (
              <Button
                onClick={() => setStepsOpen(true)}
                size="sm"
                variant="outline"
                className="rounded-lg text-xs font-semibold flex items-center"
                style={{
                  borderColor: `hsla(${meta.hue},.4)`,
                  color: `hsl(${meta.hue})`,
                  background: `hsla(${meta.hue},.04)`,
                }}
              >
                <ListChecks className="mr-1.5 h-3.5 w-3.5" />
                View Steps
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Execute confirmation modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" style={{ color: `hsl(${meta.hue})` }} />
              Confirm action
            </DialogTitle>
            <DialogDescription>
              This will <span className="font-semibold text-foreground">{actionLabel.toLowerCase()}</span> for{" "}
              <span className="font-semibold text-foreground">{businessName}</span>. Confirm?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                toast({
                  title: "Coming soon",
                  description: "This will connect to your live settings.",
                });
              }}
              className="border-0"
              style={{
                background: `linear-gradient(135deg, hsl(${meta.hue}), hsla(${meta.hue},.75))`,
                color: "hsl(210 40% 98%)",
              }}
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" /> Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guided steps modal */}
      <Dialog open={stepsOpen} onOpenChange={setStepsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" style={{ color: `hsl(${meta.hue})` }} />
              {rec.title || "How to do this"}
            </DialogTitle>
            <DialogDescription>
              A guided walkthrough for {businessName}. Follow the steps below.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 mt-2">
            {steps.map((s, idx) => (
              <li key={idx} className="flex gap-3">
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                  style={{ background: `hsla(${meta.hue},.15)`, color: `hsl(${meta.hue})` }}
                >
                  {idx + 1}
                </div>
                <p className="text-sm leading-relaxed text-foreground pt-0.5">{s}</p>
              </li>
            ))}
          </ol>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setStepsOpen(false)}>Close</Button>
            <Button
              onClick={() => {
                setStepsOpen(false);
                onAction("accepted");
              }}
              className="border-0"
              style={{
                background: `linear-gradient(135deg, hsl(${meta.hue}), hsla(${meta.hue},.75))`,
                color: "hsl(210 40% 98%)",
              }}
            >
              <ArrowRight className="mr-1.5 h-3.5 w-3.5" /> Accept &amp; track
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Category Performance — 6 mini dashboards, always visible.
// Uses illustrative placeholder numbers so the customer sees exactly
// what the surface will look like once integrations are connected.
// Clicking a card filters the "Do This Next" stack via existing state.
// ─────────────────────────────────────────────────────────────────

interface CatPerf {
  key: Category;
  stats: Array<{ label: string; value: string }>;
  spark: Array<{ x: string; y: number }>;
  chartType: "bar" | "line";
}

const CATEGORY_PERF_EXAMPLES: CatPerf[] = [
  {
    key: "ads",
    stats: [
      { label: "Cost / Lead", value: "$42" },
      { label: "CTR", value: "3.8%" },
      { label: "Spend / mo", value: "$2.4K" },
    ],
    spark: [
      { x: "W1", y: 58 }, { x: "W2", y: 51 }, { x: "W3", y: 47 },
      { x: "W4", y: 42 }, { x: "W5", y: 44 }, { x: "W6", y: 40 },
    ],
    chartType: "line",
  },
  {
    key: "seo",
    stats: [
      { label: "Ranking Keywords", value: "128" },
      { label: "Organic Traffic", value: "1.9K" },
      { label: "Backlinks", value: "84" },
    ],
    spark: [
      { x: "M1", y: 90 }, { x: "M2", y: 110 }, { x: "M3", y: 118 },
      { x: "M4", y: 121 }, { x: "M5", y: 125 }, { x: "M6", y: 128 },
    ],
    chartType: "bar",
  },
  {
    key: "social",
    stats: [
      { label: "Engagement Rate", value: "4.2%" },
      { label: "Follower Growth", value: "+38 / mo" },
      { label: "Posts / mo", value: "18" },
    ],
    spark: [
      { x: "W1", y: 3.1 }, { x: "W2", y: 3.6 }, { x: "W3", y: 3.9 },
      { x: "W4", y: 4.0 }, { x: "W5", y: 4.4 }, { x: "W6", y: 4.2 },
    ],
    chartType: "line",
  },
  {
    key: "reviews",
    stats: [
      { label: "Avg Rating", value: "4.6★" },
      { label: "Reviews / mo", value: "12" },
      { label: "Response Rate", value: "92%" },
    ],
    spark: [
      { x: "M1", y: 6 }, { x: "M2", y: 8 }, { x: "M3", y: 9 },
      { x: "M4", y: 11 }, { x: "M5", y: 10 }, { x: "M6", y: 12 },
    ],
    chartType: "bar",
  },
  {
    key: "website",
    stats: [
      { label: "Conversion Rate", value: "3.4%" },
      { label: "Bounce Rate", value: "42%" },
      { label: "Page Views / mo", value: "8.6K" },
    ],
    spark: [
      { x: "W1", y: 2.6 }, { x: "W2", y: 2.9 }, { x: "W3", y: 3.1 },
      { x: "W4", y: 3.2 }, { x: "W5", y: 3.3 }, { x: "W6", y: 3.4 },
    ],
    chartType: "line",
  },
  {
    key: "crm",
    stats: [
      { label: "Open Deals", value: "24" },
      { label: "Pipeline Value", value: "$86K" },
      { label: "Avg Response", value: "12 min" },
    ],
    spark: [
      { x: "M1", y: 14 }, { x: "M2", y: 17 }, { x: "M3", y: 19 },
      { x: "M4", y: 22 }, { x: "M5", y: 23 }, { x: "M6", y: 24 },
    ],
    chartType: "bar",
  },
];

function CategoryPerformanceGrid({
  recs,
  onSelect,
  activeFilter,
}: {
  recs: Recommendation[];
  onSelect: (k: "all" | Category) => void;
  activeFilter: "all" | Category;
}) {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, hsl(280 75% 60%), hsl(211 96% 56%))" }}
        >
          <BarChart3 className="h-4 w-4" style={{ color: "hsl(210 40% 98%)" }} />
        </div>
        <h3 className="text-lg font-bold text-foreground">Category Performance</h3>
        <span className="text-xs text-muted-foreground">Click a card to focus your action queue</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORY_PERF_EXAMPLES.map((cp, idx) => {
          const meta = CATEGORY_META[cp.key];
          const Icon = meta.icon;
          const active = activeFilter === cp.key;
          const catRecs = recs.filter((r) => normalizeCategory(r.category) === cp.key).length;
          return (
            <motion.button
              key={cp.key}
              type="button"
              onClick={() => onSelect(active ? "all" : cp.key)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -3 }}
              className="text-left rounded-2xl p-5 transition-all bg-card border"
              style={{
                borderColor: active ? `hsla(${meta.hue},.45)` : "hsl(var(--border))",
                boxShadow: active
                  ? `0 12px 32px -14px hsla(${meta.hue},.35)`
                  : "0 2px 8px -4px hsla(215,25%,20%,.06)",
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, hsla(${meta.hue},.16), hsla(${meta.hue},.06))` }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ color: `hsl(${meta.hue})` }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground leading-tight">{meta.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {catRecs > 0 ? `${catRecs} recommendation${catRecs === 1 ? "" : "s"}` : "No live signals yet"}
                    </p>
                  </div>
                </div>
                <span
                  className="text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap"
                  style={{
                    background: "hsla(45,93%,50%,.14)",
                    color: "hsl(38 90% 38%)",
                  }}
                  title="Illustrative numbers — connect the account below for live data"
                >
                  Example data
                </span>
              </div>

              <div className="h-16 -mx-1">
                <ResponsiveContainer width="100%" height="100%">
                  {cp.chartType === "line" ? (
                    <LineChart data={cp.spark} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                      <Line
                        type="monotone"
                        dataKey="y"
                        stroke={`hsl(${meta.hue})`}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={cp.spark} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                      <Bar dataKey="y" fill={`hsl(${meta.hue})`} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {cp.stats.map((s) => (
                  <div key={s.label}>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold truncate">{s.label}</p>
                    <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground mt-3 leading-snug">
                Connect your {meta.label.toLowerCase()} account in Integrations to replace with live numbers.
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Insights & Feedback — engagement stats + per-category volume chart
// ─────────────────────────────────────────────────────────────────

function InsightsFeedback({ recs, wins }: { recs: Recommendation[]; wins: Recommendation[] }) {
  const totalLive = recs.length + wins.length;
  const isExample = totalLive < 3;

  const total = isExample ? 42 : totalLive;
  const accepted = isExample ? 28 : recs.filter((r) => r.status === "accepted").length + wins.length;
  const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
  const avgConf = isExample
    ? 74
    : Math.round(
        (recs.reduce((s, r) => s + (r.confidence_pct ?? 0), 0) || 0) / Math.max(1, recs.length)
      );

  const chartData = (["ads", "seo", "social", "reviews", "website", "crm"] as Category[]).map((k) => {
    const meta = CATEGORY_META[k];
    const liveCount =
      recs.filter((r) => normalizeCategory(r.category) === k).length +
      wins.filter((r) => normalizeCategory(r.category) === k).length;
    const exampleCounts: Record<Category, number> = {
      ads: 9, seo: 7, social: 6, reviews: 8, website: 5, crm: 7,
    };
    return {
      name: meta.label,
      count: isExample ? exampleCounts[k] : liveCount,
      fill: `hsl(${meta.hue})`,
    };
  });

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, hsl(197 92% 48%), hsl(142 71% 45%))" }}
        >
          <Activity className="h-4 w-4" style={{ color: "hsl(210 40% 98%)" }} />
        </div>
        <h3 className="text-lg font-bold text-foreground">Insights &amp; Feedback</h3>
        {isExample && (
          <span
            className="text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full"
            style={{ background: "hsla(45,93%,50%,.14)", color: "hsl(38 90% 38%)" }}
          >
            Example data
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="grid gap-3 lg:col-span-2 sm:grid-cols-3 lg:grid-cols-1">
          <StatTile label="Recommendations generated" value={total.toString()} hue="211 96% 56%" />
          <StatTile label="Acceptance rate" value={`${acceptanceRate}%`} hue="142 71% 45%" />
          <StatTile label="Avg confidence" value={`${avgConf}%`} hue="280 75% 60%" />
        </div>

        <div
          className="lg:col-span-3 rounded-2xl p-5"
          style={{
            background: "hsla(210,50%,99%,.95)",
            border: "1px solid hsla(211,96%,56%,.1)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Recommendation volume by category
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(215,25%,60%,.15)" />
                <XAxis dataKey="name" stroke="hsl(215 16% 55%)" fontSize={11} />
                <YAxis stroke="hsl(215 16% 55%)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(210 40% 98%)", border: "1px solid hsla(211,96%,56%,.2)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => (
                    <rect key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {isExample && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Illustrative distribution — real values appear as you refresh insights over time.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, hue }: { label: string; value: string; hue: string }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: `linear-gradient(135deg, hsla(${hue},.08), hsla(${hue},.02))`,
        border: `1px solid hsla(${hue},.18)`,
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold text-foreground tabular-nums mt-2" style={{ color: `hsl(${hue})` }}>
        {value}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Priority Actions strip — top 3 must-do items (urgent accent)
// ─────────────────────────────────────────────────────────────────

const EXAMPLE_PRIORITY = [
  { title: "Reply to 3 pending Google reviews", impact: "Protects reputation + local ranking" },
  { title: "Follow up with last week's stalled leads", impact: "~$2.4K in at-risk pipeline" },
  { title: "Enable no-show reminders", impact: "Recover ~15% of lost appointments" },
];

function PriorityActionsStrip({ recs }: { recs: Recommendation[] }) {
  const top = [...recs]
    .sort((a, b) => (b.rice_score ?? 0) - (a.rice_score ?? 0))
    .slice(0, 3);
  const isExample = top.length === 0;
  const items = isExample
    ? EXAMPLE_PRIORITY.map((e, i) => ({ id: `ex-${i}`, title: e.title, impact: e.impact, hue: "0 72% 51%" }))
    : top.map((r) => ({
        id: r.id,
        title: r.title || "Untitled priority",
        impact: r.expected_impact_value != null
          ? formatImpact(r.expected_impact_value, r.impact_unit)
          : (r.action_label || "High-impact move"),
        hue: CATEGORY_META[normalizeCategory(r.category)].hue,
      }));

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, hsl(0 72% 51%), hsl(24 95% 54%))" }}
        >
          <Flame className="h-4 w-4" style={{ color: "hsl(210 40% 98%)" }} />
        </div>
        <h3 className="text-lg font-bold text-foreground">Priority Actions</h3>
        <span className="text-xs text-muted-foreground">Top 3 must-do moves right now</span>
        {isExample && (
          <span
            className="text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full"
            style={{ background: "hsla(45,93%,50%,.14)", color: "hsl(38 90% 38%)" }}
          >
            Example data
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((it, i) => (
          <motion.div
            key={it.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl p-4 bg-card border relative overflow-hidden"
            style={{
              borderColor: "hsla(0,72%,51%,.28)",
              boxShadow: "0 8px 24px -14px hsla(0,72%,51%,.35)",
            }}
          >
            <div
              className="absolute left-0 top-0 h-full w-1"
              style={{ background: `linear-gradient(180deg, hsl(0 72% 51%), hsl(24 95% 54%))` }}
            />
            <div className="flex items-start gap-3">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "hsla(0,72%,51%,.14)" }}
              >
                <AlertTriangle className="h-4 w-4" style={{ color: "hsl(0 72% 45%)" }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "hsl(0 72% 45%)" }}>
                  Urgent · #{i + 1}
                </p>
                <p className="text-sm font-semibold text-foreground leading-snug mt-1 line-clamp-2">{it.title}</p>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{it.impact}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Next Steps roadmap — sequential 30-day plan
// ─────────────────────────────────────────────────────────────────

const EXAMPLE_ROADMAP = [
  { title: "Week 1 · Foundation", detail: "Connect integrations and confirm CRM data is flowing cleanly." },
  { title: "Week 2 · Activate", detail: "Turn on review requests and appointment reminders." },
  { title: "Week 3 · Amplify", detail: "Launch a re-engagement push to stalled leads." },
  { title: "Week 4 · Measure", detail: "Review scoreboard and double down on what's converting." },
];

function NextStepsRoadmap({ recs, wins }: { recs: Recommendation[]; wins: Recommendation[] }) {
  const active = [...recs.filter((r) => r.status === "accepted"), ...wins]
    .sort((a, b) => (b.rice_score ?? 0) - (a.rice_score ?? 0))
    .slice(0, 4);
  const isExample = active.length === 0;
  const steps = isExample
    ? EXAMPLE_ROADMAP
    : active.map((r, i) => ({
        title: `Step ${i + 1} · ${CATEGORY_META[normalizeCategory(r.category)].label}`,
        detail: r.action_label || r.title || "Continue execution.",
      }));

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(280 75% 60%))" }}
        >
          <ArrowRight className="h-4 w-4" style={{ color: "hsl(210 40% 98%)" }} />
        </div>
        <h3 className="text-lg font-bold text-foreground">Next Steps</h3>
        <span className="text-xs text-muted-foreground">Suggested order of operations · next 30 days</span>
        {isExample && (
          <span
            className="text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full"
            style={{ background: "hsla(45,93%,50%,.14)", color: "hsl(38 90% 38%)" }}
          >
            Example data
          </span>
        )}
      </div>

      <div className="rounded-2xl bg-card border border-border p-6">
        <div className="relative">
          <div
            className="absolute left-4 top-2 bottom-2 w-px"
            style={{ background: "linear-gradient(180deg, hsl(211 96% 56%), hsl(280 75% 60%))" }}
          />
          <div className="space-y-5">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-4 pl-0"
              >
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold z-10"
                  style={{
                    background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(280 75% 60%))",
                    color: "hsl(210 40% 98%)",
                    boxShadow: "0 4px 12px -4px hsla(211,96%,56%,.4)",
                  }}
                >
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Homework — tasks the business owner must do themselves
// ─────────────────────────────────────────────────────────────────

const OWNER_CATEGORIES = new Set<Category>(["reviews", "website"]);
const EXAMPLE_HOMEWORK = [
  { title: "Upload 10 before/after photos", detail: "Fresh visuals drive higher social + web conversion." },
  { title: "Respond to your 3 pending reviews", detail: "A personal reply from the owner earns trust fast." },
  { title: "Confirm business hours on Google", detail: "Wrong hours = missed calls and lost bookings." },
];

function HomeworkPanel({ recs }: { recs: Recommendation[] }) {
  const owner = recs.filter((r) => OWNER_CATEGORIES.has(normalizeCategory(r.category))).slice(0, 3);
  const isExample = owner.length === 0;
  const items = isExample
    ? EXAMPLE_HOMEWORK
    : owner.map((r) => ({
        title: r.title || "Owner task",
        detail: r.action_label || r.why_reasoning || "Requires owner attention.",
      }));

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, hsl(45 93% 50%), hsl(24 95% 54%))" }}
        >
          <BookOpen className="h-4 w-4" style={{ color: "hsl(210 40% 98%)" }} />
        </div>
        <h3 className="text-lg font-bold text-foreground">Homework</h3>
        <span className="text-xs text-muted-foreground">Tasks only you can do</span>
        {isExample && (
          <span
            className="text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full"
            style={{ background: "hsla(45,93%,50%,.14)", color: "hsl(38 90% 38%)" }}
          >
            Example data
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((it, i) => (
          <motion.label
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl p-4 bg-card border border-border cursor-pointer flex items-start gap-3 hover:border-[hsl(45,93%,50%)]/40 transition-colors"
          >
            <div
              className="h-5 w-5 rounded-md border-2 shrink-0 mt-0.5"
              style={{ borderColor: "hsl(45 93% 50%)" }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground leading-snug">{it.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{it.detail}</p>
            </div>
          </motion.label>
        ))}
      </div>
    </div>
  );
}
