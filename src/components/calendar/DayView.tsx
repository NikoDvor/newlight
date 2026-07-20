import { useMemo } from "react";
import { eventColor, resolveEventKind, EVENT_LABEL } from "./tokens";
import type { CalendarEventLike } from "./types";
import { CalendarEmptyState } from "./CalendarEmptyState";

interface DayViewProps {
  day: Date;
  events: CalendarEventLike[];
  onEventClick?: (e: CalendarEventLike) => void;
  /** Start hour of visible day (24h). Default 7. */
  startHour?: number;
  /** End hour (inclusive top). Default 20. */
  endHour?: number;
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Single-day time-axis view. Shared across CalendarPage, admin surfaces, etc. */
export function DayView({
  day,
  events,
  onEventClick,
  startHour = 7,
  endHour = 20,
}: DayViewProps) {
  const dayEvents = useMemo(
    () =>
      events.filter((e) =>
        sameDay(e.startsAt instanceof Date ? e.startsAt : new Date(e.startsAt), day),
      ),
    [events, day],
  );
  const hours = useMemo(
    () => Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i),
    [startHour, endHour],
  );

  return (
    <div
      className="rounded-2xl overflow-hidden bg-card/70"
      style={{ border: "1px solid hsl(var(--cal-grid-line))" }}
    >
      <div
        className="p-3"
        style={{ borderBottom: "1px solid hsl(var(--cal-grid-line))" }}
      >
        <p className="text-sm font-semibold text-foreground">
          {day.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <p className="text-xs text-muted-foreground">
          {dayEvents.length} {dayEvents.length === 1 ? "appointment" : "appointments"}
        </p>
      </div>

      {dayEvents.length === 0 ? (
        <div className="p-4">
          <CalendarEmptyState compact />
        </div>
      ) : (
        hours.map((hour) => {
          const inHour = dayEvents.filter(
            (e) => (e.startsAt instanceof Date ? e.startsAt : new Date(e.startsAt)).getHours() === hour,
          );
          const hh = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
          const ampm = hour >= 12 ? "PM" : "AM";
          return (
            <div
              key={hour}
              className="flex min-h-[56px]"
              style={{ borderBottom: "1px solid hsl(var(--cal-grid-line))" }}
            >
              <div
                className="w-16 shrink-0 px-3 py-3 text-[11px] text-muted-foreground text-right tabular-nums"
                style={{ borderRight: "1px solid hsl(var(--cal-grid-line))" }}
              >
                {hh}:00 {ampm}
              </div>
              <div className="flex-1 min-w-0 p-1.5 space-y-1">
                {inHour.map((e) => {
                  const kind = resolveEventKind(e.kind as string);
                  const tone = eventColor(kind);
                  const start = e.startsAt instanceof Date ? e.startsAt : new Date(e.startsAt);
                  const end = e.endsAt
                    ? e.endsAt instanceof Date
                      ? e.endsAt
                      : new Date(e.endsAt)
                    : null;
                  return (
                    <button
                      key={e.id}
                      onClick={() => onEventClick?.(e)}
                      className="w-full min-h-11 flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      style={{
                        background: `color-mix(in oklab, ${tone} 12%, transparent)`,
                        borderLeft: `3px solid ${tone}`,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {e.title || "Untitled"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {fmtTime(start)}
                          {end ? ` – ${fmtTime(end)}` : ""}
                          {e.description ? ` · ${e.description}` : ""}
                        </p>
                      </div>
                      <span
                        className="text-[9px] px-2 py-0.5 rounded-full font-semibold shrink-0"
                        style={{
                          background: `color-mix(in oklab, ${tone} 18%, transparent)`,
                          color: tone,
                        }}
                      >
                        {EVENT_LABEL[kind]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
