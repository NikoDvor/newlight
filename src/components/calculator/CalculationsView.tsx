import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Gem, Rocket, RotateCcw, Send, Target, TrendingUp, Users, Wallet, X, Zap } from "lucide-react";
import type { useDiscoveryNumbers } from "@/hooks/useDiscoveryNumbers";
import { usePackageDefaults } from "@/components/packages/PlanPreview";
import { PACKAGE_ORDER, buildPlan, defaultPrices, type PackageKey } from "@/lib/packages";
import GrowthTree from "./GrowthTree";
import { C, CountUp, Delta, GlowSlider, Kick, MiniInput, SaveDot, glass, glassSoft, money, moneyShort, numFmt, pct } from "./kit";

type Calc = ReturnType<typeof useDiscoveryNumbers>;
const ease = [0.22, 1, 0.36, 1] as any;

/** Page 2 — what the prospect sees when you share your screen. No script text here. */
export default function CalculationsView({ calc, title, onBack }: { calc: Calc; title: string; onBack: () => void }) {
  const { result, model: m, setM, resetModel, dirty, proj, inputs, set, base } = calc;
  const [showValue, setShowValue] = useState(false);
  const [plan, setPlan] = useState<PlanSnap | null>(null);
  const snap = (): PlanSnap => ({
    leads: m.leads, closeRate: m.closeRate, ticket: m.ticket, gap: gap ?? 0, current: cur ?? 0, goal: goal ?? 0,
    clients: proj.modelClients, revenue: proj.modelRevenue, todayRevenue: result.newRevenue ?? 0,
    before: { leads: base.leads, closeRate: base.closeRate, ticket: base.ticket, clients: result.newClients ?? 0 },
  });
  const planStale = !!plan && (Math.round(plan.leads) !== Math.round(m.leads) || Math.abs(plan.closeRate - m.closeRate) > 0.0005 || Math.round(plan.ticket) !== Math.round(m.ticket));
  const submitPlan = () => {
    setPlan(snap());
    setTimeout(() => document.getElementById("calc-plan")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  };
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
        <div className="grid-preserve relative mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
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

      {/* submit plan */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <button onClick={submitPlan}
          className="relative flex min-h-[60px] w-full max-w-md items-center justify-center gap-2.5 overflow-hidden rounded-2xl text-[16px] font-black uppercase tracking-[0.14em] text-white shadow-[0_0_40px_-8px_hsla(152,62%,55%,.85)] transition active:scale-[.99]"
          style={{ background: "linear-gradient(120deg,hsl(160,70%,38%),hsl(152,62%,45%) 55%,hsl(187,80%,45%))" }}>
          <span className="calc-sheen" aria-hidden />
          <Send className="h-5 w-5" /> {plan ? (planStale ? "Update plan" : "Plan submitted") : "Submit plan"}
        </button>
        <p className="text-[11px] text-white/40">Set the leads, close rate and average client that close the gap, then submit.</p>
      </div>

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
        <div className="grid-preserve mt-3 grid grid-cols-2 gap-2.5">
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
        <div className="grid-preserve grid grid-cols-2 gap-2 sm:flex sm:items-stretch sm:gap-0">
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

      <AnimatePresence>{plan && <PlanPanel plan={plan} stale={planStale} onClose={() => setPlan(null)} />}</AnimatePresence>

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

/** Hidden until tapped: what the target is worth next to each package's first year. */
function ValuePanel({ calc }: { calc: Calc }) {
  const { defs } = usePackageDefaults();
  const { result, inputs, proj } = calc;
  const [pkg, setPkg] = useState<PackageKey>("growth");
  const d = defs[pkg];
  const plan = useMemo(() => {
    const pr = defaultPrices(d, result.avgTicket ?? 0);
    const p = buildPlan({ pkg: d, setup: pr.setup, monthly: pr.monthly, cadence: "monthly", paymentPlan: false, ongoing: "retainer", signDate: new Date() } as any);
    return { ...pr, firstYear: p.firstYearTotal };
  }, [d, result.avgTicket]);
  const worth = inputs.their_number ?? (proj.missedOpportunity || result.gapRevenue || 0);
  const ratio = plan.firstYear ? worth / plan.firstYear : null;
  const ratioTxt = ratio == null ? "—" : ratio >= 9.95 ? `${Math.round(ratio)}×` : `${ratio.toFixed(1)}×`;
  const terms = pkg === "growth"
    ? `${money(plan.setup)} setup · ${money(plan.monthly)}/mo after the 90-day guarantee`
    : `${money(plan.setup)} setup · ${money(plan.monthly)}/mo`;
  return (
    <motion.section initial={{ opacity: 0, y: 12, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: 8, height: 0 }} transition={{ duration: 0.45, ease }}
      className={`${glass} mt-2 overflow-hidden`}>
      <div className="flex flex-wrap justify-center gap-1.5 px-4 pt-4" role="tablist" aria-label="Package">
        {PACKAGE_ORDER.map((k) => (
          <button key={k} role="tab" aria-selected={pkg === k} onClick={() => setPkg(k)}
            className={`min-h-[40px] rounded-xl border px-4 text-[13px] font-bold transition ${pkg === k ? "border-[hsla(42,96%,63%,.6)] bg-[hsla(42,96%,63%,.14)] text-white" : "border-white/10 text-white/55 hover:text-white"}`}>
            {defs[k].label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:p-6">
        <div className="text-center sm:text-left">
          <Kick color={C.green}>What it's worth · per year</Kick>
          <CountUp value={worth} format={money} className="block text-3xl font-black tabular-nums text-white" />
          <p className="text-[11px] text-white/45">{inputs.their_number != null ? "your target increase" : "from your numbers"}</p>
        </div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[hsla(42,96%,63%,.5)] text-[15px] font-black text-[hsl(42,96%,70%)] shadow-[0_0_30px_-8px_hsla(42,96%,63%,.9)]">
          {ratioTxt}
        </div>
        <div className="text-center sm:text-right">
          <Kick color={C.gold}>{d.label} · first year</Kick>
          <CountUp value={plan.firstYear ?? null} format={money} className="block text-3xl font-black tabular-nums text-white" />
          <p className="text-[11px] text-white/45">{terms}</p>
        </div>
      </div>
    </motion.section>
  );
}

interface PlanSnap { leads: number; closeRate: number; ticket: number; gap: number; current: number; goal: number; clients: number; revenue: number; todayRevenue: number; before: { leads: number; closeRate: number; ticket: number; clients: number } }

/** Opens at the bottom after "Submit plan": the levers they chose and a 12-month build-up against the gap. */
function PlanPanel({ plan, stale, onClose }: { plan: PlanSnap; stale: boolean; onClose: () => void }) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const monthly = plan.revenue / 12, todayMonthly = plan.todayRevenue / 12;
  const top = Math.max(plan.gap, plan.revenue, plan.todayRevenue, 1) * 1.08;
  const hitMonth = plan.gap > 0 && monthly > 0 ? Math.ceil(plan.gap / monthly) : null;
  const covered = plan.gap > 0 ? Math.min(1, plan.revenue / plan.gap) : 1;
  const pillars = [
    { k: "Leads", v: `${numFmt(plan.leads)} / yr`, s: `${numFmt(plan.leads / 12, 1)} a month`, c: C.green, d: <Delta now={plan.leads} before={plan.before.leads} format={(n) => numFmt(n)} /> },
    { k: "Close rate", v: pct(plan.closeRate), s: plan.closeRate > 0 ? `1 in ${numFmt(1 / plan.closeRate, 1)} leads` : "", c: C.blue, d: <Delta now={plan.closeRate * 100} before={plan.before.closeRate * 100} format={(n) => `${numFmt(n, 1)} pts`} /> },
    { k: "Average client", v: money(plan.ticket), s: "per year", c: C.sky, d: <Delta now={plan.ticket} before={plan.before.ticket} format={money} /> },
    { k: "New clients", v: `${numFmt(plan.clients, 1)} / yr`, s: `${numFmt(plan.clients / 12, 1)} a month`, c: C.gold, d: <Delta now={plan.clients} before={plan.before.clients} format={(n) => numFmt(n, 1)} /> },
  ];
  return (
    <motion.section id="calc-plan" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.55, ease }}
      className={`${glass} relative mt-4 scroll-mt-4 overflow-hidden p-5 sm:p-7`}>
      <span className="calc-sheen" aria-hidden />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <Kick color={C.green}>Your plan to close the gap</Kick>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-white sm:text-2xl">
            <CheckCircle2 className="h-6 w-6 text-[hsl(152,62%,60%)]" />
            {covered >= 1 ? (hitMonth ? `Gap closed in month ${hitMonth}` : "Gap closed") : `${pct(covered, 0)} of the gap in year one`}
          </h2>
          {stale && <p className="mt-1 text-[12px] text-[hsl(42,96%,70%)]">Numbers changed — tap Update plan to refresh.</p>}
        </div>
        <button onClick={onClose} aria-label="Close plan" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white/45 hover:text-white"><X className="h-4 w-4" /></button>
      </div>

      <div className="grid-preserve relative mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {pillars.map((x) => (
          <div key={x.k} className="rounded-xl border bg-black/25 px-3.5 py-3" style={{ borderColor: `color-mix(in srgb, ${x.c} 35%, transparent)` }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: x.c }}>{x.k}</p>
            <p className="mt-0.5 truncate text-lg font-black tabular-nums text-white sm:text-xl">{x.v}</p>
            <p className="truncate text-[11px] text-white/45">{x.s}</p>
            {x.d && <div className="mt-1">{x.d}</div>}
          </div>
        ))}
      </div>

      {/* 12-month build-up */}
      <div className="relative mt-5 rounded-xl border border-white/[0.07] bg-black/25 p-3 sm:p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="font-semibold uppercase tracking-[0.14em] text-white/55">New revenue added · month by month</span>
          <span className="flex items-center gap-3 text-white/50">
            <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm" style={{ background: C.green }} />Plan</span>
            <span className="inline-flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm bg-white/25" />Today's pace</span>
            <span className="inline-flex items-center gap-1"><i className="inline-block h-0.5 w-3" style={{ background: C.gold }} />Gap</span>
          </span>
        </div>
        <div className="relative h-48 sm:h-56" role="img" aria-label={`Plan adds ${money(plan.revenue)} over 12 months against a gap of ${money(plan.gap)}`}>
          {plan.gap > 0 && (
            <div className="absolute inset-x-0 z-10 border-t-2 border-dashed" style={{ bottom: `${(plan.gap / top) * 100}%`, borderColor: C.gold }}>
              <span className="absolute -top-5 right-0 rounded bg-black/60 px-1.5 text-[10px] font-bold tabular-nums" style={{ color: C.gold }}>{moneyShort(plan.gap)}</span>
            </div>
          )}
          <div className="absolute inset-0 flex items-end gap-1 sm:gap-1.5">
            {months.map((mo) => {
              const v = monthly * mo, t = todayMonthly * mo, done = plan.gap > 0 && v >= plan.gap;
              return (
                <div key={mo} className="relative flex h-full flex-1 items-end justify-center">
                  <div className="absolute bottom-0 w-full rounded-t-sm bg-white/[0.12]" style={{ height: `${(t / top) * 100}%` }} />
                  <motion.div className="relative w-[70%] rounded-t-md" initial={{ height: 0 }} animate={{ height: `${(v / top) * 100}%` }}
                    transition={{ delay: 0.1 + mo * 0.05, duration: 0.6, ease }}
                    style={{ background: done ? `linear-gradient(180deg, ${C.green}, hsl(160,70%,32%))` : `linear-gradient(180deg, ${C.sky}, hsl(217,90%,40%))`, boxShadow: done ? `0 0 14px -2px ${C.green}` : `0 0 12px -4px ${C.sky}` }} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-1.5 flex gap-1 sm:gap-1.5">
          {months.map((mo) => <span key={mo} className="flex-1 text-center text-[9.5px] tabular-nums text-white/40 sm:text-[10.5px]">{mo}</span>)}
        </div>
      </div>

      <div className="grid-preserve relative mt-4 grid grid-cols-3 gap-2 text-center">
        {[
          { k: "Added in year one", v: money(plan.revenue), c: C.green },
          { k: "Today's pace", v: money(plan.todayRevenue), c: "rgba(255,255,255,.6)" },
          { k: "New total", v: money(plan.current + plan.revenue), c: C.gold },
        ].map((x) => (
          <div key={x.k} className="rounded-xl bg-white/[0.04] px-2 py-2.5">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] sm:text-[10px]" style={{ color: x.c }}>{x.k}</p>
            <p className="truncate text-[15px] font-black tabular-nums text-white sm:text-lg">{x.v}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
