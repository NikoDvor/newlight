/**
 * Revenue-by-period maths.
 *
 * There is exactly ONE definition of "won revenue" in this app: the
 * auto-logged `financial_adjustments` rows written by the
 * `auto_log_closed_won_revenue` trigger when a deal hits closed_won (and, for
 * per-rep views, the closed_won deals themselves, which are the same rows the
 * trigger fires on). Nothing here re-defines revenue — it only buckets it.
 */

export interface RevenueEvent {
  /** Dollar amount recognised. */
  amount: number;
  /** ISO timestamp the revenue is recognised on. */
  at: string;
}

export type PeriodKey = "today" | "week" | "month" | "quarter" | "year" | "all";

export interface PeriodRow {
  key: PeriodKey;
  label: string;
  /** Comparison caption, e.g. "vs last week". Null for all-time. */
  compareLabel: string | null;
  total: number;
  count: number;
  prior: number;
  /** Fractional change vs the prior equivalent period. Null when incomparable. */
  changePct: number | null;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const startOfWeek = (d: Date) => {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfQuarter = (d: Date) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);

/** [currentStart, priorStart) window pairs for each period. */
function bounds(now: Date, key: PeriodKey): { start: Date; priorStart: Date; priorEnd: Date } | null {
  switch (key) {
    case "today": {
      const start = startOfDay(now);
      const priorStart = new Date(start);
      priorStart.setDate(priorStart.getDate() - 1);
      return { start, priorStart, priorEnd: start };
    }
    case "week": {
      const start = startOfWeek(now);
      const priorStart = new Date(start);
      priorStart.setDate(priorStart.getDate() - 7);
      return { start, priorStart, priorEnd: start };
    }
    case "month": {
      const start = startOfMonth(now);
      const priorStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      return { start, priorStart, priorEnd: start };
    }
    case "quarter": {
      const start = startOfQuarter(now);
      const priorStart = new Date(start.getFullYear(), start.getMonth() - 3, 1);
      return { start, priorStart, priorEnd: start };
    }
    case "year": {
      const start = startOfYear(now);
      const priorStart = new Date(start.getFullYear() - 1, 0, 1);
      return { start, priorStart, priorEnd: start };
    }
    default:
      return null;
  }
}

const META: { key: PeriodKey; label: string; compareLabel: string | null }[] = [
  { key: "today", label: "Today", compareLabel: "vs yesterday" },
  { key: "week", label: "This Week", compareLabel: "vs last week" },
  { key: "month", label: "This Month", compareLabel: "vs last month" },
  { key: "quarter", label: "This Quarter", compareLabel: "vs last quarter" },
  { key: "year", label: "This Year", compareLabel: "vs last year" },
  { key: "all", label: "All-Time", compareLabel: null },
];

export function computeRevenuePeriods(events: RevenueEvent[], now: Date = new Date()): PeriodRow[] {
  const rows = events
    .map((e) => ({ amount: Number(e.amount) || 0, t: new Date(e.at).getTime() }))
    .filter((e) => Number.isFinite(e.t));

  return META.map(({ key, label, compareLabel }) => {
    if (key === "all") {
      return {
        key,
        label,
        compareLabel,
        total: rows.reduce((s, r) => s + r.amount, 0),
        count: rows.length,
        prior: 0,
        changePct: null,
      };
    }
    const b = bounds(now, key)!;
    const startMs = b.start.getTime();
    const priorStartMs = b.priorStart.getTime();
    const priorEndMs = b.priorEnd.getTime();

    let total = 0;
    let count = 0;
    let prior = 0;
    for (const r of rows) {
      if (r.t >= startMs) {
        total += r.amount;
        count++;
      } else if (r.t >= priorStartMs && r.t < priorEndMs) {
        prior += r.amount;
      }
    }
    const changePct = prior > 0 ? (total - prior) / prior : total > 0 ? null : 0;
    return { key, label, compareLabel, total, count, prior, changePct };
  });
}
