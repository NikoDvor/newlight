import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SESSION_KEY = "nlIntroPlayed";

interface NewLightIntroProps {
  onComplete: () => void;
  launchLabel?: string;
}

export function NewLightIntro({ onComplete, launchLabel }: NewLightIntroProps) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
    setTimeout(onComplete, 300);
  }, [onComplete]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(finish, 4900),
    ];
    // Hard failsafe
    const failsafe = setTimeout(finish, 5000);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(failsafe);
    };
  }, [finish]);

  // Background transitions dark -> navy -> electric blue -> light
  const bg =
    phase === 1
      ? "#020814"
      : phase === 2
      ? "linear-gradient(180deg, #020814 0%, #0a1a3a 35%, #1e6fff 70%, #EDF6FF 100%)"
      : "#EDF6FF";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="nl-intro"
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            background: bg,
            transition: "background 1.5s ease",
          }}
        >
          {/* Phase 1: tagline */}
          <AnimatePresence>
            {phase === 1 && (
              <motion.h1
                key="tagline"
                className="text-center px-6 font-bold tracking-tight"
                style={{
                  color: "#FFFFFF",
                  fontSize: "clamp(1.5rem, 5vw, 3rem)",
                  textShadow: "0 0 40px rgba(170,221,255,0.4)",
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                WE BRING YOU READY-TO-BUY CUSTOMERS.
              </motion.h1>
            )}
          </AnimatePresence>

          {/* Phase 3: reveal content */}
          <AnimatePresence>
            {phase === 3 && (
              <motion.div
                key="reveal"
                className="flex flex-col items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <motion.p
                  className="text-xs font-semibold tracking-[0.25em] uppercase"
                  style={{ color: "#1e6fff" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  NewLight
                </motion.p>
                <motion.p
                  className="text-[11px] tracking-wider uppercase"
                  style={{ color: "rgba(10,30,70,0.55)" }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                >
                  {launchLabel || "Launching workspace…"}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skip */}
          <button
            onClick={finish}
            className="absolute bottom-5 right-5 z-20 text-[10px] font-medium tracking-wider uppercase px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: phase === 3 ? "rgba(10,30,70,0.5)" : "rgba(255,255,255,0.5)",
              background: phase === 3 ? "rgba(10,30,70,0.06)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${phase === 3 ? "rgba(10,30,70,0.12)" : "rgba(255,255,255,0.12)"}`,
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
