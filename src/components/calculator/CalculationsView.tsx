import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Gem, Rocket, RotateCcw, Target, TrendingUp, Users, Wallet, X, Zap } from "lucide-react";
import type { useDiscoveryNumbers } from "@/hooks/useDiscoveryNumbers";
import { usePackageDefaults } from "@/components/packages/PlanPreview";
import { buildPlan, defaultPrices } from "@/lib/packages";
import GrowthTree from "./GrowthTree";
import { C, CountUp, GlowSlider, Kick, MiniInput, SaveDot, glass, glassSoft, money, moneyShort, numFmt, pct } from "./kit";

type Calc = ReturnType<typeof useDiscoveryNumbers>;
const ease = [0.22, 1, 0.36, 1] as any;

/** Page 2 — what the prospect sees when you share your screen. No script text here. */
export default function CalculationsView({ calc, title, onBack }: { calc: Calc; title: string; onBack: () => void }) {
  const { result, model: m, setM, resetModel, dirty, proj, inputs, set } = calc;
  const [showValue, setShowValue] = useState(false);
  const goal = result.goalRevenue, cur = result.currentRevenue, gap = result.gapRevenue;
  const progress = goal && cur != null ? Math.min(1, cur / goal) : 0;
  const target = inputs.their_number ?? null;
  const targetMax = Math.max(100000, Math.round(((gap || 0) * 1.5) / 10000) * 10000);

  const moves = [
    { k: "Double the leads", icon: Rocket, run: () => setM({ leads: Math.max(1, Math.round(m.leads * 2)) }) },
    { k: "+5% close rate", icon: Target, run: () => setM({ closeRate: Math.min(1, m.closeRate + 0.05) }) },
    { k: "Avg client +20%", icon: TrendingUp, run: () => setM({ ticket: Math.round(m.ticket * 1.2) }) },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl pb-16">
      {/* top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Script
        </button>
        <SaveDot state={calc.saveState} practice={calc.practice} />
      </div>
      <div className="mt-1">
        <Kick color={C.sky}>Growth map</Kick>
        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
      </div>

      {/* hero */}
      <motion.section className={`${glass} relative mt-4 overflow-hidden p-5 sm:p-7`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
        <span className="calc-sheen" aria-hidden />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl calc-pulse" style={{ background: "radial-gradient(circle, hsla(197,100%,55%,.55), transparent 65%)" }} aria-hidden />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <Kick>The gap to your goal · per year</Kick>
            <CountUp value={gap} format={money}
              className="mt-2 block text-[44px] font-black leading-none tabular-nums sm:text-[64px]"
              style={{ backgroundImage: "linear-gradient(120deg, hsl(205,100%,96%), hsl(197,100%,62%) 55%, hsl(217,90%,62%))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: "drop-shadow(0 4px 24px hsla(197,100%,55%,.45))" }} />
            <p className="mt-2 text-sm text-white/55">
              {result.missing.length ? `Add ${result.missing.join(", ")} on the script page` : <>From <b className="text-white/85">{money(cur)}</b> today to <b className="text-[hsl(42,96%,70%)]">{money(goal)}</b></>}
            </p>
          </div>
          <Ring progress={progress} />
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <Stat icon={Wallet} label="Average client" value={result.avgTicket} f={money} sub="per year" color={C.sky} />
          <Stat icon={Target} label="Close rate" value={result.closeRate} f={(n) => pct(n)} sub={inputs.leads_per_client ? `1 in ${numFmt(inputs.leads_per_client, 1)} leads` : ""} color={C.blue} />
          <Stat icon={Users} label="Today's pace" value={result.newRevenue} f={money} sub={`${numFmt(result.newClients, 1)} new clients / yr`} color={C.green} />
          <Stat icon={Zap} label="Still short" value={result.shortAtPace} f={money} sub="at today's pace" color={C.red} />
        </div>
      </motion.section>

      {/* quick moves */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {moves.map((x) => (
          <button key={x.k} onClick={x.run}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[hsla(197,100%,60%,.35)] bg-[hsla(197,100%,55%,.1)] px-4 text-[13px] font-bold text-white shadow-[0_0_22px_-10px_hsla(197,100%,60%,.9)] transition hover:bg-[hsla(197,100%,55%,.2)] active:scale-[.98]">
            <x.icon className="h-4 w-4 text-[hsl(197,100%,70%)]" />{x.k}
          </button>
        ))}
        <button onClick={resetModel} disabled={!dirty}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 px-4 text-[13px] font-semibold text-white/70 transition hover:text-white disabled:opacity-35">
          <RotateCcw className="h-4 w-4" /> Reset to your numbers
        </button>
      </div>

      {/* tree */}
      <section className={`${glass} mt-4 p-3 sm:p-6`}>
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <Kick color={C.gold}>Growth tree</Kick>
          <span className="text-[11px] text-white/40">Type a number or drag a slider</span>
        </div>
        <GrowthTree calc={calc} />
      </section>

      {/* target (#6) */}
      <section className={`${glass} mt-4 p-5 sm:p-6`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Kick color={C.green}>Your target increase · per year</Kick>
            <CountUp value={target} format={money} className="mt-1 block text-[34px] font-black tabular-nums text-white sm:text-[42px]" />
          </div>
          <MiniInput label="Target increase per year" prefix="$" width="w-36" value={target ?? 0} onChange={(v) => set({ their_number: v })} />
        </div>
        <GlowSlider label="Target increase" value={target ?? 0} min={0} max={targetMax} step={1000} color={C.green} onChange={(v) => set({ their_number: v })} />
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className={`${glassSoft} px-3.5 py-2.5`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">New clients that takes</p>
            <CountUp value={target != null && m.ticket > 0 ? Math.ceil(target / m.ticket) : null} format={(n) => numFmt(Math.ceil(n))} className="text-xl font-bold tabular-nums text-white" />
          </div>
          <div className={`${glassSoft} px-3.5 py-2.5`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">Of the gap</p>
            <CountUp value={target != null && gap ? target / gap : null} format={(n) => pct(n, 0)} className="text-xl font-bold tabular-nums text-white" />
          </div>
        </div>
      </section>

      {/* summary (#7) */}
      <section className={`${glass} mt-4 p-4 sm:p-5`}>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-stretch sm:gap-0">
          {[
            { k: "Today", v: cur, c: "hsl(187,70%,58%)" },
            { k: "Goal", v: goal, c: C.gold },
            { k: "The gap", v: gap, c: C.red },
            { k: "Target", v: target, c: C.green },
          ].map((x, i, a) => (
            <div key={x.k} className="flex items-center sm:flex-1">
              <div className="w-full rounded-xl px-3 py-2.5 text-center" style={{ background: `color-mix(in srgb, ${x.c} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${x.c} 35%, transparent)` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: x.c }}>{x.k}</p>
                <CountUp value={x.v} format={moneyShort} className="text-lg font-black tabular-nums text-white sm:text-xl" />
              </div>
              {i < a.length - 1 && <ArrowRight className="mx-1.5 hidden h-4 w-4 shrink-0 text-white/30 sm:block" aria-hidden />}
            </div>
          ))}
        </div>
      </section>

      {/* hidden value panel */}
      <div className="mt-4 flex justify-end">
        <button onClick={() => setShowValue((v) => !v)} aria-expanded={showValue}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white/35 transition hover:text-white/80">
          {showValue ? <X className="h-3.5 w-3.5" /> : <Gem className="h-3.5 w-3.5" />} Value
        </button>
      </div>
      <AnimatePresence>{showValue && <ValuePanel calc={calc} />}</AnimatePresence>

      <p className="mt-6 text-center text-[11px] text-white/35">An illustration from the numbers you shared, per year. Not a guarantee of results.</p>
    </div>
  );
}

function Ring({ progress }: { progress: number }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-[132px] w-[132px] shrink-0 md:mx-0" role="img" aria-label={`${Math.round(progress * 100)}% of the goal today`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="hsla(0,0%,100%,.08)" strokeWidth="9" />
        <motion.circle cx="60" cy="60" r={r} fill="none" stroke="url(#calc-ring)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - progress) }} transition={{ duration: 1.1, ease }}
          style={{ filter: "drop-shadow(0 0 8px hsla(197,100%,60%,.7))" }} />
        <defs><linearGradient id="calc-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="hsl(187,90%,55%)" /><stop offset="1" stopColor="hsl(42,96%,63%)" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div><CountUp value={progress} format={(n) => `${Math.round(n * 100)}%`} className="text-2xl font-black tabular-nums text-white" /><p className="text-[10px] uppercase tracking-[0.14em] text-white/45">of goal today</p></div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, f, sub, color }: { icon: any; label: string; value: number | null; f: (n: number) => string; sub?: string; color: string }) {
  return (
    <div className="rounded-xl border bg-black/20 px-3.5 py-3" style={{ borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color }}><Icon className="h-3.5 w-3.5" />{label}</p>
      <CountUp value={value} format={f} className="mt-1 block truncate text-xl font-black tabular-nums text-white sm:text-2xl" />
      {sub && <p className="truncate text-[11px] text-white/45">{sub}</p>}
    </div>
  );
}

/** Hidden until tapped: what the target is worth next to the Growth package's first year. */
function ValuePanel({ calc }: { calc: Calc }) {
  const { defs } = usePackageDefaults();
  const { result, inputs, proj } = calc;
  const g = defs.growth;
  const plan = useMemo(() => {
    const d = defaultPrices(g, result.avgTicket ?? 0);
    const p = buildPlan({ pkg: g, setup: d.setup, monthly: d.monthly, cadence: "monthly", paymentPlan: false, ongoing: "retainer", signDate: new Date() } as any);
    return { ...d, firstYear: p.firstYearTotal };
  }, [g, result.avgTicket]);
  const worth = inputs.their_number ?? (proj.missedOpportunity || result.gapRevenue || 0);
  const ratio = plan.firstYear ? worth / plan.firstYear : null;
  return (
    <motion.section initial={{ opacity: 0, y: 12, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: 8, height: 0 }} transition={{ duration: 0.45, ease }}
      className={`${glass} mt-2 overflow-hidden`}>
      <div className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:p-6">
        <div className="text-center sm:text-left">
          <Kick color={C.green}>What it's worth · per year</Kick>
          <CountUp value={worth} format={money} className="block text-3xl font-black tabular-nums text-white" />
          <p className="text-[11px] text-white/45">{inputs.their_number != null ? "your target increase" : "from your numbers"}</p>
        </div>
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[hsla(42,96%,63%,.5)] text-[13px] font-black text-[hsl(42,96%,70%)] shadow-[0_0_30px_-8px_hsla(42,96%,63%,.9)]">
          {ratio != null ? `${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}×` : "—"}
        </div>
        <div className="text-center sm:text-right">
          <Kick color={C.gold}>Growth package · first year</Kick>
          <CountUp value={plan.firstYear ?? null} format={money} className="block text-3xl font-black tabular-nums text-white" />
          <p className="text-[11px] text-white/45">{money(plan.setup)} setup · {money(plan.monthly)}/mo after the 90-day guarantee</p>
        </div>
      </div>
    </motion.section>
  );
}
