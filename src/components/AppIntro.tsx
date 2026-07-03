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
 * AppIntro — 3s cinematic intro echoing HomeFX visual language
 * (wireframe icosahedron core, orbital torus rings, sparse particle
 * field with linking lines, cool #AADDFF blues) but trimmed and
 * mobile-friendly (low subdivision, ~60 particles).
 *
 * Background transitions dark → light over the run.
 *
 * Timeline (total 3000ms):
 *   0–500ms    scale in from center on dark bg
 *   500–1800   full motion: icosa rotates, rings orbit, particles link
 *   1800–2600  bg fades navy → light blue-white, colors invert
 *   2600–3000  collapse + fade out
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
    setTimeout(onComplete, 400);
  }, [onComplete]);

  useEffect(() => {
    startRef.current = performance.now();
    const t1 = setTimeout(() => setPhase(1), 20);      // scale-in
    const t2 = setTimeout(() => setPhase(2), 500);     // full motion
    const t3 = setTimeout(() => setPhase(3), 1800);    // bg dark→light
    const t4 = setTimeout(finish, 2600);               // collapse
    const failsafe = setTimeout(finish, 6000);
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

    const COL_PRIMARY = 0xaaddff;
    const COL_SECOND  = 0xc8eeff;

    const group = new THREE.Group();
    scene.add(group);

    // --- Wireframe icosahedron core (HomeFX signature) ---
    const icoGeo = new THREE.IcosahedronGeometry(1.1, 1);
    const icoEdges = new THREE.EdgesGeometry(icoGeo);
    const icoMat = new THREE.LineBasicMaterial({ color: COL_PRIMARY, transparent: true, opacity: 0.9 });
    const ico = new THREE.LineSegments(icoEdges, icoMat);
    group.add(ico);

    // Inner smaller icosa for depth
    const ico2Geo = new THREE.IcosahedronGeometry(0.55, 0);
    const ico2Edges = new THREE.EdgesGeometry(ico2Geo);
    const ico2Mat = new THREE.LineBasicMaterial({ color: COL_SECOND, transparent: true, opacity: 0.6 });
    const ico2 = new THREE.LineSegments(ico2Edges, ico2Mat);
    group.add(ico2);

    // --- Orbital torus rings ---
    const ringSegs = isMobile ? 48 : 80;
    const torusMats: THREE.LineBasicMaterial[] = [];
    const tori: THREE.LineSegments[] = [];
    const ringDefs: Array<[number, number, number, number, number]> = [
      // radius, opacity, rx, ry, rz
      [1.7, 0.35, 0, 0, 0],
      [1.95, 0.25, Math.PI / 2.2, 0, 0],
      [2.2, 0.18, Math.PI / 3, Math.PI / 3, 0],
    ];
    ringDefs.forEach(([r, op, rx, ry, rz]) => {
      const g = new THREE.TorusGeometry(r, 0.02, 6, ringSegs);
      const e = new THREE.EdgesGeometry(g);
      const m = new THREE.LineBasicMaterial({ color: COL_PRIMARY, transparent: true, opacity: op });
      const t = new THREE.LineSegments(e, m);
      t.rotation.set(rx, ry, rz);
      group.add(t);
      tori.push(t);
      torusMats.push(m);
    });

    // --- Particle field with linking lines (HomeFX motif, trimmed) ---
    const N = isMobile ? 40 : 70;
    const pPos = new Float32Array(N * 3);
    const pVel = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pPos[i * 3]     = (Math.random() - 0.5) * 5;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 3.5;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 2.5;
      pVel[i * 3]     = (Math.random() - 0.5) * 0.008;
      pVel[i * 3 + 1] = (Math.random() - 0.5) * 0.008;
      pVel[i * 3 + 2] = (Math.random() - 0.5) * 0.004;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: COL_SECOND,
      size: 0.04,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    const maxPairs = (N * (N - 1)) / 2;
    const lnBuf = new Float32Array(maxPairs * 6);
    const lnGeo = new THREE.BufferGeometry();
    const lnAttr = new THREE.BufferAttribute(lnBuf, 3);
    lnGeo.setAttribute("position", lnAttr);
    lnGeo.setDrawRange(0, 0);
    const lnMat = new THREE.LineBasicMaterial({
      color: COL_PRIMARY,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lnMesh = new THREE.LineSegments(lnGeo, lnMat);
    scene.add(lnMesh);
    const CONN_SQ = 0.75 * 0.75;

    // Color transition helpers
    const colorBlue = new THREE.Color(COL_PRIMARY);
    const colorDeep = new THREE.Color(0x1a3a6b); // darker for light-bg readability
    const tmp = new THREE.Color();

    let raf = 0;
    const onResize = () => {
      if (!el) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const easeOutBack = (t: number) => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const elapsed = (now - startRef.current) / 1000;
      const ph = phaseRef.current;

      // Entrance (0-500ms)
      const entranceT = Math.min(1, elapsed / 0.5);
      const entrance = easeOutBack(entranceT);

      // Exit collapse (phase 4, 2600-3000ms)
      let exit = 1;
      let fade = 1;
      if (ph === 4) {
        const t = Math.min(1, (now - (startRef.current + 2600)) / 400);
        exit = 1 - t * 0.98;
        fade = 1 - t;
      }

      // Color shift during phase 3 window (1.8-2.6s)
      const shiftT = Math.min(1, Math.max(0, (elapsed - 1.8) / 0.8));
      tmp.copy(colorBlue).lerp(colorDeep, shiftT);
      icoMat.color.copy(tmp);
      ico2Mat.color.copy(tmp);
      torusMats.forEach((m) => m.color.copy(tmp));
      lnMat.color.copy(tmp);
      pMat.color.copy(tmp);

      // Opacity fade for exit
      icoMat.opacity = 0.9 * fade;
      ico2Mat.opacity = 0.6 * fade;
      torusMats.forEach((m, i) => (m.opacity = ringDefs[i][1] * fade));
      lnMat.opacity = 0.18 * fade;
      pMat.opacity = 0.85 * fade;

      // Icosa rotation
      ico.rotation.x += 0.006;
      ico.rotation.y += 0.010;
      ico2.rotation.x -= 0.014;
      ico2.rotation.y -= 0.009;

      // Ring orbits
      tori.forEach((t, i) => {
        t.rotation.z += 0.004 * (i + 1);
        t.rotation.x += 0.002 * ((i % 2) ? -1 : 1);
      });

      // Update particles
      for (let i = 0; i < N; i++) {
        pPos[i * 3]     += pVel[i * 3];
        pPos[i * 3 + 1] += pVel[i * 3 + 1];
        pPos[i * 3 + 2] += pVel[i * 3 + 2];
        if (Math.abs(pPos[i * 3])     > 2.6) pVel[i * 3]     *= -1;
        if (Math.abs(pPos[i * 3 + 1]) > 1.8) pVel[i * 3 + 1] *= -1;
        if (Math.abs(pPos[i * 3 + 2]) > 1.3) pVel[i * 3 + 2] *= -1;
      }
      pGeo.attributes.position.needsUpdate = true;

      // Linking lines (skip most work on mobile — every 2nd frame)
      const doLinks = !isMobile || (Math.floor(elapsed * 30) % 2 === 0);
      if (doLinks) {
        let cnt = 0;
        for (let i = 0; i < N; i++) {
          for (let j = i + 1; j < N; j++) {
            const dx = pPos[i * 3]     - pPos[j * 3];
            const dy = pPos[i * 3 + 1] - pPos[j * 3 + 1];
            const dz = pPos[i * 3 + 2] - pPos[j * 3 + 2];
            if (dx * dx + dy * dy + dz * dz < CONN_SQ) {
              lnBuf[cnt * 6]     = pPos[i * 3];
              lnBuf[cnt * 6 + 1] = pPos[i * 3 + 1];
              lnBuf[cnt * 6 + 2] = pPos[i * 3 + 2];
              lnBuf[cnt * 6 + 3] = pPos[j * 3];
              lnBuf[cnt * 6 + 4] = pPos[j * 3 + 1];
              lnBuf[cnt * 6 + 5] = pPos[j * 3 + 2];
              cnt++;
            }
          }
        }
        lnGeo.setDrawRange(0, cnt * 2);
        lnAttr.needsUpdate = true;
      }

      // Global scale (entrance + exit)
      const s = entrance * exit;
      group.scale.setScalar(s);
      points.scale.setScalar(s);
      lnMesh.scale.setScalar(s);

      // Slow group drift
      group.rotation.y += 0.0015;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      icoGeo.dispose(); icoEdges.dispose(); icoMat.dispose();
      ico2Geo.dispose(); ico2Edges.dispose(); ico2Mat.dispose();
      tori.forEach((t) => (t.geometry as THREE.BufferGeometry).dispose());
      torusMats.forEach((m) => m.dispose());
      pGeo.dispose(); pMat.dispose();
      lnGeo.dispose(); lnMat.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // Dark → light background
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
