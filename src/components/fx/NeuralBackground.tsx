import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * NeuralBackground — the newlightgen.com background, recolored to light glowing blue on the dark theme.
 *
 *  Full  (WebGL, three.js loaded on demand): receding grid floor, breathing wireframe core
 *        (nested icospheres + rings + cube-in-cube), floating shards, electric arcs, particle field
 *        with proximity lines, light-streak bursts — plus flowing current lines, breathing glow, cursor glow.
 *  Calm  (no WebGL): CSS perspective grid, flowing current lines, breathing glow. Used on phones that can't keep up,
 *        on public pages (Pay & Sign, booking) and when someone picks "Calm".
 *  Off   : soft static glow only.
 *
 * Safeguards: phones get fewer objects, lower resolution and 30fps; auto-downgrades to Calm when frames drop;
 * pauses when the app is hidden; freezes (still frame) on the Calculator's Calculations page so screen-sharing
 * stays crisp; respects reduced-motion. Per-device choice in localStorage ("nl-bg-mode").
 */
export type BgMode = "full" | "calm" | "off";
const KEY = "nl-bg-mode";
const DOWNGRADED = "nl-bg-downgraded";

export function getBgMode(): BgMode {
  try { const v = localStorage.getItem(KEY); return v === "calm" || v === "off" ? v : "full"; } catch { return "full"; }
}
export function setBgMode(m: BgMode) {
  try { localStorage.setItem(KEY, m); sessionStorage.removeItem(DOWNGRADED); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent("nl-bg-mode", { detail: m }));
}

const BLUE = 0x7fd3ff, ICE = 0xcdeeff, DEEP = 0x3da9ff;

export default function NeuralBackground({ force }: { force?: BgMode }) {
  const loc = useLocation();
  const [pref, setPref] = useState<BgMode>(() => getBgMode());
  const [downgraded, setDowngraded] = useState(() => { try { return sessionStorage.getItem(DOWNGRADED) === "1"; } catch { return false; } });
  const reduce = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    const on = (e: Event) => { setPref((e as CustomEvent).detail as BgMode); setDowngraded(false); };
    window.addEventListener("nl-bg-mode", on);
    return () => window.removeEventListener("nl-bg-mode", on);
  }, []);

  // Freeze while the Calculator's shared page is open.
  const still = reduce || (/\/calculator\//.test(loc.pathname) && new URLSearchParams(loc.search).get("view") === "calc");
  let mode: BgMode = pref;
  if (pref !== "off" && (force === "calm" || downgraded)) mode = "calm";
  if (force === "off") mode = "off";

  return (
    <div className="nl-bg pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden data-still={still ? "1" : "0"}>
      <BgStyles />
      <Glow still={still} />
      {mode !== "off" && <CurrentLines still={still} />}
      {mode === "calm" && <CssGrid still={still} />}
      {mode === "full" && <Scene still={still} onSlow={() => { try { sessionStorage.setItem(DOWNGRADED, "1"); } catch { /* */ } setDowngraded(true); }} />}
      {mode !== "off" && !still && <CursorGlow />}
    </div>
  );
}

/* ---------------- breathing glow (CSS) ---------------- */
function Glow({ still }: { still: boolean }) {
  return (
    <>
      <div className={`nl-bg-glow absolute inset-x-0 top-0 h-[70vh] ${still ? "nl-bg-paused" : ""}`}
        style={{ background: "radial-gradient(ellipse 55% 100% at 50% 0%, hsla(200,100%,62%,.16) 0%, transparent 70%)" }} />
      <div className={`nl-bg-glow2 absolute inset-x-0 bottom-0 h-[55vh] ${still ? "nl-bg-paused" : ""}`}
        style={{ background: "radial-gradient(ellipse 60% 90% at 50% 100%, hsla(212,100%,60%,.10) 0%, transparent 70%)" }} />
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
      op: 0.22 + Math.random() * 0.2, w: 1 + Math.random() * 0.8,
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

/* ---------------- calm grid (CSS perspective floor) ---------------- */
function CssGrid({ still }: { still: boolean }) {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[55vh] [perspective:420px]">
      <div className={`nl-bg-floor absolute inset-x-[-50%] bottom-[-10%] h-[140%] origin-bottom ${still ? "nl-bg-paused" : ""}`} />
    </div>
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
function Scene({ still, onSlow }: { still: boolean; onSlow: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stillRef = useRef(still);
  stillRef.current = still;

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      let THREE: typeof import("three");
      try { THREE = await import("three"); } catch { onSlow(); return; }
      if (disposed || !mountRef.current) return;
      const mount = mountRef.current;
      const phone = window.innerWidth < 768;
      const mul = phone ? 0.45 : 1;
      const fpsCap = phone ? 30 : 50;

      let renderer: import("three").WebGLRenderer;
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !phone, powerPreference: "low-power" }); }
      catch { onSlow(); return; }
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

      // 1. receding grid floor
      const gridSize = 40;
      const makeGrid = () => {
        const g = new THREE.GridHelper(gridSize, 40, BLUE, BLUE);
        const m = g.material as import("three").LineBasicMaterial;
        m.transparent = true; m.opacity = 0.13; m.blending = add; m.depthWrite = false;
        g.position.y = -2.6; track(g.geometry); track(m); return g;
      };
      const grid1 = makeGrid(), grid2 = makeGrid();
      grid2.position.z = -gridSize;
      scene.add(grid1, grid2);

      // 2. breathing core: nested icospheres + rings + cube-in-cube
      const core = new THREE.Group();
      core.position.set(0, 0.7, -7);
      scene.add(core);
      const spheres = [3.4, 2.6, 1.8].map((r, i) => {
        const geo = track(new THREE.EdgesGeometry(track(new THREE.IcosahedronGeometry(r, 1))));
        const mat = track(lineMat(i === 2 ? ICE : BLUE, 0.07 + i * 0.03));
        const mesh = new THREE.LineSegments(geo, mat);
        core.add(mesh);
        return { mesh, mat, base: 0.07 + i * 0.03, off: i * 2000, rx: (i % 2 ? -1 : 1) * 0.0018 * (1 + i * 0.4), ry: 0.0013 * (1 + i * 0.5) };
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
        const mat = track(lineMat(ICE, 0.22 - i * 0.04));
        const m = new THREE.LineSegments(geo, mat);
        core.add(m);
        return m;
      });

      // 3. floating shards
      const shards = Array.from({ length: Math.round(16 * mul) }, () => {
        const r = 0.15 + Math.random() * 0.5;
        const geo = track(new THREE.EdgesGeometry(track(Math.random() > 0.5 ? new THREE.TetrahedronGeometry(r, 0) : new THREE.OctahedronGeometry(r, 0))));
        const m = new THREE.LineSegments(geo, track(lineMat(BLUE, 0.14 + Math.random() * 0.14)));
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
      const points = new THREE.Points(pGeo, track(new THREE.PointsMaterial({ color: ICE, size: phone ? 0.05 : 0.04, transparent: true, opacity: 0.7, blending: add, depthWrite: false })));
      scene.add(points);
      const maxLinks = phone ? 40 : 120;
      const linkPos = new Float32Array(maxLinks * 6);
      const linkGeo = track(new THREE.BufferGeometry());
      linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
      const links = new THREE.LineSegments(linkGeo, track(lineMat(BLUE, 0.16)));
      scene.add(links);

      // 5. electric arcs between drifting anchors
      const anchors = Array.from({ length: 3 }, () => ({ phase: Math.random() * 6.28, speed: 0.0006 + Math.random() * 0.0008, rx: 4 + Math.random() * 2, ry: 2 + Math.random() * 1.5, z: -3 - Math.random() * 3, p: new THREE.Vector3() }));
      const arcGroup = new THREE.Group();
      scene.add(arcGroup);
      let arcAt = 0;

      // 6. light-streak bursts from the core
      const streaks: { line: import("three").Line; born: number; dir: import("three").Vector3; mat: import("three").LineBasicMaterial }[] = [];
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

      // auto-downgrade: sample the first ~4s of real frames
      let sampleStart = 0, sampleFrames = 0, sampled = false;

      const step = (now: number) => {
        // grid
        grid1.position.z += 0.05; grid2.position.z += 0.05;
        if (grid1.position.z > gridSize) grid1.position.z -= gridSize * 2;
        if (grid2.position.z > gridSize) grid2.position.z -= gridSize * 2;
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
          r.mat.opacity = 0.1 * (1 + Math.sin(ph) * 0.7);
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
          while (arcGroup.children.length) { const c = arcGroup.children.pop() as import("three").Line; c.geometry.dispose(); (c.material as import("three").Material).dispose(); }
          for (let i = 0; i < anchors.length; i++) for (let j = i + 1; j < anchors.length; j++) {
            const a = anchors[i].p, b = anchors[j].p;
            if (a.distanceTo(b) < 6) {
              const pts: import("three").Vector3[] = [];
              for (let k = 0; k <= 10; k++) { const v = new THREE.Vector3().lerpVectors(a, b, k / 10); if (k > 0 && k < 10) { v.x += (Math.random() - 0.5) * 0.3; v.y += (Math.random() - 0.5) * 0.3; } pts.push(v); }
              arcGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(ICE, 0.18 + Math.random() * 0.14)));
            }
          }
        }
        // bursts
        if (now > nextBurst) {
          for (let i = 0; i < 3 + Math.floor(Math.random() * 2); i++) {
            const ang = Math.random() * Math.PI * 2;
            const dir = new THREE.Vector3(Math.cos(ang) * 8, Math.sin(ang) * 5, Math.random() * 2);
            const mat = lineMat(0xffffff, 1);
            const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), mat);
            line.position.copy(core.position);
            scene.add(line);
            streaks.push({ line, born: now, dir, mat });
          }
          nextBurst = now + 3800 + Math.random() * 1500;
        }
        for (let i = streaks.length - 1; i >= 0; i--) {
          const s = streaks[i], age = (now - s.born) / 900;
          if (age >= 1) { scene.remove(s.line); s.line.geometry.dispose(); s.mat.dispose(); streaks.splice(i, 1); continue; }
          s.line.geometry.setFromPoints([s.dir.clone().multiplyScalar(Math.max(0, age - 0.15)), s.dir.clone().multiplyScalar(age)]);
          s.mat.opacity = (age < 0.2 ? age * 5 : Math.max(0, 1 - (age - 0.2) / 0.8)) * 0.7;
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
        // downgrade check: real frame rate during the first seconds
        if (!sampled) {
          if (!sampleStart) sampleStart = t;
          sampleFrames++;
          if (t - sampleStart > 4000) {
            sampled = true;
            const fps = (sampleFrames * 1000) / (t - sampleStart);
            if (fps < (phone ? 18 : 24)) { onSlow(); return; }
          }
        }
        last = t;
        step(t);
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVis);
        streaks.forEach((s) => { s.line.geometry.dispose(); s.mat.dispose(); });
        arcGroup.children.forEach((c) => { (c as import("three").Line).geometry.dispose(); ((c as import("three").Line).material as import("three").Material).dispose(); });
        disposables.forEach((d) => d.dispose());
        renderer.dispose();
        try { mount.removeChild(renderer.domElement); } catch { /* */ }
      };
    })();
    return () => { disposed = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="absolute inset-0 transition-opacity duration-1000" />;
}

function BgStyles() {
  return (
    <style>{`
.nl-bg-streak{stroke-dasharray:8 400;animation-name:nl-bg-flow;animation-timing-function:linear;animation-iteration-count:infinite;filter:drop-shadow(0 0 2px rgba(127,211,255,.9))}
@keyframes nl-bg-flow{0%{stroke-dashoffset:410}100%{stroke-dashoffset:0}}
.nl-bg-glow{animation:nl-bg-breathe 8s ease-in-out infinite}
.nl-bg-glow2{animation:nl-bg-breathe 8s ease-in-out -4s infinite}
@keyframes nl-bg-breathe{0%,100%{opacity:.55}50%{opacity:1}}
.nl-bg-floor{transform:rotateX(68deg);background-image:linear-gradient(rgba(127,211,255,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(127,211,255,.16) 1px,transparent 1px);background-size:56px 56px;mask-image:linear-gradient(to top,#000 10%,transparent 85%);-webkit-mask-image:linear-gradient(to top,#000 10%,transparent 85%);animation:nl-bg-floor 3.2s linear infinite}
@keyframes nl-bg-floor{to{background-position:0 56px}}
.nl-bg-paused,.nl-bg-paused *{animation-play-state:paused!important}
.nl-bg[data-still="1"] .nl-bg-streak{animation-play-state:paused}
@media (prefers-reduced-motion:reduce){.nl-bg-streak,.nl-bg-glow,.nl-bg-glow2,.nl-bg-floor{animation:none}}
`}</style>
  );
}
