import { useMemo } from "react";
import { DayCell } from "./DayCell";
import type { CalendarEventLike } from "./types";

interface MonthGridProps {
  /** Any date within the month to render. */
  monthCursor: Date;
  selectedDay: Date;
  events: CalendarEventLike[];
  onSelectDay: (d: Date) => void;
  /** Optional: full weekday names on desktop, single letter on mobile. */
  weekStartsOn?: 0 | 1;
}

const DOW_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
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

/**
 * Bulletproof 7-column month grid built on flexbox (not CSS Grid) to bypass
 * any legacy `.grid-cols-N:not(.grid-preserve)` mobile-collapse rules that
 * may be cached in older CSS bundles.
 */
export function MonthGrid({
  monthCursor,
  selectedDay,
  events,
  onSelectDay,
  weekStartsOn = 0,
}: MonthGridProps) {
  const today = useMemo(() => new Date(), []);

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(monthCursor), weekStartsOn);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [monthCursor, weekStartsOn]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalendarEventLike[]>();
    for (const e of events) {
      const d = e.startsAt instanceof Date ? e.startsAt : new Date(e.startsAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = m.get(key);
      if (arr) arr.push(e);
      else m.set(key, [e]);
    }
    return m;
  }, [events]);

  const dowOrder = useMemo(() => {
    if (!weekStartsOn) return DOW_FULL;
    return [...DOW_FULL.slice(weekStartsOn), ...DOW_FULL.slice(0, weekStartsOn)];
  }, [weekStartsOn]);
  const dowShortOrder = useMemo(() => {
    if (!weekStartsOn) return DOW_SHORT;
    return [
      ...DOW_SHORT.slice(weekStartsOn),
      ...DOW_SHORT.slice(0, weekStartsOn),
    ];
  }, [weekStartsOn]);

  return (
    <div
      className="w-full rounded-xl overflow-hidden bg-card/70"
      style={{ border: "1px solid hsl(var(--cal-grid-line))" }}
    >
      {/* Day-of-week header row */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          borderBottom: "1px solid hsl(var(--cal-grid-line))",
          background: "hsla(var(--muted) / 0.3)",
        }}
      >
        {dowOrder.map((d, i) => (
          <div
            key={i}
            className="py-2 text-center text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            style={{
              flex: "1 1 0",
              minWidth: 0,
              borderRight:
                i < 6 ? "1px solid hsl(var(--cal-grid-line))" : "none",
            }}
          >
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{dowShortOrder[i]}</span>
          </div>
        ))}
      </div>

      {/* 6 week rows, each flex row of 7 equal cells */}
      {Array.from({ length: 6 }, (_, weekIdx) => {
        const isLastRow = weekIdx === 5;
        return (
          <div
            key={weekIdx}
            style={{ display: "flex", flexDirection: "row" }}
          >
            {Array.from({ length: 7 }, (_, colIdx) => {
              const d = days[weekIdx * 7 + colIdx];
              const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
              return (
                <DayCell
                  key={colIdx}
                  date={d}
                  events={eventsByDay.get(key) || []}
                  inMonth={d.getMonth() === monthCursor.getMonth()}
                  isToday={sameDay(d, today)}
                  isSelected={sameDay(d, selectedDay)}
                  isLastCol={colIdx === 6}
                  isLastRow={isLastRow}
                  onSelect={onSelectDay}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
