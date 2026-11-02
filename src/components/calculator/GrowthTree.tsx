import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { useDiscoveryNumbers } from "@/hooks/useDiscoveryNumbers";
import { C, CountUp, GlowSlider, MiniInput, money, moneyShort, numFmt, pct } from "./kit";

type Calc = ReturnType<typeof useDiscoveryNumbers>;
const ease = [0.22, 1, 0.36, 1] as any;

/**
 * Growth Tree: Goal → Current + Gap → (Clients needed × Avg client) and (What your pace delivers)
 * → Leads needed ÷ Close rate, and how much of the gap is covered. Every lever is a box + slider.
 */
export default function GrowthTree({ calc }: { calc: Calc }) {
  const { result, model: m, setM, set, proj } = calc;
  const gap = result.gapRevenue;
  const ticketMax = Math.max(20000, Math.round((calc.base.ticket || 5000) * 3));
  const leadsMax = Math.max(50, Math.round((calc.base.leads || 20) * 4));
  const covered = proj.gapClosedShare ?? 0;
  const lift = proj.missedOpportunity;

  return (
    <div className="relative">
      <div className="calc-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative">
        {/* Row 0 — goal */}
        <div className="flex justify-center">
          <Node i={0} color={C.gold} label="Revenue goal" value={result.goalRevenue} format={money} sub="per year" className="w-full max-w-[340px]">
            <Edit label="Goal revenue per year" value={result.goalRevenue ?? 0} prefix="$" onChange={(v) => set({ goal_revenue: v, goal_revenue_period: "year" })} />
          </Node>
        </div>
        <Branch from={[50]} to={[25, 75]} colors={["hsl(187,70%,58%)", C.red]} />

        {/* Row 1 — current + gap */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <Node i={1} color="hsl(187,70%,58%)" label="Where you are" value={result.currentRevenue} format={money} sub={`${numFmt(result.currentClients)} households`}>
            <Edit label="Current revenue per year" value={result.currentRevenue ?? 0} prefix="$" onChange={(v) => set({ current_revenue: v, current_revenue_period: "year" })} />
          </Node>
          <Node i={2} color={C.red} label="The gap" value={gap} format={money} sub={`${numFmt(result.gapClients)} households to go`} glow />
        </div>
        <Branch from={[75]} to={[25, 75]} colors={[C.sky, C.green]} />

        {/* Row 2 — what it takes / what pace delivers */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <Node i={3} color={C.sky} label="Clients needed" value={proj.clientsNeeded} format={(n) => numFmt(Math.ceil(n))} sub={`gap ÷ ${moneyShort(m.ticket)} avg client`}>
            <Lever label="Avg client value" display={money(m.ticket)} value={m.ticket} min={0} max={ticketMax} step={250} color={C.sky}
              onChange={(v) => setM({ ticket: v })} input={<MiniInput label="Average client value" prefix="$" value={m.ticket} onChange={(v) => setM({ ticket: v })} />} />
          </Node>
          <Node i={4} color={C.green} label="Your pace delivers" value={proj.modelRevenue} format={money} sub={`${numFmt(proj.modelClients, 1)} new clients / yr`}>
            <Lever label="Leads per year" display={numFmt(m.leads)} value={m.leads} min={0} max={leadsMax} step={1} color={C.green}
              onChange={(v) => setM({ leads: v })} input={<MiniInput label="Leads per year" value={m.leads} width="w-20" onChange={(v) => setM({ leads: v })} />} />
          </Node>
        </div>
        <Branch from={[25, 75]} to={[25, 75]} colors={[C.blue, C.gold]} />

        {/* Row 3 — leads needed / coverage */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
          <Node i={5} color={C.blue} label="Leads needed" value={proj.leadsNeeded} format={(n) => numFmt(Math.ceil(n))} sub={`at a ${pct(m.closeRate)} close rate`}>
            <Lever label="Close rate" display={`${pct(m.closeRate)}${m.closeRate > 0 ? ` · 1 in ${numFmt(1 / m.closeRate, 1)}` : ""}`}
              value={Math.round(m.closeRate * 1000) / 10} min={0} max={100} step={0.5} color={C.blue}
              onChange={(v) => setM({ closeRate: v / 100 })}
              input={<MiniInput label="Close rate percent" value={Math.round(m.closeRate * 1000) / 10} width="w-20" onChange={(v) => setM({ closeRate: Math.min(1, Math.max(0, v / 100)) })} />} />
          </Node>
          <Node i={6} color={covered >= 1 ? C.green : C.gold} label="Gap covered" value={gap ? covered : null} format={(n) => pct(Math.min(1, n), 0)}
            sub={covered >= 1 ? "goal reached" : `${moneyShort(proj.gapRemaining)} still to go`}>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(1, covered) * 100}%` }} transition={{ duration: 0.6, ease }}
                style={{ background: covered >= 1 ? C.green : `linear-gradient(90deg, ${C.gold}, ${C.green})`, boxShadow: `0 0 16px ${covered >= 1 ? C.green : C.gold}` }} />
            </div>
            {lift > 0 && <p className="mt-2 text-[12px] font-semibold text-[hsl(152,62%,65%)]">+{money(lift)} / yr vs. today</p>}
          </Node>
        </div>
      </div>
    </div>
  );
}

function Node({ label, value, format, sub, color, children, glow, className = "", i }: {
  label: string; value: number | null; format: (n: number) => string; sub?: string; color: string; children?: ReactNode; glow?: boolean; className?: string; i: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.1 + i * 0.07, duration: 0.5, ease }}
      className={`relative min-w-0 overflow-hidden rounded-2xl border bg-[hsla(222,44%,7%,.88)] p-3 sm:p-4 ${className}`}
      style={{ borderColor: `color-mix(in srgb, ${color} 45%, transparent)`, boxShadow: `0 0 0 1px color-mix(in srgb, ${color} 10%, transparent), 0 18px 40px -26px ${color}${glow ? `, 0 0 46px -14px ${color}` : ""}` }}>
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} aria-hidden />
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] sm:text-[11px]" style={{ color }}>{label}</p>
      <CountUp value={value} format={format} className="mt-1 block truncate text-[22px] font-black tabular-nums leading-tight text-white sm:text-[30px]" />
      {sub && <p className="truncate text-[11px] text-white/50 sm:text-[12px]">{sub}</p>}
      {children}
    </motion.div>
  );
}

function Edit({ label, value, onChange, prefix }: { label: string; value: number; onChange: (v: number) => void; prefix?: string }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <span className="text-[10.5px] text-white/40">Edit</span>
      <MiniInput label={label} prefix={prefix} value={value} width="w-28" onChange={onChange} />
    </div>
  );
}

function Lever({ label, display, value, min, max, step, onChange, input, color }: {
  label: string; display: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; input: ReactNode; color: string;
}) {
  return (
    <div className="mt-2.5">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="text-[11px] font-medium text-white/65">{label}</span>
        {input}
      </div>
      <GlowSlider label={label} value={value} min={min} max={max} step={step} color={color} onChange={onChange} />
      <p className="text-right text-[10.5px] tabular-nums text-white/45">{display}</p>
    </div>
  );
}

/** Glowing animated connectors between tree rows (x positions in % of the width). */
function Branch({ from, to, colors }: { from: number[]; to: number[]; colors: string[] }) {
  const paths: { d: string; c: string }[] = [];
  if (from.length === 1) to.forEach((x, k) => paths.push({ d: `M ${from[0]} 0 C ${from[0]} 22, ${x} 18, ${x} 40`, c: colors[k] || C.sky }));
  else from.forEach((x, k) => paths.push({ d: `M ${x} 0 L ${to[k]} 40`, c: colors[k] || C.sky }));
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="block h-9 w-full sm:h-11" aria-hidden>
      {paths.map((p, k) => (
        <g key={k}>
          <path d={p.d} fill="none" stroke={p.c} strokeOpacity={0.18} strokeWidth={3} vectorEffect="non-scaling-stroke" />
          <path d={p.d} fill="none" stroke={p.c} strokeWidth={2} vectorEffect="non-scaling-stroke" className="calc-flow" style={{ filter: `drop-shadow(0 0 4px ${p.c})` }} />
        </g>
      ))}
    </svg>
  );
}
