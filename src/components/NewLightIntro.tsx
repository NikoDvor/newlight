import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import newlightLogo from "@/assets/newlight-logo.jpg";

const SESSION_KEY = "nl_intro_played";

interface NewLightIntroProps {
  onComplete: () => void;
  launchLabel?: string;
}

type Phase = 0 | 1 | 2 | 3 | 4;

// 12 breathing light orbs
const ORBS = Array.from({ length: 12 }).map((_, i) => {
  const size = 80 + ((i * 37) % 121); // 80–200
  return {
    size,
    top: `${(i * 53) % 90}%`,
    left: `${(i * 71) % 90}%`,
    delay: (i % 6) * 0.4,
    duration: 6 + (i % 4),
  };
});

export function NewLightIntro({ onComplete, launchLabel }: NewLightIntroProps) {
  const [phase, setPhase] = useState<Phase>(0);
  const [visible, setVisible] = useState(true);
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");
    window.dispatchEvent(new Event("nl-intro-complete"));
    setVisible(false);
    setTimeout(onComplete, 400);
  }, [onComplete]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);   // light bg + logo
    const t2 = setTimeout(() => setPhase(2), 1200);  // transition to dark
    const t3 = setTimeout(() => setPhase(3), 2000);  // scan line
    const t4 = setTimeout(() => setPhase(4), 2500);  // fade out
    const t5 = setTimeout(finish, 2900);
    const failsafe = setTimeout(finish, 5000);
    return () => {
      [t1, t2, t3, t4, t5, failsafe].forEach(clearTimeout);
    };
  }, [finish]);

  const showLogo = phase >= 1;
  const isDark = phase >= 2;
  const isLight = phase >= 1 && phase < 2;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="nl-intro"
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          animate={{ opacity: phase >= 4 ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Background color layer with smooth transition */}
          <motion.div
            className="absolute inset-0"
            initial={{ background: "hsl(0,0%,100%)" }}
            animate={{
              background: isDark ? "hsl(218,42%,5%)" : "hsl(0,0%,100%)",
            }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
          />

          {/* Light-phase breathing orbs */}
          <AnimatePresence>
            {isLight && (
              <motion.div
                key="orbs"
                className="absolute inset-0 nl-animated-bg overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                {ORBS.map((o, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      width: o.size,
                      height: o.size,
                      top: o.top,
                      left: o.left,
                      background:
                        "radial-gradient(circle, hsla(211,96%,85%,.3), transparent 70%)",
                      filter: "blur(50px)",
                    }}
                    animate={{
                      opacity: [0.15, 0.4, 0.15],
                      x: [0, 20, 0],
                      y: [0, -15, 0],
                    }}
                    transition={{
                      duration: o.duration,
                      delay: o.delay,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logo + tagline */}
          <div className="relative z-10 flex flex-col items-center gap-5">
            <motion.img
              src={newlightLogo}
              alt="NewLight"
              className="h-20 w-auto object-contain"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{
                opacity: showLogo ? 1 : 0,
                scale: showLogo ? 1 : 0.92,
                filter: isDark
                  ? "drop-shadow(0 0 30px hsla(211,96%,60%,.85)) drop-shadow(0 0 60px hsla(197,92%,68%,.5))"
                  : "drop-shadow(0 0 24px hsla(45,90%,80%,.7)) drop-shadow(0 0 48px hsla(40,80%,85%,.4))",
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />

            <AnimatePresence>
              {isDark && (
                <motion.p
                  key="tag"
                  className="text-xs font-bold tracking-[0.35em] uppercase"
                  style={{ color: "hsl(197,92%,72%)" }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  NEW EYES TO ROI
                </motion.p>
              )}
            </AnimatePresence>

            {launchLabel && phase >= 3 && (
              <motion.p
                className="text-[10px] tracking-wider uppercase text-white/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {launchLabel}
              </motion.p>
            )}
          </div>

          {/* Electric scan line */}
          <AnimatePresence>
            {phase >= 3 && (
              <motion.div
                key="scan"
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{
                  height: 2,
                  background:
                    "linear-gradient(90deg, transparent, hsl(211,96%,65%), hsl(197,92%,72%), hsl(211,96%,65%), transparent)",
                  boxShadow:
                    "0 0 24px hsla(211,96%,60%,.9), 0 0 48px hsla(197,92%,68%,.6)",
                }}
                initial={{ top: -2, opacity: 0 }}
                animate={{ top: "105%", opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
            )}
          </AnimatePresence>

          {/* Skip */}
          <button
            onClick={finish}
            className="absolute bottom-5 right-5 z-30 text-[10px] font-medium tracking-wider uppercase px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: isDark ? "rgba(255,255,255,0.5)" : "rgba(10,30,70,0.5)",
              background: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(10,30,70,0.06)",
              border: `1px solid ${
                isDark ? "rgba(255,255,255,0.12)" : "rgba(10,30,70,0.12)"
              }`,
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
