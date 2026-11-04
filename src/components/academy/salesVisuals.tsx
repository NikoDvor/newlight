import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** Training visuals for the sales system (Module 6) and the Feature → Benefit → Trial close (Module 8). */

const BLUE = "hsl(197,100%,60%)";

function Frame({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div data-noswipe className="my-5 rounded-2xl border border-[hsla(211,96%,60%,.18)] bg-[hsla(222,45%,6%,.7)] p-4 sm:p-5">
      {children}
      {caption && <p className="mt-3 text-[11px] text-white/45">{caption}</p>}
    </div>
  );
}

/* ---------------- The sales system, start to finish ---------------- */
type Step = { k: string; t: string; who: string; stage: string; form?: string; close: string; d: string; branch?: string };
const STEPS: Step[] = [
  { k: "1", t: "The call", who: "BDR", stage: "Cold", close: "Option + assignment close", d: "Dial the owner. Get to the 15-minute meeting. Close for the time and send your booking link while you're still on the phone." ,
    branch: "They say \"I have time now\"? Don't book it — run the discovery right then, wherever you are (phone, in person or Zoom). Afterwards log it with Booked elsewhere → We're talking now, then log the outcome." },
  { k: "2", t: "Meeting 1 — Discovery", who: "SDR, or the BDR if it happened on the call", stage: "Warm", form: "Form 1", close: "Pre-close, then assignment close", d: "Their goal, where they are, the gap — in the Calculator. Confirm the decision maker." },
  { k: "3", t: "Book the closing meeting", who: "Whoever ran discovery", stage: "Hot", form: "Form 2", close: "Assignment close", d: "Before you leave the meeting: fill Form 2 (package and terms) and book Meeting 2 with every decision maker on it." },
  { k: "4", t: "Meeting 2 — Closing", who: "SDR", stage: "Hot", close: "Feature → Benefit → Trial, then option close", d: "Recap their numbers, show the package, show exactly what they pay and when, handle the objection, ask." },
  { k: "5", t: "Pay & Sign — live", who: "SDR", stage: "Won", form: "Form 3", close: "Assumptive close", d: "Send the Pay & Sign link during the meeting and stay on while they finish. Then book the kickoff before you hang up." },
];

export function SalesSystem() {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  return (
    <Frame caption="Tap a step. Every step ends with a close — the close is always for the next step, never the whole deal at once.">
      <div className="grid-preserve grid grid-cols-5 gap-1.5">
        {STEPS.map((x, n) => (
          <button key={x.k} type="button" onClick={() => setI(n)}
            className="relative rounded-xl border px-1.5 py-2 text-center transition"
            style={n === i ? { borderColor: BLUE, background: "hsla(197,100%,55%,.14)", boxShadow: `0 0 16px -6px ${BLUE}` } : { borderColor: "rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)" }}>
            <span className="block text-[15px] font-black tabular-nums" style={{ color: n <= i ? BLUE : "rgba(255,255,255,.5)" }}>{x.k}</span>
            <span className="mt-0.5 block text-[10px] font-semibold leading-tight text-white/75">{x.t.replace("Meeting 1 — ", "").replace("Meeting 2 — ", "")}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, hsl(214,90%,55%), ${BLUE})` }} animate={{ width: `${((i + 1) / STEPS.length) * 100}%` }} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mt-4">
          <p className="text-[15px] font-bold text-white">{s.t}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            <Tag>{s.who}</Tag>
            <Tag>Lead → {s.stage}</Tag>
            {s.form && <Tag>{s.form}</Tag>}
            <Tag strong>Close: {s.close}</Tag>
          </div>
          <p className="mt-3 text-[13px] text-white/80">{s.d}</p>
          {s.branch && (
            <div className="mt-3 rounded-xl border border-[hsla(205,100%,88%,.35)] bg-[hsla(205,100%,88%,.07)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(205,100%,88%)]">Branch</p>
              <p className="mt-1 text-[13px] text-white/85">{s.branch}</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Frame>
  );
}
function Tag({ children, strong }: { children: ReactNode; strong?: boolean }) {
  return <span className={`rounded-md border px-2 py-0.5 ${strong ? "border-[hsla(197,100%,60%,.5)] bg-[hsla(197,100%,55%,.12)] text-[hsl(197,100%,78%)]" : "border-white/10 bg-white/[0.04] text-white/70"}`}>{children}</span>;
}

/* ---------------- Feature → Benefit → Trial ---------------- */
const FBT: Record<string, { f: string; b: string; t: string }[]> = {
  Growth: [
    { f: "We run paid ads aimed at the exact clients you told me you want.", b: "So instead of waiting on referrals, people who need you are booking onto your calendar every week.", t: "Can you see how that would help you get to [their goal]?" },
    { f: "Every lead gets confirmations, reminders and follow-up automatically.", b: "So far fewer of those meetings no-show — you're not chasing anyone.", t: "Would that make a difference for you?" },
  ],
  "Command Center": [
    { f: "Your whole client pipeline — every meeting, every outcome — in one app.", b: "So you see exactly where deals stall, instead of guessing why some meetings don't close.", t: "Does that make sense for how you run things?" },
    { f: "Objections and leaks get flagged at each stage.", b: "So you fix the one step that's costing you clients — and close more of the meetings you already get.", t: "Can you see that moving your close rate?" },
  ],
  Enterprise: [
    { f: "We own your metro market — we won't work with your competitors there.", b: "So the attention we build in your city goes to you, and only you.", t: "How important is that to you?" },
    { f: "A dedicated strategist runs all three steps with you.", b: "So you have one person accountable for the whole system, not three vendors.", t: "Would that take something off your plate?" },
  ],
};
export function FeatureBenefitTrial() {
  const pk = Object.keys(FBT);
  const [p, setP] = useState(pk[0]);
  const [n, setN] = useState(0);
  const ex = FBT[p][n % FBT[p].length];
  const parts = [
    { l: "Feature", s: "What it is", v: ex.f },
    { l: "Benefit", s: "What it does for them", v: ex.b },
    { l: "Trial close", s: "Check they want it", v: ex.t },
  ];
  return (
    <Frame caption="Then stop talking. A yes means move on to the next feature or the ask. A no or a maybe tells you exactly what to work on.">
      <div className="grid-preserve grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {pk.map((k) => (
          <button key={k} type="button" onClick={() => { setP(k); setN(0); }}
            className="min-h-[38px] rounded-lg px-2 text-[12px] font-semibold transition"
            style={p === k ? { background: "linear-gradient(120deg,hsl(217,90%,52%),hsl(197,100%,48%))", color: "white" } : { color: "rgba(255,255,255,.6)" }}>{k}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={p + n} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 space-y-2">
          {parts.map((x, k) => (
            <motion.div key={x.l} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.12 }}
              className="flex gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[12px] font-black" style={{ background: "hsla(197,100%,55%,.15)", color: BLUE }}>{k + 1}</span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-white/45">{x.l} · {x.s}</span>
                <span className="mt-0.5 block text-[13px] text-white">"{x.v}"</span>
              </span>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
      <button type="button" onClick={() => setN((v) => v + 1)} className="mt-3 text-[12px] font-semibold text-[hsl(197,100%,70%)]">Another example →</button>
    </Frame>
  );
}
