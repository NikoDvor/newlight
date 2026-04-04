import { useState, useRef, useEffect } from "react";
import { INDUSTRY_CATEGORIES, type IndustryCategory } from "@/lib/workspaceProfileTypes";
import { Search, Check } from "lucide-react";

interface IndustryCategorySelectProps {
  value: IndustryCategory;
  onChange: (value: IndustryCategory) => void;
}

export function IndustryCategorySelect({ value, onChange }: IndustryCategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? INDUSTRY_CATEGORIES.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.examples.toLowerCase().includes(query.toLowerCase())
      )
    : [...INDUSTRY_CATEGORIES];

  const selected = INDUSTRY_CATEGORIES.find((c) => c.value === value);

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

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Industry</label>
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
                placeholder="Search industries…"
                className="bg-transparent outline-none w-full text-sm text-white placeholder:text-white/25"
              />
            </div>
          ) : (
            <span className={selected ? "text-white" : "text-white/30"}>
              {selected?.label || "Select industry…"}
            </span>
          )}
        </div>

        {open && (
          <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-[hsl(222,38%,8%)] shadow-2xl shadow-black/40">
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-sm text-white/30">No matches</div>
            )}
            {filtered.map((cat) => (
              <button
                key={cat.value}
                type="button"
                className={`w-full text-left px-3 py-2.5 transition-colors flex items-start gap-3 ${
                  cat.value === value
                    ? "bg-[hsl(var(--nl-electric))]/10"
                    : "hover:bg-white/[0.04]"
                }`}
                onClick={() => {
                  onChange(cat.value as IndustryCategory);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{cat.label}</div>
                  <div className="text-[11px] text-white/35 mt-0.5 truncate">{cat.examples}</div>
                </div>
                {cat.value === value && (
                  <Check className="h-4 w-4 text-[hsl(var(--nl-electric))] shrink-0 mt-0.5" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
