/* ═══════════════════════════════════════════════════════
   GLOBAL ATMOSPHERE — Electric Blue AI Command Center
   Renders behind every portal page (client, admin, employee).

   Performance: this used to run ~30 always-on animations (14 blurred
   lightning streaks, 5 JS-driven 40px-blur orbs, drifting fragments,
   pulses, a flicker timer and a scroll listener) over the full viewport,
   which dropped idle frame rate to ~6fps on a throttled CPU. It is now a
   static composition with the same colors — zero per-frame work.
   ═══════════════════════════════════════════════════════ */

const ORBS = [
  { cx: "15%", cy: "20%", size: 320, color: "211,96%,60%", opacity: 0.12 },
  { cx: "75%", cy: "35%", size: 260, color: "197,88%,55%", opacity: 0.1 },
  { cx: "50%", cy: "70%", size: 280, color: "211,80%,50%", opacity: 0.08 },
  { cx: "85%", cy: "15%", size: 200, color: "197,90%,60%", opacity: 0.09 },
  { cx: "30%", cy: "80%", size: 240, color: "211,96%,60%", opacity: 0.07 },
];

export function GlobalAtmosphere() {
  return (
    <>
      <div className="dash-neural-grid" />
      <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden" aria-hidden>
        {ORBS.map((o, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: o.cx,
              top: o.cy,
              width: o.size * 1.6,
              height: o.size * 1.6,
              transform: "translate(-20%, -20%)",
              // Soft radial falloff replaces the old 40px filter blur.
              background: `radial-gradient(circle, hsla(${o.color},${o.opacity}) 0%, hsla(${o.color},${o.opacity * 0.4}) 35%, transparent 70%)`,
            }}
          />
        ))}
      </div>
    </>
  );
}
