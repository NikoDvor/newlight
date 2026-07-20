import { useEffect, useRef } from "react";

/**
 * Lightweight canvas grid + drifting node atmosphere for the employee dashboard.
 * Renders faint blue lattice lines with slowly drifting glowing nodes.
 * Pointer-events-none, absolute-positioned, capped DPR, single rAF loop.
 * Respects prefers-reduced-motion (renders one static frame then stops).
 */
export function DashboardAtmosphere() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    let w = 0, h = 0;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    // Nodes drift slowly across grid
    const NODE_COUNT = 22;
    const nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.00015,
      phase: Math.random() * Math.PI * 2,
    }));

    const GRID = 56; // px
    let raf = 0;
    let last = performance.now();

    const draw = (t: number) => {
      const dt = Math.min(60, t - last);
      last = t;

      ctx.clearRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = "hsla(211, 96%, 60%, 0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const offset = (t * 0.008) % GRID;
      for (let x = -GRID + offset; x < w + GRID; x += GRID) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = -GRID + offset; y < h + GRID; y += GRID) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Nodes: glowing dots
      for (const n of nodes) {
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        if (n.x < -0.05) n.x = 1.05;
        if (n.x > 1.05) n.x = -0.05;
        if (n.y < -0.05) n.y = 1.05;
        if (n.y > 1.05) n.y = -0.05;

        const px = n.x * w;
        const py = n.y * h;
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.001 + n.phase);
        const r = 1.4 + pulse * 1.2;

        // Halo
        const grad = ctx.createRadialGradient(px, py, 0, px, py, 22);
        grad.addColorStop(0, `hsla(197, 92%, 65%, ${0.28 + pulse * 0.18})`);
        grad.addColorStop(1, "hsla(197, 92%, 65%, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, 22, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `hsla(200, 100%, 82%, ${0.75 + pulse * 0.25})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <canvas ref={ref} className="block w-full h-full" aria-hidden="true" />
      {/* Vignette to keep data legible in center */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, transparent 0%, hsla(220, 40%, 6%, 0.35) 100%)",
        }}
      />
    </div>
  );
}
