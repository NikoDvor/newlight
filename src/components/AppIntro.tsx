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
 * AppIntro — ~3s particle convergence + burst intro.
 *
 * Timeline:
 *   0    – 2000ms: thousands of light particles drift and swirl inward on a dark background
 *   2000 – 2600ms: particles burst into a bright flash; background transitions from dark to light
 *   2600 – 3000ms: the overlay fades out to reveal the app
 */
export function AppIntro({ onComplete, launchLabel }: AppIntroProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0); // 0=converge, 1=burst, 2=fade, 3=done
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
    const t1 = setTimeout(() => setPhase(1), 2000); // bright flash / background light
    const t2 = setTimeout(() => setPhase(2), 2600); // begin overlay fade
    const t3 = setTimeout(finish, 3000);            // hard cap
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [finish, onComplete]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const isMobile = window.innerWidth < 768;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 200);
    camera.position.z = 40;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // Particle count: thousands on desktop, capped on mobile.
    const COUNT = isMobile ? 1200 : 4000;
    const positions = new Float32Array(COUNT * 3);
    const angle = new Float32Array(COUNT);
    const radius = new Float32Array(COUNT);
    const height = new Float32Array(COUNT);
    const radialVel = new Float32Array(COUNT);
    const angularVel = new Float32Array(COUNT);
    const heightVel = new Float32Array(COUNT);
    const burstSpeed = new Float32Array(COUNT);
    const burstDir = new Float32Array(COUNT);
    const burstHeightDir = new Float32Array(COUNT);

    const SCATTER = 60;
    for (let i = 0; i < COUNT; i++) {
      angle[i] = Math.random() * Math.PI * 2;
      radius[i] = 8 + Math.pow(Math.random(), 0.55) * SCATTER;
      height[i] = (Math.random() - 0.5) * 30;
      radialVel[i] = -(0.04 + Math.random() * 0.05);
      angularVel[i] = (Math.random() < 0.5 ? 1 : -1) * (0.018 + Math.random() * 0.025);
      heightVel[i] = (Math.random() - 0.5) * 0.02;
      burstSpeed[i] = 0.8 + Math.random() * 1.2;
      burstDir[i] = Math.random() * Math.PI * 2;
      burstHeightDir[i] = Math.random() - 0.5;

      const ix = i * 3;
      positions[ix] = Math.cos(angle[i]) * radius[i];
      positions[ix + 1] = Math.sin(angle[i]) * radius[i];
      positions[ix + 2] = height[i];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Soft glowing sprite so each particle reads as a small light.
    const spriteCanvas = document.createElement("canvas");
    spriteCanvas.width = 32;
    spriteCanvas.height = 32;
    const ctx = spriteCanvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.45)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const sprite = new THREE.CanvasTexture(spriteCanvas);
    sprite.needsUpdate = true;

    const mat = new THREE.PointsMaterial({
      color: 0x5aa8ff,
      size: isMobile ? 0.4 : 0.32,
      map: sprite,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;

    const DARK_COLOR = new THREE.Color(0x5aa8ff);
    const BRIGHT_COLOR = new THREE.Color(0xffffff);

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

      // Initialize outward burst velocities once at the moment of the flash.
      if (inBurst && !burstInitialized) {
        burstInitialized = true;
        for (let i = 0; i < COUNT; i++) {
          radialVel[i] = burstSpeed[i] * (0.35 + Math.random() * 0.15);
          heightVel[i] = burstHeightDir[i] * burstSpeed[i] * 0.25;
          angularVel[i] *= 1.3;
        }
      }

      for (let i = 0; i < COUNT; i++) {
        if (!inBurst) {
          // Gentle inward spiral with damping.
          radialVel[i] += (0.6 - radius[i]) * 0.010 - radialVel[i] * 0.020;
          angularVel[i] *= 1.0028;
          heightVel[i] += (-height[i]) * 0.010 - heightVel[i] * 0.020;
        } else {
          // Accelerating outward burst.
          const decel = 1 - burstT * 0.45;
          radialVel[i] += burstSpeed[i] * 0.025 * decel;
          angularVel[i] += Math.sin(burstDir[i]) * 0.003 * decel;
          heightVel[i] += burstHeightDir[i] * burstSpeed[i] * 0.02 * decel;
        }

        radius[i] += radialVel[i];
        angle[i] += angularVel[i];
        height[i] += heightVel[i];

        const ix = i * 3;
        positions[ix] = Math.cos(angle[i]) * radius[i];
        positions[ix + 1] = Math.sin(angle[i]) * radius[i];
        positions[ix + 2] = height[i];
      }
      posAttr.needsUpdate = true;

      // Color warms from cool blue to bright white as particles converge.
      mat.color.copy(DARK_COLOR).lerp(BRIGHT_COLOR, convergeT);

      // Opacity rises during convergence, peaks at the flash, then fades.
      if (ph >= 2) {
        const fadeT = Math.min(1, (elapsed - FADE_START) / 0.25);
        mat.opacity = Math.max(0, 1.0 - fadeT);
      } else if (inBurst) {
        mat.opacity = 0.9 + 0.1 * burstT;
      } else {
        mat.opacity = 0.55 + 0.35 * convergeT;
      }

      // Slow camera drift inward during the convergence.
      camera.position.z = 40 - 18 * Math.min(1, elapsed / BURST_START);

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

  // Background: dark during convergence, snapping to bright white at the burst, then fading out.
  const bg =
    phase === 0
      ? "radial-gradient(circle at center, hsl(218,40%,15%) 0%, hsl(220,50%,6%) 100%)"
      : "radial-gradient(circle at center, #ffffff 0%, #eef6ff 100%)";

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
