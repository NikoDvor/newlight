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
 * AppIntro — original 3D intro (3s total).
 *
 * Concept: a spinning octahedron core sitting at the mouth of a
 * hexagonal warp tunnel. Concentric hex rings pulse outward, thin
 * radial beams sweep around the core, and a sparse orbital cube
 * cluster spins in counter-motion. Dark navy → light blue-white bg.
 *
 * Timeline (3000ms):
 *   0-450    warp-in: rings/cube cluster fly in from depth, core scales up
 *   450-1800 sustain: full motion, rings pulse, beams sweep
 *   1800-2600 palette inverts (dark → light), colors deepen for readability
 *   2600-3000 collapse to center + fade out
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
    // 250ms collapse/fade, so onComplete fires at 2750ms + 250ms = 3000ms max.
    setTimeout(onComplete, 250);
  }, [onComplete]);

  useEffect(() => {
    startRef.current = performance.now();
    // Hard 3000ms budget: phases + collapse must fit within it.
    const t1 = setTimeout(() => setPhase(1), 20);    // scale-in
    const t2 = setTimeout(() => setPhase(2), 400);   // sustain
    const t3 = setTimeout(() => setPhase(3), 1600);  // bg dark→light
    const t4 = setTimeout(finish, 2750);             // start collapse
    const failsafe = setTimeout(onComplete, 3000);   // hard cap
    return () => [t1, t2, t3, t4, failsafe].forEach(clearTimeout);
  }, [finish, onComplete]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const isMobile = window.innerWidth < 768;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !isMobile });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const COL_A = new THREE.Color(0xaaddff); // primary
    const COL_B = new THREE.Color(0x66b8ff); // deep accent
    const COL_LIGHT_END = new THREE.Color(0x1a3a6b); // final dark-navy for light bg

    // Central octahedron core (wireframe)
    const coreGeo = new THREE.OctahedronGeometry(0.95, 0);
    const coreEdges = new THREE.EdgesGeometry(coreGeo);
    const coreMat = new THREE.LineBasicMaterial({ color: COL_A.getHex(), transparent: true, opacity: 0.95 });
    const core = new THREE.LineSegments(coreEdges, coreMat);
    scene.add(core);

    // Inner solid faceted glow octahedron
    const innerGeo = new THREE.OctahedronGeometry(0.42, 0);
    const innerMat = new THREE.MeshBasicMaterial({
      color: COL_B.getHex(),
      transparent: true,
      opacity: 0.35,
      wireframe: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    scene.add(inner);

    // Hex tunnel rings (concentric, receding in Z)
    const RING_COUNT = isMobile ? 6 : 9;
    const rings: THREE.LineLoop[] = [];
    const ringMats: THREE.LineBasicMaterial[] = [];
    for (let i = 0; i < RING_COUNT; i++) {
      const pts: THREE.Vector3[] = [];
      const r = 1.6 + i * 0.05;
      const sides = 6;
      for (let s = 0; s <= sides; s++) {
        const a = (s / sides) * Math.PI * 2 + Math.PI / 6;
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const m = new THREE.LineBasicMaterial({
        color: COL_A.getHex(),
        transparent: true,
        opacity: 0.55 - i * 0.045,
      });
      const ring = new THREE.LineLoop(g, m);
      ring.position.z = -i * 0.9;
      ring.rotation.z = i * 0.15;
      scene.add(ring);
      rings.push(ring);
      ringMats.push(m);
    }

    // Radial beams sweeping around the core
    const BEAM_COUNT = isMobile ? 5 : 8;
    const beams: THREE.Line[] = [];
    const beamMats: THREE.LineBasicMaterial[] = [];
    for (let i = 0; i < BEAM_COUNT; i++) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(2.4, 0, 0),
      ]);
      const m = new THREE.LineBasicMaterial({
        color: COL_A.getHex(),
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.Line(g, m);
      line.rotation.z = (i / BEAM_COUNT) * Math.PI * 2;
      scene.add(line);
      beams.push(line);
      beamMats.push(m);
    }

    // Orbital cube cluster (small cubes on angled orbit)
    const CUBE_COUNT = isMobile ? 6 : 10;
    const cubes: THREE.LineSegments[] = [];
    const cubeMats: THREE.LineBasicMaterial[] = [];
    const cubeOrbit = new THREE.Group();
    cubeOrbit.rotation.x = Math.PI / 3.2;
    scene.add(cubeOrbit);
    for (let i = 0; i < CUBE_COUNT; i++) {
      const bg = new THREE.BoxGeometry(0.16, 0.16, 0.16);
      const be = new THREE.EdgesGeometry(bg);
      const bm = new THREE.LineBasicMaterial({ color: COL_B.getHex(), transparent: true, opacity: 0.75 });
      const cube = new THREE.LineSegments(be, bm);
      const a = (i / CUBE_COUNT) * Math.PI * 2;
      const r = 2.15;
      cube.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      cube.userData.angle = a;
      cubeOrbit.add(cube);
      cubes.push(cube);
      cubeMats.push(bm);
    }

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

      // Warp-in scale (0-450ms)
      const inT = easeOutCubic(elapsed / 0.45);

      // Exit collapse (2600-3000ms during phase 4)
      let exit = 1;
      let fade = 1;
      if (ph === 4) {
        const t = Math.min(1, (now - (startRef.current + 2600)) / 400);
        exit = 1 - t * 0.97;
        fade = 1 - t;
      }

      // Color shift (1.8-2.6s)
      const shiftT = Math.min(1, Math.max(0, (elapsed - 1.8) / 0.8));
      tmp.copy(COL_A).lerp(COL_LIGHT_END, shiftT);
      const cHex = tmp.getHex();
      coreMat.color.setHex(cHex);
      ringMats.forEach((m) => m.color.setHex(cHex));
      beamMats.forEach((m) => m.color.setHex(cHex));
      tmp.copy(COL_B).lerp(COL_LIGHT_END, shiftT);
      innerMat.color.setHex(tmp.getHex());
      cubeMats.forEach((m) => m.color.setHex(tmp.getHex()));

      // Exit-driven opacity
      coreMat.opacity = 0.95 * fade;
      innerMat.opacity = (0.35 + Math.sin(elapsed * 6) * 0.08) * fade;
      ringMats.forEach((m, i) => (m.opacity = (0.55 - i * 0.045) * fade));
      cubeMats.forEach((m) => (m.opacity = 0.75 * fade));

      // Core rotation
      core.rotation.x += 0.012;
      core.rotation.y += 0.018;
      inner.rotation.x -= 0.02;
      inner.rotation.y -= 0.014;

      // Rings: pulse outward Z, subtle rotation
      rings.forEach((r, i) => {
        const baseZ = -i * 0.9;
        r.position.z = baseZ + Math.sin(elapsed * 1.8 + i * 0.5) * 0.12;
        r.rotation.z += 0.003 * (i % 2 === 0 ? 1 : -1);
        const s = inT * (1 + Math.sin(elapsed * 2 + i) * 0.03);
        r.scale.setScalar(s * exit);
      });

      // Beam sweep
      beams.forEach((b, i) => {
        b.rotation.z = (i / BEAM_COUNT) * Math.PI * 2 + elapsed * 0.9;
        const pulse = 0.18 + Math.abs(Math.sin(elapsed * 3 + i)) * 0.28;
        beamMats[i].opacity = pulse * fade;
      });

      // Cube orbit
      cubeOrbit.rotation.z += 0.006;
      cubes.forEach((c, i) => {
        const a = c.userData.angle + elapsed * 0.6;
        const r = 2.15 + Math.sin(elapsed * 2 + i) * 0.08;
        c.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
        c.rotation.x += 0.03;
        c.rotation.y += 0.04;
      });
      cubeOrbit.scale.setScalar(inT * exit);

      // Core scale (warp-in + exit)
      const coreScale = inT * exit;
      core.scale.setScalar(coreScale);
      inner.scale.setScalar(coreScale);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      coreGeo.dispose(); coreEdges.dispose(); coreMat.dispose();
      innerGeo.dispose(); innerMat.dispose();
      rings.forEach((r) => (r.geometry as THREE.BufferGeometry).dispose());
      ringMats.forEach((m) => m.dispose());
      beams.forEach((b) => (b.geometry as THREE.BufferGeometry).dispose());
      beamMats.forEach((m) => m.dispose());
      cubes.forEach((c) => (c.geometry as THREE.BufferGeometry).dispose());
      cubeMats.forEach((m) => m.dispose());
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
