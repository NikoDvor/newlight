/**
 * The 3D part of NeuralBackground, written so it can run either in a Web Worker (on an OffscreenCanvas,
 * off the main thread — scrolling and taps never wait on it) or on the main thread as a fallback.
 * No DOM access here: size, pointer, visibility, scrolling and "still" all come in through the controller.
 */
type THREEns = typeof import("three");

export interface SceneOpts { width: number; height: number; dpr: number; phone: boolean; glow: boolean; adaptive?: boolean }
export interface SceneCtl {
  resize(w: number, h: number): void;
  pointer(x: number, y: number): void;    // -1..1
  setStill(v: boolean): void;              // freeze on a still frame (Calculator share page, reduced motion)
  setHidden(v: boolean): void;             // app in background → stop
  setScrolling(v: boolean): void;          // kept for the API; the scene no longer slows while scrolling
  dispose(): void;
}

const BLUE = 0xb8ebff, ICE = 0xf2fbff, DEEP = 0x7fd0ff;

export function createScene(THREE: THREEns, canvas: HTMLCanvasElement | OffscreenCanvas, o: SceneOpts): SceneCtl {
  const g: any = globalThis as any;
  const raf: (cb: (t: number) => void) => number = typeof g.requestAnimationFrame === "function"
    ? (cb) => g.requestAnimationFrame(cb)
    : (cb) => g.setTimeout(() => cb(performance.now()), 16);
  const caf: (id: number) => void = typeof g.cancelAnimationFrame === "function" ? (id) => g.cancelAnimationFrame(id) : (id) => g.clearTimeout(id);

  const { phone } = o;
  const mul = phone ? 0.45 : 1;
  const baseCap = phone ? 30 : 50;
  const vis = phone ? 1.45 : 1; // phones have no glow pass, so lines draw brighter instead

  const renderer = new THREE.WebGLRenderer({ canvas: canvas as any, alpha: true, antialias: !phone, powerPreference: "low-power" });
  renderer.setPixelRatio(o.dpr);
  let curW = o.width, curH = o.height;
  renderer.setSize(o.width, o.height, false);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, o.width / o.height, 0.1, 200);
  camera.position.set(0, 1.2, 8);
  const add = THREE.AdditiveBlending;
  const lineMat = (color: number, opacity: number) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: add, depthWrite: false });
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };

  // Glow (computers): soft halo copies drawn inside the scene — replaces the old full-canvas CSS blur filter.
  const halos: { mat: import("three").LineBasicMaterial; src: import("three").LineBasicMaterial; k: number }[] = [];
  const addGlow = (obj: import("three").Object3D & { geometry: import("three").BufferGeometry }, src: import("three").LineBasicMaterial, isLoop = false) => {
    if (!o.glow) return;
    for (const [s, k] of [[1.012, 0.38], [1.028, 0.16]] as const) {
      const mat = track(lineMat((src.color as any).getHex(), src.opacity * k));
      const copy = isLoop ? new THREE.Line(obj.geometry, mat) : new THREE.LineSegments(obj.geometry, mat);
      copy.scale.setScalar(s);
      obj.add(copy);
      halos.push({ mat, src, k });
    }
  };

  // breathing core: nested icospheres + rings + cube-in-cube
  const core = new THREE.Group();
  core.position.set(0, 0.7, -7);
  scene.add(core);
  const spheres = [3.4, 2.6, 1.8].map((r, i) => {
    const geo = track(new THREE.EdgesGeometry(track(new THREE.IcosahedronGeometry(r, 1))));
    const mat = track(lineMat(i === 2 ? ICE : BLUE, Math.min(1, (0.42 + i * 0.16) * vis)));
    const mesh = new THREE.LineSegments(geo, mat);
    core.add(mesh);
    addGlow(mesh, mat);
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
    addGlow(line, mat, true);
    return { line, mat, off: 600 + i * 900 };
  });
  const cubes = [1.0, 0.55].map((s, i) => {
    const geo = track(new THREE.EdgesGeometry(track(new THREE.BoxGeometry(s, s, s))));
    const mat = track(lineMat(ICE, 0.7 - i * 0.1));
    const m = new THREE.LineSegments(geo, mat);
    core.add(m);
    addGlow(m, mat);
    return m;
  });

  // floating shards
  const shards = Array.from({ length: Math.round(16 * mul) }, () => {
    const r = 0.15 + Math.random() * 0.5;
    const geo = track(new THREE.EdgesGeometry(track(Math.random() > 0.5 ? new THREE.TetrahedronGeometry(r, 0) : new THREE.OctahedronGeometry(r, 0))));
    const mat = track(lineMat(BLUE, Math.min(1, (0.45 + Math.random() * 0.25) * vis)));
    const m = new THREE.LineSegments(geo, mat);
    m.position.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 10, -Math.random() * 22 - 2);
    m.userData = { rx: (Math.random() - 0.5) * 0.008, ry: (Math.random() - 0.5) * 0.008, vx: (Math.random() - 0.5) * 0.004, vy: (Math.random() - 0.5) * 0.004 };
    scene.add(m);
    addGlow(m, mat);
    return m;
  });

  // particle field with proximity lines
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
  scene.add(new THREE.Points(pGeo, track(new THREE.PointsMaterial({ color: ICE, size: phone ? 0.07 : 0.05, transparent: true, opacity: 0.9, blending: add, depthWrite: false }))));
  const maxLinks = phone ? 40 : 120;
  const linkPos = new Float32Array(maxLinks * 6);
  const linkGeo = track(new THREE.BufferGeometry());
  linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
  scene.add(new THREE.LineSegments(linkGeo, track(lineMat(BLUE, Math.min(1, 0.45 * vis)))));

  // electric arcs between drifting anchors (preallocated, updated in place)
  const anchors = Array.from({ length: 3 }, () => ({ phase: Math.random() * 6.28, speed: 0.0006 + Math.random() * 0.0008, rx: 4 + Math.random() * 2, ry: 2 + Math.random() * 1.5, z: -3 - Math.random() * 3, p: new THREE.Vector3() }));
  const ARC_SEGS = 10, ARC_PAIRS = 3;
  const arcPos = new Float32Array(ARC_PAIRS * ARC_SEGS * 6);
  const arcGeo = track(new THREE.BufferGeometry());
  arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPos, 3));
  const arcMat = track(lineMat(ICE, 0.38));
  scene.add(new THREE.LineSegments(arcGeo, arcMat));
  let arcAt = 0;
  const tmpA = new THREE.Vector3();

  // light-streak bursts from the core — fixed pool of 4, reused
  const streaks = Array.from({ length: 4 }, () => {
    const p = new Float32Array(6);
    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const mat = track(lineMat(0xffffff, 0));
    const line = new THREE.Line(geo, mat);
    line.position.copy(core.position);
    line.frustumCulled = false;
    scene.add(line);
    return { p, geo, mat, born: -1, dx: 0, dy: 0, dz: 0 };
  });
  let nextBurst = performance.now() + 2500;

  let mx = 0, my = 0, frame = 0;
  const step = (now: number) => {
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
    for (const h of halos) h.mat.opacity = Math.min(1, h.src.opacity * h.k);
    shards.forEach((s) => {
      s.rotation.x += s.userData.rx; s.rotation.y += s.userData.ry;
      s.position.x += s.userData.vx; s.position.y += s.userData.vy;
      if (s.position.x > 10) s.position.x = -10; if (s.position.x < -10) s.position.x = 10;
      if (s.position.y > 6) s.position.y = -6; if (s.position.y < -6) s.position.y = 6;
    });
    for (let i = 0; i < pCount; i++) {
      const q = L[i];
      pos[i * 3] = q.cx + Math.sin(now * q.fx + q.px) * q.ax;
      pos[i * 3 + 1] = q.cy + Math.sin(now * q.fy + q.py) * q.ay;
      pos[i * 3 + 2] = q.cz + Math.sin(now * q.fz + q.pz) * q.az;
    }
    pGeo.attributes.position.needsUpdate = true;
    // proximity lines: every other frame (particles drift slowly — identical to the eye, half the work)
    if ((frame & 1) === 0) {
      let n = 0;
      for (let i = 0; i < pCount && n < maxLinks; i++) {
        const ix = pos[i * 3], iy = pos[i * 3 + 1], iz = pos[i * 3 + 2];
        for (let j = i + 1; j < pCount && n < maxLinks; j++) {
          const dx = ix - pos[j * 3], dy = iy - pos[j * 3 + 1], dz = iz - pos[j * 3 + 2];
          if (dx * dx + dy * dy + dz * dz < 2.2) {
            const k = n * 6;
            linkPos[k] = ix; linkPos[k + 1] = iy; linkPos[k + 2] = iz;
            linkPos[k + 3] = pos[j * 3]; linkPos[k + 4] = pos[j * 3 + 1]; linkPos[k + 5] = pos[j * 3 + 2];
            n++;
          }
        }
      }
      linkGeo.setDrawRange(0, n * 2);
      linkGeo.attributes.position.needsUpdate = true;
    }
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
          const o6 = seg * 6;
          arcPos[o6] = px; arcPos[o6 + 1] = py; arcPos[o6 + 2] = pz; arcPos[o6 + 3] = tmpA.x; arcPos[o6 + 4] = tmpA.y; arcPos[o6 + 5] = tmpA.z;
          px = tmpA.x; py = tmpA.y; pz = tmpA.z; seg++;
        }
      }
      arcGeo.setDrawRange(0, seg * 2);
      arcGeo.attributes.position.needsUpdate = true;
      arcMat.opacity = Math.min(1, (0.5 + Math.random() * 0.25) * vis);
    }
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
      st.p[0] = st.dx * a0; st.p[1] = st.dy * a0; st.p[2] = st.dz * a0;
      st.p[3] = st.dx * age; st.p[4] = st.dy * age; st.p[5] = st.dz * age;
      st.geo.attributes.position.needsUpdate = true;
      st.mat.opacity = (age < 0.2 ? age * 5 : Math.max(0, 1 - (age - 0.2) / 0.8)) * 0.7;
    }
    scene.rotation.y += (mx * 0.05 - scene.rotation.y) * 0.05;
    scene.rotation.x += (my * 0.03 - scene.rotation.x) * 0.05;
  };

  let id = 0, last = 0, running = false, still = false, hidden = false, scrolling = false, disposed = false;
  const loop = (t: number) => {
    if (disposed || hidden) { running = false; return; }
    id = raf(loop);
    if (still) { if (last !== -1) { renderer.render(scene, camera); last = -1; } return; }
    const cap = baseCap;                          // keeps moving at full pace while scrolling
    if (last > 0 && t - last < 1000 / cap - 2) return;
    if (last > 0 && o.adaptive) adapt(t - last);
    last = t;
    frame++;
    step(t);
    renderer.render(scene, camera);
  };
  // Silent quality guard: if frames keep arriving late (busy laptop GPU, big Retina window),
  // render at a lower resolution — same look, far less work. Never changes the scene itself.
  let pr = o.dpr, slow = 0, seen = 0;
  const floor = phone ? 0.8 : 1;
  function adapt(gap: number) {
    seen++;
    if (gap > (1000 / baseCap) * 1.6) slow++;
    if (seen < 90) return;                        // judge every ~2–3 s
    if (slow / seen > 0.35 && pr > floor) {
      pr = Math.max(floor, Math.round((pr - 0.25) * 100) / 100);
      renderer.setPixelRatio(pr);
      renderer.setSize(curW, curH, false);
    }
    slow = 0; seen = 0;
  }
  const start = () => { if (!running && !disposed && !hidden) { running = true; last = 0; id = raf(loop); } };
  start();

  return {
    resize(w, h) { curW = w; curH = h; camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false); if (still) renderer.render(scene, camera); },
    pointer(x, y) { mx = x; my = y; },
    setStill(v) { still = v; if (!v) last = 0; },
    setHidden(v) { hidden = v; if (!v) start(); },
    setScrolling(v) { scrolling = v; void scrolling; },
    dispose() { disposed = true; caf(id); disposables.forEach((d) => d.dispose()); renderer.dispose(); },
  };
}
