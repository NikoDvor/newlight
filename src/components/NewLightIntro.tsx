import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import newlightLogo from "@/assets/newlight-logo.jpg";

const SESSION_KEY = "nl_intro_played";

interface NewLightIntroProps {
  onComplete: () => void;
}

export function NewLightIntro({ onComplete }: NewLightIntroProps) {
  const [phase, setPhase] = useState<"grid" | "logo" | "badge" | "exit">("grid");

  const skip = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, "1");
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("logo"), 400);
    const t2 = setTimeout(() => setPhase("badge"), 1400);
    const t3 = setTimeout(() => setPhase("exit"), 2600);
    const t4 = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, "1");
      onComplete();
    }, 3100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "exit" ? null : null}
      <motion.div
        key="nl-intro"
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
        style={{ background: "hsl(218 38% 8%)" }}
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === "exit" ? 0 : 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Scan line */}
        <motion.div
          className="absolute left-0 right-0 h-[2px] pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent, hsla(211,96%,60%,.7), hsla(197,92%,68%,.5), transparent)",
            boxShadow: "0 0 30px 4px hsla(211,96%,60%,.3)",
          }}
          initial={{ top: "-2px" }}
          animate={{ top: "102%" }}
          transition={{ duration: 2.2, ease: "easeInOut" }}
        />

        {/* Grid background */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsla(211,96%,60%,.25) 1px, transparent 1px), linear-gradient(90deg, hsla(211,96%,60%,.25) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
            maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent)",
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.15, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Orb A */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 500, height: 500,
            background: "radial-gradient(circle, hsla(211,96%,60%,.25), transparent 70%)",
            filter: "blur(80px)",
            top: "20%", left: "15%",
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
        {/* Orb B */}
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 400, height: 400,
            background: "radial-gradient(circle, hsla(197,92%,68%,.18), transparent 70%)",
            filter: "blur(70px)",
            bottom: "10%", right: "10%",
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2.5, ease: "easeOut", delay: 0.3 }}
        />

        {/* Particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 3 + Math.random() * 3,
              height: 3 + Math.random() * 3,
              background: "hsla(211,96%,70%,.6)",
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              filter: "blur(1px)",
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 0.8, 0], scale: [0, 1, 0.5] }}
            transition={{ duration: 2 + Math.random() * 1.5, delay: 0.3 + Math.random() * 1, repeat: 0 }}
          />
        ))}

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={phase !== "grid" ? { opacity: 1, scale: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative z-10"
        >
          <img
            src={newlightLogo}
            alt="NewLight"
            className="h-20 sm:h-24 w-auto object-contain"
            style={{ filter: "drop-shadow(0 0 40px hsla(211,96%,56%,.5))" }}
          />
          {/* Glow ring around logo */}
          <motion.div
            className="absolute -inset-6 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, hsla(211,96%,60%,.15), transparent 70%)",
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [1, 1.3, 1.1], opacity: [0, 0.6, 0.3] }}
            transition={{ duration: 2, ease: "easeOut", delay: 0.5 }}
          />
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="relative z-10 mt-5 text-sm font-semibold tracking-[0.15em] uppercase"
          style={{ color: "hsla(211,96%,70%,.7)" }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase !== "grid" ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          New Eyes To ROI
        </motion.p>

        {/* Powered badge */}
        <motion.div
          className="relative z-10 mt-6"
          initial={{ opacity: 0, y: 8 }}
          animate={["badge", "exit"].includes(phase) ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold tracking-[0.1em] uppercase"
            style={{
              color: "hsl(197 92% 68%)",
              background: "hsla(211,96%,60%,.1)",
              border: "1px solid hsla(211,96%,60%,.2)",
              boxShadow: "0 0 20px -4px hsla(211,96%,60%,.2)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Powered by NewLight
          </div>
        </motion.div>

        {/* Accent lines */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{
            background: "linear-gradient(90deg, transparent 10%, hsla(211,96%,60%,.5) 50%, transparent 90%)",
            boxShadow: "0 0 20px 2px hsla(211,96%,60%,.2)",
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
        />
        <motion.div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent 20%, hsla(211,96%,60%,.3) 50%, transparent 80%)",
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
        />

        {/* Skip button */}
        <motion.button
          onClick={skip}
          className="absolute bottom-6 right-6 z-20 text-[11px] font-medium tracking-wider uppercase px-4 py-2 rounded-lg transition-colors"
          style={{
            color: "hsla(0,0%,100%,.35)",
            background: "hsla(0,0%,100%,.05)",
            border: "1px solid hsla(0,0%,100%,.1)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          whileHover={{ color: "hsla(0,0%,100%,.7)", background: "hsla(0,0%,100%,.1)" }}
        >
          Skip Intro
        </motion.button>
      </motion.div>
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
