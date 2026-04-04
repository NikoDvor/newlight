import { useMemo, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/* ═══════════════════════════════════════════════════════
   GLOBAL ATMOSPHERE — Electric Blue AI Command Center
   Renders behind ALL pages via AppLayout / AdminLayout
   4 layers + lightning + energy pulses + flickers
   ═══════════════════════════════════════════════════════ */

/* ── Layer 2: Lightning Streaks (brighter, sharper) ── */
function LightningStreaks() {
  const streaks = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        top: `${5 + i * 7}%`,
        width: `${140 + Math.random() * 320}px`,
        duration: 10 + Math.random() * 12,
        delay: i * 1.4 + Math.random() * 2,
        opacity: 0.08 + Math.random() * 0.12,
        height: 1 + Math.random() * 1.5,
      })),
    []
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      {streaks.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full"
          style={{
            top: s.top,
            left: "-10%",
            width: s.width,
            height: `${s.height}px`,
            opacity: s.opacity,
            background:
              "linear-gradient(90deg, transparent, hsla(211,96%,60%,.6) 30%, hsla(197,88%,65%,.8) 50%, hsla(211,96%,60%,.6) 70%, transparent)",
            filter: `blur(${0.5 + Math.random()}px)`,
            boxShadow: `0 0 ${8 + Math.random() * 12}px hsla(211,96%,60%,.3)`,
            animation: `atmo-streak ${s.duration}s linear ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Layer 3: Glow Orbs (larger, brighter) ── */
function GlowOrbs() {
  const orbs = useMemo(
    () => [
      { cx: "15%", cy: "20%", size: 320, color: "211,96%,60%", opacity: 0.12, dur: 22 },
      { cx: "75%", cy: "35%", size: 260, color: "197,88%,55%", opacity: 0.1, dur: 18 },
      { cx: "50%", cy: "70%", size: 280, color: "211,80%,50%", opacity: 0.08, dur: 25 },
      { cx: "85%", cy: "15%", size: 200, color: "197,90%,60%", opacity: 0.09, dur: 20 },
      { cx: "30%", cy: "80%", size: 240, color: "211,96%,60%", opacity: 0.07, dur: 28 },
    ],
    []
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      {orbs.map((o, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: o.cx,
            top: o.cy,
            width: o.size,
            height: o.size,
            background: `radial-gradient(circle, hsla(${o.color},${o.opacity}) 0%, transparent 70%)`,
            filter: "blur(40px)",
          }}
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -25, 15, -10, 0],
            scale: [1, 1.15, 0.95, 1.08, 1],
          }}
          transition={{
            duration: o.dur,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ── Energy Pulses (wider, brighter horizontal lines) ── */
function EnergyPulses() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[2] overflow-hidden">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="absolute left-0 right-0"
          style={{
            top: `${15 + i * 18}%`,
            height: "2px",
            background: `linear-gradient(90deg, transparent 0%, hsla(211,96%,60%,${0.08 + i * 0.03}) 20%, hsla(197,88%,60%,${0.12 + i * 0.02}) 50%, hsla(211,96%,60%,${0.08 + i * 0.03}) 80%, transparent 100%)`,
            filter: "blur(1px)",
            boxShadow: `0 0 12px hsla(211,96%,60%,${0.06 + i * 0.02})`,
          }}
          animate={{
            opacity: [0, 0.7, 0.3, 0.8, 0],
            scaleX: [0.2, 1.1, 0.6, 1, 0.2],
          }}
          transition={{
            duration: 6 + i * 2,
            repeat: Infinity,
            delay: i * 1.5,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ── Lightning Flickers (quick flashes) ── */
function LightningFlickers() {
  const [flicker, setFlicker] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFlicker(true);
      setTimeout(() => setFlicker(false), 80 + Math.random() * 120);
    }, 3000 + Math.random() * 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[3] transition-opacity duration-75"
      style={{
        opacity: flicker ? 0.06 : 0,
        background:
          "radial-gradient(ellipse 60% 40% at 50% 30%, hsla(211,96%,70%,.4), transparent 70%)",
      }}
    />
  );
}

/* ── Foreground Fragments (geometric, more visible) ── */
function ForegroundFragments() {
  const fragments = useMemo(
    () => [
      { type: "rect", top: "12%", left: "5%", w: 24, h: 24, delay: 0, dur: 20 },
      { type: "rect", top: "28%", left: "88%", w: 18, h: 32, delay: 4, dur: 16 },
      { type: "ring", top: "18%", left: "72%", size: 48, delay: 2, dur: 9 },
      { type: "ring", top: "55%", left: "92%", size: 36, delay: 3, dur: 11 },
      { type: "ring", top: "40%", left: "3%", size: 44, delay: 1, dur: 8 },
      { type: "rect", top: "72%", left: "45%", w: 20, h: 28, delay: 6, dur: 18 },
      { type: "ring", top: "78%", left: "15%", size: 32, delay: 5, dur: 14 },
      { type: "rect", top: "85%", left: "70%", w: 16, h: 16, delay: 2, dur: 22 },
    ],
    []
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-[2] overflow-hidden">
      {fragments.map((f, i) =>
        f.type === "rect" ? (
          <motion.div
            key={i}
            className="absolute border rounded-sm"
            style={{
              top: f.top,
              left: f.left,
              width: f.w,
              height: f.h,
              borderColor: "hsla(211,96%,60%,.15)",
              background: "hsla(211,96%,60%,.03)",
            }}
            animate={{
              y: [0, -15, 5, -8, 0],
              rotate: [0, 3, -2, 1, 0],
              opacity: [0.3, 0.6, 0.25, 0.5, 0.3],
            }}
            transition={{ duration: f.dur, repeat: Infinity, delay: f.delay, ease: "easeInOut" }}
          />
        ) : (
          <motion.div
            key={i}
            className="absolute rounded-full border"
            style={{
              top: f.top,
              left: f.left,
              width: f.size,
              height: f.size,
              borderColor: "hsla(197,88%,55%,.12)",
            }}
            animate={{
              scale: [1, 1.2, 0.9, 1.1, 1],
              opacity: [0.2, 0.5, 0.15, 0.4, 0.2],
            }}
            transition={{ duration: f.dur, repeat: Infinity, delay: f.delay, ease: "easeInOut" }}
          />
        )
      )}
    </div>
  );
}

/* ── Scroll-Reactive Intensity Overlay ── */
function ScrollIntensity() {
  const { scrollY } = useScroll();
  const glowOpacity = useTransform(scrollY, [0, 800, 2000], [0, 0.03, 0.08]);

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-[2]"
      style={{
        opacity: glowOpacity,
        background:
          "radial-gradient(ellipse 80% 50% at 50% 40%, hsla(211,96%,60%,.5), transparent 70%)",
      }}
    />
  );
}

/* ── Main Export ── */
export function GlobalAtmosphere() {
  return (
    <>
      {/* Layer 1: Neural grid */}
      <div className="dash-neural-grid" />

      {/* Layer 2: Lightning streaks */}
      <LightningStreaks />

      {/* Layer 3: Glow orbs */}
      <GlowOrbs />

      {/* Layer 4: Foreground fragments */}
      <ForegroundFragments />

      {/* Energy pulses */}
      <EnergyPulses />

      {/* Quick lightning flickers */}
      <LightningFlickers />

      {/* Scanline */}
      <div className="dash-scanline" />

      {/* Scroll-reactive glow */}
      <ScrollIntensity />
    </>
  );
}
