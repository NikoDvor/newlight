/**
 * Pipeline Revenue Opportunity — shared taxonomy + pure compute layer.
 *
 * ONE source of truth used by both the NewLight admin dashboard and every
 * sub-account dashboard. `crm_deals` is already scoped by `client_id`, so the
 * only difference between the two surfaces is which client_id is passed in.
 *
 * ── Canonical "Won" figure ─────────────────────────────────────────────────
 * Won dollars = SUM(crm_deals.deal_value) WHERE pipeline_stage = 'closed_won'.
 * This is deliberately the exact same expression the commission billing engine
 * ultimately bills against: the DB trigger `auto_log_closed_won_revenue`
 * inserts `financial_adjustments(type='revenue', amount = NEW.deal_value)` for
 * every deal transitioning into `closed_won`, and
 * `process-commission-billing` sums those revenue adjustments. Do NOT
 * introduce a second definition of "won revenue" anywhere — change
 * `wonValueAllTime` here and both surfaces move together.
 */

export type CanonStage = "cold" | "warm" | "hot" | "won" | "lost";

export const CANON_STAGES: CanonStage[] = ["cold", "warm", "hot", "won", "lost"];
/** Ordered progression stages (lost is terminal-off-path, not a rank). */
export const FUNNEL_STAGES: Exclude<CanonStage, "lost">[] = ["cold", "warm", "hot", "won"];

export const STAGE_LABEL: Record<CanonStage, string> = {
  cold: "Cold",
  warm: "Warm",
  hot: "Hot",
  won: "Won",
  lost: "Lost",
};

export const STAGE_DESCRIPTION: Record<CanonStage, string> = {
  cold: "Not contacted, or contacted but no meeting booked",
  warm: "First meeting booked",
  hot: "Second / final meeting booked",
  won: "Closed won",
  lost: "Closed lost",
};

export const STAGE_COLOR: Record<CanonStage, string> = {
  cold: "hsl(211 90% 62%)",
  warm: "hsl(38 92% 58%)",
  hot: "hsl(14 90% 60%)",
  won: "hsl(152 62% 48%)",
  lost: "hsl(0 68% 58%)",
};

/**
 * Existing raw `pipeline_stage` values stay valid — this only maps them onto
 * the 5-stage taxonomy. Nothing is renamed in the database.
 */
const RAW_TO_CANON: Record<string, CanonStage> = {
  // cold
  new_lead: "cold",
  cold_lead: "cold",
  cold: "cold",
  contacted: "cold",
  qualified: "cold",
  // warm
  appointment_booked: "warm",
  warm_lead: "warm",
  warm: "warm",
  proposal_sent: "warm",
  // hot
  hot_lead: "hot",
  hot: "hot",
  negotiation: "hot",
  // won
  closed_won: "won",
  won_lead: "won",
  won: "won",
  // lost
  closed_lost: "lost",
  lost: "lost",
};

export function toCanonStage(raw: string | null | undefined): CanonStage {
  if (!raw) return "cold";
  const normalized = String(raw).toLowerCase();
  const canon = RAW_TO_CANON[normalized];
  if (!canon && import.meta.env.DEV) {
    console.warn(`[toCanonStage] unmapped pipeline_stage "${raw}" defaulted to "cold"`);
  }
  return canon ?? "cold";
}

/** The value written back when a deal is marked lost. */
export const LOST_STAGE_VALUE = "lost";

export const LOST_REASONS = [
  { value: "price", label: "Price" },
  { value: "too_risky", label: "Too much risk" },
  { value: "timing", label: "Timing" },
  { value: "no_show", label: "No-show" },
  { value: "chose_competitor", label: "Chose competitor" },
  { value: "unresponsive", label: "Unresponsive" },
  { value: "other", label: "Other" },
] as const;

export type LostReason = (typeof LOST_REASONS)[number]["value"];

export const LOST_REASON_LABEL: Record<string, string> =
  Object.fromEntries(LOST_REASONS.map((r) => [r.value, r.label]));

/** Reasons that make a lost deal worth re-touching later. */
export const WINBACK_REASONS: LostReason[] = ["price", "timing"];
export const WINBACK_MIN_AGE_DAYS = 60;

/** Below this many observations a rate is shown as "low confidence". */
export const LOW_CONFIDENCE_N = 15;
/** Minimum per-rep sample before we're willing to call someone an outlier. */
const REP_MIN_N = 5;
/** Percentage points below team average that count as meaningful. */
const REP_OUTLIER_GAP = 0.12;
/** Percentage-point drop across the whole team that reads as systemic. */
const SYSTEMIC_DROP = 0.1;
/** Minimum other-accounts in a vertical before a benchmark is trustworthy. */
export const BENCHMARK_MIN_PEERS = 3;
export const BENCHMARK_MIN_DEALS = 30;

export const ROLLING_WINDOW_DAYS = 90;
/**
 * Stage conversion rates look back a full year: sales cycles run 1–3 months, so most deals created in
 * the last 90 days haven't been decided yet and a 90-day window reads every stage as converting badly.
 */
export const CONVERSION_WINDOW_DAYS = 365;
/** Deals younger than this are left out of the systemic-decline check. */
export const SYSTEMIC_MIN_AGE_DAYS = 30;
/** Lost-reason ▲/▼ changes only show when both periods have at least this many lost deals. */
export const LOST_DELTA_MIN_N = 20;
export const TREND_WEEKS = 8;

/* ────────────────────────────── inputs ────────────────────────────── */

export interface DealRow {
  id: string;
  client_id: string | null;
  deal_name: string | null;
  deal_value: number | string | null;
  pipeline_stage: string | null;
  status: string | null;
  assigned_user: string | null;
  created_at: string;
  lost_reason: string | null;
  lost_at: string | null;
  /** Won/lost decision date, when known. */
  close_date?: string | null;
}

export interface MeetingRow {
  id: string;
  meeting_type: string | null;
  attended: boolean | null;
  start_time: string | null;
  assigned_salesman_user_id: string | null;
  /** Deal (or BDR lead) the meeting belongs to — lets lost deals keep the stage they reached. */
  deal_id?: string | null;
}

export interface PeerDealRow {
  client_id: string | null;
  pipeline_stage: string | null;
}

/* ────────────────────────────── outputs ───────────────────────────── */

export interface StageRate {
  from: CanonStage;
  to: CanonStage;
  /** Historical conversion 0..1 over the rolling window. */
  rate: number;
  /** Denominator — number of deals that reached `from`. */
  sampleSize: number;
  lowConfidence: boolean;
  /** ±band on the rate from sample size (Wald interval, capped). */
  margin: number;
  signal: StageSignal | null;
}

export type StageSignalKind = "salesman" | "systemic";

export interface StageSignal {
  kind: StageSignalKind;
  headline: string;
  detail: string;
  /** Rep display keys implicated, when kind === "salesman". */
  reps: string[];
}

export interface RepStageRate {
  stage: CanonStage;
  rate: number;
  sampleSize: number;
}

export interface RepRow {
  userId: string;
  /** Count of deals not in a terminal stage — the capacity read. */
  activeDeals: number;
  openValue: number;
  wonCount: number;
  wonValue: number;
  /** Main close rate: first booked meeting → won, decided deals only, rolling window. */
  closeRate: number;
  closeSample: number;
  lowConfidence: boolean;
  stageRates: RepStageRate[];
}

export interface StageBucket {
  stage: CanonStage;
  count: number;
  value: number;
}

export interface LostBreakdownRow {
  reason: string;
  count: number;
  share: number;
  /** Change in share vs the prior equal-length period, in points. */
  deltaPoints: number;
}

export interface ShowUpRow {
  label: string;
  booked: number;
  attended: number;
  /** Logged as missed (no-show / cancelled). */
  missed: number;
  /** Upcoming, or past with no outcome logged yet — never counted as a no-show. */
  pending: number;
  /** attended ÷ (attended + missed); 0 when nothing has been logged. */
  rate: number;
}

export interface WinBackRow {
  id: string;
  name: string;
  value: number;
  reason: string;
  lostAt: string;
  daysAgo: number;
}

export interface TrendPoint {
  weekStart: string;
  label: string;
  cold: number;
  warm: number;
  hot: number;
  won: number;
  lost: number;
  /** Main close rate (first booked meeting → won, decided deals) as of that week, trailing window. */
  closeRate: number;
}

/**
 * THE main close rate (decided Nov 7, 2026): of the deals whose first meeting (Form 1 / discovery) was
 * booked, the share that became won clients. Only decided deals count (won ÷ won + lost); deals still in
 * progress are reported separately as `open` so an active pipeline doesn't drag the rate down.
 */
export interface BookedCloseRate {
  rate: number;
  won: number;
  decided: number;
  open: number;
  lowConfidence: boolean;
}

export interface BenchmarkRow {
  stage: CanonStage;
  self: number;
  vertical: number;
}

export interface PipelineRevenueModel {
  hasData: boolean;
  /** Canonical, all-time won dollars — see file header. */
  wonValueAllTime: number;
  wonCountAllTime: number;
  openValue: number;
  weighted: { point: number; low: number; high: number };
  /** Weighted pipeline ÷ what's still needed to hit the target this calendar year (null when no target or already hit). */
  coverageRatio: number | null;
  revenueTarget: number | null;
  /** Won this calendar year (close date, falling back to created date). */
  wonThisYear: number;
  /** Target − won this year, floored at 0. Null when there's no target. */
  targetRemaining: number | null;
  buckets: StageBucket[];
  stageRates: StageRate[];
  reps: RepRow[];
  lostBreakdown: LostBreakdownRow[];
  lostTotal: number;
  /** Whether both 90-day periods have enough lost deals for the ▲/▼ share changes to mean anything. */
  lostDeltaReliable: boolean;
  showUp: ShowUpRow[];
  winBacks: WinBackRow[];
  trend: TrendPoint[];
  benchmark: BenchmarkRow[] | null;
  benchmarkPeers: number;
  /** Main close rate, all time: first booked meeting → won client. */
  bookedClose: BookedCloseRate;
  /** Same, rolling window (last ROLLING_WINDOW_DAYS days of decisions). */
  bookedCloseWindow: BookedCloseRate;
  /** Stage keys where the funnel is collapsing badly enough to alert on. */
  riskSignals: { stage: CanonStage; kind: StageSignalKind; message: string }[];
}

/* ───────────────────────────── helpers ────────────────────────────── */

const num = (v: unknown) => Number(v) || 0;
const DAY = 86400000;

function rankOf(stage: CanonStage): number {
  const i = FUNNEL_STAGES.indexOf(stage as any);
  return i < 0 ? 0 : i;
}

/**
 * How far a deal is known to have progressed.
 * Lost deals carry no stage history in the schema, so they are credited only
 * with the stage their loss reason proves they reached (a no-show implies a
 * meeting was booked). Everything else counts as cold-only.
 */
function reachedRank(stage: CanonStage, lostReason: string | null, meetingRank = 0): number {
  if (stage === "lost") return Math.max(lostReason === "no_show" ? 1 : 0, meetingRank);
  return Math.max(rankOf(stage), stage === "won" ? 0 : meetingRank);
}

const SECOND_MEETING_RE = /second|final|close|closing|meeting_?2|followup|follow_up/i;

/** Furthest stage each deal's meetings prove it reached: any meeting = Warm, a closing meeting = Hot. */
export function meetingReach(meetings: MeetingRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of meetings) {
    if (!m.deal_id) continue;
    const r = m.meeting_type && SECOND_MEETING_RE.test(m.meeting_type) ? 2 : 1;
    out.set(m.deal_id, Math.max(out.get(m.deal_id) ?? 0, r));
  }
  return out;
}

/** First booked meeting → won, decided deals only. */
export function bookedCloseRate(deals: DealRow[], reach: Map<string, number> = new Map()): BookedCloseRate {
  let won = 0, lost = 0, open = 0;
  for (const d of deals) {
    const stage = toCanonStage(d.pipeline_stage);
    if (reachedRank(stage, d.lost_reason, reach.get(d.id) ?? 0) < 1) continue; // never booked
    if (stage === "won") won++;
    else if (stage === "lost") lost++;
    else open++;
  }
  const decided = won + lost;
  return { rate: decided ? won / decided : 0, won, decided, open, lowConfidence: decided < LOW_CONFIDENCE_N };
}

function waldMargin(rate: number, n: number): number {
  if (n <= 0) return 0.5;
  const m = 1.96 * Math.sqrt(Math.max(rate * (1 - rate), 0.01) / n);
  return Math.min(0.5, m);
}

function stagePairs(): { from: CanonStage; to: CanonStage }[] {
  const out: { from: CanonStage; to: CanonStage }[] = [];
  for (let i = 0; i < FUNNEL_STAGES.length - 1; i++) {
    out.push({ from: FUNNEL_STAGES[i], to: FUNNEL_STAGES[i + 1] });
  }
  return out;
}

function conversions(deals: DealRow[], reach: Map<string, number> = new Map()): { rate: number; n: number }[] {
  return stagePairs().map(({ from, to }) => {
    const fromRank = rankOf(from);
    const toRank = rankOf(to);
    let denom = 0;
    let numr = 0;
    for (const d of deals) {
      const stage = toCanonStage(d.pipeline_stage);
      const r = reachedRank(stage, d.lost_reason, reach.get(d.id) ?? 0);
      if (r < fromRank) continue;
      // From a booked meeting onward, only decided deals count: a deal still sitting at this stage
      // hasn't converted OR failed yet (same rule as the main close rate). Cold keeps every lead.
      if (fromRank >= 1 && r === fromRank && stage !== "lost") continue;
      denom++;
      if (r >= toRank) numr++;
    }
    return { rate: denom > 0 ? numr / denom : 0, n: denom };
  });
}

/** Cumulative probability of reaching Won from a given stage. */
export function cumulativeCloseRate(stage: CanonStage, rates: number[]): number {
  if (stage === "won") return 1;
  if (stage === "lost") return 0;
  let p = 1;
  for (let i = rankOf(stage); i < rates.length; i++) p *= rates[i];
  return p;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

/* ─────────────────────────── main compute ─────────────────────────── */

export interface ComputeInput {
  deals: DealRow[];
  meetings: MeetingRow[];
  revenueTarget: number | null;
  /** Peer deals from other clients sharing the same vertical. */
  peerDeals?: PeerDealRow[];
  now?: Date;
}

export function computePipelineRevenue(input: ComputeInput): PipelineRevenueModel {
  const now = input.now ?? new Date();
  const deals = input.deals ?? [];
  const windowStart = new Date(now.getTime() - ROLLING_WINDOW_DAYS * DAY);
  const convStart = new Date(now.getTime() - CONVERSION_WINDOW_DAYS * DAY);
  const inWindow = deals.filter((d) => new Date(d.created_at) >= convStart);
  const reach = meetingReach(input.meetings ?? []);
  /** When a deal was decided (won/lost) — falls back to created_at for legacy rows. */
  const decidedAt = (d: DealRow) => new Date(d.lost_at || d.close_date || d.created_at);

  /* stage buckets — Won is ALL-TIME cumulative, everything else is live */
  const buckets: StageBucket[] = CANON_STAGES.map((stage) => {
    const rows = deals.filter((d) => toCanonStage(d.pipeline_stage) === stage);
    return {
      stage,
      count: rows.length,
      value: rows.reduce((s, d) => s + num(d.deal_value), 0),
    };
  });

  const wonBucket = buckets.find((b) => b.stage === "won")!;
  const wonValueAllTime = wonBucket.value;
  const wonCountAllTime = wonBucket.count;

  /* conversion rates + confidence */
  const conv = conversions(inWindow, reach);
  const rates = conv.map((c) => c.rate);

  /* rep-level rates for outlier detection */
  const repIds = Array.from(
    new Set(deals.map((d) => d.assigned_user).filter(Boolean) as string[]),
  );
  const repConv = new Map<string, { rate: number; n: number }[]>();
  for (const uid of repIds) {
    repConv.set(uid, conversions(inWindow.filter((d) => d.assigned_user === uid), reach));
  }

  /* systemic detection: recent half vs earlier half of the window */
  const midpoint = new Date(now.getTime() - (CONVERSION_WINDOW_DAYS / 2) * DAY);
  // Leads added in the last 30 days haven't had time to be worked yet — counting them would make every
  // account that just added leads look like its Cold→Warm rate is collapsing.
  const matureCutoff = new Date(now.getTime() - SYSTEMIC_MIN_AGE_DAYS * DAY);
  const recentConv = conversions(
    inWindow.filter((d) => new Date(d.created_at) >= midpoint && new Date(d.created_at) < matureCutoff),
    reach,
  );
  const priorConv = conversions(inWindow.filter((d) => new Date(d.created_at) < midpoint), reach);

  const pairs = stagePairs();
  const stageRates: StageRate[] = pairs.map((p, i) => {
    const { rate, n } = conv[i];
    const laggards = repIds.filter((uid) => {
      const rc = repConv.get(uid)?.[i];
      return !!rc && rc.n >= REP_MIN_N && rc.rate < rate - REP_OUTLIER_GAP;
    });

    const declined =
      priorConv[i].n >= REP_MIN_N &&
      recentConv[i].n >= REP_MIN_N &&
      recentConv[i].rate < priorConv[i].rate - SYSTEMIC_DROP;

    let signal: StageSignal | null = null;
    if (laggards.length > 0 && laggards.length < Math.max(repIds.length, 1)) {
      signal = {
        kind: "salesman",
        headline: "Salesman-specific",
        detail: `${laggards.length} rep${laggards.length > 1 ? "s are" : " is"} converting ${STAGE_LABEL[p.from]}→${STAGE_LABEL[p.to]} well below the team average — coaching signal, not a process signal.`,
        reps: laggards,
      };
    } else if (declined) {
      signal = {
        kind: "systemic",
        headline: "Systemic",
        detail: `${STAGE_LABEL[p.from]}→${STAGE_LABEL[p.to]} is falling for the whole team, so the offer, positioning or process at this step is the likely cause — not any one person.`,
        reps: [],
      };
    }

    return {
      from: p.from,
      to: p.to,
      rate,
      sampleSize: n,
      lowConfidence: n < LOW_CONFIDENCE_N,
      margin: waldMargin(rate, n),
      signal,
    };
  });

  /* weighted pipeline value, as a range */
  const openDeals = deals.filter((d) => {
    const s = toCanonStage(d.pipeline_stage);
    return s !== "won" && s !== "lost";
  });
  const openValue = openDeals.reduce((s, d) => s + num(d.deal_value), 0);

  let point = 0;
  let low = 0;
  let high = 0;
  for (const d of openDeals) {
    const stage = toCanonStage(d.pipeline_stage);
    const v = num(d.deal_value);
    point += v * cumulativeCloseRate(stage, rates);
    low +=
      v *
      cumulativeCloseRate(
        stage,
        stageRates.map((s) => Math.max(0, s.rate - s.margin)),
      );
    high +=
      v *
      cumulativeCloseRate(
        stage,
        stageRates.map((s) => Math.min(1, s.rate + s.margin)),
      );
  }

  const revenueTarget = input.revenueTarget && input.revenueTarget > 0 ? input.revenueTarget : null;
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const wonThisYear = deals
    .filter((d) => toCanonStage(d.pipeline_stage) === "won" && new Date(d.close_date || d.created_at) >= yearStart)
    .reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
  // Coverage is measured against what's still left to win this year, not the whole target.
  const targetRemaining = revenueTarget != null ? Math.max(0, revenueTarget - wonThisYear) : null;
  const coverageRatio = targetRemaining ? point / targetRemaining : null;

  /* per-rep rows */
  const reps: RepRow[] = repIds
    .map((uid) => {
      const mine = deals.filter((d) => d.assigned_user === uid);
      const mineWindow = inWindow.filter((d) => d.assigned_user === uid);
      const rc = repConv.get(uid)!;
      const repClose = bookedCloseRate(mine.filter((d) => decidedAt(d) >= windowStart), reach);
      const closeRate = repClose.rate;
      const active = mine.filter((d) => {
        const s = toCanonStage(d.pipeline_stage);
        return s !== "won" && s !== "lost";
      });
      const won = mine.filter((d) => toCanonStage(d.pipeline_stage) === "won");
      return {
        userId: uid,
        activeDeals: active.length,
        openValue: active.reduce((s, d) => s + num(d.deal_value), 0),
        wonCount: won.length,
        wonValue: won.reduce((s, d) => s + num(d.deal_value), 0),
        closeRate,
        closeSample: repClose.decided,
        lowConfidence: repClose.decided < LOW_CONFIDENCE_N,
        stageRates: rc.map((c, i) => ({
          stage: pairs[i].from,
          rate: c.rate,
          sampleSize: c.n,
        })),
      };
    })
    .sort((a, b) => b.closeRate - a.closeRate || b.wonValue - a.wonValue);

  /* lost reason breakdown + period-over-period movement */
  const lostAll = deals.filter((d) => toCanonStage(d.pipeline_stage) === "lost");
  const periodStart = new Date(now.getTime() - ROLLING_WINDOW_DAYS * DAY);
  const priorStart = new Date(now.getTime() - 2 * ROLLING_WINDOW_DAYS * DAY);
  const lostNow = lostAll.filter((d) => d.lost_at && new Date(d.lost_at) >= periodStart);
  const lostPrior = lostAll.filter(
    (d) => d.lost_at && new Date(d.lost_at) >= priorStart && new Date(d.lost_at) < periodStart,
  );
  const share = (rows: DealRow[], reason: string) =>
    rows.length ? rows.filter((d) => (d.lost_reason || "other") === reason).length / rows.length : 0;

  const reasonsSeen = Array.from(
    new Set(lostAll.map((d) => d.lost_reason || "other")),
  );
  const lostBreakdown: LostBreakdownRow[] = reasonsSeen
    .map((reason) => {
      const count = lostAll.filter((d) => (d.lost_reason || "other") === reason).length;
      return {
        reason,
        count,
        share: lostAll.length ? count / lostAll.length : 0,
        deltaPoints: (share(lostNow, reason) - share(lostPrior, reason)) * 100,
      };
    })
    .sort((a, b) => b.count - a.count);

  /* show-up rate, split by meeting stage, tracked apart from booked count */
  const meetings = input.meetings ?? [];
  const isSecond = (t: string | null) => !!t && SECOND_MEETING_RE.test(t);
  const bucketMeetings = (second: boolean) =>
    meetings.filter((m) => isSecond(m.meeting_type) === second);
  const showUp: ShowUpRow[] = [
    { label: "First meeting", rows: bucketMeetings(false) },
    { label: "Second / final meeting", rows: bucketMeetings(true) },
  ].map(({ label, rows }) => {
    const booked = rows.length;
    const attended = rows.filter((m) => m.attended === true).length;
    const missed = rows.filter((m) => m.attended === false).length;
    const pending = booked - attended - missed;
    return { label, booked, attended, missed, pending, rate: attended + missed ? attended / (attended + missed) : 0 };
  });

  /* win-back candidates */
  const cutoff = new Date(now.getTime() - WINBACK_MIN_AGE_DAYS * DAY);
  const winBacks: WinBackRow[] = lostAll
    .filter(
      (d) =>
        d.lost_at &&
        new Date(d.lost_at) < cutoff &&
        WINBACK_REASONS.includes((d.lost_reason || "") as LostReason),
    )
    .map((d) => ({
      id: d.id,
      name: d.deal_name || "Untitled deal",
      value: num(d.deal_value),
      reason: d.lost_reason || "other",
      lostAt: d.lost_at!,
      daysAgo: Math.floor((now.getTime() - new Date(d.lost_at!).getTime()) / DAY),
    }))
    .sort((a, b) => b.value - a.value);

  /* 8-week trend */
  const trend: TrendPoint[] = [];
  const thisWeek = startOfWeek(now);
  for (let w = TREND_WEEKS - 1; w >= 0; w--) {
    const weekStart = new Date(thisWeek.getTime() - w * 7 * DAY);
    const weekEnd = new Date(weekStart.getTime() + 7 * DAY);
    const created = deals.filter((d) => {
      const t = new Date(d.created_at);
      return t >= weekStart && t < weekEnd;
    });
    const decidedTrailing = deals.filter((d) => {
      const t = decidedAt(d);
      return t < weekEnd && t >= new Date(weekEnd.getTime() - ROLLING_WINDOW_DAYS * DAY);
    });
    const countOf = (s: CanonStage) =>
      created.filter((d) => toCanonStage(d.pipeline_stage) === s).length;
    trend.push({
      weekStart: weekStart.toISOString(),
      label: weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      cold: countOf("cold"),
      warm: countOf("warm"),
      hot: countOf("hot"),
      won: countOf("won"),
      lost: countOf("lost"),
      closeRate: bookedCloseRate(decidedTrailing, reach).rate,
    });
  }

  /* cross-account vertical benchmark */
  let benchmark: BenchmarkRow[] | null = null;
  let benchmarkPeers = 0;
  const peers = input.peerDeals ?? [];
  if (peers.length) {
    benchmarkPeers = new Set(peers.map((p) => p.client_id).filter(Boolean)).size;
    if (benchmarkPeers >= BENCHMARK_MIN_PEERS && peers.length >= BENCHMARK_MIN_DEALS) {
      const peerRows: DealRow[] = peers.map((p) => ({
        id: "",
        client_id: p.client_id,
        deal_name: null,
        deal_value: 0,
        pipeline_stage: p.pipeline_stage,
        status: null,
        assigned_user: null,
        created_at: new Date(0).toISOString(),
        lost_reason: null,
        lost_at: null,
      }));
      const pconv = conversions(peerRows);
      benchmark = pairs.map((p, i) => ({
        stage: p.from,
        self: conv[i].rate,
        vertical: pconv[i].rate,
      }));
    }
  }

  /* risk signals worth escalating into the existing risk surface */
  const riskSignals = stageRates
    .filter((s) => s.signal && !s.lowConfidence && s.rate < 0.25)
    .map((s) => ({
      stage: s.from,
      kind: s.signal!.kind,
      message: `${STAGE_LABEL[s.from]}→${STAGE_LABEL[s.to]} conversion is ${(s.rate * 100).toFixed(0)}% (n=${s.sampleSize}). ${s.signal!.detail}`,
    }));

  return {
    hasData: deals.length > 0,
    wonValueAllTime,
    wonCountAllTime,
    openValue,
    weighted: { point, low: Math.min(low, point), high: Math.max(high, point) },
    coverageRatio,
    wonThisYear,
    targetRemaining,
    lostDeltaReliable: lostNow.length >= LOST_DELTA_MIN_N && lostPrior.length >= LOST_DELTA_MIN_N,
    revenueTarget,
    buckets,
    stageRates,
    reps,
    lostBreakdown,
    lostTotal: lostAll.length,
    showUp,
    winBacks,
    trend,
    benchmark,
    benchmarkPeers,
    bookedClose: bookedCloseRate(deals, reach),
    bookedCloseWindow: bookedCloseRate(deals.filter((d) => decidedAt(d) >= windowStart), reach),
    riskSignals,
  };
}

/** Projected revenue when the user overrides stage rates with the sliders. */
export function projectRevenue(
  openDeals: { stage: CanonStage; value: number }[],
  rates: number[],
): number {
  return openDeals.reduce((s, d) => s + d.value * cumulativeCloseRate(d.stage, rates), 0);
}

export const fmtMoney = (n: number) =>
  `$${Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
export const fmtPct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;

/* ───────────────── revenue lever (second draggable input) ─────────────────
 * Same engine as the close-rate sliders — `cumulativeCloseRate` — with an
 * optional override of the per-deal value, plus the implied volume needed to
 * hit a revenue target. Do NOT build a parallel projection anywhere else.
 */

export interface RevenueLeverProjection {
  /** Projected weighted revenue under the current rates + value override. */
  projectedRevenue: number;
  /** Expected number of open deals that close, under the current rates. */
  expectedWonDeals: number;
  /** Per-deal value actually used in the projection. */
  avgDealValue: number;
  /** Revenue the plan is being measured against. */
  target: number;
  /** Won clients required to reach `target` at `avgDealValue`. */
  wonClientsNeeded: number;
  /** Appointments (Warm stage) required to produce those wins. */
  appointmentsNeeded: number;
  /** Delta vs. the untouched baseline projection. */
  deltaRevenue: number;
}

export function projectRevenueLever(
  openDeals: { stage: CanonStage; value: number }[],
  rates: number[],
  opts: {
    avgDealValueOverride?: number | null;
    revenueTarget?: number | null;
    baseline?: number;
    /** What a client is actually worth (average won deal). Defaults to the average open deal that carries a value. */
    naturalAvgDealValue?: number | null;
  } = {},
): RevenueLeverProjection {
  const override =
    opts.avgDealValueOverride && opts.avgDealValueOverride > 0 ? opts.avgDealValueOverride : null;

  let projectedRevenue = 0;
  let expectedWonDeals = 0;
  for (const d of openDeals) {
    const p = cumulativeCloseRate(d.stage, rates);
    projectedRevenue += (override ?? d.value) * p;
    expectedWonDeals += p;
  }

  // Cold leads carry $0 until a package is priced, so they must not drag the per-deal value down.
  const valued = openDeals.filter((d) => d.value > 0);
  const naturalAvg = opts.naturalAvgDealValue && opts.naturalAvgDealValue > 0
    ? opts.naturalAvgDealValue
    : valued.length ? valued.reduce((s, d) => s + d.value, 0) / valued.length : 0;
  const avgDealValue = override ?? naturalAvg;

  const target = opts.revenueTarget && opts.revenueTarget > 0 ? opts.revenueTarget : projectedRevenue;

  const wonClientsNeeded = avgDealValue > 0 ? Math.ceil(target / avgDealValue) : 0;
  // Warm = "appointment booked", so the Warm→Won cumulative rate converts
  // appointments into wins.
  const warmToWon = cumulativeCloseRate("warm", rates);
  const appointmentsNeeded = warmToWon > 0 ? Math.ceil(wonClientsNeeded / warmToWon) : 0;

  return {
    projectedRevenue,
    expectedWonDeals,
    avgDealValue,
    target,
    wonClientsNeeded,
    appointmentsNeeded,
    deltaRevenue: projectedRevenue - (opts.baseline ?? projectedRevenue),
  };
}
