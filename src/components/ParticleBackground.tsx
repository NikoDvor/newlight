
import { useEffect, useRef } from 'react';

import * as THREE from 'three';

export default function ParticleBackground() {

  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {

    const el = mountRef.current;

    if (!el) return;

    const scene = new THREE.Scene();

    scene.fog = new THREE.FogExp2(0x04080f, 0.0048);

    scene.background = new THREE.Color(0x060d18);

    const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 1000);

    camera.position.z = 145;

    const renderer = new THREE.WebGLRenderer({ antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    el.appendChild(renderer.domElement);

    const group = new THREE.Group();

    scene.add(group);

    const N = 120;

    const pos = new Float32Array(N * 3);

    const vel = new Float32Array(N * 3);

    for (let i = 0; i < N; i++) {

      pos[i*3]   = (Math.random()-0.5)*220;

      pos[i*3+1] = (Math.random()-0.5)*144;

      pos[i*3+2] = (Math.random()-0.5)*116;

      vel[i*3]   = (Math.random()-0.5)*0.10;

      vel[i*3+1] = (Math.random()-0.5)*0.10;

      vel[i*3+2] = (Math.random()-0.5)*0.045;

    }

    const mkLayer = (size: number, opacity: number, color: number) => {

      const g = new THREE.BufferGeometry();

      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));

      return new THREE.Points(g, new THREE.PointsMaterial({

        color, size, transparent: true, opacity,

        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,

      }));

    };

    const glowLayer = mkLayer(8, 0.13, 0x1a6fff);

    const midLayer  = mkLayer(3.5, 0.28, 0x4da6ff);

    const coreLayer = mkLayer(1.6, 0.92, 0xa8d8ff);

    group.add(glowLayer, midLayer, coreLayer);

    const maxPairs = (N * (N - 1)) / 2;

    const lnBuf = new Float32Array(maxPairs * 6);

    const lnGeo = new THREE.BufferGeometry();

    const lnAttr = new THREE.BufferAttribute(lnBuf, 3);

    lnGeo.setAttribute('position', lnAttr);

    lnGeo.setDrawRange(0, 0);

    group.add(new THREE.LineSegments(lnGeo, new THREE.LineBasicMaterial({

      color: 0x2a7fff, transparent: true, opacity: 0.18,

      blending: THREE.AdditiveBlending, depthWrite: false,

    })));

    const CONN_SQ = 38 * 38;

    const rings: THREE.Mesh[] = [];

    ([

      [0,0,0],[42,22,-18],[-42,-22,12],[22,-32,28],[-26,26,-28]

    ] as [number,number,number][]).forEach(([x,y,z]) => {

      const hub = new THREE.Mesh(

        new THREE.SphereGeometry(2.8,16,16),

        new THREE.MeshBasicMaterial({ color: 0x70c8ff, transparent: true, opacity: 0.9 })

      );

      hub.position.set(x,y,z);

      const ring = new THREE.Mesh(

        new THREE.TorusGeometry(5.0,0.2,8,32),

        new THREE.MeshBasicMaterial({ color: 0x70c8ff, transparent: true, opacity: 0.3, wireframe: true })

      );

      ring.position.set(x,y,z);

      group.add(hub, ring);

      rings.push(ring);

    });

    const grid = new THREE.GridHelper(320, 32, 0x1a5fff, 0x1a5fff);

    grid.position.y = -65;

    (Array.isArray(grid.material) ? grid.material : [grid.material]).forEach(m => {

      m.transparent = true; (m as THREE.Material & {opacity:number}).opacity = 0.28;

    });

    scene.add(grid);

    const grid2 = new THREE.GridHelper(320, 16, 0x0a2a6a, 0x0a2a6a);

    grid2.position.y = -120;

    (Array.isArray(grid2.material) ? grid2.material : [grid2.material]).forEach(m => {

      m.transparent = true; (m as THREE.Material & {opacity:number}).opacity = 0.12;

    });

    scene.add(grid2);

    let mouseX = 0, mouseY = 0, camX = 0, camY = 0, t = 0;

    const onMove = (e: MouseEvent) => {

      mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;

      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;

    };

    const onResize = () => {

      camera.aspect = window.innerWidth / window.innerHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);

    };

    window.addEventListener('mousemove', onMove);

    window.addEventListener('resize', onResize);

    let animId: number;

    const animate = () => {

      animId = requestAnimationFrame(animate);

      t += 0.016;

      for (let i = 0; i < N; i++) {

        pos[i*3]   += vel[i*3];   if (Math.abs(pos[i*3])   > 110) vel[i*3]   *= -1;

        pos[i*3+1] += vel[i*3+1]; if (Math.abs(pos[i*3+1]) > 72)  vel[i*3+1] *= -1;

        pos[i*3+2] += vel[i*3+2]; if (Math.abs(pos[i*3+2]) > 58)  vel[i*3+2] *= -1;

      }

      glowLayer.geometry.attributes.position.needsUpdate = true;

      midLayer.geometry.attributes.position.needsUpdate  = true;

      coreLayer.geometry.attributes.position.needsUpdate = true;

      let cnt = 0;

      for (let i = 0; i < N; i++) {

        for (let j = i + 1; j < N; j++) {

          const dx=pos[i*3]-pos[j*3], dy=pos[i*3+1]-pos[j*3+1], dz=pos[i*3+2]-pos[j*3+2];

          if (dx*dx+dy*dy+dz*dz < CONN_SQ) {

            lnBuf[cnt*6]=pos[i*3];   lnBuf[cnt*6+1]=pos[i*3+1]; lnBuf[cnt*6+2]=pos[i*3+2];

            lnBuf[cnt*6+3]=pos[j*3]; lnBuf[cnt*6+4]=pos[j*3+1]; lnBuf[cnt*6+5]=pos[j*3+2];

            cnt++;

          }

        }

      }

      lnGeo.setDrawRange(0, cnt * 2);

      lnAttr.needsUpdate = true;

      rings.forEach((r, i) => {

        r.scale.setScalar(1 + Math.sin(t*1.5+i*1.2)*0.3);

        (r.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t+i)*0.1;

      });

      group.rotation.y += 0.0012;

      camX += (mouseX*20 - camX)*0.05;

      camY += (-mouseY*13 - camY)*0.05;

      camera.position.x = camX;

      camera.position.y = camY;

      camera.position.z = 145 + Math.sin(t*0.28)*7;

      renderer.render(scene, camera);

    };

    animate();

    return () => {

      cancelAnimationFrame(animId);

      window.removeEventListener('mousemove', onMove);

      window.removeEventListener('resize', onResize);

      renderer.dispose();

      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);

    };

  }, []);

  return (

    <div

      ref={mountRef}

      style={{ position: 'fixed', inset: 0, zIndex: 0, width: '100vw', height: '100vh', pointerEvents: 'none' }}

    />

  );

}

