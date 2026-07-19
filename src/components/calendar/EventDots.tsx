import { eventColor } from "./tokens";
import type { CalendarEventLike } from "./types";

interface EventDotsProps {
  events: CalendarEventLike[];
  /** Max distinct dots to show before collapsing to +N. Default 3. */
  max?: number;
  className?: string;
}

/**
 * Renders up to `max` colored dots representing distinct event kinds on a day,
 * plus a "+N" chip for overflow. Colors resolve from CSS design tokens.
 */
export function EventDots({ events, max = 3, className }: EventDotsProps) {
  if (!events.length) return null;

  // Preserve chronological order but dedupe by kind
  const seen = new Set<string>();
  const dots: string[] = [];
  for (const e of events) {
    const k = (e.kind || "default") as string;
    if (!seen.has(k)) {
      seen.add(k);
      dots.push(k);
    }
  }
  const visible = dots.slice(0, max);
  const overflow = events.length - visible.length;

  return (
    <span
      className={
        "flex items-center gap-1 " + (className || "")
      }
      aria-hidden="true"
    >
      {visible.map((k) => (
        <span
          key={k}
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ background: eventColor(k) }}
        />
      ))}
      {overflow > 0 && (
        <span className="text-[9px] leading-none font-semibold text-muted-foreground/70">
          +{overflow}
        </span>
      )}
    </span>
  );
}
