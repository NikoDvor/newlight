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
  /** Average won value — used as the expected value of an unconverted lead. */
  averageWonValue: number;
}

/**
 * Projects BDR leads onto DealRow shape and runs the SAME compute layer used by
 * sub-account dashboards. Open leads carry no dollar value of their own (a
 * price only exists once Form 2 quotes one), so they are valued at the average
 * realised conversion value — the honest expected value of a lead.
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

  const wonValues = staged
    .filter((s) => s.stage === "won")
    .map((s) => bdrDealValue(s.deal))
    .filter((v) => v > 0);
  const averageWonValue = wonValues.length
    ? wonValues.reduce((a, b) => a + b, 0) / wonValues.length
    : 0;

  const rows: DealRow[] = staged.map(({ lead, deal, stage }) => {
    const known = bdrDealValue(deal);
    const value = stage === "won" ? known : known || averageWonValue;
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

  return { model, rows, averageWonValue };
}
