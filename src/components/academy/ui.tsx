import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { Audience } from "@/lib/academy";

/** Shared look for the training screens. Solid translucent panels (no backdrop-blur over the moving background). */
export const ACADEMY = {
  panel: "rounded-2xl border border-[hsla(211,96%,60%,.16)] bg-[hsla(222,40%,8%,.82)] shadow-[0_0_0_1px_hsla(211,96%,60%,.04),0_12px_40px_-18px_hsla(211,96%,50%,.45)]",
  panelSoft: "rounded-xl border border-white/[0.07] bg-white/[0.035]",
  electric: "hsl(197,100%,55%)",
  blue: "hsl(211,96%,60%)",
  sdr: "hsl(262,85%,74%)",
};

export function AudienceTag({ audience, className = "" }: { audience: Audience; className?: string }) {
  if (audience === "all") return null;
  const bdr = audience === "bdr";
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-[0.12em] ${className}`}
      style={{
        color: bdr ? ACADEMY.electric : ACADEMY.sdr,
        background: bdr ? "hsla(197,100%,55%,.12)" : "hsla(262,85%,74%,.12)",
        boxShadow: `inset 0 0 0 1px ${bdr ? "hsla(197,100%,55%,.3)" : "hsla(262,85%,74%,.3)"}`,
      }}
    >
      {bdr ? "BDR" : "SDR"}
    </span>
  );
}

/** A thin progress line with a light that travels along the filled part. */
export function GlowBar({ pct, className = "", height = 4 }: { pct: number; className?: string; height?: number }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div className={`relative w-full overflow-hidden rounded-full bg-white/[0.06] ${className}`} style={{ height }}>
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: "linear-gradient(90deg, hsl(211,96%,52%), hsl(197,100%,58%))", boxShadow: "0 0 12px hsla(197,100%,55%,.6)" }}
        initial={{ width: 0 }}
        animate={{ width: `${p}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      {p > 0 && p < 100 && (
        <motion.div
          className="absolute inset-y-0 w-16 nl-academy-sheen"
          style={{ background: "linear-gradient(90deg, transparent, hsla(197,100%,85%,.7), transparent)" }}
          initial={{ left: "-10%" }}
          animate={{ left: [`-10%`, `${p}%`] }}
          transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

/** Small uppercase label like the website ("// THE OFFER"). */
export function Kicker({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`text-[10px] font-semibold uppercase tracking-[0.32em] text-[hsl(197,100%,60%)] ${className}`}>// {children}</div>;
}

/** Panel whose top border breathes. */
export function AlivePanel({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={`relative overflow-hidden ${ACADEMY.panel} ${className}`} onClick={onClick}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px nl-academy-breathe"
        style={{ background: "linear-gradient(90deg, transparent, hsla(197,100%,60%,.9), transparent)" }} />
      {children}
    </div>
  );
}

/** Global CSS for the training screens (keyframes). Rendered once by each academy page. */
export function AcademyStyles() {
  return (
    <style>{`
      @keyframes nlBreathe { 0%,100% { opacity:.25 } 50% { opacity:1 } }
      .nl-academy-breathe { animation: nlBreathe 5.5s ease-in-out infinite; }
      @keyframes nlFlow { from { stroke-dashoffset: 0 } to { stroke-dashoffset: -40 } }
      .nl-academy-flow { stroke-dasharray: 6 14; animation: nlFlow 2.2s linear infinite; }
      @media (prefers-reduced-motion: reduce) {
        .nl-academy-breathe, .nl-academy-flow, .nl-academy-sheen { animation: none !important; }
      }
    `}</style>
  );
}
