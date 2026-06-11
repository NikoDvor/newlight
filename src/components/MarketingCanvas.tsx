import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function MarketingCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 160;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const COL_A = 0xaaddff;
    const COL_B = 0xc8eeff;
    const COL_W = 0xffffff;

    // --- Tesseract (4D hypercube) ---
    // 16 vertices in 4D: all combinations of (+/-1, +/-1, +/-1, +/-1)
    const tess4D: number[][] = [];
    for (let i = 0; i < 16; i++) {
      tess4D.push([
        (i & 1) ? 1 : -1,
        (i & 2) ? 1 : -1,
        (i & 4) ? 1 : -1,
        (i & 8) ? 1 : -1,
      ]);
    }
    // edges: pairs differing in exactly one coordinate
    const tessEdges: [number, number][] = [];
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        let diff = 0;
        for (let k = 0; k < 4; k++) if (tess4D[i][k] !== tess4D[j][k]) diff++;
        if (diff === 1) tessEdges.push([i, j]);
      }
    }

    const makeTesseract = (size: number, color: number, opacity: number) => {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(tessEdges.length * 6);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const lines = new THREE.LineSegments(geo, mat);
      return { lines, geo, positions, size };
    };

    const tessA = makeTesseract(38, COL_A, 0.85);
    const tessB = makeTesseract(50, COL_B, 0.5);
    scene.add(tessA.lines, tessB.lines);

    const project4Dto3D = (v: number[], wx: number, wy: number, size: number): [number, number, number] => {
      // rotate in WX plane
      const cosWX = Math.cos(wx), sinWX = Math.sin(wx);
      let x = v[0] * cosWX - v[3] * sinWX;
      let w = v[0] * sinWX + v[3] * cosWX;
      // rotate in WY plane
      const cosWY = Math.cos(wy), sinWY = Math.sin(wy);
      let y = v[1] * cosWY - w * sinWY;
      w = v[1] * sinWY + w * cosWY;
      const z = v[2];
      // perspective from 4D to 3D
      const dist = 2.5;
      const wScale = 1 / (dist - w);
      return [x * size * wScale, y * size * wScale, z * size * wScale];
    };

    const updateTesseract = (t: typeof tessA, wx: number, wy: number, rotY: number, rotX: number) => {
      const projected: [number, number, number][] = tess4D.map(v => project4Dto3D(v, wx, wy, t.size));
      // apply 3D rotation
      const cy = Math.cos(rotY), sy = Math.sin(rotY);
      const cx = Math.cos(rotX), sx = Math.sin(rotX);
      const rotated = projected.map(([x, y, z]) => {
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        const y1 = y * cx - z1 * sx;
        const z2 = y * sx + z1 * cx;
        return [x1, y1, z2];
      });
      for (let i = 0; i < tessEdges.length; i++) {
        const [a, b] = tessEdges[i];
        const pa = rotated[a], pb = rotated[b];
        t.positions[i * 6] = pa[0]; t.positions[i * 6 + 1] = pa[1]; t.positions[i * 6 + 2] = pa[2];
        t.positions[i * 6 + 3] = pb[0]; t.positions[i * 6 + 4] = pb[1]; t.positions[i * 6 + 5] = pb[2];
      }
      t.geo.attributes.position.needsUpdate = true;
    };

    // --- Nested icospheres ---
    const icoMeshes: THREE.LineSegments[] = [];
    [70, 52, 36].forEach((r, i) => {
      const g = new THREE.IcosahedronGeometry(r, 1);
      const edges = new THREE.EdgesGeometry(g);
      const m = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
        color: i === 0 ? COL_A : i === 1 ? COL_B : COL_W,
        transparent: true, opacity: 0.18 + i * 0.06,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      scene.add(m);
      icoMeshes.push(m);
    });

    // --- Orbital torus rings ---
    const rings: THREE.Mesh[] = [];
    const tilts: [number, number, number][] = [
      [Math.PI / 2, 0, 0],
      [Math.PI / 3, Math.PI / 4, 0],
      [Math.PI / 6, -Math.PI / 3, Math.PI / 6],
      [0, Math.PI / 2, Math.PI / 4],
    ];
    [90, 105, 120, 138].forEach((r, i) => {
      const g = new THREE.TorusGeometry(r, 0.35, 8, 96);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? COL_A : COL_B,
        transparent: true, opacity: 0.35,
        blending: THREE.AdditiveBlending, depthWrite: false,
        wireframe: true,
      }));
      m.rotation.set(...tilts[i]);
      scene.add(m);
      rings.push(m);
    });

    // --- 120 particle constellation ---
    const N = 120;
    const pPos = new Float32Array(N * 3);
    const pVel = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 240;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 160;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
      pVel[i * 3] = (Math.random() - 0.5) * 0.08;
      pVel[i * 3 + 1] = (Math.random() - 0.5) * 0.08;
      pVel[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: COL_W, size: 1.6, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    scene.add(particles);

    const glowParticles = new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: COL_A, size: 5, transparent: true, opacity: 0.25,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    scene.add(glowParticles);

    // connection lines
    const maxPairs = (N * (N - 1)) / 2;
    const lnBuf = new Float32Array(maxPairs * 6);
    const lnGeo = new THREE.BufferGeometry();
    const lnAttr = new THREE.BufferAttribute(lnBuf, 3);
    lnGeo.setAttribute('position', lnAttr);
    lnGeo.setDrawRange(0, 0);
    scene.add(new THREE.LineSegments(lnGeo, new THREE.LineBasicMaterial({
      color: COL_B, transparent: true, opacity: 0.16,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })));
    const CONN_SQ = 36 * 36;

    // --- Scroll reactivity ---
    let speedMultiplier = 1;
    let scrollBoostUntil = 0;
    const onScroll = () => {
      speedMultiplier = 3;
      scrollBoostUntil = performance.now() + 800;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    let animId: number;
    let t = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      if (now > scrollBoostUntil) {
        speedMultiplier += (1 - speedMultiplier) * 0.06;
      }
      const dt = 0.012 * speedMultiplier;
      t += dt;

      updateTesseract(tessA, t * 0.6, t * 0.45, t * 0.3, t * 0.2);
      updateTesseract(tessB, -t * 0.5, -t * 0.35, -t * 0.25, -t * 0.18);

      icoMeshes.forEach((m, i) => {
        m.rotation.x += dt * (0.05 + i * 0.02);
        m.rotation.y += dt * (0.07 - i * 0.015);
      });

      rings.forEach((r, i) => {
        r.rotation.z += dt * (0.04 + i * 0.01);
        r.rotation.x += dt * 0.015 * (i % 2 === 0 ? 1 : -1);
      });

      for (let i = 0; i < N; i++) {
        pPos[i * 3] += pVel[i * 3] * speedMultiplier;
        pPos[i * 3 + 1] += pVel[i * 3 + 1] * speedMultiplier;
        pPos[i * 3 + 2] += pVel[i * 3 + 2] * speedMultiplier;
        if (Math.abs(pPos[i * 3]) > 120) pVel[i * 3] *= -1;
        if (Math.abs(pPos[i * 3 + 1]) > 80) pVel[i * 3 + 1] *= -1;
        if (Math.abs(pPos[i * 3 + 2]) > 60) pVel[i * 3 + 2] *= -1;
      }
      pGeo.attributes.position.needsUpdate = true;

      let cnt = 0;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pPos[i * 3] - pPos[j * 3];
          const dy = pPos[i * 3 + 1] - pPos[j * 3 + 1];
          const dz = pPos[i * 3 + 2] - pPos[j * 3 + 2];
          if (dx * dx + dy * dy + dz * dz < CONN_SQ) {
            lnBuf[cnt * 6] = pPos[i * 3]; lnBuf[cnt * 6 + 1] = pPos[i * 3 + 1]; lnBuf[cnt * 6 + 2] = pPos[i * 3 + 2];
            lnBuf[cnt * 6 + 3] = pPos[j * 3]; lnBuf[cnt * 6 + 4] = pPos[j * 3 + 1]; lnBuf[cnt * 6 + 5] = pPos[j * 3 + 2];
            cnt++;
          }
        }
      }
      lnGeo.setDrawRange(0, cnt * 2);
      lnAttr.needsUpdate = true;

      scene.rotation.y = Math.sin(t * 0.1) * 0.05;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
      }}
    />
  );
}
