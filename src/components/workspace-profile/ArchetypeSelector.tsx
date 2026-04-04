import { BUSINESS_ARCHETYPES, type BusinessArchetype } from "@/lib/workspaceProfileTypes";
import {
  Calendar, Folder, Repeat, CreditCard, ShoppingBag, Zap, TrendingUp, Building,
} from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  calendar: Calendar,
  folder: Folder,
  repeat: Repeat,
  "credit-card": CreditCard,
  "shopping-bag": ShoppingBag,
  zap: Zap,
  "trending-up": TrendingUp,
  building: Building,
};

interface ArchetypeSelectorProps {
  value: BusinessArchetype;
  onChange: (value: BusinessArchetype) => void;
}

export function ArchetypeSelector({ value, onChange }: ArchetypeSelectorProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
        Business Model
      </label>
      <TooltipProvider delayDuration={200}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BUSINESS_ARCHETYPES.map((arch) => {
            const Icon = ICON_MAP[arch.icon] ?? Zap;
            const isSelected = value === arch.value;
            return (
              <Tooltip key={arch.value}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onChange(arch.value as BusinessArchetype)}
                    className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all duration-200 ${
                      isSelected
                        ? "border-[hsl(var(--nl-electric))] bg-[hsl(var(--nl-electric))]/10 shadow-[0_0_20px_hsla(211,96%,60%,.12)]"
                        : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        isSelected ? "text-[hsl(var(--nl-electric))]" : "text-white/40"
                      }`}
                    />
                    <span
                      className={`text-[11px] font-medium leading-tight ${
                        isSelected ? "text-white" : "text-white/60"
                      }`}
                    >
                      {arch.label}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-[hsl(222,38%,10%)] border-white/10 text-white text-xs max-w-[200px]"
                >
                  {arch.description}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
