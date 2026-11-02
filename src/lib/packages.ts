/**
 * NewLight packages & billing engine — ONE source of truth for prices and charge schedules.
 * Pure TypeScript (no imports): this exact file is copied to supabase/functions/_shared/packages.ts
 * so the app, Pay & Sign and the billing runner always agree. Keep the two copies identical.
 *
 * Packages (decided Nov 1–2, 2026):
 *   growth          Step 2.  Setup = 1 × average client value (min avg $6,000). 90-day guarantee.
 *                   Then ½ average client per month (retainer) OR commission 25% yr-1 / 10% after.
 *   command_center  Step 3.  $25,000 setup + $8,000/mo. No guarantee, no commission.
 *   enterprise      Steps 1+2+3 (+ exclusive metro market + dedicated strategist). $40,000 + $16,000/mo.
 *
 * Billing rules:
 *   - Monthly charges on the 1st (Pacific). First charge = partial month (start → month end) + next full month.
 *   - Growth monthly starts after the later of: guarantee end (day 90) / "Made it back".
 *   - Annual (all packages): 20% off, paid by WIRE on the signing date, renews on that date every year.
 *       growth   yr1 = (setup + 9 × monthly) × 0.8      command_center / enterprise yr1 = (setup + 11 × monthly) × 0.8
 *       every year after = 12 × monthly × 0.8
 *   - Payment plan (monthly cadence only): setup × 1.10 in 2 payments 30 days apart.
 *       growth: both Stripe.  command_center / enterprise: 1st by wire, 2nd by Stripe.
 *   - Setup method: growth → Stripe; command_center / enterprise → wire.  All monthly / commission → Stripe.
 */

export type PackageKey = "growth" | "command_center" | "enterprise";
export type Cadence = "monthly" | "annual";
export type Ongoing = "retainer" | "commission";
export type Method = "stripe" | "wire";

export interface PackageDefaults {
  key: PackageKey;
  label: string;
  steps: string;
  setup_fee: number | null;        // fixed packages
  monthly_fee: number | null;      // fixed packages
  setup_multiplier: number;        // growth: × average client
  monthly_multiplier: number;      // growth: × average client
  min_avg_client: number;          // growth floor
  commission_rate: number;         // %
  commission_rate_ongoing: number; // %
  annual_discount_pct: number;     // 20
  payment_plan_markup_pct: number; // 10
  discount_approval_pct: number;   // 15
  guarantee_days: number;          // 90 (growth only)
  min_ad_budget: number | null;
}

export const DEFAULT_PACKAGES: Record<PackageKey, PackageDefaults> = {
  growth: {
    key: "growth", label: "Growth", steps: "Step 2 — paid traffic turned into booked appointments",
    setup_fee: null, monthly_fee: null, setup_multiplier: 1, monthly_multiplier: 0.5, min_avg_client: 6000,
    commission_rate: 25, commission_rate_ongoing: 10, annual_discount_pct: 20, payment_plan_markup_pct: 10,
    discount_approval_pct: 15, guarantee_days: 90, min_ad_budget: 3000,
  },
  command_center: {
    key: "command_center", label: "Command Center", steps: "Step 3 — the app + pipeline that turns meetings into clients",
    setup_fee: 25000, monthly_fee: 8000, setup_multiplier: 0, monthly_multiplier: 0, min_avg_client: 0,
    commission_rate: 0, commission_rate_ongoing: 0, annual_discount_pct: 20, payment_plan_markup_pct: 10,
    discount_approval_pct: 15, guarantee_days: 0, min_ad_budget: null,
  },
  enterprise: {
    key: "enterprise", label: "Enterprise", steps: "Steps 1 + 2 + 3 — everything, plus an exclusive market and a dedicated strategist",
    setup_fee: 40000, monthly_fee: 16000, setup_multiplier: 0, monthly_multiplier: 0, min_avg_client: 0,
    commission_rate: 0, commission_rate_ongoing: 0, annual_discount_pct: 20, payment_plan_markup_pct: 10,
    discount_approval_pct: 15, guarantee_days: 0, min_ad_budget: null,
  },
};

export const PACKAGE_ORDER: PackageKey[] = ["growth", "command_center", "enterprise"];

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const money = (n: number | null | undefined, cents = false) =>
  n == null ? "—" : "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });

/** Default setup + monthly for a package (growth uses the average client value, floored). */
export function defaultPrices(d: PackageDefaults, avgClient: number | null): { setup: number; monthly: number } {
  if (d.key === "growth") {
    const avg = Math.max(d.min_avg_client, Number(avgClient || 0));
    return { setup: round2(avg * d.setup_multiplier), monthly: round2(avg * d.monthly_multiplier) };
  }
  return { setup: Number(d.setup_fee || 0), monthly: Number(d.monthly_fee || 0) };
}

export interface PlanInput {
  pkg: PackageDefaults;
  setup: number;
  monthly: number;
  cadence: Cadence;
  paymentPlan: boolean;          // monthly cadence only
  ongoing: Ongoing;              // growth only; others always retainer
  commissionRate?: number;
  commissionRateOngoing?: number;
  signDate: Date;                // date of signing / first payment
  madeBackDate?: Date | null;    // growth: when "Made it back" was confirmed (preview assumes by day 90)
}

export interface ChargeLine {
  date: string;                  // YYYY-MM-DD
  kind: "setup" | "setup_installment_1" | "setup_installment_2" | "monthly" | "annual" | "annual_renewal" | "commission";
  method: Method;
  amount: number | null;         // null = depends on revenue (commission)
  label: string;
  covers?: string;
}

export interface PlanResult {
  lines: ChargeLine[];
  milestones: { date: string; label: string }[];
  annualFirst: number | null;
  annualRenewal: number | null;
  paymentPlanTotal: number | null;
  firstYearTotal: number | null; // known amounts in the first 12 months (null if commission)
  billingStart: string | null;   // date ongoing billing starts (growth after guarantee)
  guaranteeEnds: string | null;
}

// ─── date helpers (calendar dates; UTC-safe) ───────────────────────────────
export function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
/** Calendar date in Pacific time for an instant. */
export function pacificDate(at: Date = new Date()): Date {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  return parseYmd(p);
}
export function addDaysUTC(d: Date, n: number): Date { const x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + n); return x; }
export function addMonthsUTC(d: Date, n: number): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
  x.setUTCDate(Math.min(d.getUTCDate(), last));
  return x;
}
export function addYearsUTC(d: Date, n: number): Date { return addMonthsUTC(d, 12 * n); }
export const daysInMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
export const firstOfNextMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
const fmtShort = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const monthName = (d: Date) => d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });

/**
 * First monthly charge for service starting on `start`:
 * charged on the next 1st (or on `start` itself if it IS the 1st) = partial (start → month end) + the next full month.
 */
export function firstMonthlyCharge(start: Date, monthly: number): { date: Date; amount: number; partial: number; covers: string } {
  if (start.getUTCDate() === 1) {
    return { date: start, amount: round2(monthly), partial: 0, covers: monthName(start) };
  }
  const dim = daysInMonth(start);
  const daysLeft = dim - start.getUTCDate() + 1;
  const partial = round2(monthly * daysLeft / dim);
  const next = firstOfNextMonth(start);
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), dim));
  return { date: next, amount: round2(partial + monthly), partial, covers: `${fmtShort(start)}–${fmtShort(lastDay)} partial + ${monthName(next)}` };
}

export function annualAmounts(pkg: PackageDefaults, setup: number, monthly: number) {
  const f = 1 - pkg.annual_discount_pct / 100;
  const months = pkg.key === "growth" ? 9 : 11;
  return { first: round2((setup + months * monthly) * f), renewal: round2(12 * monthly * f), months };
}

export function setupMethod(pkg: PackageKey): Method { return pkg === "growth" ? "stripe" : "wire"; }

/** Builds the full dated schedule for the first ~13 months (+ next renewal for annual). */
export function buildPlan(p: PlanInput): PlanResult {
  const sign = new Date(Date.UTC(p.signDate.getUTCFullYear(), p.signDate.getUTCMonth(), p.signDate.getUTCDate()));
  const lines: ChargeLine[] = [];
  const milestones: { date: string; label: string }[] = [];
  const key = p.pkg.key;
  const isGrowth = key === "growth";
  const ongoing: Ongoing = isGrowth ? p.ongoing : "retainer";
  let annualFirst: number | null = null, annualRenewal: number | null = null, planTotal: number | null = null;
  let guaranteeEnds: string | null = null, billingStart: string | null = null;

  if (isGrowth) {
    const g = addDaysUTC(sign, p.pkg.guarantee_days);
    guaranteeEnds = ymd(g);
    milestones.push({ date: ymd(sign), label: "Guarantee starts (first payment received)" });
    milestones.push({ date: guaranteeEnds, label: `${p.pkg.guarantee_days}-day guarantee ends` });
  }

  if (p.cadence === "annual") {
    const a = annualAmounts(p.pkg, p.setup, p.monthly);
    annualFirst = a.first; annualRenewal = a.renewal;
    lines.push({ date: ymd(sign), kind: "annual", method: "wire", amount: a.first, label: "Annual — first year",
      covers: isGrowth ? `Setup + 9 months, 20% off` : `Setup + 11 months, 20% off` });
    lines.push({ date: ymd(addYearsUTC(sign, 1)), kind: "annual_renewal", method: "wire", amount: a.renewal, label: "Annual renewal", covers: "12 months, 20% off" });
    milestones.push({ date: ymd(addYearsUTC(sign, 1)), label: "Annual renews (every year on this date)" });
    return { lines, milestones, annualFirst, annualRenewal, paymentPlanTotal: null, firstYearTotal: a.first, billingStart: null, guaranteeEnds };
  }

  // Setup
  const sm = setupMethod(key);
  if (p.paymentPlan) {
    planTotal = round2(p.setup * (1 + p.pkg.payment_plan_markup_pct / 100));
    const half = round2(planTotal / 2);
    lines.push({ date: ymd(sign), kind: "setup_installment_1", method: sm, amount: half, label: "Setup — payment 1 of 2" });
    lines.push({ date: ymd(addDaysUTC(sign, 30)), kind: "setup_installment_2", method: "stripe", amount: round2(planTotal - half), label: "Setup — payment 2 of 2" });
  } else {
    lines.push({ date: ymd(sign), kind: "setup", method: sm, amount: round2(p.setup), label: "Setup" });
  }

  // Ongoing start
  let start: Date;
  if (isGrowth) {
    const g = addDaysUTC(sign, p.pkg.guarantee_days);
    start = p.madeBackDate && p.madeBackDate > g ? new Date(Date.UTC(p.madeBackDate.getUTCFullYear(), p.madeBackDate.getUTCMonth(), p.madeBackDate.getUTCDate())) : g;
    milestones.push({ date: ymd(start), label: "Made it back → ongoing billing starts" });
  } else {
    start = sign;
  }
  billingStart = ymd(start);

  const horizon = addYearsUTC(sign, 1);
  if (ongoing === "retainer") {
    const first = firstMonthlyCharge(start, p.monthly);
    lines.push({ date: ymd(first.date), kind: "monthly", method: "stripe", amount: first.amount, label: "Monthly — first charge", covers: first.covers });
    let d = addMonthsUTC(first.date, 1);
    while (d < horizon) {
      lines.push({ date: ymd(d), kind: "monthly", method: "stripe", amount: round2(p.monthly), label: "Monthly", covers: monthName(d) });
      d = addMonthsUTC(d, 1);
    }
  } else {
    let d = firstOfNextMonth(start);
    while (d < horizon) {
      lines.push({ date: ymd(d), kind: "commission", method: "stripe", amount: null, label: "Commission",
        covers: `${p.commissionRate ?? p.pkg.commission_rate}% of last month's revenue from new clients we brought in (yr 1), then ${p.commissionRateOngoing ?? p.pkg.commission_rate_ongoing}%` });
      d = addMonthsUTC(d, 1);
    }
  }

  lines.sort((x, y) => x.date.localeCompare(y.date));
  const known = lines.filter((l) => l.amount != null && parseYmd(l.date) < horizon).reduce((s, l) => s + (l.amount || 0), 0);
  return {
    lines, milestones, annualFirst: null, annualRenewal: null, paymentPlanTotal: planTotal,
    firstYearTotal: ongoing === "commission" ? null : round2(known), billingStart, guaranteeEnds,
  };
}

/** True when an entered price is more than discount_approval_pct below its default. */
export function needsApproval(pkg: PackageDefaults, setup: number, monthly: number, defaults: { setup: number; monthly: number }) {
  const lim = 1 - pkg.discount_approval_pct / 100;
  return (defaults.setup > 0 && setup < defaults.setup * lim) || (defaults.monthly > 0 && monthly < defaults.monthly * lim);
}

/** Merge DB overrides (nl_package_defaults rows) onto the built-in defaults. */
export function mergeDefaults(rows: Partial<PackageDefaults>[] | null | undefined): Record<PackageKey, PackageDefaults> {
  const out: Record<PackageKey, PackageDefaults> = JSON.parse(JSON.stringify(DEFAULT_PACKAGES));
  for (const r of rows || []) {
    if (!r.key || !(r.key in out)) continue;
    const k = r.key as PackageKey;
    for (const [f, v] of Object.entries(r)) if (v !== null && v !== undefined && f in out[k]) (out[k] as any)[f] = typeof (out[k] as any)[f] === "number" ? Number(v) : v;
    if (r.setup_fee === null && k === "growth") out[k].setup_fee = null;
  }
  return out;
}
