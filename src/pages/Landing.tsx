import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import * as THREE from "three";
import newlightLogo from "@/assets/newlight-logo.jpg";

// Palette pulled from newlightgen.com
const BG = "#EDF6FF";        // icy light blue
const NAVY = "#001A3D";      // primary text / dark
const ELECTRIC = "#00B4FF";  // accent
const TINT = "rgba(0,26,61,0.08)";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 * i,
      duration: 0.65,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  }),
};

export default function Landing() {
  const navigate = useNavigate();
  const threeRef = useRef<HTMLDivElement>(null);
  const arcsRef = useRef<HTMLCanvasElement>(null);

  // Load Rajdhani display font (no global CSS edits)
  useEffect(() => {
    const id = "nl-rajdhani-font";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  // Three.js wireframe cubes (matches newlightgen.com bg geometry)
  useEffect(() => {
    const el = threeRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.z = 9;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const makeCube = (size: number, color: number, opacity: number) => {
      const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size));
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      return new THREE.LineSegments(geo, mat);
    };

    // Subtle navy-blue wireframes against the light bg
    const c1 = makeCube(5.5, 0x0a3a78, 0.22);
    const c2 = makeCube(3.6, 0x0d4d99, 0.18);
    const c3 = makeCube(2.2, 0x1668bd, 0.16);
    c1.position.set(-1.5, 0.5, 0);
    c2.position.set(1.2, -0.3, 0);
    group.add(c1, c2, c3);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    let mx = 0, my = 0, cx = 0, cy = 0;
    const onMove = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove);

    let raf = 0;
    let t = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.006;
      c1.rotation.x = t * 0.35;
      c1.rotation.y = t * 0.25;
      c2.rotation.x = -t * 0.3;
      c2.rotation.y = t * 0.45;
      c3.rotation.x = t * 0.6;
      c3.rotation.z = t * 0.3;
      group.rotation.y += 0.0008;

      cx += (mx * 0.6 - cx) * 0.04;
      cy += (-my * 0.4 - cy) * 0.04;
      camera.position.x = cx;
      camera.position.y = cy;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
      renderer.dispose();
      [c1, c2, c3].forEach((c) => {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      });
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // Faint concentric arc rings (the circular pattern visible on newlightgen.com)
  useEffect(() => {
    const canvas = arcsRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    let t = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      t += 0.004;

      const cx = width / 2;
      const cy = height / 2;
      const maxR = Math.hypot(width, height) * 0.6;

      ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        const r = ((i / 14) * maxR) + (Math.sin(t + i * 0.3) * 4);
        const op = 0.05 + (1 - i / 14) * 0.04;
        ctx.strokeStyle = `rgba(0, 26, 61, ${op})`;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const display = "'Rajdhani', 'Inter', system-ui, sans-serif";

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: BG, color: NAVY, fontFamily: display }}
    >
      {/* Arc rings — bottom */}
      <canvas
        ref={arcsRef}
        className="fixed inset-0 pointer-events-none"
        style={{ width: "100vw", height: "100vh", zIndex: 0 }}
      />

      {/* Three.js wireframe layer */}
      <div
        ref={threeRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />

      {/* Subtle radial brightening from center */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 60%)",
        }}
      />

      {/* Nav */}
      <header
        className="fixed top-0 left-0 right-0 h-16 backdrop-blur-md"
        style={{
          zIndex: 100,
          background: "color-mix(in srgb, #EDF6FF 70%, transparent)",
          borderBottom: `1px solid ${TINT}`,
        }}
      >
        <nav className="relative h-full max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between">
          <a
            href="/"
            className="flex items-center"
            style={{ zIndex: 2 }}
          >
            <img
              src={newlightLogo}
              alt="NewLight"
              className="h-9 w-auto object-contain"
              style={{ background: "transparent" }}
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
              letterSpacing: "0.12em",
              fontFamily: display,
              boxShadow: "0 6px 22px -6px rgba(0,180,255,0.55)",
              zIndex: 2,
            }}
          >
            LOG IN
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20" style={{ zIndex: 10 }}>
        <motion.div
          className="text-[12px] font-bold tracking-[0.25em] uppercase mb-8"
          style={{ color: ELECTRIC, fontFamily: display }}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={0}
        >
          // AI MODERN MARKETING SYSTEMS
        </motion.div>

        <motion.h1
          className="font-bold leading-[0.95] tracking-[-0.02em] mx-auto break-words"
          style={{
            color: NAVY,
            fontSize: "clamp(40px, 6.5vw, 84px)",
            maxWidth: 940,
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
          className="mt-8"
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={2}
        >
          <div
            className="mx-auto"
            style={{
              width: 60,
              height: 2,
              background: ELECTRIC,
              opacity: 0.7,
            }}
          />
        </motion.div>

        <motion.p
          className="mt-7 text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
          style={{ color: "rgba(0,26,61,0.72)" }}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={3}
        >
          One system. Every lead, appointment, and revenue stream — automated and tracked inside your branded Command Center.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 w-full"
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
              padding: "16px 32px",
              fontSize: 13,
              letterSpacing: "0.14em",
              fontFamily: display,
              minWidth: 220,
              boxShadow: "0 12px 36px -10px rgba(0,180,255,0.65)",
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
              padding: "14px 32px",
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
          className="mt-10 text-xs"
          style={{ color: "rgba(0,26,61,0.5)" }}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          custom={5}
        >
          Want to learn about NewLight?{" "}
          <a
            href="https://newlightgen.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold hover:underline"
            style={{ color: ELECTRIC }}
          >
            Visit newlightgen.com →
          </a>
        </motion.div>
      </section>

      {/* Footer */}
      <footer
        className="relative w-full text-center py-5"
        style={{ zIndex: 10, borderTop: `1px solid ${TINT}` }}
      >
        <p className="text-[11px]" style={{ color: "rgba(0,26,61,0.45)" }}>
          © NewLight Marketing · (805) 836-3557 · team@newlightgen.com
        </p>
      </footer>
    </div>
  );
}
