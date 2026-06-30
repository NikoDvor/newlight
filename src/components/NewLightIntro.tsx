import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import newlightLogo from "@/assets/newlight-logo.jpg";

const SESSION_KEY = "nl_intro_played";

interface NewLightIntroProps {
  onComplete: () => void;
  launchLabel?: string;
}

/**
 * "Awakening Neural Core" — Three.js intro (~2.7s)
 *   phase 0: pre-mount
 *   phase 1: white flash → dark fade, core fades in
 *   phase 2: breathing + synapse firing
 *   phase 3: final bright pulse (core-only flash)
 *   phase 4: zoom-out + fade exit
 */
export function NewLightIntro({ onComplete, launchLabel }: NewLightIntroProps) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const startRef = useRef<number>(0);

  const finish = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, "1");
    window.dispatchEvent(new Event("nl-intro-complete"));
    setPhase(4);
    setTimeout(onComplete, 450);
  }, [onComplete]);

  // Phase timeline
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 60);     // ~ 0-400 white flash; dark begins
    const t2 = setTimeout(() => setPhase(2), 1200);   // breathing
    const t3 = setTimeout(() => setPhase(3), 2200);   // online flash
    const t4 = setTimeout(finish, 2600);              // exit
    const failsafe = setTimeout(finish, 5000);
    return () => [t1, t2, t3, t4, failsafe].forEach(clearTimeout);
  }, [finish]);

  // Three.js scene
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const isMobile = window.innerWidth < 768;
    const PARTICLE_COUNT = isMobile ? 45 : 110;
    const SYNAPSE_COUNT = isMobile ? 6 : 10;
    const CORE_DETAIL = isMobile ? 2 : 3;

    const w = window.innerWidth;
    const h = window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // --- Core (wireframe icosphere, perturbed) ---
    const coreGeo = new THREE.IcosahedronGeometry(2, CORE_DETAIL);
    const basePositions = new Float32Array(coreGeo.attributes.position.array);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // Halo (additive glow)
    const haloGeo = new THREE.IcosahedronGeometry(2.35, CORE_DETAIL);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    scene.add(halo);

    // Point light
    const pLight = new THREE.PointLight(0xffffff, 0, 50);
    pLight.position.set(0, 0, 0);
    scene.add(pLight);

    // --- Orbiting particles (Lissajous) ---
    const pPositions = new Float32Array(PARTICLE_COUNT * 3);
    const pParams: { rx: number; ry: number; rz: number; fx: number; fy: number; fz: number; phase: number }[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pParams.push({
        rx: 2.8 + Math.random() * 2.2,
        ry: 2.8 + Math.random() * 2.2,
        rz: 1.5 + Math.random() * 2,
        fx: 0.4 + Math.random() * 0.9,
        fy: 0.4 + Math.random() * 0.9,
        fz: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
      });
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: isMobile ? 0.06 : 0.05,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // --- Synapse pulses (bright trails moving toward core) ---
    const sPositions = new Float32Array(SYNAPSE_COUNT * 3);
    const sParams: { start: THREE.Vector3; t0: number; duration: number }[] = [];
    const spawnSynapse = (i: number, time: number) => {
      const a = Math.random() * Math.PI * 2;
      const b = (Math.random() - 0.5) * Math.PI;
      const r = 4.5 + Math.random() * 1.5;
      sParams[i] = {
        start: new THREE.Vector3(
          r * Math.cos(a) * Math.cos(b),
          r * Math.sin(b),
          r * Math.sin(a) * Math.cos(b)
        ),
        t0: time + Math.random() * 0.8,
        duration: 0.6 + Math.random() * 0.5,
      };
    };
    for (let i = 0; i < SYNAPSE_COUNT; i++) spawnSynapse(i, 0);
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(sPositions, 3));
    const sMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: isMobile ? 0.14 : 0.12,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const synapses = new THREE.Points(sGeo, sMat);
    scene.add(synapses);

    // --- Animate ---
    startRef.current = performance.now();
    const whiteCol = new THREE.Color(0xffffff);
    const blueCol = new THREE.Color(0x3b9eff);
    const tmpCol = new THREE.Color();

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const elapsed = (now - startRef.current) / 1000; // seconds
      const ph = phaseRef.current;

      // Color shift white -> blue over first ~1.6s
      const colorT = Math.min(1, Math.max(0, (elapsed - 0.3) / 1.3));
      tmpCol.copy(whiteCol).lerp(blueCol, colorT);
      coreMat.color.copy(tmpCol);
      haloMat.color.copy(tmpCol);
      pMat.color.copy(tmpCol);
      sMat.color.copy(tmpCol).lerp(whiteCol, 0.4); // synapses stay brighter
      pLight.color.copy(tmpCol);

      // Visibility / scale by phase
      let targetCoreOpacity = 0;
      let targetHaloOpacity = 0;
      let targetParticleOpacity = 0;
      let targetSynapseOpacity = 0;
      let targetScale = 0.001;
      let lightBase = 0;

      if (ph >= 1) {
        const t = Math.min(1, (elapsed - 0.1) / 0.9);
        // spring-ish ease-out
        const e = 1 - Math.pow(1 - t, 3);
        targetScale = 0.2 + e * 0.8;
        targetCoreOpacity = 0.95 * e;
        targetHaloOpacity = 0.35 * e;
        targetParticleOpacity = 0.9 * e;
        targetSynapseOpacity = 0.9 * e;
        lightBase = 1.2 * e;
      }
      if (ph >= 3) {
        // online flash
        targetCoreOpacity = 1;
        targetHaloOpacity = 0.85;
        lightBase = 3.5;
      }
      if (ph >= 4) {
        // exit: scale up & fade out
        targetScale = targetScale * 1.25;
        targetCoreOpacity *= 0.0;
        targetHaloOpacity *= 0.0;
        targetParticleOpacity *= 0.0;
        targetSynapseOpacity *= 0.0;
      }

      // Breathing
      const breath = Math.sin(elapsed * 2.2) * 0.5 + 0.5; // 0..1
      const breathScale = 1 + breath * 0.08;
      core.scale.setScalar(targetScale * breathScale);
      halo.scale.setScalar(targetScale * (1 + breath * 0.18));
      coreMat.opacity = targetCoreOpacity;
      haloMat.opacity = targetHaloOpacity * (0.6 + breath * 0.4);
      pMat.opacity = targetParticleOpacity;
      sMat.opacity = targetSynapseOpacity;
      pLight.intensity = lightBase * (0.7 + breath * 0.6);

      // Perturb core vertices (organic ripple)
      const posAttr = coreGeo.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        const bx = basePositions[i];
        const by = basePositions[i + 1];
        const bz = basePositions[i + 2];
        const n =
          Math.sin(bx * 1.6 + elapsed * 1.8) *
          Math.cos(by * 1.4 + elapsed * 1.3) *
          Math.sin(bz * 1.2 + elapsed * 1.6);
        const d = 1 + n * 0.08;
        arr[i] = bx * d;
        arr[i + 1] = by * d;
        arr[i + 2] = bz * d;
      }
      posAttr.needsUpdate = true;

      // Particles (Lissajous orbits)
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = pParams[i];
        const t = elapsed + p.phase;
        pPositions[i * 3] = Math.sin(t * p.fx) * p.rx;
        pPositions[i * 3 + 1] = Math.sin(t * p.fy + 1.2) * p.ry;
        pPositions[i * 3 + 2] = Math.cos(t * p.fz) * p.rz;
      }
      (pGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      // Synapses (curve toward core, respawn)
      for (let i = 0; i < SYNAPSE_COUNT; i++) {
        const s = sParams[i];
        const dt = elapsed - s.t0;
        if (dt < 0) {
          // hide off-screen
          sPositions[i * 3] = 0;
          sPositions[i * 3 + 1] = 0;
          sPositions[i * 3 + 2] = -100;
          continue;
        }
        const k = dt / s.duration;
        if (k >= 1) {
          spawnSynapse(i, elapsed);
          continue;
        }
        // ease-in curve toward origin, with slight tangential swirl
        const ease = k * k;
        const swirl = Math.sin(k * Math.PI) * 0.6;
        sPositions[i * 3] = s.start.x * (1 - ease) + Math.cos(elapsed * 2 + i) * swirl;
        sPositions[i * 3 + 1] = s.start.y * (1 - ease) + Math.sin(elapsed * 2 + i) * swirl;
        sPositions[i * 3 + 2] = s.start.z * (1 - ease);
      }
      (sGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      // Camera drift + push-in
      const camT = Math.min(elapsed, 3);
      camera.position.x = Math.sin(camT * 0.6) * 1.2;
      camera.position.y = Math.cos(camT * 0.5) * 0.7;
      camera.position.z = 8 - camT * 0.6 - (ph >= 4 ? 1.2 : 0);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const W = window.innerWidth, H = window.innerHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      coreGeo.dispose();
      coreMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      pGeo.dispose();
      pMat.dispose();
      sGeo.dispose();
      sMat.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // Background color shifts white -> dark over phases
  const bg =
    phase >= 2 ? "#020814"
    : phase >= 1 ? "#0a1830"
    : "#FFFFFF";

  const lightening = phase === 0 || phase === 1 && false; // logo glow uses dark styling once phase>=1
  const onDark = phase >= 1;

  return (
    <AnimatePresence>
      <motion.div
        key="nl-intro"
        className="fixed inset-0 z-[99999] overflow-hidden flex flex-col items-center justify-center"
        initial={{ opacity: 1, scale: 1 }}
        animate={{
          opacity: phase >= 4 ? 0 : 1,
          scale: phase >= 4 ? 1.08 : 1,
        }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        style={{
          background: bg,
          transition: "background 600ms cubic-bezier(.4,0,.2,1)",
        }}
      >
        {/* Three.js canvas */}
        <div ref={canvasMountRef} className="absolute inset-0 pointer-events-none" />

        {/* Initial white flash overlay */}
        {phase < 1 && (
          <div className="absolute inset-0 pointer-events-none" style={{ background: "#FFFFFF" }} />
        )}

        {/* Core-only bright flash at phase 3 */}
        {phase === 3 && (
          <div
            className="absolute left-1/2 top-1/2 pointer-events-none rounded-full"
            style={{
              width: 220,
              height: 220,
              transform: "translate(-50%,-50%)",
              background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(120,200,255,0.5) 40%, transparent 70%)",
              animation: "nl-core-flash 0.4s ease-out forwards",
            }}
          />
        )}

        <style>{`
          @keyframes nl-core-flash {
            0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.4); }
            40%  { opacity: 1; transform: translate(-50%,-50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%,-50%) scale(1.6); }
          }
          @keyframes nl-scan-down {
            0%   { top: -10%; opacity: 0; }
            20%  { opacity: 1; }
            100% { top: 110%; opacity: 0; }
          }
        `}</style>

        {/* Scan line near the end */}
        {phase >= 2 && phase < 4 && (
          <div
            className="absolute left-0 right-0 pointer-events-none z-20"
            style={{
              height: 2,
              background: "rgba(120,200,255,0.9)",
              boxShadow: "0 0 16px 4px rgba(0,180,255,0.55)",
              animation: "nl-scan-down 0.9s ease-out forwards",
            }}
          />
        )}

        {/* Logo + tagline overlay */}
        <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center pointer-events-none">
          <motion.img
            src={newlightLogo}
            alt="NewLight"
            className="h-16 w-auto object-contain"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: phase >= 1 ? 1 : 0,
              scale: 1,
            }}
            transition={{ duration: 0.7, delay: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
            style={{
              filter: onDark
                ? "drop-shadow(0 0 24px rgba(59,158,255,0.85)) drop-shadow(0 0 60px rgba(59,158,255,0.4))"
                : "drop-shadow(0 0 10px rgba(0,180,255,0.35))",
            }}
          />

          <motion.p
            className="text-[11px] font-bold tracking-[0.32em] uppercase"
            style={{
              color: "#3B9EFF",
              fontFamily: "'Rajdhani','Inter',system-ui,sans-serif",
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 6 }}
            transition={{ duration: 0.5 }}
          >
            // NEW EYES TO ROI
          </motion.p>

          {launchLabel && phase >= 2 && (
            <motion.p
              className="text-[10px] tracking-wider uppercase"
              style={{ color: "rgba(255,255,255,0.45)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {launchLabel}
            </motion.p>
          )}
        </div>

        {/* Skip */}
        <motion.button
          onClick={finish}
          className="absolute bottom-5 right-5 z-30 text-[10px] font-medium tracking-wider uppercase px-3 py-1.5 rounded-lg"
          style={{
            color: onDark ? "rgba(255,255,255,0.5)" : "rgba(0,26,61,0.55)",
            border: `1px solid ${onDark ? "rgba(255,255,255,0.15)" : "rgba(0,26,61,0.18)"}`,
            background: onDark ? "rgba(255,255,255,0.04)" : "rgba(0,26,61,0.04)",
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
