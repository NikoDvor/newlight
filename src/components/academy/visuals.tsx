import { Fragment, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { computeDiscovery, EMPTY_INPUTS } from "@/lib/discoveryNumbers";
import { ACADEMY } from "./ui";

/**
 * Interactive visuals for training chapters, referenced in content as [[visual:key]].
 * Rules of the look: lines and light, no dots or circles. Phone first (vertical), wider on desktop.
 */

const money = (n: number) => "$" + Math.round(n).toLocaleString();
const pct = (n: number) => `${Math.round(n * 100)}%`;

function Frame({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div data-noswipe className="my-5 rounded-2xl border border-[hsla(211,96%,60%,.18)] bg-[hsla(222,45%,6%,.7)] p-4 sm:p-5">
      {children}
      {caption && <p className="mt-3 text-[11px] text-white/45">{caption}</p>}
    </div>
  );
}

/** Animated connector: a line with light flowing through it. Vertical on phones (or always, when `vertical`), horizontal from sm. */
function Connector({ label, dashed = false, vertical = false }: { label?: string; dashed?: boolean; vertical?: boolean }) {
  const h = !vertical; // may go horizontal at sm
  const line = dashed
    ? `border-dashed border-[hsla(0,85%,65%,.6)] border-l ${h ? "sm:border-l-0 sm:border-t" : ""}`
    : "bg-[hsla(197,100%,60%,.35)]";
  return (
    <div className={`relative flex items-center justify-center shrink-0 h-7 ${h ? "sm:h-auto sm:w-10 sm:self-stretch" : ""}`}>
      <div className={`absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px ${h ? "sm:top-1/2 sm:bottom-auto sm:left-0 sm:right-0 sm:translate-x-0 sm:w-auto sm:h-px" : ""} ${line}`} />
      {!dashed && (
        <>
          <motion.div
            className={`${h ? "sm:hidden" : ""} absolute left-1/2 -translate-x-1/2 w-px h-4`}
            style={{ background: "linear-gradient(180deg, transparent, hsl(197,100%,75%), transparent)", boxShadow: "0 0 8px hsl(197,100%,60%)" }}
            animate={{ top: ["-20%", "100%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          {h && (
            <motion.div
              className="hidden sm:block absolute top-1/2 h-px w-4"
              style={{ background: "linear-gradient(90deg, transparent, hsl(197,100%,75%), transparent)", boxShadow: "0 0 8px hsl(197,100%,60%)" }}
              animate={{ left: ["-20%", "100%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </>
      )}
      {label && <span className="relative z-10 rounded bg-[hsl(222,45%,7%)] px-1.5 text-[9px] font-semibold uppercase tracking-wider text-[hsl(197,100%,65%)]">{label}</span>}
    </div>
  );
}

interface FlowStep { title: string; sub?: string; tone?: "blue" | "sdr" | "won" | "muted" }
/** Up to 4 steps go side by side on wider screens; longer flows stay vertical everywhere. */
function FlowSteps({ steps, connectors }: { steps: FlowStep[]; connectors?: (string | undefined)[] }) {
  const vertical = steps.length > 4;
  return (
    <div className={`flex flex-col ${vertical ? "" : "sm:flex-row sm:items-stretch"}`}>
      {steps.map((s, i) => {
        const color = s.tone === "sdr" ? ACADEMY.sdr : s.tone === "won" ? "hsl(152,70%,55%)" : s.tone === "muted" ? "hsla(0,0%,100%,.5)" : ACADEMY.electric;
        return (
          <Fragment key={i}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`flex-1 min-w-0 rounded-xl border border-[hsla(211,96%,60%,.18)] bg-white/[0.03] px-3 py-2.5 ${vertical ? "flex items-center gap-3" : ""}`}
            >
              <div className={`h-[2px] w-6 rounded-full shrink-0 ${vertical ? "" : "mb-2"}`} style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-white leading-tight">{s.title}</div>
                {s.sub && <div className="mt-0.5 text-[11px] leading-snug text-white/55">{s.sub}</div>}
              </div>
            </motion.div>
            {i < steps.length - 1 && <Connector label={connectors?.[i]} vertical={vertical} />}
          </Fragment>
        );
      })}
    </div>
  );
}

// ─── Individual visuals ────────────────────────────────────────────────────

function CertPath() {
  return (
    <Frame>
      <FlowSteps steps={[
        { title: "Chapter quizzes", sub: "Modules 5, 7 and 8" },
        { title: "Final Certification", sub: "Module 10 · pass with 80% · unlimited retakes" },
        { title: "Live test", sub: "With your team leader over Zoom", tone: "sdr" },
        { title: "Selling", sub: "You're cleared", tone: "won" },
      ]} />
    </Frame>
  );
}

function JobFlow() {
  return (
    <Frame>
      <div className="grid grid-cols-2 gap-2 mb-2 text-[10px] font-bold tracking-[0.14em]">
        <div className="rounded-md px-2 py-1 text-center" style={{ color: ACADEMY.electric, background: "hsla(197,100%,55%,.1)" }}>BDR · GET THE MEETING</div>
        <div className="rounded-md px-2 py-1 text-center" style={{ color: ACADEMY.sdr, background: "hsla(262,85%,74%,.1)" }}>SDR · WIN THE CLIENT</div>
      </div>
      <FlowSteps steps={[
        { title: "Pull leads", sub: "From the pool" },
        { title: "Dial", sub: "250 a day" },
        { title: "Book", sub: "Form 1" },
        { title: "Discovery", sub: "Their numbers", tone: "sdr" },
        { title: "Close", sub: "Form 2", tone: "sdr" },
        { title: "Pay & Sign", sub: "Form 3", tone: "won" },
      ]} />
    </Frame>
  );
}

function DailyMix() {
  const [hover, setHover] = useState<"new" | "follow" | null>(null);
  return (
    <Frame caption="250 dials a day = 150 new + 100 follow-ups.">
      <div className="flex items-end justify-between mb-2">
        <div className="text-3xl font-bold tabular-nums text-white">250</div>
        <div className="text-[11px] text-white/50">dials / day</div>
      </div>
      <div className="flex h-10 w-full overflow-hidden rounded-lg">
        <motion.button type="button" onClick={() => setHover("new")}
          className="relative h-full flex items-center justify-start px-3 text-[12px] font-semibold text-white"
          style={{ background: "linear-gradient(90deg, hsl(211,96%,48%), hsl(197,100%,52%))" }}
          initial={{ width: 0 }} whileInView={{ width: "60%" }} viewport={{ once: true }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>
          150 new
        </motion.button>
        <motion.button type="button" onClick={() => setHover("follow")}
          className="relative h-full flex items-center justify-start px-3 text-[12px] font-semibold text-white"
          style={{ background: "linear-gradient(90deg, hsl(262,60%,45%), hsl(262,85%,65%))" }}
          initial={{ width: 0 }} whileInView={{ width: "40%" }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}>
          100 follow-ups
        </motion.button>
      </div>
      <AnimatePresence mode="wait">
        {hover && (
          <motion.p key={hover} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 text-[12px] text-white/70">
            {hover === "new" ? "Fresh firms you pulled from the pool — first-time calls." : "Firms you've already called — callbacks, voicemails, gatekeepers to get past."}
          </motion.p>
        )}
      </AnimatePresence>
    </Frame>
  );
}

function KpiFunnel() {
  const rows = [
    { l: "Dials", w: 100, note: "250 / day" },
    { l: "Conversations", w: 72 },
    { l: "First meetings (Form 1)", w: 50 },
    { l: "Close Preps (Form 2)", w: 32 },
    { l: "Won (Form 3)", w: 20 },
  ];
  return (
    <Frame caption="Each step feeds the next. A drop shows you where to work.">
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.l} className="flex items-center gap-3">
            <div className="flex-1 h-7 rounded-md bg-white/[0.04] overflow-hidden">
              <motion.div className="h-full rounded-md flex items-center px-2 text-[11px] font-semibold text-white whitespace-nowrap"
                style={{ background: i === rows.length - 1 ? "linear-gradient(90deg, hsl(152,60%,35%), hsl(152,70%,48%))" : "linear-gradient(90deg, hsla(211,96%,50%,.9), hsla(197,100%,55%,.75))" }}
                initial={{ width: 0 }} whileInView={{ width: `${r.w}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.1 }}>
                {r.l}
              </motion.div>
            </div>
            <div className="w-14 text-right text-[10px] text-white/45">{r.note || ""}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/** Static picture of the split — no calculator (pay is entered and processed by the admin). */
function CommissionSplit() {
  const rows = [
    { l: "BDR · booked it", p: 15, c: ACADEMY.electric },
    { l: "SDR · closed it", p: 20, c: ACADEMY.sdr },
  ];
  return (
    <Frame caption="Percent of the setup fee only.">
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.l}>
            <div className="flex justify-between text-[12px] mb-1"><span className="text-white/70">{r.l}</span><span className="font-bold text-white tabular-nums">{r.p}%</span></div>
            <div className="h-2.5 rounded-full bg-white/[0.05] overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: r.c, boxShadow: `0 0 10px ${r.c}` }}
                initial={{ width: 0 }} whileInView={{ width: `${(r.p / 20) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.9, delay: i * 0.15 }} />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

const APP_ITEMS = [
  { t: "My Pipeline", d: "Home. Today strip, meetings needing an outcome, your board by stage, Your Forms, dial goal." },
  { t: "My Leads", d: "Every lead you own. Buttons for Numbers, + Meeting, Booked elsewhere, Close Prep." },
  { t: "My Calendar", d: "Your meetings. Open one to set it away from our Zoom or add attendees." },
  { t: "Dialer", d: "Where you call. Tap a row for every decision maker. Mark Dialed when done." },
  { t: "Lead Sourcing", d: "Pull leads from your territories." },
  { t: "My Stats", d: "Your numbers and close rates vs the team average." },
  { t: "Training Center", d: "This. Ten modules, quizzes, your Why and certification." },
  { t: "My Profile", d: "Your details." },
];
function AppMap() {
  const [i, setI] = useState(0);
  return (
    <Frame caption="Tap a screen.">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {APP_ITEMS.map((a, k) => (
          <button key={a.t} type="button" onClick={() => setI(k)}
            className="rounded-lg border px-2.5 py-2 text-left text-[12px] font-semibold transition-all"
            style={{ borderColor: i === k ? ACADEMY.electric : "hsla(211,96%,60%,.15)", color: i === k ? "white" : "hsla(0,0%,100%,.65)", boxShadow: i === k ? "0 0 16px -6px hsl(197,100%,55%)" : undefined }}>
            {a.t}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={i} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="mt-3 text-[13px] text-white/75 border-l-2 pl-3" style={{ borderColor: ACADEMY.electric }}>
          {APP_ITEMS[i].d}
        </motion.p>
      </AnimatePresence>
    </Frame>
  );
}

function LeadFlow() {
  return (
    <Frame caption="Leads you don't book flow back into the pool.">
      <FlowSteps steps={[
        { title: "Sunday load", sub: "Admin uploads fresh firms" },
        { title: "Lead pool", sub: "Every firm, waiting" },
        { title: "Your territories", sub: "Where you can pull" },
        { title: "Pull leads", sub: "Lead Sourcing, up to 300" },
        { title: "Dialer", sub: "Call decision makers" },
        { title: "Mark Dialed", sub: "Done for today" },
        { title: "Rest / recycle", sub: "Back to the pool later", tone: "muted" },
      ]} />
      <div className="relative mt-3 h-6">
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 10" aria-hidden>
          <path d="M98 0 V6 H2 V0" fill="none" stroke="hsla(197,100%,60%,.45)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" className="nl-academy-flow" />
        </svg>
        <span className="absolute left-1/2 -translate-x-1/2 bottom-0 bg-[hsl(222,45%,7%)] px-1.5 text-[9px] uppercase tracking-wider text-white/50">recycle</span>
      </div>
    </Frame>
  );
}

function Recycle() {
  const rows = [
    { l: "Untouched 3+ days", v: 3, out: "Back to pool" },
    { l: "6+ calls, no conversation", v: 60, out: "Rests 60 days" },
    { l: "Not interested / Lost", v: 180, out: "Rests 180 days" },
  ];
  return (
    <Frame caption="Bar length = how long the lead rests before anyone can pull it again.">
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.l}>
            <div className="flex justify-between text-[11px] mb-1"><span className="text-white/70">{r.l}</span><span className="font-semibold text-white">{r.out}</span></div>
            <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, hsl(211,96%,52%), hsl(197,100%,58%))" }}
                initial={{ width: 0 }} whileInView={{ width: `${Math.max(3, (r.v / 180) * 100)}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.15 }} />
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function StageFlow() {
  return (
    <Frame caption="Only a form moves a lead up.">
      <FlowSteps
        steps={[
          { title: "Cold", sub: "Calling", tone: "muted" },
          { title: "Warm", sub: "First meeting booked" },
          { title: "Hot", sub: "Close Prep done", tone: "sdr" },
          { title: "Won", sub: "Paid + signed", tone: "won" },
        ]}
        connectors={["Form 1", "Form 2", "Form 3"]}
      />
    </Frame>
  );
}

const GAME = [
  { e: "A prospect books through your Form 1 link.", a: "Warm" },
  { e: "Great call — they said \"sounds interesting\" but didn't book.", a: "Cold" },
  { e: "You fill Close Prep after a discovery you won.", a: "Hot" },
  { e: "A Warm lead's discovery is rescheduled.", a: "Warm" },
  { e: "You log Lost on a Hot lead's closing meeting.", a: "Cold" },
  { e: "The client pays and signs on Pay & Sign.", a: "Won" },
  { e: "You log a meeting booked elsewhere (by phone).", a: "Warm" },
];
function StageGame() {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const done = i >= GAME.length;
  const q = GAME[Math.min(i, GAME.length - 1)];
  const choose = (s: string) => { if (pick) return; setPick(s); if (s === q.a) setScore((x) => x + 1); };
  return (
    <Frame>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[hsl(197,100%,60%)]">Mini-game · Where does it go?</div>
        <div className="text-[11px] tabular-nums text-white/60">{score}/{GAME.length}</div>
      </div>
      {done ? (
        <div className="text-center py-4">
          <div className="text-2xl font-bold text-white">{score} / {GAME.length}</div>
          <p className="text-[12px] text-white/60 mt-1">{score === GAME.length ? "Perfect. You know the stage rules." : "Remember: only a form moves a lead up."}</p>
          <button type="button" className="mt-3 text-[12px] text-[hsl(197,100%,65%)] underline" onClick={() => { setI(0); setPick(null); setScore(0); }}>Play again</button>
        </div>
      ) : (
        <>
          <p className="text-[14px] text-white min-h-[42px]">{q.e}</p>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {["Cold", "Warm", "Hot", "Won"].map((s) => {
              const right = pick && s === q.a, wrong = pick === s && s !== q.a;
              return (
                <button key={s} type="button" onClick={() => choose(s)}
                  className="rounded-lg border py-2 text-[12px] font-semibold transition-all"
                  style={{ borderColor: right ? "hsl(152,70%,50%)" : wrong ? "hsl(0,85%,60%)" : "hsla(211,96%,60%,.2)", color: right || wrong ? "white" : "hsla(0,0%,100%,.75)", background: right ? "hsla(152,70%,45%,.15)" : wrong ? "hsla(0,85%,55%,.12)" : "transparent" }}>
                  {s}
                </button>
              );
            })}
          </div>
          {pick && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12px] text-white/65">{pick === q.a ? "Right." : `It stays/goes ${q.a}.`}</span>
              <button type="button" onClick={() => { setI(i + 1); setPick(null); }} className="text-[12px] font-semibold text-[hsl(197,100%,65%)]">Next →</button>
            </div>
          )}
        </>
      )}
    </Frame>
  );
}

function Forms() {
  return (
    <Frame>
      <FlowSteps steps={[
        { title: "Form 1 · Discovery", sub: "Booking link → Warm" },
        { title: "Form 2 · Close Prep", sub: "Price + terms → Hot", tone: "sdr" },
        { title: "Form 3 · Pay & Sign", sub: "Paid + signed → Won", tone: "won" },
      ]} connectors={["Meeting 1", "Meeting 2"]} />
    </Frame>
  );
}

function NumInput({ label, value, onChange, prefix }: { label: string; value: number; onChange: (v: number) => void; prefix?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-white/50">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-white/10 bg-white/[0.03] px-2.5 focus-within:border-[hsl(197,100%,55%)]">
        {prefix && <span className="text-white/40 text-[13px]">{prefix}</span>}
        <input inputMode="numeric" value={value ? value.toLocaleString() : ""} onChange={(e) => onChange(Number(e.target.value.replace(/[^0-9.]/g, "")) || 0)}
          className="w-full bg-transparent py-2 pl-1 text-[14px] font-semibold text-white outline-none tabular-nums" />
      </div>
    </label>
  );
}
function DiscoveryCalc() {
  const [goal, setGoal] = useState(2_000_000);
  const [rev, setRev] = useState(1_200_000);
  const [clients, setClients] = useState(120);
  const [leads, setLeads] = useState(60);
  const [lpc, setLpc] = useState(4);
  const r = useMemo(() => computeDiscovery({
    ...EMPTY_INPUTS, goal_revenue: goal, current_revenue: rev, current_clients: clients, new_leads: leads, leads_per_client: lpc,
  }), [goal, rev, clients, leads, lpc]);
  const filled = r.goalRevenue ? Math.min(100, ((r.currentRevenue || 0) / r.goalRevenue) * 100) : 0;
  return (
    <Frame caption="Practice example (yearly numbers). Change any box.">
      <div className="grid grid-cols-2 gap-2">
        <NumInput label="Goal revenue" prefix="$" value={goal} onChange={setGoal} />
        <NumInput label="Current revenue" prefix="$" value={rev} onChange={setRev} />
        <NumInput label="Current clients" value={clients} onChange={setClients} />
        <NumInput label="New leads / year" value={leads} onChange={setLeads} />
        <NumInput label="Leads per client" value={lpc} onChange={setLpc} />
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-[11px] text-white/60 mb-1"><span>Now</span><span>Goal</span></div>
        <div className="relative h-3 rounded-full bg-[hsla(0,85%,60%,.18)] overflow-hidden">
          <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: "linear-gradient(90deg, hsl(211,96%,52%), hsl(197,100%,58%))" }} animate={{ width: `${filled}%` }} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { l: "Avg client value", v: r.avgTicket != null ? money(r.avgTicket) : "—" },
          { l: "Close rate", v: r.closeRate != null ? pct(r.closeRate) : "—" },
          { l: "Gap to goal", v: r.gapRevenue != null ? money(r.gapRevenue) : "—", red: true },
        ].map((t) => (
          <div key={t.l} className="rounded-lg bg-white/[0.04] px-1.5 py-2">
            <div className={`text-[14px] font-bold tabular-nums ${t.red ? "text-[hsl(0,85%,70%)]" : "text-white"}`}>{t.v}</div>
            <div className="text-[9px] uppercase tracking-wider text-white/45 mt-0.5">{t.l}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

const STEPS3 = [
  { n: "01", t: "Optimal online exposure", s: "Get found.", b: ["Organic content", "SEO", "AI visibility", "Social + LinkedIn posting"] },
  { n: "02", t: "Generate appointments", s: "Fill the calendar.", b: ["Seeded posts", "Paid ads", "Boosted content", "Paid traffic → booking"] },
  { n: "03", t: "Optimize conversion", s: "Win the client.", b: ["Client onboarding pipeline", "Every outcome logged", "Leaks found and fixed", "Strategy from the data"] },
];
function ThreeSteps() {
  const [open, setOpen] = useState(0);
  return (
    <Frame caption="Tap a step.">
      <div className="flex flex-col sm:flex-row">
        {STEPS3.map((s, i) => (
          <Fragment key={s.n}>
            <button type="button" onClick={() => setOpen(i)} className="flex-1 min-w-0 rounded-xl border p-3 text-left transition-all"
              style={{ borderColor: open === i ? ACADEMY.electric : "hsla(211,96%,60%,.16)", background: open === i ? "hsla(197,100%,55%,.07)" : "transparent", boxShadow: open === i ? "0 0 24px -10px hsl(197,100%,55%)" : undefined }}>
              <div className="text-[10px] font-semibold tracking-[0.2em] text-[hsl(197,100%,60%)]">STEP {s.n}</div>
              <div className="mt-1 text-[14px] font-bold text-white leading-tight">{s.t}</div>
              <div className="text-[11px] italic text-[hsl(197,100%,65%)]">{s.s}</div>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-2 space-y-1">
                    {s.b.map((x) => <li key={x} className="text-[12px] text-white/75 border-l border-[hsla(197,100%,60%,.5)] pl-2">{x}</li>)}
                  </motion.ul>
                )}
              </AnimatePresence>
            </button>
            {i < 2 && <Connector />}
          </Fragment>
        ))}
      </div>
    </Frame>
  );
}

function LeakFix() {
  const [fixed, setFixed] = useState(false);
  const stages = ["Booked", "Discovery", "Proposal", "Won"];
  return (
    <Frame caption={fixed ? "Leak fixed — more booked meetings reach Won." : "Tap the leak to fix it."}>
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        {stages.map((s, i) => (
          <Fragment key={s}>
            <div className="flex-1 rounded-lg border px-3 py-3 text-center text-[12px] font-bold tracking-wider text-white"
              style={{ borderColor: i === 3 ? "hsl(152,70%,50%)" : "hsla(211,96%,60%,.2)", boxShadow: i === 3 && fixed ? "0 0 22px -6px hsl(152,70%,50%)" : undefined }}>
              {s.toUpperCase()}
            </div>
            {i < 3 && (
              i === 1 ? (
                <button type="button" onClick={() => setFixed(true)} className="relative">
                  <Connector dashed={!fixed} label={fixed ? "FIXED" : "LEAK"} />
                </button>
              ) : <Connector />
            )}
          </Fragment>
        ))}
      </div>
    </Frame>
  );
}

function OfferTimeline() {
  const parts = [
    { l: "Day 1", d: "Setup paid. We start building.", w: 12 },
    { l: "Days 1–90", d: "No commission, no retainer. We make their investment back.", w: 48 },
    { l: "After", d: "Ongoing plan starts (revenue share or $7,000/mo).", w: 40 },
  ];
  const [i, setI] = useState(1);
  return (
    <Frame caption="Tap a part of the timeline.">
      <div className="flex h-10 w-full gap-1">
        {parts.map((p, k) => (
          <motion.button key={p.l} type="button" onClick={() => setI(k)}
            className="h-full rounded-md text-[11px] font-semibold text-white"
            style={{ width: `${p.w}%`, background: k === 0 ? "hsl(211,96%,45%)" : k === 1 ? "linear-gradient(90deg, hsla(197,100%,50%,.35), hsla(197,100%,55%,.65))" : "hsl(152,55%,38%)", outline: i === k ? "1px solid white" : "none" }}
            initial={{ opacity: 0, scaleX: 0.6 }} whileInView={{ opacity: 1, scaleX: 1 }} viewport={{ once: true }} transition={{ delay: k * 0.15 }}>
            {p.l}
          </motion.button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 text-[13px] text-white/80">{parts[i].d}</motion.p>
      </AnimatePresence>
    </Frame>
  );
}

function OfferCompare() {
  const [clients, setClients] = useState(10);
  const [value, setValue] = useState(8000);
  const a = clients * value * 0.25;
  const b = 7000 * 12;
  const max = Math.max(a, b, 1);
  return (
    <Frame caption="Year one after the 90 days, example only. Option A drops to 10% in later years.">
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-[11px] text-white/60 mb-1"><span>New clients we produce (year 1)</span><span className="font-semibold text-white">{clients}</span></div>
          <Slider value={[clients]} min={1} max={60} step={1} onValueChange={(v) => setClients(v[0])} />
        </div>
        <div>
          <div className="flex justify-between text-[11px] text-white/60 mb-1"><span>First-year revenue per client</span><span className="font-semibold text-white">{money(value)}</span></div>
          <Slider value={[value]} min={1000} max={30000} step={500} onValueChange={(v) => setValue(v[0])} />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {[{ l: "A · 25% revenue share", v: a, c: ACADEMY.electric }, { l: "B · $7,000 / month", v: b, c: ACADEMY.sdr }].map((r) => (
          <div key={r.l}>
            <div className="flex justify-between text-[11px] mb-1"><span className="text-white/70">{r.l}</span><span className="font-semibold text-white tabular-nums">{money(r.v)}</span></div>
            <div className="h-2.5 rounded-full bg-white/[0.05] overflow-hidden"><motion.div className="h-full rounded-full" style={{ background: r.c }} animate={{ width: `${(r.v / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

// ─── Objection handling ────────────────────────────────────────────────────

const CORES: { key: string; name: string; ack: string; play: string; hear: string[] }[] = [
  { key: "ni", name: "Not interested", ack: "\"Totally fair — you're not interested. I didn't expect you to be in the first 30 seconds.\"", play: "Ask: timing, cost, or happy with how clients come in now?", hear: ["We're good.", "No thanks.", "We're all set.", "Not looking for anything.", "We don't need marketing.", "I'm busy."] },
  { key: "val", name: "Don't see the value", ack: "\"I hear you — you don't see the value yet.\"", play: "Let them define value. Show the gap from their numbers.", hear: ["What would this even do for us?", "We're doing fine.", "Our clients don't come from online.", "Sounds like every other agency."] },
  { key: "think", name: "Need to think", ack: "\"Of course — you need to think about it.\"", play: "Timing, investment, or something that doesn't feel right? Book the follow-up now.", hear: ["Let me sleep on it.", "Call me next quarter.", "Maybe after tax season.", "Let's revisit in the new year."] },
  { key: "who", name: "Need to talk to someone", ack: "\"That makes sense — you need to run it by them.\"", play: "Get them on the next Zoom. Add them as an attendee.", hear: ["I need to talk to my partner.", "I'm not the decision maker.", "Our managing partner handles that."] },
  { key: "cost", name: "Too expensive", ack: "\"I hear you — it's a real investment.\"", play: "Compare to doing nothing. Lead with the 90-day guarantee.", hear: ["That's a lot of money.", "It's not in the budget.", "Your competitor is cheaper.", "Can you do it for less?"] },
  { key: "trust", name: "Don't trust it'll work", ack: "\"You're not sure we can make this happen — I'm glad you said that.\"", play: "Deliver the offer. Show the system. Never promise numbers.", hear: ["Everyone says that.", "Can you guarantee results?", "Sounds too good to be true.", "I've heard this pitch before."] },
  { key: "cov", name: "Already covered", ack: "\"Got it — you've already got that covered.\"", play: "How's it going? What's it not doing that you wish it were?", hear: ["We already have someone.", "We handle it in-house.", "We tried an agency — didn't work.", "My nephew does our website."] },
  { key: "comp", name: "Compliance", ack: "\"That makes sense — compliance has to sign off.\"", play: "Normal. Find the review process. BD-tied → offer flat monthly.", hear: ["Our compliance would never approve that.", "Our broker-dealer controls our marketing.", "We can't advertise."] },
  { key: "info", name: "Send me info", ack: "\"Happy to — I'll send something over.\"", play: "What should it answer? Book 15 minutes to go over it.", hear: ["Just send me an email.", "We'll reach out if we're interested.", "Do you have a website?"] },
];

function Temperature() {
  const [v, setV] = useState(4);
  const zone = v <= 3 ? { t: "Autopilot. Break the pattern before you handle anything.", c: "hsl(0,85%,62%)" }
    : v <= 6 ? { t: "Real concern. \"What would get you to a 10?\" — handle that one thing.", c: "hsl(42,100%,60%)" }
    : v <= 9 ? { t: "They're close. Stop handling — close.", c: "hsl(197,100%,58%)" }
    : { t: "Close now.", c: "hsl(152,70%,52%)" };
  return (
    <Frame caption="Slide to what the prospect says.">
      <div className="flex items-end justify-between mb-3">
        <div className="text-4xl font-bold tabular-nums" style={{ color: zone.c }}>{v}</div>
        <div className="text-[11px] text-white/45">1 = want you gone · 10 = ready</div>
      </div>
      <div className="relative h-2 rounded-full mb-4" style={{ background: "linear-gradient(90deg, hsl(0,85%,55%), hsl(42,100%,55%), hsl(197,100%,55%), hsl(152,70%,50%))" }} />
      <Slider value={[v]} min={1} max={10} step={1} onValueChange={(x) => setV(x[0])} />
      <motion.p key={zone.t} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-[13px] text-white/85 border-l-2 pl-3" style={{ borderColor: zone.c }}>{zone.t}</motion.p>
    </Frame>
  );
}

function ObjectionFunnel() {
  const all = useMemo(() => CORES.flatMap((c) => c.hear.map((h) => ({ h, c }))), []);
  const [i, setI] = useState(() => Math.floor(Math.random() * all.length));
  const [guess, setGuess] = useState<string | null>(null);
  const cur = all[i];
  const next = () => { setI((i + 1 + Math.floor(Math.random() * (all.length - 1))) % all.length); setGuess(null); };
  return (
    <Frame caption="Tap the core objection under their words.">
      <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/45">They say</div>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
          className="mt-1 text-[18px] font-semibold text-white">"{cur.h}"</motion.div>
      </AnimatePresence>
      {/* the funnel: lines converging into one */}
      <svg viewBox="0 0 300 40" className="my-2 h-8 w-full" preserveAspectRatio="none" aria-hidden>
        {[20, 80, 150, 220, 280].map((x) => <path key={x} d={`M${x} 0 C ${x} 22, 150 18, 150 40`} fill="none" stroke="hsla(197,100%,60%,.4)" strokeWidth="1" vectorEffect="non-scaling-stroke" className="nl-academy-flow" />)}
      </svg>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {CORES.map((c) => {
          const right = guess && c.key === cur.c.key, wrong = guess === c.key && c.key !== cur.c.key;
          return (
            <button key={c.key} type="button" disabled={!!guess} onClick={() => setGuess(c.key)}
              className="rounded-lg border px-2 py-2 text-[11.5px] font-semibold leading-tight transition-all"
              style={{ borderColor: right ? "hsl(152,70%,50%)" : wrong ? "hsl(0,85%,60%)" : "hsla(211,96%,60%,.18)", background: right ? "hsla(152,70%,45%,.14)" : wrong ? "hsla(0,85%,55%,.1)" : "transparent", color: right || wrong ? "white" : "hsla(0,0%,100%,.7)" }}>
              {c.name}
            </button>
          );
        })}
      </div>
      {guess && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-lg border-l-2 border-[hsl(197,100%,58%)] bg-white/[0.03] px-3 py-2">
          <div className="text-[11px] uppercase tracking-wider text-white/45">{guess === cur.c.key ? "Right — say it back:" : `It's "${cur.c.name}" — say it back:`}</div>
          <div className="mt-1 text-[13.5px] italic text-white">{cur.c.ack}</div>
          <div className="mt-1 text-[12px] text-white/60">Then: {cur.c.play}</div>
          <button type="button" onClick={next} className="mt-2 text-[12px] font-semibold text-[hsl(197,100%,65%)]">Next one →</button>
        </motion.div>
      )}
    </Frame>
  );
}

function ObjectionDeck() {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const c = CORES[i];
  const go = (d: number) => { setFlip(false); setI((i + d + CORES.length) % CORES.length); };
  return (
    <Frame caption={`Card ${i + 1} of ${CORES.length}. Tap to flip.`}>
      <button type="button" onClick={() => setFlip(!flip)} className="block w-full [perspective:1000px]">
        <motion.div animate={{ rotateY: flip ? 180 : 0 }} transition={{ duration: 0.5 }} className="relative h-56 w-full [transform-style:preserve-3d]">
          <div className="absolute inset-0 flex flex-col justify-center rounded-xl border border-[hsla(197,100%,55%,.35)] bg-[hsla(211,96%,45%,.08)] p-4 text-left [backface-visibility:hidden]">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[hsl(197,100%,62%)]">Core objection</div>
            <div className="mt-1 text-xl font-bold text-white">{c.name}</div>
            <div className="mt-3 space-y-1">{c.hear.slice(0, 4).map((h) => <div key={h} className="text-[12px] text-white/55 border-l border-white/15 pl-2">"{h}"</div>)}</div>
          </div>
          <div className="absolute inset-0 flex flex-col justify-center rounded-xl border border-[hsla(262,85%,74%,.35)] bg-[hsla(262,85%,74%,.07)] p-4 text-left [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="text-[10px] uppercase tracking-[0.25em] text-[hsl(262,85%,78%)]">Say it back</div>
            <div className="mt-1 text-[14px] italic text-white">{c.ack}</div>
            <div className="mt-3 text-[10px] uppercase tracking-[0.25em] text-[hsl(262,85%,78%)]">Then</div>
            <div className="mt-1 text-[13px] text-white/80">{c.play}</div>
          </div>
        </motion.div>
      </button>
      <div className="mt-3 flex justify-between">
        <button type="button" onClick={() => go(-1)} className="text-[12px] text-white/60">← Prev</button>
        <button type="button" onClick={() => go(1)} className="text-[12px] font-semibold text-[hsl(197,100%,65%)]">Next →</button>
      </div>
    </Frame>
  );
}

export const VISUALS: Record<string, ComponentType> = {
  "cert-path": CertPath,
  "job-flow": JobFlow,
  "daily-mix": DailyMix,
  "kpi-funnel": KpiFunnel,
  "commission-split": CommissionSplit,
  "commission-calc": CommissionSplit,
  "app-map": AppMap,
  "lead-flow": LeadFlow,
  recycle: Recycle,
  "stage-flow": StageFlow,
  "stage-game": StageGame,
  forms: Forms,
  "discovery-calc": DiscoveryCalc,
  "three-steps": ThreeSteps,
  "leak-fix": LeakFix,
  "offer-timeline": OfferTimeline,
  "offer-compare": OfferCompare,
  temperature: Temperature,
  "objection-funnel": ObjectionFunnel,
  "objection-deck": ObjectionDeck,
};

export function Visual({ name }: { name: string }) {
  const V = VISUALS[name];
  return V ? <V /> : null;
}
