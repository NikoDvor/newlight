import { useEffect, useState } from "react";
import { getBgMode, setBgMode, type BgMode } from "./NeuralBackground";

/** Full / Calm / Off for the moving background — saved on this device. */
export default function BackgroundModeSwitch({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<BgMode>(() => getBgMode());
  useEffect(() => {
    const on = (e: Event) => setMode((e as CustomEvent).detail as BgMode);
    window.addEventListener("nl-bg-mode", on);
    return () => window.removeEventListener("nl-bg-mode", on);
  }, []);
  const opts: { k: BgMode; l: string }[] = [{ k: "full", l: "Full" }, { k: "calm", l: "Calm" }, { k: "off", l: "Off" }];
  return (
    <div className={compact ? "px-2 py-1.5 group-data-[collapsible=icon]:hidden" : ""}>
      <p className={`font-semibold uppercase tracking-wider text-white/45 ${compact ? "text-[10px] mb-1" : "text-[11px] mb-1.5"}`}>Background effects</p>
      <div className="inline-flex w-full overflow-hidden rounded-lg border border-white/10" role="group" aria-label="Background effects">
        {opts.map((o) => (
          <button key={o.k} type="button" aria-pressed={mode === o.k} onClick={() => { setBgMode(o.k); setMode(o.k); }}
            className={`flex-1 ${compact ? "min-h-[32px] text-[11px]" : "min-h-[40px] text-[13px]"} font-semibold transition ${mode === o.k ? "bg-[hsla(197,100%,55%,.22)] text-white" : "text-white/50 hover:text-white"}`}>
            {o.l}
          </button>
        ))}
      </div>
      {!compact && <p className="mt-1.5 text-[12px] text-white/45">Calm or Off saves battery and keeps phones cool on long calls. Saved on this device.</p>}
    </div>
  );
}
