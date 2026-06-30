import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import newlightLogo from "@/assets/newlight-logo.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 * i,
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  }),
};

export default function Landing() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [breath, setBreath] = useState(1);

  // Breathing opacity (driven by interval, applied to canvas style)
  useEffect(() => {
    const id = setInterval(() => {
      const v = 0.925 + Math.sin(Date.now() / 1200) * 0.075; // 0.85 - 1.0
      setBreath(v);
    }, 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const N = 55;
    const nodes = Array.from({ length: N }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: 1.5 + Math.random() * 2,
    }));

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const render = () => {
      ctx.fillStyle = "hsl(218, 42%, 4%)";
      ctx.fillRect(0, 0, width, height);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }

      ctx.lineWidth = 0.6;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const op = (1 - dist / 120) * 0.18;
            ctx.strokeStyle = `hsla(197, 88%, 72%, ${op})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      ctx.shadowBlur = 18;
      ctx.shadowColor = "hsla(211,96%,80%,0.55)";
      ctx.fillStyle = "hsla(211, 96%, 78%, 0.85)";
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden text-white"
      style={{ background: "hsl(218, 42%, 4%)" }}
    >
      {/* Canvas background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{
          width: "100vw",
          height: "100vh",
          zIndex: 0,
          opacity: breath,
          transition: "opacity 80ms linear",
        }}
      />

      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 500,
            height: 500,
            top: -80,
            left: -60,
            background: "radial-gradient(circle, hsla(211,96%,60%,.15), transparent 70%)",
            filter: "blur(120px)",
          }}
          animate={{ scale: [1, 1.2, 1], y: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 400,
            height: 400,
            bottom: -60,
            right: -40,
            background: "radial-gradient(circle, hsla(197,88%,55%,.12), transparent 70%)",
            filter: "blur(100px)",
          }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 300,
            height: 300,
            top: "40%",
            left: "40%",
            background: "radial-gradient(circle, hsla(211,96%,65%,.08), transparent 70%)",
            filter: "blur(80px)",
          }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
        style={{
          background: "hsla(218,42%,4%,.85)",
          borderBottom: "1px solid hsla(211,96%,60%,.07)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <img
            src={newlightLogo}
            alt="NewLight"
            className="h-8 w-auto object-contain"
            style={{ filter: "drop-shadow(0 0 20px hsla(211,96%,56%,.45))" }}
          />
          <button
            onClick={() => navigate("/auth")}
            className="border border-[hsla(211,96%,60%,.3)] text-white/70 text-sm font-semibold px-5 py-2 rounded-xl hover:bg-[hsla(211,96%,60%,.1)] transition"
          >
            Log In
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20">
        <motion.div
          className="text-[11px] font-bold tracking-[0.2em] uppercase mb-5"
          style={{ color: "hsl(197,92%,68%)" }}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={0}
        >
          // AI MODERN MARKETING SYSTEMS
        </motion.div>

        <motion.h1
          className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.05]"
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={1}
        >
          <span className="block text-white">WE BRING YOU</span>
          <span className="block bg-gradient-to-r from-[hsl(211,96%,62%)] to-[hsl(197,92%,70%)] bg-clip-text text-transparent">
            READY-TO-BUY CUSTOMERS.
          </span>
        </motion.h1>

        <motion.p
          className="mt-5 text-white/45 text-base max-w-sm mx-auto leading-relaxed"
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={2}
        >
          One system. Every lead, appointment, and revenue stream — automated and tracked.
        </motion.p>

        <motion.p
          className="mt-3 text-[11px] text-white/30 uppercase tracking-widest"
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={3}
        >
          ZERO RISK — 90-DAY MONEY-BACK GUARANTEE
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center gap-3 w-full"
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={4}
        >
          <button
            onClick={() => navigate("/get-started")}
            className="bg-gradient-to-r from-[hsl(211,96%,54%)] to-[hsl(197,92%,58%)] text-white font-bold px-10 py-4 rounded-2xl text-base w-full max-w-xs shadow-[0_0_50px_-10px_hsla(211,96%,56%,.7)] hover:shadow-[0_0_70px_-10px_hsla(211,96%,56%,.9)] transition-all"
          >
            Download the App
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="border border-white/15 text-white/55 font-medium px-10 py-4 rounded-2xl text-base w-full max-w-xs hover:border-white/30 hover:text-white/75 transition-all"
          >
            Log In
          </button>
        </motion.div>

        <motion.div
          className="mt-8 text-white/25 text-xs"
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={5}
        >
          Want to learn more?{" "}
          <a
            href="https://newlightgen.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[hsl(211,96%,60%)] hover:text-[hsl(211,96%,75%)] transition-colors"
          >
            Visit newlightgen.com →
          </a>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 py-4 text-center">
        <p className="text-white/15 text-[11px]">
          © NewLight Marketing · (805) 836-3557 · team@newlightgen.com
        </p>
      </footer>
    </div>
  );
}
