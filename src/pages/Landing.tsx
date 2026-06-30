import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import newlightLogo from "@/assets/newlight-logo.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.08 * i,
      duration: 0.55,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  }),
};

export default function Landing() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const N = 50;
    const nodes = Array.from({ length: N }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 1.5 + Math.random() * 1.5,
    }));

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    let t = 0;
    const render = () => {
      t += 0.016;
      ctx.fillStyle = "hsl(218, 42%, 4%)";
      ctx.fillRect(0, 0, width, height);

      const breathe = 0.88 + (Math.sin(t * 1.2) + 1) * 0.06; // 0.88 -> 1.0
      ctx.globalAlpha = breathe;

      // Move nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }

      // Lines
      ctx.lineWidth = 1;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const op = (1 - dist / 130) * 0.2;
            ctx.strokeStyle = `hsla(197, 88%, 72%, ${op})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Nodes with glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = "hsla(211,96%,80%,0.5)";
      ctx.fillStyle = "hsla(211, 96%, 78%, 0.85)";
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

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
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ width: "100vw", height: "100vh" }}
      />

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
        style={{
          background: "hsla(218,42%,4%,.8)",
          borderBottom: "1px solid hsla(211,96%,60%,.08)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <img
            src={newlightLogo}
            alt="NewLight"
            className="h-8 w-auto object-contain"
            style={{ filter: "drop-shadow(0 0 14px hsla(211,96%,56%,.45))" }}
          />
          <button
            onClick={() => navigate("/auth")}
            className="border border-[hsla(211,96%,60%,.3)] text-white/70 px-5 py-2 rounded-xl text-sm font-semibold hover:bg-[hsla(211,96%,60%,.08)] transition"
          >
            Log In
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 min-h-screen flex items-center justify-center text-center px-6 pt-20">
        <div className="max-w-2xl mx-auto w-full">
          <motion.div
            className="text-[11px] font-bold tracking-[0.2em] uppercase mb-6"
            style={{ color: "hsl(197,92%,68%)" }}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0}
          >
            // NEWLIGHT COMMAND CENTER
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-7xl font-black tracking-tight leading-tight"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={1}
          >
            <span className="block text-white">YOUR BUSINESS.</span>
            <span className="block bg-gradient-to-r from-[hsl(211,96%,65%)] to-[hsl(197,92%,72%)] bg-clip-text text-transparent">
              FULLY AUTOMATED.
            </span>
          </motion.h1>

          <motion.p
            className="mt-5 text-base text-white/45 max-w-sm mx-auto"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={2}
          >
            One system. Every lead, appointment, and revenue stream — automated and tracked.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col gap-3 items-center"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={3}
          >
            <button
              onClick={() => navigate("/get-started")}
              className="bg-gradient-to-r from-[hsl(211,96%,56%)] to-[hsl(197,92%,60%)] text-white font-bold px-10 py-4 rounded-2xl text-base shadow-[0_0_40px_-8px_hsla(211,96%,56%,.6)] hover:shadow-[0_0_60px_-8px_hsla(211,96%,56%,.8)] transition-all w-full max-w-xs"
            >
              Download the App
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="border border-white/15 text-white/60 font-medium px-10 py-4 rounded-2xl text-base hover:border-white/30 transition-all w-full max-w-xs"
            >
              Log In
            </button>
          </motion.div>

          <motion.div
            className="mt-6 text-white/25 text-xs"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={4}
          >
            Want to learn more about what we do?{" "}
            <a
              href="https://newlightgen.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "hsl(211,96%,60%)" }}
              className="font-semibold hover:underline"
            >
              Visit newlightgen.com →
            </a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 py-6 w-full text-center z-10">
        <p className="text-white/20 text-xs">
          © NewLight Marketing · (805) 836-3557 · team@newlightgen.com
        </p>
      </footer>
    </div>
  );
}
