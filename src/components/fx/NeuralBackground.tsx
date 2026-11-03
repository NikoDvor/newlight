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
// Runs in a Web Worker on an OffscreenCanvas where supported (scrolling/taps never wait on it);
// otherwise the same scene runs on the main thread. Scene code: ./neuralScene.ts.
function Scene({ still, onFail }: { still: boolean; onFail: () => void }) {
  const [useWorker, setUseWorker] = useState(() =>
    typeof window !== "undefined" && typeof Worker !== "undefined" && typeof (window as any).OffscreenCanvas !== "undefined"
    && typeof (HTMLCanvasElement.prototype as any).transferControlToOffscreen === "function");
  return useWorker
    ? <WorkerScene key="w" still={still} onFail={() => setUseWorker(false)} />
    : <MainScene key="m" still={still} onFail={onFail} />;
}

function sceneOpts() {
  const phone = window.innerWidth < 768;
  return { width: window.innerWidth, height: window.innerHeight, dpr: Math.min(window.devicePixelRatio || 1, phone ? 1 : 1.5), phone, glow: !phone };
}

/** Wires window events (resize, pointer, visibility, scroll) to a scene controller-like sink. */
function useSceneInputs(send: (type: string, payload: Record<string, unknown>) => void, still: boolean) {
  useEffect(() => { send("still", { v: still }); }, [still]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let px = 0, py = 0, ptimer = 0, stimer = 0, scrolling = false;
    const onPointer = (e: PointerEvent) => {
      px = (e.clientX / window.innerWidth - 0.5) * 2; py = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!ptimer) ptimer = window.setTimeout(() => { ptimer = 0; send("pointer", { x: px, y: py }); }, 50);
    };
    const onResize = () => send("resize", { w: window.innerWidth, h: window.innerHeight });
    const onVis = () => send("hidden", { v: document.hidden });
    const onScroll = () => {
      if (!scrolling) { scrolling = true; send("scrolling", { v: true }); }
      window.clearTimeout(stimer);
      stimer = window.setTimeout(() => { scrolling = false; send("scrolling", { v: false }); }, 220);
    };
    // a finger on the screen counts as scrolling (iOS fires scroll late for inner scrollers)
    const onTouchStart = () => onScroll();
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("touchmove", onTouchStart, { passive: true, capture: true });
    return () => {
      window.removeEventListener("touchmove", onTouchStart, { capture: true } as any);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("scroll", onScroll, { capture: true } as any);
      window.clearTimeout(ptimer); window.clearTimeout(stimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

const idle = (cb: () => void) => {
  const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: { timeout: number }) => number);
  return ric ? ric(cb, { timeout: 1200 }) : window.setTimeout(cb, 300);
};

function WorkerScene({ still, onFail }: { still: boolean; onFail: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const send = (type: string, payload: Record<string, unknown>) => workerRef.current?.postMessage({ type, ...payload });
  useSceneInputs(send, still);
  useEffect(() => {
    let cancelled = false;
    idle(() => {
      if (cancelled || !ref.current) return;
      let worker: Worker;
      try {
        worker = new Worker(new URL("./neuralScene.worker.ts", import.meta.url), { type: "module" });
        const off = (ref.current as any).transferControlToOffscreen();
        worker.onmessage = (e) => { if (e.data?.type === "fail") { worker.terminate(); workerRef.current = null; onFail(); } };
        worker.onerror = () => { worker.terminate(); workerRef.current = null; onFail(); };
        worker.postMessage({ type: "init", canvas: off, opts: sceneOpts() }, [off]);
        workerRef.current = worker;
        worker.postMessage({ type: "still", v: still });
        if (document.hidden) worker.postMessage({ type: "hidden", v: true });
      } catch { onFail(); }
    });
    return () => { cancelled = true; workerRef.current?.postMessage({ type: "dispose" }); workerRef.current?.terminate(); workerRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} className="nl-bg-scene absolute inset-0 h-full w-full" />;
}

function MainScene({ still, onFail }: { still: boolean; onFail: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ctlRef = useRef<import("./neuralScene").SceneCtl | null>(null);
  const send = (type: string, p: Record<string, unknown>) => {
    const c = ctlRef.current; if (!c) return;
    if (type === "resize") c.resize(p.w as number, p.h as number);
    else if (type === "pointer") c.pointer(p.x as number, p.y as number);
    else if (type === "still") c.setStill(!!p.v);
    else if (type === "hidden") c.setHidden(!!p.v);
    else if (type === "scrolling") c.setScrolling(!!p.v);
  };
  useSceneInputs(send, still);
  useEffect(() => {
    let cancelled = false;
    idle(async () => {
      try {
        const [THREE, { createScene }] = await Promise.all([import("three"), import("./neuralScene")]);
        if (cancelled || !ref.current) return;
        ctlRef.current = createScene(THREE, ref.current, sceneOpts());
        ctlRef.current.setStill(still);
        if (document.hidden) ctlRef.current.setHidden(true);
      } catch { onFail(); }
    });
    return () => { cancelled = true; ctlRef.current?.dispose(); ctlRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} className="nl-bg-scene absolute inset-0 h-full w-full" />;
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
.nl-bg[data-still="1"] .nl-bg-streak{animation-play-state:paused}
@media (prefers-reduced-motion:reduce){.nl-bg-streak,.nl-bg-glow,.nl-bg-glow2,.nl-bg-core{animation:none}}
`}</style>
  );
}
