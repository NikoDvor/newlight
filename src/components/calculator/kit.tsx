import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import type { Period } from "@/lib/discoveryNumbers";

/** Shared look for the Calculator: deep navy glass, electric-blue glow, gold for goals. */
export const C = {
  sky: "hsl(197,100%,62%)",
  blue: "hsl(211,96%,62%)",
  ice: "hsl(205,100%,92%)",
  gold: "hsl(42,96%,63%)",
  green: "hsl(152,62%,55%)",
  red: "hsl(0,72%,66%)",
  violet: "hsl(262,85%,74%)",
};

export const glass =
  "rounded-2xl border border-[hsla(211,96%,60%,.18)] bg-[linear-gradient(155deg,hsla(215,42%,11%,.9),hsla(222,44%,6%,.94)_60%,hsla(211,60%,10%,.88))] shadow-[0_24px_60px_-32px_hsla(211,96%,50%,.6),inset_0_1px_0_hsla(211,96%,80%,.08)]";
export const glassSoft = "rounded-xl border border-[hsla(211,96%,60%,.12)] bg-[hsla(215,38%,10%,.62)]";

export const money = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "—" : `$${Math.round(n).toLocaleString("en-US")}`;
export const moneyShort = (n: number | null | undefined) => {
  if (n == null || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace(/\.0+$/, "")}M`;
  if (a >= 1e4) return `$${Math.round(n / 1e3)}K`;
  return money(n);
};
export const numFmt = (n: number | null | undefined, d = 0) =>
  n == null || !Number.isFinite(n) ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: d });
export const pct = (n: number | null | undefined, d = 1) =>
  n == null || !Number.isFinite(n) ? "—" : `${(n * 100).toFixed(d).replace(/\.0$/, "")}%`;

/** Number that counts from its last value to the new one. */
export function CountUp({ value, format, className, style }: { value: number | null; format: (n: number) => string; className?: string; style?: React.CSSProperties }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value ?? 0);
  const from = useRef(value ?? 0);
  useEffect(() => {
    if (value == null) return;
    if (reduced) { setShown(value); from.current = value; return; }
    const start = performance.now(), a = from.current, b = value, dur = 650;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - k, 3);
      setShown(a + (b - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = b; };
  }, [value, reduced]);
  return <span className={className} style={style}>{value == null ? "—" : format(shown)}</span>;
}

const parseNum = (s: string): number | null => {
  const n = Number(String(s).replace(/[^0-9.]/g, ""));
  return s.trim() === "" || !Number.isFinite(n) ? null : n;
};

export function PeriodSwitch({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-white/10 text-[11px] font-semibold" role="group" aria-label="Per month or per year">
      {(["month", "year"] as const).map((p) => (
        <button key={p} type="button" onClick={() => onChange(p)} aria-pressed={value === p}
          className={`px-2.5 py-1 transition ${value === p ? "bg-[hsla(197,100%,55%,.22)] text-white" : "text-white/45 hover:text-white/80"}`}>
          {p === "month" ? "/mo" : "/yr"}
        </button>
      ))}
    </div>
  );
}

/** A blank the salesman fills in while the prospect talks. */
export function Blank({ label, value, onChange, money: isMoney, period, onPeriod, suffix, id }: {
  label: string; value: number | null | undefined; onChange: (v: number | null) => void;
  money?: boolean; period?: Period; onPeriod?: (p: Period) => void; suffix?: string; id: string;
}) {
  const [draft, setDraft] = useState(value == null ? "" : Number(value).toLocaleString("en-US"));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(value == null ? "" : Number(value).toLocaleString("en-US")); }, [value]);
  const filled = value != null;
  return (
    <div className={`group relative rounded-xl border px-3.5 py-2.5 transition ${filled ? "border-[hsla(197,100%,60%,.45)] bg-[hsla(197,100%,55%,.07)] shadow-[0_0_24px_-10px_hsla(197,100%,60%,.6)]" : "border-dashed border-white/20 bg-white/[0.03] focus-within:border-[hsla(197,100%,60%,.6)]"}`}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">{label}</label>
        {period && onPeriod && <PeriodSwitch value={period} onChange={onPeriod} />}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        {isMoney && <span className="text-xl font-semibold text-white/35">$</span>}
        <input id={id} inputMode="decimal" value={draft} placeholder="____" autoComplete="off"
          onFocus={() => { focused.current = true; }}
          onBlur={() => { focused.current = false; setDraft(value == null ? "" : Number(value).toLocaleString("en-US")); }}
          onChange={(e) => { const v = e.target.value.replace(/[^0-9.,]/g, ""); setDraft(v); onChange(parseNum(v.replace(/,/g, ""))); }}
          className="w-full min-w-0 bg-transparent text-2xl font-bold tabular-nums text-white outline-none placeholder:text-white/20" />
        {suffix && <span className="shrink-0 text-xs text-white/40">{suffix}</span>}
      </div>
    </div>
  );
}

/** Small inline number box used inside the Growth Tree and levers. */
export function MiniInput({ value, onChange, label, prefix, width = "w-24" }: { value: number; onChange: (v: number) => void; label: string; prefix?: string; width?: string }) {
  const [draft, setDraft] = useState(String(Math.round(value * 100) / 100));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(String(Math.round(value * 100) / 100)); }, [value]);
  return (
    <span className={`inline-flex items-center rounded-lg border border-white/12 bg-black/30 px-2 py-1 ${width}`}>
      {prefix && <span className="mr-0.5 text-[12px] text-white/40">{prefix}</span>}
      <input aria-label={label} inputMode="decimal" value={draft}
        onFocus={() => { focused.current = true; }} onBlur={() => { focused.current = false; }}
        onChange={(e) => { setDraft(e.target.value); const n = parseNum(e.target.value); if (n != null) onChange(n); }}
        className="w-full min-w-0 bg-transparent text-right text-[13px] font-semibold tabular-nums text-white outline-none" />
    </span>
  );
}

/** Native range styled as a glowing track (big thumb for phones). */
export function GlowSlider({ value, min, max, step, onChange, label, color = C.sky }: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void; label: string; color?: string;
}) {
  const p = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
  return (
    <input type="range" aria-label={label} min={min} max={max} step={step} value={Math.max(min, Math.min(max, value))}
      onChange={(e) => onChange(Number(e.target.value))}
      className="calc-range w-full"
      style={{ ["--p" as any]: `${p}%`, ["--c" as any]: color }} />
  );
}

export function SaveDot({ state, practice }: { state: string; practice: boolean }) {
  if (practice) return <span className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(42,96%,63%)]">Practice · not saved</span>;
  const map: Record<string, [string, string]> = {
    saving: ["Saving…", "text-white/50"], saved: ["Saved to this client", "text-[hsl(152,62%,60%)]"],
    error: ["Not saved — check connection", "text-[hsl(0,72%,70%)]"], idle: ["", ""],
  };
  const [t, cls] = map[state] || map.idle;
  return t ? <span className={`text-[11px] font-medium ${cls}`} aria-live="polite">{t}</span> : null;
}

export function CalcStyles() {
  return (
    <style>{`
.calc-range{-webkit-appearance:none;appearance:none;height:28px;background:transparent;cursor:pointer}
.calc-range::-webkit-slider-runnable-track{height:6px;border-radius:99px;background:linear-gradient(90deg,var(--c) 0,var(--c) var(--p),hsla(0,0%,100%,.1) var(--p));box-shadow:0 0 14px -2px var(--c)}
.calc-range::-moz-range-track{height:6px;border-radius:99px;background:linear-gradient(90deg,var(--c) 0,var(--c) var(--p),hsla(0,0%,100%,.1) var(--p))}
.calc-range::-webkit-slider-thumb{-webkit-appearance:none;margin-top:-9px;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,var(--c));box-shadow:0 0 0 4px hsla(0,0%,100%,.08),0 0 20px var(--c);transition:transform .15s}
.calc-range::-moz-range-thumb{width:22px;height:22px;border:0;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff,var(--c));box-shadow:0 0 20px var(--c)}
.calc-range:active::-webkit-slider-thumb{transform:scale(1.15)}
.calc-range:focus-visible{outline:2px solid var(--c);outline-offset:4px;border-radius:8px}
@keyframes calc-flow{to{stroke-dashoffset:-48}}
.calc-flow{stroke-dasharray:6 18;animation:calc-flow 1.6s linear infinite}
@keyframes calc-pulse{0%,100%{opacity:.55}50%{opacity:1}}
.calc-pulse{animation:calc-pulse 2.6s ease-in-out infinite}
@keyframes calc-sheen{0%{transform:translateX(-120%)}60%,100%{transform:translateX(220%)}}
.calc-sheen{position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none}
.calc-sheen::after{content:"";position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(100deg,transparent,hsla(197,100%,80%,.18),transparent);animation:calc-sheen 3.8s ease-in-out infinite}
.calc-grid{background-image:linear-gradient(hsla(211,96%,60%,.06) 1px,transparent 1px),linear-gradient(90deg,hsla(211,96%,60%,.06) 1px,transparent 1px);background-size:28px 28px;mask-image:radial-gradient(ellipse at 50% 30%,#000 30%,transparent 75%)}
@media (prefers-reduced-motion:reduce){.calc-flow,.calc-pulse,.calc-sheen::after{animation:none}}
`}</style>
  );
}

export function Kick({ children, color = "rgba(255,255,255,.5)" }: { children: ReactNode; color?: string }) {
  return <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em]" style={{ color }}>{children}</p>;
}
