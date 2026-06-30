import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Homepage background FX — extended 4D dimensional scene.
 *
 * Light blue / white only (#AADDFF, #C8EEFF, #FFFFFF).
 *
 *  Three.js layer (3D):
 *    1. Primary tesseract (WX/WY) + secondary counter-rotating tesseract (YZ/ZW)
 *    2. Hypersphere projection — 8 phasing concentric shells (one spawns every 1.5s)
 *    3. Klein bottle parametric wireframe (desktop only); inverts on exhale pop
 *    4. 3 Sierpinski tetrahedra fractals (level 1,2,3 — level 3 morphs to 4)
 *    5. Three nested icospheres breathing on offset cycles
 *    6. Four torus rings with warp + white flash
 *    7. Particle neural field (Lissajous drift + proximity lines)
 *    8. Membranes (rippling vertex displacement)
 *    9. Consciousness pulse network — 50/20 nodes with signal propagation
 *   10. Morphing 4D cross-section polygon (triangle→hex→back)
 *
 *  Canvas 2D overlay:
 *    A. Quantum field flow lines (desktop only)
 *    B. Dimensional rift lines (radial bursts)
 *    C. Shockwave rings on exhale pop
 *
 *  Cascading breath: tesseracts → rings (+0.3s) → spheres (+0.6s) → particles (+0.9s).
 *  Camera: 35s Lissajous (3:2), Z-roll ±3°/25s, mouse parallax ±35px.
 *  Scroll: opacity ×2.8, speed ×2, tesseract ×2.5, lerp 0.02, 800ms debounce.
 */
export function HomeFX() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current!;
    const isMobile = window.innerWidth < 768;
    const PARTICLE_COUNT = 300;
    const MEMBRANE_COUNT = isMobile ? 0 : 2;
    const NEURO_COUNT    = 120;
    const ENABLE_KLEIN   = !isMobile;
    const ENABLE_FRACTAL = !isMobile;
    const ENABLE_QFIELD  = !isMobile;

    // --- Renderer ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 18);
    const camLookAt = new THREE.Vector3(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    // Cap DPR at 1.5 to reduce render load on high-DPI displays.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    // Intro-window resolution cap (desktop only, 0-3000ms of the first intro).
    // Cap the backing-store size to the mobile-equivalent logical area and
    // upscale via CSS to fill the viewport. Restored to full size at t=3000ms.
    const INTRO_CAP_W = 830;
    const INTRO_CAP_H = 1800;
    let introResLow = false;
    try {
      introResLow = !isMobile && !sessionStorage.getItem("nlTransitionPlayed");
    } catch {}
    const introLogicalSize = () => {
      const w = introResLow ? Math.min(window.innerWidth, INTRO_CAP_W) : window.innerWidth;
      const h = introResLow ? Math.min(window.innerHeight, INTRO_CAP_H) : window.innerHeight;
      return { w, h };
    };
    const applyRendererSize = () => {
      const { w, h } = introLogicalSize();
      renderer.setSize(Math.floor(w), Math.floor(h), false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
    };
    applyRendererSize();
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.imageRendering = "auto";
    mount.appendChild(renderer.domElement);
    // Skip rendering back faces.
    const _gl = renderer.getContext();
    _gl.enable(_gl.CULL_FACE);

    // --- 2D overlay canvas (rifts + quantum field + shockwave) ---
    const fx2d = document.createElement("canvas");
    fx2d.style.position = "absolute";
    fx2d.style.inset = "0";
    fx2d.style.width = "100%";
    fx2d.style.height = "100%";
    fx2d.style.pointerEvents = "none";
    mount.appendChild(fx2d);
    const ctx = fx2d.getContext("2d")!;
    const sizeOverlay = () => {
      const dpr = isMobile ? Math.min(window.devicePixelRatio, 2) : Math.min(window.devicePixelRatio, 1.25);
      const { w, h } = introLogicalSize();
      fx2d.width = Math.floor(w * dpr);
      fx2d.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeOverlay();
    // Restore full desktop resolution when the intro window ends.
    let _introResRestore: ReturnType<typeof setTimeout> | null = null;
    if (introResLow) {
      _introResRestore = setTimeout(() => {
        introResLow = false;
        applyRendererSize();
        sizeOverlay();
      }, 3000);
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pointLight = new THREE.PointLight(0xC8EEFF, 0.5, 50);
    scene.add(pointLight);

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const _isDesktopFX = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
    const LINE_W = _isDesktopFX ? 1.95 : 1.5;
    const COL_PRIMARY   = _isDesktopFX ? 0x7EC8F0 : 0xAADDFF;
    const COL_SECONDARY = _isDesktopFX ? 0xA8DEFF : 0xC8EEFF;
    const COL_WHITE     = 0xFFFFFF;
    // Center-distance color adaptation (post-intro).
    const COL_BLUE_C  = new THREE.Color(COL_PRIMARY);
    const COL_WHITE_C = new THREE.Color(0xFFFFFF);
    const _adaptColTarget = new THREE.Color();
    const _adaptVec = new THREE.Vector3();


    // ============================================================
    // Tesseract builder (shared by primary + secondary)
    // ============================================================
    const tessVerts4: number[][] = [];
    for (let i = 0; i < 16; i++) {
      tessVerts4.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1, (i & 8) ? 1 : -1]);
    }
    const tessEdges: [number, number][] = [];
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        let diff = 0;
        for (let k = 0; k < 4; k++) if (tessVerts4[i][k] !== tessVerts4[j][k]) diff++;
        if (diff === 1) tessEdges.push([i, j]);
      }
    }
    const buildTesseract = (color: number, opacity: number) => {
      const positions = new Float32Array(tessEdges.length * 2 * 3);
      const geo = new THREE.BufferGeometry();
      const attr = new THREE.BufferAttribute(positions, 3);
      attr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute("position", attr);
      const idx = new Uint16Array(tessEdges.length * 2);
      for (let i = 0; i < tessEdges.length * 2; i++) idx[i] = i;
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, linewidth: LINE_W });
      const mesh = new THREE.LineSegments(geo, mat);
      scene.add(mesh);
      return { positions, attr, mat, mesh, verts3: new Float32Array(16 * 3) };
    };
    const tess1 = buildTesseract(COL_SECONDARY, 0.18);
    const tess2 = buildTesseract(COL_SECONDARY, 0.12);
    tess2.mesh.position.set(2.5, 1.6, 0);

    const tess1Angles = { wx: 0, wy: 0, wz: 0, xy: 0 };
    const tess1Speed  = { wx: 0.00045, wy: 0.00035, wz: 0.00025, xy: 0.00015 };
    const tess2Angles = { yz: 0, zw: 0, wz: 0, xz: 0 };
    const tess2Speed  = { yz: -0.00040, zw: -0.00030, wz: 0.00020, xz: 0.00012 };
    const TESS1_SCALE = 6.4;
    const TESS2_SCALE = 3.2;

    // Extra tesseracts (3 additional, total 5) — different speeds, axes, positions
    type ExtraTess = ReturnType<typeof buildTesseract> & {
      angles: { a: number; b: number };
      speeds: { a: number; b: number };
      axes: [number, number, number, number]; // pair of axis indices for two rotations
      scale: number;
      pos: [number, number, number];
    };
    const extraTess: ExtraTess[] = [];
    const extraDefs: { color: number; op: number; speeds: [number, number]; axes: [number,number,number,number]; scale: number; pos: [number,number,number] }[] = [
      { color: COL_PRIMARY,   op: 0.10, speeds: [ 0.00055, -0.00038], axes: [0,3, 1,2], scale: 2.6, pos: [-4.2,  1.8, -2] },
      { color: COL_SECONDARY, op: 0.09, speeds: [-0.00048,  0.00042], axes: [2,3, 0,1], scale: 2.2, pos: [ 3.6, -2.4, -1] },
      { color: COL_PRIMARY,   op: 0.08, speeds: [ 0.00060,  0.00033], axes: [1,3, 0,2], scale: 1.8, pos: [-1.6, -3.0,  1] },
    ];
    for (const d of extraDefs) {
      const t = buildTesseract(d.color, d.op) as ExtraTess;
      t.angles = { a: Math.random() * Math.PI, b: Math.random() * Math.PI };
      t.speeds = { a: d.speeds[0], b: d.speeds[1] };
      t.axes = d.axes;
      t.scale = d.scale;
      t.pos = d.pos;
      t.mesh.position.set(d.pos[0], d.pos[1], d.pos[2]);
      extraTess.push(t);
    }

    // Center glow sprite (additive)
    const makeGlowTex = () => {
      const size = 256;
      const cnv = document.createElement("canvas");
      cnv.width = cnv.height = size;
      const c = cnv.getContext("2d")!;
      const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0,    "rgba(255,255,255,1)");
      g.addColorStop(0.25, "rgba(200,238,255,0.6)");
      g.addColorStop(0.7,  "rgba(170,221,255,0.1)");
      g.addColorStop(1,    "rgba(170,221,255,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, size, size);
      const t = new THREE.CanvasTexture(cnv);
      t.minFilter = THREE.LinearFilter;
      return t;
    };
    const glowMat = new THREE.SpriteMaterial({
      map: makeGlowTex(), color: COL_WHITE, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(0.01, 0.01, 1);
    scene.add(glow);

    // ============================================================
    // Hypersphere — 8 concentric shells phasing in/out
    // ============================================================
    type Shell = {
      mesh: THREE.LineSegments;
      mat: THREE.LineBasicMaterial;
      birth: number;
      lifetime: number;
    };
    const shells: Shell[] = [];
    const SHELL_MAX = 8;
    const SHELL_LIFE = 12000; // ms to expand from 0 to maxR
    const SHELL_MAX_R = 12;
    const spawnShell = (now: number) => {
      const geo = new THREE.IcosahedronGeometry(1, 1);
      const edges = new THREE.EdgesGeometry(geo);
      const mat = new THREE.LineBasicMaterial({ color: COL_PRIMARY, transparent: true, opacity: 0 });
      const mesh = new THREE.LineSegments(edges, mat);
      scene.add(mesh);
      shells.push({ mesh, mat, birth: now, lifetime: SHELL_LIFE });
    };
    let nextShellAt = performance.now() + 200;

    // ============================================================
    // Klein bottle parametric (desktop only)
    // ============================================================
    let klein: {
      mesh: THREE.LineSegments;
      mat: THREE.LineBasicMaterial;
      attr: THREE.BufferAttribute;
      pos: Float32Array;
      uSeg: number;
      vSeg: number;
      invertPhase: number; // 1 normal, -1 inverted, lerped
      invertTarget: number;
    } | null = null;
    if (ENABLE_KLEIN) {
      const uSeg = 28, vSeg = 28;
      // Build line indices for a u,v grid (no closure on v — Klein wraps in u)
      const idx: number[] = [];
      const vi = (u: number, v: number) => (u % uSeg) * (vSeg + 1) + v;
      for (let u = 0; u < uSeg; u++) {
        for (let v = 0; v < vSeg; v++) {
          idx.push(vi(u, v), vi(u + 1, v));
          idx.push(vi(u, v), vi(u, v + 1));
        }
        for (let v = 0; v < vSeg; v++) {
          // last column edge in v
        }
      }
      const pos = new Float32Array(uSeg * (vSeg + 1) * 3);
      const geo = new THREE.BufferGeometry();
      const attr = new THREE.BufferAttribute(pos, 3);
      attr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute("position", attr);
      geo.setIndex(idx);
      const mat = new THREE.LineBasicMaterial({ color: COL_SECONDARY, transparent: true, opacity: 0.07 });
      const mesh = new THREE.LineSegments(geo, mat);
      mesh.position.set(-4, -1, -2);
      scene.add(mesh);
      klein = { mesh, mat, attr, pos, uSeg, vSeg, invertPhase: 1, invertTarget: 1 };
    }
    const updateKlein = (now: number, dir: number) => {
      if (!klein) return;
      const { uSeg, vSeg, pos, attr } = klein;
      const t = now * 0.0003;
      const scale = 0.45; // overall size
      for (let u = 0; u < uSeg; u++) {
        const uu = (u / uSeg) * Math.PI * 2;
        for (let v = 0; v <= vSeg; v++) {
          const vv = (v / vSeg) * Math.PI * 2 * dir;
          // Standard Klein bottle parametric (figure-8 immersion)
          const a = 2;
          const r = a + Math.cos(uu / 2) * Math.sin(vv) - Math.sin(uu / 2) * Math.sin(2 * vv);
          const x = (a + Math.cos(uu / 2) * Math.sin(vv) - Math.sin(uu / 2) * Math.sin(2 * vv)) * Math.cos(uu);
          const y = (a + Math.cos(uu / 2) * Math.sin(vv) - Math.sin(uu / 2) * Math.sin(2 * vv)) * Math.sin(uu);
          const z = Math.sin(uu / 2) * Math.sin(vv) + Math.cos(uu / 2) * Math.sin(2 * vv);
          const o = (u * (vSeg + 1) + v) * 3;
          // rotate around Y by t
          const cy = Math.cos(t), sy = Math.sin(t);
          pos[o]     = (x * cy - z * sy) * scale;
          pos[o + 1] = y * scale;
          pos[o + 2] = (x * sy + z * cy) * scale;
          void r;
        }
      }
      attr.needsUpdate = true;
    };

    // ============================================================
    // Sierpinski tetrahedra (desktop only)
    // ============================================================
    type Fractal = {
      group: THREE.Group;
      mat: THREE.LineBasicMaterial;
      level: number;
      baseLevel: number;
      morph: boolean; // if true, level lerps baseLevel → baseLevel+1
    };
    const fractals: Fractal[] = [];
    const buildSierpinski = (level: number, scale: number): THREE.BufferGeometry => {
      // tetrahedron vertices
      const v: [number, number, number][] = [
        [ 1,  1,  1],
        [-1, -1,  1],
        [-1,  1, -1],
        [ 1, -1, -1],
      ];
      // Recursive generation of edge segments
      const segs: number[] = [];
      const emitTet = (p: [number, number, number][], s: number) => {
        const verts = p;
        const e: [number, number][] = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
        for (const [a, b] of e) {
          segs.push(verts[a][0]*s, verts[a][1]*s, verts[a][2]*s,
                    verts[b][0]*s, verts[b][1]*s, verts[b][2]*s);
        }
      };
      const recurse = (p: [number, number, number][], lvl: number, s: number) => {
        if (lvl <= 0) { emitTet(p, s); return; }
        // four sub-tets at midpoints
        const subs: [number, number, number][][] = [];
        for (let i = 0; i < 4; i++) {
          const c: [number, number, number][] = p.map((q, k) => {
            if (k === i) return q;
            return [(p[i][0]+q[0])/2, (p[i][1]+q[1])/2, (p[i][2]+q[2])/2];
          });
          subs.push(c);
        }
        for (const sub of subs) recurse(sub, lvl - 1, s);
      };
      recurse(v, level, scale);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(segs), 3));
      return geo;
    };
    if (ENABLE_FRACTAL) {
      const positions: [number, number, number][] = [
        [-9, 5, -3],
        [ 9, -5, -3],
        [ 8, 5, -5],
      ];
      const baseLevels = [1, 2, 3];
      for (let i = 0; i < 3; i++) {
        const grp = new THREE.Group();
        const geo = buildSierpinski(baseLevels[i], 2);
        const mat = new THREE.LineBasicMaterial({ color: COL_PRIMARY, transparent: true, opacity: 0.06 });
        const mesh = new THREE.LineSegments(geo, mat);
        grp.add(mesh);
        grp.position.set(...positions[i]);
        scene.add(grp);
        fractals.push({ group: grp, mat, level: baseLevels[i], baseLevel: baseLevels[i], morph: i === 2 });
      }
    }
    // Periodically rebuild level-3 fractal toward level 4 (slowly, every 4s pulse)
    let fractalMorphPhase = 0;

    // ============================================================
    // Nested icospheres
    // ============================================================
    const sphereDefs = [
      { r: 12.0, op: 0.045, rx:  0.0009, ry:  0.0006, rz:  0.0004, breathOffset: 1000 },
      { r: 10.0, op: 0.050, rx: -0.0014, ry:  0.0010, rz:  0.0006, breathOffset: 3000 },
      { r:  8.0, op: 0.054, rx:  0.0012, ry:  0.0008, rz:  0.0005, breathOffset: 0    },
      { r:  6.4, op: 0.081, rx: -0.0022, ry:  0.0018, rz: -0.0011, breathOffset: 2000 },
      { r:  4.8, op: 0.108, rx:  0.0040, ry: -0.0028, rz:  0.0022, breathOffset: 4000 },
    ];
    type Sphere = { mesh: THREE.LineSegments; mat: THREE.LineBasicMaterial; def: typeof sphereDefs[number] };
    const spheres: Sphere[] = sphereDefs.map(def => {
      const geo = new THREE.IcosahedronGeometry(def.r, 1);
      const edges = new THREE.EdgesGeometry(geo);
      const mat = new THREE.LineBasicMaterial({ color: COL_PRIMARY, transparent: true, opacity: def.op, linewidth: LINE_W });
      const mesh = new THREE.LineSegments(edges, mat);
      scene.add(mesh);
      return { mesh, mat, def };
    });

    // ============================================================
    // Torus rings
    // ============================================================
    type Ring = {
      mesh: THREE.LineSegments;
      mat: THREE.LineBasicMaterial;
      spin: { x: number; y: number; z: number };
      warpPhase: number; warpSpeed: number; warpAmp: number;
      flashUntil: number; nextFlash: number;
    };
    const RING_COUNT = 8;
    const ringTilts: number[] = [];
    for (let i = 0; i < RING_COUNT; i++) ringTilts.push((Math.PI * i) / RING_COUNT);
    const rings: Ring[] = [];
    for (let i = 0; i < RING_COUNT; i++) {
      const r = rand(6.4, 12.8);
      const geo = new THREE.TorusGeometry(r, 0.06, 5, 67);
      const edges = new THREE.EdgesGeometry(geo);
      const mat = new THREE.LineBasicMaterial({ color: COL_PRIMARY, transparent: true, opacity: 0.10, linewidth: LINE_W });
      const mesh = new THREE.LineSegments(edges, mat);
      mesh.rotation.x = ringTilts[i];
      mesh.rotation.z = rand(0, Math.PI * 2);
      scene.add(mesh);
      rings.push({
        mesh, mat,
        spin: {
          x: rand(0.0008, 0.0022) * (Math.random() > 0.5 ? 1 : -1),
          y: rand(0.0008, 0.0022) * (Math.random() > 0.5 ? 1 : -1),
          z: rand(0.0004, 0.0014) * (Math.random() > 0.5 ? 1 : -1),
        },
        warpPhase: rand(0, Math.PI * 2),
        warpSpeed: (Math.PI * 2) / rand(8000, 12000),
        warpAmp: 8 / 25,
        flashUntil: 0,
        nextFlash: performance.now() + rand(8000, 14000),
      });
    }

    // ============================================================
    // Particles
    // ============================================================
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const lissajous = Array.from({ length: PARTICLE_COUNT }, () => ({
      cx: rand(-10, 10), cy: rand(-6, 6), cz: rand(-12, -2),
      ax: rand(2, 4), ay: rand(1.5, 3), az: rand(1, 2.5),
      fx: rand(0.00015, 0.0005), fy: rand(0.00015, 0.0005), fz: rand(0.00010, 0.0004),
      px: rand(0, Math.PI * 2), py: rand(0, Math.PI * 2), pz: rand(0, Math.PI * 2),
    }));
    const particleGroup = new THREE.Group();
    scene.add(particleGroup);
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: COL_PRIMARY, size: 0.08, transparent: true, opacity: 0.06, sizeAttenuation: true,
    });
    particleGroup.add(new THREE.Points(pGeo, pMat));
    const MAX_LINKS = isMobile ? 1200 : 3000;
    const linePositions = new Float32Array(MAX_LINKS * 6);
    const lineGeo = new THREE.BufferGeometry();
    const lineAttr = new THREE.BufferAttribute(linePositions, 3);
    lineAttr.setUsage(THREE.DynamicDrawUsage);
    lineGeo.setAttribute("position", lineAttr);
    // Line geometry is created ONCE. Each frame we overwrite the leading
    // `linkCount*6` floats of `linePositions` in place, mark a partial
    // update range so only the touched bytes ship to the GPU, and adjust
    // the draw range. We never reallocate the Float32Array, the
    // BufferAttribute, or the BufferGeometry after this point.
    lineGeo.setDrawRange(0, 0);
    let prevLinkCount = 0;
    const lineMat = new THREE.LineBasicMaterial({ color: COL_PRIMARY, transparent: true, opacity: 0.04 });
    const linkMesh = new THREE.LineSegments(lineGeo, lineMat);
    particleGroup.add(linkMesh);

    // ============================================================
    // Membranes
    // ============================================================
    type Membrane = {
      mesh: THREE.LineSegments; mat: THREE.LineBasicMaterial;
      geo: THREE.BufferGeometry; orig: Float32Array; seg: number;
    };
    const membranes: Membrane[] = [];
    const buildMembrane = (size: number, seg: number) => {
      const verts: number[] = [];
      const idx: number[] = [];
      const half = size / 2, step = size / seg;
      const v = (x: number, y: number) => y * (seg + 1) + x;
      for (let y = 0; y <= seg; y++)
        for (let x = 0; x <= seg; x++)
          verts.push(-half + x * step, -half + y * step, 0);
      for (let y = 0; y <= seg; y++)
        for (let x = 0; x < seg; x++) idx.push(v(x, y), v(x + 1, y));
      for (let x = 0; x <= seg; x++)
        for (let y = 0; y < seg; y++) idx.push(v(x, y), v(x, y + 1));
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(verts);
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
      const mat = new THREE.LineBasicMaterial({ color: COL_PRIMARY, transparent: true, opacity: 0.03 });
      const mesh = new THREE.LineSegments(geo, mat);
      return { mesh, mat, geo, orig: pos.slice() };
    };
    const memDepths = [-6, -16];
    const memTilts = [-Math.PI / 2.4, -Math.PI / 1.8];
    for (let i = 0; i < MEMBRANE_COUNT; i++) {
      const m = buildMembrane(14, 21);
      m.mesh.position.z = memDepths[i];
      m.mesh.rotation.x = memTilts[i];
      m.mesh.rotation.z = rand(-0.6, 0.6);
      scene.add(m.mesh);
      membranes.push({ ...m, seg: 21 });
    }

    // ============================================================
    // Consciousness pulse network
    // ============================================================
    type Node = {
      pos: THREE.Vector3;
      brightness: number;   // 0..1, decays
      fireAt: number;       // scheduled fire time (ms); -1 if none
      neighbors: number[];
      lastFire: number;
    };
    const neuro: Node[] = [];
    for (let i = 0; i < NEURO_COUNT; i++) {
      neuro.push({
        pos: new THREE.Vector3(rand(-8, 8), rand(-5, 5), rand(-6, 4)),
        brightness: 0,
        fireAt: -1,
        neighbors: [],
        lastFire: -Infinity,
      });
    }
    const NEURO_LINK_DIST_SQ = 4.5 * 4.5;
    for (let i = 0; i < NEURO_COUNT; i++) {
      for (let j = i + 1; j < NEURO_COUNT; j++) {
        if (neuro[i].pos.distanceToSquared(neuro[j].pos) < NEURO_LINK_DIST_SQ) {
          neuro[i].neighbors.push(j);
          neuro[j].neighbors.push(i);
        }
      }
    }
    const neuroPosArr = new Float32Array(NEURO_COUNT * 3);
    const neuroColArr = new Float32Array(NEURO_COUNT * 3);
    for (let i = 0; i < NEURO_COUNT; i++) {
      neuroPosArr[i*3]   = neuro[i].pos.x;
      neuroPosArr[i*3+1] = neuro[i].pos.y;
      neuroPosArr[i*3+2] = neuro[i].pos.z;
      neuroColArr[i*3] = neuroColArr[i*3+1] = neuroColArr[i*3+2] = 1;
    }
    const neuroGeo = new THREE.BufferGeometry();
    neuroGeo.setAttribute("position", new THREE.BufferAttribute(neuroPosArr, 3));
    const neuroColAttr = new THREE.BufferAttribute(neuroColArr, 3);
    neuroColAttr.setUsage(THREE.DynamicDrawUsage);
    neuroGeo.setAttribute("color", neuroColAttr);
    const neuroMat = new THREE.PointsMaterial({
      size: 0.18, transparent: true, opacity: 0.15, vertexColors: true, sizeAttenuation: true,
    });
    const neuroPoints = new THREE.Points(neuroGeo, neuroMat);
    scene.add(neuroPoints);
    // edges (static positions)
    const neuroEdgeList: [number, number][] = [];
    for (let i = 0; i < NEURO_COUNT; i++)
      for (const j of neuro[i].neighbors) if (j > i) neuroEdgeList.push([i, j]);
    const neuroEdgePos = new Float32Array(neuroEdgeList.length * 6);
    for (let e = 0; e < neuroEdgeList.length; e++) {
      const [a, b] = neuroEdgeList[e];
      neuroEdgePos[e*6]   = neuro[a].pos.x;
      neuroEdgePos[e*6+1] = neuro[a].pos.y;
      neuroEdgePos[e*6+2] = neuro[a].pos.z;
      neuroEdgePos[e*6+3] = neuro[b].pos.x;
      neuroEdgePos[e*6+4] = neuro[b].pos.y;
      neuroEdgePos[e*6+5] = neuro[b].pos.z;
    }
    const neuroEdgeGeo = new THREE.BufferGeometry();
    neuroEdgeGeo.setAttribute("position", new THREE.BufferAttribute(neuroEdgePos, 3));
    const neuroEdgeMat = new THREE.LineBasicMaterial({ color: COL_PRIMARY, transparent: true, opacity: 0.04 });
    scene.add(new THREE.LineSegments(neuroEdgeGeo, neuroEdgeMat));

    let nextSpontaneous = performance.now() + 1500;
    const fireNode = (i: number, now: number) => {
      if (now - neuro[i].lastFire < 150) return; // refractory
      neuro[i].brightness = 1;
      neuro[i].lastFire = now;
      for (const j of neuro[i].neighbors) {
        // schedule neighbor fire 0.3-0.5s later if not already scheduled sooner
        const t = now + rand(300, 500);
        if (neuro[j].fireAt < 0 || neuro[j].fireAt > t) neuro[j].fireAt = t;
      }
    };

    // ============================================================
    // 4D cross-section morph polygon
    // ============================================================
    // We sample 3..7 sides and interpolate by a continuous phase.
    const xsecMaxSides = 8;
    const xsecPos = new Float32Array(xsecMaxSides * 2 * 3); // segments
    const xsecGeo = new THREE.BufferGeometry();
    const xsecAttr = new THREE.BufferAttribute(xsecPos, 3);
    xsecAttr.setUsage(THREE.DynamicDrawUsage);
    xsecGeo.setAttribute("position", xsecAttr);
    const xsecMat = new THREE.LineBasicMaterial({ color: COL_WHITE, transparent: true, opacity: 0.12 });
    const xsecMesh = new THREE.LineSegments(xsecGeo, xsecMat);
    xsecMesh.position.set(-2.2, -1.2, 0); // slightly lower-left of center
    scene.add(xsecMesh);
    const XSEC_RADIUS = 1.6; // 150px-ish at z=18

    // ============================================================
    // Master breath pop cycle
    // ============================================================
    const BREATH_TOTAL = 1200 + 300 + 800 + 1000;
    let breathStart = performance.now() + rand(2000, 4000);
    type BreathState = {
      scale: number; opa: number; tessSpd: number; glowRadius: number;
      particleBoost: number; idleAdd: number;
      phase: "idle" | "inhale" | "hold" | "exhale" | "return";
      phaseT: number; // 0..1 inside current phase
    };
    const computeBreathAt = (offsetMs: number, now: number, scrolling: boolean): BreathState => {
      const elapsed = now - breathStart - offsetMs;
      const out: BreathState = {
        scale: 1, opa: 1, tessSpd: 1, glowRadius: 0,
        particleBoost: 1, idleAdd: 0, phase: "idle", phaseT: 0,
      };
      if (elapsed < 0 || elapsed > BREATH_TOTAL) {
        out.idleAdd = Math.sin(now * 0.001) * 0.015;
        return out;
      }
      if (elapsed < 1200) {
        const k = elapsed / 1200;
        out.scale = 1 + 0.15 * k;
        out.opa = 1 + 0.40 * k;
        out.tessSpd = 1 + 0.50 * k;
        out.glowRadius = 300 * k;
        out.particleBoost = 1 + k;
        out.phase = "inhale"; out.phaseT = k;
      } else if (elapsed < 1500) {
        out.scale = 1.15; out.opa = 1.4; out.tessSpd = 1.5;
        out.glowRadius = 300; out.particleBoost = 2;
        out.phase = "hold"; out.phaseT = (elapsed - 1200) / 300;
      } else if (elapsed < 2300) {
        const k = (elapsed - 1500) / 800;
        out.scale = 1.15 + (0.05 - 1.15) * k;
        out.opa = 1.4 + (0.05 - 1.4) * k;
        out.tessSpd = 1.5 + (0.5 - 1.5) * k;
        out.glowRadius = 300 - 300 * k;
        out.particleBoost = 2 - k;
        out.phase = "exhale"; out.phaseT = k;
      } else {
        const k = (elapsed - 2300) / 1000;
        out.scale = 0.05 + 0.95 * k;
        out.opa = 0.05 + 0.95 * k;
        out.tessSpd = 0.5 + 0.5 * k;
        out.glowRadius = 0;
        out.particleBoost = 1;
        out.phase = "return"; out.phaseT = k;
      }
      void scrolling;
      return out;
    };
    // After a full breath: schedule next start
    const advanceBreathSchedule = (now: number, scrolling: boolean) => {
      // tail cascade reaches up to +0.9s. Cycle ends at breathStart + BREATH_TOTAL + 900.
      if (now > breathStart + BREATH_TOTAL + 900) {
        const next = scrolling ? rand(2000, 3000) : rand(7000, 12000);
        breathStart = now + next;
        // Reset pop trackers
        popFiredRifts = false;
        popFiredShock = false;
        popKleinTriggered = false;
      }
    };

    // ============================================================
    // Dimensional rift lines (2D canvas)
    // ============================================================
    type Rift = {
      angle: number; born: number; life: number;
    };
    const rifts: Rift[] = [];
    let nextRiftBurst = performance.now() + 4000;
    const fireRiftBurst = (now: number, count: number) => {
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < count; i++) {
        rifts.push({ angle: base + (Math.PI * 2 / count) * i + rand(-0.2, 0.2), born: now, life: 800 });
      }
    };

    // ============================================================
    // Shockwave rings (2D canvas)
    // ============================================================
    type Shock = { born: number; life: number };
    const shocks: Shock[] = [];

    // Track which one-shot pop effects have fired in current breath cycle
    let popFiredRifts = false;
    let popFiredShock = false;
    let popKleinTriggered = false;

    // Intro one-shot trackers (5.0s–6.5s)
    let introFiredRifts = false;
    let introFiredShocks = false;
    let introFiredBloom = false;
    const introShocks: { born: number; life: number; maxR: number }[] = [];
    type IntroBranch = { x1: number; y1: number; x2: number; y2: number; depth: number };
    let introBranches: IntroBranch[] = [];
    let introBloomBorn = 0;

    // Post-intro dramatic surge (6.5s–7.8s, one-shot per session)
    let postIntroFired = (() => {
      try { return !!sessionStorage.getItem("nlPostIntroPlayed"); } catch { return false; }
    })();

    // ============================================================
    // Quantum field (2D canvas, desktop only)
    // ============================================================
    // We don't render 200x200 — that's 40k lines, too expensive.
    // Render a sparse grid that samples the same field; visually equivalent.
    const Q_GRID = 20;
    let qFieldAmpMul = 1; // boosted on scroll

    // ============================================================
    // Input + scroll
    // ============================================================
    let mx = 0, my = 0;
    const onPointer = (e: PointerEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const _doResize = () => {
      requestAnimationFrame(() => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        applyRendererSize();
        sizeOverlay();
      });
    };
    let _resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (_resizeTimer) clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(_doResize, 300);
    };
    window.addEventListener("resize", onResize);

    const stateMul  = { opa: 1, spd: 1.4, tess: 1.4 };
    const target = { opa: 1, spd: 1.4, tess: 1.4 };
    let scrolling = false;
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    let nextScrollRift = 0;
    // Container opacity: 0.35 rest, 0.7 scroll (mobile) / 0.4 rest, 0.75 scroll (desktop ≥768px)
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    const REST_OPA = isDesktop ? 0.4 : 0.35;
    const ACTIVE_OPA = isDesktop ? 0.75 : 0.7;
    let containerOpaTarget = REST_OPA;
    let containerOpa = REST_OPA;
    mount.style.opacity = String(REST_OPA);
    mount.style.willChange = "opacity";
    mount.style.transform = "translateZ(0)";
    let lastWrittenMountOpa = REST_OPA;
    const onScroll = () => {
      target.opa = 4.0; target.spd = 2.8 * 1.4; target.tess = 3.5 * 1.4;
      scrolling = true;
      qFieldAmpMul = 3;
      containerOpaTarget = ACTIVE_OPA;
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        target.opa = 1; target.spd = 1.4; target.tess = 1.4;
        scrolling = false;
        qFieldAmpMul = 1;
        containerOpaTarget = REST_OPA;
      }, 800);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    let paused = false;
    const onVis = () => { paused = document.visibilityState !== "visible"; };
    document.addEventListener("visibilitychange", onVis);

    // ============================================================
    // Animation loop
    // ============================================================
    const startTime = performance.now();
    const camTargetPos = new THREE.Vector3();
    let raf = 0;
    // Frame counter — used on desktop to throttle expensive per-frame work
    // (particle link rebuild + extra tesseracts + outer spheres + second ring
    // set + 2D quantum grid) to every other frame. Mobile runs every frame.
    let frameCount = 0;
    // fx2d intro throttle: during 0-3s, the overlay has nothing meaningful
    // to draw most frames (no idle rifts yet, no intro layers until 5.2s).
    // Skip the per-frame clearRect + projection work and only clear once
    // when entering the quiet window. `fx2dCleared` tracks whether the
    // canvas is already blank so we don't repeatedly clear it.
    let fx2dCleared = false;

    // Helper: project a 3D world point into 2D screen pixels.
    const v3 = new THREE.Vector3();
    const project = (x: number, y: number, z: number) => {
      v3.set(x, y, z).project(camera);
      return {
        x: (v3.x * 0.5 + 0.5) * window.innerWidth,
        y: (-v3.y * 0.5 + 0.5) * window.innerHeight,
      };
    };

    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (paused) { return; }
      frameCount++;
      const now = performance.now();
      const fade = Math.min(1, (now - startTime) / 1500);

      // Intro complexity gate: 0 during 0-3s (reduced complexity),
      // ramps 0→1 over the next 1s to full complexity. Used to hide/dim
      // expensive scene items (extra tesseracts, half the rings, half the
      // particles, neuro network, outer spheres) during the intro window.
      const _introMs = now - startTime;
      const complexity = _introMs < 3000 ? 0 : Math.min(1, (_introMs - 3000) / 1000);
      const fullComplexity = complexity >= 1;

      // Background color transition is owned by the shared CSS :root nl-phase
      // animation on both mobile and desktop — identical code path, no JS lerp.
      if (document.documentElement.style.getPropertyValue('--bg')) {
        document.documentElement.style.removeProperty('--bg');
      }


      const lerpOpa = 0.04;
      const lerpSpd = 0.015;
      const lerpTess = 0.015;
      stateMul.opa  += (target.opa  - stateMul.opa)  * lerpOpa;
      stateMul.spd  += (target.spd  - stateMul.spd)  * lerpSpd;
      stateMul.tess += (target.tess - stateMul.tess) * lerpTess;
      // Idle container breath: oscillate REST_OPA → REST_OPA × 1.8 on a slow
      // sine cycle so the whole FX layer visibly pulses. Only active when
      // not scrolling and after the 0-3000ms intro. Scroll target is untouched.
      if (!scrolling && _introMs > 3000) {
        const idlePhase = (now * Math.PI * 2) / 6000; // 6s period
        const sinP = Math.sin(idlePhase);
        // Opacity swing: REST_OPA × [0.5, 3.2], clamped at 1.0
        const idleMul = 1.85 + sinP * 1.35; // [0.5, 3.2]
        containerOpaTarget = Math.max(0, Math.min(1, REST_OPA * idleMul));
        // Scale swing: ±17.5% on the container, synced to same cycle
        const idleScale = 1 + sinP * 0.175;
        mount.style.transform = `translateZ(0) scale(${idleScale.toFixed(4)})`;
      }
      containerOpa += (containerOpaTarget - containerOpa) * 0.05;
      if (Math.abs(containerOpa - lastWrittenMountOpa) > 0.001) {
        mount.style.opacity = String(containerOpa);
        lastWrittenMountOpa = containerOpa;
      }




      // Cascading breath: 4 offsets at 0, 300, 600, 900ms.
      const bTess  = computeBreathAt(0,   now, scrolling);
      const bRings = computeBreathAt(300, now, scrolling);
      const bSph   = computeBreathAt(600, now, scrolling);
      const bPart  = computeBreathAt(900, now, scrolling);
      advanceBreathSchedule(now, scrolling);

      // One-shot pop triggers (driven by the leading cascade — tesseracts)
      if (bTess.phase === "exhale" && !popFiredRifts) {
        popFiredRifts = true;
        fireRiftBurst(now, 12);
      }
      if (bTess.phase === "exhale" && !popFiredShock) {
        popFiredShock = true;
        shocks.push({ born: now, life: 600 });
      }
      if (klein) {
        if (bTess.phase === "exhale" && !popKleinTriggered) {
          popKleinTriggered = true;
          klein.invertTarget = -klein.invertTarget;
        }
        klein.invertPhase += (klein.invertTarget - klein.invertPhase) * 0.06;
      }
      // Inhale: consciousness network fires all at once at peak inhale
      if (bTess.phase === "inhale" && bTess.phaseT > 0.95) {
        for (let i = 0; i < NEURO_COUNT; i++) fireNode(i, now);
      }

      // ============================================================
      // INTRO ENDING SEQUENCE (one-shot, 5.0s–6.5s)
      // ============================================================
      const introT = now - startTime;
      let introVortex = 1;
      let introTessBirth = 1;
      let introCamRoll = 0;
      if (introT >= 5000 && introT <= 6500) {
        const k = (introT - 5000) / 1500; // 0..1
        introVortex = 1 + 3 * (1 - k) * (1 - k); // peak 4x → 1
        introCamRoll = Math.sin(introT * 0.012) * 8 * (1 - k);
      }
      if (introT >= 5000 && introT <= 5600) {
        const k = (introT - 5000) / 600;
        if (k < 0.7)      introTessBirth = (k / 0.7) * 1.3;
        else              introTessBirth = 1.3 + (1.0 - 1.3) * ((k - 0.7) / 0.3);
      }
      // Layer 3: rifts at 5.0s
      if (introT >= 5000 && !introFiredRifts) {
        introFiredRifts = true;
        fireRiftBurst(now, 12);
      }
      // Layer 2: 4 shockwaves at 5.2s, offset 0.15s each, life 0.8s, → 120vw
      if (introT >= 5200 && !introFiredShocks) {
        introFiredShocks = true;
        const maxR = window.innerWidth * 1.2;
        for (let i = 0; i < 4; i++) {
          introShocks.push({ born: now + i * 150, life: 800, maxR });
        }
      }
      // Layer 5: fractal bloom at 5.5s
      if (introT >= 5500 && !introFiredBloom) {
        introFiredBloom = true;
        introBloomBorn = now;
        const cx0 = window.innerWidth / 2, cy0 = window.innerHeight / 2;
        const baseLen = Math.min(window.innerWidth, window.innerHeight) * 0.28;
        const grow = (x: number, y: number, ang: number, len: number, depth: number) => {
          const x2 = x + Math.cos(ang) * len;
          const y2 = y + Math.sin(ang) * len;
          introBranches.push({ x1: x, y1: y, x2, y2, depth });
          if (depth < 2) {
            const split = depth === 0 ? 0.6 : 0.8;
            const sx = x + Math.cos(ang) * len * split;
            const sy = y + Math.sin(ang) * len * split;
            const nextLen = len * (1 - split) * 1.6;
            const spread = depth === 0 ? 0.5 : 0.35;
            grow(sx, sy, ang - spread, nextLen, depth + 1);
            grow(sx, sy, ang + spread, nextLen, depth + 1);
          }
        };
        for (let i = 0; i < 6; i++) {
          grow(cx0, cy0, (i / 6) * Math.PI * 2, baseLen, 0);
        }
      }

      // ============================================================
      // POST-INTRO DRAMATIC SURGE (6.5s–7.8s, one-shot per session)
      // ============================================================
      let postIntroOpaMul = 1, postIntroSpdMul = 1, postIntroTessPulse = 1, postIntroGlow = 0;
      if (introT >= 6500 && introT <= 7800 && !postIntroFired) {
        if (introT <= 7000) {
          const k = (introT - 6500) / 500; // 0..1 surge
          postIntroOpaMul = 1 + 2 * k;       // 1 → 3
          postIntroSpdMul = 1 + 1 * k;       // 1 → 2
          postIntroTessPulse = 1 + 0.2 * k;  // 1 → 1.2
          postIntroGlow = k;
        } else {
          const k = (introT - 7000) / 800;   // 0..1 ease out
          const ek = 1 - Math.pow(1 - k, 2);
          postIntroOpaMul = 3 + (1 - 3) * ek;
          postIntroSpdMul = 2 + (1 - 2) * ek;
          postIntroTessPulse = 1.2 + (1.0 - 1.2) * ek;
          postIntroGlow = 1 - ek;
        }
      }
      // One-shot triggers at start of surge
      if (introT >= 6500 && !postIntroFired) {
        postIntroFired = true;
        try { sessionStorage.setItem("nlPostIntroPlayed", "1"); } catch {}
        for (let i = 0; i < NEURO_COUNT; i++) fireNode(i, now);
        fireRiftBurst(now, 12);
        for (const r of rings) { r.flashUntil = now + 400; r.nextFlash = now + rand(8000, 14000); }
      }

      // Apply vortex + post-intro multipliers (restored at end of frame)
      const _savedSpd = stateMul.spd;
      const _savedTess = stateMul.tess;
      const _savedOpa = stateMul.opa;
      stateMul.spd *= introVortex * postIntroSpdMul;
      stateMul.tess *= introVortex * postIntroSpdMul;

      stateMul.opa *= postIntroOpaMul;

      // ---- Primary tesseract (WX/WY/WZ + XY mild) ----
      const tessSpd1 = stateMul.tess * bTess.tessSpd;
      tess1Angles.wx += tess1Speed.wx * tessSpd1;
      tess1Angles.wy += tess1Speed.wy * tessSpd1;
      tess1Angles.wz += tess1Speed.wz * tessSpd1;
      tess1Angles.xy += tess1Speed.xy * tessSpd1;
      {
        const cWX = Math.cos(tess1Angles.wx), sWX = Math.sin(tess1Angles.wx);
        const cWY = Math.cos(tess1Angles.wy), sWY = Math.sin(tess1Angles.wy);
        const cWZ = Math.cos(tess1Angles.wz), sWZ = Math.sin(tess1Angles.wz);
        const cXY = Math.cos(tess1Angles.xy), sXY = Math.sin(tess1Angles.xy);
        const W_DIST = 3;
        const tessScale = TESS1_SCALE * bTess.scale * introTessBirth * postIntroTessPulse;
        for (let i = 0; i < 16; i++) {
          let x = tessVerts4[i][0], y = tessVerts4[i][1], z = tessVerts4[i][2], w = tessVerts4[i][3];
          let nx = x * cXY - y * sXY; let ny = x * sXY + y * cXY; x = nx; y = ny;
          nx = x * cWX - w * sWX; let nw = x * sWX + w * cWX; x = nx; w = nw;
          ny = y * cWY - w * sWY; nw = y * sWY + w * cWY; y = ny; w = nw;
          let nz = z * cWZ - w * sWZ; nw = z * sWZ + w * cWZ; z = nz; w = nw;
          const k = 1 / (W_DIST - w);
          tess1.verts3[i*3]   = x * k * tessScale;
          tess1.verts3[i*3+1] = y * k * tessScale;
          tess1.verts3[i*3+2] = z * k * tessScale;
        }
        for (let e = 0; e < tessEdges.length; e++) {
          const [a, b] = tessEdges[e]; const o = e * 6;
          tess1.positions[o]   = tess1.verts3[a*3];
          tess1.positions[o+1] = tess1.verts3[a*3+1];
          tess1.positions[o+2] = tess1.verts3[a*3+2];
          tess1.positions[o+3] = tess1.verts3[b*3];
          tess1.positions[o+4] = tess1.verts3[b*3+1];
          tess1.positions[o+5] = tess1.verts3[b*3+2];
        }
        tess1.attr.needsUpdate = true;
        tess1.mat.opacity = (0.243 + bTess.idleAdd) * stateMul.opa * bTess.opa * fade;
      }

      // ---- Secondary tesseract (YZ/ZW counter-rotating) ----
      {
        const tessSpd2 = stateMul.tess * bTess.tessSpd;
        tess2Angles.yz += tess2Speed.yz * tessSpd2;
        tess2Angles.zw += tess2Speed.zw * tessSpd2;
        tess2Angles.wz += tess2Speed.wz * tessSpd2;
        tess2Angles.xz += tess2Speed.xz * tessSpd2;
        const cYZ = Math.cos(tess2Angles.yz), sYZ = Math.sin(tess2Angles.yz);
        const cZW = Math.cos(tess2Angles.zw), sZW = Math.sin(tess2Angles.zw);
        const cWZ = Math.cos(tess2Angles.wz), sWZ = Math.sin(tess2Angles.wz);
        const cXZ = Math.cos(tess2Angles.xz), sXZ = Math.sin(tess2Angles.xz);
        const W_DIST = 3;
        const tessScale = TESS2_SCALE * bTess.scale * postIntroTessPulse;
        for (let i = 0; i < 16; i++) {
          let x = tessVerts4[i][0], y = tessVerts4[i][1], z = tessVerts4[i][2], w = tessVerts4[i][3];
          // XZ mild
          let nx = x * cXZ - z * sXZ; let nz = x * sXZ + z * cXZ; x = nx; z = nz;
          // YZ
          let ny = y * cYZ - z * sYZ; nz = y * sYZ + z * cYZ; y = ny; z = nz;
          // ZW
          nz = z * cZW - w * sZW; let nw = z * sZW + w * cZW; z = nz; w = nw;
          // WZ (extra)
          nz = z * cWZ - w * sWZ; nw = z * sWZ + w * cWZ; z = nz; w = nw;
          const k = 1 / (W_DIST - w);
          tess2.verts3[i*3]   = x * k * tessScale;
          tess2.verts3[i*3+1] = y * k * tessScale;
          tess2.verts3[i*3+2] = z * k * tessScale;
        }
        for (let e = 0; e < tessEdges.length; e++) {
          const [a, b] = tessEdges[e]; const o = e * 6;
          tess2.positions[o]   = tess2.verts3[a*3];
          tess2.positions[o+1] = tess2.verts3[a*3+1];
          tess2.positions[o+2] = tess2.verts3[a*3+2];
          tess2.positions[o+3] = tess2.verts3[b*3];
          tess2.positions[o+4] = tess2.verts3[b*3+1];
          tess2.positions[o+5] = tess2.verts3[b*3+2];
        }
        tess2.attr.needsUpdate = true;
        tess2.mat.opacity = (0.162 + bTess.idleAdd) * stateMul.opa * bTess.opa * fade;
      }

      // ---- Extra tesseracts (3 additional) ----
      // Hidden during intro (0-3s); opacity ramps with complexity (3-4s).
      for (const et of extraTess) {
        if (complexity <= 0) {
          if (et.mesh.visible) et.mesh.visible = false;
          continue;
        }
        if (!et.mesh.visible) et.mesh.visible = true;
        // Desktop: update geometry every other frame (mesh stays visible, prior positions persist).
        if (isDesktop && (frameCount & 1)) continue;
        const sp = stateMul.tess * bTess.tessSpd;
        et.angles.a += et.speeds.a * sp;
        et.angles.b += et.speeds.b * sp;
        const cA = Math.cos(et.angles.a), sA = Math.sin(et.angles.a);
        const cB = Math.cos(et.angles.b), sB = Math.sin(et.angles.b);
        const [i1, j1, i2, j2] = et.axes;
        const W_DIST = 3;
        const tessScale = et.scale * bTess.scale * postIntroTessPulse;
        for (let i = 0; i < 16; i++) {
          const v = [tessVerts4[i][0], tessVerts4[i][1], tessVerts4[i][2], tessVerts4[i][3]];
          // rotation 1 in plane (i1, j1)
          let a = v[i1], b = v[j1];
          v[i1] = a * cA - b * sA; v[j1] = a * sA + b * cA;
          // rotation 2 in plane (i2, j2)
          a = v[i2]; b = v[j2];
          v[i2] = a * cB - b * sB; v[j2] = a * sB + b * cB;
          const k = 1 / (W_DIST - v[3]);
          et.verts3[i*3]   = v[0] * k * tessScale;
          et.verts3[i*3+1] = v[1] * k * tessScale;
          et.verts3[i*3+2] = v[2] * k * tessScale;
        }
        for (let e = 0; e < tessEdges.length; e++) {
          const [a, b] = tessEdges[e]; const o = e * 6;
          et.positions[o]   = et.verts3[a*3];
          et.positions[o+1] = et.verts3[a*3+1];
          et.positions[o+2] = et.verts3[a*3+2];
          et.positions[o+3] = et.verts3[b*3];
          et.positions[o+4] = et.verts3[b*3+1];
          et.positions[o+5] = et.verts3[b*3+2];
        }
        et.attr.needsUpdate = true;
        et.mat.opacity = (0.14 + bTess.idleAdd) * stateMul.opa * bTess.opa * fade * complexity;
      }

      // Center glow
      const glowR = bTess.glowRadius;
      if (glowR > 0.1) {
        const ws = (glowR / 300) * 8;
        glow.scale.set(ws, ws, 1);
        glowMat.opacity = 0.15 * (glowR / 300) * fade;
      } else {
        glowMat.opacity = 0;
        glow.scale.set(0.01, 0.01, 1);
      }

      // ---- Hypersphere shells ----
      if (now >= nextShellAt && shells.length < SHELL_MAX) {
        spawnShell(now);
        nextShellAt = now + 1500;
      }
      for (let i = shells.length - 1; i >= 0; i--) {
        const sh = shells[i];
        const age = (now - sh.birth) / sh.lifetime;
        if (age >= 1) {
          scene.remove(sh.mesh);
          sh.mesh.geometry.dispose();
          sh.mat.dispose();
          shells.splice(i, 1);
          continue;
        }
        const r = SHELL_MAX_R * age;
        sh.mesh.scale.setScalar(r);
        // Opacity: rises fast then fades
        const op = Math.sin(age * Math.PI) * 0.08;
        sh.mat.opacity = op * stateMul.opa * bSph.opa * fade;
        sh.mesh.rotation.y = now * 0.0001;
      }

      // ---- Klein bottle ----
      // Desktop intro (0-3s): klein opacity is gated by `fade` (still ramps)
      // but `updateKlein` rewrites the whole buffer each frame. Skip the
      // CPU rebuild while invisible — leave the mesh hidden via opacity 0.
      if (klein) {
        if (isDesktop && _introMs < 3000) {
          klein.mat.opacity = 0;
          if (klein.mesh.visible) klein.mesh.visible = false;
        } else {
          if (!klein.mesh.visible) klein.mesh.visible = true;
          updateKlein(now, klein.invertPhase);
          klein.mesh.rotation.y = now * 0.0002;
          klein.mat.opacity = (0.0945 + bTess.idleAdd) * stateMul.opa * bSph.opa * fade;
        }
      }

      // ---- Sierpinski fractals ----
      if (fractals.length) {
        if (isDesktop && _introMs < 3000) {
          for (const f of fractals) {
            f.mat.opacity = 0;
            if (f.group.visible) f.group.visible = false;
          }
        } else {
          for (const f of fractals) if (!f.group.visible) f.group.visible = true;
          fractalMorphPhase += 0.0006 * stateMul.spd;
          for (let fi = 0; fi < fractals.length; fi++) {
            const f = fractals[fi];
            f.group.rotation.x += 0.0009 * stateMul.spd;
            f.group.rotation.y += 0.0013 * stateMul.spd;
            f.group.rotation.z += 0.0005 * stateMul.spd;
            f.mat.opacity = (0.081 + bTess.idleAdd) * stateMul.opa * bSph.opa * fade;
          }
          // Periodically rebuild the morphing fractal at next level
          const morphCycle = (Math.sin(fractalMorphPhase) + 1) / 2; // 0..1
          const morphLvl = Math.round(3 + morphCycle); // 3 or 4
          const target = fractals[2];
          if (target && morphLvl !== target.level) {
            target.level = morphLvl;
            const oldMesh = target.group.children[0] as THREE.LineSegments;
            oldMesh.geometry.dispose();
            oldMesh.geometry = buildSierpinski(morphLvl, 2);
          }
        }
      }

      // ---- Nested spheres ----
      // During intro, only render first 3 (innermost); ramp outer 2 with complexity.
      for (let si = 0; si < spheres.length; si++) {
        const s = spheres[si];
        const isOuter = si < 2; // defs[0], defs[1] are largest
        if (isOuter && complexity <= 0) {
          if (s.mesh.visible) s.mesh.visible = false;
          continue;
        }
        if (!s.mesh.visible) s.mesh.visible = true;
        // Desktop: outer spheres update every other frame.
        if (isOuter && isDesktop && (frameCount & 1)) continue;
        s.mesh.rotation.x += s.def.rx * stateMul.spd;
        s.mesh.rotation.y += s.def.ry * stateMul.spd;
        s.mesh.rotation.z += s.def.rz * stateMul.spd;
        const phase = ((now + s.def.breathOffset) * (Math.PI * 2) / 6000);
        const breath = 1 + Math.sin(phase) * 0.25;
        const breathOp = 1 + Math.sin(phase) * 0.5;
        s.mesh.scale.setScalar(breath * bSph.scale);
        const cMul = isOuter ? complexity : 1;
        s.mat.opacity = (s.def.op + bSph.idleAdd) * stateMul.opa * bSph.opa * cMul * breathOp;

      }

      // ---- Rings ----
      // During intro, only first 4 rings render; remaining 4 ramp with complexity.
      for (let ri = 0; ri < rings.length; ri++) {
        const r = rings[ri];
        const gated = ri >= 4;
        if (gated && complexity <= 0) {
          if (r.mesh.visible) r.mesh.visible = false;
          continue;
        }
        if (!r.mesh.visible) r.mesh.visible = true;
        // Desktop: second ring set (ri>=4) updates every other frame.
        if (gated && isDesktop && (frameCount & 1)) continue;
        r.mesh.rotation.x += r.spin.x * stateMul.spd;
        r.mesh.rotation.y += r.spin.y * stateMul.spd;
        r.mesh.rotation.z += r.spin.z * stateMul.spd;
        const warp = 1 + Math.sin(now * r.warpSpeed + r.warpPhase) * r.warpAmp;
        const gs = warp * bRings.scale;
        r.mesh.scale.set(gs, gs, gs);
        if (now > r.nextFlash && r.flashUntil < now) {
          r.flashUntil = now + 300;
          r.nextFlash = now + rand(8000, 14000);
        }
        const cMul = gated ? complexity : 1;
        const ringBreathOp = 1 + Math.sin((now + ri * 600) * (Math.PI * 2) / 6000) * 0.5;
        if (now < r.flashUntil) {
          r.mat.color.setHex(COL_WHITE);
          r.mat.opacity = 0.25 * stateMul.opa * bRings.opa * cMul;
        } else {
          r.mat.color.setHex(COL_PRIMARY);
          r.mat.opacity = (0.135 + bRings.idleAdd) * stateMul.opa * bRings.opa * cMul * ringBreathOp;
        }

      }

      // ---- Particles ----
      // Effective count: 50% during intro (0-3s), ramps to 100% over the next 1s.
      const pEffective = Math.max(1, Math.floor(PARTICLE_COUNT * (0.5 + 0.5 * complexity)));
      const particleDriftMul = stateMul.spd * bPart.particleBoost;
      for (let i = 0; i < pEffective; i++) {
        const L = lissajous[i];
        positions[i*3]   = L.cx + Math.sin(now * L.fx * particleDriftMul + L.px) * L.ax;
        positions[i*3+1] = L.cy + Math.sin(now * L.fy * particleDriftMul + L.py) * L.ay;
        positions[i*3+2] = L.cz + Math.sin(now * L.fz * particleDriftMul + L.pz) * L.az;
      }
      pGeo.getAttribute("position").needsUpdate = true;
      pGeo.setDrawRange(0, pEffective);
      particleGroup.rotation.y += 0.000105 * 16.7 * (stateMul.spd / Math.max(stateMul.spd, 0.001));
      // Desktop: rebuild O(n²) particle link geometry every 3rd frame only.
      // Mobile: rebuild every frame. Previous link positions persist between
      // rebuilds, so visually the network keeps drawing without flicker.
      // Desktop: refresh O(n²) particle links every 3rd frame. Mobile: every
      // frame. Either way we mutate the SAME Float32Array / BufferAttribute /
      // BufferGeometry created at setup — no allocation, no setAttribute,
      // no geometry rebuild. We only push the touched byte range to the GPU
      // via addUpdateRange, and only adjust setDrawRange when the link count
      // actually changes.
      if (!isDesktop || frameCount % 3 === 0) {
        const LINK_DIST_SQ = (isMobile ? 3.2 * 1.8 : 3.6 * 1.8) ** 2;
        // Desktop intro window: clamp link budget to mobile value for perf.
        const effMaxLinks = (isDesktop && _introMs < 3000) ? Math.min(MAX_LINKS, 1200) : MAX_LINKS;
        let linkCount = 0;
        for (let i = 0; i < pEffective && linkCount < effMaxLinks; i++) {
          const ix = positions[i*3], iy = positions[i*3+1], iz = positions[i*3+2];
          for (let j = i + 1; j < pEffective && linkCount < effMaxLinks; j++) {
            const dx = positions[j*3] - ix;
            const dy = positions[j*3+1] - iy;
            const dz = positions[j*3+2] - iz;
            if (dx*dx + dy*dy + dz*dz < LINK_DIST_SQ) {
              const o = linkCount * 6;
              linePositions[o]   = ix; linePositions[o+1] = iy; linePositions[o+2] = iz;
              linePositions[o+3] = positions[j*3]; linePositions[o+4] = positions[j*3+1]; linePositions[o+5] = positions[j*3+2];
              linkCount++;
            }
          }
        }
        // Only mark the range we actually wrote (touched + previously drawn,
        // so the GPU clears any leftover trailing segments).
        const touched = Math.max(linkCount, prevLinkCount) * 6;
        if (touched > 0) {
          lineAttr.clearUpdateRanges();
          lineAttr.addUpdateRange(0, touched);
          lineAttr.needsUpdate = true;
        }
        if (linkCount !== prevLinkCount) {
          lineGeo.setDrawRange(0, linkCount * 2);
          prevLinkCount = linkCount;
        }
      }
      lineMat.opacity = (0.054 + bPart.idleAdd) * stateMul.opa * bPart.opa * bPart.particleBoost;
      pMat.opacity    = (0.081 + bPart.idleAdd) * stateMul.opa * bPart.opa * bPart.particleBoost;
      void fullComplexity;

      // ---- Membranes ----
      // Desktop intro (0-3s): membranes are invisible (opacity ramps with
      // stateMul.opa which starts low). Skip the per-vertex ripple math and
      // BufferAttribute upload entirely while they can't be seen.
      if (!(isDesktop && _introMs < 3000)) {
        for (const mb of membranes) {
          if (!mb.mesh.visible) mb.mesh.visible = true;
          const pos = mb.geo.getAttribute("position") as THREE.BufferAttribute;
          const arr = pos.array as Float32Array;
          const orig = mb.orig;
          const ripple = stateMul.spd * bPart.particleBoost;
          for (let i = 0; i < arr.length; i += 3) {
            const ox = orig[i], oy = orig[i+1];
            const w1 = Math.sin(ox * 0.55 + now * 0.0011 * ripple) * 0.45;
            const w2 = Math.sin(oy * 0.5  + now * 0.0009 * ripple + 1.3) * 0.35;
            const w3 = Math.sin((ox + oy) * 0.3 + now * 0.0006 * ripple) * 0.25;
            arr[i] = ox; arr[i+1] = oy; arr[i+2] = w1 + w2 + w3;
          }
          pos.needsUpdate = true;
          mb.mesh.rotation.y += 0.0003 * stateMul.spd;
          mb.mesh.rotation.z += 0.0002 * stateMul.spd;
          mb.mat.opacity = (0.04 + bPart.idleAdd) * stateMul.opa * bPart.opa;
        }
      } else {
        for (const mb of membranes) {
          mb.mat.opacity = 0;
          if (mb.mesh.visible) mb.mesh.visible = false;
        }
      }

      // ---- Consciousness pulse network ----
      // Desktop intro (0-3s): neuro opacity is `* complexity` (= 0), so the
      // network is fully invisible. Skip fires, brightness decay, and the
      // color BufferAttribute upload entirely.
      if (isDesktop && _introMs < 3000) {
        neuroMat.opacity = 0;
        neuroEdgeMat.opacity = 0;
      } else {
        // Spontaneous fire
        if (now > nextSpontaneous) {
          const idx = Math.floor(Math.random() * NEURO_COUNT);
          fireNode(idx, now);
          nextSpontaneous = now + (scrolling ? rand(300, 700) : 1500);
        }
        // Process scheduled fires
        for (let i = 0; i < NEURO_COUNT; i++) {
          const n = neuro[i];
          if (n.fireAt > 0 && now >= n.fireAt) {
            fireNode(i, now);
            n.fireAt = -1;
          }
          // Decay brightness
          n.brightness *= 0.93;
          neuroColArr[i*3] = neuroColArr[i*3+1] = neuroColArr[i*3+2] = 0.7 + n.brightness * 0.3;
        }
        neuroColAttr.needsUpdate = true;
        // Dim/hide the consciousness pulse network during the intro (0-3s),
        // ramp up over the next 1s.
        neuroMat.opacity = 0.2025 * stateMul.opa * bPart.opa * fade * complexity;
        neuroEdgeMat.opacity = 0.054 * stateMul.opa * bPart.opa * fade * complexity;
      }

      // ---- 4D cross-section morph polygon ----
      // Sides float between 3 and 7 via sine
      const sidesF = 5 + Math.sin(now * 0.0006) * 2; // 3..7
      const sides = Math.max(3, Math.min(xsecMaxSides, Math.round(sidesF)));
      const sideBlend = sidesF - Math.floor(sidesF);
      // Build a slowly rotating polygon with vertex jitter blending between N and N+1
      const baseRot = now * 0.0004;
      const pts: { x: number; y: number; z: number }[] = [];
      for (let i = 0; i < sides; i++) {
        const t = i / sides;
        const a = baseRot + t * Math.PI * 2;
        // morph displacement
        const r = XSEC_RADIUS * (1 + 0.08 * Math.sin(now * 0.001 + i));
        const wiggle = 0.15 * Math.sin(now * 0.002 + i * 1.7) * sideBlend;
        pts.push({
          x: Math.cos(a) * (r + wiggle),
          y: Math.sin(a) * (r + wiggle),
          z: Math.sin(now * 0.0005 + i) * 0.2,
        });
      }
      // segments: edge i → i+1
      for (let i = 0; i < xsecMaxSides; i++) {
        const a = pts[i % pts.length];
        const b = pts[(i + 1) % pts.length];
        const o = i * 6;
        xsecPos[o]   = a.x; xsecPos[o+1] = a.y; xsecPos[o+2] = a.z;
        xsecPos[o+3] = b.x; xsecPos[o+4] = b.y; xsecPos[o+5] = b.z;
      }
      xsecAttr.needsUpdate = true;
      xsecMat.opacity = 0.162 * stateMul.opa * bTess.opa * fade;

      // Ambient point light
      const lightBreath = (Math.sin(now * (Math.PI * 2) / 6000) + 1) / 2;
      pointLight.intensity = 0.3 + lightBreath * 0.5;

      // ---- Camera Lissajous 3:2 + Z-roll + cursor parallax ----
      // 35s full cycle.
      const T = (now / 35000) * Math.PI * 2;
      // 3:2 ratio
      const lx = Math.sin(3 * T) * 1.0;
      const ly = Math.sin(2 * T) * 0.55;
      // cursor parallax ±35px ≈ ±1.75 world unit at z=18
      camTargetPos.set(lx + mx * 1.75, ly + -my * 1.4, 18);
      camera.position.x += (camTargetPos.x - camera.position.x) * 0.012;
      camera.position.y += (camTargetPos.y - camera.position.y) * 0.012;
      // Z-roll ±3° over 25s
      const rollDeg = Math.sin(now * (Math.PI * 2) / 25000) * 3 + introCamRoll;
      camera.up.set(Math.sin(rollDeg * Math.PI / 180), Math.cos(rollDeg * Math.PI / 180), 0);
      camera.lookAt(camLookAt);

      // ---- Color adaptation (post-intro): lerp wireframe colors toward white
      // for elements near viewport center; stay #AADDFF toward edges. ----
      const introDone = (now - startTime) > 6500;
      if (introDone) {
        const cxv = window.innerWidth / 2, cyv = window.innerHeight / 2;
        const maxD = Math.hypot(cxv, cyv);
        const wp = _adaptVec;
        scene.traverse((obj) => {
          if (!(obj instanceof THREE.LineSegments)) return;
          const mat = obj.material as THREE.LineBasicMaterial;
          if (!mat || !mat.color) return;
          obj.getWorldPosition(wp);
          const s = project(wp.x, wp.y, wp.z);
          const dx = s.x - cxv, dy = s.y - cyv;
          const t = 1 - Math.min(1, Math.hypot(dx, dy) / maxD);
          _adaptColTarget.copy(COL_BLUE_C).lerp(COL_WHITE_C, t);
          mat.color.lerp(_adaptColTarget, 0.05);
        });
      }

      // ---- Render 3D ----
      renderer.render(scene, camera);


      // ============================================================
      // 2D OVERLAY: quantum field + rifts + shockwave + tess overlap flashes
      // ============================================================
      // During the 0-3s intro window, the overlay is almost always empty
      // (no idle rifts yet, intro layers don't start until 5.2s). Skip the
      // full-screen clearRect + projection work unless there's actual
      // dynamic content to render. Only clear once when entering the
      // quiet window so the canvas stays blank.
      const _overlayActive =
        _introMs >= 3000 ||
        rifts.length > 0 ||
        shocks.length > 0 ||
        introShocks.length > 0 ||
        scrolling;
      if (!_overlayActive) {
        if (!fx2dCleared) {
          ctx.clearRect(0, 0, fx2d.width, fx2d.height);
          fx2dCleared = true;
        }
      } else {
      fx2dCleared = false;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Quantum field
      // Desktop: draw quantum grid every other frame to halve 2D path cost.
      // Desktop intro (0-3s): skip entirely — the grid is faint and the
      // O(N²) sin/cos sweep is pure waste while the scene is fading in.
      if (
        ENABLE_QFIELD &&
        !(isDesktop && _introMs < 3000) &&
        (!isDesktop || (frameCount & 1) === 0)
      ) {
        const w = window.innerWidth, h = window.innerHeight;
        const stepX = w / Q_GRID;
        const stepY = h / Q_GRID;
        const tQ = now * 0.0004;
        const amp = 12 * qFieldAmpMul;
        ctx.strokeStyle = "rgba(170,221,255,0.03)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let gy = 0; gy < Q_GRID; gy++) {
          for (let gx = 0; gx < Q_GRID; gx++) {
            const px = gx * stepX, py = gy * stepY;
            const dx = Math.sin(px * 0.012 + tQ) * amp + Math.cos(py * 0.009 + tQ * 0.7) * amp * 0.5;
            const dy = Math.cos(px * 0.011 + tQ * 0.8) * amp + Math.sin(py * 0.013 + tQ) * amp * 0.5;
            ctx.moveTo(px, py);
            ctx.lineTo(px + dx, py + dy);
          }
        }
        ctx.stroke();
      }

      // Scroll-driven extra rift bursts (every 1s while scrolling)
      if (scrolling && now > nextScrollRift) {
        fireRiftBurst(now, 3);
        nextScrollRift = now + 1000;
      }
      // Idle rift bursts every 3-5s
      if (now > nextRiftBurst) {
        fireRiftBurst(now, 12);
        nextRiftBurst = now + 4000;
      }

      // Render rifts: each grows from center outward
      const cx2 = window.innerWidth / 2, cy2 = window.innerHeight / 2;
      const maxLen = Math.hypot(window.innerWidth, window.innerHeight) * 0.6;
      for (let i = rifts.length - 1; i >= 0; i--) {
        const r = rifts[i];
        const age = (now - r.born) / r.life;
        if (age >= 1) { rifts.splice(i, 1); continue; }
        const len = maxLen * age;
        const fadeR = age < 0.7 ? 1 : 1 - (age - 0.7) / 0.3;
        const ex = cx2 + Math.cos(r.angle) * len;
        const ey = cy2 + Math.sin(r.angle) * len;
        // glow
        ctx.strokeStyle = `rgba(170,221,255,${0.15 * fadeR})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx2, cy2);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        // core — post-intro: gradient from #FFFFFF at center → #AADDFF at edge
        if (introDone) {
          const grad = ctx.createLinearGradient(cx2, cy2, ex, ey);
          grad.addColorStop(0, `rgba(255,255,255,${0.15 * fadeR})`);
          grad.addColorStop(1, `rgba(170,221,255,${0.15 * fadeR})`);
          ctx.strokeStyle = grad;
        } else {
          ctx.strokeStyle = `rgba(255,255,255,${0.15 * fadeR})`;
        }
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx2, cy2);
        ctx.lineTo(ex, ey);
        ctx.stroke();

      }

      // Shockwave rings
      for (let i = shocks.length - 1; i >= 0; i--) {
        const s = shocks[i];
        const age = (now - s.born) / s.life;
        if (age >= 1) { shocks.splice(i, 1); continue; }
        const radius = 400 * age;
        const op = 0.15 * (1 - age);
        ctx.strokeStyle = `rgba(200,238,255,${op})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx2, cy2, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Tesseract overlap interference flashes — sample a few projected
      // vertex pairs and flash where they're close in screen space.
      // Cheap proxy: project first 6 vertices of each tesseract and look for
      // any cross-pair within ~14px.
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      const screenA: { x: number; y: number }[] = [];
      const screenB: { x: number; y: number }[] = [];
      for (let i = 0; i < 16; i++) {
        screenA.push(project(tess1.verts3[i*3], tess1.verts3[i*3+1], tess1.verts3[i*3+2]));
        screenB.push(project(
          tess2.verts3[i*3] + tess2.mesh.position.x,
          tess2.verts3[i*3+1] + tess2.mesh.position.y,
          tess2.verts3[i*3+2] + tess2.mesh.position.z,
        ));
      }
      for (let i = 0; i < 16; i++) {
        for (let j = 0; j < 16; j++) {
          const dx = screenA[i].x - screenB[j].x;
          const dy = screenA[i].y - screenB[j].y;
          if (dx * dx + dy * dy < 14 * 14) {
            ctx.beginPath();
            ctx.arc(screenB[j].x, screenB[j].y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // ============================================================
      // INTRO 2D LAYERS (5.0s–6.5s)
      // ============================================================
      const _cxI = window.innerWidth / 2;
      const _cyI = window.innerHeight / 2;
      const _diag = Math.hypot(window.innerWidth, window.innerHeight);

      // Layer 2: dimensional shockwave rings (intro-specific, large)
      for (let i = introShocks.length - 1; i >= 0; i--) {
        const sh = introShocks[i];
        if (now < sh.born) continue;
        const age = (now - sh.born) / sh.life;
        if (age >= 1) { introShocks.splice(i, 1); continue; }
        const radius = sh.maxR * age;
        const op = 0.4 * (1 - age);
        ctx.strokeStyle = `rgba(170,221,255,${op})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(_cxI, _cyI, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Layer 1: iris opening ring (5.2s–6.5s, 1.3s)
      if (introT >= 5200 && introT <= 6500) {
        const k = (introT - 5200) / 1300;
        // cubic-bezier(0.2,0,0.4,1) ~ ease-out — approximate with a smoothstep-ish
        const ek = 1 - Math.pow(1 - k, 2.2);
        const maxR = _diag * 1.5 / 2; // 150% of diagonal (radius)
        const r = ek * maxR;
        // glow ring fades as it reaches edges
        const fade = 1 - k * 0.7;
        ctx.strokeStyle = `rgba(170,221,255,${0.8 * fade})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(_cxI, _cyI, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Layer 5: fractal bloom (5.5s–6.0s, 0.5s)
      if (introT >= 5500 && introT <= 6000 && introBranches.length) {
        const k = (introT - 5500) / 500;
        // grow then fade
        const growK = Math.min(1, k * 1.5);
        const op = 0.3 * (1 - k);
        ctx.strokeStyle = `rgba(255,255,255,${op})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (const b of introBranches) {
          const ex = b.x1 + (b.x2 - b.x1) * growK;
          const ey = b.y1 + (b.y2 - b.y1) * growK;
          ctx.moveTo(b.x1, b.y1);
          ctx.lineTo(ex, ey);
        }
        ctx.stroke();
      } else if (introT > 6000 && introBranches.length) {
        introBranches = [];
      }

      // Layer 4: chromatic pulse (5.3s–5.45s, 0.15s)
      if (introT >= 5300 && introT <= 5450) {
        const k = (introT - 5300) / 150;
        const op = 0.6 * (1 - Math.abs(k - 0.5) * 2); // triangle peak
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, op)})`;
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      }

      // Post-intro radial glow pulse (6.5s–7.8s)
      if (postIntroGlow > 0.001) {
        const cx3 = window.innerWidth / 2, cy3 = window.innerHeight / 2;
        const maxR = window.innerWidth * 0.8;
        const r = maxR * Math.min(1, postIntroGlow);
        const grad = ctx.createRadialGradient(cx3, cy3, 0, cx3, cy3, Math.max(1, r));
        const op = 0.35 * postIntroGlow;
        grad.addColorStop(0, `rgba(200,238,255,${op})`);
        grad.addColorStop(1, `rgba(200,238,255,0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      }
      } // end _overlayActive



      // Restore stateMul (multipliers applied this frame only)
      stateMul.spd = _savedSpd;
      stateMul.tess = _savedTess;
      stateMul.opa = _savedOpa;
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      if (scrollTimer) clearTimeout(scrollTimer);
      if (_introResRestore) clearTimeout(_introResRestore);
      document.documentElement.style.removeProperty('--bg');

      // Dispose all geometries, materials, and textures to prevent memory leaks.
      scene.traverse((obj) => {
        const anyObj = obj as unknown as {
          geometry?: { dispose?: () => void };
          material?: unknown;
        };
        if (anyObj.geometry && typeof anyObj.geometry.dispose === "function") {
          anyObj.geometry.dispose();
        }
        const mat = anyObj.material;
        if (Array.isArray(mat)) {
          for (const m of mat) {
            const mm = m as { map?: { dispose?: () => void }; dispose?: () => void };
            if (mm?.map && typeof mm.map.dispose === "function") mm.map.dispose();
            if (typeof mm?.dispose === "function") mm.dispose();
          }
        } else if (mat) {
          const mm = mat as { map?: { dispose?: () => void }; dispose?: () => void };
          if (mm.map && typeof mm.map.dispose === "function") mm.map.dispose();
          if (typeof mm.dispose === "function") mm.dispose();
        }
      });
      renderer.dispose();
      renderer.forceContextLoss?.();
      try { mount.removeChild(renderer.domElement); } catch {}
      try { mount.removeChild(fx2d); } catch {}
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden
    />
  );
}
