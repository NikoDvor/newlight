import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const LETTERS = ['N','E','W','L','I','G','H','T'];
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%';

interface Props { onComplete: () => void; }

function ThreeBackground({ outerRef, phase }: { outerRef: React.RefObject<HTMLDivElement>; phase: number }) {
  const mountRef = useRef(null);
  const phaseRef = useRef(phase);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    const el = mountRef.current, outer = outerRef.current;
    if (!el || !outer) return;
    const W = outer.clientWidth, H = outer.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030608, 0.006);
    scene.background = new THREE.Color(0x030608);
    const cam = new THREE.PerspectiveCamera(58, W / H, 0.1, 1000);
    cam.position.z = 145;
    const ren = new THREE.WebGLRenderer({ antialias: false });
    ren.setSize(W, H);
    ren.setPixelRatio(1);
    el.appendChild(ren.domElement);

    const grp = new THREE.Group();
    scene.add(grp);

    const N = 80;
    const startPos = new Float32Array(N * 3);
    const finalPos = new Float32Array(N * 3);
    const curPos   = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI, r = Math.random() * 4;
      startPos[i*3]   = Math.sin(b) * Math.cos(a) * r;
      startPos[i*3+1] = Math.cos(b) * r;
      startPos[i*3+2] = Math.sin(b) * Math.sin(a) * r;
      finalPos[i*3]   = (Math.random() - 0.5) * 200;
      finalPos[i*3+1] = (Math.random() - 0.5) * 130;
      finalPos[i*3+2] = (Math.random() - 0.5) * 100;
      curPos[i*3]   = startPos[i*3];
      curPos[i*3+1] = startPos[i*3+1];
      curPos[i*3+2] = startPos[i*3+2];
    }

    const mkPts = (size: number, color: number) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(curPos, 3));
      return new THREE.Points(g, new THREE.PointsMaterial({
        color, size, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
      }));
    };
    const glow = mkPts(8, 0x1a5fff);
    const mid  = mkPts(4, 0x4da6ff);
    const core = mkPts(1.8, 0xa8d8ff);
    grp.add(glow, mid, core);

    const maxPairs = (N * (N - 1)) / 2;
    const lnBuf  = new Float32Array(maxPairs * 6);
    const lnGeo  = new THREE.BufferGeometry();
    const lnAttr = new THREE.BufferAttribute(lnBuf, 3);
    lnGeo.setAttribute('position', lnAttr);
    lnGeo.setDrawRange(0, 0);
    const lnMat = new THREE.LineBasicMaterial({ color: 0x2a7fff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    grp.add(new THREE.LineSegments(lnGeo, lnMat));
    const CONN_SQ = 38 * 38;

    const rings: { hub: THREE.Mesh; ring: THREE.Mesh; delay: number }[] = [];
    ([
      [0,0,0],[40,20,-16],[-38,-20,14],[20,-28,22],[-24,24,-26]
    ] as [number,number,number][]).forEach(([x,y,z], qi) => {
      const hub = new THREE.Mesh(new THREE.SphereGeometry(2.5, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x70c8ff, transparent: true, opacity: 0 }));
      hub.position.set(x, y, z);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.8, 0.18, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0x70c8ff, transparent: true, opacity: 0, wireframe: true }));
      ring.position.set(x, y, z);
      grp.add(hub, ring);
      rings.push({ hub, ring, delay: qi * 0.22 });
    });

    const grid  = new THREE.GridHelper(320, 28, 0x1a5fff, 0x1a5fff);
    grid.position.y = -65;
    (Array.isArray(grid.material) ? grid.material : [grid.material]).forEach(m => { m.transparent = true; (m as THREE.Material & { opacity: number }).opacity = 0; });
    scene.add(grid);
    const grid2 = new THREE.GridHelper(300, 14, 0x0a2a6a, 0x0a2a6a);
    grid2.position.y = -120;
    (Array.isArray(grid2.material) ? grid2.material : [grid2.material]).forEach(m => { m.transparent = true; (m as THREE.Material & { opacity: number }).opacity = 0; });
    scene.add(grid2);

    const ease = (x: number) => { const r = 1 - x; return 1 - r * r * r; };

    const onResize = () => {
      const nW = outer.clientWidth, nH = outer.clientHeight;
      cam.aspect = nW / nH;
      cam.updateProjectionMatrix();
      ren.setSize(nW, nH);
    };
    window.addEventListener('resize', onResize);

    let t = 0, raf: number, burstStart: number | null = null, fadeStartT: number | null = null, frame = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      t += 0.016; frame++;
      const p = phaseRef.current;

      if (p >= 2) {
        if (!burstStart) burstStart = t;
        const bt = Math.min((t - burstStart) / 1.8, 1);
        const ep = ease(bt);
        const pf = Math.min(bt * 2.8, 1);
        (glow.material as THREE.PointsMaterial).opacity = 0.12 * pf;
        (mid.material as THREE.PointsMaterial).opacity  = 0.26 * pf;
        (core.material as THREE.PointsMaterial).opacity = 0.90 * pf;
        lnMat.opacity = 0.20 * pf;
        for (let i = 0; i < N; i++) {
          curPos[i*3]   = startPos[i*3]   + (finalPos[i*3]   - startPos[i*3])   * ep;
          curPos[i*3+1] = startPos[i*3+1] + (finalPos[i*3+1] - startPos[i*3+1]) * ep;
          curPos[i*3+2] = startPos[i*3+2] + (finalPos[i*3+2] - startPos[i*3+2]) * ep;
        }
        glow.geometry.attributes.position.needsUpdate = true;
        mid.geometry.attributes.position.needsUpdate  = true;
        core.geometry.attributes.position.needsUpdate = true;
        const gf = Math.min(Math.max(0, bt - 0.25) * 1.8, 1);
        (Array.isArray(grid.material)  ? grid.material  : [grid.material]).forEach( m => { (m as THREE.Material & { opacity: number }).opacity = 0.28 * gf; });
        (Array.isArray(grid2.material) ? grid2.material : [grid2.material]).forEach(m => { (m as THREE.Material & { opacity: number }).opacity = 0.12 * gf; });
        if (frame % 2 === 0) {
          let cnt = 0;
          for (let i = 0; i < N; i++) {
            for (let j = i + 1; j < N; j++) {
              const dx = curPos[i*3]-curPos[j*3], dy = curPos[i*3+1]-curPos[j*3+1], dz = curPos[i*3+2]-curPos[j*3+2];
              if (dx*dx + dy*dy + dz*dz < CONN_SQ) {
                lnBuf[cnt*6]=curPos[i*3]; lnBuf[cnt*6+1]=curPos[i*3+1]; lnBuf[cnt*6+2]=curPos[i*3+2];
                lnBuf[cnt*6+3]=curPos[j*3]; lnBuf[cnt*6+4]=curPos[j*3+1]; lnBuf[cnt*6+5]=curPos[j*3+2];
                cnt++;
              }
            }
          }
          lnGeo.setDrawRange(0, cnt * 2);
          lnAttr.needsUpdate = true;
        }
        rings.forEach(({ hub, ring, delay }) => {
          const hf = Math.max(0, Math.min((bt - delay - 0.3) / 0.4, 1));
          (hub.material as THREE.MeshBasicMaterial).opacity  = 0.9 * hf;
          (ring.material as THREE.MeshBasicMaterial).opacity = (0.3 + Math.sin(t * 1.8 + delay) * 0.12) * hf;
          const pulse = 1 + Math.sin(t * 2 + delay) * 0.22;
          hub.scale.setScalar(pulse); ring.scale.setScalar(pulse);
        });
      }

      grp.rotation.y += 0.0008;
      cam.position.z = 145 + Math.sin(t * 0.3) * 5;

      if (p >= 5) {
        if (!fadeStartT) fadeStartT = t;
        const fd = Math.min((t - fadeStartT) * 0.65, 1);
        const v  = (1 - fd) * 0.032;
        scene.background = new THREE.Color(v * 0.38, v * 0.75, v);
      }

      ren.render(scene, cam);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      ren.dispose();
      if (el.contains(ren.domElement)) el.removeChild(ren.domElement);
    };
  }, [outerRef]);

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />;
}

function IgnitionBurst({ phase }: { phase: number }) {
  const canRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = canRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    cv.width  = window.innerWidth;
    cv.height = window.innerHeight;
    const cx = cv.width / 2, cy = cv.height / 2;
    if (phase < 1) { ctx.clearRect(0, 0, cv.width, cv.height); return; }
    let raf: number, start: number | null = null;
    const draw = (ts: number) => {
      if (!start) start = ts;
      const t = (ts - start) / 1000;
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (t < 1.6) {
        const p = Math.min(t / 0.5, 1), r2 = 1 - p, ep = 1 - r2 * r2;
        const r = ep * 220, alpha = Math.max(0, 1 - t * 1.1) * 0.7;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(160,220,255,${alpha})`);
        g.addColorStop(0.2, `rgba(59,158,255,${alpha * 0.7})`);
        g.addColorStop(1, 'rgba(20,60,180,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2, len = r * 0.88, w = alpha * 0.55;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(a + t * 0.04);
          const rg = ctx.createLinearGradient(0, 0, len, 0);
          rg.addColorStop(0, `rgba(100,190,255,${w})`);
          rg.addColorStop(1, 'rgba(100,190,255,0)');
          ctx.strokeStyle = rg; ctx.lineWidth = 2 + ep * 3;
          ctx.beginPath(); ctx.moveTo(r * 0.06, 0); ctx.lineTo(len, 0); ctx.stroke();
          ctx.restore();
        }
        raf = requestAnimationFrame(draw);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [phase]);
  return <canvas ref={canRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
}

function TextReveal({ phase }: { phase: number }) {
  const [letterPhase, setLetterPhase] = useState(-1);
  const [scramble, setScramble]       = useState(LETTERS.map(() => '_'));
  const [subVisible, setSubVisible]   = useState(false);
  const [progress, setProgress]       = useState(0);
  const [fadeOut, setFadeOut]         = useState(false);
  const hasStarted  = useRef(false);
  const progressVal = useRef(0);
  const timerRefs   = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ivRefs      = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    if (phase < 3 || hasStarted.current) return;
    hasStarted.current = true;
    LETTERS.forEach((letter, i) => {
      const t = setTimeout(() => {
        let c = 0;
        const iv = setInterval(() => {
          c++;
          setScramble(prev => {
            const n = [...prev];
            n[i] = c < 6 ? CHARS[Math.floor(Math.random() * CHARS.length)] : letter;
            return n;
          });
          if (c >= 6) { clearInterval(iv); setLetterPhase(i); }
        }, 42);
        ivRefs.current.push(iv);
      }, i * 115);
      timerRefs.current.push(t);
    });
    timerRefs.current.push(setTimeout(() => setSubVisible(true), LETTERS.length * 115 + 200));
    const pi = setInterval(() => {
      progressVal.current = Math.min(progressVal.current + 1.6, 100);
      setProgress(Math.round(progressVal.current));
      if (progressVal.current >= 100) clearInterval(pi);
    }, 28);
    ivRefs.current.push(pi);
  }, [phase]);

  useEffect(() => { if (phase >= 5) setFadeOut(true); }, [phase]);
  useEffect(() => () => {
    timerRefs.current.forEach(clearTimeout);
    ivRefs.current.forEach(clearInterval);
  }, []);

  if (phase < 3) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      opacity: fadeOut ? 0 : 1, transition: 'opacity 0.8s ease',
    }}>
      <style>{`
        @keyframes nlFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:0.75;transform:none} }
        @keyframes nlFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
      `}</style>

      <div style={{
        fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase',
        color: 'rgba(120,180,255,0.55)', marginBottom: 24, fontWeight: 600,
      }}>
        System Initializing
      </div>

      <div style={{
        display: 'flex', gap: 'clamp(4px,1.2vw,12px)',
        fontSize: 'clamp(38px,9vw,96px)', fontWeight: 800,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        letterSpacing: '0.02em',
      }}>
        {LETTERS.map((letter, i) => (
          <span key={i} style={{
            color: letterPhase >= i ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.12)',
            textShadow: letterPhase >= i ? '0 0 28px rgba(59,158,255,0.85),0 0 56px rgba(59,158,255,0.4)' : 'none',
            transform: letterPhase === i ? 'scale(1.28)' : 'scale(1)',
            transition: 'color 0.15s ease,text-shadow 0.15s ease,transform 0.18s cubic-bezier(0.22,1,0.36,1)',
            display: 'inline-block', minWidth: '1ch', textAlign: 'center',
          }}>
            {scramble[i]}
          </span>
        ))}
      </div>

      <div style={{
        marginTop: 28, display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: subVisible ? 1 : 0, transition: 'opacity 0.6s ease',
      }}>
        <div style={{
          fontSize: 12, letterSpacing: '0.25em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 16,
        }}>
          Command Center
        </div>
        <div style={{
          width: 220, height: 2, background: 'rgba(255,255,255,0.08)',
          borderRadius: 2, overflow: 'hidden', marginBottom: 12,
        }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: 'linear-gradient(90deg,rgba(59,158,255,0.9),rgba(168,216,255,1))',
            boxShadow: '0 0 12px rgba(59,158,255,0.6)',
            transition: 'width 0.1s linear',
          }} />
        </div>
        <div style={{
          fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.4)', fontWeight: 500,
        }}>
          {progress < 100 ? `Loading ${progress}%` : 'System Ready'}
        </div>
      </div>
    </div>
  );
}

export default function SplashScreen({ onComplete }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 150),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 4000),
      setTimeout(() => setPhase(5), 4800),
      setTimeout(() => onComplete(), 5800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div ref={outerRef} style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: '#030608', overflow: 'hidden',
    }}>
      <ThreeBackground outerRef={outerRef} phase={phase} />
      <IgnitionBurst phase={phase} />
      <TextReveal phase={phase} />
    </div>
  );
}
