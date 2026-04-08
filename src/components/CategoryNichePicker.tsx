import { useState, useRef, useEffect, useMemo } from "react";
import {
  BUSINESS_CATEGORIES,
  getNichesForCategory,
  buildStructuredProfile,
  type BusinessCategory,
  type StructuredWorkspaceProfile,
} from "@/lib/businessCategoryRegistry";
import type { NicheDefinition } from "@/lib/workspaceNiches";
import { Search, Check, ChevronRight, Phone } from "lucide-react";

interface CategoryNichePickerProps {
  categoryId: string | null;
  nicheId: string | null;
  onCategoryChange: (categoryId: string) => void;
  onNicheChange: (nicheId: string | null) => void;
  /** Called with the full structured profile whenever category or niche changes */
  onProfileChange: (profile: StructuredWorkspaceProfile) => void;
  variant?: "light" | "dark";
  className?: string;
}

export function CategoryNichePicker({
  categoryId,
  nicheId,
  onCategoryChange,
  onNicheChange,
  onProfileChange,
  variant = "light",
  className = "",
}: CategoryNichePickerProps) {
  const isDark = variant === "dark";
  const [nicheQuery, setNicheQuery] = useState("");
  const [nicheOpen, setNicheOpen] = useState(false);
  const nicheContainerRef = useRef<HTMLDivElement>(null);
  const nicheInputRef = useRef<HTMLInputElement>(null);

  // Close niche dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (nicheContainerRef.current && !nicheContainerRef.current.contains(e.target as Node)) {
        setNicheOpen(false);
        setNicheQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const niches = useMemo(() => (categoryId ? getNichesForCategory(categoryId) : []), [categoryId]);

  const filteredNiches = useMemo(() => {
    if (!nicheQuery) return niches;
    const q = nicheQuery.toLowerCase().trim();
    return niches.filter((n) =>
      n.label.toLowerCase().includes(q) ||
      n.id.replace(/_/g, " ").includes(q)
    );
  }, [niches, nicheQuery]);

  const selectedCategory = BUSINESS_CATEGORIES.find((c) => c.id === categoryId);
  const selectedNiche = niches.find((n) => n.id === nicheId);

  const handleCategorySelect = (cat: BusinessCategory) => {
    onCategoryChange(cat.id);
    onNicheChange(null);
    setNicheQuery("");
    const profile = buildStructuredProfile(cat.id, null);
    onProfileChange(profile);
  };

  const handleNicheSelect = (niche: NicheDefinition) => {
    onNicheChange(niche.id);
    setNicheOpen(false);
    setNicheQuery("");
    if (categoryId) {
      const profile = buildStructuredProfile(categoryId, niche);
      onProfileChange(profile);
    }
  };

  // Style tokens
  const cardBg = isDark ? "bg-white/[0.03]" : "bg-secondary/30";
  const cardBorder = isDark ? "border-white/8" : "border-border";
  const cardHover = isDark ? "hover:bg-white/[0.06] hover:border-white/15" : "hover:bg-secondary/60 hover:border-primary/20";
  const cardSelected = isDark
    ? "bg-[hsl(var(--nl-electric))]/10 border-[hsl(var(--nl-electric))]/30"
    : "bg-primary/8 border-primary/30";
  const textPrimary = isDark ? "text-white" : "text-foreground";
  const textSecondary = isDark ? "text-white/50" : "text-muted-foreground";
  const textTertiary = isDark ? "text-white/30" : "text-muted-foreground/60";

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ── Step 1: Business Category ── */}
      <div>
        <label className={`text-xs font-medium mb-2 block ${textSecondary}`}>
          Business Category
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {BUSINESS_CATEGORIES.map((cat) => {
            const isSelected = categoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={`text-left px-3 py-2.5 rounded-lg border transition-all duration-150 ${
                  isSelected ? cardSelected : `${cardBg} ${cardBorder} ${cardHover}`
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${isSelected ? (isDark ? "text-white" : "text-primary") : textPrimary}`}>
                    {cat.label}
                  </span>
                  {isSelected && <Check className={`h-3.5 w-3.5 shrink-0 ${isDark ? "text-[hsl(var(--nl-electric))]" : "text-primary"}`} />}
                </div>
                <span className={`text-[11px] ${isSelected ? (isDark ? "text-white/50" : "text-primary/60") : textTertiary}`}>
                  {cat.helper}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step 2: Business Niche (shown after category selection) ── */}
      {categoryId && niches.length > 0 && (
        <div>
          <label className={`text-xs font-medium mb-1.5 block ${textSecondary}`}>
            Business Niche
            <span className={`ml-1 font-normal ${textTertiary}`}>(recommended)</span>
          </label>

          <div ref={nicheContainerRef} className="relative">
            <div
              className={`flex items-center h-10 w-full rounded-md border text-sm px-3 cursor-pointer transition-colors ${
                isDark
                  ? "bg-white/[0.06] border-white/10 text-white hover:border-[hsl(var(--nl-electric))]/30"
                  : "border-input bg-background text-foreground hover:border-primary/30"
              }`}
              onClick={() => {
                setNicheOpen(true);
                setTimeout(() => nicheInputRef.current?.focus(), 0);
              }}
            >
              {nicheOpen ? (
                <div className="flex items-center gap-2 w-full">
                  <Search className={`h-3.5 w-3.5 shrink-0 ${isDark ? "text-white/40" : "text-muted-foreground"}`} />
                  <input
                    ref={nicheInputRef}
                    value={nicheQuery}
                    onChange={(e) => setNicheQuery(e.target.value)}
                    placeholder="Search business types…"
                    className={`bg-transparent outline-none w-full text-sm ${
                      isDark ? "text-white placeholder:text-white/30" : "placeholder:text-muted-foreground"
                    }`}
                  />
                </div>
              ) : (
                <span className={selectedNiche ? textPrimary : textTertiary}>
                  {selectedNiche?.label || "Search or select a specific business type…"}
                </span>
              )}
            </div>

            {nicheOpen && (
              <div
                className={`absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border shadow-lg ${
                  isDark ? "bg-[hsl(218,35%,10%)] border-white/10" : "bg-popover border-border"
                }`}
              >
                {filteredNiches.length === 0 && (
                  <div className={`px-3 py-3 text-sm ${textTertiary}`}>
                    No matches
                  </div>
                )}
                {filteredNiches.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNicheSelect(n)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                      n.id === nicheId
                        ? isDark ? "bg-white/10 text-white font-medium" : "bg-accent text-accent-foreground font-medium"
                        : isDark ? "text-white/80 hover:bg-white/[0.06]" : "text-popover-foreground hover:bg-accent/50"
                    }`}
                  >
                    <span>{n.label}</span>
                    {n.id === nicheId && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Fallback CTA ── */}
      <div className={`rounded-lg border px-3 py-3 ${isDark ? "border-white/8 bg-white/[0.02]" : "border-border bg-secondary/20"}`}>
        <p className={`text-xs font-medium mb-1.5 ${textSecondary}`}>
          Need help finding your business?
        </p>
        <a
          href="tel:8058363557"
          className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors ${
            isDark
              ? "text-[hsl(var(--nl-electric))] hover:text-[hsl(var(--nl-sky))]"
              : "text-primary hover:text-primary/80"
          }`}
        >
          <Phone className="h-4 w-4" />
          Call / Text Now
        </a>
        <p className={`text-xs mt-1 font-mono ${textTertiary}`}>
          (805) 836-3557
        </p>
      </div>
    </div>
  );
}
