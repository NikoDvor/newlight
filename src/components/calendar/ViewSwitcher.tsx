import { cn } from "@/lib/utils";

export type CalendarView = "month" | "week" | "day" | "agenda";

interface ViewSwitcherProps<V extends string> {
  value: V;
  onChange: (v: V) => void;
  views?: readonly { key: V; label: string; icon?: React.ComponentType<{ className?: string }> }[];
  className?: string;
}

/**
 * Shared segmented control for switching calendar views.
 * All colors use semantic tokens; each option is a ≥44px touch target on mobile.
 */
export function ViewSwitcher<V extends string>({
  value,
  onChange,
  views,
  className,
}: ViewSwitcherProps<V>) {
  const items =
    views ??
    ([
      { key: "month" as V, label: "Month" },
      { key: "week" as V, label: "Week" },
    ] as { key: V; label: string; icon?: React.ComponentType<{ className?: string }> }[]);

  return (
    <div
      role="tablist"
      aria-label="Calendar view"
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-muted/40 p-0.5 shrink-0",
        className,
      )}
    >
      {items.map(({ key, label, icon: Icon }) => {
        const active = value === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={cn(
              "min-h-11 px-3 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-semibold capitalize rounded-full transition-colors inline-flex items-center gap-1.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
