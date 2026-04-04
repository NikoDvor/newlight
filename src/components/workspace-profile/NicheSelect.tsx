import { useState, useRef, useEffect, useMemo } from "react";
import { getNichesByIndustry, type NicheDefinition } from "@/lib/workspaceNiches";
import type { IndustryCategory } from "@/lib/workspaceProfileTypes";
import { Search, Check, Sparkles } from "lucide-react";

interface NicheSelectProps {
  industry: IndustryCategory;
  value: string | null;
  onChange: (niche: NicheDefinition) => void;
}

export function NicheSelect({ industry, value, onChange }: NicheSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const niches = useMemo(() => getNichesByIndustry(industry), [industry]);

  const filtered = query
    ? niches.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
    : niches;

  const selected = niches.find((n) => n.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reset selection if industry changes and current niche doesn't belong
  useEffect(() => {
    if (value && !niches.find((n) => n.id === value)) {
      // Don't auto-clear — let parent handle
    }
  }, [industry, value, niches]);

  if (niches.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/60 uppercase tracking-wider flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-[hsl(var(--nl-electric))]/60" />
        Niche / Business Type
      </label>
      <div ref={containerRef} className="relative">
        <div
          className="flex items-center h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] text-sm px-3 cursor-pointer hover:border-[hsl(var(--nl-electric))]/30 transition-colors"
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          {open ? (
            <div className="flex items-center gap-2 w-full">
              <Search className="h-3.5 w-3.5 shrink-0 text-white/30" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search business types…"
                className="bg-transparent outline-none w-full text-sm text-white placeholder:text-white/25"
              />
            </div>
          ) : (
            <span className={selected ? "text-white" : "text-white/30"}>
              {selected?.label || "Select business type…"}
            </span>
          )}
        </div>

        {open && (
          <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[hsl(222,38%,8%)] shadow-2xl shadow-black/40">
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-sm text-white/30">No matches</div>
            )}
            {filtered.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`w-full text-left px-3 py-2.5 transition-colors flex items-center justify-between ${
                  n.id === value
                    ? "bg-[hsl(var(--nl-electric))]/10"
                    : "hover:bg-white/[0.04]"
                }`}
                onClick={() => {
                  onChange(n);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{n.label}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-white/25 capitalize">{n.ticketSize} ticket</span>
                    <span className="text-[10px] text-white/15">·</span>
                    <span className="text-[10px] text-white/25 capitalize">{n.salesCycle} cycle</span>
                  </div>
                </div>
                {n.id === value && (
                  <Check className="h-4 w-4 text-[hsl(var(--nl-electric))] shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
