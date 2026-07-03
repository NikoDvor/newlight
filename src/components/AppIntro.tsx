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
 * AppIntro — 3s intro.
 *
 * Timeline (total 3000ms hard cap):
 *   0    – 120ms : dark → white flash (near-instant)
 *   120  – 2600ms: 3D warp/tunnel travel on white background
 *   2600 – 3000ms: tunnel resolves/fades out into the app
 */
export function AppIntro({ onComplete, launchLabel }: AppIntroProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0); // 0=dark, 1=flash-white, 2=warp, 3=resolve
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const startRef = useRef<number>(performance.now());
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
    window.dispatchEvent(new Event("nl-intro-complete"));
    setPhase(3);
    setTimeout(onComplete, 200);
  }, [onComplete]);

  useEffect(() => {
    startRef.current = performance.now();
    const t1 = setTimeout(() => setPhase(1), 30);      // trigger flash to white
    const t2 = setTimeout(() => setPhase(2), 250);     // warp begins
    const t3 = setTimeout(finish, 2800);               // start resolve
    const failsafe = setTimeout(onComplete, 3000);     // hard cap
    return () => [t1, t2, t3, failsafe].forEach(clearTimeout);
  }, [finish, onComplete]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const isMobile = window.innerWidth < 768;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, el.clientWidth / el.clientHeight, 0.1, 200);
    camera.position.z = 0;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // Warp streaks — points travelling toward the camera along z.
    const COUNT = isMobile ? 500 : 1200;
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    const RADIUS = 22;
    const DEPTH = 120;
    for (let i = 0; i < COUNT; i++) {
      const r = Math.pow(Math.random(), 0.5) * RADIUS;
      const a = Math.random() * Math.PI * 2;
      positions[i * 3]     = Math.cos(a) * r;
      positions[i * 3 + 1] = Math.sin(a) * r;
      positions[i * 3 + 2] = -Math.random() * DEPTH;
      speeds[i] = 0.6 + Math.random() * 1.4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x1a3a6b,
      size: isMobile ? 0.18 : 0.14,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // A subtle central ring/tunnel wireframe to anchor the warp.
    const ringGeo = new THREE.TorusGeometry(6, 0.05, 8, 96);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x3366aa,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
    });
    const rings: THREE.Mesh[] = [];
    const RING_COUNT = isMobile ? 6 : 10;
    for (let i = 0; i < RING_COUNT; i++) {
      const m = new THREE.Mesh(ringGeo, ringMat);
      m.position.z = -i * 8;
      scene.add(m);
      rings.push(m);
    }

    let raf = 0;
    const onResize = () => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const elapsed = (now - startRef.current) / 1000;
      const ph = phaseRef.current;

      // Warp intensity ramps up after the flash, resolves at the end.
      let warp = 0;
      if (elapsed > 0.25) warp = Math.min(1, (elapsed - 0.25) / 0.5);
      if (ph === 3) {
        const t = Math.min(1, (now - (startRef.current + 2800)) / 200);
        warp *= 1 + t * 4; // final acceleration
      }

      const baseSpeed = 0.35 * warp;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < COUNT; i++) {
        const iz = i * 3 + 2;
        arr[iz] += speeds[i] * baseSpeed;
        if (arr[iz] > camera.position.z + 1) {
          const r = Math.pow(Math.random(), 0.5) * RADIUS;
          const a = Math.random() * Math.PI * 2;
          arr[i * 3]     = Math.cos(a) * r;
          arr[i * 3 + 1] = Math.sin(a) * r;
          arr[iz] = -DEPTH;
        }
      }
      posAttr.needsUpdate = true;

      // Rings drift forward for tunnel effect.
      for (const r of rings) {
        r.position.z += 0.35 * warp;
        if (r.position.z > 2) r.position.z -= RING_COUNT * 8;
      }
      points.rotation.z += 0.002;

      // Fade streaks out during resolve.
      if (ph === 3) {
        const t = Math.min(1, (now - (startRef.current + 2800)) / 200);
        mat.opacity = 0.9 * (1 - t);
        ringMat.opacity = 0.35 * (1 - t);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      geo.dispose();
      mat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // Background: dark at phase 0, snap to white from phase 1 onward.
  const bg =
    phase === 0
      ? "radial-gradient(ellipse at center, hsl(218,45%,10%) 0%, hsl(218,55%,4%) 80%)"
      : "radial-gradient(ellipse at center, #ffffff 0%, #e8f1ff 90%)";

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: bg,
        transition: "background 120ms ease-out, opacity 300ms ease-out",
        opacity: phase >= 3 ? 0 : 1,
      }}
    >
      <div ref={mountRef} className="absolute inset-0" />

      <div
        className="relative z-10 flex flex-col items-center gap-3 px-6 text-center pointer-events-none"
        style={{
          opacity: phase >= 2 && phase < 3 ? 1 : 0,
          transform: phase >= 3 ? "scale(1.15)" : "scale(1)",
          transition: "opacity 400ms ease-out, transform 300ms cubic-bezier(.6,0,.4,1)",
        }}
      >
        <img
          src={newlightLogo}
          alt="NewLight"
          className="h-14 w-auto object-contain"
          style={{ filter: "drop-shadow(0 0 14px rgba(26,58,107,0.35))" }}
        />
        <p
          className="text-[11px] font-bold tracking-[0.32em] uppercase"
          style={{
            color: "#1a3a6b",
            fontFamily: "'Rajdhani','Inter',system-ui,sans-serif",
          }}
        >
          NEW EYES TO ROI
        </p>
        {launchLabel && (
          <p className="text-[10px] tracking-wider uppercase" style={{ color: "rgba(26,58,107,0.65)" }}>
            {launchLabel}
          </p>
        )}
      </div>

      <button
        onClick={finish}
        className="absolute bottom-5 right-5 z-30 text-[10px] font-medium tracking-wider uppercase px-3 py-1.5 rounded-lg transition-opacity"
        style={{
          color: "rgba(0,26,61,0.6)",
          border: "1px solid rgba(0,26,61,0.18)",
          background: "rgba(0,26,61,0.04)",
          opacity: phase >= 1 && phase < 3 ? 1 : 0,
        }}
      >
        Skip
      </button>
    </div>
  );
}

export default AppIntro;
