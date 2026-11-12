import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Training visual: one lead going through My Pipeline, step by step, drawn like the real screen —
 * the number tiles, the "needs an outcome" card, the board (Cold banner + Warm / Hot / Won), Your Forms.
 */

const BLUE = "hsl(197,100%,60%)";
const COL = { warm: "hsl(38,95%,58%)", hot: "hsl(14,92%,60%)", won: "hsl(145,65%,50%)" };
type Stage = "cold" | "warm" | "hot" | "won";
type Area = "cold" | "tiles" | "outcome" | "board" | "f1" | "f2" | "f3";
type Step = {
  t: string; where: string; tap: string; d: string; stage: Stage; hi: Area[];
  tiles: [number, number, number, number, number, number]; // meetings today, outcomes overdue, form1s, form2s, pay&signs waiting, won this month
  outcome?: { kind: string; att?: "Attended" | "No-show"; res?: "Won" | "Another meeting" | "Reschedule" | "Lost"; btn?: string };
  flag?: string;
};
const LEAD = "Harbor Light Family Office";
const HAPPY: Step[] = [
  { t: "Cold — calling", where: "Dialer", tap: "Call → close for the meeting", stage: "cold", hi: ["cold"], tiles: [0, 0, 0, 0, 0, 0],
    d: "Cold leads live in the Dialer, not on the board. The banner shows how many you have to call." },
  { t: "Form 1 — first meeting booked", where: "Your Forms → Form 1", tap: "They book on your link while you're on the phone", stage: "warm", hi: ["f1", "board", "tiles"], tiles: [1, 0, 1, 0, 0, 0],
    d: "The card appears in Warm. Booked another way, or ran discovery on the call? My Leads → Booked elsewhere (→ We're talking now)." },
  { t: "Meeting 1 ends", where: "My Pipeline", tap: "Nothing yet — it's waiting on you", stage: "warm", hi: ["outcome", "tiles"], tiles: [1, 1, 1, 0, 0, 0],
    d: "The moment a meeting ends without an outcome, it shows here and on NewLight's admin screen as overdue." },
  { t: "Log the outcome", where: "Needs an outcome → Log outcome", tap: "Attended → Won → Fill out Form 2", stage: "warm", hi: ["outcome"], tiles: [1, 0, 1, 0, 0, 0],
    outcome: { kind: "Discovery", att: "Attended", res: "Won", btn: "Fill out Form 2" },
    d: "Two questions: did it happen, and how did it go. Won on a discovery takes you straight into Form 2." },
  { t: "Form 2 — Close Prep", where: "Your Forms → Form 2", tap: "Package, terms, book Meeting 2 with them", stage: "hot", hi: ["f2", "board", "tiles"], tiles: [1, 0, 1, 1, 0, 0],
    d: "Book Meeting 2 with them before discovery ends — every decision maker on it. The card moves to Hot." },
  { t: "Meeting 2 — Pay & Sign live", where: "Your Forms → Form 3", tap: "Send the link during the meeting, walk them through it", stage: "hot", hi: ["f3", "tiles"], tiles: [1, 0, 1, 1, 1, 0],
    d: "They review, pay and sign while you stay on. Until it's signed, it counts as a Pay & Sign waiting." },
  { t: "Log the outcome", where: "Needs an outcome → Log outcome", tap: "Attended → Won", stage: "hot", hi: ["outcome"], tiles: [1, 0, 1, 1, 1, 0],
    outcome: { kind: "Closing", att: "Attended", res: "Won", btn: "Won — send Pay & Sign" },
    d: "Log Meeting 2 as soon as you hang up. Pay & Sign was already sent on the call." },
  { t: "Signed — Won", where: "My Pipeline", tap: "Nothing — it moves on its own", stage: "won", hi: ["board", "tiles"], tiles: [1, 0, 1, 1, 0, 1],
    d: "When they pay and sign, the card moves to Won. Your commission is recorded once the payment lands." },
];
const DETOURS: Step[] = [
  { t: "No-show", where: "Log outcome", tap: "No-show", stage: "warm", hi: ["outcome", "board"], tiles: [1, 0, 1, 0, 0, 0], flag: "No-show · 72h",
    outcome: { kind: "Discovery", att: "No-show" }, d: "Send your rebook link or pick a new time. A 72-hour timer starts: a warning at 67 hours, Cold at 72 unless it's rebooked." },
  { t: "Another meeting first", where: "Log outcome", tap: "Attended → Another meeting → pick a time or send your link", stage: "warm", hi: ["outcome", "board"], tiles: [1, 0, 1, 0, 0, 0], flag: "Follow-up #1",
    outcome: { kind: "Discovery", att: "Attended", res: "Another meeting" }, d: "They came but want one more talk first. It's counted as its own extra meeting, not a reschedule, and the stage doesn't change." },
  { t: "Reschedule", where: "Log outcome", tap: "Attended → Reschedule → new time + reason, or send your rebook link", stage: "warm", hi: ["outcome", "board"], tiles: [1, 0, 1, 0, 0, 0], flag: "Rescheduled",
    outcome: { kind: "Discovery", att: "Attended", res: "Reschedule" }, d: "Pick the new time and why. A new Zoom link goes out. The stage doesn't change." },
  { t: "Lost", where: "Log outcome", tap: "Lost → main reason", stage: "cold", hi: ["outcome", "cold"], tiles: [1, 0, 1, 0, 0, 0],
    outcome: { kind: "Closing", att: "Attended", res: "Lost" }, d: "Pick the main reason (required). The lead goes back to Cold." },
  { t: "No Form 2", where: "My Pipeline", tap: "Fill Form 2 after a won discovery", stage: "warm", hi: ["board"], tiles: [1, 0, 1, 0, 0, 0], flag: "Expired — No Form 2",
    d: "Won the discovery but never filled Form 2? The card is marked Expired — No Form 2." },
  { t: "Pay & Sign stalled", where: "My Pipeline", tap: "Lost, or Still waiting", stage: "hot", hi: ["outcome", "tiles"], tiles: [1, 0, 1, 1, 1, 0],
    outcome: { kind: "Pay & Sign stalled" }, d: "Opened but not finished? You get a speed alert after 15 minutes. Not signed after 7 days? The app asks you: Lost or Still waiting." },
];

export function PipelineJourney() {
  const [tab, setTab] = useState<"happy" | "detour">("happy");
  const [i, setI] = useState(0);
  const steps = tab === "happy" ? HAPPY : DETOURS;
  const s = steps[Math.min(i, steps.length - 1)];
  const hi = (a: Area) => s.hi.includes(a);
  return (
    <div data-noswipe className="my-5 rounded-2xl border border-[hsla(211,96%,60%,.18)] bg-[hsla(222,45%,6%,.7)] p-3 sm:p-5">
      <div className="grid-preserve grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {([["happy", "One lead, start to finish"], ["detour", "When it doesn't go to plan"]] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => { setTab(k); setI(0); }} className="min-h-[38px] rounded-lg px-2 text-[12px] font-semibold"
            style={tab === k ? { background: "linear-gradient(120deg,hsl(217,90%,52%),hsl(197,100%,48%))", color: "white" } : { color: "rgba(255,255,255,.6)" }}>{l}</button>
        ))}
      </div>

      {/* step caption */}
      <AnimatePresence mode="wait">
        <motion.div key={tab + i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 rounded-xl border border-[hsla(197,100%,60%,.35)] bg-[hsla(197,100%,55%,.07)] p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[14px] font-bold text-white"><span className="mr-2 tabular-nums" style={{ color: BLUE }}>{i + 1}/{steps.length}</span>{s.t}</p>
            <p className="text-[11px] text-white/55">Where: <span className="text-white/85">{s.where}</span></p>
          </div>
          <p className="mt-1 text-[12px] font-semibold text-[hsl(197,100%,75%)]">Do: {s.tap}</p>
          <p className="mt-1 text-[12px] text-white/75">{s.d}</p>
        </motion.div>
      </AnimatePresence>

      {/* mock screen */}
      <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-[hsl(222,40%,5%)] p-2 sm:p-3">
        <Box on={hi("tiles")}>
          <div className="grid-preserve grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {["Meetings today", "Overdue", "Form 1s", "Form 2s", "Pay & Signs", "Won"].map((l, k) => (
              <div key={l} className="rounded-md border px-2 py-1.5" style={{ borderColor: k === 1 && s.tiles[1] ? "hsla(0,80%,60%,.6)" : "rgba(255,255,255,.08)" }}>
                <p className="truncate text-[8px] font-bold uppercase tracking-wider text-white/45">{l}</p>
                <motion.p key={s.tiles[k]} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className="text-[14px] font-bold tabular-nums text-white">{s.tiles[k]}</motion.p>
              </div>
            ))}
          </div>
        </Box>

        <AnimatePresence>
          {s.outcome && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Box on={hi("outcome")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[hsl(0,85%,70%)]">Needs an outcome</p>
                    <p className="truncate text-[12px] font-semibold text-white">{s.outcome.kind} · {LEAD}</p>
                  </div>
                  <span className="rounded-md bg-[hsla(197,100%,55%,.18)] px-2 py-1 text-[11px] font-semibold text-[hsl(197,100%,75%)]">Log outcome</span>
                </div>
                {s.outcome.att !== undefined || s.outcome.kind === "Pay & Sign stalled" ? (
                  <div className="mt-2 space-y-1.5 border-t border-white/[0.06] pt-2 text-[11px]">
                    {s.outcome.kind === "Pay & Sign stalled" ? (
                      <Chips label="Pay & Sign waiting 7 days" opts={["Lost", "Still waiting"]} pick="" />
                    ) : (
                      <>
                        <Chips label="1. Did the meeting happen?" opts={["Attended", "No-show"]} pick={s.outcome.att} />
                        {s.outcome.att === "Attended" && <Chips label="2. Result" opts={["Won", "Another meeting", "Reschedule", "Lost"]} pick={s.outcome.res} />}
                        {s.outcome.btn && <p className="mt-1 rounded-md py-1.5 text-center text-[11px] font-bold text-white" style={{ background: "linear-gradient(120deg,hsl(217,90%,52%),hsl(197,100%,48%))" }}>{s.outcome.btn}</p>}
                      </>
                    )}
                  </div>
                ) : null}
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        <Box on={hi("cold")}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[hsl(197,100%,70%)]">Cold · to call</p>
              <p className="truncate text-[10px] text-white/45">No Form 1 yet — they live in the Dialer</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold tabular-nums text-white">{s.stage === "cold" ? 41 : 40}</span>
              <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-white/70">Dialer</span>
            </div>
          </div>
        </Box>

        <Box on={hi("board")}>
          <div className="grid-preserve grid grid-cols-3 gap-1.5">
            {(["warm", "hot", "won"] as const).map((c) => (
              <div key={c} className="min-w-0 rounded-md border border-white/[0.07] p-1.5" style={{ borderTop: `2px solid ${COL[c]}` }}>
                <p className="text-[10px] font-bold capitalize" style={{ color: COL[c] }}>{c}</p>
                <p className="truncate text-[8px] text-white/40">{c === "warm" ? "Form 1 booked" : c === "hot" ? "Form 2 done" : "Paid + signed"}</p>
                <div className="mt-1 space-y-1">
                  <AnimatePresence>
                    {s.stage === c && (
                      <motion.div layout key={c + "me"} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        className="rounded border px-1.5 py-1" style={{ borderColor: BLUE, background: "hsla(197,100%,55%,.12)", boxShadow: `0 0 12px -4px ${BLUE}` }}>
                        <p className="truncate text-[9px] font-bold text-white">{LEAD}</p>
                        {s.flag && <p className="truncate text-[8px] font-semibold text-[hsl(0,85%,72%)]">{s.flag}</p>}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {[0, 1].map((n) => <div key={n} className="h-5 rounded border border-white/[0.06] bg-white/[0.02]" />)}
                </div>
              </div>
            ))}
          </div>
        </Box>

        <div className="grid-preserve grid grid-cols-3 gap-1.5">
          {[["f1", "Form 1", "Booking link"], ["f2", "Form 2", "Close Prep"], ["f3", "Form 3", "Pay & Sign"]].map(([k, a, b]) => (
            <Box key={k} on={hi(k as Area)}>
              <p className="text-[10px] font-bold text-white">{a}</p>
              <p className="truncate text-[9px] text-white/50">{b}</p>
            </Box>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button type="button" disabled={i === 0} onClick={() => setI((v) => v - 1)} className="min-h-[40px] rounded-lg border border-white/12 px-3 text-[12px] font-semibold text-white/75 disabled:opacity-30">← Back</button>
        <div className="flex gap-1">{steps.map((_, n) => <span key={n} className="h-1.5 w-1.5 rounded-full" style={{ background: n === i ? BLUE : "rgba(255,255,255,.18)" }} />)}</div>
        <button type="button" disabled={i >= steps.length - 1} onClick={() => setI((v) => v + 1)} className="min-h-[40px] rounded-lg px-3 text-[12px] font-bold text-white disabled:opacity-30"
          style={{ background: "linear-gradient(120deg,hsl(217,90%,52%),hsl(197,100%,48%))" }}>Next →</button>
      </div>
    </div>
  );
}

function Box({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <motion.div animate={{ borderColor: on ? "hsla(197,100%,60%,.85)" : "rgba(255,255,255,.07)", boxShadow: on ? "0 0 18px -6px hsla(197,100%,60%,.9)" : "0 0 0 0 rgba(0,0,0,0)" }}
      className="rounded-lg border bg-white/[0.02] p-2" style={{ opacity: on ? 1 : 0.55 }}>
      {children}
    </motion.div>
  );
}
function Chips({ label, opts, pick }: { label: string; opts: string[]; pick?: string }) {
  return (
    <div>
      <p className="text-[10px] text-white/50">{label}</p>
      <div className="mt-0.5 flex flex-wrap gap-1">
        {opts.map((o) => (
          <span key={o} className="rounded-md border px-2 py-0.5 text-[10px]"
            style={o === pick ? { borderColor: BLUE, background: "hsla(197,100%,55%,.18)", color: "white" } : { borderColor: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.55)" }}>{o}</span>
        ))}
      </div>
    </div>
  );
}
