import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket, RefreshCw, TrendingUp, DollarSign, Target, Compass,
  Sparkles, Trash2, Plus, Pencil, Check, X, ChevronDown,
  Loader2, Layers, MapPin, Repeat, Tag, Users,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type OppType = "new_service" | "new_channel" | "pricing" | "new_geo" | "retention";
type OppStatus = "active" | "pursuing" | "completed" | "dismissed";

interface Opportunity {
  id: string;
  client_id: string | null;
  opportunity_type: string | null;
  title: string | null;
  narrative: string | null;
  sized_revenue_low: number | null;
  sized_revenue_expected: number | null;
  sized_revenue_high: number | null;
  confidence_pct: number | null;
  effort_level: string | null;
  assumptions: string | null;
  status: string;
  generated_at: string;
}

interface Competitor {
  id: string;
  client_id: string | null;
  competitor_name: string | null;
  review_count: number | null;
  avg_rating: number | null;
  estimated_share_of_voice: number | null;
  notes: string | null;
  created_at: string;
}

const TYPE_META: Record<OppType, { label: string; icon: typeof Rocket; hue: string }> = {
  new_service: { label: "New Service",  icon: Layers,  hue: "197 92% 48%" },
  new_channel: { label: "New Channel",  icon: Compass, hue: "280 75% 60%" },
  pricing:     { label: "Pricing Move", icon: Tag,     hue: "45 93% 50%" },
  new_geo:     { label: "New Geography",icon: MapPin,  hue: "142 71% 45%" },
  retention:   { label: "Retention",    icon: Repeat,  hue: "211 96% 56%" },
};

const currency = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `$${Math.round(n)}`;

export default function GrowthAdvisor() {
  const { activeClientId } = useWorkspace();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [expandedAssumptions, setExpandedAssumptions] = useState<Record<string, boolean>>({});

  // Scenario baseline (real values from client's data)
  const [baseline, setBaseline] = useState({
    adBudget: 2000, conversionRate: 15, closeRate: 25, avgDealValue: 1500,
  });
  const [scenario, setScenario] = useState(baseline);

  // Competitor editing
  const [editingComp, setEditingComp] = useState<string | null>(null);
  const [newComp, setNewComp] = useState({ name: "", reviews: "", rating: "", sov: "" });
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [oppsRes, compRes, dealsRes, contactsRes] = await Promise.all([
      supabase.from("growth_opportunities").select("*").eq("client_id", activeClientId).order("generated_at", { ascending: false }),
      supabase.from("growth_competitors").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("crm_deals").select("deal_value, pipeline_stage, created_at").eq("client_id", activeClientId),
      supabase.from("crm_contacts").select("id, created_at").eq("client_id", activeClientId),
    ]);
    setOpps(oppsRes.data ?? []);
    setCompetitors(compRes.data ?? []);

    // Compute baseline from real data (last 90d)
    const ninetyAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    const d = (dealsRes.data ?? []).filter((x) => x.created_at >= ninetyAgo);
    const c = (contactsRes.data ?? []).filter((x) => x.created_at >= ninetyAgo);
    const won = d.filter((x) => x.pipeline_stage === "closed_won");
    const avgDeal = won.length > 0 ? won.reduce((s, x) => s + (Number(x.deal_value) || 0), 0) / won.length : 1500;
    const closeRate = c.length > 0 ? (won.length / c.length) * 100 : 25;
    const monthlyLeads = c.length / 3; // 90d -> monthly
    const b = {
      adBudget: 2000,
      conversionRate: monthlyLeads > 0 ? Math.min(50, Math.max(1, monthlyLeads / 20)) : 15,
      closeRate: Math.max(1, Math.min(100, Number(closeRate.toFixed(1)))),
      avgDealValue: Math.max(50, Math.round(avgDeal)),
    };
    setBaseline(b);
    setScenario(b);

    setLoading(false);
  }, [activeClientId]);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    if (!activeClientId) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-growth-opportunities", {
        body: { client_id: activeClientId },
      });
      if (error) throw error;
      toast({ title: "Growth plan refreshed", description: `${(data?.opportunities?.length ?? 0)} opportunities generated.` });
      await load();
    } catch (e: any) {
      const msg = e?.message || "Failed to generate";
      toast({ title: "Refresh failed", description: msg, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const setStatus = async (id: string, status: OppStatus) => {
    setOpps((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    const { error } = await supabase.from("growth_opportunities").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      await load();
    }
  };

  const activeOpps = useMemo(() => opps.filter((o) => o.status === "active" || o.status === "pursuing"), [opps]);

  const thesis = useMemo(() => {
    if (activeOpps.length === 0) return null;
    const top = activeOpps.slice(0, 2);
    const totalExpected = top.reduce((s, o) => s + (Number(o.sized_revenue_expected) || 0), 0);
    if (top[0]?.narrative && top.length === 1) return top[0].narrative;
    return `Two highest-leverage moves: ${top.map((o) => `"${o.title}"`).join(" and ")}. Combined expected lift ≈ ${currency(totalExpected)}/mo.`;
  }, [activeOpps]);

  // Scenario math
  const projected = useMemo(() => {
    // reasonable ad-driven model: $50 CPL baseline; conversion% modulates lead->appt; close% modulates appt->won
    const cplBaseline = 50;
    const monthlyLeads = Math.round(scenario.adBudget / cplBaseline);
    const monthlyAppts = Math.round(monthlyLeads * (scenario.conversionRate / 100));
    const monthlyRevenue = Math.round(monthlyAppts * (scenario.closeRate / 100) * scenario.avgDealValue);
    return { monthlyLeads, monthlyAppts, monthlyRevenue };
  }, [scenario]);

  const projectionChart = useMemo(() => (
    [3, 6, 9, 12].map((m) => ({
      month: `M${m}`,
      revenue: projected.monthlyRevenue * m * (1 + (m - 3) * 0.05), // gentle compounding
    }))
  ), [projected.monthlyRevenue]);

  const addCompetitor = async () => {
    if (!activeClientId || !newComp.name.trim()) return;
    const { error } = await supabase.from("growth_competitors").insert({
      client_id: activeClientId,
      competitor_name: newComp.name.trim(),
      review_count: newComp.reviews ? Number(newComp.reviews) : null,
      avg_rating: newComp.rating ? Number(newComp.rating) : null,
      estimated_share_of_voice: newComp.sov ? Number(newComp.sov) : null,
    });
    if (error) { toast({ title: "Add failed", description: error.message, variant: "destructive" }); return; }
    setNewComp({ name: "", reviews: "", rating: "", sov: "" });
    setShowAdd(false);
    await load();
  };

  const updateCompetitor = async (id: string, patch: Partial<Competitor>) => {
    const { error } = await supabase.from("growth_competitors").update(patch).eq("id", id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setEditingComp(null);
    await load();
  };

  const deleteCompetitor = async (id: string) => {
    const { error } = await supabase.from("growth_competitors").delete().eq("id", id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    await load();
  };

  // My numbers for competitor comparison
  const myReviews = useMemo(() => 0, []); // could pull from review_requests; kept 0 baseline
  const gapCallouts = useMemo(() => {
    const notes: string[] = [];
    competitors.forEach((c) => {
      if (c.review_count && myReviews > 0 && c.review_count >= myReviews * 3) {
        notes.push(`${c.competitor_name} has ${(c.review_count / Math.max(1, myReviews)).toFixed(1)}x your review count.`);
      } else if (c.review_count && myReviews === 0) {
        notes.push(`${c.competitor_name} has ${c.review_count} reviews — you have none tracked yet.`);
      }
    });
    return notes;
  }, [competitors, myReviews]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">
        <PageHeader
          title="AI Growth Advisor"
          description="Executive-level strategic moves, sized in real dollars, grounded in your live data."
        />

        {/* GROWTH THESIS HERO */}
        <motion.section
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/[0.08] via-background to-background p-8 md:p-12 shadow-2xl"
        >
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1 space-y-4 max-w-3xl">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary/80 font-medium">
                <Sparkles className="w-3.5 h-3.5" /> Growth Thesis
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold leading-tight tracking-tight">
                {thesis ? "Where the next quarter of growth comes from" : "Ready to model your growth thesis"}
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {thesis || "Click Generate to have the AI analyze your live pipeline, deal history and market benchmarks and produce a strategic growth plan sized in dollars."}
              </p>
            </div>
            <div className="flex flex-col gap-3 md:min-w-[220px]">
              <Button
                onClick={refresh} disabled={refreshing}
                size="lg" className="gap-2 shadow-lg"
              >
                {refreshing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  : <><RefreshCw className="w-4 h-4" /> {opps.length === 0 ? "Generate Growth Plan" : "Refresh"}</>}
              </Button>
              {activeOpps.length > 0 && (
                <div className="text-center text-xs text-muted-foreground">
                  {activeOpps.length} active opportunit{activeOpps.length === 1 ? "y" : "ies"}
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* OPPORTUNITY CARDS */}
        <section className="space-y-5">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight">Strategic Opportunities</h3>
              <p className="text-sm text-muted-foreground mt-1">Ranked by expected monthly revenue lift.</p>
            </div>
          </div>

          {activeOpps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 p-12 text-center">
              <Rocket className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No active opportunities yet. Generate your first growth plan above.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {activeOpps
                .sort((a, b) => (Number(b.sized_revenue_expected) || 0) - (Number(a.sized_revenue_expected) || 0))
                .map((o) => {
                  const t = (o.opportunity_type as OppType) || "new_channel";
                  const meta = TYPE_META[t] ?? TYPE_META.new_channel;
                  const Icon = meta.icon;
                  const expanded = !!expandedAssumptions[o.id];
                  return (
                    <motion.div
                      key={o.id}
                      layout
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="group relative rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-7 shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
                    >
                      <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ background: `hsl(${meta.hue})` }}
                      />

                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{ background: `hsla(${meta.hue}, 0.12)`, color: `hsl(${meta.hue})` }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{meta.label}</div>
                            <h4 className="text-lg font-semibold leading-tight">{o.title}</h4>
                          </div>
                        </div>
                        {o.status === "pursuing" && (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">Pursuing</span>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground leading-relaxed mb-5">{o.narrative}</p>

                      {/* Sized revenue range */}
                      <div className="rounded-xl bg-background/60 border border-border/40 p-4 mb-4">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Sized Monthly Revenue</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm text-muted-foreground">{currency(Number(o.sized_revenue_low) || 0)}</span>
                          <span className="text-muted-foreground/40">—</span>
                          <span className="text-3xl font-bold tracking-tight" style={{ color: `hsl(${meta.hue})` }}>
                            {currency(Number(o.sized_revenue_expected) || 0)}
                          </span>
                          <span className="text-muted-foreground/40">—</span>
                          <span className="text-sm text-muted-foreground">{currency(Number(o.sized_revenue_high) || 0)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-wider">
                          <span>Low</span><span>Expected</span><span>High</span>
                        </div>
                      </div>

                      {/* Chips */}
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <span className="text-xs px-2.5 py-1 rounded-full bg-muted/50 border border-border/40">
                          {o.confidence_pct ?? 0}% confidence
                        </span>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-muted/50 border border-border/40 capitalize">
                          {o.effort_level ?? "medium"} effort
                        </span>
                      </div>

                      {/* Assumptions */}
                      {o.assumptions && (
                        <button
                          onClick={() => setExpandedAssumptions((s) => ({ ...s, [o.id]: !s[o.id] }))}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
                        >
                          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")} />
                          {expanded ? "Hide assumptions" : "Show assumptions"}
                        </button>
                      )}
                      <AnimatePresence>
                        {expanded && o.assumptions && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3 mb-4 whitespace-pre-line">
                              {o.assumptions}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex items-center gap-2 pt-3 border-t border-border/30">
                        {o.status === "active" ? (
                          <>
                            <Button size="sm" onClick={() => setStatus(o.id, "pursuing")} className="flex-1 gap-1">
                              <Target className="w-3.5 h-3.5" /> Pursue
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setStatus(o.id, "dismissed")}>
                              Dismiss
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => setStatus(o.id, "completed")} className="flex-1 gap-1">
                              <Check className="w-3.5 h-3.5" /> Mark completed
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setStatus(o.id, "active")}>
                              Pause
                            </Button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          )}
        </section>

        {/* SCENARIO MODELER */}
        <section className="space-y-5">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" /> Scenario Modeler
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Move the levers. See revenue update instantly.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-card/60 p-7 space-y-6">
              <ScenarioSlider
                label="Monthly Ad Budget" unit="$" min={0} max={20000} step={100}
                value={scenario.adBudget} baseline={baseline.adBudget}
                onChange={(v) => setScenario((s) => ({ ...s, adBudget: v }))}
              />
              <ScenarioSlider
                label="Lead → Appointment Conversion" unit="%" min={1} max={80} step={0.5}
                value={scenario.conversionRate} baseline={baseline.conversionRate}
                onChange={(v) => setScenario((s) => ({ ...s, conversionRate: v }))}
              />
              <ScenarioSlider
                label="Close Rate" unit="%" min={1} max={100} step={0.5}
                value={scenario.closeRate} baseline={baseline.closeRate}
                onChange={(v) => setScenario((s) => ({ ...s, closeRate: v }))}
              />
              <ScenarioSlider
                label="Average Deal Value" unit="$" min={50} max={50000} step={50}
                value={scenario.avgDealValue} baseline={baseline.avgDealValue}
                onChange={(v) => setScenario((s) => ({ ...s, avgDealValue: v }))}
              />
              <Button variant="ghost" size="sm" onClick={() => setScenario(baseline)} className="w-full">
                Reset to current values
              </Button>
            </div>

            <div className="lg:col-span-3 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <ScenarioMetric label="Monthly Leads" value={projected.monthlyLeads.toLocaleString()} icon={Users} hue="211 96% 56%" />
                <ScenarioMetric label="Monthly Appointments" value={projected.monthlyAppts.toLocaleString()} icon={Target} hue="280 75% 60%" />
                <ScenarioMetric label="Monthly Revenue" value={currency(projected.monthlyRevenue)} icon={DollarSign} hue="142 71% 45%" featured />
              </div>

              <div className="rounded-2xl border border-border/50 bg-card/60 p-6">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Projected Revenue Over Time</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectionChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => currency(v)} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => currency(v)}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMPETITIVE POSITIONING */}
        <section className="space-y-5">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight">Competitive Positioning</h3>
              <p className="text-sm text-muted-foreground mt-1">Track the competitors that matter. Add or edit anytime.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAdd((v) => !v)} className="gap-1">
              <Plus className="w-4 h-4" /> Add Competitor
            </Button>
          </div>

          {gapCallouts.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 space-y-1">
              {gapCallouts.map((n, i) => (
                <div key={i} className="text-sm text-amber-600 dark:text-amber-400 flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" /> {n}
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-border/50 bg-card/60 overflow-hidden">
            <div className="grid grid-cols-12 px-6 py-3 border-b border-border/40 text-[11px] uppercase tracking-wider text-muted-foreground font-medium bg-muted/20">
              <div className="col-span-4">Competitor</div>
              <div className="col-span-2 text-right">Reviews</div>
              <div className="col-span-2 text-right">Rating</div>
              <div className="col-span-2 text-right">Share of Voice</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {showAdd && (
              <div className="grid grid-cols-12 px-6 py-3 border-b border-border/40 bg-primary/[0.03] gap-2 items-center">
                <Input className="col-span-4" placeholder="Competitor name"
                  value={newComp.name} onChange={(e) => setNewComp((s) => ({ ...s, name: e.target.value }))} />
                <Input className="col-span-2 text-right" placeholder="0" type="number"
                  value={newComp.reviews} onChange={(e) => setNewComp((s) => ({ ...s, reviews: e.target.value }))} />
                <Input className="col-span-2 text-right" placeholder="4.5" type="number" step="0.1"
                  value={newComp.rating} onChange={(e) => setNewComp((s) => ({ ...s, rating: e.target.value }))} />
                <Input className="col-span-2 text-right" placeholder="%" type="number"
                  value={newComp.sov} onChange={(e) => setNewComp((s) => ({ ...s, sov: e.target.value }))} />
                <div className="col-span-2 flex justify-end gap-1">
                  <Button size="sm" onClick={addCompetitor}><Check className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}><X className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            )}

            {competitors.length === 0 && !showAdd ? (
              <div className="px-6 py-10 text-center text-muted-foreground text-sm">
                No competitors tracked yet. Add your top 3-5 to unlock gap analysis.
              </div>
            ) : (
              competitors.map((c) => (
                <CompetitorRow
                  key={c.id} competitor={c}
                  editing={editingComp === c.id}
                  onEdit={() => setEditingComp(c.id)}
                  onCancel={() => setEditingComp(null)}
                  onSave={(patch) => updateCompetitor(c.id, patch)}
                  onDelete={() => deleteCompetitor(c.id)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function ScenarioSlider({
  label, unit, min, max, step, value, baseline, onChange,
}: {
  label: string; unit: string; min: number; max: number; step: number;
  value: number; baseline: number; onChange: (v: number) => void;
}) {
  const diff = value - baseline;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium">{label}</label>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tabular-nums">
            {unit === "$" ? `$${Math.round(value).toLocaleString()}` : `${value.toFixed(unit === "%" ? 1 : 0)}${unit}`}
          </span>
          {Math.abs(diff) > 0.01 && (
            <span className={cn("text-xs tabular-nums", diff > 0 ? "text-emerald-500" : "text-muted-foreground")}>
              {diff > 0 ? "+" : ""}{unit === "$" ? currency(diff) : diff.toFixed(1) + unit}
            </span>
          )}
        </div>
      </div>
      <Slider
        min={min} max={max} step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

function ScenarioMetric({
  label, value, icon: Icon, hue, featured,
}: { label: string; value: string; icon: typeof Users; hue: string; featured?: boolean }) {
  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl p-5 border transition-all",
        featured
          ? "bg-gradient-to-br from-primary/[0.08] to-background border-primary/20 shadow-lg"
          : "bg-card/60 border-border/50"
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `hsla(${hue}, 0.12)`, color: `hsl(${hue})` }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
      <motion.div
        key={value}
        initial={{ opacity: 0.6, y: 4 }} animate={{ opacity: 1, y: 0 }}
        className={cn("tabular-nums font-bold tracking-tight", featured ? "text-4xl" : "text-3xl")}
        style={featured ? { color: `hsl(${hue})` } : undefined}
      >
        {value}
      </motion.div>
    </motion.div>
  );
}

function CompetitorRow({
  competitor, editing, onEdit, onCancel, onSave, onDelete,
}: {
  competitor: Competitor; editing: boolean;
  onEdit: () => void; onCancel: () => void;
  onSave: (patch: Partial<Competitor>) => void; onDelete: () => void;
}) {
  const [name, setName] = useState(competitor.competitor_name ?? "");
  const [reviews, setReviews] = useState(competitor.review_count?.toString() ?? "");
  const [rating, setRating] = useState(competitor.avg_rating?.toString() ?? "");
  const [sov, setSov] = useState(competitor.estimated_share_of_voice?.toString() ?? "");

  useEffect(() => {
    setName(competitor.competitor_name ?? "");
    setReviews(competitor.review_count?.toString() ?? "");
    setRating(competitor.avg_rating?.toString() ?? "");
    setSov(competitor.estimated_share_of_voice?.toString() ?? "");
  }, [competitor, editing]);

  if (editing) {
    return (
      <div className="grid grid-cols-12 px-6 py-3 border-b border-border/30 gap-2 items-center bg-primary/[0.03]">
        <Input className="col-span-4" value={name} onChange={(e) => setName(e.target.value)} />
        <Input className="col-span-2 text-right" type="number" value={reviews} onChange={(e) => setReviews(e.target.value)} />
        <Input className="col-span-2 text-right" type="number" step="0.1" value={rating} onChange={(e) => setRating(e.target.value)} />
        <Input className="col-span-2 text-right" type="number" value={sov} onChange={(e) => setSov(e.target.value)} />
        <div className="col-span-2 flex justify-end gap-1">
          <Button size="sm" onClick={() => onSave({
            competitor_name: name.trim(),
            review_count: reviews ? Number(reviews) : null,
            avg_rating: rating ? Number(rating) : null,
            estimated_share_of_voice: sov ? Number(sov) : null,
          })}><Check className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={onCancel}><X className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 px-6 py-4 border-b border-border/30 last:border-b-0 items-center hover:bg-muted/10 transition-colors">
      <div className="col-span-4 font-medium">{competitor.competitor_name || "—"}</div>
      <div className="col-span-2 text-right tabular-nums">{competitor.review_count?.toLocaleString() ?? "—"}</div>
      <div className="col-span-2 text-right tabular-nums">{competitor.avg_rating != null ? `${Number(competitor.avg_rating).toFixed(1)}★` : "—"}</div>
      <div className="col-span-2 text-right tabular-nums">{competitor.estimated_share_of_voice != null ? `${competitor.estimated_share_of_voice}%` : "—"}</div>
      <div className="col-span-2 flex justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="w-3.5 h-3.5" /></Button>
        <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="w-3.5 h-3.5 text-destructive/70" /></Button>
      </div>
    </div>
  );
}
