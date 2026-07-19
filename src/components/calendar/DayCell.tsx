import { cn } from "@/lib/utils";
import { EventDots } from "./EventDots";
import type { CalendarEventLike } from "./types";

interface DayCellProps {
  date: Date;
  events: CalendarEventLike[];
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isLastCol: boolean;
  isLastRow: boolean;
  onSelect: (d: Date) => void;
}

/**
 * Single month-grid cell. Uses semantic tokens only; no hardcoded colors.
 * Meets a11y hit-target (≥44px min-height on mobile) and provides distinct
 * treatments for today (filled circle) vs selected (ring outline).
 */
export function DayCell({
  date,
  events,
  inMonth,
  isToday,
  isSelected,
  isLastCol,
  isLastRow,
  onSelect,
}: DayCellProps) {
  const label = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      aria-label={`${label}${isToday ? ", today" : ""}${
        isSelected ? ", selected" : ""
      }${events.length ? `, ${events.length} event${events.length > 1 ? "s" : ""}` : ""}`}
      aria-pressed={isSelected}
      className={cn(
        "flex flex-col items-start text-left p-1.5 sm:p-2 min-h-11 sm:min-h-[92px]",
        "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        "hover:bg-[hsla(var(--foreground)/0.04)]",
        !inMonth && "bg-[hsla(var(--muted)/0.35)]",
      )}
      style={{
        flex: "1 1 0",
        minWidth: 0,
        borderRight: isLastCol ? "none" : "1px solid hsl(var(--cal-grid-line))",
        borderBottom: isLastRow ? "none" : "1px solid hsl(var(--cal-grid-line))",
        background: isSelected && !isToday ? "hsla(var(--primary)/0.06)" : undefined,
        boxShadow: isSelected
          ? "inset 0 0 0 1.5px hsl(var(--cal-selected))"
          : undefined,
      }}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center text-[11px] sm:text-xs leading-none font-medium tabular-nums",
        )}
        style={{
          minWidth: 22,
          height: 22,
          borderRadius: 999,
          padding: "0 6px",
          background: isToday ? "hsl(var(--cal-today))" : "transparent",
          color: isToday
            ? "hsl(var(--primary-foreground))"
            : inMonth
              ? "hsl(var(--foreground))"
              : "hsl(var(--muted-foreground) / 0.55)",
          fontWeight: isToday ? 700 : 500,
          boxShadow: isToday
            ? "0 2px 8px -2px hsla(var(--primary) / 0.55)"
            : undefined,
        }}
      >
        {date.getDate()}
      </span>

      {events.length > 0 && (
        <span className="mt-auto pt-1">
          <EventDots events={events} max={3} />
        </span>
      )}
    </button>
  );
}
