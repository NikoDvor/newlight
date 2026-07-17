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
 * AppIntro — ~3s starburst convergence + burst reveal.
 *
 * Distinct visual treatment (v2):
 *   - Warm amber/gold particles that shift to bright white at the flash
 *   - Electric-blue secondary accent rays crossing through the center
 *   - Grid-origin particles converge in straight starburst rays toward the center
 *     (no spiral), then explode outward as radiating spokes on the burst.
 *
 * Timeline:
 *   0    – 2000ms: grid-origin particles rush inward along straight rays on a dark bg
 *   2000 – 2600ms: bright flash; background transitions from dark to light
 *   2600 – 3000ms: overlay fades to reveal the app
 */
export function AppIntro({ onComplete, launchLabel }: AppIntroProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);
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
    const t1 = setTimeout(() => setPhase(1), 2000);
    const t2 = setTimeout(() => setPhase(2), 2600);
    const t3 = setTimeout(finish, 3000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [finish, onComplete]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const isMobile = window.innerWidth < 768;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 200);
    camera.position.z = 42;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const COUNT = isMobile ? 1400 : 4200;
    const positions = new Float32Array(COUNT * 3);
    const dirX = new Float32Array(COUNT);
    const dirY = new Float32Array(COUNT);
    const dirZ = new Float32Array(COUNT);
    const dist = new Float32Array(COUNT);        // current distance from center along ray
    const startDist = new Float32Array(COUNT);
    const speed = new Float32Array(COUNT);
    const accent = new Uint8Array(COUNT);        // 1 = electric-blue accent ray, 0 = amber

    // Grid-origin starburst: place particles on a coarse 3D grid, then compute
    // a straight ray from that grid point through the origin. Particles march
    // inward along that ray during convergence and blast outward on burst.
    const GRID = isMobile ? 12 : 16;
    const GRID_SPAN = 55;
    let i = 0;
    while (i < COUNT) {
      // Grid cell with slight jitter so it doesn't look mechanical.
      const gx = (Math.random() - 0.5) * GRID_SPAN + ((Math.floor(Math.random() * GRID) / GRID) - 0.5) * 6;
      const gy = (Math.random() - 0.5) * GRID_SPAN + ((Math.floor(Math.random() * GRID) / GRID) - 0.5) * 6;
      const gz = (Math.random() - 0.5) * 24;
      const len = Math.hypot(gx, gy, gz);
      if (len < 6) continue; // avoid particles that start on top of the center
      dirX[i] = gx / len;
      dirY[i] = gy / len;
      dirZ[i] = gz / len;
      startDist[i] = len;
      dist[i] = len;
      speed[i] = 0.35 + Math.random() * 0.35;
      // ~14% of particles are the electric-blue accent, forming visible spokes.
      accent[i] = Math.random() < 0.14 ? 1 : 0;

      const ix = i * 3;
      positions[ix] = gx;
      positions[ix + 1] = gy;
      positions[ix + 2] = gz;
      i++;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Per-vertex colors so amber and electric-blue particles coexist.
    const colors = new Float32Array(COUNT * 3);
    const AMBER = new THREE.Color(0xffb347);         // warm gold/amber
    const ELECTRIC = new THREE.Color(0x3ea8ff);      // electric blue accent
    for (let k = 0; k < COUNT; k++) {
      const c = accent[k] ? ELECTRIC : AMBER;
      colors[k * 3] = c.r;
      colors[k * 3 + 1] = c.g;
      colors[k * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Soft glowing sprite.
    const spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = 32;
    spriteCanvas.height = 32;
    const ctx = spriteCanvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.5)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const sprite = new THREE.CanvasTexture(spriteCanvas);
    sprite.needsUpdate = true;

    const mat = new THREE.PointsMaterial({
      size: isMobile ? 0.5 : 0.42,
      map: sprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = geo.getAttribute("color") as THREE.BufferAttribute;
    const WHITE = new THREE.Color(0xffffff);
    const tmpColor = new THREE.Color();

    let raf = 0;
    let burstInitialized = false;
    const onResize = () => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const BURST_START = 2.0;
    const FADE_START = 2.6;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const elapsed = (now - startRef.current) / 1000;
      const ph = phaseRef.current;
      const inBurst = elapsed >= BURST_START;
      const burstT = Math.min(1, Math.max(0, (elapsed - BURST_START) / 0.5));
      const convergeT = Math.min(1, elapsed / BURST_START);

      if (inBurst && !burstInitialized) {
        burstInitialized = true;
        for (let k = 0; k < COUNT; k++) {
          // Explode outward along the same ray, faster than convergence.
          speed[k] = 1.4 + Math.random() * 1.2;
        }
      }

      for (let k = 0; k < COUNT; k++) {
        if (!inBurst) {
          // March inward along the straight ray with easing near the center.
          const proximity = Math.max(0.15, dist[k] / startDist[k]);
          dist[k] -= speed[k] * (0.35 + proximity * 0.9);
          if (dist[k] < 0.5) dist[k] = 0.5;
        } else {
          // Rush outward along the same ray.
          const accel = 1 + burstT * 2.2;
          dist[k] += speed[k] * accel;
        }

        const ix = k * 3;
        positions[ix]     = dirX[k] * dist[k];
        positions[ix + 1] = dirY[k] * dist[k];
        positions[ix + 2] = dirZ[k] * dist[k];
      }
      posAttr.needsUpdate = true;

      // Color: warm amber (or electric blue) → white as we approach the burst.
      // Blend toward white based on convergeT, and snap fully to white at burst.
      const toWhite = inBurst ? 1 : convergeT * 0.85;
      for (let k = 0; k < COUNT; k++) {
        const base = accent[k] ? ELECTRIC : AMBER;
        tmpColor.copy(base).lerp(WHITE, toWhite);
        const ix = k * 3;
        colors[ix]     = tmpColor.r;
        colors[ix + 1] = tmpColor.g;
        colors[ix + 2] = tmpColor.b;
      }
      colAttr.needsUpdate = true;

      if (ph >= 2) {
        const fadeT = Math.min(1, (elapsed - FADE_START) / 0.25);
        mat.opacity = Math.max(0, 1.0 - fadeT);
      } else if (inBurst) {
        mat.opacity = 0.95 + 0.05 * burstT;
      } else {
        mat.opacity = 0.7 + 0.25 * convergeT;
      }

      camera.position.z = 42 - 18 * Math.min(1, elapsed / BURST_START);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      geo.dispose();
      mat.dispose();
      sprite.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // Background: warm dark amber-tinted during convergence, snapping bright at burst.
  const bg =
    phase === 0
      ? "radial-gradient(circle at center, hsl(28,45%,10%) 0%, hsl(222,55%,5%) 100%)"
      : "radial-gradient(circle at center, #ffffff 0%, #fff6e8 100%)";

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: bg,
        transition: "background 450ms ease-out, opacity 300ms ease-out",
        opacity: phase >= 2 ? 0 : 1,
      }}
    >
      <div ref={mountRef} className="absolute inset-0" />

      <div
        className="relative z-10 flex flex-col items-center gap-3 px-6 text-center pointer-events-none"
        style={{
          opacity: phase >= 1 && phase < 3 ? 1 : 0,
          transform: phase >= 3 ? "scale(1.15)" : "scale(1)",
          transition: "opacity 400ms ease-out, transform 300ms cubic-bezier(.6,0,.4,1)",
        }}
      >
        <img
          src={newlightLogo}
          alt="NewLight"
          className="h-14 w-auto object-contain"
          style={{ filter: "drop-shadow(0 0 14px rgba(255,179,71,0.45))" }}
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
