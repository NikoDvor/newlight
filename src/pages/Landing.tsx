import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import newlightLogo from "@/assets/newlight-logo.jpg";
import { HomeFX } from "@/components/HomeFX";

// Palette mirrored from newlightgen.com post-intro state
const ELECTRIC = "#00B4FF";

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
      className="nl-phase-root relative min-h-screen overflow-x-hidden"
      style={{ fontFamily: body }}
    >
      {/* Keyframes for streak flow (sourced from newlightgen.com) */}
      <style>{`@keyframes nl-streak-flow { 0% { stroke-dashoffset: 410; } 100% { stroke-dashoffset: 0; } }`}</style>

      {/* HomeFX — full-screen 3D/canvas background (mounted behind all content) */}
      <HomeFX />

      {/* Top radial glow tint (phase-driven) */}
      <div
        className="fixed inset-x-0 top-0 pointer-events-none"
        style={{
          height: "60vh",
          zIndex: 0,
          background: `radial-gradient(ellipse 50% 100% at 50% 0%, var(--nl-glow-tint) 0%, transparent 70%)`,
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
          background: "color-mix(in srgb, var(--nl-bg) 60%, transparent)",
          borderColor: "var(--nl-border-tint)",
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
              color: "var(--nl-fg)",
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
              color: "var(--nl-fg)",
              fontSize: "clamp(40px, 6.8vw, 88px)",
              maxWidth: 960,
              fontFamily: display,
              textShadow: "0 0 30px rgba(0,180,255,0.25)",
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
            style={{ color: "var(--nl-fg-soft)", fontFamily: body }}
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
                color: "var(--nl-fg)",
                border: "2px solid var(--nl-fg)",
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
        style={{ zIndex: 10, borderTop: "1px solid var(--nl-border-tint)" }}
      >
        <p className="text-[11px]" style={{ color: "var(--nl-fg-soft)" }}>
          © NewLight Marketing · (805) 836-3557 · team@newlightgen.com
        </p>
      </footer>
    </div>
  );
}
