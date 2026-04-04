import { useMemo } from "react";
import { motion } from "framer-motion";

/* ── Neural grid + streaks + orbs + lightning + scanline + energy pulses ── */
/* This renders behind ALL pages via AppLayout / AdminLayout */

function LightningStreaks() {
  const streaks = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    id: i,
    top: `${8 + i * 11}%`,
    width: `${120 + Math.random() * 260}px`,
    duration: 18 + Math.random() * 16,
    delay: i * 2.5 + Math.random() * 3,
    opacity: 0.04 + Math.random() * 0.06,
  })), []);

  return (
    <div className="dash-streaks">
      {streaks.map(s => (
        <div key={s.id} className="dash-streak" style={{
          top: s.top, width: s.width, opacity: s.opacity,
          animation: `dash-streak-drift ${s.duration}s linear ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

function EnergyPulses() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute left-0 right-0"
          style={{
            top: `${25 + i * 30}%`,
            height: "1px",
            background: `linear-gradient(90deg, transparent 0%, hsla(211,96%,60%,${0.03 + i * 0.015}) 30%, hsla(197,88%,55%,${0.04 + i * 0.01}) 50%, hsla(211,96%,60%,${0.03 + i * 0.015}) 70%, transparent 100%)`,
          }}
          animate={{ opacity: [0, 0.5, 0], scaleX: [0.3, 1, 0.3] }}
          transition={{ duration: 10 + i * 4, repeat: Infinity, delay: i * 3, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function ForegroundFragments() {
  const fragments = useMemo(() => [
    { type: "rect", top: "14%", left: "6%", w: 20, h: 20, delay: 0, dur: 24 },
    { type: "rect", top: "30%", left: "85%", w: 14, h: 28, delay: 5, dur: 20 },
    { type: "ring", top: "20%", left: "74%", size: 40, delay: 2, dur: 11 },
    { type: "ring", top: "60%", left: "90%", size: 28, delay: 4, dur: 13 },
    { type: "ring", top: "42%", left: "4%", size: 36, delay: 0, dur: 10 },
    { type: "rect", top: "75%", left: "48%", w: 16, h: 24, delay: 7, dur: 22 },
  ], []);

  return (
    <div className="dash-foreground-layer">
      {fragments.map((f, i) =>
        f.type === "rect" ? (
          <div key={i} className="dash-geo-fragment" style={{
            top: f.top, left: f.left, width: f.w, height: f.h,
            animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`,
          }} />
        ) : (
          <div key={i} className="dash-geo-ring" style={{
            top: f.top, left: f.left, width: f.size, height: f.size,
            animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`,
          }} />
        )
      )}
    </div>
  );
}

export function GlobalAtmosphere() {
  return (
    <>
      {/* Layer 1: Neural grid */}
      <div className="dash-neural-grid" />

      {/* Layer 2: Drifting streaks */}
      <LightningStreaks />

      {/* Layer 3: Glow orbs */}
      <div className="dash-orb dash-orb--primary" />
      <div className="dash-orb dash-orb--cyan" />
      <div className="dash-orb dash-orb--secondary" />

      {/* Layer 4: Foreground fragments */}
      <ForegroundFragments />

      {/* Scanline */}
      <div className="dash-scanline" />

      {/* Lightning flicker */}
      <div className="dash-lightning" />

      {/* Energy pulses */}
      <EnergyPulses />
    </>
  );
}
