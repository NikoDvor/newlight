import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import newlightLogo from "@/assets/newlight-logo.jpg";

const SESSION_KEY = "nl_intro_played";

interface NewLightIntroProps {
  onComplete: () => void;
  launchLabel?: string;
}

/**
 * Cinematic intro (~2s):
 *   phase 0: pre-mount
 *   phase 1: dark bg, 3D logo entrance + parallax orbs
 *   phase 2: particle burst + shockwave + glow pulse
 *   phase 3: white flash transition
 *   phase 4: zoom-out exit
 */
export function NewLightIntro({ onComplete, launchLabel }: NewLightIntroProps) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);

  const finish = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, "1");
    window.dispatchEvent(new Event("nl-intro-complete"));
    setPhase(4);
    setTimeout(onComplete, 450);
  }, [onComplete]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 120);
    const t2 = setTimeout(() => setPhase(2), 900);
    const t3 = setTimeout(() => setPhase(3), 1500);
    const t4 = setTimeout(finish, 1950);
    const failsafe = setTimeout(finish, 4500);
    return () => [t1, t2, t3, t4, failsafe].forEach(clearTimeout);
  }, [finish]);

  // Particle burst: pre-compute random angles/distances
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 18 + (Math.random() - 0.5) * 0.6;
        const distance = 100 + Math.random() * 200;
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          size: 2 + Math.random() * 3,
          delay: Math.random() * 0.15,
        };
      }),
    []
  );

  const bg =
    phase >= 3 ? "#EDF6FF"
    : phase >= 2 ? "#041830"
    : "#020814";

  const lightening = phase >= 3;

  return (
    <AnimatePresence>
      <motion.div
        key="nl-intro"
        className="fixed inset-0 z-[99999] overflow-hidden flex flex-col items-center justify-center"
        initial={{ opacity: 1, scale: 1 }}
        animate={{
          opacity: phase >= 4 ? 0 : 1,
          scale: phase >= 4 ? 1.05 : 1,
        }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        style={{
          background: bg,
          transition: "background 500ms cubic-bezier(.4,0,.2,1)",
          perspective: "800px",
        }}
      >
        {/* Parallax orbs */}
        {[
          { size: 400, x: "-30%", y: "-20%", color: "rgba(0,180,255,0.35)", delay: 0 },
          { size: 280, x: "35%", y: "25%", color: "rgba(0,140,255,0.28)", delay: 0.1 },
          { size: 220, x: "-15%", y: "30%", color: "rgba(120,200,255,0.22)", delay: 0.2 },
        ].map((orb, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: orb.size,
              height: orb.size,
              left: "50%",
              top: "50%",
              background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
              filter: "blur(8px)",
            }}
            initial={{ opacity: 0, scale: 0.6, x: orb.x, y: orb.y }}
            animate={{
              opacity: phase >= 1 && phase < 3 ? 1 : 0,
              scale: phase >= 2 ? 1.4 : phase >= 1 ? 1 : 0.6,
              x: phase >= 2
                ? `calc(${orb.x} + ${(i % 2 ? 1 : -1) * 40}px)`
                : orb.x,
              y: phase >= 2
                ? `calc(${orb.y} + ${(i % 2 ? -1 : 1) * 30}px)`
                : orb.y,
            }}
            transition={{ duration: 1.2, delay: orb.delay, ease: "easeOut" }}
          />
        ))}

        {/* Top radial glow */}
        <div
          className="absolute inset-x-0 top-0 pointer-events-none"
          style={{
            height: "60vh",
            background: lightening
              ? "radial-gradient(ellipse 50% 100% at 50% 0%, rgba(0,180,255,0.18) 0%, transparent 70%)"
              : "radial-gradient(ellipse 50% 100% at 50% 0%, rgba(0,180,255,0.45) 0%, transparent 70%)",
            transition: "background 500ms ease",
          }}
        />

        {/* Particle burst at phase 2 */}
        {phase >= 2 && phase < 4 && (
          <div
            className="absolute left-1/2 top-1/2 pointer-events-none"
            style={{ width: 0, height: 0 }}
          >
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  background: "#7EC8F0",
                  boxShadow: "0 0 8px rgba(0,180,255,0.9)",
                  left: 0,
                  top: 0,
                }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
                animate={{ x: p.x, y: p.y, opacity: 0, scale: 1 }}
                transition={{ duration: 0.9, delay: p.delay, ease: "easeOut" }}
              />
            ))}
          </div>
        )}

        {/* Shockwave ring */}
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

        {/* Dual scan lines with motion blur */}
        {phase >= 1 && phase < 3 && (
          <>
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                height: 2,
                background: "rgba(0,180,255,0.9)",
                boxShadow: "0 0 18px 4px rgba(0,180,255,0.6)",
                animation: "nl-scan-down 1.1s ease-out forwards",
              }}
            />
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                height: 1,
                background: "rgba(150,220,255,0.7)",
                boxShadow: "0 0 12px 3px rgba(120,200,255,0.5)",
                animation: "nl-scan-up 1.3s ease-out forwards",
                animationDelay: "0.15s",
              }}
            />
          </>
        )}

        <style>{`
          @keyframes nl-shockwave {
            0%   { opacity: .9; border-width: 12px; transform: translate(-50%,-50%) scale(0); }
            60%  { opacity: .5; border-width: 4px; }
            100% { opacity: 0;  border-width: 1px; transform: translate(-50%,-50%) scale(40); }
          }
          @keyframes nl-scan-down {
            0%   { top: -10%; opacity: 0; }
            20%  { opacity: 1; }
            100% { top: 110%; opacity: 0; }
          }
          @keyframes nl-scan-up {
            0%   { top: 110%; opacity: 0; }
            20%  { opacity: 1; }
            100% { top: -10%; opacity: 0; }
          }
          @keyframes nl-glow-pulse {
            0%   { transform: scale(1); filter: drop-shadow(0 0 30px rgba(0,180,255,0.85)) drop-shadow(0 0 60px rgba(0,180,255,0.4)); }
            50%  { transform: scale(1.08); filter: drop-shadow(0 0 50px rgba(0,180,255,1)) drop-shadow(0 0 100px rgba(0,180,255,0.7)); }
            100% { transform: scale(1); filter: drop-shadow(0 0 30px rgba(0,180,255,0.85)) drop-shadow(0 0 60px rgba(0,180,255,0.4)); }
          }
          @keyframes nl-final-flash {
            0% { opacity: 0; }
            20% { opacity: 0.9; }
            100% { opacity: 0; }
          }
        `}</style>

        {/* Logo + tagline (3D perspective) */}
        <div
          className="relative z-10 flex flex-col items-center gap-5 px-6 text-center"
          style={{ transformStyle: "preserve-3d" }}
        >
          <motion.img
            src={newlightLogo}
            alt="NewLight"
            className="h-16 w-auto object-contain"
            initial={{ opacity: 0, scale: 0.85, rotateX: 25 }}
            animate={{
              opacity: phase >= 1 ? 1 : 0,
              scale: 1,
              rotateX: 0,
            }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 16,
              mass: 0.9,
            }}
            style={{
              transformStyle: "preserve-3d",
              filter: lightening
                ? "drop-shadow(0 0 10px rgba(0,180,255,0.45))"
                : "drop-shadow(0 0 30px rgba(0,180,255,0.85)) drop-shadow(0 0 60px rgba(0,180,255,0.4))",
              animation: phase === 2 ? "nl-glow-pulse 0.7s ease-out" : undefined,
            }}
          />

          <motion.p
            className="text-[11px] font-bold tracking-[0.32em] uppercase"
            style={{
              color: "#00B4FF",
              fontFamily: "'Rajdhani','Inter',system-ui,sans-serif",
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 8 }}
            transition={{ duration: 0.5, delay: 0.18 }}
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

        {/* Final white flash */}
        {phase === 3 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "#FFFFFF",
              animation: "nl-final-flash 0.9s ease-out forwards",
            }}
          />
        )}

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
