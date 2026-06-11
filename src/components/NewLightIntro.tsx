import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SESSION_KEY = "nlIntroPlayed";

interface NewLightIntroProps {
  onComplete: () => void;
  launchLabel?: string;
}

type Phase = "tagline" | "transition" | "reveal" | "done";

// Lerp two hex colors in RGB space
const lerpColor = (a: [number, number, number], b: [number, number, number], t: number) => {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
};

const STOPS: [number, [number, number, number]][] = [
  [0.00, [0x02, 0x08, 0x14]], // #020814
  [0.33, [0x0d, 0x1f, 0x3c]], // #0d1f3c
  [0.66, [0x1a, 0x4a, 0x8a]], // #1a4a8a
  [1.00, [0xed, 0xf6, 0xff]], // #EDF6FF
];

const colorAt = (p: number): string => {
  const t = Math.max(0, Math.min(1, p));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i];
    const [t1, c1] = STOPS[i + 1];
    if (t <= t1) {
      const local = (t - t0) / (t1 - t0);
      return lerpColor(c0, c1, local);
    }
  }
  return lerpColor(STOPS[0][1], STOPS[STOPS.length - 1][1], 1);
};

export function NewLightIntro({ onComplete, launchLabel }: NewLightIntroProps) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<Phase>("tagline");
  const [bgColor, setBgColor] = useState<string>("#020814");
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");
    window.dispatchEvent(new Event("nl-intro-complete"));
    setVisible(false);
    setTimeout(onComplete, 280);
  }, [onComplete]);

  // Phase scheduling
  useEffect(() => {
    // Surge at t=0 (tagline appears with dramatic burst)
    window.dispatchEvent(new Event("nl-intro-surge"));

    const t1 = setTimeout(() => setPhase("transition"), 1000); // 1.0s: text begins fading
    const t2 = setTimeout(() => {
      setPhase("reveal");
      // Dramatic surge at 2.2s
      window.dispatchEvent(new Event("nl-intro-surge"));
    }, 2200);
    const t3 = setTimeout(finish, 2800);
    const failsafe = setTimeout(finish, 5000);

    return () => {
      [t1, t2, t3, failsafe].forEach(clearTimeout);
    };
  }, [finish]);

  // Smooth background color interpolation via rAF (1.0s -> 2.2s)
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const transitionStart = 1000;
    const transitionEnd = 2200;
    const total = transitionEnd; // ms

    const tick = () => {
      const elapsed = performance.now() - start;
      if (elapsed < transitionStart) {
        setBgColor("#020814");
      } else if (elapsed >= total) {
        setBgColor("#EDF6FF");
        return;
      } else {
        const p = (elapsed - transitionStart) / (transitionEnd - transitionStart);
        setBgColor(colorAt(p));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="nl-intro"
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{ background: bgColor }}
        >
          {/* Tagline: 0.0 - 1.0s visible, fades out by 1.3s */}
          <AnimatePresence>
            {(phase === "tagline" || phase === "transition") && (
              <motion.h1
                key="tagline"
                className="text-center px-6 font-bold tracking-tight"
                style={{
                  color: "#FFFFFF",
                  fontSize: "clamp(28px, 5vw, 48px)",
                  textShadow: "0 0 40px rgba(170,221,255,0.5)",
                }}
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{
                  opacity: phase === "transition" ? 0 : 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{ opacity: 0, y: -6 }}
                transition={{
                  duration: phase === "transition" ? 0.3 : 0.6,
                  ease: "easeOut",
                }}
              >
                WE BRING YOU READY-TO-BUY CUSTOMERS.
              </motion.h1>
            )}
          </AnimatePresence>

          {/* Reveal: staggered children at 2.2s */}
          <AnimatePresence>
            {phase === "reveal" && (
              <motion.div
                key="reveal"
                className="flex flex-col items-center gap-3"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.08 } },
                }}
              >
                {[
                  <p
                    key="brand"
                    className="text-xs font-semibold tracking-[0.25em] uppercase"
                    style={{ color: "#1e6fff" }}
                  >
                    NewLight
                  </p>,
                  <p
                    key="label"
                    className="text-[11px] tracking-wider uppercase"
                    style={{ color: "rgba(10,30,70,0.55)" }}
                  >
                    {launchLabel || "Launching workspace…"}
                  </p>,
                ].map((child, i) => (
                  <motion.div
                    key={i}
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
                    }}
                  >
                    {child}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skip */}
          <button
            onClick={finish}
            className="absolute bottom-5 right-5 z-20 text-[10px] font-medium tracking-wider uppercase px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: phase === "reveal" ? "rgba(10,30,70,0.5)" : "rgba(255,255,255,0.5)",
              background: phase === "reveal" ? "rgba(10,30,70,0.06)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${phase === "reveal" ? "rgba(10,30,70,0.12)" : "rgba(255,255,255,0.12)"}`,
            }}
          >
            Skip
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Check if intro should play this session */
export function shouldPlayIntro(): boolean {
  return !sessionStorage.getItem(SESSION_KEY);
}

/** Reset intro state (for "Replay Intro" button) */
export function resetIntroState() {
  sessionStorage.removeItem(SESSION_KEY);
}
