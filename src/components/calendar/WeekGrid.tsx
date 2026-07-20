import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { eventColor, resolveEventKind } from "./tokens";
import type { CalendarEventLike } from "./types";

interface WeekGridProps {
  /** Any date within the week to render. */
  weekCursor: Date;
  selectedDay: Date;
  events: CalendarEventLike[];
  onSelectDay: (d: Date) => void;
  onEventClick?: (e: CalendarEventLike) => void;
  /** Start hour of visible day (24h). Default 6. */
  startHour?: number;
  /** End hour of visible day (24h, inclusive top). Default 21. */
  endHour?: number;
  weekStartsOn?: 0 | 1;
}

const DOW_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

function startOfWeek(d: Date, weekStartsOn = 0) {
  const x = new Date(d);
  const day = (x.getDay() - weekStartsOn + 7) % 7;
  x.setDate(d.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(d.getDate() + n);
  return x;
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * 7-column day header + selected-day time-axis agenda.
 * Uses tokens only; ≥44px header cells; slots rendered in 30-min increments.
 */
export function WeekGrid({
  weekCursor,
  selectedDay,
  events,
  onSelectDay,
  onEventClick,
  startHour = 6,
  endHour = 21,
  weekStartsOn = 0,
}: WeekGridProps) {
  const today = useMemo(() => new Date(), []);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(weekCursor, weekStartsOn), i)),
    [weekCursor, weekStartsOn],
  );

  const slots = useMemo(() => {
    const list: { h: number; m: number }[] = [];
    for (let h = startHour; h < endHour; h++) {
      list.push({ h, m: 0 });
      list.push({ h, m: 30 });
    }
    list.push({ h: endHour, m: 0 });
    return list;
  }, [startHour, endHour]);

  const dayEvents = useMemo(
    () =>
      events
        .filter((e) =>
          sameDay(e.startsAt instanceof Date ? e.startsAt : new Date(e.startsAt), selectedDay),
        )
        .sort((a, b) => {
          const A = a.startsAt instanceof Date ? a.startsAt : new Date(a.startsAt);
          const B = b.startsAt instanceof Date ? b.startsAt : new Date(b.startsAt);
          return A.getTime() - B.getTime();
        }),
    [events, selectedDay],
  );

  return (
    <div className="space-y-3">
      {/* Day header row — flex to avoid grid-collapse edge cases */}
      <div
        style={{ display: "flex", flexDirection: "row", gap: 6 }}
        role="tablist"
        aria-label="Days of week"
      >
        {days.map((d, i) => {
          const isToday = sameDay(d, today);
          const isSelected = sameDay(d, selectedDay);
          const label = d.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          });
          return (
            <button
              key={i}
              role="tab"
              aria-selected={isSelected}
              aria-label={`${label}${isToday ? ", today" : ""}`}
              onClick={() => onSelectDay(d)}
              className={cn(
                "min-h-11 flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-card/70 hover:bg-[hsla(var(--foreground)/0.04)]",
              )}
              style={{
                border: `1px solid ${
                  isSelected ? "hsl(var(--cal-selected))" : "hsl(var(--cal-grid-line))"
                }`,
                boxShadow: isToday && !isSelected ? "inset 0 0 0 1.5px hsl(var(--cal-today))" : undefined,
              }}
            >
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider font-semibold leading-none",
                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {DOW_SHORT[d.getDay()]}
              </span>
              <span
                className={cn(
                  "text-base font-bold tabular-nums leading-none",
                  isSelected
                    ? "text-primary-foreground"
                    : isToday
                      ? "text-primary"
                      : "text-foreground",
                )}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Time-axis agenda for selected day */}
      <div
        className="rounded-2xl overflow-hidden bg-card/70"
        style={{ border: "1px solid hsl(var(--cal-grid-line))" }}
      >
        <div className="max-h-[58vh] overflow-y-auto divide-y divide-border/50">
          {slots.map(({ h, m }) => {
            const slotStart = new Date(selectedDay);
            slotStart.setHours(h, m, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + 30 * 60_000);
            const inSlot = dayEvents.filter((e) => {
              const t = e.startsAt instanceof Date ? e.startsAt : new Date(e.startsAt);
              return t >= slotStart && t < slotEnd;
            });
            const hh = h % 12 === 0 ? 12 : h % 12;
            const ampm = h < 12 ? "AM" : "PM";
            const label = `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
            return (
              <div
                key={`${h}-${m}`}
                className="grid min-h-11"
                style={{ gridTemplateColumns: "68px 1fr" }}
              >
                <div className="px-2 py-2 text-[10px] text-muted-foreground/70 text-right font-medium tabular-nums">
                  {label}
                </div>
                <div className="px-2 py-1.5 space-y-1">
                  {inSlot.map((e) => {
                    const tone = eventColor(resolveEventKind(e.kind as string));
                    const start = e.startsAt instanceof Date ? e.startsAt : new Date(e.startsAt);
                    return (
                      <button
                        key={e.id}
                        onClick={() => onEventClick?.(e)}
                        className="w-full min-h-11 text-left px-2.5 py-2 rounded-md text-xs truncate transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        style={{
                          background: `color-mix(in oklab, ${tone} 18%, transparent)`,
                          borderLeft: `3px solid ${tone}`,
                        }}
                      >
                        <span className="text-foreground font-medium">{e.title}</span>
                        <span className="text-muted-foreground ml-2 text-[10px]">
                          {fmtTime(start)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
