import { useEffect, useRef } from "react";

/**
 * LivingBackground — flowing lines + a slow "breathing" glow.
 * The system should feel alive: no dots, no particles, no circles.
 *
 * Cost control:
 *  - one <canvas>, ~30fps, devicePixelRatio capped (1.25 on phones, 1.5 desktop)
 *  - phones draw fewer, calmer lines
 *  - stops when the tab is hidden; one still frame when the user prefers reduced motion
 *  - never put backdrop-blur cards over it (blur re-samples the canvas every frame)
 */
export function LivingBackground({ intensity = 1, className = "" }: { intensity?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = 0;
    let w = 0, h = 0, phone = false;

    type Line = { y: number; amp: number; freq: number; speed: number; phase: number; hue: number; alpha: number; width: number };
    let lines: Line[] = [];

    const build = () => {
      w = canvas.clientWidth; h = canvas.clientHeight;
      phone = w < 640;
      const dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.25 : 1.5);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = phone ? 5 : 9;
      lines = Array.from({ length: n }, (_, i) => ({
        y: 0.12 + (i / (n - 1)) * 0.8,
        amp: (phone ? 18 : 34) + ((i * 37) % 28),
        freq: 0.8 + ((i * 13) % 7) / 6,
        speed: (0.05 + ((i * 7) % 5) / 60) * (i % 2 ? 1 : -1),
        phase: i * 1.7,
        hue: i % 3 === 0 ? 197 : 211,
        alpha: (0.10 + ((i * 11) % 6) / 60) * intensity,
        width: i % 4 === 0 ? 1.6 : 1,
      }));
    };

    const draw = (t: number) => {
      const s = t / 1000;
      ctx.clearRect(0, 0, w, h);

      // Breathing glow: wide soft washes whose strength rises and falls (~9s cycle).
      const breath = 0.5 + 0.5 * Math.sin(s * 0.7);
      const g1 = ctx.createLinearGradient(0, 0, w, h);
      g1.addColorStop(0, `hsla(211,96%,60%,${(0.05 + 0.05 * breath) * intensity})`);
      g1.addColorStop(0.5, "hsla(211,96%,60%,0)");
      g1.addColorStop(1, `hsla(197,100%,50%,${(0.04 + 0.05 * (1 - breath)) * intensity})`);
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      // Flowing lines.
      const step = phone ? 24 : 16;
      for (const L of lines) {
        const baseY = L.y * h;
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        const a = L.alpha * (0.75 + 0.25 * Math.sin(s * 0.9 + L.phase));
        grad.addColorStop(0, `hsla(${L.hue},100%,62%,0)`);
        grad.addColorStop(0.3, `hsla(${L.hue},100%,62%,${a})`);
        grad.addColorStop(0.7, `hsla(${L.hue},100%,70%,${a * 1.2})`);
        grad.addColorStop(1, `hsla(${L.hue},100%,62%,0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = L.width;
        ctx.beginPath();
        for (let x = -step; x <= w + step; x += step) {
          const k = x / w;
          const y = baseY
            + Math.sin(k * Math.PI * 2 * L.freq + s * L.speed * 6 + L.phase) * L.amp
            + Math.sin(k * Math.PI * 5 + s * 0.35 + L.phase * 2) * L.amp * 0.25;
          x === -step ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // A travelling pulse of light along one line — the "signal" moving through the system.
      if (!phone || intensity > 0.8) {
        const L = lines[Math.floor(lines.length / 2)];
        const px = ((s * 0.06) % 1.4 - 0.2) * w;
        const pulse = ctx.createLinearGradient(px - 160, 0, px + 160, 0);
        pulse.addColorStop(0, "hsla(197,100%,70%,0)");
        pulse.addColorStop(0.5, `hsla(197,100%,75%,${0.35 * intensity})`);
        pulse.addColorStop(1, "hsla(197,100%,70%,0)");
        ctx.strokeStyle = pulse;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = px - 160; x <= px + 160; x += 8) {
          const k = x / w;
          const y = L.y * h
            + Math.sin(k * Math.PI * 2 * L.freq + s * L.speed * 6 + L.phase) * L.amp
            + Math.sin(k * Math.PI * 5 + s * 0.35 + L.phase * 2) * L.amp * 0.25;
          x === px - 160 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 33) return; // ~30fps
      last = t;
      draw(t);
    };

    const start = () => { cancelAnimationFrame(raf); if (reduce) draw(4000); else raf = requestAnimationFrame(loop); };
    const onVis = () => { if (document.hidden) cancelAnimationFrame(raf); else start(); };
    const onResize = () => { build(); if (reduce) draw(4000); };

    build();
    start();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
    };
  }, [intensity]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`fixed inset-0 w-full h-full pointer-events-none z-[1] ${className}`}
    />
  );
}

export default LivingBackground;
