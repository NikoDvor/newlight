import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import newlightLogo from "@/assets/newlight-logo.jpg";

const SESSION_KEY = "nl_intro_played";

interface NewLightIntroProps {
  onComplete: () => void;
}

export function NewLightIntro({ onComplete }: NewLightIntroProps) {
  const [visible, setVisible] = useState(true);
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
    // Let exit animation play, then call onComplete
    setTimeout(onComplete, 350);
  }, [onComplete]);

  useEffect(() => {
    // Auto-dismiss after 1.5s
    const timer = setTimeout(finish, 1500);
    return () => clearTimeout(timer);
  }, [finish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="nl-intro"
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: "hsl(218 38% 8%)" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* Scan line — fast sweep */}
          <motion.div
            className="absolute left-0 right-0 h-[2px] pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent 5%, hsla(211,96%,60%,.8) 30%, hsla(197,92%,68%,.6) 70%, transparent 95%)",
              boxShadow: "0 0 40px 6px hsla(211,96%,60%,.35)",
            }}
            initial={{ top: "-2px" }}
            animate={{ top: "105%" }}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
          />

          {/* Grid background — instant */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(hsla(211,96%,60%,.2) 1px, transparent 1px), linear-gradient(90deg, hsla(211,96%,60%,.2) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              opacity: 0.12,
              maskImage: "radial-gradient(ellipse 65% 65% at 50% 50%, black, transparent)",
              WebkitMaskImage: "radial-gradient(ellipse 65% 65% at 50% 50%, black, transparent)",
            }}
          />

          {/* Orb A */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 420, height: 420,
              background: "radial-gradient(circle, hsla(211,96%,60%,.3), transparent 70%)",
              filter: "blur(60px)",
              top: "15%", left: "10%",
            }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />

          {/* Orb B */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 320, height: 320,
              background: "radial-gradient(circle, hsla(197,92%,68%,.22), transparent 70%)",
              filter: "blur(50px)",
              bottom: "10%", right: "10%",
            }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
          />

          {/* Particles — static positions, animate once */}
          {[
            { l: "15%", t: "25%", s: 3 }, { l: "80%", t: "20%", s: 4 },
            { l: "30%", t: "70%", s: 3 }, { l: "65%", t: "75%", s: 5 },
            { l: "50%", t: "15%", s: 3 }, { l: "85%", t: "55%", s: 4 },
            { l: "20%", t: "50%", s: 3 }, { l: "70%", t: "40%", s: 4 },
          ].map((p, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: p.s, height: p.s,
                background: "hsla(211,96%,70%,.7)",
                left: p.l, top: p.t,
                filter: "blur(0.5px)",
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 0.9, 0], scale: [0, 1, 0.3] }}
              transition={{ duration: 1, delay: 0.1 + i * 0.06 }}
            />
          ))}

          {/* Logo — fast reveal */}
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, scale: 0.7, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <img
              src={newlightLogo}
              alt="NewLight"
              className="h-16 sm:h-20 w-auto object-contain"
              style={{ filter: "drop-shadow(0 0 30px hsla(211,96%,56%,.5))" }}
            />
            <motion.div
              className="absolute -inset-5 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, hsla(211,96%,60%,.18), transparent 70%)" }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [1, 1.2], opacity: [0, 0.5, 0.25] }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          </motion.div>

          {/* Tagline */}
          <motion.p
            className="relative z-10 mt-3 text-xs font-semibold tracking-[0.18em] uppercase"
            style={{ color: "hsla(211,96%,70%,.65)" }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.35 }}
          >
            New Eyes To ROI
          </motion.p>

          {/* Powered badge */}
          <motion.div
            className="relative z-10 mt-4"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-[0.1em] uppercase"
              style={{
                color: "hsl(197 92% 68%)",
                background: "hsla(211,96%,60%,.08)",
                border: "1px solid hsla(211,96%,60%,.18)",
                boxShadow: "0 0 16px -3px hsla(211,96%,60%,.2)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Powered by NewLight
            </div>
          </motion.div>

          {/* Launching text */}
          <motion.p
            className="relative z-10 mt-3 text-[10px] tracking-wider uppercase"
            style={{ color: "hsla(0,0%,100%,.25)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.7 }}
          >
            Launching workspace…
          </motion.p>

          {/* Bottom accent line */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-[2px]"
            style={{
              background: "linear-gradient(90deg, transparent 5%, hsla(211,96%,60%,.55) 50%, transparent 95%)",
              boxShadow: "0 0 20px 2px hsla(211,96%,60%,.2)",
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          />

          {/* Skip button */}
          <motion.button
            onClick={finish}
            className="absolute bottom-5 right-5 z-20 text-[10px] font-medium tracking-wider uppercase px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: "hsla(0,0%,100%,.3)",
              background: "hsla(0,0%,100%,.04)",
              border: "1px solid hsla(0,0%,100%,.08)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ color: "hsla(0,0%,100%,.7)", background: "hsla(0,0%,100%,.1)" }}
          >
            Skip
          </motion.button>
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
