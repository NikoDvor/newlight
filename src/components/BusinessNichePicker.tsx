import { useState, useRef, useEffect, useMemo } from "react";
import { NICHE_REGISTRY, type NicheDefinition } from "@/lib/workspaceNiches";
import { Search, Sparkles, Check } from "lucide-react";

// Aliases for search — maps synonyms to niche IDs
const NICHE_ALIASES: Record<string, string[]> = {
  med_spa: ["medspa", "medical spa", "aesthetics", "botox", "injectables"],
  dentist: ["dental", "dental practice", "dental office", "oral"],
  chiropractor: ["chiro", "chiropractic"],
  financial_advisor: ["financial planner", "wealth advisor", "cfp"],
  cpa_accounting: ["cpa", "accountant", "bookkeeper", "bookkeeping", "accounting firm", "cpa firm"],
  hvac: ["heating", "cooling", "air conditioning", "furnace"],
  barbershop: ["barber", "barber shop", "mens grooming"],
  hair_salon: ["salon", "hair stylist", "beauty salon"],
  marketing_agency: ["digital marketing", "ad agency", "social media agency", "seo agency"],
  real_estate_agent: ["realtor", "real estate"],
  real_estate_team: ["real estate group", "realty team"],
  saas_startup: ["saas", "saas company", "software company"],
  law_firm_general: ["lawyer", "attorney", "legal"],
  personal_injury_law: ["pi lawyer", "injury attorney"],
  plumbing: ["plumber"],
  roofing: ["roofer"],
  landscaping: ["lawn care", "yard maintenance"],
  cleaning_company: ["cleaning service", "maid service", "janitorial"],
  restaurant: ["cafe", "diner", "eatery"],
  consulting_firm: ["consultant", "management consulting"],
  insurance_agency: ["insurance agent", "insurance broker"],
  mortgage_broker: ["mortgage lender", "mortgage company"],
  physical_therapy: ["pt clinic", "physio"],
  plastic_surgery: ["cosmetic surgery", "plastic surgeon"],
  yoga_studio: ["pilates", "yoga"],
  fitness_gym: ["gym", "fitness", "crossfit"],
  auto_shop: ["auto repair", "mechanic", "car detailing", "auto detail", "automotive"],
  shopify_brand: ["shopify store", "online store"],
  nonprofit: ["non-profit", "charity", "ngo"],
};

// Quick picks — most commonly selected niches shown as chips
const QUICK_PICK_IDS = [
  "med_spa", "dentist", "hvac", "marketing_agency", "real_estate_team",
  "cpa_accounting", "barbershop", "financial_advisor", "law_firm_general", "plumbing",
];

// Fallback niche for "Other / Custom Business"
const OTHER_NICHE_ID = "__other_custom__";

/** Maps a niche selection to legacy clients.industry value */
export function nicheToLegacyIndustry(niche: NicheDefinition | null): string {
  if (!niche) return "";
  // Map to the closest INDUSTRY_OPTIONS value for backward compat
  const map: Record<string, string> = {
    healthcare_wellness: "healthcare",
    financial_legal: "financial services",
    agencies_professional: "agency",
    home_services: "construction",
    real_estate: "real estate",
    ecommerce_retail: "e-commerce",
    hospitality_local: "restaurant",
    saas_tech: "e-commerce",
    logistics_industrial: "construction",
    education_coaching: "consulting",
    nonprofit_community: "other",
  };
  return map[niche.industry] || "other";
}

/** Maps a niche selection to legacy clients.provisional_profile value */
export function nicheToLegacyProfile(niche: NicheDefinition | null): string {
  if (!niche) return "custom_hybrid";
  const map: Record<string, string> = {
    appointments: "appointment_local",
    high_ticket_recurring: "consultative_sales",
    retainers: "consultative_sales",
    projects: "project_service",
    ecommerce: "membership_recurring",
    transactions: "appointment_local",
    subscription_saas: "membership_recurring",
    enterprise_accounts: "consultative_sales",
  };
  return map[niche.archetype] || "custom_hybrid";
}

interface BusinessNichePickerProps {
  value: string | null;
  onChange: (nicheId: string, legacyIndustry: string, legacyProfile: string) => void;
  /** Custom label for "Other" fallback */
  customLabel?: string;
  onCustomLabelChange?: (label: string) => void;
  /** Dark theme for admin modals */
  variant?: "light" | "dark";
  className?: string;
}

export function BusinessNichePicker({
  value,
  onChange,
  customLabel = "",
  onCustomLabelChange,
  variant = "light",
  className = "",
}: BusinessNichePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = variant === "dark";

  // Close on outside click
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

  // Search with alias support
  const filtered = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase().trim();
    const scored: { niche: NicheDefinition; score: number }[] = [];

    for (const n of NICHE_REGISTRY) {
      let score = 0;
      if (n.label.toLowerCase().includes(q)) score = 10;
      if (n.label.toLowerCase().startsWith(q)) score = 20;
      if (n.label.toLowerCase() === q) score = 30;

      // Check aliases
      const aliases = NICHE_ALIASES[n.id];
      if (aliases) {
        for (const a of aliases) {
          if (a.includes(q)) score = Math.max(score, 8);
          if (a.startsWith(q)) score = Math.max(score, 12);
        }
      }

      if (score > 0) scored.push({ niche: n, score });
    }

    return scored.sort((a, b) => b.score - a.score).map((s) => s.niche);
  }, [query]);

  // Quick picks
  const quickPicks = useMemo(
    () => QUICK_PICK_IDS.map((id) => NICHE_REGISTRY.find((n) => n.id === id)).filter(Boolean) as NicheDefinition[],
    []
  );

  const selectedNiche = value && value !== OTHER_NICHE_ID
    ? NICHE_REGISTRY.find((n) => n.id === value)
    : null;

  const displayLabel = value === OTHER_NICHE_ID
    ? (customLabel || "Other / Custom Business")
    : selectedNiche?.label || "";

  const handleSelect = (n: NicheDefinition) => {
    onChange(n.id, nicheToLegacyIndustry(n), nicheToLegacyProfile(n));
    setOpen(false);
    setQuery("");
  };

  const handleOther = () => {
    onChange(OTHER_NICHE_ID, "other", "custom_hybrid");
    setOpen(false);
    setQuery("");
  };

  // Show list: quick picks when no query, filtered results when query
  const showList = open;
  const listItems = query ? filtered : [];
  const showQuickPicks = open && !query;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <div
        className={`flex items-center h-10 w-full rounded-md border text-sm px-3 cursor-pointer transition-colors ${
          isDark
            ? "bg-white/[0.06] border-white/10 text-white hover:border-[hsl(var(--nl-electric))]/30"
            : "border-input bg-background text-foreground hover:border-primary/30"
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
              placeholder="Search or select business type…"
              className={`bg-transparent outline-none w-full text-sm ${
                isDark ? "text-white placeholder:text-white/30" : "placeholder:text-muted-foreground"
              }`}
            />
          </div>
        ) : (
          <span className={displayLabel ? "" : isDark ? "text-white/30" : "text-muted-foreground"}>
            {displayLabel || "Search or select the client's business type"}
          </span>
        )}
      </div>

      {/* Dropdown */}
      {showList && (
        <div
          className={`absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-md border shadow-lg ${
            isDark
              ? "bg-[hsl(218,35%,10%)] border-white/10"
              : "bg-popover border-border"
          }`}
        >
          {/* Quick Picks */}
          {showQuickPicks && (
            <div className="p-2">
              <div className={`text-[10px] uppercase tracking-wider mb-1.5 px-1 flex items-center gap-1 ${isDark ? "text-white/30" : "text-muted-foreground"}`}>
                <Sparkles className="h-3 w-3" /> Popular Business Types
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickPicks.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleSelect(n)}
                    className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                      value === n.id
                        ? isDark
                          ? "bg-[hsl(var(--nl-electric))]/15 border-[hsl(var(--nl-electric))]/30 text-white font-medium"
                          : "bg-primary/10 border-primary/30 text-primary font-medium"
                        : isDark
                        ? "bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08]"
                        : "bg-secondary/50 border-border text-foreground hover:bg-secondary"
                    }`}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
              <div className={`my-2 h-px ${isDark ? "bg-white/5" : "bg-border"}`} />
              <div className={`text-[10px] uppercase tracking-wider mb-1 px-1 ${isDark ? "text-white/25" : "text-muted-foreground/70"}`}>
                All Business Types — type to search
              </div>
              {/* Show full list when no query */}
              {NICHE_REGISTRY.map((n) => (
                <NicheListItem key={n.id} niche={n} selected={value === n.id} isDark={isDark} onSelect={handleSelect} />
              ))}
            </div>
          )}

          {/* Filtered results */}
          {query && listItems.length === 0 && (
            <div className={`px-3 py-3 text-sm ${isDark ? "text-white/40" : "text-muted-foreground"}`}>
              No matches for "{query}"
            </div>
          )}
          {query && listItems.map((n) => (
            <NicheListItem key={n.id} niche={n} selected={value === n.id} isDark={isDark} onSelect={handleSelect} />
          ))}

          {/* Other / Custom option */}
          <div className={`border-t ${isDark ? "border-white/5" : "border-border"}`}>
            <button
              type="button"
              onClick={handleOther}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between ${
                value === OTHER_NICHE_ID
                  ? isDark ? "bg-white/10 text-white font-medium" : "bg-accent text-accent-foreground font-medium"
                  : isDark ? "text-white/60 hover:bg-white/[0.04]" : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              <span>Other / Custom Business</span>
              {value === OTHER_NICHE_ID && <Check className="h-4 w-4 shrink-0" />}
            </button>
          </div>
        </div>
      )}

      {/* Custom label input for "Other" */}
      {value === OTHER_NICHE_ID && (
        <input
          value={customLabel}
          onChange={(e) => onCustomLabelChange?.(e.target.value)}
          placeholder="Describe the business type…"
          className={`mt-2 w-full h-9 rounded-md border text-sm px-3 ${
            isDark
              ? "bg-white/[0.04] border-white/10 text-white placeholder:text-white/25"
              : "border-input bg-background text-foreground placeholder:text-muted-foreground"
          }`}
        />
      )}
    </div>
  );
}

function NicheListItem({
  niche,
  selected,
  isDark,
  onSelect,
}: {
  niche: NicheDefinition;
  selected: boolean;
  isDark: boolean;
  onSelect: (n: NicheDefinition) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(niche)}
      className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between min-h-[40px] ${
        selected
          ? isDark ? "bg-white/10 text-white font-medium" : "bg-accent text-accent-foreground font-medium"
          : isDark ? "text-white/80 hover:bg-white/[0.06]" : "text-popover-foreground hover:bg-accent/50"
      }`}
    >
      <div className="flex-1 min-w-0">
        <span>{niche.label}</span>
        <span className={`ml-2 text-[10px] capitalize ${isDark ? "text-white/25" : "text-muted-foreground/60"}`}>
          {niche.industry.replace(/_/g, " ")}
        </span>
      </div>
      {selected && <Check className="h-4 w-4 shrink-0 ml-2" />}
    </button>
  );
}
