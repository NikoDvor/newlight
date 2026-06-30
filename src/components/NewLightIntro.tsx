import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import newlightLogo from "@/assets/newlight-logo.jpg";

const SESSION_KEY = "nl_intro_played";

interface NewLightIntroProps {
  onComplete: () => void;
  launchLabel?: string;
}

/**
 * Intro replicates newlightgen.com's `nl-phase` color sequence:
 *   #020814 (deep navy) → #041830 → #7ec8f0 → #edf6ff (icy light)
 * Compressed to ~3s with a final white flash and shockwave ring.
 */
export function NewLightIntro({ onComplete, launchLabel }: NewLightIntroProps) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);

  const finish = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, "1");
    window.dispatchEvent(new Event("nl-intro-complete"));
    setPhase(4);
    setTimeout(onComplete, 500);
  }, [onComplete]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 150);   // logo + tagline in (dark)
    const t2 = setTimeout(() => setPhase(2), 1400);  // shockwave + bolt flash
    const t3 = setTimeout(() => setPhase(3), 1900);  // whitewash transition
    const t4 = setTimeout(finish, 2900);
    const failsafe = setTimeout(finish, 5500);
    return () => [t1, t2, t3, t4, failsafe].forEach(clearTimeout);
  }, [finish]);

  // background color matches nl-phase keyframe stops
  const bg =
    phase >= 3 ? "#EDF6FF"
    : phase >= 2 ? "#7EC8F0"
    : "#020814";

  const fg = phase >= 3 ? "#001A3D" : "#FFFFFF";
  const lightening = phase >= 3;

  return (
    <AnimatePresence>
      <motion.div
        key="nl-intro"
        className="fixed inset-0 z-[99999] overflow-hidden flex flex-col items-center justify-center"
        initial={{ opacity: 1 }}
        animate={{ opacity: phase >= 4 ? 0 : 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          background: bg,
          transition: "background 700ms cubic-bezier(.4,0,.2,1)",
        }}
      >
        {/* Top radial glow (matches site --glow-tint) */}
        <div
          className="absolute inset-x-0 top-0 pointer-events-none"
          style={{
            height: "60vh",
            background: lightening
              ? "radial-gradient(ellipse 50% 100% at 50% 0%, rgba(0,180,255,0.18) 0%, transparent 70%)"
              : "radial-gradient(ellipse 50% 100% at 50% 0%, rgba(0,180,255,0.45) 0%, transparent 70%)",
            transition: "background 700ms ease",
          }}
        />

        {/* Shockwave ring at phase 2 */}
        {phase === 2 && (
          <div
            className="absolute left-1/2 top-1/2 rounded-full pointer-events-none"
            style={{
              width: 20,
              height: 20,
              border: "12px solid rgba(0,180,255,0.85)",
              transform: "translate(-50%,-50%)",
              animation: "nl-shockwave 0.9s cubic-bezier(.2,.8,.2,1) forwards",
            }}
          />
        )}
        <style>{`
          @keyframes nl-shockwave {
            0%   { opacity: .9; border-width: 12px; transform: translate(-50%,-50%) scale(0); }
            60%  { opacity: .5; border-width: 4px; }
            100% { opacity: 0;  border-width: 1px; transform: translate(-50%,-50%) scale(40); }
          }
        `}</style>

        {/* Logo + tagline */}
        <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">
          <motion.img
            src={newlightLogo}
            alt="NewLight"
            className="h-16 w-auto object-contain"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{
              opacity: phase >= 1 ? 1 : 0,
              scale: 1,
              filter: lightening
                ? "drop-shadow(0 0 10px rgba(0,180,255,0.45))"
                : "drop-shadow(0 0 30px rgba(0,180,255,0.85)) drop-shadow(0 0 60px rgba(0,180,255,0.4))",
            }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />

          <motion.p
            className="text-[11px] font-bold tracking-[0.32em] uppercase"
            style={{
              color: "#00B4FF",
              fontFamily: "'Rajdhani','Inter',system-ui,sans-serif",
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 8 }}
            transition={{ duration: 0.55, delay: 0.15 }}
          >
            // AI MODERN MARKETING SYSTEMS
          </motion.p>

          {launchLabel && phase >= 1 && (
            <motion.p
              className="text-[10px] tracking-wider uppercase"
              style={{ color: lightening ? "rgba(0,26,61,0.5)" : "rgba(255,255,255,0.45)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {launchLabel}
            </motion.p>
          )}
        </div>

        {/* Final white flash at phase 3 */}
        {phase === 3 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "#FFFFFF",
              animation: "nl-final-flash 0.9s ease-out forwards",
            }}
          />
        )}
        <style>{`
          @keyframes nl-final-flash {
            0% { opacity: 0; }
            20% { opacity: 0.9; }
            100% { opacity: 0; }
          }
        `}</style>

        {/* Skip */}
        <motion.button
          onClick={finish}
          className="absolute bottom-5 right-5 z-30 text-[10px] font-medium tracking-wider uppercase px-3 py-1.5 rounded-lg"
          style={{
            color: lightening ? "rgba(0,26,61,0.55)" : "rgba(255,255,255,0.5)",
            border: `1px solid ${lightening ? "rgba(0,26,61,0.18)" : "rgba(255,255,255,0.15)"}`,
            background: lightening ? "rgba(0,26,61,0.04)" : "rgba(255,255,255,0.04)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          Skip
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}

export default NewLightIntro;

export function shouldPlayIntro(): boolean {
  return !sessionStorage.getItem(SESSION_KEY);
}

export function resetIntroState() {
  sessionStorage.removeItem(SESSION_KEY);
}
