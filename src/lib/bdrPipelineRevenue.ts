/**
 * BDR Pipeline Revenue — admin-only data source.
 *
 * NewLight's own pipeline does NOT live in `crm_deals`. A BDR lead
 * (`nl_bdr_leads`) never becomes a "deal" in NewLight's workspace — it becomes
 * an entirely new *client* via Form 2 (close-prep-submit) / Form 3 (Pay & Sign).
 * These stay separate domains: this module simply projects `nl_bdr_leads`
 * (+ the `crm_deals` row that close-prep-submit creates for a converting lead)
 * onto the SAME Cold/Warm/Hot/Won/Lost shape the shared compute layer already
 * understands, so the widget maths is never forked.
 *
 * Linkage (verified against supabase/functions/close-prep-submit/index.ts):
 *   nl_bdr_leads.crm_deal_id  →  crm_deals.id     (written on Form 2 submit)
 *   close_prep_links(lead_id, deal_id)            (audit mirror of the above)
 *   crm_deals.initial_fee / recurring_fee / pricing_model / commission_rate
 *   crm_deals.pay_sign_status = 'paid_signed'     (Form 3 completed → Won)
 */

import {
  computePipelineRevenue,
  type CanonStage,
  type DealRow,
  type MeetingRow,
  type PipelineRevenueModel,
  toCanonStage,
} from "@/lib/pipelineRevenue";

/** Months of recurring revenue counted into a converted lead's value. */
export const RECURRING_MONTHS = 12;

export interface BdrLeadRow {
  id: string;
  user_id: string | null;
  business_name: string | null;
  pipeline_stage: string | null;
  status: string | null;
  called: boolean | null;
  meeting_booked: string | null;
  objection_category: string | null;
  crm_deal_id: string | null;
  estimated_annual_value: number | string | null;
  created_at: string;
  updated_at: string | null;
}

export interface BdrLinkedDealRow {
  id: string;
  deal_value: number | string | null;
  initial_fee: number | string | null;
  recurring_fee: number | string | null;
  pricing_model: string | null;
  pay_sign_status: string | null;
  pipeline_stage: string | null;
  close_prep_completed_at: string | null;
}

export interface BdrEventRow {
  id: string;
  lead_id: string | null;
  user_id: string | null;
  source: string | null;
  attendance: string | null;
  starts_at: string | null;
}

const num = (v: unknown) => Number(v) || 0;

/**
 * Dollar value of a converting lead: the initial fee plus a fixed multiple of
 * the recurring fee. Falls back to `deal_value` when the fee columns were
 * never filled (legacy rows), so nothing silently reads as $0.
 */
export function bdrDealValue(deal: BdrLinkedDealRow | undefined | null): number {
  if (!deal) return 0;
  const fees = num(deal.initial_fee) + num(deal.recurring_fee) * RECURRING_MONTHS;
  return fees > 0 ? fees : num(deal.deal_value);
}

/** Whether a lead's linked deal proves Form 3 (pay + sign) completed. */
function isConverted(deal: BdrLinkedDealRow | undefined): boolean {
  if (!deal) return false;
  return (
    deal.pay_sign_status === "paid_signed" ||
    toCanonStage(deal.pipeline_stage) === "won"
  );
}

/**
 * Canonical stage for a BDR lead.
 *
 * Both BDR writers use their own vocabulary — the Dialer writes
 * new_lead/contacted/appointment_booked/closed_won/closed_lost, Street Walk
 * writes cold/warm/hot/won — and `toCanonStage` already maps every one of
 * those. On top of that we escalate using hard evidence: a booked meeting
 * proves Warm, a close-prep meeting or Form 2 artefact proves Hot, and a
 * paid+signed deal proves Won.
 */
export function bdrLeadStage(
  lead: BdrLeadRow,
  deal: BdrLinkedDealRow | undefined,
  events: BdrEventRow[],
): CanonStage {
  if (isConverted(deal)) return "won";

  const declared = toCanonStage(lead.pipeline_stage ?? lead.status);
  if (declared === "lost") return "lost";
  if (declared === "won") return "won";

  const hasClosing =
    events.some((e) => e.source === "closing_meeting") ||
    !!deal?.close_prep_completed_at;
  if (hasClosing) return "hot";

  const hasBooking = events.length > 0 || !!lead.meeting_booked;
  if (hasBooking) return declared === "hot" ? "hot" : "warm";

  // Cold = not contacted, or contacted with no meeting booked.
  return declared === "cold" || declared === "warm" || declared === "hot"
    ? declared === "cold"
      ? "cold"
      : declared
    : "cold";
}

export interface BdrComputeInput {
  leads: BdrLeadRow[];
  deals: BdrLinkedDealRow[];
  events: BdrEventRow[];
  revenueTarget: number | null;
  now?: Date;
}

export interface BdrPipelineResult {
  model: PipelineRevenueModel;
  /** Synthetic deal rows, exposed so the widget can drive the slider. */
  rows: DealRow[];
}

/**
 * Projects BDR leads onto DealRow shape and runs the SAME compute layer used by
 * sub-account dashboards. Valuation rules:
 *  - cold leads contribute $0 — no meeting booked means no pipeline value;
 *  - won leads use the real linked deal (initial fee + 12× recurring);
 *  - warm/hot leads without a deal yet use their own Form-1
 *    `estimated_annual_value` (the $34,997 baseline captured at booking).
 */
export function computeBdrPipelineRevenue(input: BdrComputeInput): BdrPipelineResult {
  const dealById = new Map(input.deals.map((d) => [d.id, d]));
  const eventsByLead = new Map<string, BdrEventRow[]>();
  for (const e of input.events) {
    if (!e.lead_id) continue;
    const arr = eventsByLead.get(e.lead_id) ?? [];
    arr.push(e);
    eventsByLead.set(e.lead_id, arr);
  }

  const staged = input.leads.map((lead) => {
    const deal = lead.crm_deal_id ? dealById.get(lead.crm_deal_id) : undefined;
    const events = eventsByLead.get(lead.id) ?? [];
    return { lead, deal, stage: bdrLeadStage(lead, deal, events) };
  });

  const rows: DealRow[] = staged.map(({ lead, deal, stage }) => {
    const known = bdrDealValue(deal);
    const value =
      stage === "cold"
        ? 0
        : stage === "won"
          ? known
          : // Warm/hot without a linked deal: use the lead's own Form-1
            // estimate. The 34,997 literal is a legacy safety net for rows
            // booked before estimated_annual_value existed.
            known || num(lead.estimated_annual_value) || 34997;
    return {
      id: lead.id,
      client_id: null,
      deal_name: lead.business_name || "Untitled lead",
      deal_value: value,
      pipeline_stage: stage,
      status: stage === "won" || stage === "lost" ? "closed" : "open",
      assigned_user: lead.user_id,
      created_at: lead.created_at,
      lost_reason: stage === "lost" ? lead.objection_category || "other" : null,
      lost_at: stage === "lost" ? lead.updated_at || lead.created_at : null,
    };
  });

  /**
   * Show-up rates come from the BDR's own calendar, not `sales_meetings`:
   * a `closing_meeting` event is the Form 2 (second/final) meeting, anything
   * else booked against a lead is the Form 1 discovery meeting.
   */
  const meetings: MeetingRow[] = input.events
    .filter((e) => !!e.lead_id)
    .map((e) => ({
      id: e.id,
      meeting_type: e.source === "closing_meeting" ? "second" : "first",
      attended:
        e.attendance === "attended"
          ? true
          : e.attendance === "no_show" || e.attendance === "cancelled"
            ? false
            : null,
      start_time: e.starts_at,
      assigned_salesman_user_id: e.user_id,
    }));

  const model = computePipelineRevenue({
    deals: rows,
    meetings,
    revenueTarget: input.revenueTarget,
    now: input.now,
  });

  return { model, rows };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Multi-stage, reschedule-stratified close rates (BDR only).
 *
 * A "reschedule" is inferred from the calendar: a lead with N events of a given
 * meeting kind was rescheduled N-1 times for that kind. Discovery-kind = every
 * event whose `source` is NOT "closing_meeting" (Form 1); closing_meeting-kind
 * = the Form 2 close-prep call.
 *
 * NOTE — no reschedule tier exists for the final stage. Form 3 (onboarding)
 * currently has NO reschedule mechanism at all: `schedule_onboarding` in
 * supabase/functions/pay-sign-context hard-blocks a second scheduling call once
 * `onboarding_meeting_id` is set on the deal, so a lead can never accumulate
 * more than one onboarding event. `finalClose` is therefore a flat overall rate
 * (first booked meeting → won), not reschedule-stratified, until a reschedule
 * flow is built for Form 3 separately.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Sample size below which the UI should mark a rate as low confidence. */
export const LOW_CONFIDENCE_N = 5;

export type RescheduleTier = "0" | "1" | "2" | "3+";
export const RESCHEDULE_TIERS: RescheduleTier[] = ["0", "1", "2", "3+"];
export const RESCHEDULE_TIER_LABEL: Record<RescheduleTier, string> = {
  "0": "Booked on time",
  "1": "After 1 reschedule",
  "2": "After 2 reschedules",
  "3+": "After 3+ reschedules",
};

export interface CloseRate {
  /** 0-1. Zero when there is no sample. */
  rate: number;
  /** Denominator — how many leads this rate was computed from. */
  n: number;
  /** Numerator, kept for tooltips/debugging. */
  hits: number;
  lowConfidence: boolean;
}

export interface StageCloseRate extends CloseRate {
  byReschedule: Array<{ tier: RescheduleTier; label: string } & CloseRate>;
}

export interface BdrStageCloseRates {
  firstMeeting: StageCloseRate;
  secondMeeting: StageCloseRate;
  /** Not reschedule-stratified — see module note above. */
  finalClose: CloseRate;
}

const rateOf = (hits: number, n: number): CloseRate => ({
  rate: n > 0 ? hits / n : 0,
  n,
  hits,
  lowConfidence: n > 0 && n < LOW_CONFIDENCE_N,
});

const tierOf = (eventCount: number): RescheduleTier => {
  const t = Math.max(0, eventCount - 1);
  return t >= 3 ? "3+" : (String(t) as RescheduleTier);
};

/**
 * Stage-by-stage close rates for NewLight's BDR pipeline, stratified by how
 * many times each meeting was rescheduled.
 */
export function computeBdrStageCloseRates(
  leads: BdrLeadRow[],
  deals: BdrLinkedDealRow[],
  events: BdrEventRow[],
): BdrStageCloseRates {
  const dealById = new Map(deals.map((d) => [d.id, d]));
  const eventsByLead = new Map<string, BdrEventRow[]>();
  for (const e of events) {
    if (!e.lead_id) continue;
    const arr = eventsByLead.get(e.lead_id) ?? [];
    arr.push(e);
    eventsByLead.set(e.lead_id, arr);
  }

  const rows = leads.map((lead) => {
    const leadEvents = eventsByLead.get(lead.id) ?? [];
    const deal = lead.crm_deal_id ? dealById.get(lead.crm_deal_id) : undefined;
    const closing = leadEvents.filter((e) => e.source === "closing_meeting");
    const discovery = leadEvents.filter((e) => e.source !== "closing_meeting");
    const stage = bdrLeadStage(lead, deal, leadEvents);
    return {
      stage,
      nonCold: stage !== "cold",
      won: stage === "won",
      discoveryTier: tierOf(discovery.length),
      closingTier: tierOf(closing.length),
      hasClosingEvent: closing.length > 0,
    };
  });

  const tierBreakdown = (
    pool: typeof rows,
    tierKey: (r: (typeof rows)[number]) => RescheduleTier,
    hit: (r: (typeof rows)[number]) => boolean,
  ) =>
    RESCHEDULE_TIERS.map((tier) => {
      const inTier = pool.filter((r) => tierKey(r) === tier);
      return {
        tier,
        label: RESCHEDULE_TIER_LABEL[tier],
        ...rateOf(inTier.filter(hit).length, inTier.length),
      };
    });

  // Stage 1 — did a booked discovery call lead to real progress?
  const firstPool = rows;
  const firstMeeting: StageCloseRate = {
    ...rateOf(firstPool.filter((r) => r.nonCold).length, firstPool.length),
    byReschedule: tierBreakdown(firstPool, (r) => r.discoveryTier, (r) => r.nonCold),
  };

  // Stage 2 — of the leads that reached a close-prep call, how many won?
  const secondPool = rows.filter((r) => r.hasClosingEvent);
  const secondMeeting: StageCloseRate = {
    ...rateOf(secondPool.filter((r) => r.won).length, secondPool.length),
    byReschedule: tierBreakdown(secondPool, (r) => r.closingTier, (r) => r.won),
  };

  // Final — true first-booked-meeting → won conversion across all live leads.
  const finalPool = rows.filter((r) => r.nonCold);
  const finalClose = rateOf(finalPool.filter((r) => r.won).length, finalPool.length);

  return { firstMeeting, secondMeeting, finalClose };
}
