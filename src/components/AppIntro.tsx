import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import newlightLogo from "@/assets/newlight-logo.jpg";

const SESSION_KEY = "nl_intro_played";

interface AppIntroProps {
  onComplete: () => void;
  launchLabel?: string;
}

/**
 * AppIntro — original light→dark cinematic intro (~1.8s).
 * Distinct from HomeFX: uses a rotating octahedron core with three
 * cross-axis orbital rings and radial spoke lines. No particle fields,
 * no wireframe icosahedron, no fog. Mobile-friendly (low poly).
 *
 * Timeline:
 *   0–350ms   light bg, rings + core scale in from 0 (elastic)
 *   350–1100  bg fades to deep navy, core color shifts white→electric blue,
 *              rings tilt into alignment
 *   1100–1500 logo + label fade in, gentle breathe
 *   1500–1800 collapse to bright pinpoint, fade out
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
    setTimeout(onComplete, 320);
  }, [onComplete]);

  useEffect(() => {
    startRef.current = performance.now();
    const t1 = setTimeout(() => setPhase(1), 20);
    const t2 = setTimeout(() => setPhase(2), 350);
    const t3 = setTimeout(() => setPhase(3), 1100);
    const t4 = setTimeout(finish, 1500);
    const failsafe = setTimeout(finish, 4000);
    return () => [t1, t2, t3, t4, failsafe].forEach(clearTimeout);
  }, [finish]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const isMobile = window.innerWidth < 768;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // Core: solid octahedron (low poly, ~8 tris)
    const coreGeo = new THREE.OctahedronGeometry(0.9, 0);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // Core edges highlight
    const edgeGeo = new THREE.EdgesGeometry(coreGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x0a2540, transparent: true, opacity: 0.9 });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    core.add(edges);

    // Three orbital rings on different axes
    const ringSegs = isMobile ? 48 : 96;
    const ringGeo = new THREE.TorusGeometry(1.7, 0.012, 8, ringSegs);
    const rings: THREE.Mesh[] = [];
    const ringMats: THREE.MeshBasicMaterial[] = [];
    const axes: [number, number, number][] = [
      [0, 0, 0],
      [Math.PI / 2, 0, 0],
      [Math.PI / 3, Math.PI / 3, 0],
    ];
    axes.forEach(([rx, ry, rz]) => {
      const m = new THREE.MeshBasicMaterial({ color: 0x1a2b4a, transparent: true, opacity: 0.85 });
      const ring = new THREE.Mesh(ringGeo, m);
      ring.rotation.set(rx, ry, rz);
      scene.add(ring);
      rings.push(ring);
      ringMats.push(m);
    });

    // Radial spokes: 8 short lines emanating from origin
    const spokeCount = 8;
    const spokePositions = new Float32Array(spokeCount * 6);
    for (let i = 0; i < spokeCount; i++) {
      const a = (i / spokeCount) * Math.PI * 2;
      const inner = 1.05;
      const outer = 1.45;
      spokePositions[i * 6] = Math.cos(a) * inner;
      spokePositions[i * 6 + 1] = Math.sin(a) * inner;
      spokePositions[i * 6 + 2] = 0;
      spokePositions[i * 6 + 3] = Math.cos(a) * outer;
      spokePositions[i * 6 + 4] = Math.sin(a) * outer;
      spokePositions[i * 6 + 5] = 0;
    }
    const spokeGeo = new THREE.BufferGeometry();
    spokeGeo.setAttribute("position", new THREE.BufferAttribute(spokePositions, 3));
    const spokeMat = new THREE.LineBasicMaterial({ color: 0x0a2540, transparent: true, opacity: 0.6 });
    const spokes = new THREE.LineSegments(spokeGeo, spokeMat);
    scene.add(spokes);

    const colorLight = new THREE.Color(0x0a2540);
    const colorBlue = new THREE.Color(0x3b9eff);
    const coreLight = new THREE.Color(0xffffff);
    const coreBlue = new THREE.Color(0x9dd6ff);
    const tmp = new THREE.Color();

    let raf = 0;
    const onResize = () => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // easeOutBack for entrance
    const easeOutBack = (t: number) => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const elapsed = (now - startRef.current) / 1000;
      const ph = phaseRef.current;

      // Entrance scale
      const entranceT = Math.min(1, elapsed / 0.35);
      const entrance = easeOutBack(entranceT);

      // Exit collapse
      let exit = 1;
      if (ph === 4) {
        const t = Math.min(1, (now - (startRef.current + 1500)) / 300);
        exit = 1 - t * 0.98;
        coreMat.opacity = 0.95 * (1 - t);
        edgeMat.opacity = 0.9 * (1 - t);
        ringMats.forEach((m) => (m.opacity = 0.85 * (1 - t)));
        spokeMat.opacity = 0.6 * (1 - t);
      }

      // Color transition (phase 2 window)
      const colorT = Math.min(1, Math.max(0, (elapsed - 0.35) / 0.75));
      tmp.copy(colorLight).lerp(colorBlue, colorT);
      ringMats.forEach((m) => m.color.copy(tmp));
      spokeMat.color.copy(tmp);
      edgeMat.color.copy(tmp);
      tmp.copy(coreLight).lerp(coreBlue, colorT);
      coreMat.color.copy(tmp);

      // Core rotation
      core.rotation.x += 0.012;
      core.rotation.y += 0.018;
      core.scale.setScalar(entrance * exit);

      // Rings rotate on their own local axes; add scale pulse
      const pulse = 1 + Math.sin(elapsed * 4) * 0.03;
      rings.forEach((r, i) => {
        r.rotation.z += 0.006 * (i + 1);
        r.rotation.x += 0.003;
        r.scale.setScalar(entrance * exit * pulse);
      });

      spokes.rotation.z -= 0.01;
      spokes.scale.setScalar(entrance * exit);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      coreGeo.dispose();
      coreMat.dispose();
      edgeGeo.dispose();
      edgeMat.dispose();
      ringGeo.dispose();
      ringMats.forEach((m) => m.dispose());
      spokeGeo.dispose();
      spokeMat.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // Light→dark radial background
  const bg =
    phase >= 2
      ? "radial-gradient(ellipse at center, hsl(218,45%,10%) 0%, hsl(218,50%,4%) 80%)"
      : "radial-gradient(ellipse at center, #ffffff 0%, #e6efff 80%)";

  const dark = phase >= 2;

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: bg,
        transition: "background 750ms cubic-bezier(.4,0,.2,1), opacity 320ms ease-out",
        opacity: phase >= 4 ? 0 : 1,
      }}
    >
      <div
        ref={mountRef}
        className="absolute inset-0"
        style={{
          transform: phase >= 4 ? "scale(0.02)" : "scale(1)",
          transition: "transform 320ms cubic-bezier(.6,0,.4,1)",
        }}
      />

      <div
        className="relative z-10 flex flex-col items-center gap-3 px-6 text-center pointer-events-none"
        style={{
          opacity: phase >= 3 && phase < 4 ? 1 : 0,
          transform: phase >= 4 ? "scale(0.02)" : "scale(1)",
          transition: "opacity 350ms ease-out, transform 320ms cubic-bezier(.6,0,.4,1)",
        }}
      >
        <img
          src={newlightLogo}
          alt="NewLight"
          className="h-14 w-auto object-contain"
          style={{ filter: "drop-shadow(0 0 22px rgba(59,158,255,0.55))" }}
        />
        <p
          className="text-[11px] font-bold tracking-[0.32em] uppercase"
          style={{ color: "#3B9EFF", fontFamily: "'Rajdhani','Inter',system-ui,sans-serif" }}
        >
          NEW EYES TO ROI
        </p>
        {launchLabel && (
          <p className="text-[10px] tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.5)" }}>
            {launchLabel}
          </p>
        )}
      </div>

      <button
        onClick={finish}
        className="absolute bottom-5 right-5 z-30 text-[10px] font-medium tracking-wider uppercase px-3 py-1.5 rounded-lg transition-opacity"
        style={{
          color: dark ? "rgba(255,255,255,0.55)" : "rgba(0,26,61,0.6)",
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

export default AppIntro;
