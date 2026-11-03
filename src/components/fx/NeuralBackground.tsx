import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * NeuralBackground — the newlightgen.com background, recolored to light glowing blue on the dark theme.
 * Breathing wireframe core (nested icospheres + rings + cube-in-cube), floating shards,
 * electric arcs, particle field with proximity lines, light-streak bursts, flowing current lines,
 * breathing glow and a cursor/touch glow. three.js is loaded on demand.
 *
 * Built-in (not user options): phones draw fewer objects at 1x resolution and 30fps; it pauses while the app
 * is hidden; it freezes on the Calculator's Calculations page so screen-sharing stays crisp.
 * Public pages (Pay & Sign, booking) pass force="calm": same lines and glow without the 3D scene.
 * Layouts render it as a direct child of .nl-dark-bg (see index.css: .nl-dark-bg > .nl-bg stays fixed).
 */
const BLUE = 0xb8ebff, ICE = 0xf2fbff, DEEP = 0x7fd0ff;

export default function NeuralBackground({ force }: { force?: "calm" }) {
  const loc = useLocation();
  const reduce = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const still = reduce || (/\/calculator\//.test(loc.pathname) && new URLSearchParams(loc.search).get("view") === "calc");
  const [webglFailed, setWebglFailed] = useState(false);
  const calm = force === "calm" || webglFailed;

  return (
    <div className="nl-bg pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden data-still={still ? "1" : "0"}>
      <BgStyles />
      <Glow still={still} />
      <CurrentLines still={still} />
      {!calm && <div className={`nl-bg-core absolute left-1/2 top-[42%] h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full ${still ? "nl-bg-paused" : ""}`}
        style={{ background: "radial-gradient(circle, hsla(198,100%,62%,.28) 0%, hsla(205,100%,60%,.10) 40%, transparent 70%)" }} />}
      {!calm && <Scene still={still} onFail={() => setWebglFailed(true)} />}
      {!still && <CursorGlow />}
    </div>
  );
}

/* ---------------- breathing glow (CSS) ---------------- */
function Glow({ still }: { still: boolean }) {
  return (
    <>
      <div className={`nl-bg-glow absolute inset-x-0 top-0 h-[70vh] ${still ? "nl-bg-paused" : ""}`}
        style={{ background: "radial-gradient(ellipse 55% 100% at 50% 0%, hsla(200,100%,62%,.22) 0%, transparent 70%)" }} />
      <div className={`nl-bg-glow2 absolute inset-x-0 bottom-0 h-[55vh] ${still ? "nl-bg-paused" : ""}`}
        style={{ background: "radial-gradient(ellipse 60% 90% at 50% 100%, hsla(212,100%,60%,.15) 0%, transparent 70%)" }} />
    </>
  );
}

/* ---------------- flowing current lines (SVG, like the website) ---------------- */
function organicPath() {
  const horizontal = Math.random() > 0.5;
  const pts: { x: number; y: number }[] = [];
  const segs = 4;
  if (horizontal) { const y = 5 + Math.random() * 90; for (let i = 0; i <= segs; i++) pts.push({ x: -8 + (116 / segs) * i, y: y + (Math.random() - 0.5) * 30 }); }
  else { const x = 5 + Math.random() * 90; for (let i = 0; i <= segs; i++) pts.push({ x: x + (Math.random() - 0.5) * 30, y: -8 + (116 / segs) * i }); }
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const c1x = p0.x + (p1.x - p0.x) * 0.35 + (Math.random() - 0.5) * 12, c1y = p0.y + (p1.y - p0.y) * 0.35 + (Math.random() - 0.5) * 12;
    const c2x = p0.x + (p1.x - p0.x) * 0.65 + (Math.random() - 0.5) * 12, c2y = p0.y + (p1.y - p0.y) * 0.65 + (Math.random() - 0.5) * 12;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}
function CurrentLines({ still }: { still: boolean }) {
  const [streaks] = useState(() => {
    const n = typeof window !== "undefined" && window.innerWidth < 768 ? 5 : 10;
    return Array.from({ length: n }, (_, i) => ({
      id: i, d: organicPath(), dur: 5 + Math.random() * 5, delay: -((i / n) * 8 + Math.random()),
      op: 0.55 + Math.random() * 0.35, w: 1.2 + Math.random() * 0.9,
    }));
  });
  return (
    <svg className={`absolute inset-0 h-full w-full ${still ? "nl-bg-paused" : ""}`} preserveAspectRatio="none" viewBox="0 0 100 100">
      {streaks.map((s) => (
        <g key={s.id}>
          <path d={s.d} stroke="#7fd3ff" strokeOpacity={0.05} strokeWidth={s.w} fill="none" vectorEffect="non-scaling-stroke" />
          <path d={s.d} stroke="#bfe9ff" strokeWidth={s.w * 1.4} strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke"
            className="nl-bg-streak" style={{ opacity: s.op, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }} />
        </g>
      ))}
    </svg>
  );
}

/* ---------------- cursor / touch glow ---------------- */
function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current!;
    let timer = 0;
    const move = (x: number, y: number) => { el.style.transform = `translate3d(${x - 90}px, ${y - 90}px, 0)`; el.style.opacity = "1"; };
    const mm = (e: PointerEvent) => { window.clearTimeout(timer); move(e.clientX, e.clientY); timer = window.setTimeout(() => { el.style.opacity = "0"; }, 1600); };
    window.addEventListener("pointermove", mm, { passive: true });
    window.addEventListener("pointerdown", mm, { passive: true });
    return () => { window.removeEventListener("pointermove", mm); window.removeEventListener("pointerdown", mm); window.clearTimeout(timer); };
  }, []);
  return <div ref={ref} className="absolute left-0 top-0 h-[180px] w-[180px] opacity-0 transition-opacity duration-700"
    style={{ background: "radial-gradient(circle, hsla(200,100%,70%,.16) 0%, hsla(200,100%,65%,.05) 45%, transparent 70%)", willChange: "transform, opacity" }} />;
}

/* ---------------- full WebGL scene ---------------- */
function Scene({ still, onFail }: { still: boolean; onFail: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stillRef = useRef(still);
  stillRef.current = still;

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      let THREE: typeof import("three");
      try { THREE = await import("three"); } catch { onFail(); return; }
      if (disposed || !mountRef.current) return;
      const mount = mountRef.current;
      const phone = window.innerWidth < 768;
      const mul = phone ? 0.45 : 1;
      const fpsCap = phone ? 30 : 50;
      const vis = phone ? 1.45 : 1; // phones skip the CSS glow filter, so lines draw brighter instead

      let renderer: import("three").WebGLRenderer;
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !phone, powerPreference: "low-power" }); }
      catch { onFail(); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1 : 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
      camera.position.set(0, 1.2, 8);
      const add = THREE.AdditiveBlending;
      const lineMat = (color: number, opacity: number) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: add, depthWrite: false });
      const disposables: { dispose: () => void }[] = [];
      const track = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

      // 2. breathing core: nested icospheres + rings + cube-in-cube
      const core = new THREE.Group();
      core.position.set(0, 0.7, -7);
      scene.add(core);
      const spheres = [3.4, 2.6, 1.8].map((r, i) => {
        const geo = track(new THREE.EdgesGeometry(track(new THREE.IcosahedronGeometry(r, 1))));
        const mat = track(lineMat(i === 2 ? ICE : BLUE, Math.min(1, (0.42 + i * 0.16) * vis)));
        const mesh = new THREE.LineSegments(geo, mat);
        core.add(mesh);
        return { mesh, mat, base: Math.min(0.85, (0.42 + i * 0.16) * vis), off: i * 2000, rx: (i % 2 ? -1 : 1) * 0.0018 * (1 + i * 0.4), ry: 0.0013 * (1 + i * 0.5) };
      });
      const rings = [4.4, 5.2].map((r, i) => {
        const pts: import("three").Vector3[] = [];
        for (let k = 0; k <= 128; k++) { const a = (k / 128) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
        const geo = track(new THREE.BufferGeometry().setFromPoints(pts));
        const mat = track(lineMat(i ? DEEP : BLUE, 0.12));
        const line = new THREE.Line(geo, mat);
        line.rotation.x = 1.1 + i * 0.35; line.rotation.y = i * 0.6;
        core.add(line);
        return { line, mat, off: 600 + i * 900 };
      });
      const cubes = [1.0, 0.55].map((s, i) => {
        const geo = track(new THREE.EdgesGeometry(track(new THREE.BoxGeometry(s, s, s))));
        const mat = track(lineMat(ICE, 0.7 - i * 0.1));
        const m = new THREE.LineSegments(geo, mat);
        core.add(m);
        return m;
      });

      // 3. floating shards
      const shards = Array.from({ length: Math.round(16 * mul) }, () => {
        const r = 0.15 + Math.random() * 0.5;
        const geo = track(new THREE.EdgesGeometry(track(Math.random() > 0.5 ? new THREE.TetrahedronGeometry(r, 0) : new THREE.OctahedronGeometry(r, 0))));
        const m = new THREE.LineSegments(geo, track(lineMat(BLUE, Math.min(1, (0.45 + Math.random() * 0.25) * vis))));
        m.position.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 10, -Math.random() * 22 - 2);
        m.userData = { rx: (Math.random() - 0.5) * 0.008, ry: (Math.random() - 0.5) * 0.008, vx: (Math.random() - 0.5) * 0.004, vy: (Math.random() - 0.5) * 0.004 };
        scene.add(m);
        return m;
      });

      // 4. particle field with proximity lines
      const pCount = Math.round(90 * mul);
      const pGeo = track(new THREE.BufferGeometry());
      const pos = new Float32Array(pCount * 3);
      const L = Array.from({ length: pCount }, () => ({
        cx: (Math.random() - 0.5) * 16, cy: (Math.random() - 0.5) * 9, cz: -4 - Math.random() * 10,
        ax: 0.5 + Math.random() * 1.2, ay: 0.4 + Math.random() * 1, az: 0.3 + Math.random() * 0.6,
        fx: 0.00012 + Math.random() * 0.0002, fy: 0.0001 + Math.random() * 0.0002, fz: 0.0001 + Math.random() * 0.00015,
        px: Math.random() * 6.28, py: Math.random() * 6.28, pz: Math.random() * 6.28,
      }));
      pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const points = new THREE.Points(pGeo, track(new THREE.PointsMaterial({ color: ICE, size: phone ? 0.07 : 0.05, transparent: true, opacity: 0.9, blending: add, depthWrite: false })));
      scene.add(points);
      const maxLinks = phone ? 40 : 120;
      const linkPos = new Float32Array(maxLinks * 6);
      const linkGeo = track(new THREE.BufferGeometry());
      linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
      const links = new THREE.LineSegments(linkGeo, track(lineMat(BLUE, Math.min(1, 0.45 * vis))));
      scene.add(links);

      // 5. electric arcs between drifting anchors
      const anchors = Array.from({ length: 3 }, () => ({ phase: Math.random() * 6.28, speed: 0.0006 + Math.random() * 0.0008, rx: 4 + Math.random() * 2, ry: 2 + Math.random() * 1.5, z: -3 - Math.random() * 3, p: new THREE.Vector3() }));
      // 3 pairs × 10 segments, preallocated and updated in place (no per-frame allocation → no GC hitches)
      const ARC_SEGS = 10, ARC_PAIRS = 3;
      const arcPos = new Float32Array(ARC_PAIRS * ARC_SEGS * 6);
      const arcGeo = track(new THREE.BufferGeometry());
      arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPos, 3));
      const arcMat = track(lineMat(ICE, 0.38));
      scene.add(new THREE.LineSegments(arcGeo, arcMat));
      let arcAt = 0;
      const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();

      // 6. light-streak bursts from the core — a fixed pool of 4 lines, reused
      const streaks = Array.from({ length: 4 }, () => {
        const pos = new Float32Array(6);
        const geo = track(new THREE.BufferGeometry());
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        const mat = track(lineMat(0xffffff, 0));
        const line = new THREE.Line(geo, mat);
        line.position.copy(core.position);
        line.frustumCulled = false;
        scene.add(line);
        return { line, pos, geo, mat, born: -1, dx: 0, dy: 0, dz: 0 };
      });
      let nextBurst = performance.now() + 2500;

      // input + lifecycle
      let mx = 0, my = 0;
      const onPointer = (e: PointerEvent) => { mx = (e.clientX / window.innerWidth - 0.5) * 2; my = (e.clientY / window.innerHeight - 0.5) * 2; };
      const onResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("resize", onResize);

      let raf = 0, last = 0, hidden = document.hidden;
      const onVis = () => { hidden = document.hidden; if (!hidden) { last = 0; raf = requestAnimationFrame(loop); } };
      document.addEventListener("visibilitychange", onVis);


      const step = (now: number) => {
        // breathing core
        spheres.forEach((s) => {
          const ph = ((now + s.off) * Math.PI * 2) / 6000;
          s.mesh.scale.setScalar(1 + Math.sin(ph) * 0.12);
          s.mat.opacity = s.base * (1 + Math.sin(ph) * 0.6);
          s.mesh.rotation.x += s.rx; s.mesh.rotation.y += s.ry;
        });
        rings.forEach((r, i) => {
          const ph = ((now + r.off) * Math.PI * 2) / 6000;
          r.line.scale.setScalar(1 + Math.sin(ph) * 0.08);
          r.mat.opacity = Math.min(1, 0.5 * vis * (1 + Math.sin(ph) * 0.5));
          r.line.rotation.z += i ? -0.0016 : 0.0012;
        });
        cubes[0].rotation.x += 0.004; cubes[0].rotation.y += 0.003;
        cubes[1].rotation.x -= 0.006; cubes[1].rotation.z += 0.005;
        core.rotation.y += 0.0008;
        // shards
        shards.forEach((s) => {
          s.rotation.x += s.userData.rx; s.rotation.y += s.userData.ry;
          s.position.x += s.userData.vx; s.position.y += s.userData.vy;
          if (s.position.x > 10) s.position.x = -10; if (s.position.x < -10) s.position.x = 10;
          if (s.position.y > 6) s.position.y = -6; if (s.position.y < -6) s.position.y = 6;
        });
        // particles + links
        for (let i = 0; i < pCount; i++) {
          const p = L[i];
          pos[i * 3] = p.cx + Math.sin(now * p.fx + p.px) * p.ax;
          pos[i * 3 + 1] = p.cy + Math.sin(now * p.fy + p.py) * p.ay;
          pos[i * 3 + 2] = p.cz + Math.sin(now * p.fz + p.pz) * p.az;
        }
        pGeo.attributes.position.needsUpdate = true;
        let n = 0;
        for (let i = 0; i < pCount && n < maxLinks; i++) {
          for (let j = i + 1; j < pCount && n < maxLinks; j++) {
            const dx = pos[i * 3] - pos[j * 3], dy = pos[i * 3 + 1] - pos[j * 3 + 1], dz = pos[i * 3 + 2] - pos[j * 3 + 2];
            if (dx * dx + dy * dy + dz * dz < 2.2) {
              linkPos.set([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]], n * 6);
              n++;
            }
          }
        }
        linkGeo.setDrawRange(0, n * 2);
        linkGeo.attributes.position.needsUpdate = true;
        // arcs
        anchors.forEach((a) => { a.phase += a.speed * 16; a.p.set(Math.cos(a.phase) * a.rx, Math.sin(a.phase * 1.3) * a.ry, a.z); });
        if (now - arcAt > 110) {
          arcAt = now;
          let seg = 0;
          for (let i = 0; i < anchors.length; i++) for (let j = i + 1; j < anchors.length; j++) {
            const a = anchors[i].p, b = anchors[j].p;
            if (a.distanceTo(b) >= 6) continue;
            let px = a.x, py = a.y, pz = a.z;
            for (let k = 1; k <= ARC_SEGS; k++) {
              tmpA.lerpVectors(a, b, k / ARC_SEGS);
              if (k < ARC_SEGS) { tmpA.x += (Math.random() - 0.5) * 0.3; tmpA.y += (Math.random() - 0.5) * 0.3; }
              arcPos.set([px, py, pz, tmpA.x, tmpA.y, tmpA.z], seg * 6);
              px = tmpA.x; py = tmpA.y; pz = tmpA.z; seg++;
            }
          }
          arcGeo.setDrawRange(0, seg * 2);
          arcGeo.attributes.position.needsUpdate = true;
          arcMat.opacity = Math.min(1, (0.5 + Math.random() * 0.25) * vis);
        }
        // bursts
        if (now > nextBurst) {
          const count = 3 + Math.floor(Math.random() * 2);
          for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2, st = streaks[i];
            st.born = now; st.dx = Math.cos(ang) * 8; st.dy = Math.sin(ang) * 5; st.dz = Math.random() * 2;
          }
          nextBurst = now + 3800 + Math.random() * 1500;
        }
        for (const st of streaks) {
          if (st.born < 0) continue;
          const age = (now - st.born) / 900;
          if (age >= 1) { st.born = -1; st.mat.opacity = 0; continue; }
          const a0 = Math.max(0, age - 0.15);
          st.pos[0] = st.dx * a0; st.pos[1] = st.dy * a0; st.pos[2] = st.dz * a0;
          st.pos[3] = st.dx * age; st.pos[4] = st.dy * age; st.pos[5] = st.dz * age;
          st.geo.attributes.position.needsUpdate = true;
          st.mat.opacity = (age < 0.2 ? age * 5 : Math.max(0, 1 - (age - 0.2) / 0.8)) * 0.7;
        }
        // parallax
        scene.rotation.y += (mx * 0.05 - scene.rotation.y) * 0.05;
        scene.rotation.x += (my * 0.03 - scene.rotation.x) * 0.05;
      };

      const loop = (t: number) => {
        if (hidden || disposed) return;
        raf = requestAnimationFrame(loop);
        if (stillRef.current) { if (last !== -1) { renderer.render(scene, camera); last = -1; } return; }
        if (last > 0 && t - last < 1000 / fpsCap - 2) return;
        last = t;
        step(t);
        renderer.render(scene, camera);
      };
      const begin = () => { if (!disposed) raf = requestAnimationFrame(loop); };
      const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: { timeout: number }) => number);
      if (ric) ric(begin, { timeout: 1200 }); else setTimeout(begin, 300);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVis);
        disposables.forEach((d) => d.dispose());
        renderer.dispose();
        try { mount.removeChild(renderer.domElement); } catch { /* */ }
      };
    })();
    return () => { disposed = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="nl-bg-scene absolute inset-0" />;
}

function BgStyles() {
  return (
    <style>{`
.nl-bg-streak{stroke-dasharray:8 400;animation-name:nl-bg-flow;animation-timing-function:linear;animation-iteration-count:infinite;filter:drop-shadow(0 0 2px rgba(127,211,255,.9))}
@keyframes nl-bg-flow{0%{stroke-dashoffset:410}100%{stroke-dashoffset:0}}
.nl-bg-glow{animation:nl-bg-breathe 8s ease-in-out infinite}
.nl-bg-glow2{animation:nl-bg-breathe 8s ease-in-out -4s infinite}
@keyframes nl-bg-breathe{0%,100%{opacity:.55}50%{opacity:1}}
.nl-bg-paused,.nl-bg-paused *{animation-play-state:paused!important}
.nl-bg-core{animation:nl-bg-core 6s ease-in-out infinite}
@keyframes nl-bg-core{0%,100%{opacity:.6;transform:translate(-50%,-50%) scale(.92)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.06)}}
@media (min-width:768px){.nl-bg-scene canvas{filter:drop-shadow(0 0 3px rgba(150,220,255,.55))}}
.nl-bg[data-still="1"] .nl-bg-streak{animation-play-state:paused}
@media (prefers-reduced-motion:reduce){.nl-bg-streak,.nl-bg-glow,.nl-bg-glow2,.nl-bg-core{animation:none}}
`}</style>
  );
}
