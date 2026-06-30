import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import newlightLogo from "@/assets/newlight-logo.jpg";

const SESSION_KEY = "nl_intro_played";

interface NewLightIntroProps {
  onComplete: () => void;
  launchLabel?: string;
}

/**
 * Minimal cinematic intro (~2.5s):
 *   0-500ms   white bg, sphere elastic scale-in, breathing
 *   500-1300  bg fades to navy, sphere color shifts white → electric blue
 *   1300-2000 logo + tagline fade in
 *   2000-2500 everything collapses to a single bright point + fades out
 */
export function NewLightIntro({ onComplete, launchLabel }: NewLightIntroProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const startRef = useRef<number>(performance.now());
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    sessionStorage.setItem(SESSION_KEY, "1");
    window.dispatchEvent(new Event("nl-intro-complete"));
    setPhase(4);
    setTimeout(onComplete, 520);
  }, [onComplete]);

  // Phase timeline
  useEffect(() => {
    startRef.current = performance.now();
    const t1 = setTimeout(() => setPhase(1), 20);     // sphere in (white)
    const t2 = setTimeout(() => setPhase(2), 500);    // bg + color shift
    const t3 = setTimeout(() => setPhase(3), 1300);   // logo + tagline
    const t4 = setTimeout(finish, 2000);              // collapse
    const failsafe = setTimeout(finish, 5000);
    return () => [t1, t2, t3, t4, failsafe].forEach(clearTimeout);
  }, [finish]);

  // Three.js scene
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const isMobile = window.innerWidth < 768;
    const detail = isMobile ? 1 : 2;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      el.clientWidth / el.clientHeight,
      0.1,
      100
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const geom = new THREE.IcosahedronGeometry(1.5, detail);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 1,
    });
    const sphere = new THREE.Mesh(geom, mat);
    scene.add(sphere);

    const light = new THREE.PointLight(0xffffff, 1, 10);
    light.position.set(0, 0, 0);
    scene.add(light);

    const colorWhite = new THREE.Color(0xffffff);
    const colorBlue = new THREE.Color(0x3b9eff);
    const tmpColor = new THREE.Color();

    let raf = 0;
    const onResize = () => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const elasticOut = (t: number) => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      const p = 0.4;
      return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
    };

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const elapsed = (now - startRef.current) / 1000; // seconds
      const ph = phaseRef.current;

      // Breathing pulse
      const pulse = Math.sin((elapsed * Math.PI * 2) / 1.2) * 0.03 + 1.03; // 1.0..1.06 avg ~1.03
      const breathe = 1 + (pulse - 1); // simplified

      // Entrance scale (0 -> 1 with elastic, during 0-500ms)
      const entranceT = Math.min(1, elapsed / 0.5);
      const entranceScale = elasticOut(entranceT);

      // Exit collapse (phase 4): scale 1 -> 0.02
      let exitScale = 1;
      if (ph === 4) {
        // approximate progress over 500ms
        const exitElapsed = Math.min(1, (now - (startRef.current + 2000)) / 500);
        exitScale = 1 - exitElapsed * 0.98;
        mat.opacity = Math.max(0, 1 - exitElapsed);
      } else {
        mat.opacity = 1;
      }

      const finalScale = entranceScale * breathe * exitScale;
      sphere.scale.setScalar(finalScale);

      // Color transition during phase 2 (500-1300ms)
      const colorT = Math.min(1, Math.max(0, (elapsed - 0.5) / 0.8));
      tmpColor.copy(colorWhite).lerp(colorBlue, colorT);
      mat.color.copy(tmpColor);
      light.color.copy(tmpColor);
      light.intensity = 0.8 + (pulse - 1) * 6;

      // Slow Y rotation (skip on mobile)
      if (!isMobile) {
        sphere.rotation.y += (Math.PI * 2) / (10 * 60); // ~10s per rev @60fps
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      geom.dispose();
      mat.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // Background color by phase
  const bg =
    phase >= 2 ? "hsl(218, 42%, 5%)" : "#FFFFFF";

  const dark = phase >= 2;

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: bg,
        transition: "background 800ms cubic-bezier(.4,0,.2,1)",
        opacity: phase >= 4 ? 0 : 1,
        transitionProperty: "background, opacity",
        transitionDuration: "800ms, 500ms",
      }}
    >
      {/* Three.js canvas */}
      <div
        ref={mountRef}
        className="absolute inset-0"
        style={{
          transform: phase >= 4 ? "scale(0.02)" : "scale(1)",
          transition: "transform 500ms cubic-bezier(.6,0,.4,1)",
        }}
      />

      {/* Logo + tagline */}
      <div
        className="relative z-10 flex flex-col items-center gap-4 px-6 text-center pointer-events-none"
        style={{
          opacity: phase >= 3 && phase < 4 ? 1 : 0,
          transform: phase >= 4 ? "scale(0.02)" : "scale(1)",
          transition:
            "opacity 600ms ease-out, transform 500ms cubic-bezier(.6,0,.4,1)",
        }}
      >
        <img
          src={newlightLogo}
          alt="NewLight"
          className="h-16 w-auto object-contain"
          style={{
            filter: "drop-shadow(0 0 24px rgba(59,158,255,0.6))",
          }}
        />
        <p
          className="text-[11px] font-bold tracking-[0.32em] uppercase"
          style={{
            color: "#3B9EFF",
            fontFamily: "'Rajdhani','Inter',system-ui,sans-serif",
          }}
        >
          NEW EYES TO ROI
        </p>
        {launchLabel && (
          <p
            className="text-[10px] tracking-wider uppercase"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            {launchLabel}
          </p>
        )}
      </div>

      {/* Skip */}
      <button
        onClick={finish}
        className="absolute bottom-5 right-5 z-30 text-[10px] font-medium tracking-wider uppercase px-3 py-1.5 rounded-lg transition-opacity"
        style={{
          color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,26,61,0.55)",
          border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(0,26,61,0.18)"}`,
          background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,26,61,0.04)",
          opacity: phase >= 1 && phase < 4 ? 1 : 0,
        }}
      >
        Skip
      </button>
    </div>
  );
}

export default NewLightIntro;

export function shouldPlayIntro(): boolean {
  return !sessionStorage.getItem(SESSION_KEY);
}

export function resetIntroState() {
  sessionStorage.removeItem(SESSION_KEY);
}
