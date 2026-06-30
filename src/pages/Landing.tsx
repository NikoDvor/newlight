import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import newlightLogo from "@/assets/newlight-logo.jpg";
import { HomeFX } from "@/components/HomeFX";

// Palette mirrored from newlightgen.com post-intro state
const BG = "#EDF6FF";
const NAVY = "#001A3D";
const NAVY_SOFT = "#334155";
const ELECTRIC = "#00B4FF";
const GLOW = "#00b4ff2e";
const BORDER_TINT = "#00b4ff4d";

// The 8 curved streak paths used on newlightgen.com (verbatim path data)
const STREAKS = [
  { d: "M 39.7 -8.0 C 36.5 -2.9, 38.4 14.8, 29.7 21.0 C 26.4 26.2, 30.3 40.7, 33.2 50.0 C 39.6 55.4, 40.5 69.5, 37.1 79.0 C 31.5 87.6, 32.7 97.8, 26.9 108.0", w: 0.21, op: 0.55, dur: 7.31, delay: 0.54 },
  { d: "M -8.0 85.5 C 7.4 86.4, 11.5 81.7, 21.0 82.1 C 31.8 93.7, 36.4 91.6, 50.0 99.3 C 63.3 94.8, 71.9 96.4, 79.0 99.0 C 90.0 104.2, 94.9 101.4, 108.0 105.5", w: 0.23, op: 0.5, dur: 5.66, delay: 0.64 },
  { d: "M 57.6 -8.0 C 63.6 6.1, 62.0 10.3, 63.3 21.0 C 62.9 27.8, 69.7 34.3, 72.5 50.0 C 63.3 61.7, 61.3 69.9, 52.8 79.0 C 62.2 93.9, 67.6 97.1, 75.0 108.0", w: 0.23, op: 0.5, dur: 4.81, delay: 1.56 },
  { d: "M -8.0 77.3 C -1.0 77.6, 10.9 79.8, 21.0 83.1 C 35.3 78.0, 43.1 79.1, 50.0 84.7 C 58.1 81.1, 64.3 86.9, 79.0 85.4 C 86.0 84.5, 100.7 84.4, 108.0 75.5", w: 0.24, op: 0.6, dur: 5.83, delay: 2.28 },
  { d: "M 9.2 -8.0 C 21.7 3.8, 24.8 6.6, 28.8 21.0 C 28.2 34.7, 24.6 40.7, 15.2 50.0 C 22.1 56.6, 18.6 69.7, 19.3 79.0 C 14.1 92.5, 15.4 99.5, 8.6 108.0", w: 0.20, op: 0.62, dur: 6.87, delay: 2.54 },
  { d: "M -8.0 25.2 C 7.4 21.0, 16.4 31.2, 21.0 28.7 C 28.1 26.4, 37.2 33.6, 50.0 36.1 C 61.3 32.9, 74.2 29.1, 79.0 30.0 C 85.8 24.9, 103.5 29.8, 108.0 26.5", w: 0.28, op: 0.65, dur: 6.02, delay: 3.89 },
  { d: "M -8.0 78.9 C -3.4 85.3, 5.1 92.7, 21.0 97.1 C 26.6 90.0, 42.8 96.0, 50.0 93.4 C 57.9 81.4, 70.1 77.5, 79.0 73.3 C 88.4 72.9, 92.5 72.7, 108.0 78.9", w: 0.29, op: 0.5, dur: 4.75, delay: 4.02 },
  { d: "M 30.9 -8.0 C 37.9 -2.4, 39.5 8.2, 39.2 21.0 C 27.7 27.9, 30.1 41.5, 18.2 50.0 C 16.8 58.2, 19.5 64.4, 11.2 79.0 C 11.5 91.0, 13.9 95.4, 17.2 108.0", w: 0.33, op: 0.52, dur: 7.6, delay: 4.93 },
];

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 * i, duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

export default function Landing() {
  const navigate = useNavigate();
  const particlesRef = useRef<HTMLCanvasElement>(null);

  // Load Rajdhani + Inter (same as newlightgen.com)
  useEffect(() => {
    const id = "nl-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);

  // Breathing 3D node/particle network — drifting points with connecting lines,
  // depth-faked z scale + global breathing pulse. Lightweight canvas 2D.
  useEffect(() => {
    const canvas = particlesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = Math.min(90, Math.floor((window.innerWidth * window.innerHeight) / 22000));
    const nodes = Array.from({ length: COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: 0.35 + Math.random() * 0.65, // depth 0.35..1
      vx: (Math.random() - 0.5) * 0.00035,
      vy: (Math.random() - 0.5) * 0.00035,
      vz: (Math.random() - 0.5) * 0.00015,
      phase: Math.random() * Math.PI * 2,
    }));

    const mouse = { x: 0.5, y: 0.5, active: false };
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth;
      mouse.y = e.clientY / window.innerHeight;
      mouse.active = true;
    };
    window.addEventListener("mousemove", onMove);

    const LINK_DIST = 0.13; // normalized
    let raf = 0;
    let t = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 0.008;
      const breath = 0.85 + Math.sin(t * 0.6) * 0.15; // 0.7..1.0

      ctx.clearRect(0, 0, w, h);

      // Update + draw nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
        if (n.z < 0.35 || n.z > 1) n.vz *= -1;

        // Soft attraction to cursor
        if (mouse.active) {
          n.x += (mouse.x - n.x) * 0.0006 * n.z;
          n.y += (mouse.y - n.y) * 0.0006 * n.z;
        }

        const px = n.x * w;
        const py = n.y * h;
        const pulse = 0.6 + Math.sin(t * 1.3 + n.phase) * 0.4;
        const r = (1.1 + n.z * 2.4) * pulse * breath;
        const alpha = (0.18 + n.z * 0.45) * breath;

        // glow halo
        ctx.fillStyle = `rgba(0,180,255,${alpha * 0.18})`;
        ctx.beginPath();
        ctx.arc(px, py, r * 4, 0, Math.PI * 2);
        ctx.fill();

        // core
        ctx.fillStyle = `rgba(0,180,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Connecting lines
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            const k = 1 - d / LINK_DIST;
            const depth = (a.z + b.z) * 0.5;
            const op = k * 0.28 * depth * breath;
            ctx.strokeStyle = `rgba(0,180,255,${op})`;
            ctx.lineWidth = 0.6 * depth;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  const display = "'Rajdhani', 'Inter', system-ui, sans-serif";
  const body = "'Inter', system-ui, sans-serif";

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: BG, color: NAVY, fontFamily: body }}
    >
      {/* Keyframes for streak flow (sourced from newlightgen.com) */}
      <style>{`@keyframes nl-streak-flow { 0% { stroke-dashoffset: 410; } 100% { stroke-dashoffset: 0; } }`}</style>

      {/* HomeFX — full-screen 3D/canvas background (mounted behind all content) */}
      <HomeFX />

      {/* Top radial glow tint (matches site) */}
      <div
        className="fixed inset-x-0 top-0 pointer-events-none"
        style={{
          height: "60vh",
          zIndex: 0,
          background: `radial-gradient(ellipse 50% 100% at 50% 0%, ${GLOW} 0%, transparent 70%)`,
        }}
        aria-hidden
      />

      {/* Breathing particle / node network (canvas 2D) */}
      <canvas
        ref={particlesRef}
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0, width: "100vw", height: "100vh" }}
        aria-hidden
      />

      {/* Animated curved streak background (verbatim from newlightgen.com) */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
        style={{ zIndex: 0 }}
        aria-hidden
      >
        {STREAKS.map((s, i) => (
          <path
            key={i}
            d={s.d}
            stroke={ELECTRIC}
            strokeWidth={s.w}
            strokeLinecap="round"
            fill="none"
            vectorEffect="non-scaling-stroke"
            style={{
              opacity: s.op,
              strokeDasharray: "8 400",
              animation: `nl-streak-flow ${s.dur}s linear ${s.delay}s infinite`,
              filter: "drop-shadow(0 0 1.5px rgba(0,180,255,0.6))",
            }}
          />
        ))}
      </svg>

      {/* Nav */}
      <header
        className="fixed top-0 left-0 right-0 backdrop-blur-md border-b"
        style={{
          zIndex: 100,
          height: 64,
          background: `color-mix(in srgb, ${BG} 60%, transparent)`,
          borderColor: BORDER_TINT,
        }}
      >
        <nav className="relative h-full max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <a href="/" className="flex items-center" style={{ zIndex: 2 }}>
            <img
              src={newlightLogo}
              alt="NewLight"
              style={{ height: 40, width: "auto", background: "transparent" }}
            />
          </a>

          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block"
            style={{
              color: NAVY,
              fontSize: 16,
              letterSpacing: "0.32em",
              fontWeight: 700,
              fontFamily: display,
              zIndex: 1,
            }}
          >
            NEWLIGHT
          </div>

          <button
            onClick={() => navigate("/auth")}
            className="inline-flex items-center justify-center font-bold transition-all hover:brightness-110"
            style={{
              background: ELECTRIC,
              color: "#FFFFFF",
              borderRadius: 20,
              padding: "8px 18px",
              fontSize: 11,
              letterSpacing: "0.1em",
              fontFamily: display,
              boxShadow: "0 0 10px rgba(0,180,255,0.4)",
              zIndex: 2,
            }}
          >
            LOG IN
          </button>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative" style={{ zIndex: 10 }}>
        <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-32">
          <motion.div
            className="text-[12px] font-bold tracking-[0.28em] uppercase mb-8"
            style={{ color: ELECTRIC, fontFamily: display }}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0}
          >
            // AI MODERN MARKETING SYSTEMS
          </motion.div>

          <motion.h1
            className="font-bold leading-[0.95] tracking-[-0.02em] mx-auto"
            style={{
              color: NAVY,
              fontSize: "clamp(40px, 6.8vw, 88px)",
              maxWidth: 960,
              fontFamily: display,
            }}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={1}
          >
            WE BRING YOU READY-TO-BUY CUSTOMERS.
          </motion.h1>

          <motion.div
            className="mt-8 mx-auto"
            style={{ width: 60, height: 2, background: ELECTRIC, opacity: 0.85 }}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={2}
          />

          <motion.p
            className="mt-7 text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
            style={{ color: NAVY_SOFT, fontFamily: body }}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={3}
          >
            One system. Every lead, appointment, and revenue stream — automated and
            tracked inside your branded Command Center.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={4}
          >
            <button
              onClick={() => navigate("/get-started")}
              className="inline-flex items-center justify-center font-bold transition-all hover:brightness-110"
              style={{
                background: ELECTRIC,
                color: "#FFFFFF",
                borderRadius: 24,
                padding: "16px 34px",
                fontSize: 13,
                letterSpacing: "0.14em",
                fontFamily: display,
                minWidth: 220,
                boxShadow: "0 12px 36px -10px rgba(0,180,255,0.65), 0 0 14px rgba(0,180,255,0.4)",
              }}
            >
              DOWNLOAD THE APP
            </button>

            <button
              onClick={() => navigate("/auth")}
              className="inline-flex items-center justify-center font-bold transition-colors"
              style={{
                background: "transparent",
                color: NAVY,
                border: `2px solid ${NAVY}`,
                borderRadius: 24,
                padding: "14px 34px",
                fontSize: 13,
                letterSpacing: "0.14em",
                fontFamily: display,
                minWidth: 220,
              }}
            >
              LOG IN
            </button>
          </motion.div>

          <motion.div
            className="mt-16 text-xs"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={5}
          >
            <a
              href="https://newlightgen.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold hover:underline"
              style={{ color: ELECTRIC, letterSpacing: "0.12em", fontFamily: display }}
            >
              VISIT NEWLIGHTGEN.COM →
            </a>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="relative w-full text-center py-5"
        style={{ zIndex: 10, borderTop: `1px solid ${BORDER_TINT}` }}
      >
        <p className="text-[11px]" style={{ color: NAVY_SOFT }}>
          © NewLight Marketing · (805) 836-3557 · team@newlightgen.com
        </p>
      </footer>
    </div>
  );
}
