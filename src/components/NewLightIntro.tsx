import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import newlightLogo from "@/assets/newlight-logo.jpg";

const SESSION_KEY = "nl_intro_played";

interface NewLightIntroProps {
  onComplete: () => void;
  launchLabel?: string;
}

type Phase = 0 | 1 | 2 | 3 | 4 | 5;

export function NewLightIntro({ onComplete, launchLabel }: NewLightIntroProps) {
  const [phase, setPhase] = useState<Phase>(0);
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");
    window.dispatchEvent(new Event("nl-intro-complete"));
    setPhase(5);
    setTimeout(onComplete, 220);
  }, [onComplete]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),   // bg fades to dark + logo in
      setTimeout(() => setPhase(2), 1400),  // tagline + blue glow
      setTimeout(() => setPhase(3), 2200),  // scan line
      setTimeout(() => setPhase(4), 2800),  // fade out
      setTimeout(finish, 3000),
      setTimeout(finish, 5000),             // failsafe
    ];
    return () => timers.forEach(clearTimeout);
  }, [finish]);

  const isDark = phase >= 1;
  const showLogo = phase >= 1;
  const showTag = phase >= 2;
  const showScan = phase >= 3;
  const fading = phase >= 4;

  return (
    <AnimatePresence>
      <motion.div
        key="nl-intro"
        className="fixed inset-0 z-[99999] overflow-hidden flex flex-col items-center justify-center"
        initial={{ opacity: 1 }}
        animate={{ opacity: fading ? 0 : 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {/* Background color */}
        <motion.div
          className="absolute inset-0"
          initial={{ backgroundColor: "#ffffff" }}
          animate={{ backgroundColor: isDark ? "hsl(218,42%,5%)" : "#ffffff" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />

        {/* Light burst */}
        <motion.div
          className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
          style={{
            width: 400,
            height: 400,
            marginLeft: -200,
            marginTop: -200,
            background:
              "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.6) 30%, rgba(255,255,255,0) 70%)",
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />

        {/* Logo + tagline */}
        <div className="relative z-10 flex flex-col items-center gap-5">
          <motion.img
            src={newlightLogo}
            alt="NewLight"
            className="h-20 w-auto object-contain"
            initial={{
              opacity: 0,
              scale: 0.94,
              filter: "drop-shadow(0 0 40px rgba(255,255,255,0.9))",
            }}
            animate={{
              opacity: showLogo ? 1 : 0,
              scale: 1,
              filter: showTag
                ? "drop-shadow(0 0 40px hsla(211,96%,60%,0.8)) drop-shadow(0 0 80px hsla(197,92%,68%,0.5))"
                : showLogo
                  ? "drop-shadow(0 0 40px rgba(255,255,255,0.95))"
                  : "drop-shadow(0 0 40px rgba(255,255,255,0.9))",
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />

          <motion.p
            className="text-xs font-bold tracking-[0.25em] uppercase"
            style={{ color: "hsl(211,96%,68%)" }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: showTag ? 1 : 0, y: showTag ? 0 : 6 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            NEW EYES TO ROI
          </motion.p>

          {launchLabel && showTag && (
            <motion.p
              className="text-[10px] tracking-wider uppercase text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {launchLabel}
            </motion.p>
          )}
        </div>

        {/* Scan line */}
        {showScan && (
          <motion.div
            className="absolute left-0 right-0 z-20 pointer-events-none"
            style={{
              height: 2,
              background:
                "linear-gradient(90deg, transparent, hsla(211,96%,70%,1) 50%, transparent)",
              boxShadow: "0 0 30px 6px hsla(211,96%,60%,0.8)",
            }}
            initial={{ top: "-2px" }}
            animate={{ top: "105vh" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        )}

        {/* Skip */}
        <motion.button
          onClick={finish}
          className="absolute bottom-5 right-5 z-30 text-[10px] font-medium tracking-wider uppercase px-3 py-1.5 rounded-lg"
          style={{
            color: "rgba(255,255,255,0.3)",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: showLogo ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          Skip
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}

export default NewLightIntro;

/** Check if intro should play this session */
export function shouldPlayIntro(): boolean {
  return !sessionStorage.getItem(SESSION_KEY);
}

/** Reset intro state (for "Replay Intro" button) */
export function resetIntroState() {
  sessionStorage.removeItem(SESSION_KEY);
}
