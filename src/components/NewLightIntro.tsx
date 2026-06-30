import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import newlightLogo from "@/assets/newlight-logo.jpg";

const SESSION_KEY = "nl_intro_played";

interface NewLightIntroProps {
  onComplete: () => void;
  launchLabel?: string;
}

type Phase = 0 | 1 | 2 | 3;

export function NewLightIntro({ onComplete, launchLabel }: NewLightIntroProps) {
  const [phase, setPhase] = useState<Phase>(0);
  const mountRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");
    window.dispatchEvent(new Event("nl-intro-complete"));
    setPhase(3);
    setTimeout(onComplete, 600);
  }, [onComplete]);

  // Phase timeline
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);   // logo + tagline in
    const t2 = setTimeout(() => setPhase(2), 1800);  // begin light fade
    const t3 = setTimeout(finish, 2800);             // finish
    const failsafe = setTimeout(finish, 5500);
    return () => [t1, t2, t3, failsafe].forEach(clearTimeout);
  }, [finish]);

  // Three.js wireframe cube scene
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const makeCube = (size: number, color: number, opacity: number) => {
      const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size));
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
      });
      return new THREE.LineSegments(geo, mat);
    };

    const c1 = makeCube(4.5, 0x00b4ff, 0.55);
    const c2 = makeCube(3.0, 0x4dd0ff, 0.4);
    const c3 = makeCube(2.0, 0x80e0ff, 0.3);
    group.add(c1, c2, c3);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    let t = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.012;
      c1.rotation.x = t * 0.6;
      c1.rotation.y = t * 0.4;
      c2.rotation.x = -t * 0.5;
      c2.rotation.y = t * 0.7;
      c3.rotation.x = t * 0.9;
      c3.rotation.z = t * 0.5;
      group.rotation.y += 0.002;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      [c1, c2, c3].forEach((c) => {
        c.geometry.dispose();
        (c.material as THREE.Material).dispose();
      });
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  const fading = phase >= 3;
  const lightening = phase >= 2;

  return (
    <AnimatePresence>
      <motion.div
        key="nl-intro"
        className="fixed inset-0 z-[99999] overflow-hidden flex flex-col items-center justify-center"
        initial={{ opacity: 1 }}
        animate={{ opacity: fading ? 0 : 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        {/* Dark navy base */}
        <div className="absolute inset-0" style={{ background: "#03152E" }} />

        {/* Three.js wireframe */}
        <div
          ref={mountRef}
          className="absolute inset-0"
          style={{ pointerEvents: "none" }}
        />

        {/* Radial glow from center */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(0,180,255,0.18) 0%, rgba(0,180,255,0.06) 30%, transparent 65%)",
          }}
        />

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
              filter:
                "drop-shadow(0 0 30px rgba(0,180,255,0.85)) drop-shadow(0 0 60px rgba(0,180,255,0.4))",
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />

          <motion.p
            className="text-[11px] font-bold tracking-[0.32em] uppercase"
            style={{ color: "#00B4FF" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 8 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            // AI MODERN MARKETING SYSTEMS
          </motion.p>

          {launchLabel && phase >= 1 && (
            <motion.p
              className="text-[10px] tracking-wider uppercase text-white/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {launchLabel}
            </motion.p>
          )}
        </div>

        {/* Whitewash to light icy blue */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "#EDF6FF" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: lightening ? 1 : 0 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
        />

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
