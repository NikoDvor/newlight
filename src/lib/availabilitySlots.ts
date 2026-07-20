// Shared availability slot computation.
// Generates concrete future booking slots given weekly availability windows,
// existing bookings, blackout ranges, and a minimum notice window.

export type WeeklyAvailabilityMap = Record<
  string,
  { enabled?: boolean; start?: string; end?: string } | undefined
>;

export interface DowAvailabilityRow {
  day_of_week: number; // 0=Sun..6=Sat
  start_time: string;
  end_time: string;
  enabled?: boolean;
  is_active?: boolean;
  slot_interval_minutes?: number | null;
}

export interface BookedRange {
  start: Date;
  end: Date;
}

export interface BlackoutRange {
  start: Date;
  end: Date;
}

export interface ComputeSlotOptions {
  durationMinutes: number;
  slotIntervalMinutes?: number; // step between slot starts; defaults to durationMinutes
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  minNoticeMinutes: number; // must be >= (now + this) to be bookable
  daysAhead: number; // scan this many days starting today
  booked?: BookedRange[];
  blackouts?: BlackoutRange[];
  now?: Date;
}

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function parseHM(s: string | undefined | null, fallback: [number, number]): [number, number] {
  if (!s) return fallback;
  const [h, m] = s.split(":").map(Number);
  return [Number.isFinite(h) ? h : fallback[0], Number.isFinite(m) ? m : fallback[1]];
}

/** Normalize a weekly-map (mon/tue/...) into per-DOW rows. */
export function weeklyMapToRows(availability: WeeklyAvailabilityMap | null | undefined): DowAvailabilityRow[] {
  if (!availability) return [];
  const rows: DowAvailabilityRow[] = [];
  WEEKDAY_KEYS.forEach((key, dow) => {
    const cfg = availability[key];
    if (!cfg || cfg.enabled === false) return;
    rows.push({
      day_of_week: dow,
      start_time: cfg.start || "09:00",
      end_time: cfg.end || "17:00",
      enabled: true,
    });
  });
  return rows;
}

function isInBlackout(d: Date, blackouts: BlackoutRange[]): boolean {
  for (const b of blackouts) {
    if (d >= b.start && d <= b.end) return true;
  }
  return false;
}

function overlapsBooked(slotStart: Date, slotEnd: Date, booked: BookedRange[]): boolean {
  for (const b of booked) {
    if (slotStart < b.end && slotEnd > b.start) return true;
  }
  return false;
}

/**
 * Compute future bookable slots. Always includes today. Filters everything
 * before `now + minNoticeMinutes`, everything overlapping existing bookings,
 * everything falling inside a blackout range.
 */
export function computeAvailableSlots(
  rows: DowAvailabilityRow[],
  opts: ComputeSlotOptions,
): Date[] {
  const now = opts.now ?? new Date();
  const cutoff = new Date(now.getTime() + (opts.minNoticeMinutes || 0) * 60_000);
  const duration = opts.durationMinutes;
  const step = opts.slotIntervalMinutes || duration || 30;
  const bufBefore = opts.bufferBeforeMinutes || 0;
  const bufAfter = opts.bufferAfterMinutes || 0;
  const booked = opts.booked || [];
  const blackouts = opts.blackouts || [];
  const daysAhead = Math.max(1, opts.daysAhead);

  const enabledRows = rows.filter(r => r.enabled !== false && (r.is_active !== false));
  const byDow = new Map<number, DowAvailabilityRow>();
  for (const r of enabledRows) if (!byDow.has(r.day_of_week)) byDow.set(r.day_of_week, r);

  const out: Date[] = [];
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);

  for (let i = 0; i < daysAhead; i++) {
    const day = new Date(base);
    day.setDate(base.getDate() + i);
    const dow = day.getDay();
    const row = byDow.get(dow);
    if (!row) continue;
    if (isInBlackout(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12), blackouts)) continue;

    const [sh, sm] = parseHM(row.start_time, [9, 0]);
    const [eh, em] = parseHM(row.end_time, [17, 0]);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const stepMin = row.slot_interval_minutes || step;

    for (let m = startMin; m + duration + bufAfter <= endMin; m += stepMin) {
      if (m - bufBefore < startMin && bufBefore > 0) continue;
      const slotStart = new Date(day);
      slotStart.setHours(Math.floor(m / 60), m % 60, 0, 0);
      if (slotStart < cutoff) continue;
      const slotEnd = new Date(slotStart.getTime() + duration * 60_000);
      if (overlapsBooked(slotStart, slotEnd, booked)) continue;
      out.push(slotStart);
    }
  }
  return out;
}

export const DEFAULT_MIN_NOTICE_MINUTES = 60;
