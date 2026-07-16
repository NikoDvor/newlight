import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, RefreshCw, TrendingUp, ChevronDown, X, Clock, ThumbsUp,
  ThumbsDown, CheckCircle2, Megaphone, Search, Share2, Star, Globe,
  Users, Zap, Loader2, ArrowRight, ListChecks,
} from "lucide-react";
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
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"all" | Category>("all");

  const fetchAll = useCallback(async () => {
    if (!activeClientId) return;
    setLoading(true);
    const [{ data: recsData }, { data: winsData }, { data: healthData }] = await Promise.all([
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
    ]);
    setRecs((recsData ?? []) as Recommendation[]);
    setWins((winsData ?? []) as Recommendation[]);
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
  onToggle: () => void;
  onAction: (status: Status) => void;
}

function RecommendationCard({ rec, index, expanded, onToggle, onAction }: CardProps) {
  const cat = normalizeCategory(rec.category);
  const meta = CATEGORY_META[cat];
  const CatIcon = meta.icon;
  const conf = confidenceStyle(rec.confidence_pct);
  const eff = effortStyle(rec.effort_level);
  const isAccepted = rec.status === "accepted";
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

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
            {!isAccepted && (
              <Button
                onClick={() => onAction("accepted")}
                size="sm"
                className="rounded-lg text-xs font-semibold border-0 shadow-md"
                style={{
                  background: `linear-gradient(135deg, hsl(${meta.hue}), hsla(${meta.hue},.75))`,
                  color: "hsl(210 40% 98%)",
                }}
              >
                {rec.action_label || "Take action"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
