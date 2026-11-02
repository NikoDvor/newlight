import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles, Users } from "lucide-react";
import { SlideBody } from "@/components/academy/ContentBlocks";
import type { DiscoveryScript } from "@/lib/discoveryScript";
import type { useDiscoveryNumbers } from "@/hooks/useDiscoveryNumbers";
import { Blank, C, CountUp, Kick, SaveDot, glass, money, numFmt, pct } from "./kit";

type Calc = ReturnType<typeof useDiscoveryNumbers>;
const ease = [0.22, 1, 0.36, 1] as any;

/** Page 1 — the whole script, with blanks only where the calculator needs a number. */
export default function ScriptView({ script, calc, title, onBack, onCalculations }: {
  script: DiscoveryScript; calc: Calc; title: string; onBack: () => void; onCalculations: () => void;
}) {
  const { inputs, set, result } = calc;
  const fill = (v: number | null | undefined) => (v == null ? "(x)" : `**${money(v)}**`);
  const filledBody = (key: string, body: string) => {
    if (key === "1b") return body.replace("(x)", fill(result.avgTicket));
    if (key === "7") {
      const vals = [result.currentRevenue, result.goalRevenue, result.gapRevenue];
      let i = 0;
      return body.replace(/\(x\)/g, () => fill(vals[i++]));
    }
    return body;
  };
  const done: Record<string, boolean> = {
    "1": inputs.goal_revenue != null && inputs.goal_clients != null,
    "1b": inputs.current_revenue != null && inputs.current_clients != null,
    "4": inputs.new_clients_12m != null && inputs.leads_per_client != null,
    "6": inputs.their_number != null,
  };
  const jump = (k: string) => document.getElementById(`step-${k}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="mx-auto w-full max-w-3xl pb-28">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Clients
        </button>
        <SaveDot state={calc.saveState} practice={calc.practice} />
      </div>
      <div className="mt-1">
        <Kick color={C.sky}>Calculator · Meeting 1 — Discovery</Kick>
        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-white/55">Don't share your screen yet. Type each number as they say it.</p>
      </div>

      {/* step rail */}
      <nav aria-label="Script steps" className="sticky top-0 z-20 -mx-4 mt-4 overflow-x-auto bg-[hsla(222,44%,5%,.85)] px-4 py-2.5 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border sm:border-white/[0.06]">
        <div className="flex w-max gap-1.5">
          {script.steps.map((s) => (
            <button key={s.key} onClick={() => jump(s.key)}
              className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3 text-[12px] font-bold tabular-nums transition ${done[s.key] ? "border-[hsla(188,95%,58%,.5)] bg-[hsla(188,95%,58%,.12)] text-[hsl(188,95%,72%)]" : s.key === "5" ? "border-[hsla(197,100%,60%,.6)] bg-[hsla(197,100%,55%,.15)] text-white" : "border-white/10 bg-white/[0.04] text-white/60 hover:text-white"}`}>
              {done[s.key] && <Check className="h-3 w-3" />}{s.key}
            </button>
          ))}
        </div>
      </nav>

      <div className="mt-4 space-y-3">
        {script.steps.map((s, i) => (
          <motion.section key={s.key} id={`step-${s.key}`} className={`${glass} relative scroll-mt-20 overflow-hidden p-4 sm:p-5`}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.45, ease }}>
            <div className="flex items-center gap-3">
              <span className={`grid h-9 min-w-9 place-items-center rounded-xl px-2 text-sm font-black tabular-nums ${done[s.key] ? "bg-[hsla(188,95%,58%,.18)] text-[hsl(188,95%,72%)]" : "bg-[hsla(197,100%,55%,.16)] text-[hsl(197,100%,72%)]"}`}>{s.key}</span>
              {s.title && <h2 className="text-[17px] font-bold text-white">{s.title}</h2>}
            </div>
            {s.body && <div className="mt-2 [&_blockquote]:my-2.5"><SlideBody slide={filledBody(s.key, s.body)} /></div>}

            {s.key === "1" && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Blank id="goal-rev" label="Goal revenue" money value={inputs.goal_revenue} onChange={(v) => set({ goal_revenue: v })}
                  period={inputs.goal_revenue_period} onPeriod={(p) => set({ goal_revenue_period: p })} />
                <Blank id="goal-hh" label="Goal households" value={inputs.goal_clients} onChange={(v) => set({ goal_clients: v })} />
              </div>
            )}
            {s.key === "1b" && (
              <>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Blank id="cur-rev" label="Current revenue" money value={inputs.current_revenue} onChange={(v) => set({ current_revenue: v })}
                    period={inputs.current_revenue_period} onPeriod={(p) => set({ current_revenue_period: p })} />
                  <Blank id="cur-hh" label="Current households" value={inputs.current_clients} onChange={(v) => set({ current_clients: v })} />
                </div>
                <Readout items={[{ k: "Average client", v: result.avgTicket, f: money, sub: "per year" }]} />
              </>
            )}
            {s.key === "4" && (
              <>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Blank id="new-cl" label="New clients · last 12 months" value={inputs.new_clients_12m} onChange={(v) => set({ new_clients_12m: v })} />
                  <Blank id="lpc" label="Leads per client" value={inputs.leads_per_client} onChange={(v) => set({ leads_per_client: v && v > 0 ? v : null })} />
                </div>
                <Readout items={[
                  { k: "New leads", v: result.leadsPerYear, f: (n) => numFmt(n), sub: "per year" },
                  { k: "Close rate", v: result.closeRate, f: (n) => pct(n), sub: inputs.leads_per_client ? `1 in ${numFmt(inputs.leads_per_client, 1)}` : "" },
                ]} />
              </>
            )}
            {s.key === "5" && (
              <button onClick={onCalculations}
                className="group relative mt-4 flex min-h-[64px] w-full items-center justify-center gap-3 overflow-hidden rounded-2xl text-lg font-black uppercase tracking-[0.14em] text-white shadow-[0_0_40px_-8px_hsla(197,100%,60%,.8)] transition active:scale-[.99]"
                style={{ background: "linear-gradient(120deg,hsl(217,90%,52%),hsl(197,100%,50%) 60%,hsl(187,90%,50%))" }}>
                <span className="calc-sheen" aria-hidden />
                <Sparkles className="h-5 w-5" /> Calculations <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
              </button>
            )}
            {s.key === "6" && (
              <div className="mt-3 sm:max-w-sm">
                <Blank id="their-num" label="Their number" money suffix="/yr" value={inputs.their_number} onChange={(v) => set({ their_number: v })} />
              </div>
            )}
            {s.key === "7b" && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-white/45"><Users className="h-3.5 w-3.5" />Add anyone else as an attendee on Form 2.</p>
            )}
          </motion.section>
        ))}
        {script.note && <p className="px-1 text-[12px] leading-relaxed text-white/45">{script.note.replace(/\*\*/g, "")}</p>}
      </div>

      {/* phone: always-reachable Calculations button */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[hsla(222,44%,5%,.92)] p-3 backdrop-blur-md sm:hidden">
        <button onClick={onCalculations} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl text-base font-black uppercase tracking-[0.12em] text-white"
          style={{ background: "linear-gradient(120deg,hsl(217,90%,52%),hsl(197,100%,50%))" }}>
          Calculations <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function Readout({ items }: { items: { k: string; v: number | null; f: (n: number) => string; sub?: string }[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((x) => (
        <div key={x.k} className="rounded-xl border border-[hsla(205,100%,88%,.3)] bg-[hsla(205,100%,88%,.07)] px-3.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[hsl(205,100%,90%)]">{x.k} · auto</p>
          <p className="text-lg font-bold tabular-nums text-white"><CountUp value={x.v} format={x.f} /> <span className="text-[11px] font-normal text-white/45">{x.sub}</span></p>
        </div>
      ))}
    </div>
  );
}
