import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { systemModules, statusColor, allCategories, type SystemCategory } from "@/lib/systemRegistry";

interface GlobalModuleSearchProps {
  /** "admin" = dark/glass header styling, "employee" = default token styling */
  variant?: "admin" | "employee";
}

export function GlobalModuleSearch({ variant = "employee" }: GlobalModuleSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? systemModules.filter((m) => {
          const hay = `${m.name} ${m.key} ${m.description} ${m.category}`.toLowerCase();
          return hay.includes(q);
        })
      : systemModules;
    const byCat = new Map<SystemCategory, typeof systemModules>();
    for (const cat of allCategories) byCat.set(cat, []);
    for (const m of filtered) byCat.get(m.category)?.push(m);
    return allCategories
      .map((cat) => ({ cat, items: byCat.get(cat) || [] }))
      .filter((g) => g.items.length > 0);
  }, [query]);

  const handleSelect = (route: string) => {
    setOpen(false);
    setQuery("");
    navigate(route);
  };

  const buttonCls =
    variant === "admin"
      ? "p-2 rounded-xl transition-all duration-200 hover:bg-white/10 group"
      : "p-2 rounded-md transition-colors hover:bg-accent";
  const iconCls =
    variant === "admin"
      ? "h-4 w-4 text-white/60 group-hover:text-white transition-colors"
      : "h-4 w-4 text-muted-foreground";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonCls}
        aria-label="Search modules"
        title="Search modules (⌘K)"
      >
        <Search className={iconCls} />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search modules by name, category, or keyword…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[420px]">
          <CommandEmpty>No modules found for "{query}"</CommandEmpty>
          {grouped.map(({ cat, items }) => (
            <CommandGroup key={cat} heading={cat}>
              {items.map((m) => {
                const route = m.routes?.[0];
                const disabled = !route;
                return (
                  <CommandItem
                    key={m.key}
                    value={`${m.name} ${m.key} ${m.category} ${m.description}`}
                    disabled={disabled}
                    onSelect={() => route && handleSelect(route)}
                    className="flex items-start gap-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{m.name}</span>
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider shrink-0"
                          style={{
                            color: statusColor[m.status],
                            background: `${statusColor[m.status]}18`,
                          }}
                        >
                          {m.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {m.description}
                      </p>
                    </div>
                    {route && (
                      <span className="text-[10px] text-muted-foreground/70 font-mono shrink-0">
                        {route}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
