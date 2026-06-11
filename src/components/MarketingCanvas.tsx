import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const COL_A = 0xaaddff;
const COL_B = 0xc8eeff;
const COL_W = 0xffffff;

export default function MarketingCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 170;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // --- opacity state (driven by intro events) ---
    // baseOpacity: target resting opacity (intro: 0.40, post-intro: 0.12)
    // surgeBoost: temporary multiplier (>1 during surge), lerps back to 1
    // scaleBoost: temporary tesseract scale (>1 during surge), lerps back to 1
    let baseOpacity = 0.40;
    let currentOpacity = 0.40;
    let surgeBoost = 1;
    let scaleBoost = 1;

    const onSurge = () => {
      surgeBoost = 3;
      scaleBoost = 1.2;
      spawnRifts();
      fireAllPulses();
    };
    const onIntroComplete = () => {
      baseOpacity = 0.12;
      // gentle post-intro exhale
      surgeBoost = Math.max(surgeBoost, 1.4);
    };
    window.addEventListener('nl-intro-surge', onSurge);
    window.addEventListener('nl-intro-complete', onIntroComplete);

    // --- Tesseract (4D hypercube) ---
    const tess4D: number[][] = [];
    for (let i = 0; i < 16; i++) {
      tess4D.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1, (i & 8) ? 1 : -1]);
    }
    const tessEdges: [number, number][] = [];
    for (let i = 0; i < 16; i++) {
      for (let j = i + 1; j < 16; j++) {
        let diff = 0;
        for (let k = 0; k < 4; k++) if (tess4D[i][k] !== tess4D[j][k]) diff++;
        if (diff === 1) tessEdges.push([i, j]);
      }
    }

    const makeTesseract = (size: number, color: number) => {
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(tessEdges.length * 6);
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const lines = new THREE.LineSegments(geo, mat);
      return { lines, geo, mat, positions, size };
    };

    const tessA = makeTesseract(40, COL_A);
    const tessB = makeTesseract(54, COL_B);
    scene.add(tessA.lines, tessB.lines);

    const project4Dto3D = (v: number[], wx: number, wy: number, size: number, sBoost: number): [number, number, number] => {
      const cosWX = Math.cos(wx), sinWX = Math.sin(wx);
      const x = v[0] * cosWX - v[3] * sinWX;
      let w = v[0] * sinWX + v[3] * cosWX;
      const cosWY = Math.cos(wy), sinWY = Math.sin(wy);
      const y = v[1] * cosWY - w * sinWY;
      w = v[1] * sinWY + w * cosWY;
      const z = v[2];
      const dist = 2.5;
      const wScale = 1 / (dist - w);
      const s = size * sBoost;
      return [x * s * wScale, y * s * wScale, z * s * wScale];
    };

    const updateTesseract = (t: ReturnType<typeof makeTesseract>, wx: number, wy: number, rotY: number, rotX: number, sBoost: number) => {
      const projected = tess4D.map(v => project4Dto3D(v, wx, wy, t.size, sBoost));
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

    // --- 3 nested icospheres ---
    const icoMeshes: { mesh: THREE.LineSegments; mat: THREE.LineBasicMaterial; baseOp: number }[] = [];
    [78, 56, 36].forEach((r, i) => {
      const g = new THREE.IcosahedronGeometry(r, 1);
      const edges = new THREE.EdgesGeometry(g);
      const baseOp = 0.55 + i * 0.08;
      const mat = new THREE.LineBasicMaterial({
        color: i === 0 ? COL_A : i === 1 ? COL_B : COL_W,
        transparent: true, opacity: baseOp,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const m = new THREE.LineSegments(edges, mat);
      scene.add(m);
      icoMeshes.push({ mesh: m, mat, baseOp });
    });

    // --- 4 orbital torus rings, tilted 15/35/55/75 deg ---
    const rings: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; baseOp: number; spin: number }[] = [];
    const tiltDeg = [15, 35, 55, 75];
    [92, 108, 124, 140].forEach((r, i) => {
      const g = new THREE.TorusGeometry(r, 0.35, 8, 96);
      const baseOp = 0.55;
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? COL_A : COL_B,
        transparent: true, opacity: baseOp,
        blending: THREE.AdditiveBlending, depthWrite: false, wireframe: true,
      });
      const m = new THREE.Mesh(g, mat);
      const tilt = (tiltDeg[i] * Math.PI) / 180;
      m.rotation.set(tilt, i * 0.6, tilt * 0.5);
      scene.add(m);
      rings.push({ mesh: m, mat, baseOp, spin: 0.04 + i * 0.012 });
    });

    // --- 120-particle constellation ---
    const N = 120;
    const pPos = new Float32Array(N * 3);
    const pVel = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pPos[i * 3]     = (Math.random() - 0.5) * 240;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 160;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
      pVel[i * 3]     = (Math.random() - 0.5) * 0.08;
      pVel[i * 3 + 1] = (Math.random() - 0.5) * 0.08;
      pVel[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: COL_W, size: 1.6, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    const gMat = new THREE.PointsMaterial({
      color: COL_A, size: 5, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    scene.add(new THREE.Points(pGeo, pMat));
    scene.add(new THREE.Points(pGeo, gMat));

    const maxPairs = (N * (N - 1)) / 2;
    const lnBuf = new Float32Array(maxPairs * 6);
    const lnGeo = new THREE.BufferGeometry();
    const lnAttr = new THREE.BufferAttribute(lnBuf, 3);
    lnGeo.setAttribute('position', lnAttr);
    lnGeo.setDrawRange(0, 0);
    const lnMat = new THREE.LineBasicMaterial({
      color: COL_B, transparent: true, opacity: 0.22,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(new THREE.LineSegments(lnGeo, lnMat));
    const CONN_SQ = 36 * 36;

    // --- 50-node consciousness pulse network ---
    const PN = 50;
    const nodePos: THREE.Vector3[] = [];
    for (let i = 0; i < PN; i++) {
      nodePos.push(new THREE.Vector3(
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 130,
        (Math.random() - 0.5) * 100,
      ));
    }
    // build neighbor map (each node's nearest few)
    const neighbors: number[][] = nodePos.map((p, i) => {
      const d = nodePos
        .map((q, j) => ({ j, d: i === j ? Infinity : p.distanceToSquared(q) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3)
        .map(x => x.j);
      return d;
    });
    const nodePulse = new Float32Array(PN); // 0..1 fading
    const nodeGeo = new THREE.BufferGeometry();
    const nodePosArr = new Float32Array(PN * 3);
    nodePos.forEach((v, i) => {
      nodePosArr[i * 3] = v.x; nodePosArr[i * 3 + 1] = v.y; nodePosArr[i * 3 + 2] = v.z;
    });
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePosArr, 3));
    const nodeMat = new THREE.PointsMaterial({
      color: COL_W, size: 3.2, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    scene.add(new THREE.Points(nodeGeo, nodeMat));

    // pulse connection lines (dynamic)
    const pulseLineBuf = new Float32Array(PN * 3 * 6);
    const pulseLineGeo = new THREE.BufferGeometry();
    const pulseLineAttr = new THREE.BufferAttribute(pulseLineBuf, 3);
    pulseLineGeo.setAttribute('position', pulseLineAttr);
    pulseLineGeo.setDrawRange(0, 0);
    const pulseLineMat = new THREE.LineBasicMaterial({
      color: COL_A, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(new THREE.LineSegments(pulseLineGeo, pulseLineMat));

    const fireAllPulses = () => {
      for (let i = 0; i < PN; i++) nodePulse[i] = 1;
    };

    let nextPulseAt = performance.now() + 2000 + Math.random() * 1000;
    const cascadeFromRandomNode = (now: number) => {
      const start = Math.floor(Math.random() * PN);
      nodePulse[start] = 1;
      // cascade: neighbors fire shortly after
      neighbors[start].forEach((n, idx) => {
        setTimeout(() => { nodePulse[n] = 1; }, 180 + idx * 140);
      });
      nextPulseAt = now + 2000 + Math.random() * 1000;
    };

    // --- 6 dimensional rift lines (transient) ---
    const rifts: { line: THREE.Line; mat: THREE.LineBasicMaterial; born: number }[] = [];
    const spawnRifts = () => {
      const now = performance.now();
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const r = 260;
        const p = new Float32Array([
          0, 0, 0,
          Math.cos(ang) * r, Math.sin(ang) * r, (Math.random() - 0.5) * 80,
        ]);
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(p, 3));
        const m = new THREE.LineBasicMaterial({
          color: COL_W, transparent: true, opacity: 1,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const ln = new THREE.Line(g, m);
        scene.add(ln);
        rifts.push({ line: ln, mat: m, born: now });
      }
    };

    // --- scroll reactivity ---
    let speedMul = 1;
    let scrollBoostUntil = 0;
    const onScroll = () => {
      speedMul = 3;
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

      if (now > scrollBoostUntil) speedMul += (1 - speedMul) * 0.06;
      surgeBoost += (1 - surgeBoost) * 0.05;
      scaleBoost += (1 - scaleBoost) * 0.06;
      currentOpacity += (baseOpacity - currentOpacity) * 0.04;

      const effOp = Math.min(1, currentOpacity * surgeBoost);

      const dt = 0.012 * speedMul;
      t += dt;

      updateTesseract(tessA, t * 0.6, t * 0.45, t * 0.3, t * 0.2, scaleBoost);
      updateTesseract(tessB, -t * 0.5, -t * 0.35, -t * 0.25, -t * 0.18, scaleBoost);
      tessA.mat.opacity = effOp;
      tessB.mat.opacity = effOp * 0.6;

      icoMeshes.forEach((o, i) => {
        o.mesh.rotation.x += dt * (0.05 + i * 0.02);
        o.mesh.rotation.y += dt * (0.07 - i * 0.015);
        o.mat.opacity = effOp * (0.6 + i * 0.1);
      });

      rings.forEach((r) => {
        r.mesh.rotation.z += dt * r.spin;
        r.mesh.rotation.x += dt * 0.02;
        r.mat.opacity = effOp * 0.7;
      });

      // particles
      for (let i = 0; i < N; i++) {
        pPos[i * 3]     += pVel[i * 3]     * speedMul;
        pPos[i * 3 + 1] += pVel[i * 3 + 1] * speedMul;
        pPos[i * 3 + 2] += pVel[i * 3 + 2] * speedMul;
        if (Math.abs(pPos[i * 3])     > 120) pVel[i * 3]     *= -1;
        if (Math.abs(pPos[i * 3 + 1]) > 80)  pVel[i * 3 + 1] *= -1;
        if (Math.abs(pPos[i * 3 + 2]) > 60)  pVel[i * 3 + 2] *= -1;
      }
      pGeo.attributes.position.needsUpdate = true;
      pMat.opacity = effOp * 1.6;
      gMat.opacity = effOp * 0.7;

      let cnt = 0;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pPos[i * 3]     - pPos[j * 3];
          const dy = pPos[i * 3 + 1] - pPos[j * 3 + 1];
          const dz = pPos[i * 3 + 2] - pPos[j * 3 + 2];
          if (dx * dx + dy * dy + dz * dz < CONN_SQ) {
            lnBuf[cnt * 6]     = pPos[i * 3];     lnBuf[cnt * 6 + 1] = pPos[i * 3 + 1]; lnBuf[cnt * 6 + 2] = pPos[i * 3 + 2];
            lnBuf[cnt * 6 + 3] = pPos[j * 3];     lnBuf[cnt * 6 + 4] = pPos[j * 3 + 1]; lnBuf[cnt * 6 + 5] = pPos[j * 3 + 2];
            cnt++;
          }
        }
      }
      lnGeo.setDrawRange(0, cnt * 2);
      lnAttr.needsUpdate = true;
      lnMat.opacity = effOp * 0.5;

      // pulse cascade trigger
      if (now > nextPulseAt) cascadeFromRandomNode(now);

      // pulse decay + draw lines between firing neighbors
      let pcnt = 0;
      for (let i = 0; i < PN; i++) {
        nodePulse[i] = Math.max(0, nodePulse[i] - dt * 0.8);
      }
      for (let i = 0; i < PN; i++) {
        if (nodePulse[i] > 0.05) {
          for (const nb of neighbors[i]) {
            if (nodePulse[nb] > 0.05 && pcnt < PN * 3) {
              const a = nodePos[i], b = nodePos[nb];
              pulseLineBuf[pcnt * 6]     = a.x; pulseLineBuf[pcnt * 6 + 1] = a.y; pulseLineBuf[pcnt * 6 + 2] = a.z;
              pulseLineBuf[pcnt * 6 + 3] = b.x; pulseLineBuf[pcnt * 6 + 4] = b.y; pulseLineBuf[pcnt * 6 + 5] = b.z;
              pcnt++;
            }
          }
        }
      }
      pulseLineGeo.setDrawRange(0, pcnt * 2);
      pulseLineAttr.needsUpdate = true;
      pulseLineMat.opacity = effOp * 1.2;
      nodeMat.opacity = effOp * 1.4;

      // rifts: fade out over 600ms
      for (let i = rifts.length - 1; i >= 0; i--) {
        const r = rifts[i];
        const age = (now - r.born) / 600;
        if (age >= 1) {
          scene.remove(r.line);
          r.line.geometry.dispose();
          r.mat.dispose();
          rifts.splice(i, 1);
        } else {
          r.mat.opacity = (1 - age) * Math.min(1, effOp * 4);
        }
      }

      scene.rotation.y = Math.sin(t * 0.1) * 0.05;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('nl-intro-surge', onSurge);
      window.removeEventListener('nl-intro-complete', onIntroComplete);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed', inset: 0, zIndex: -1,
        width: '100vw', height: '100vh',
        pointerEvents: 'none', background: 'transparent',
      }}
    />
  );
}
