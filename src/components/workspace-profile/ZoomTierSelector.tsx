import { ZOOM_TIERS, type ZoomTier } from "@/lib/workspaceProfileTypes";
import { Users } from "lucide-react";

interface ZoomTierSelectorProps {
  value: ZoomTier;
  onChange: (value: ZoomTier) => void;
}

export function ZoomTierSelector({ value, onChange }: ZoomTierSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
        Zoom Tier
      </label>
      <div className="flex flex-col gap-1.5">
        {ZOOM_TIERS.map((tier) => {
          const isSelected = value === tier.value;
          return (
            <button
              key={tier.value}
              type="button"
              onClick={() => onChange(tier.value as ZoomTier)}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                isSelected
                  ? "border-[hsl(var(--nl-electric))] bg-[hsl(var(--nl-electric))]/10 shadow-[0_0_16px_hsla(211,96%,60%,.1)]"
                  : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15"
              }`}
            >
              <Users
                className={`h-4 w-4 shrink-0 ${
                  isSelected ? "text-[hsl(var(--nl-electric))]" : "text-white/30"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-sm font-medium ${
                      isSelected ? "text-white" : "text-white/70"
                    }`}
                  >
                    {tier.label}
                  </span>
                  <span className="text-[10px] text-white/30">{tier.seats} seats</span>
                </div>
                <p className="text-[11px] text-white/35 mt-0.5">{tier.description}</p>
              </div>
              {isSelected && (
                <div className="h-2 w-2 rounded-full bg-[hsl(var(--nl-electric))] shrink-0 shadow-[0_0_8px_hsl(var(--nl-electric))]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
