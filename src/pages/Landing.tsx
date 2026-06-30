import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import * as THREE from "three";
import newlightLogo from "@/assets/newlight-logo.jpg";

// Palettes
const DARK_BG = "#03070F";        // near-black
const DARK_BG_2 = "#0A1A33";      // deep navy
const LIGHT_BG = "#EDF6FF";       // icy light blue
const NAVY = "#001A3D";
const ELECTRIC = "#00B4FF";
const TINT_LIGHT = "rgba(0,26,61,0.08)";

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
  const cubeRef = useRef<HTMLDivElement>(null);
  const arcsRef = useRef<HTMLCanvasElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // Load Rajdhani font
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

  // Scroll handler — flip theme once user passes ~60% of viewport
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.55);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Three.js — rotating wireframe cube with inner glow (hero only)
  useEffect(() => {
    const el = cubeRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      el.clientWidth / el.clientHeight,
      0.1,
      1000,
    );
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(el.clientWidth, el.clientHeight);
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

    const outer = makeCube(3.2, 0x00b4ff, 0.85);
    const mid = makeCube(2.1, 0x4fcaff, 0.55);
    const inner = makeCube(1.1, 0x9fe3ff, 0.7);
    group.add(outer, mid, inner);

    // Inner glowing core
    const coreGeo = new THREE.SphereGeometry(0.45, 32, 32);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x66d4ff,
      transparent: true,
      opacity: 0.9,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // Soft glow halo (additive)
    const haloGeo = new THREE.SphereGeometry(1.0, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x00b4ff,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    group.add(halo);

    const onResize = () => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    let t = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.006;
      outer.rotation.x = t * 0.4;
      outer.rotation.y = t * 0.55;
      mid.rotation.x = -t * 0.7;
      mid.rotation.y = t * 0.4;
      inner.rotation.x = t * 1.1;
      inner.rotation.z = t * 0.9;
      const pulse = 1 + Math.sin(t * 2) * 0.08;
      core.scale.setScalar(pulse);
      halo.scale.setScalar(1 + Math.sin(t * 1.4) * 0.12);
      (haloMat as THREE.MeshBasicMaterial).opacity = 0.14 + Math.sin(t * 1.4) * 0.06;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      [outer, mid, inner].forEach((c) => {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      });
      coreGeo.dispose();
      coreMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // Canvas — flowing curved wireframe ribbons (shown after scroll, light section)
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

    const ribbons = Array.from({ length: 9 }).map((_, i) => ({
      phase: i * 0.7,
      speed: 0.0015 + i * 0.00025,
      amp: 80 + i * 22,
      yOffset: (i / 9) * 1.1 - 0.05,
      hueOpacity: 0.07 + (1 - i / 9) * 0.06,
    }));

    let raf = 0;
    let t = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      t += 1;

      ctx.lineWidth = 1.1;
      ribbons.forEach((r) => {
        ctx.strokeStyle = `rgba(0, 26, 61, ${r.hueOpacity})`;
        ctx.beginPath();
        const baseY = height * r.yOffset;
        const steps = 80;
        for (let i = 0; i <= steps; i++) {
          const x = (i / steps) * width;
          const y =
            baseY +
            Math.sin(i * 0.08 + t * r.speed + r.phase) * r.amp +
            Math.cos(i * 0.04 - t * r.speed * 0.6) * (r.amp * 0.4);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

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
      style={{
        background: scrolled ? LIGHT_BG : DARK_BG,
        color: scrolled ? NAVY : "#FFFFFF",
        fontFamily: display,
        transition: "background 700ms ease, color 700ms ease",
      }}
    >
      {/* Fixed dark hero background (fades out on scroll) */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          opacity: scrolled ? 0 : 1,
          transition: "opacity 700ms ease",
          background: `radial-gradient(ellipse at 50% 40%, ${DARK_BG_2} 0%, ${DARK_BG} 70%)`,
        }}
      />

      {/* Fixed light arcs background (fades in on scroll) */}
      <canvas
        ref={arcsRef}
        className="fixed inset-0 pointer-events-none"
        style={{
          width: "100vw",
          height: "100vh",
          zIndex: 1,
          opacity: scrolled ? 1 : 0,
          transition: "opacity 700ms ease",
        }}
      />

      {/* Radial brightening for light mode */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          opacity: scrolled ? 1 : 0,
          transition: "opacity 700ms ease",
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 60%)",
        }}
      />

      {/* Nav */}
      <header
        className="fixed top-0 left-0 right-0 h-16 backdrop-blur-md"
        style={{
          zIndex: 100,
          background: scrolled
            ? "color-mix(in srgb, #EDF6FF 70%, transparent)"
            : "color-mix(in srgb, #03070F 60%, transparent)",
          borderBottom: `1px solid ${scrolled ? TINT_LIGHT : "rgba(0,180,255,0.12)"}`,
          transition: "background 700ms ease, border-color 700ms ease",
        }}
      >
        <nav className="relative h-full max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between">
          <a href="/" className="flex items-center" style={{ zIndex: 2 }}>
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
              color: scrolled ? NAVY : "#FFFFFF",
              fontSize: 16,
              letterSpacing: "0.32em",
              fontWeight: 700,
              fontFamily: display,
              transition: "color 700ms ease",
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

      {/* HERO — dark, with 3D cube behind text */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20"
        style={{ zIndex: 10 }}
      >
        {/* 3D cube layer — sits behind text */}
        <div
          ref={cubeRef}
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          style={{ zIndex: 0 }}
        />
        {/* Soft glow behind text for legibility */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            zIndex: 1,
            width: 700,
            height: 400,
            background:
              "radial-gradient(ellipse at center, rgba(0,180,255,0.18) 0%, rgba(3,7,15,0) 65%)",
          }}
        />

        <div className="relative" style={{ zIndex: 2 }}>
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
              color: "#FFFFFF",
              fontSize: "clamp(40px, 6.5vw, 84px)",
              maxWidth: 940,
              fontFamily: display,
              textShadow: "0 4px 30px rgba(0,180,255,0.25)",
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
              style={{ width: 60, height: 2, background: ELECTRIC, opacity: 0.8 }}
            />
          </motion.div>

          <motion.p
            className="mt-7 text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
            style={{ color: "rgba(255,255,255,0.72)" }}
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
                color: "#FFFFFF",
                border: "2px solid rgba(255,255,255,0.7)",
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
            className="mt-12 text-xs"
            style={{ color: "rgba(255,255,255,0.5)" }}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={5}
          >
            Scroll to explore ↓
          </motion.div>
        </div>
      </section>

      {/* SECOND SECTION — light, with flowing curved ribbons */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 py-24"
        style={{ zIndex: 10 }}
      >
        <motion.h2
          className="font-bold leading-[1.05] tracking-[-0.02em] mx-auto"
          style={{
            color: NAVY,
            fontSize: "clamp(32px, 5vw, 64px)",
            maxWidth: 880,
            fontFamily: display,
          }}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          BUILT TO RUN THE ENTIRE FUNNEL.
        </motion.h2>

        <motion.p
          className="mt-6 text-base sm:text-lg max-w-xl mx-auto leading-relaxed"
          style={{ color: "rgba(0,26,61,0.72)" }}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          From the first click to the closed deal — NewLight runs the marketing, the booking, the follow-up, and the reporting in one connected system.
        </motion.p>

        <motion.div
          className="mt-10 text-xs"
          style={{ color: "rgba(0,26,61,0.5)" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.25 }}
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
        style={{
          zIndex: 10,
          borderTop: `1px solid ${scrolled ? TINT_LIGHT : "rgba(255,255,255,0.08)"}`,
          transition: "border-color 700ms ease",
        }}
      >
        <p
          className="text-[11px]"
          style={{
            color: scrolled ? "rgba(0,26,61,0.45)" : "rgba(255,255,255,0.4)",
            transition: "color 700ms ease",
          }}
        >
          © NewLight Marketing · (805) 836-3557 · team@newlightgen.com
        </p>
      </footer>
    </div>
  );
}
