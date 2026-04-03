import { useState, useRef, useEffect } from "react";
import { INDUSTRY_OPTIONS } from "@/lib/industryConstants";
import { Search } from "lucide-react";

interface IndustrySearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  /** Dark theme variant for admin modals */
  variant?: "light" | "dark";
}

export function IndustrySearchSelect({
  value,
  onChange,
  className = "",
  placeholder = "Search or select industry…",
  variant = "light",
}: IndustrySearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? INDUSTRY_OPTIONS.filter((o) =>
        o.toLowerCase().includes(query.toLowerCase())
      )
    : INDUSTRY_OPTIONS;

  const displayValue =
    INDUSTRY_OPTIONS.find((o) => o.toLowerCase() === value) ?? "";

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

  const isDark = variant === "dark";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`flex items-center h-10 w-full rounded-md border text-sm px-3 cursor-pointer ${
          isDark
            ? "bg-white/[0.06] border-white/10 text-white"
            : "border-input bg-background text-foreground"
        }`}
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        {open ? (
          <div className="flex items-center gap-2 w-full">
            <Search className={`h-3.5 w-3.5 shrink-0 ${isDark ? "text-white/40" : "text-muted-foreground"}`} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className={`bg-transparent outline-none w-full text-sm ${
                isDark ? "text-white placeholder:text-white/30" : "placeholder:text-muted-foreground"
              }`}
            />
          </div>
        ) : (
          <span className={displayValue ? "" : isDark ? "text-white/30" : "text-muted-foreground"}>
            {displayValue || placeholder}
          </span>
        )}
      </div>

      {open && (
        <div
          className={`absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border shadow-lg ${
            isDark
              ? "bg-[hsl(var(--nl-deep))] border-white/10"
              : "bg-popover border-border"
          }`}
        >
          {filtered.length === 0 && (
            <div className={`px-3 py-2 text-sm ${isDark ? "text-white/40" : "text-muted-foreground"}`}>
              No matches
            </div>
          )}
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm min-h-[44px] flex items-center transition-colors ${
                opt.toLowerCase() === value
                  ? isDark
                    ? "bg-white/10 text-white font-medium"
                    : "bg-accent text-accent-foreground font-medium"
                  : isDark
                  ? "text-white/80 hover:bg-white/[0.06]"
                  : "text-popover-foreground hover:bg-accent/50"
              }`}
              onClick={() => {
                onChange(opt.toLowerCase());
                setOpen(false);
                setQuery("");
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
