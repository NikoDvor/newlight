import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calculator } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { DataCard } from "@/components/DataCard";

export interface SimulatorLever {
  /** Stable key used in the values map handed to `project` */
  key: string;
  /** Short label, e.g. "Conversion Rate" */
  label: string;
  min: number;
  max: number;
  step: number;
  /** Seed / current real value */
  value: number;
  /** Renders the value next to the label (e.g. `${v}%`) */
  format?: (v: number) => string;
}

interface RevenueSimulatorProps {
  title: string;
  levers: SimulatorLever[];
  /** Given the live lever values, return the projected revenue number */
  project: (values: Record<string, number>) => number;
  /** Real current revenue used for the delta readout */
  baseline: number;
  className?: string;
  gridClassName?: string;
  projectedLabel?: string;
  baselineLabel?: string;
  /** Rendered under the projection bar (extra context, empty states, etc.) */
  footer?: React.ReactNode;
}

const seedOf = (levers: SimulatorLever[]) =>
  levers.reduce<Record<string, number>>((acc, l) => {
    acc[l.key] = l.value;
    return acc;
  }, {});

export function RevenueSimulator({
  title,
  levers,
  project,
  baseline,
  className = "",
  gridClassName = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6",
  projectedLabel = "Projected Monthly Revenue",
  baselineLabel = "vs current baseline",
  footer,
}: RevenueSimulatorProps) {
  const [values, setValues] = useState<Record<string, number>>(() => seedOf(levers));

  // Re-seed when the underlying real data arrives / changes
  const seedSignature = levers.map((l) => `${l.key}:${l.value}`).join("|");
  useEffect(() => {
    setValues(seedOf(levers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedSignature]);

  const projected = project(values);
  const safeProjected = Number.isFinite(projected) ? projected : 0;
  const safeBaseline = Number.isFinite(baseline) ? baseline : 0;
  const delta = Math.round(safeProjected - safeBaseline);

  return (
    <DataCard title={title} className={className}>
      <div className={gridClassName}>
        {levers.map((l) => (
          <div key={l.key}>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              {l.label}: {l.format ? l.format(values[l.key] ?? l.value) : (values[l.key] ?? l.value)}
            </label>
            <Slider
              value={[values[l.key] ?? l.value]}
              min={l.min}
              max={l.max}
              step={l.step}
              onValueChange={([v]) => setValues((prev) => ({ ...prev, [l.key]: v }))}
            />
          </div>
        ))}
      </div>
      <motion.div
        className="flex items-center gap-4 p-4 rounded-xl"
        style={{ background: "hsla(211,96%,56%,.04)", border: "1px solid hsla(211,96%,56%,.1)" }}
        initial={false}
      >
        <Calculator className="h-8 w-8 shrink-0" style={{ color: "hsl(211 96% 56%)" }} />
        <div>
          <p className="text-xs text-muted-foreground">{projectedLabel}</p>
          <p className="metric-value text-2xl">${Math.round(safeProjected).toLocaleString()}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] text-muted-foreground">{baselineLabel}</p>
          <p className="text-sm font-bold" style={{ color: "hsl(152 60% 44%)" }}>
            {delta > 0 ? "+" : ""}${delta.toLocaleString()}
          </p>
        </div>
      </motion.div>
      {footer}
    </DataCard>
  );
}
