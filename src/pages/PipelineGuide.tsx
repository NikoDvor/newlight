import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { ROLES, GZONES, ONBOARDING, PIPELINE, stopsFor, GCLOCK, type SalesRole, type GStop, type GWho } from "@/lib/salesPipeline";

/**
 * Pipeline Guide — Training Center (/employee/training/pipeline-guide, /admin/training-center/pipeline-guide).
 * NewLight's own sales pipeline for salesmen, by role (BDR / SDR / Both): getting started, the conveyor belt,
 * every stop with "Say it simply" + "Full details", what runs by itself, and the numbers. Content: src/lib/salesPipeline.ts.
 * Same layout as the Client Showcase. No page panel: the app gives every rounded box a solid backing, so the
 * moving background shows between boxes and headings rely on the app-wide text edge.
 */

const COL: Record<string, string> = {
  violet: "hsl(265,85%,76%)", cold: "hsl(214,85%,66%)", warm: "hsl(38,95%,58%)", hot: "hsl(12,92%,63%)", won: "hsl(152,62%,50%)", bad: "hsl(0,85%,68%)", sky: "hsl(197,100%,62%)",
};
const zc = (z: string) => COL[GZONES[z]?.c] ?? COL.sky;
const WHO_C: Record<Exclude<GWho, "">, string> = {
  rep: "hsl(214,95%,66%)", partner: "hsl(186,90%,55%)", lead: "hsl(152,62%,52%)", admin: "hsl(268,85%,76%)", robot: "hsl(28,95%,60%)", data: "hsl(215,20%,62%)",
};
const eyebrow = "font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70";
const surface = "rounded-xl border border-white/[0.16] bg-[hsla(220,40%,9%,.72)]";
type Hi = Exclude<GWho, "" | "data"> | "";

function load<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } }

export default function PipelineGuide() {
  const loc = useLocation();
  const isAdmin = loc.pathname.startsWith("/admin");
  const [role, setRole] = useState<SalesRole>(() => load("nl-guide-role", "both"));
  const [hi, setHi] = useState<Hi>("");
  const [allKid, setAllKid] = useState(false);
  const [allDet, setAllDet] = useState(false);
  useEffect(() => { try { localStorage.setItem("nl-guide-role", JSON.stringify(role)); } catch { /* ignore */ } }, [role]);

  const ob = useMemo(() => stopsFor(ONBOARDING, role), [role]);
  const pl = useMemo(() => stopsFor(PIPELINE, role), [role]);
  const partnerLabel = role === "bdr" ? "Your SDR" : role === "sdr" ? "Your BDR" : "";
  const label: Record<Exclude<GWho, "" | "data">, string> = { rep: "You", partner: partnerLabel, lead: "Prospect / client", admin: "Admin", robot: "Automatic" };
  const dim = (w: GWho) => (hi && w !== hi && w !== "" && w !== "data" ? "opacity-25" : "opacity-100");
  const r = ROLES.find((x) => x.k === role)!;
  const has = (k: "bdr" | "sdr") => role === "both" || role === k;

  return (
    <div className="mx-auto max-w-[1200px] pb-24 text-white">
      <Link to={isAdmin ? "/admin/training-center" : "/employee/training"} className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.12] bg-[hsla(222,44%,6%,.62)] px-3 py-1.5 text-[14px] text-white/90 hover:text-white">
        <ArrowLeft className="h-4 w-4" />Training Center
      </Link>
      <header className="mb-4 mt-4 inline-grid max-w-full gap-3 rounded-2xl border border-white/[0.12] bg-[hsla(222,44%,6%,.62)] px-5 py-4">
        <span className={eyebrow}>Training · how a lead becomes a client</span>
        <h1 className="text-[clamp(1.9rem,4.4vw,3rem)] font-extrabold leading-[1.05] tracking-tight">Pipeline Guide</h1>
        <p className="max-w-[66ch] text-[15.5px] text-white/85">Pick your role. You'll see only your steps: how you get started, then every stop from {has("bdr") ? "the first call" : "the booked meeting"} to {has("sdr") ? "the signed client" : "the hand-off"}, in simple words first and full detail one tap away.</p>
      </header>

      {/* controls */}
      <div className="sticky top-0 z-20 -mx-2 mb-2 grid gap-2 border-b border-white/[0.16] bg-[hsla(222,46%,5%,.9)] px-2 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={eyebrow}>I am a</span>
          <div className="inline-flex flex-wrap gap-0.5 rounded-xl border border-white/[0.16] bg-[hsla(220,36%,13%,.78)] p-0.5" role="group" aria-label="Role">
            {ROLES.map((x) => (
              <button key={x.k} type="button" aria-pressed={role === x.k} onClick={() => { setRole(x.k); if (hi === "partner" && x.k === "both") setHi(""); }}
                className={"min-h-[36px] rounded-lg px-4 text-[14px] font-semibold transition " + (role === x.k ? "bg-[linear-gradient(120deg,hsl(217,90%,52%),hsl(197,100%,48%))] text-white shadow-[0_0_18px_-6px_hsla(197,100%,60%,.9)]" : "text-white/70 hover:text-white")}>
                {x.l}
              </button>
            ))}
          </div>
          <span className="text-[13.5px] text-white/80">{r.d}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={eyebrow + " mr-1"}>Highlight</span>
          <Chip on={hi === ""} onClick={() => setHi("")}>Everyone</Chip>
          {(["rep", "partner", "lead", "admin", "robot"] as const).filter((w) => w !== "partner" || partnerLabel).map((w) => (
            <Chip key={w} on={hi === w} color={WHO_C[w]} onClick={() => setHi(w)}><span className="h-2 w-2 rounded-full" style={{ background: WHO_C[w] }} />{label[w]}</Chip>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" />
          <Chip on={allKid} onClick={() => setAllKid((v) => !v)}>Simple words everywhere</Chip>
          <Chip on={allDet} onClick={() => setAllDet((v) => !v)}>Open all details</Chip>
        </div>
      </div>

      {/* role summary */}
      <div className="grid gap-3 pt-5 md:grid-cols-2">
        <RoleCard on={has("bdr")} title="BDR" pay="15% of the setup fee" lines={["Get leads every work night", "Call firms in the Dialer", "Book the first meeting (Form 1)", "Hand it to the SDR"]} c={COL.cold} />
        <RoleCard on={has("sdr")} title="SDR" pay="20% of the setup fee" lines={["Run Discovery with the Calculator", "Fill Form 2 and book the close", "Close and send Pay & Sign", "Log every meeting's outcome"]} c={COL.hot} />
      </div>

      <Section eyebrowText="Before your first call" title="Getting started" lede="Your first days, step by step.">
        <Belt stops={ob} dim={dim} />
        <div className="mt-2">{ob.map((s, i) => <Stop key={role + s.id} s={s} i={i} allKid={allKid} allDet={allDet} dim={dim} label={label} />)}</div>
      </Section>

      <Section eyebrowText="The whole thing on one line" title="Your pipeline" lede="Every stop you own, left to right. Tap a stop to jump to it. The little cards show who does what; their colors match the Highlight buttons.">
        <Belt stops={pl} dim={dim} />
        <div className="mt-2">{pl.map((s, i) => <Stop key={role + s.id} s={s} i={i} allKid={allKid} allDet={allDet} dim={dim} label={label} />)}</div>
      </Section>

      <Section eyebrowText="What runs by itself" title="The automatic clock" lede="Things the app does for you, without anyone clicking anything.">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {GCLOCK(role).map(([w, when, what]) => (
            <div key={when} className={surface + " grid gap-1 p-3.5 transition-opacity " + dim(w)} style={{ borderTop: `3px solid ${WHO_C.robot}` }}>
              <span className="font-mono text-[14px] font-bold">{when}</span>
              <span className="text-[13.5px] text-white/88">{what}</span>
            </div>
          ))}
        </div>
      </Section>

      {has("bdr") && (
        <Section eyebrowText="Behind your Dialer" title="How your leads are organized" lede="Where your leads come from, and where they go when they're not ready.">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {[["Your cities", "Admin gives you a state. The app lines up its cities and works one at a time; one salesman per city, so nobody calls the same firm.", "You get your own towns to call, one at a time."],
              ["Who's first", "Firms showing a buying sign first, then firms you haven't had before, then RIAs, broker-dealer reps, hybrids and independents.", "The best firms come to you first."],
              ["Dialer lists", "Leads land in lists named by city. Filter by firm type, state and city together, or search by name or phone.", "Your leads are sorted by town, and you can find anyone fast."],
              ["Resting", "A \"no\" rests 60 days to a year depending on why, then goes to a different salesman. Closed businesses and do-not-call numbers leave for good.", "If they say no, they take a break and someone else tries later."],
              ["Friday clean-up", "Imported leads nobody touched for 10 work days go back to the pool at 9pm Friday.", "Leads you don't call go back so someone else can."],
              ["Temperature", "Cold while you call. Warm once Form 1 is booked. Hot at Form 2. Won when they pay and sign.", "The color shows how close they are to saying yes."]]
              .map(([t, d, kid]) => <Info key={t} t={t} d={d} kid={kid} allKid={allKid} />)}
          </div>
        </Section>
      )}

      {has("sdr") && (
        <Section eyebrowText="After every meeting" title="The meeting loop" lede="Two meetings by default: Discovery, then Closing. Every meeting ends the same way, in two taps.">
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {[["Won (moved forward)", COL.won, ["After Discovery: fill Form 2, book Meeting 2", "After Closing: send Pay & Sign on the call"]],
              ["Another meeting first", COL.warm, ["They came but want one more talk", "Counted as follow-up #1, #2… with the reason"]],
              ["Rescheduled or no-show", COL.cold, ["The meeting didn't happen", "Rebook link and the 72-hour clock", "Counted as try 2, try 3"]],
              ["Lost", COL.bad, ["Main reason required", "Lead goes back to Cold"]]].map(([t, c, l]) => (
              <div key={t as string} className={surface + " grid content-start gap-1.5 p-4"} style={{ borderTop: `4px solid ${c}` }}>
                <b className="text-[17px]">{t as string}</b>
                <ul className="ml-4 list-disc space-y-1 text-[14px] text-white/88">{(l as string[]).map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.16]">
            <table className="w-full min-w-[620px] text-[13.5px]">
              <thead><tr className="text-left font-mono text-[11px] uppercase tracking-wider text-white/80"><th className="p-2.5" /><th className="p-2.5">Reschedule</th><th className="p-2.5">Extra meeting</th></tr></thead>
              <tbody className="[&_td]:border-t [&_td]:border-white/10 [&_td]:p-2.5 [&_td]:align-top">
                <tr><td>What happened</td><td>The meeting didn't happen</td><td>It happened; they want one more before deciding</td></tr>
                <tr><td>Counted as</td><td>Try 2, try 3 of the same meeting</td><td>Follow-up 1, 2, 3 (its own meeting)</td></tr>
                <tr><td>Show-up rate</td><td>A no-show lowers it</td><td>Counts as attended</td></tr>
                <tr><td>Lead stage</td><td>Unchanged; 72-hour clock runs</td><td>Unchanged until the next form</td></tr>
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section eyebrowText="Your numbers" title="What gets measured" lede={isAdmin ? "Every salesman's numbers are in Admin → Pipeline → Sales Team Results." : "All of these are on My Stats."}>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {[...(has("bdr") ? [["Connect rate", "real conversations ÷ dials", "How often you get past the front desk."], ["Dials per meeting", "dials ÷ first meetings booked", "How much calling one booking takes."], ["Meetings booked", "first meetings booked", "Your main number."]] : []),
            ...(has("sdr") ? [["Show-up rate", "attended ÷ (attended + missed)", "Are booked meetings actually happening?"], ["Close rate", "won ÷ first meetings booked (decided only)", "Our main close rate."], ["Meetings to close", "meetings per won client", "Including extra meetings, form by form."]] : [])]
            .map(([t, f, d]) => (
              <div key={t} className={surface + " grid gap-1 p-4"}><b>{t}</b><span className="font-mono text-[13px] text-[hsl(197,100%,70%)]">{f}</span><p className="text-[13.5px] text-white/82">{d}</p></div>
            ))}
        </div>
        {!isAdmin && <Link to="/employee/my-stats" className="mt-3 inline-block text-[14px] font-semibold text-[hsl(197,100%,70%)] hover:underline">Open My Stats →</Link>}
      </Section>
    </div>
  );
}

/** The live Pipeline Guide belt, embedded in Training chapters as [[visual:guide-belt]] — same data, can't drift. */
export function GuideBeltVisual() {
  const [role, setRole] = useState<SalesRole>(() => load("nl-guide-role", "both"));
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-1">
        {ROLES.map((x) => (
          <button key={x.k} type="button" aria-pressed={role === x.k} onClick={() => setRole(x.k)}
            className={"min-h-[30px] rounded-lg px-3 text-[12.5px] font-semibold " + (role === x.k ? "bg-[hsl(211,96%,52%)] text-white" : "border border-white/[0.16] text-white/80")}>{x.l}</button>
        ))}
      </div>
      <Belt stops={stopsFor(PIPELINE, role)} dim={() => "opacity-100"} />
    </div>
  );
}

/* ---------------- pieces ---------------- */

function RoleCard({ on, title, pay, lines, c }: { on: boolean; title: string; pay: string; lines: string[]; c: string }) {
  return (
    <div className={surface + " grid content-start gap-1.5 p-4 transition-opacity " + (on ? "" : "[&_*]:!text-white/45")} style={{ borderTop: `4px solid ${on ? c : "rgba(255,255,255,.15)"}` }}>
      <div className="flex items-baseline justify-between gap-2"><b className="text-[19px]">{title}</b><span className="font-mono text-[12px] text-white/80">{pay}</span></div>
      <ul className="ml-4 list-disc space-y-0.5 text-[14px] text-white/88">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
      {!on && <span className="font-mono text-[10.5px] font-semibold uppercase tracking-wider text-white/60">Not your role</span>}
    </div>
  );
}

function Chip({ on, color, onClick, children }: { on: boolean; color?: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={"inline-flex min-h-[30px] items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold transition " + (on ? "bg-white/[0.08]" : "border-white/[0.16] text-white/80 hover:text-white")}
      style={on ? { borderColor: color ?? COL.sky, color: color ?? COL.sky } : undefined}>
      {children}
    </button>
  );
}

function Section({ eyebrowText, title, lede, children }: { eyebrowText: string; title: string; lede?: string; children: ReactNode }) {
  return (
    <section className="py-9">
      <div className="mb-5 inline-grid max-w-full gap-1.5 rounded-2xl border border-white/[0.12] bg-[hsla(222,44%,6%,.62)] px-4 py-3">
        <span className={eyebrow}>{eyebrowText}</span>
        <h2 className="text-[clamp(1.4rem,3vw,1.9rem)] font-bold">{title}</h2>
        {lede && <p className="max-w-[66ch] text-white/85">{lede}</p>}
      </div>
      {children}
    </section>
  );
}

function Tag({ kind, children }: { kind: string; children: ReactNode }) {
  const c = kind === "plan" ? COL.warm : kind === "dec" ? COL.bad : COL.sky;
  return <span className="whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-semibold" style={{ color: c, background: `color-mix(in srgb, ${c} 16%, transparent)` }}>{children}</span>;
}

function Belt({ stops, dim }: { stops: GStop[]; dim: (w: GWho) => string }) {
  const zones: { z: string; n: number }[] = [];
  stops.forEach((s) => { const last = zones[zones.length - 1]; if (last && last.z === s.z) last.n++; else zones.push({ z: s.z, n: 1 }); });
  let acc = 0;
  const grad = "linear-gradient(90deg," + zones.map((z) => { const a = (acc / stops.length) * 100; acc += z.n; return `${zc(z.z)} ${a}% ${(acc / stops.length) * 100}%`; }).join(",") + ")";
  const go = (id: string) => document.getElementById("gs-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.16]">
      <div className="relative px-6 pb-4 pt-5" style={{ width: Math.max(stops.length * 168, 860) }}>
        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${stops.length}, 1fr)` }}>
          <div className="absolute left-[3%] right-[3%] top-[82px] h-1 rounded" style={{ background: grad }} />
          {stops.map((s, i) => (
            <button key={s.id} type="button" onClick={() => go(s.id)} className="group grid grid-rows-[66px_32px_auto] justify-items-center px-1.5 text-center">
              <span className="self-end pb-2 text-[13.5px] font-bold leading-tight"><small className="mb-1 block font-mono text-[11px] font-medium text-white/70">{s.small}</small>{s.t}</span>
              <span className="relative z-[1] grid h-[30px] w-[30px] place-items-center rounded-full border-[3px] bg-[hsl(222,45%,7%)] font-mono text-[12px] font-bold transition group-hover:bg-white group-hover:text-black" style={{ borderColor: zc(s.z) }}>{i + 1}</span>
              <span className="mt-2.5 grid w-full gap-1.5">
                {s.hang.map(([w, t]) => (
                  <span key={t} className={"rounded-lg border-l-[3px] px-2 py-1.5 text-left text-[12px] leading-snug transition-opacity " + dim(w)}
                    style={{ borderColor: WHO_C[w as Exclude<GWho, "">], background: `color-mix(in srgb, ${WHO_C[w as Exclude<GWho, "">]} 24%, hsla(220,40%,9%,.85))` }}>{t}</span>
                ))}
              </span>
            </button>
          ))}
        </div>
        <div className="mx-[3%] mt-4 grid font-mono text-[11px] font-semibold uppercase tracking-wider" style={{ gridTemplateColumns: zones.map((z) => z.n + "fr").join(" ") }}>
          {zones.map((z, i) => <div key={i} className="truncate border-t-[3px] px-2 py-1.5" style={{ borderColor: zc(z.z), color: zc(z.z) }}>{GZONES[z.z].l}</div>)}
        </div>
      </div>
    </div>
  );
}

function Stop({ s, i, allKid, allDet, dim, label }: { s: GStop; i: number; allKid: boolean; allDet: boolean; dim: (w: GWho) => string; label: Record<string, string> }) {
  const [kid, setKid] = useState(allKid);
  const [det, setDet] = useState(allDet);
  useEffect(() => setKid(allKid), [allKid]);
  useEffect(() => setDet(allDet), [allDet]);
  const c = zc(s.z);
  const boxTitle = (h: string) => h.replace(/^BDR does$/, label.partner === "Your BDR" ? "Your BDR does" : "You do (BDR)").replace(/^SDR does$/, label.partner === "Your SDR" ? "Your SDR does" : "You do (SDR)");
  return (
    <article id={"gs-" + s.id} className="my-3 grid scroll-mt-36 gap-4 rounded-2xl border border-white/[0.12] bg-[hsla(222,44%,6%,.5)] p-4 sm:grid-cols-[56px_minmax(0,1fr)] sm:p-5" style={{ "--z": c } as CSSProperties}>
      <div className="flex items-center gap-2 font-extrabold text-white/70 sm:grid sm:content-start sm:justify-items-center">
        <span className="text-[30px] leading-none">{i + 1}</span>
        <span className="hidden min-h-[60px] w-1 rounded sm:block" style={{ background: c }} />
      </div>
      <div className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-[1.3rem] font-bold">{s.t}</h3>
          <span className="rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[hsl(222,45%,8%)]" style={{ background: c }}>{GZONES[s.z].l}</span>
          {s.tag && <Tag kind={s.tag[0]}>{s.tag[1]}</Tag>}
        </div>
        <p className="max-w-[72ch] text-[16px] text-white/92">{s.d}</p>
        <div className="flex flex-wrap gap-1.5">{s.feat.map((f) => <span key={f} className="rounded-full border border-white/[0.16] bg-[hsla(220,36%,13%,.78)] px-2.5 py-1 text-[12px] font-semibold text-white/90">{f}</span>)}</div>
        {s.results && (
          <div className="flex flex-wrap gap-1.5 font-mono text-[11.5px] font-semibold">
            {[["Won", COL.won], ["Another meeting first", COL.warm], ["Rescheduled", COL.cold], ["Lost + reason", COL.bad]].map(([t, cc]) => <span key={t} className="rounded-md border px-2 py-0.5" style={{ color: cc, borderColor: cc }}>{t}</span>)}
          </div>
        )}
        {kid && <Kid c={c}>{s.kid}</Kid>}
        <div className="flex flex-wrap gap-2">
          <Toggle on={kid} c={c} onClick={() => setKid((v) => !v)}>Say it simply</Toggle>
          <Toggle on={det} c={c} onClick={() => setDet((v) => !v)}>Full details <ChevronDown className={"ml-1 h-3.5 w-3.5 transition " + (det ? "rotate-180" : "")} /></Toggle>
        </div>
        {det && (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {s.boxes.map((bx) => (
              <div key={bx.h} className={surface + " min-w-0 p-3.5"}>
                <h4 className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white/75">{boxTitle(bx.h)}</h4>
                <ul className="grid gap-1.5">
                  {bx.items.map(([w, t]) => (
                    <li key={t} className={"relative pl-3.5 text-[14px] transition-opacity " + dim(w)}>
                      <span className="absolute left-0 top-[.6em] h-[7px] w-[7px] rounded-full" style={{ background: w ? WHO_C[w as Exclude<GWho, "">] : "rgba(255,255,255,.45)" }} />
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
    <p className="max-w-[72ch] rounded-xl border px-3.5 py-3 text-[16.5px]" style={{ borderColor: `color-mix(in srgb, ${c} 40%, transparent)`, background: `color-mix(in srgb, ${c} 20%, hsla(220,40%,9%,.85))` }}>
      <span className="mb-1 block font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: c }}>In simple words</span>
      {children}
    </p>
  );
}

function Toggle({ on, c, onClick, children }: { on: boolean; c: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-expanded={on} onClick={onClick}
      className="inline-flex min-h-[36px] items-center rounded-lg border bg-[hsla(220,40%,9%,.72)] px-3 text-[13.5px] font-semibold transition"
      style={on ? { borderColor: c, color: c } : { borderColor: "rgba(255,255,255,.16)" }}>
      {children}
    </button>
  );
}

function Info({ t, d, kid, allKid }: { t: string; d: string; kid: string; allKid: boolean }) {
  const [on, setOn] = useState(allKid);
  useEffect(() => setOn(allKid), [allKid]);
  return (
    <div className={surface + " grid content-start gap-1.5 p-4"}>
      <b className="text-[16px]">{t}</b>
      <p className="text-[14px] text-white/85">{d}</p>
      {on && <Kid c={COL.cold}>{kid}</Kid>}
      <button type="button" onClick={() => setOn((v) => !v)} aria-expanded={on} className="justify-self-start text-[12.5px] font-semibold text-white/75 hover:text-white">{on ? "Hide" : "Say it simply"}</button>
    </div>
  );
}
