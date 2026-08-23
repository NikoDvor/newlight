import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion, animate as fmAnimate } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, Gauge, AlertTriangle, UserRound,
  Layers, ChevronDown, RotateCcw, Sparkles, CalendarCheck, Info,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip as RTooltip } from "recharts";
import { Slider } from "@/components/ui/slider";
import { usePipelineRevenue } from "@/hooks/usePipelineRevenue";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  FUNNEL_STAGES, STAGE_COLOR, STAGE_LABEL, STAGE_DESCRIPTION,
  LOST_REASON_LABEL, fmtMoney, fmtPct, projectRevenue,
  type CanonStage,
} from "@/lib/pipelineRevenue";

/**
 * ONE widget, two surfaces. `variant="admin"` renders NewLight's own pipeline
 * (leaderboard + rep capacity); `variant="client"` renders a sub-account's
 * pipeline (vertical benchmark). All maths lives in the shared compute layer.
 */
export interface PipelineRevenueOpportunityProps {
  clientId: string | null | undefined;
  variant?: "admin" | "client";
  /**
   * Where the pipeline comes from. "crm" = client-scoped crm_deals (every
   * sub-account). "bdr" = NewLight's own nl_bdr_leads pipeline (admin only).
   */
  source?: "crm" | "bdr";
  className?: string;
}


const PANEL: React.CSSProperties = {
  background:
    "linear-gradient(155deg, hsla(215,40%,11%,.92) 0%, hsla(222,42%,7%,.94) 58%, hsla(211,60%,10%,.9) 100%)",
  border: "1px solid hsla(211,96%,60%,.16)",
  boxShadow:
    "0 24px 60px -32px hsla(211,96%,50%,.55), inset 0 1px 0 hsla(211,96%,80%,.07), inset 0 -30px 60px -50px hsla(211,96%,70%,.35)",
};

const SUBPANEL: React.CSSProperties = {
  background: "hsla(215,38%,10%,.62)",
  border: "1px solid hsla(211,96%,60%,.10)",
  boxShadow: "inset 0 1px 0 hsla(211,96%,85%,.05), inset 0 -18px 30px -30px hsla(211,96%,70%,.4)",
};

const ease = [0.22, 1, 0.36, 1] as any;

/** One deliberate top-to-bottom cascade instead of scattered arrivals. */
const CASCADE = 0.07;
const block = (i: number, reduced: boolean) => ({
  initial: reduced ? { opacity: 0 } : { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.1 + i * CASCADE, duration: 0.5, ease },
});

/** Count-up for stage numbers; instant when reduced motion is requested. */
function CountUp({ value, className, style }: { value: number; className?: string; style?: React.CSSProperties }) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(reduced ? value : 0);
  useEffect(() => {
    if (reduced) { setN(value); return; }
    const controls = fmAnimate(0, value, {
      duration: 0.9,
      ease,
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduced]);
  return <span className={className} style={style}>{n}</span>;
}

export function PipelineRevenueOpportunity({
  clientId,
  variant = "client",
  source = "crm",
  className = "",
}: PipelineRevenueOpportunityProps) {
  const { isAdmin } = useWorkspace();
  const reduced = useReducedMotion();
  const [targetDraft, setTargetDraft] = useState("");
  const [editingTarget, setEditingTarget] = useState(false);
  const crmData = usePipelineRevenue(source === "crm" ? clientId : null, {
    withBenchmark: variant === "client",
    emitRisk: true,
  });
  const bdrData = useBdrPipelineRevenue(source === "bdr" ? clientId : null);
  const { loading, model, openDeals, repNames, vertical, refresh } =
    source === "bdr" ? bdrData : crmData;


  const baseRates = useMemo(() => (model?.stageRates ?? []).map((s) => s.rate), [model]);
  const [rates, setRates] = useState<number[]>([]);
  const [dirty, setDirty] = useState(false);
  const [showWinBacks, setShowWinBacks] = useState(false);

  useEffect(() => {
    setRates(baseRates);
    setDirty(false);
  }, [baseRates.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  const projected = useMemo(
    () => (rates.length ? projectRevenue(openDeals as any, rates) : 0),
    [openDeals, rates],
  );

  if (!clientId) return null;

  if (loading || !model) {
    return (
      <div className={`rounded-2xl p-6 ${className}`} style={PANEL}>
        <div className="h-5 w-56 rounded bg-white/[0.06] animate-pulse" />
        <div className="h-11 w-72 rounded bg-white/[0.05] animate-pulse mt-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const { weighted, coverageRatio, revenueTarget, buckets, stageRates, lostBreakdown, lostTotal } = model;
  const bucket = (s: CanonStage) => buckets.find((b) => b.stage === s)!;
  const lastTrend = model.trend[model.trend.length - 1];
  const prevTrend = model.trend[model.trend.length - 2];
  const trendDelta = lastTrend && prevTrend ? lastTrend.closeRate - prevTrend.closeRate : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
      className={`rounded-2xl overflow-hidden relative prv-grain ${className}`}
      style={PANEL}
    >
      {/* ── headline ── */}
      <div className="p-5 sm:p-6 pb-4 relative">
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, hsla(211,96%,70%,.5), transparent)" }}
        />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" style={{ color: "hsl(var(--nl-sky))" }} />
              Pipeline Revenue Opportunity
            </p>
            <div className="relative mt-2">
              {!reduced && <span className="prv-halo" aria-hidden />}
              <div className="relative overflow-hidden">
                {!reduced && <span className="prv-scan" aria-hidden />}
                <div
                  className="relative flex items-baseline gap-1.5 flex-wrap text-[2rem] sm:text-[2.6rem] leading-none font-bold tabular-nums"
                  style={{
                    backgroundImage:
                      "linear-gradient(120deg, hsl(var(--nl-ice)), hsl(var(--nl-sky)) 55%, hsl(var(--nl-electric)))",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    filter: "drop-shadow(0 2px 18px hsla(211,96%,60%,.35))",
                  }}
                >
                  <motion.span
                    key={`lo-${Math.round(weighted.low)}`}
                    initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease, delay: 0.15 }}
                  >
                    {fmtMoney(weighted.low)}
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.55 }}
                    transition={{ duration: 0.4, delay: 0.38 }}
                  >
                    –
                  </motion.span>
                  <motion.span
                    key={`hi-${Math.round(weighted.high)}`}
                    initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease, delay: 0.5 }}
                  >
                    {fmtMoney(weighted.high)}
                  </motion.span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-white/45 mt-1.5">
              Weighted pipeline value · {fmtMoney(model.openValue)} open across{" "}
              {buckets.filter((b) => b.stage !== "won" && b.stage !== "lost").reduce((s, b) => s + b.count, 0)}{" "}
              live deals · range reflects sample size, not a guess
            </p>
          </div>

          <div className="flex items-stretch gap-2.5">
            {coverageRatio != null && (
              <StatTile
                icon={Gauge}
                label="Coverage"
                value={`${coverageRatio.toFixed(2)}×`}
                sub={`vs ${fmtMoney(revenueTarget!)} target`}
                tone={coverageRatio >= 3 ? "good" : coverageRatio >= 1.5 ? "warn" : "bad"}
              />
            )}
            {coverageRatio == null && isAdmin && (
              <div className="rounded-xl px-3.5 py-2.5 min-w-[150px]" style={SUBPANEL}>
                <p className="text-[9px] uppercase tracking-wider text-white/35 font-semibold flex items-center gap-1">
                  <Gauge className="h-3 w-3" /> Revenue target
                </p>
                {editingTarget ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      autoFocus
                      value={targetDraft}
                      onChange={(e) => setTargetDraft(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="250000"
                      className="w-full bg-transparent border-b border-white/20 text-sm text-white/90 outline-none tabular-nums"
                    />
                    <button
                      className="text-[10px] text-white/60 hover:text-white"
                      onClick={async () => {
                        const v = Number(targetDraft);
                        if (!(v > 0)) { setEditingTarget(false); return; }
                        const { error } = await (supabase as any)
                          .from("clients").update({ revenue_target: v }).eq("id", clientId);
                        if (error) toast.error(error.message);
                        else { toast.success("Revenue target set"); refresh(); }
                        setEditingTarget(false);
                      }}
                    >Save</button>
                  </div>
                ) : (
                  <button
                    className="text-[13px] text-white/55 hover:text-white/90 mt-1 underline decoration-dotted underline-offset-4"
                    onClick={() => setEditingTarget(true)}
                  >Set a target</button>
                )}
                <p className="text-[10px] text-white/30 mt-0.5">unlocks coverage ratio</p>
              </div>
            )}
            <StatTile
              icon={trendDelta > 0.005 ? TrendingUp : trendDelta < -0.005 ? TrendingDown : Minus}
              label="Close rate"
              value={fmtPct(lastTrend?.closeRate ?? 0, 1)}
              sub={`${trendDelta >= 0 ? "+" : ""}${(trendDelta * 100).toFixed(1)}pt vs last wk`}
              tone={trendDelta >= 0 ? "good" : "bad"}
            />
          </div>
        </div>

        {/* 8-week sparkline */}
        {model.trend.some((t) => t.cold + t.warm + t.hot + t.won + t.lost > 0) && (
          <div className="h-14 mt-4 -mx-1 prv-spark">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={model.trend} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="prvTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--nl-sky))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--nl-sky))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <RTooltip
                  cursor={{ stroke: "hsla(211,96%,70%,.25)" }}
                  contentStyle={{
                    background: "hsl(222 38% 7%)",
                    border: "1px solid hsla(211,96%,60%,.2)",
                    borderRadius: 10,
                    fontSize: 11,
                  }}
                  formatter={(v: any, k: any) => [k === "closeRate" ? fmtPct(Number(v), 1) : v, k]}
                  labelFormatter={(l: any, p: any) => p?.[0]?.payload?.label ?? ""}
                />
                <Area
                  type="monotone"
                  dataKey="closeRate"
                  stroke="hsl(var(--nl-sky))"
                  strokeWidth={2}
                  fill="url(#prvTrend)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── funnel ── */}
      <div className="px-5 sm:px-6 pb-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {FUNNEL_STAGES.map((s, i) => {
          const b = bucket(s);
          const total = Math.max(1, buckets.filter((x) => x.stage !== "lost").reduce((a, x) => a + x.count, 0));
          return (
            <motion.div
              key={s}
              {...block(1 + i * 0.5, !!reduced)}
              className="rounded-xl p-3.5 relative overflow-hidden prv-grain"
              style={SUBPANEL}
              title={STAGE_DESCRIPTION[s]}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px]"
                style={{ background: STAGE_COLOR[s] }}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: STAGE_COLOR[s] }}>
                  {STAGE_LABEL[s]}
                </span>
                {s === "won" && (
                  <span className="text-[9px] text-white/35 uppercase tracking-wide">all-time</span>
                )}
              </div>
              <CountUp value={b.count} className="block text-2xl font-bold text-white/90 tabular-nums mt-1.5" />
              <p className="text-[11px] text-white/45 tabular-nums">{fmtMoney(b.value)}</p>
              <div className="mt-2 h-1 rounded-full overflow-hidden bg-white/[0.05]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(b.count / total) * 100}%` }}
                  transition={{ duration: 0.7, ease }}
                  style={{ background: STAGE_COLOR[s], height: "100%" }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── lost breakdown ── */}
      <motion.div {...block(3, !!reduced)} className="px-5 sm:px-6 pb-5">
        <div className="rounded-xl p-3.5" style={SUBPANEL}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: STAGE_COLOR.lost }}>
              Lost · why we're losing
            </span>
            <span className="text-[11px] text-white/40 tabular-nums">{lostTotal} deals</span>
          </div>
          {lostTotal === 0 ? (
            <p className="text-[11px] text-white/35">
              No deals marked lost yet. Use “Mark Lost” on a deal to start tracking loss reasons.
            </p>
          ) : (
            <div className="space-y-1.5">
              {lostBreakdown.map((r) => (
                <div key={r.reason} className="flex items-center gap-2.5">
                  <span className="text-[11px] text-white/60 w-[110px] shrink-0">
                    {LOST_REASON_LABEL[r.reason] || r.reason}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/[0.05]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${r.share * 100}%` }}
                      transition={{ duration: 0.6, ease }}
                      style={{ background: STAGE_COLOR.lost, height: "100%", opacity: 0.75 }}
                    />
                  </div>
                  <span className="text-[11px] text-white/55 tabular-nums w-10 text-right">
                    {fmtPct(r.share)}
                  </span>
                  <span
                    className="text-[10px] tabular-nums w-14 text-right"
                    style={{
                      color:
                        r.deltaPoints > 0.5
                          ? "hsl(0 68% 62%)"
                          : r.deltaPoints < -0.5
                            ? "hsl(152 62% 55%)"
                            : "hsl(0 0% 100% / .3)",
                    }}
                  >
                    {r.deltaPoints > 0.5 ? "▲" : r.deltaPoints < -0.5 ? "▼" : "–"}{" "}
                    {Math.abs(r.deltaPoints) >= 0.5 ? `${Math.abs(r.deltaPoints).toFixed(0)}pt` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── interactive close-rate model ── */}
      <motion.div {...block(4, !!reduced)} className="px-5 sm:px-6 pb-5">
        <div className="rounded-xl p-4" style={SUBPANEL}>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <span className="text-[10px] uppercase tracking-wider text-white/45 font-semibold flex items-center gap-1.5">
              <Layers className="h-3 w-3" /> Stage close rates · drag to model
            </span>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-white/35">Projected</p>
                <motion.p
                  className="text-lg font-bold tabular-nums leading-none"
                  style={{ color: dirty ? "hsl(var(--nl-gold))" : "hsl(var(--nl-sky))" }}
                  animate={{ scale: dirty ? [1, 1.04, 1] : 1 }}
                  transition={{ duration: 0.25 }}
                >
                  {fmtMoney(projected)}
                </motion.p>
              </div>
              {dirty && (
                <button
                  onClick={() => {
                    setRates(baseRates);
                    setDirty(false);
                  }}
                  className="text-[10px] text-white/45 hover:text-white/80 inline-flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3.5">
            {stageRates.map((sr, i) => (
              <div key={`${sr.from}-${sr.to}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] text-white/65 font-medium">
                    {STAGE_LABEL[sr.from]} → {STAGE_LABEL[sr.to]}
                  </span>
                  <div className="flex items-center gap-2">
                    {sr.lowConfidence && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide"
                        style={{ background: "hsla(38,92%,55%,.14)", color: "hsl(38 95% 68%)" }}
                        title={`Only ${sr.sampleSize} observations — treat this rate as indicative.`}
                      >
                        low confidence · n={sr.sampleSize}
                      </span>
                    )}
                    {!sr.lowConfidence && (
                      <span className="text-[9px] text-white/30 tabular-nums">n={sr.sampleSize}</span>
                    )}
                    <span className="text-[11px] tabular-nums font-semibold" style={{ color: STAGE_COLOR[sr.to] }}>
                      {fmtPct(rates[i] ?? sr.rate, 1)}
                    </span>
                  </div>
                </div>
                <Slider
                  className="mt-2 prv-slider"
                  value={[Math.round((rates[i] ?? sr.rate) * 100)]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={([v]) => {
                    setRates((prev) => {
                      const next = [...(prev.length ? prev : baseRates)];
                      next[i] = v / 100;
                      return next;
                    });
                    setDirty(true);
                  }}
                />
                {sr.signal && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-2 flex items-start gap-2 rounded-lg px-2.5 py-1.5 ${sr.signal.kind === "systemic" ? "prv-systemic" : ""}`}
                    style={{
                      background:
                        sr.signal.kind === "systemic" ? "hsla(0,68%,58%,.10)" : "hsla(38,92%,55%,.10)",
                      border: `1px solid ${sr.signal.kind === "systemic" ? "hsla(0,68%,58%,.28)" : "hsla(38,92%,55%,.28)"}`,
                    }}
                  >
                    <AlertTriangle
                      className="h-3 w-3 mt-0.5 shrink-0"
                      style={{ color: sr.signal.kind === "systemic" ? "hsl(0 72% 66%)" : "hsl(38 95% 65%)" }}
                    />
                    <div className="min-w-0">
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: sr.signal.kind === "systemic" ? "hsl(0 72% 70%)" : "hsl(38 95% 68%)" }}
                      >
                        {sr.signal.headline}
                      </span>
                      <p className="text-[11px] text-white/55 leading-snug">
                        {sr.signal.kind === "salesman"
                          ? sr.signal.detail.replace(
                              /\d+ reps? (is|are)/,
                              sr.signal.reps.map((r) => repNames[r] || "A rep").join(", ") + " is",
                            )
                          : sr.signal.detail}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── show-up rate ── */}
      <motion.div {...block(5, !!reduced)} className="px-5 sm:px-6 pb-5 grid gap-2.5 sm:grid-cols-2">
        {model.showUp.map((s) => (
          <div key={s.label} className="rounded-xl p-3.5 flex items-center gap-3.5" style={SUBPANEL}>
            <CalendarCheck className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--nl-cyan))" }} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">{s.label}</p>
              <p className="text-[11px] text-white/50 mt-0.5">
                <span className="text-white/85 font-semibold tabular-nums">{s.booked}</span> booked ·{" "}
                <span className="text-white/85 font-semibold tabular-nums">{s.attended}</span> attended
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wider text-white/35">Show-up</p>
              <p
                className="text-lg font-bold tabular-nums leading-none"
                style={{ color: s.rate >= 0.7 ? "hsl(152 62% 55%)" : s.booked ? "hsl(38 95% 65%)" : "hsl(0 0% 100% / .3)" }}
              >
                {s.booked ? fmtPct(s.rate) : "—"}
              </p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── admin: leaderboard + capacity ── */}
      {variant === "admin" && model.reps.length > 0 && (
        <div className="px-5 sm:px-6 pb-5">
          <div className="rounded-xl p-4" style={SUBPANEL}>
            <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold flex items-center gap-1.5 mb-3">
              <UserRound className="h-3 w-3" /> Salesman close rate & capacity
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-white/35">
                    <th className="pb-2 font-semibold">Rep</th>
                    <th className="pb-2 font-semibold text-right">Close rate</th>
                    <th className="pb-2 font-semibold text-right">Active load</th>
                    <th className="pb-2 font-semibold text-right">Open value</th>
                    <th className="pb-2 font-semibold text-right">Won</th>
                  </tr>
                </thead>
                <tbody>
                  {model.reps.map((r, i) => (
                    <motion.tr
                      key={r.userId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-t border-white/[0.05]"
                    >
                      <td className="py-2 text-white/80">{repNames[r.userId] || `Rep ${r.userId.slice(0, 6)}`}</td>
                      <td className="py-2 text-right tabular-nums font-semibold" style={{ color: "hsl(var(--nl-sky))" }}>
                        {fmtPct(r.closeRate, 1)}
                        {r.lowConfidence && <span className="text-white/30 font-normal"> ·n={r.closeSample}</span>}
                      </td>
                      <td className="py-2 text-right tabular-nums text-white/70">{r.activeDeals}</td>
                      <td className="py-2 text-right tabular-nums text-white/70">{fmtMoney(r.openValue)}</td>
                      <td className="py-2 text-right tabular-nums" style={{ color: STAGE_COLOR.won }}>
                        {fmtMoney(r.wonValue)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-white/30 mt-2.5 flex items-start gap-1.5">
              <Info className="h-3 w-3 mt-px shrink-0" />
              Check active load before reading a low close rate as a skill problem — an overloaded rep
              converts worse for capacity reasons, not ability.
            </p>
          </div>
        </div>
      )}

      {/* ── client: vertical benchmark (hidden unless the peer group is real) ── */}
      {variant === "client" && model.benchmark && (
        <div className="px-5 sm:px-6 pb-5">
          <div className="rounded-xl p-4" style={SUBPANEL}>
            <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-3">
              You vs {vertical} average · {model.benchmarkPeers} comparable accounts
            </p>
            <div className="space-y-2.5">
              {model.benchmark.map((b) => {
                const diff = b.self - b.vertical;
                return (
                  <div key={b.stage} className="flex items-center gap-2.5">
                    <span className="text-[11px] text-white/60 w-14 shrink-0">{STAGE_LABEL[b.stage]}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] relative overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, b.self * 100)}%` }}
                        transition={{ duration: 0.6, ease }}
                        className="h-full"
                        style={{ background: "hsl(var(--nl-sky))" }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-px"
                        style={{ left: `${Math.min(100, b.vertical * 100)}%`, background: "hsla(0,0%,100%,.55)" }}
                        title={`Vertical average ${fmtPct(b.vertical)}`}
                      />
                    </div>
                    <span className="text-[11px] tabular-nums w-10 text-right text-white/70">{fmtPct(b.self)}</span>
                    <span
                      className="text-[10px] tabular-nums w-14 text-right"
                      style={{ color: diff >= 0 ? "hsl(152 62% 55%)" : "hsl(0 68% 62%)" }}
                    >
                      {diff >= 0 ? "+" : ""}
                      {(diff * 100).toFixed(0)}pt
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── win-back candidates ── */}
      {model.winBacks.length > 0 && (
        <div className="px-5 sm:px-6 pb-5">
          <button
            onClick={() => setShowWinBacks((v) => !v)}
            className="w-full rounded-xl px-4 py-3 flex items-center justify-between text-left transition-colors hover:bg-white/[0.03]"
            style={SUBPANEL}
          >
            <span className="text-[11px] text-white/65 font-medium">
              <span className="font-bold" style={{ color: "hsl(var(--nl-gold))" }}>
                {model.winBacks.length}
              </span>{" "}
              win-back candidates ·{" "}
              {fmtMoney(model.winBacks.reduce((s, w) => s + w.value, 0))} lost to price or timing 60+ days ago
            </span>
            <motion.span animate={{ rotate: showWinBacks ? 180 : 0 }} transition={{ duration: 0.25 }}>
              <ChevronDown className="h-4 w-4 text-white/40" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {showWinBacks && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={reduced ? { duration: 0.2 } : { type: "spring", stiffness: 260, damping: 26, mass: 0.7 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {model.winBacks.slice(0, 25).map((w) => (
                    <motion.div
                      key={w.id}
                      whileHover={reduced ? undefined : { y: -2, transition: { type: "spring", stiffness: 400, damping: 24 } }}
                      className="rounded-lg px-3 py-2 flex items-center gap-3 text-[11px] hover:border-white/10"
                      style={SUBPANEL}
                    >
                      <span className="text-white/80 truncate flex-1">{w.name}</span>
                      <span className="text-white/40">{LOST_REASON_LABEL[w.reason] || w.reason}</span>
                      <span className="text-white/35 tabular-nums">{w.daysAgo}d ago</span>
                      <span className="tabular-nums font-semibold" style={{ color: "hsl(var(--nl-gold))" }}>
                        {fmtMoney(w.value)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.section>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  tone: "good" | "warn" | "bad";
}) {
  const color =
    tone === "good" ? "hsl(152 62% 55%)" : tone === "warn" ? "hsl(38 95% 65%)" : "hsl(0 68% 62%)";
  return (
    <div className="rounded-xl px-3.5 py-2.5 min-w-[124px]" style={SUBPANEL}>
      <p className="text-[9px] uppercase tracking-wider text-white/35 font-semibold flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="text-xl font-bold tabular-nums leading-tight mt-0.5" style={{ color }}>
        {value}
      </p>
      <p className="text-[10px] text-white/35">{sub}</p>
    </div>
  );
}

export default PipelineRevenueOpportunity;
