import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mergeDefaults, defaultPrices, annualAmounts, DEFAULT_PACKAGES, type PackageDefaults, type PackageKey } from "@/lib/packages";
import {
  NICHES, PKGS, STEPS, ZONES, NW, WON, inv, stationsFor, CLOCK,
  type Niche, type PkgKey, type Station, type Who,
} from "@/lib/clientPipeline";

/**
 * Client Showcase — /employee/showcase (salesmen) and /admin/showcase (admin).
 * What a salesman screen-shares in a meeting: the three steps, the client pipeline NewLight builds for the firm,
 * by type of firm and package. Content: src/lib/clientPipeline.ts. Prices: src/lib/packages.ts (same as Close Prep),
 * shown only from the faint dot in the bottom-right corner.
 */

const COL: Record<string, string> = {
  s1: "hsl(238,85%,74%)", s2: "hsl(197,100%,60%)", won: "hsl(152,62%,50%)",
  cold: "hsl(214,85%,66%)", warm: "hsl(38,95%,58%)", hot: "hsl(12,92%,63%)", bad: "hsl(0,85%,68%)",
};
const zc = (z: string) => COL[ZONES[z]?.c] ?? COL.won;
const ROLE: Record<Exclude<Who, "">, { l: string; c: string }> = {
  lead: { l: "Prospect", c: "hsl(152,62%,52%)" },
  rep: { l: "Advisor", c: "hsl(214,95%,66%)" },
  admin: { l: "Firm owner", c: "hsl(268,85%,76%)" },
  nl: { l: "NewLight team", c: "hsl(186,90%,55%)" },
  robot: { l: "Automatic", c: "hsl(28,95%,60%)" },
  data: { l: "Saved", c: "hsl(215,20%,62%)" },
};
const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const panel = "rounded-2xl border border-white/[0.16] bg-[hsl(220,36%,11%)]";
const eyebrow = "font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70";

type Role = Exclude<Who, "" | "data"> | "";

function load<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } }
function store(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }

export default function ClientShowcase() {
  const [niche, setNiche] = useState<Niche>(() => load("nl-showcase-niche", "ria"));
  const [pkg, setPkg] = useState<PkgKey>(() => load("nl-showcase-pkg", "cc"));
  const [role, setRole] = useState<Role>("");
  const [allKid, setAllKid] = useState(false);
  const [allDet, setAllDet] = useState(false);
  useEffect(() => store("nl-showcase-niche", niche), [niche]);
  useEffect(() => store("nl-showcase-pkg", pkg), [pkg]);

  const p = PKGS.find((x) => x.k === pkg)!;
  const st = useMemo(() => stationsFor(niche, pkg), [niche, pkg]);
  const has = (s: number) => p.steps.includes(s);
  const nl = NICHES.find((x) => x.k === niche)!.l;
  const dim = (w: Who) => (role && w !== role ? "opacity-25" : "opacity-100");

  return (
    <div className="mx-auto max-w-[1200px] rounded-3xl bg-[hsla(222,46%,5%,.82)] px-4 pb-24 pt-4 text-white shadow-[0_0_0_1px_hsla(211,96%,60%,.12),0_30px_80px_-30px_rgba(0,0,0,.8)] backdrop-blur-xl sm:px-7 [text-shadow:0_1px_2px_rgba(0,0,0,.55)]">
      {/* header */}
      <header className="grid gap-3 pb-5 pt-2">
        <span className={eyebrow}>NewLight · the system we build for your firm</span>
        <h1 className="text-[clamp(1.9rem,4.4vw,3rem)] font-extrabold leading-[1.05] tracking-tight">Your client pipeline</h1>
        <p className="max-w-[68ch] text-[15.5px] text-white/82">
          {pkg === "growth"
            ? `How Growth fills a ${NW[niche]}'s calendar: who we reach, the ads, the page they book on, and the reminders that get them to show up.`
            : `Every step from ${pkg === "ent" ? "the first search for the firm" : "the moment a meeting is booked"} to the moment a prospect is ${WON(niche).toLowerCase()} as a client. Who does what, what's automatic, what gets saved, where it shows up and how it's measured.`}
        </p>
      </header>

      {/* controls */}
      <div className="sticky top-0 z-20 -mx-2 mb-2 grid gap-2 border-b border-white/[0.16] bg-[hsla(222,46%,5%,.94)] px-2 py-2.5 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Seg label="Firm" items={NICHES} value={niche} onChange={setNiche} />
          <Seg label="Package" items={PKGS} value={pkg} onChange={setPkg} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={eyebrow + " mr-1"}>Highlight</span>
          <Chip on={role === ""} onClick={() => setRole("")}>Everyone</Chip>
          {(["lead", "rep", "admin", "nl", "robot"] as const).map((r) => (
            <Chip key={r} on={role === r} color={ROLE[r].c} onClick={() => setRole(r)}>
              <span className="h-2 w-2 rounded-full" style={{ background: ROLE[r].c }} />{ROLE[r].l}
            </Chip>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
          <Chip on={allKid} onClick={() => setAllKid((v) => !v)}>Simple words everywhere</Chip>
          <Chip on={allDet} onClick={() => setAllDet((v) => !v)}>Open all details</Chip>
        </div>
      </div>

      {/* summary */}
      <div className="grid gap-3 pt-5 lg:grid-cols-[1.15fr_1fr]">
        <div className={panel + " grid content-start gap-2.5 p-5"}>
          <span className={eyebrow}>{nl} · {p.l}</span>
          <h2 className="text-2xl font-bold">What {p.l} includes</h2>
          <p className="text-white/78">{p.who}</p>
          <ul className="ml-5 list-disc space-y-1 text-[14.5px]">{p.get.map((g) => <li key={g}>{g}</li>)}</ul>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className={"grid content-start gap-1 rounded-2xl border border-white/[0.16] bg-[hsl(220,36%,11%)] p-4 " + (has(s) ? "" : "opacity-50")}
              style={{ borderTop: `4px solid ${has(s) ? COL[STEPS[s].c] : "rgba(255,255,255,.1)"}` }}>
              <span className={eyebrow}>Step {s}</span>
              <b className="text-[17px]">{STEPS[s].t}</b>
              <small className="text-[12.5px] text-white/72">{STEPS[s].s}</small>
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: has(s) ? COL[STEPS[s].c] : undefined }}>{has(s) ? "Included" : "Not included"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* belt */}
      <Section eyebrowText="The whole thing on one line" title="The conveyor belt" lede="Every stop for this package, left to right. Tap a stop to jump to it. The little cards show who does what. Their colors match the Highlight buttons.">
        <Belt st={st} niche={niche} dim={dim} />
      </Section>

      {/* stations */}
      <Section eyebrowText="Stop by stop" title="What happens at every stop" lede={`"Say it simply" gives the one-sentence version. "Full details" opens everything: who does what, what's sent, what's saved, where it shows up and what gets measured.`}>
        <div>{st.map((s, i) => <StationCard key={`${niche}-${pkg}-${s.id}`} s={s} i={i} allKid={allKid} allDet={allDet} dim={dim} />)}</div>
      </Section>

      {/* clock */}
      <Section eyebrowText="What runs by itself" title="The automatic clock" lede="Things that happen without anyone clicking anything.">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {CLOCK(niche, pkg).map(([w, when, what]) => (
            <div key={when + what} className={"grid gap-1 rounded-xl border border-white/[0.16] bg-[hsl(220,36%,11%)] p-3.5 transition-opacity " + dim(w)} style={{ borderTop: `3px solid ${ROLE[w as Exclude<Who, "">]?.c}` }}>
              <span className="font-mono text-[14px] font-bold">{when}</span>
              <span className="text-[13.5px] text-white/88">{what}</span>
            </div>
          ))}
        </div>
      </Section>

      {has(3) && <Step3Extra niche={niche} allKid={allKid} />}

      {/* packages */}
      <Section eyebrowText="Pick your steps" title="The three packages" lede="Each package is a set of the three steps.">
        <div className="grid gap-3 md:grid-cols-3">
          {PKGS.map((x) => (
            <div key={x.k} className={panel + " grid content-start gap-2 p-4 " + (x.k === pkg ? "ring-2 ring-[hsl(197,100%,60%)]/60" : "")}>
              <span className={eyebrow}>{x.k === pkg ? "Showing now" : "Package"}</span>
              <h3 className="text-xl font-bold">{x.l}</h3>
              <div className="flex flex-wrap gap-1">
                {[1, 2, 3].map((s) => (
                  <span key={s} className="rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold"
                    style={x.steps.includes(s) ? { background: COL[STEPS[s].c], borderColor: COL[STEPS[s].c], color: "hsl(222,45%,8%)" } : { borderColor: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.55)" }}>
                    {s} · {STEPS[s].t}
                  </span>
                ))}
              </div>
              <p className="text-[14px] text-white/78">{x.who}</p>
              <ul className="ml-5 list-disc space-y-1 text-[14px]">{x.get.map((g) => <li key={g}>{g}</li>)}</ul>
              {x.k !== pkg && (
                <button type="button" onClick={() => { setPkg(x.k); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="mt-1 justify-self-start rounded-full border border-white/15 px-3 py-1.5 text-[13px] font-semibold text-white/80 hover:border-white/40">
                  Show {x.l}
                </button>
              )}
            </div>
          ))}
        </div>
      </Section>

      <p className="border-t border-white/[0.16] pt-6 text-[13px] text-white/82">
        <Tag kind="tpl">Template</Tag> forms each firm can edit · <Tag kind="plan">Planned</Tag> being built · <Tag kind="dec">To decide</Tag> open question. Example numbers are examples, not results.
      </p>

      <Pricing pkg={p.pricingKey} />
    </div>
  );
}

/* ---------------- pieces ---------------- */

function Seg<T extends string>({ label, items, value, onChange }: { label: string; items: { k: T; l: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={eyebrow}>{label}</span>
      <div className="inline-flex flex-wrap gap-0.5 rounded-xl border border-white/[0.16] bg-[hsl(220,34%,14%)] p-0.5" role="group" aria-label={label}>
        {items.map((it) => (
          <button key={it.k} type="button" aria-pressed={value === it.k} onClick={() => onChange(it.k)}
            className={"min-h-[34px] rounded-lg px-3 text-[13.5px] font-semibold transition " + (value === it.k ? "bg-[linear-gradient(120deg,hsl(217,90%,52%),hsl(197,100%,48%))] text-white shadow-[0_0_18px_-6px_hsla(197,100%,60%,.9)]" : "text-white/72 hover:text-white")}>
            {it.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Chip({ on, color, onClick, children }: { on: boolean; color?: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={"inline-flex min-h-[30px] items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold transition " + (on ? "bg-white/[0.08]" : "border-white/[0.16] text-white/70 hover:text-white")}
      style={on ? { borderColor: color ?? "hsl(197,100%,60%)", color: color ?? "hsl(197,100%,70%)" } : undefined}>
      {children}
    </button>
  );
}

function Section({ eyebrowText, title, lede, children }: { eyebrowText: string; title: string; lede?: string; children: ReactNode }) {
  return (
    <section className="border-t border-white/[0.16] py-9 first:border-t-0">
      <div className="mb-5 grid gap-1.5">
        <span className={eyebrow}>{eyebrowText}</span>
        <h2 className="text-[clamp(1.4rem,3vw,1.9rem)] font-bold">{title}</h2>
        {lede && <p className="max-w-[66ch] text-white/78">{lede}</p>}
      </div>
      {children}
    </section>
  );
}

function Tag({ kind, children }: { kind: string; children: ReactNode }) {
  const c = kind === "plan" ? COL.warm : kind === "dec" ? COL.bad : COL.s2;
  return <span className="whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-semibold" style={{ color: c, background: `color-mix(in srgb, ${c} 16%, transparent)` }}>{children}</span>;
}

function Belt({ st, niche, dim }: { st: Station[]; niche: Niche; dim: (w: Who) => string }) {
  const zones: { z: string; n: number }[] = [];
  st.forEach((s) => { const z = s.z === "won" ? "prop" : s.z; const last = zones[zones.length - 1]; if (last && last.z === z) last.n++; else zones.push({ z, n: 1 }); });
  let acc = 0;
  const grad = "linear-gradient(90deg," + zones.map((z) => { const a = (acc / st.length) * 100; acc += z.n; return `${zc(z.z)} ${a}% ${(acc / st.length) * 100}%`; }).join(",") + ")";
  const go = (id: string) => document.getElementById("st-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.16] bg-[hsl(222,40%,8%)]">
      <div className="relative px-6 pb-4 pt-5" style={{ width: Math.max(st.length * 168, 900) }}>
        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${st.length}, 1fr)` }}>
          <div className="absolute left-[3%] right-[3%] top-[82px] h-1 rounded" style={{ background: grad }} />
          {st.map((s, i) => (
            <button key={s.id} type="button" onClick={() => go(s.id)} className="group grid grid-rows-[66px_32px_auto] justify-items-center px-1.5 text-center">
              <span className="self-end pb-2 text-[13.5px] font-bold leading-tight">
                <small className="mb-1 block font-mono text-[11px] font-medium text-white/82">{s.small}</small>
                {s.t.replace(/^Form \d · /, "")}
              </span>
              <span className="relative z-[1] grid h-[30px] w-[30px] place-items-center rounded-full border-[3px] bg-[hsl(222,45%,7%)] font-mono text-[12px] font-bold transition group-hover:bg-white group-hover:text-black"
                style={{ borderColor: zc(s.z) }}>{i + 1}</span>
              <span className="mt-2.5 grid w-full gap-1.5">
                {s.hang.map(([w, t]) => (
                  <span key={t} className={"rounded-lg border-l-[3px] px-2 py-1.5 text-left text-[12px] leading-snug transition-opacity " + (w === "data" ? "" : dim(w))}
                    style={{ borderColor: ROLE[w as Exclude<Who, "">]?.c, background: `color-mix(in srgb, ${ROLE[w as Exclude<Who, "">]?.c} 20%, hsl(220,36%,11%))` }}>{t}</span>
                ))}
              </span>
            </button>
          ))}
        </div>
        <div className="mx-[3%] mt-4 grid font-mono text-[11px] font-semibold uppercase tracking-wider" style={{ gridTemplateColumns: zones.map((z) => z.n + "fr").join(" ") }}>
          {zones.map((z, i) => (
            <div key={i} className="truncate border-t-[3px] px-2 py-1.5" style={{ borderColor: zc(z.z), color: zc(z.z) }}>
              {z.z === "prop" ? "Proposal, signing, " + WON(niche).toLowerCase() : ZONES[z.z].l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StationCard({ s, i, allKid, allDet, dim }: { s: Station; i: number; allKid: boolean; allDet: boolean; dim: (w: Who) => string }) {
  const [kid, setKid] = useState(allKid);
  const [det, setDet] = useState(allDet);
  useEffect(() => setKid(allKid), [allKid]);
  useEffect(() => setDet(allDet), [allDet]);
  const c = zc(s.z);
  return (
    <article id={"st-" + s.id} className="grid scroll-mt-36 gap-4 border-t border-white/[0.16] py-7 first:border-t-0 sm:grid-cols-[56px_minmax(0,1fr)]" style={{ "--z": c } as CSSProperties}>
      <div className="flex items-center gap-2 font-extrabold text-white/60 sm:grid sm:content-start sm:justify-items-center">
        <span className="text-[30px] leading-none">{i + 1}</span>
        <span className="hidden min-h-[60px] w-1 rounded sm:block" style={{ background: c }} />
      </div>
      <div className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-[1.3rem] font-bold">{s.t}</h3>
          <span className="rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[hsl(222,45%,8%)]" style={{ background: c }}>{s.z === "won" ? "Won" : ZONES[s.z].l}</span>
          {s.tag && <Tag kind={s.tag[0]}>{s.tag[1]}</Tag>}
        </div>
        <p className="max-w-[72ch] text-[16px] text-white/92">{s.d}</p>
        <div className="flex flex-wrap gap-1.5">{s.feat.map((f) => <span key={f} className="rounded-full border border-white/[0.16] bg-[hsl(220,34%,14%)] px-2.5 py-1 text-[12px] font-semibold text-white/88">{f}</span>)}</div>
        {s.results && (
          <div className="flex flex-wrap gap-1.5 font-mono text-[11.5px] font-semibold">
            {[["Moved forward", COL.won], ["Another meeting first", COL.warm], ["Rescheduled", COL.cold], ["Lost + reason", COL.bad]].map(([t, cc]) => <span key={t} className="rounded-md border px-2 py-0.5" style={{ color: cc, borderColor: cc }}>{t}</span>)}
          </div>
        )}
        {kid && <Kid c={c}>{s.kid}</Kid>}
        <div className="flex flex-wrap gap-2">
          <Toggle on={kid} c={c} onClick={() => setKid((v) => !v)}>Say it simply</Toggle>
          <Toggle on={det} c={c} onClick={() => setDet((v) => !v)}>Full details <ChevronDown className={"ml-1 h-3.5 w-3.5 transition " + (det ? "rotate-180" : "")} /></Toggle>
        </div>
        {det && (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {s.boxes.map((b) => (
              <div key={b.h} className={"min-w-0 rounded-xl border border-white/[0.16] p-3.5 " + (b.h === "Goal" ? "bg-[hsl(220,34%,15%)]" : "bg-[hsl(220,36%,11%)]")}>
                <h4 className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white/68">{b.h}</h4>
                <ul className="grid gap-1.5">
                  {b.items.map(([w, t]) => (
                    <li key={t} className={"relative pl-3.5 text-[14px] transition-opacity " + (w && w !== "data" ? dim(w) : "")}>
                      <span className="absolute left-0 top-[.6em] h-[7px] w-[7px] rounded-full" style={{ background: w ? ROLE[w as Exclude<Who, "">]?.c : "rgba(255,255,255,.35)" }} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function Kid({ c, children }: { c: string; children: ReactNode }) {
  return (
    <p className="max-w-[72ch] rounded-xl border px-3.5 py-3 text-[16.5px]" style={{ borderColor: `color-mix(in srgb, ${c} 40%, transparent)`, background: `color-mix(in srgb, ${c} 16%, hsl(220,36%,11%))` }}>
      <span className="mb-1 block font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: c }}>In simple words</span>
      {children}
    </p>
  );
}

function Toggle({ on, c, onClick, children }: { on: boolean; c: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-expanded={on} onClick={onClick}
      className="inline-flex min-h-[36px] items-center rounded-lg border bg-[hsl(220,36%,11%)] px-3 text-[13.5px] font-semibold transition"
      style={on ? { borderColor: c, color: c } : { borderColor: "rgba(255,255,255,.12)" }}>
      {children}
    </button>
  );
}

function Step3Extra({ niche, allKid }: { niche: Niche; allKid: boolean }) {
  const w = WON(niche);
  const iv = inv(niche);
  const card = "grid content-start gap-1.5 rounded-xl border border-white/[0.16] bg-[hsl(220,36%,11%)] p-4";
  return (
    <>
      <Section eyebrowText="After every meeting" title="The meeting loop" lede="Two meetings by default: Discovery, then Closing. Every meeting ends the same way, in two taps: did they show up, and how did it go. Need more meetings? Add them to the cadence.">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {[["Moved forward", COL.won, ["After Meeting 1: Form 2 and Meeting 2 booked on the call", "After Meeting 2: Form 3 sent on the call"]],
            ["Another meeting first", COL.warm, ["They came but want one more talk", "Counted as follow-up #1, #2… with the reason", "Not a reschedule"]],
            ["Rescheduled or no-show", COL.cold, ["The meeting didn't happen", "Rebook link and the 72-hour clock", "Counted as try 2, try 3"]],
            ["Lost", COL.bad, ["Main reason required", "\"Not now\" goes to a follow-up date instead"]]].map(([t, c, l]) => (
            <div key={t as string} className={card} style={{ borderTop: `4px solid ${c}` }}>
              <b className="text-[18px]">{t as string}</b>
              <ul className="ml-4 list-disc space-y-1 text-[14px] text-white/88">{(l as string[]).map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          ))}
        </div>
        <h3 className="mb-2.5 mt-7 text-lg font-bold">Two kinds of "another meeting", counted separately</h3>
        <div className="overflow-x-auto rounded-xl border border-white/[0.16]">
          <table className="w-full min-w-[640px] text-[13.5px]">
            <thead><tr className="bg-[hsl(220,34%,14%)] text-left font-mono text-[11px] uppercase tracking-wider text-white/68"><th className="p-2.5" /><th className="p-2.5">Reschedule</th><th className="p-2.5">Extra meeting</th></tr></thead>
            <tbody className="[&_td]:border-t [&_td]:border-white/[0.16] [&_td]:p-2.5 [&_td]:align-top">
              <tr><td>What happened</td><td>The meeting didn't happen</td><td>The meeting happened; they want one more before deciding</td></tr>
              <tr><td>Counted as</td><td>Try 2, try 3 of the same meeting</td><td>Follow-up 1, 2, 3 (its own meeting)</td></tr>
              <tr><td>Show-up rate</td><td>A no-show lowers it</td><td>Counts as attended</td></tr>
              <tr><td>What it tells you</td><td>Booking and reminder quality</td><td>How many meetings it really takes to close</td></tr>
            </tbody>
          </table>
        </div>
        <h3 className="mb-2.5 mt-7 text-lg font-bold">The cadence</h3>
        <div className="grid gap-2.5 md:grid-cols-3">
          {[["Default", "Two meetings", "Discovery → Closing. Proposal (Form 2) in between, signing (Form 3) during the close."],
            ["Add", "More meetings", "A firm that runs a plan presentation or a data-gathering meeting adds it as a standard step."],
            ["Per prospect", "Extra meetings", "Any single prospect can get an extra meeting without changing the firm's cadence."]].map(([k, t, d]) => (
            <div key={t} className={card}><span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[hsl(197,100%,62%)]">{k}</span><b className="text-[16px]">{t}</b><p className="text-[14px] text-white/78">{d}</p></div>
          ))}
        </div>
      </Section>

      <Section eyebrowText="Behind the pipeline" title="How your prospects stay organized" lede="One board for the whole firm. Every person is in one column, has one advisor in charge, and always has a next step.">
        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-[900px] grid-cols-6 gap-2">
            {[["Booked", COL.cold, "Dana R. · website", "Meeting Tue 10am"], ["Met", COL.warm, "Lee family · referral", "Form 2 due"], ["Proposal", COL.hot, "M. Ortiz · ad", "Meeting 2 Thu"],
              ["Signing", COL.hot, "K. Patel · event", "Form 3 sent"], [iv ? "Funding" : "Placing", COL.won, iv ? "J. Chen · CPA" : "J. Chen · partner", iv ? "Transfer started" : "Underwriting"], ["Client", COL.won, "A. Brooks · website", w + " Oct 30"]].map(([t, c, a, b]) => (
              <div key={t} className="grid content-start gap-1.5 rounded-xl border border-white/[0.16] bg-[hsl(220,36%,11%)] p-2.5" style={{ borderTop: `4px solid ${c}` }}>
                <b>{t}</b>
                <div className="rounded-lg bg-[hsl(220,34%,15%)] px-2 py-1.5 text-[12.5px]">{a}<small className="block text-[11px] text-white/68">{b}</small></div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[12.5px] text-white/82">Example names. Each card shows the person, where they came from and their next step.</p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {[["Source", "Where they came from", "Every prospect is tagged: website, ads, referral, event, " + (iv ? "CPA or attorney." : "partner."), "We remember how each person found you, so you know what's working."],
            ["Owner", "Who's working them", "Meetings route to the right advisor. The firm owner sees every advisor's board.", "Each person has one advisor in charge, and the boss can see everyone."],
            ["Next step", "Nothing goes quiet", "Every prospect has a next meeting, a follow-up date, or a reason they're closed.", "Nobody gets forgotten. Each person always has a next step."],
            ["Not now", "The follow-up lane", iv ? "\"Call me after I retire\" gets a date, and comes back to the advisor on that date." : "\"Call me at renewal\" gets a date, and comes back to the advisor on that date.", "They're not ready yet, so we remind you to check back at the right time."],
            ["Lost", "Lost with a reason", "Every lost prospect has a main reason, so the firm sees which objections cost the most.", "When someone says no, we write down why."]].map(([k, t, d, kid]) => (
            <OrgCard key={k} k={k} t={t} d={d} kid={kid} allKid={allKid} />
          ))}
        </div>
      </Section>

      <Section eyebrowText="What gets measured" title="The numbers the firm sees" lede="Every number comes from the outcomes logged after each meeting. The bars are an example.">
        <div className="grid gap-2 rounded-2xl border border-white/[0.16] bg-[hsl(220,36%,11%)] p-4">
          {[["Meetings booked", 100, COL.cold], ["Showed up", 78, COL.cold], ["Reached a proposal", 46, COL.warm], ["Signed", 27, COL.hot], [w, 24, COL.won]].map(([l, v, c]) => (
            <div key={l as string} className="grid grid-cols-[1fr_56px] items-center gap-x-3 gap-y-1 text-[14px] sm:grid-cols-[190px_minmax(0,1fr)_56px]">
              <span>{l}</span>
              <span className="col-span-2 row-start-2 h-6 overflow-hidden rounded-md bg-[hsl(220,34%,15%)] sm:col-span-1 sm:row-start-auto"><i className="block h-full rounded-md" style={{ width: `${v}%`, background: c as string }} /></span>
              <span className="text-right font-mono text-[13px] tabular-nums">{v}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[12.5px] text-white/82">Example: out of 100 booked meetings. Not a promise of results.</p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {[["Show-up rate", "showed up ÷ booked", "Tells you if booking and reminders are working."],
            ["Close rate", w.toLowerCase() + " ÷ first meetings held", "Only decided prospects count, so open deals don't drag it down."],
            ["Meetings to close", "average meetings per " + w.toLowerCase() + " client", "Includes extra meetings, broken down by stage."],
            ["Between the forms", "meetings until Form 2, until Form 3", "Shows where extra meetings stop paying off."],
            [iv ? "Signed to funded" : "Application to placed", iv ? "funded ÷ signed, and days to fund" : "placed ÷ applications, and days to place", "The leak most firms never measure."],
            ["By source", (iv ? "assets" : "premium") + " won per source", "Which channel actually produces clients."]].map(([t, f, d]) => (
            <div key={t} className={card}><b>{t}</b><span className="font-mono text-[13px] text-[hsl(197,100%,66%)]">{f}</span><p className="text-[13.5px] text-white/78">{d}</p></div>
          ))}
        </div>
      </Section>

      <Section eyebrowText="Nothing lost" title="Where everything is saved" lede="Every meeting, message and document is kept on the prospect's record and can be exported.">
        <div className="overflow-x-auto rounded-xl border border-white/[0.16]">
          <table className="w-full min-w-[640px] text-[13.5px]">
            <thead><tr className="bg-[hsl(220,34%,14%)] text-left font-mono text-[11px] uppercase tracking-wider text-white/68"><th className="p-2.5">What</th><th className="p-2.5">Saved on</th><th className="p-2.5">Who sees it</th></tr></thead>
            <tbody className="[&_td]:border-t [&_td]:border-white/[0.16] [&_td]:p-2.5 [&_td]:align-top">
              <tr><td>Booking and where they came from</td><td>Prospect record</td><td>Advisor, firm owner</td></tr>
              <tr><td>Form 1 answers</td><td>Prospect record and meeting card</td><td>Advisor, firm owner</td></tr>
              <tr><td>Every confirmation, reminder and text</td><td>Message history</td><td>Advisor, firm owner; exportable for compliance</td></tr>
              <tr><td>Every meeting outcome and objection</td><td>Meeting history</td><td>Advisor, firm owner, AI Insights</td></tr>
              <tr><td>Proposal and price (Form 2)</td><td>Prospect record</td><td>Advisor, firm owner</td></tr>
              <tr><td>Signed documents and delivery record (Form 3)</td><td>Document vault (planned)</td><td>Advisor, firm owner; exportable for compliance</td></tr>
              <tr><td>{iv ? "Account and funding" : "Underwriting and placement"} stages</td><td>Prospect record (planned)</td><td>Advisor, firm owner</td></tr>
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

function OrgCard({ k, t, d, kid, allKid }: { k: string; t: string; d: string; kid: string; allKid: boolean }) {
  const [on, setOn] = useState(allKid);
  useEffect(() => setOn(allKid), [allKid]);
  return (
    <div className="grid content-start gap-1.5 rounded-xl border border-white/[0.16] bg-[hsl(220,36%,11%)] p-4">
      <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-[hsl(197,100%,62%)]">{k}</span>
      <b className="text-[16px]">{t}</b>
      <p className="text-[14px] text-white/78">{d}</p>
      {on && <Kid c={COL.won}>{kid}</Kid>}
      <button type="button" onClick={() => setOn((v) => !v)} aria-expanded={on} className="justify-self-start text-[12.5px] font-semibold text-white/72 hover:text-white">{on ? "Hide" : "Say it simply"}</button>
    </div>
  );
}

/** Discreet pricing: a faint dot in the corner. Same numbers as Close Prep (src/lib/packages.ts + saved overrides). */
function Pricing({ pkg }: { pkg: PackageKey }) {
  const [open, setOpen] = useState(false);
  const [avgText, setAvgText] = useState("10,000");
  const [defs, setDefs] = useState<Record<PackageKey, PackageDefaults>>(DEFAULT_PACKAGES);
  useEffect(() => {
    (supabase as any).from("nl_package_defaults").select("*").then(({ data }: any) => setDefs(mergeDefaults(data)));
  }, []);
  const avg = Number(avgText.replace(/[^\d.]/g, "")) || 0;
  const d = defs[pkg];
  const { setup, monthly } = defaultPrices(d, avg);
  const yr = annualAmounts(d, setup, monthly);
  const rows: [string, string][] = [
    ["Setup", money(setup)],
    [pkg === "growth" ? "Monthly, after 90 days" : "Monthly", money(monthly) + "/mo"],
  ];
  if (pkg === "growth") rows.push(["Or instead", `${d.commission_rate}% yr 1, then ${d.commission_rate_ongoing}%`]);
  rows.push(["Payment plan", money(setup * (1 + d.payment_plan_markup_pct / 100)) + " in 2"]);
  rows.push([`Paid yearly (${d.annual_discount_pct}% off)`, money(yr.first) + " yr 1"]);
  rows.push(["Guarantee", d.guarantee_days ? `${d.guarantee_days} days` : "None"]);
  return (
    <>
      <button type="button" aria-label="Notes" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-30 h-3 w-3 rounded-full bg-white/10 transition hover:bg-white/30 focus-visible:bg-white/40" />
      {open && (
        <div className="fixed bottom-10 right-4 z-30 grid w-[min(340px,calc(100vw-32px))] gap-2.5 rounded-2xl border border-white/[0.16] bg-[hsl(222,40%,9%)] p-4 shadow-2xl">
          <div className="flex items-center justify-between"><b>{d.label}</b><button type="button" onClick={() => setOpen(false)} className="text-[12px] text-white/82 hover:text-white">Close</button></div>
          <label className="grid gap-1 text-[12px] text-white/72">Their average client value (per year)
            <input value={avgText} onChange={(e) => setAvgText(e.target.value)} inputMode="numeric"
              className="rounded-lg border border-white/[0.16] bg-black/30 px-2.5 py-2 font-mono text-[15px] font-semibold text-white outline-none focus:border-[hsl(197,100%,60%)]" />
          </label>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13.5px]">
            {rows.map(([a, b]) => <div key={a} className="contents"><dt className="text-white/72">{a}</dt><dd className="text-right font-mono tabular-nums">{b}</dd></div>)}
          </dl>
          <p className="text-[11.5px] text-white/60">Starting numbers. Final terms are set in Form 2.</p>
        </div>
      )}
    </>
  );
}
