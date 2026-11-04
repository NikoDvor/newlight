import { useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import {
  DEFAULT_PACKAGES, PACKAGE_ORDER, buildPlan, defaultPrices, parseYmd, pacificDate, ymd,
  type Cadence, type Ongoing, type PackageKey,
} from "@/lib/packages";

/**
 * Training visuals for Module 4 (Our Offer): the three packages, the Growth-only guarantee,
 * Growth's two ongoing options, who pays how, and a payment simulator.
 * Numbers come from src/lib/packages.ts — the same engine Close Prep, Pay & Sign and billing use.
 */

const money = (n: number | null | undefined) => (n == null ? "—" : "$" + Math.round(n).toLocaleString("en-US"));
const BLUE = "hsl(197,100%,60%)";
const ICE = "hsl(205,100%,88%)";

function Frame({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div data-noswipe className="my-5 rounded-2xl border border-[hsla(211,96%,60%,.18)] bg-[hsla(222,45%,6%,.7)] p-4 sm:p-5">
      {children}
      {caption && <p className="mt-3 text-[11px] text-white/45">{caption}</p>}
    </div>
  );
}

function Tabs<T extends string>({ items, value, onChange }: { items: { k: T; l: string }[]; value: T; onChange: (k: NoInfer<T>) => void }) {
  return (
    <div className="grid gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 grid-preserve" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
      {items.map((it) => (
        <button key={it.k} type="button" onClick={() => onChange(it.k)}
          className="min-h-[40px] rounded-lg px-2 text-[12px] font-semibold transition"
          style={value === it.k ? { background: "linear-gradient(120deg,hsl(217,90%,52%),hsl(197,100%,48%))", color: "white", boxShadow: "0 0 18px -6px hsla(197,100%,60%,.9)" } : { color: "rgba(255,255,255,.6)" }}>
          {it.l}
        </button>
      ))}
    </div>
  );
}

function Chip({ method }: { method: "wire" | "stripe" }) {
  return method === "wire"
    ? <span className="rounded-md border border-[hsla(205,100%,88%,.45)] bg-[hsla(205,100%,88%,.12)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(205,100%,90%)]">Wire</span>
    : <span className="rounded-md border border-[hsla(197,100%,60%,.45)] bg-[hsla(197,100%,55%,.12)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[hsl(197,100%,72%)]">Stripe</span>;
}

const PKG_TABS: { k: PackageKey; l: string }[] = PACKAGE_ORDER.map((k) => ({ k, l: DEFAULT_PACKAGES[k].label }));

function AvgSlider({ avg, setAvg }: { avg: number; setAvg: (n: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-white/60"><span>Their average client value (per year)</span><span className="font-semibold text-white tabular-nums">{money(avg)}</span></div>
      <Slider value={[avg]} min={2000} max={40000} step={500} onValueChange={(v) => setAvg(v[0])} />
      {avg < DEFAULT_PACKAGES.growth.min_avg_client && <p className="mt-1 text-[11px] text-[hsl(205,100%,85%)]">Below {money(DEFAULT_PACKAGES.growth.min_avg_client)} — Growth prices use {money(DEFAULT_PACKAGES.growth.min_avg_client)} as the floor.</p>}
    </div>
  );
}

/* ---------------- 1. The three packages ---------------- */
const PKG_INFO: Record<PackageKey, { who: string; get: string[]; guarantee: string; ongoing: string }> = {
  growth: {
    who: "Firms that want more booked meetings and want to pay on results.",
    get: ["Step 2 — paid traffic, ads and landing pages", "Booked meetings on their calendar", "A simple pipeline to track the clients we bring"],
    guarantee: "Yes — 90 days",
    ongoing: "½ an average client a month, or commission (25% year one, 10% after)",
  },
  command_center: {
    who: "Firms that already get meetings but lose too many of them.",
    get: ["Step 3 — their own Command Center app", "Client onboarding pipeline, every stage", "Leaks and objections flagged, strategy adjusted"],
    guarantee: "No",
    ongoing: "Monthly retainer",
  },
  enterprise: {
    who: "Firms that want the whole system and to own their market.",
    get: ["Steps 1 + 2 + 3 — everything", "Exclusive metro market — we won't work with their competitors there", "A dedicated strategist"],
    guarantee: "No",
    ongoing: "Monthly retainer",
  },
};

export function Packages() {
  const [k, setK] = useState<PackageKey>("growth");
  const [avg, setAvg] = useState(10000);
  const d = DEFAULT_PACKAGES[k];
  const p = defaultPrices(d, avg);
  const info = PKG_INFO[k];
  return (
    <Frame caption="Default prices. Every number is negotiable — type the real one into Form 2.">
      <Tabs items={PKG_TABS} value={k} onChange={setK} />
      <AnimatePresence mode="wait">
        <motion.div key={k} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="mt-4">
          <p className="text-[13px] text-white/75">{info.who}</p>
          <ul className="mt-3 space-y-1.5">
            {info.get.map((g) => <li key={g} className="flex gap-2 text-[13px] text-white"><span className="mt-[7px] h-px w-3 shrink-0" style={{ background: BLUE, boxShadow: `0 0 6px ${BLUE}` }} />{g}</li>)}
          </ul>
          {k === "growth" && <div className="mt-4"><AvgSlider avg={avg} setAvg={setAvg} /></div>}
          <div className="mt-4 grid grid-cols-2 gap-2 grid-preserve">
            <Stat l="Setup" v={money(p.setup)} sub={k === "growth" ? "= 1 average client" : "one time"} />
            <Stat l={k === "growth" ? "Monthly (after 90 days)" : "Monthly"} v={money(p.monthly)} sub={k === "growth" ? "= ½ average client" : "from day one"} />
            <Stat l="90-day guarantee" v={info.guarantee} />
            <Stat l="Ongoing" v={k === "growth" ? "Retainer or commission" : "Retainer only"} sub={info.ongoing} />
          </div>
          {d.min_ad_budget && <p className="mt-3 text-[12px] text-white/55">Plus at least {money(d.min_ad_budget)}/month ad budget, paid by the client straight to the ad platforms.</p>}
        </motion.div>
      </AnimatePresence>
    </Frame>
  );
}

function Stat({ l, v, sub }: { l: string; v: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/45">{l}</div>
      <div className="mt-1 text-[16px] font-bold text-white tabular-nums">{v}</div>
      {sub && <div className="mt-0.5 text-[11px] text-white/50">{sub}</div>}
    </div>
  );
}

/* ---------------- 2. Growth guarantee timeline ---------------- */
export function OfferTimeline() {
  const parts = [
    { l: "Day 1", d: "Setup paid. The guarantee clock starts. We start building.", w: 14 },
    { l: "Days 1–90", d: "No monthly fee and no commission. Our job: make their setup back.", w: 46 },
    { l: "Made it back", d: "Once day 90 has passed AND their setup is made back, the ongoing plan starts on the next 1st. Not made back by day 90? We keep working at no charge until it is.", w: 40 },
  ];
  const [i, setI] = useState(1);
  return (
    <Frame caption="Growth only. Command Center and Enterprise bill monthly from day one.">
      <div className="flex h-10 w-full gap-1">
        {parts.map((p, k) => (
          <motion.button key={p.l} type="button" onClick={() => setI(k)}
            className="h-full rounded-md px-1 text-[11px] font-semibold text-white"
            style={{ width: `${p.w}%`, background: k === 0 ? "hsl(214,90%,45%)" : k === 1 ? "linear-gradient(90deg, hsla(197,100%,50%,.35), hsla(197,100%,55%,.65))" : "hsl(190,85%,38%)", outline: i === k ? "1px solid white" : "none" }}
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

/* ---------------- 3. Growth: retainer vs commission ---------------- */
export function OfferCompare() {
  const [avg, setAvg] = useState(10000);
  const [clients, setClients] = useState(12);
  const a = Math.max(avg, DEFAULT_PACKAGES.growth.min_avg_client);
  const retainer = a * 0.5 * 12;
  const commission = clients * avg * 0.25;
  const max = Math.max(retainer, commission, 1);
  const even = 24; // ½ avg × 12 = 6 avg  =  0.25 avg × clients  →  24 clients
  return (
    <Frame caption={`Growth, one year after the guarantee. Example only. Commission drops to 10% after year one. The two cost the same at about ${even} new clients a year.`}>
      <div className="space-y-3">
        <AvgSlider avg={avg} setAvg={setAvg} />
        <div>
          <div className="mb-1 flex justify-between text-[11px] text-white/60"><span>New clients we bring them in a year</span><span className="font-semibold text-white tabular-nums">{clients}</span></div>
          <Slider value={[clients]} min={1} max={60} step={1} onValueChange={(v) => setClients(v[0])} />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {[{ l: "Retainer · ½ average client a month", v: retainer, c: ICE }, { l: "Commission · 25% of year-one revenue", v: commission, c: BLUE }].map((r) => (
          <div key={r.l}>
            <div className="mb-1 flex justify-between text-[11px]"><span className="text-white/70">{r.l}</span><span className="font-semibold text-white tabular-nums">{money(r.v)}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.05]"><motion.div className="h-full rounded-full" style={{ background: r.c, boxShadow: `0 0 10px ${r.c}` }} animate={{ width: `${(r.v / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

/* ---------------- 4. Who pays how ---------------- */
export function WhoPaysHow() {
  const rows: { l: string; g: "wire" | "stripe" | null; o: "wire" | "stripe" | null; note?: string }[] = [
    { l: "Setup, paid in full", g: "stripe", o: "wire" },
    { l: "Payment plan · payment 1", g: "stripe", o: "wire" },
    { l: "Payment plan · payment 2 (30 days later)", g: "stripe", o: "stripe" },
    { l: "Monthly retainer (on the 1st)", g: "stripe", o: "stripe" },
    { l: "Commission (on the 1st)", g: "stripe", o: null, note: "Growth only" },
    { l: "Annual (20% off, every year)", g: "wire", o: "wire" },
  ];
  return (
    <Frame caption="Every client also saves a card or bank account at signing (no charge) so the Stripe payments run on their own.">
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-2.5 grid-preserve text-[12px]">
        <span />
        <span className="text-center text-[10px] font-bold uppercase tracking-wider text-white/45">Growth</span>
        <span className="text-center text-[10px] font-bold uppercase tracking-wider text-white/45">Command Center<br />& Enterprise</span>
        {rows.map((r) => (
          <FragmentRow key={r.l} r={r} />
        ))}
      </div>
    </Frame>
  );
}
function FragmentRow({ r }: { r: { l: string; g: "wire" | "stripe" | null; o: "wire" | "stripe" | null; note?: string } }) {
  return (
    <>
      <span className="text-white/80">{r.l}</span>
      <span className="text-center">{r.g ? <Chip method={r.g} /> : "—"}</span>
      <span className="text-center">{r.o ? <Chip method={r.o} /> : <span className="text-[11px] text-white/35">—</span>}</span>
    </>
  );
}

/* ---------------- 5. Payment simulator ---------------- */
type Way = "full" | "plan" | "annual";
const fmtDate = (s: string) => parseYmd(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function PaymentSim() {
  const [k, setK] = useState<PackageKey>("growth");
  const [avg, setAvg] = useState(10000);
  const [way, setWay] = useState<Way>("full");
  const [ongoing, setOngoing] = useState<Ongoing>("retainer");
  const [sign, setSign] = useState(() => ymd(pacificDate()));
  const d = DEFAULT_PACKAGES[k];
  const p = defaultPrices(d, avg);
  const cadence: Cadence = way === "annual" ? "annual" : "monthly";
  const plan = useMemo(() => buildPlan({
    pkg: d, setup: p.setup, monthly: p.monthly, cadence, paymentPlan: way === "plan",
    ongoing: k === "growth" ? ongoing : "retainer", signDate: parseYmd(sign || ymd(pacificDate())),
  }), [d, p.setup, p.monthly, cadence, way, ongoing, k, sign]);

  // timeline = charges + milestones, by date
  const items = [
    ...plan.lines.map((l) => ({ date: l.date, charge: l })),
    ...plan.milestones
      .filter((m) => !/^Guarantee starts/.test(m.label) && !(way !== "annual" && /guarantee ends/.test(m.label)))
      .map((m) => ({ date: m.date, milestone: /^Made it back/.test(m.label) ? "Day 90 · made back → billing starts" : m.label })),
  ].sort((x, y) => x.date.localeCompare(y.date) || (("milestone" in x ? 0 : 1) - ("milestone" in y ? 0 : 1)));
  const shown = items.slice(0, 9);
  const setupPaid = way === "plan" ? plan.paymentPlanTotal : way === "annual" ? null : p.setup;
  const commissionBase = p.setup; // salesmen are paid on the regular setup amount — never the +10%, never annual extras

  return (
    <Frame caption="Default prices. The same engine builds the real schedule in Form 2 and on the client's Pay & Sign page.">
      <div className="space-y-3">
        <Tabs items={PKG_TABS} value={k} onChange={(v) => { setK(v); if (v !== "growth") setOngoing("retainer"); }} />
        {k === "growth" && <AvgSlider avg={avg} setAvg={setAvg} />}
        <Tabs items={[{ k: "full" as Way, l: "Monthly" }, { k: "plan" as Way, l: "Payment plan" }, { k: "annual" as Way, l: "Annual" }]} value={way} onChange={setWay} />
        {k === "growth" && way !== "annual" && (
          <Tabs items={[{ k: "retainer" as Ongoing, l: "Retainer" }, { k: "commission" as Ongoing, l: "Commission" }]} value={ongoing} onChange={setOngoing} />
        )}
        <label className="flex items-center justify-between gap-3 text-[12px] text-white/60">
          <span>Signs and pays on</span>
          <input type="date" value={sign} onChange={(e) => setSign(e.target.value)}
            className="min-h-[40px] rounded-lg border border-white/12 bg-white/[0.04] px-2 text-[13px] text-white outline-none [color-scheme:dark]" />
        </label>
      </div>

      <div className="mt-4 space-y-1.5">
        {shown.map((it, i) => "charge" in it && it.charge ? (
          <motion.div key={it.date + it.charge.kind + i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
            <span className="w-[86px] shrink-0 text-[11px] tabular-nums text-white/55">{fmtDate(it.date)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-white">{it.charge.label}</span>
              {it.charge.covers && <span className="block truncate text-[11px] text-white/45">{it.charge.covers}</span>}
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-[13px] font-bold tabular-nums text-white">{it.charge.amount == null ? "Varies" : money(it.charge.amount)}</span>
              <Chip method={it.charge.method} />
            </span>
          </motion.div>
        ) : (
          <div key={it.date + "m" + i} className="flex items-center gap-3 px-3 py-1">
            <span className="w-[86px] shrink-0 text-[11px] tabular-nums text-[hsl(197,100%,70%)]">{fmtDate(it.date)}</span>
            <span className="h-px flex-1" style={{ background: "linear-gradient(90deg, hsla(197,100%,60%,.6), transparent)" }} />
            <span className="text-[11px] font-semibold text-[hsl(197,100%,75%)]">{(it as any).milestone}</span>
          </div>
        ))}
        {items.length > shown.length && <p className="px-3 text-[11px] text-white/40">…and every month after on the 1st.</p>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 grid-preserve">
        <Stat l="First 12 months" v={plan.firstYearTotal == null ? "Setup + commission" : money(plan.firstYearTotal)}
          sub={way === "annual" ? `Renews at ${money(plan.annualRenewal)} a year` : way === "plan" ? `Setup ${money(p.setup)} + 10% = ${money(setupPaid)}` : undefined} />
        <Stat l="Your commission (SDR 20%)" v={money(commissionBase * 0.2)}
          sub={way === "plan" ? "Paid half after each payment" : `On the ${money(commissionBase)} setup only`} />
      </div>
    </Frame>
  );
}
