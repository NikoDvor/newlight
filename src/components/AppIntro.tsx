import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import newlightLogo from "@/assets/newlight-logo.jpg";

const SESSION_KEY = "nl_intro_played";

export function shouldPlayIntro(): boolean {
  try { return !sessionStorage.getItem(SESSION_KEY); } catch { return true; }
}
export function resetIntroState() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

interface AppIntroProps {
  onComplete: () => void;
  launchLabel?: string;
}

/**
 * AppIntro — minimal 3s intro.
 *
 * A single organic form: a slowly-rotating twisted torus knot rendered as
 * fine wireframe. Nothing else in the scene — no tunnel, no cluster.
 * Background transitions dark → light over the full 3s. Hard-capped at
 * 3000ms from mount to onComplete.
 */
export function AppIntro({ onComplete, launchLabel }: AppIntroProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const startRef = useRef<number>(performance.now());
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
    window.dispatchEvent(new Event("nl-intro-complete"));
    setPhase(4);
    setTimeout(onComplete, 250);
  }, [onComplete]);

  useEffect(() => {
    startRef.current = performance.now();
    const t1 = setTimeout(() => setPhase(1), 20);    // scale-in
    const t2 = setTimeout(() => setPhase(2), 400);   // sustain
    const t3 = setTimeout(() => setPhase(3), 1600);  // bg dark→light
    const t4 = setTimeout(finish, 2750);             // collapse
    const failsafe = setTimeout(onComplete, 3000);   // hard cap
    return () => [t1, t2, t3, t4, failsafe].forEach(clearTimeout);
  }, [finish, onComplete]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const isMobile = window.innerWidth < 768;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const COL_START = new THREE.Color(0xaaddff);
    const COL_END = new THREE.Color(0x1a3a6b); // for light-bg readability

    // Single organic form: a twisted torus knot as fine wireframe.
    // Low tubular/radial segments keep it cheap on mobile.
    const tubularSegs = isMobile ? 120 : 200;
    const radialSegs  = isMobile ? 10 : 16;
    const knotGeo = new THREE.TorusKnotGeometry(1.05, 0.32, tubularSegs, radialSegs, 2, 3);
    const knotMat = new THREE.MeshBasicMaterial({
      color: COL_START.getHex(),
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const knot = new THREE.Mesh(knotGeo, knotMat);
    scene.add(knot);

    const tmp = new THREE.Color();
    let raf = 0;

    const onResize = () => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const easeOutCubic = (t: number) => {
      const c = Math.max(0, Math.min(1, t));
      return 1 - Math.pow(1 - c, 3);
    };

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const elapsed = (now - startRef.current) / 1000;
      const ph = phaseRef.current;

      // Warp-in (0-400ms)
      const inT = easeOutCubic(elapsed / 0.4);

      // Exit collapse (2750-3000ms during phase 4)
      let exit = 1;
      let fade = 1;
      if (ph === 4) {
        const t = Math.min(1, (now - (startRef.current + 2750)) / 250);
        exit = 1 - t * 0.97;
        fade = 1 - t;
      }

      // Color shift (1.6-2.4s)
      const shiftT = Math.min(1, Math.max(0, (elapsed - 1.6) / 0.8));
      tmp.copy(COL_START).lerp(COL_END, shiftT);
      knotMat.color.copy(tmp);
      knotMat.opacity = 0.85 * fade;

      // Slow rotation — deliberate, minimal
      knot.rotation.x += 0.004;
      knot.rotation.y += 0.007;

      // Scale (warp-in + exit)
      knot.scale.setScalar(inT * exit);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      knotGeo.dispose();
      knotMat.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  const bg =
    phase >= 3
      ? "radial-gradient(ellipse at center, #ffffff 0%, #dcebff 80%)"
      : "radial-gradient(ellipse at center, hsl(218,45%,10%) 0%, hsl(218,55%,4%) 80%)";
  const isLight = phase >= 3;

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: bg,
        transition: "background 800ms cubic-bezier(.4,0,.2,1), opacity 400ms ease-out",
        opacity: phase >= 4 ? 0 : 1,
      }}
    >
      <div
        ref={mountRef}
        className="absolute inset-0"
        style={{
          transform: phase >= 4 ? "scale(0.02)" : "scale(1)",
          transition: "transform 400ms cubic-bezier(.6,0,.4,1)",
        }}
      />

      <div
        className="relative z-10 flex flex-col items-center gap-3 px-6 text-center pointer-events-none"
        style={{
          opacity: phase >= 2 && phase < 4 ? 1 : 0,
          transform: phase >= 4 ? "scale(0.02)" : "scale(1)",
          transition: "opacity 500ms ease-out, transform 400ms cubic-bezier(.6,0,.4,1)",
        }}
      >
        <img
          src={newlightLogo}
          alt="NewLight"
          className="h-14 w-auto object-contain"
          style={{
            filter: isLight
              ? "drop-shadow(0 0 12px rgba(26,58,107,0.35))"
              : "drop-shadow(0 0 22px rgba(170,221,255,0.55))",
            transition: "filter 600ms ease",
          }}
        />
        <p
          className="text-[11px] font-bold tracking-[0.32em] uppercase"
          style={{
            color: isLight ? "#1a3a6b" : "#AADDFF",
            fontFamily: "'Rajdhani','Inter',system-ui,sans-serif",
            transition: "color 600ms ease",
          }}
        >
          NEW EYES TO ROI
        </p>
        {launchLabel && (
          <p
            className="text-[10px] tracking-wider uppercase"
            style={{
              color: isLight ? "rgba(26,58,107,0.65)" : "rgba(255,255,255,0.5)",
              transition: "color 600ms ease",
            }}
          >
            {launchLabel}
          </p>
        )}
      </div>

      <button
        onClick={finish}
        className="absolute bottom-5 right-5 z-30 text-[10px] font-medium tracking-wider uppercase px-3 py-1.5 rounded-lg transition-opacity"
        style={{
          color: isLight ? "rgba(0,26,61,0.6)" : "rgba(255,255,255,0.55)",
          border: `1px solid ${isLight ? "rgba(0,26,61,0.18)" : "rgba(255,255,255,0.15)"}`,
          background: isLight ? "rgba(0,26,61,0.04)" : "rgba(255,255,255,0.04)",
          opacity: phase >= 1 && phase < 4 ? 1 : 0,
        }}
      >
        Skip
      </button>
    </div>
  );
}

export default AppIntro;
