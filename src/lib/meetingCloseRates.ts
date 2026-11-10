/**
 * Meeting-by-meeting close rates for a workspace's pipeline (crm_deals + sales_meetings).
 *
 * Definitions (decided with Niko, Nov 7 2026):
 *  - MAIN close rate = first booked meeting (Form 1 / discovery) → won client, decided deals only
 *    (won ÷ won + lost). Deals still in progress are counted separately, never as losses.
 *  - Every meeting also gets its own close rate, show-up rate and reschedule breakdown:
 *      First meeting   → did it move to a closing meeting?
 *      Closing meeting → did it become a won client?
 *      Onboarding      → did the won client show up and get activated?
 *  - Reschedule tier = how many times that meeting was rescheduled or no-showed before it was held.
 *
 * Pure TypeScript (no imports): this exact file is copied to supabase/functions/_shared/meetingCloseRates.ts so the
 * app and the AI Insights generator use the same maths. Keep the two copies identical.
 */
type CanonStage = "cold" | "warm" | "hot" | "won" | "lost";
const RAW_TO_CANON: Record<string, CanonStage> = {
  new_lead: "cold", cold_lead: "cold", cold: "cold", contacted: "cold", qualified: "cold",
  appointment_booked: "warm", warm_lead: "warm", warm: "warm", proposal_sent: "warm",
  hot_lead: "hot", hot: "hot", negotiation: "hot",
  closed_won: "won", won_lead: "won", won: "won",
  closed_lost: "lost", lost: "lost",
};
/** Same mapping as pipelineRevenue.toCanonStage. */
function toCanonStage(raw: string | null | undefined): CanonStage {
  return (raw && RAW_TO_CANON[String(raw).toLowerCase()]) || "cold";
}

export interface MCDeal {
  id: string;
  pipeline_stage: string | null;
  lost_reason: string | null;
}

export interface MCMeeting {
  deal_id: string | null;
  meeting_type: string | null;
  status: string | null;
  attended: boolean | null;
  start_time: string | null;
}

export type MeetingKind = "first" | "closing" | "onboarding";
export type Tier = "0" | "1" | "2" | "3+";
export const TIERS: Tier[] = ["0", "1", "2", "3+"];
export const TIER_LABEL: Record<Tier, string> = {
  "0": "Held on first booking",
  "1": "After 1 reschedule / no-show",
  "2": "After 2",
  "3+": "After 3 or more",
};

export interface Rate { hits: number; n: number; rate: number }
const rate = (hits: number, n: number): Rate => ({ hits, n, rate: n ? hits / n : 0 });

export interface Attendance {
  booked: number;      // meetings whose time has passed (held, no-show, rescheduled, cancelled)
  held: number;
  noShow: number;
  rescheduled: number;
  cancelled: number;
  upcoming: number;
  showRate: number;    // held ÷ (held + no-show)
}

export interface StageClose {
  kind: MeetingKind;
  label: string;
  question: string;
  close: Rate;               // decided only
  inProgress: number;
  byTier: Array<{ tier: Tier; label: string } & Rate>;
  attendance: Attendance;
  topLostReason: { reason: string; count: number } | null;
  lostHere: number;
}

export interface MeetingCloseRates {
  main: Rate & { inProgress: number };
  /** Main close rate split by how many times the FIRST meeting was rescheduled / no-showed. */
  mainByTier: Array<{ tier: Tier; label: string } & Rate>;
  booked: number;
  stages: StageClose[];
}

const FIRST_RE = /discovery|first|intro|form_?1|meeting_?1/i;
const CLOSING_RE = /closing|close|second|final|form_?2|meeting_?2|demo/i;
const ONBOARD_RE = /onboard|form_?3|kickoff/i;

export function meetingKind(t: string | null): MeetingKind | null {
  if (!t) return "first";
  if (ONBOARD_RE.test(t)) return "onboarding";
  if (CLOSING_RE.test(t)) return "closing";
  if (FIRST_RE.test(t)) return "first";
  return null; // follow-ups and other meeting types don't change the funnel
}

const isHeld = (m: MCMeeting) => m.status === "completed" || m.attended === true;
const isMissed = (m: MCMeeting) => m.status === "no_show" || m.status === "rescheduled";

function tierOf(ms: MCMeeting[]): Tier {
  const sorted = [...ms].sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
  let misses = 0;
  for (const m of sorted) {
    if (isHeld(m)) break;
    if (isMissed(m)) misses++;
  }
  return misses >= 3 ? "3+" : (String(misses) as Tier);
}

function attendanceOf(ms: MCMeeting[], now: number): Attendance {
  let held = 0, noShow = 0, rescheduled = 0, cancelled = 0, upcoming = 0;
  for (const m of ms) {
    if (isHeld(m)) held++;
    else if (m.status === "no_show") noShow++;
    else if (m.status === "rescheduled") rescheduled++;
    else if (m.status === "cancelled") cancelled++;
    else if (m.start_time && new Date(m.start_time).getTime() > now) upcoming++;
    else noShow++; // past, never marked held → treat as missed
  }
  return { booked: held + noShow + rescheduled + cancelled, held, noShow, rescheduled, cancelled, upcoming,
    showRate: held + noShow ? held / (held + noShow) : 0 };
}

export function computeMeetingCloseRates(deals: MCDeal[], meetings: MCMeeting[], nowDate = new Date()): MeetingCloseRates {
  const now = nowDate.getTime();
  const byDeal = new Map<string, Record<MeetingKind, MCMeeting[]>>();
  for (const m of meetings) {
    if (!m.deal_id) continue;
    const k = meetingKind(m.meeting_type);
    if (!k) continue;
    const g = byDeal.get(m.deal_id) ?? { first: [], closing: [], onboarding: [] };
    g[k].push(m);
    byDeal.set(m.deal_id, g);
  }

  type Row = { stage: CanonStage; lostReason: string | null; g: Record<MeetingKind, MCMeeting[]> };
  const rows: Row[] = deals.map((d) => ({
    stage: toCanonStage(d.pipeline_stage),
    lostReason: d.lost_reason,
    g: byDeal.get(d.id) ?? { first: [], closing: [], onboarding: [] },
  }));

  const booked = rows.filter((r) => r.g.first.length > 0 || r.g.closing.length > 0 || ["warm", "hot", "won"].includes(r.stage));
  const decided = (r: Row) => r.stage === "won" || r.stage === "lost";
  const reachedClosing = (r: Row) => r.g.closing.length > 0 || r.stage === "hot" || r.stage === "won";

  // MAIN — first booked meeting → won
  const bookedDecided = booked.filter(decided);
  const main = { ...rate(bookedDecided.filter((r) => r.stage === "won").length, bookedDecided.length),
    inProgress: booked.length - bookedDecided.length };
  const mainByTier = TIERS.map((t) => {
    const p = bookedDecided.filter((r) => tierOf(r.g.first) === t);
    return { tier: t, label: TIER_LABEL[t], ...rate(p.filter((r) => r.stage === "won").length, p.length) };
  });

  const lostReasonTop = (pool: Row[]) => {
    const c = new Map<string, number>();
    for (const r of pool) c.set(r.lostReason || "other", (c.get(r.lostReason || "other") ?? 0) + 1);
    const top = [...c.entries()].sort((a, b) => b[1] - a[1])[0];
    return top ? { reason: top[0], count: top[1] } : null;
  };

  // FIRST meeting — outcome known when it moved to closing, or the deal was lost before a closing meeting
  const firstPool = booked.filter((r) => reachedClosing(r) || r.stage === "lost");
  const firstHit = (r: Row) => reachedClosing(r);
  const lostAtFirst = booked.filter((r) => r.stage === "lost" && !reachedClosing(r));
  const first: StageClose = {
    kind: "first",
    label: "First meeting (discovery)",
    question: "Booked first meeting → closing meeting booked",
    close: rate(firstPool.filter(firstHit).length, firstPool.length),
    inProgress: booked.length - firstPool.length,
    byTier: TIERS.map((t) => {
      const p = firstPool.filter((r) => tierOf(r.g.first) === t);
      return { tier: t, label: TIER_LABEL[t], ...rate(p.filter(firstHit).length, p.length) };
    }),
    attendance: attendanceOf(booked.flatMap((r) => r.g.first), now),
    topLostReason: lostReasonTop(lostAtFirst),
    lostHere: lostAtFirst.length,
  };

  // CLOSING meeting — won ÷ (won + lost) among deals that reached a closing meeting
  const closingAll = rows.filter(reachedClosing);
  const closingPool = closingAll.filter(decided);
  const lostAtClosing = closingPool.filter((r) => r.stage === "lost");
  const closing: StageClose = {
    kind: "closing",
    label: "Closing meeting",
    question: "Closing meeting → won client",
    close: rate(closingPool.filter((r) => r.stage === "won").length, closingPool.length),
    inProgress: closingAll.length - closingPool.length,
    byTier: TIERS.map((t) => {
      const p = closingPool.filter((r) => tierOf(r.g.closing) === t);
      return { tier: t, label: TIER_LABEL[t], ...rate(p.filter((r) => r.stage === "won").length, p.length) };
    }),
    attendance: attendanceOf(closingAll.flatMap((r) => r.g.closing), now),
    topLostReason: lostReasonTop(lostAtClosing),
    lostHere: lostAtClosing.length,
  };

  // ONBOARDING — won clients whose onboarding meeting was held
  const wonRows = rows.filter((r) => r.stage === "won");
  const onbDue = wonRows.filter((r) => r.g.onboarding.some((m) => isHeld(m) || (m.start_time && new Date(m.start_time).getTime() <= now)));
  const onboarding: StageClose = {
    kind: "onboarding",
    label: "Onboarding",
    question: "Won client → onboarding held (account activated)",
    close: rate(onbDue.filter((r) => r.g.onboarding.some(isHeld)).length, onbDue.length),
    inProgress: wonRows.length - onbDue.length,
    byTier: TIERS.map((t) => {
      const p = onbDue.filter((r) => tierOf(r.g.onboarding) === t);
      return { tier: t, label: TIER_LABEL[t], ...rate(p.filter((r) => r.g.onboarding.some(isHeld)).length, p.length) };
    }),
    attendance: attendanceOf(wonRows.flatMap((r) => r.g.onboarding), now),
    topLostReason: null,
    lostHere: 0,
  };

  return { main, mainByTier, booked: booked.length, stages: [first, closing, onboarding] };
}

/* ─── NewLight's own salesmen pipeline ───
 * NewLight's salesmen log meetings in bdr_calendar_events + bdr_meeting_outcomes on nl_bdr_leads (not sales_meetings).
 * These convert those rows into the same inputs, so AI Insights shows the same maths for NewLight's own workspace. */
export interface BdrLeadRow { id: string; pipeline_stage: string | null; status: string | null; crm_deal_id: string | null }
export interface BdrEventRow { id: string; lead_id: string | null; meeting_kind: string | null; attendance: string | null; starts_at: string | null }
export interface BdrOutcomeRow { event_id: string; lead_id: string | null; result: string | null; primary_lost_reason: string | null; logged_at: string | null; attendance?: string | null }
export interface BdrDealRow { id: string; pay_sign_status: string | null }

export function bdrCloseRateInputs(leads: BdrLeadRow[], events: BdrEventRow[], outcomes: BdrOutcomeRow[], deals: BdrDealRow[]): { deals: MCDeal[]; meetings: MCMeeting[] } {
  const paid = new Set(deals.filter((d) => d.pay_sign_status === "paid_signed").map((d) => d.id));
  const lostBy = new Map<string, BdrOutcomeRow>();
  for (const o of outcomes) {
    if (o.result !== "lost" || !o.lead_id) continue;
    const prev = lostBy.get(o.lead_id);
    if (!prev || String(o.logged_at) > String(prev.logged_at)) lostBy.set(o.lead_id, o);
  }
  const outByEvent = new Map(outcomes.map((o) => [o.event_id, o]));
  const TYPE: Record<string, string> = { discovery: "discovery_call", closing: "closing_call", onboarding: "onboarding_call" };
  const STATUS: Record<string, string> = { attended: "completed", no_show: "no_show", rescheduled: "rescheduled", cancelled: "cancelled" };
  const mcDeals: MCDeal[] = leads.map((l) => {
    const won = (l.crm_deal_id && paid.has(l.crm_deal_id)) || l.pipeline_stage === "won";
    const lost = !won && (l.status === "closed_lost" || lostBy.has(l.id));
    return {
      id: l.id,
      pipeline_stage: won ? "won" : lost ? "lost" : (l.pipeline_stage || "cold"),
      lost_reason: lost ? lostBy.get(l.id)?.primary_lost_reason ?? null : null,
    };
  });
  const mcMeetings: MCMeeting[] = events
    .filter((e) => e.lead_id && e.meeting_kind && TYPE[e.meeting_kind])
    .map((e) => {
      const att = outByEvent.get(e.id)?.attendance ?? e.attendance;
      return {
        deal_id: e.lead_id,
        meeting_type: TYPE[e.meeting_kind!],
        status: STATUS[att || ""] || "scheduled",
        attended: att === "attended",
        start_time: e.starts_at,
      };
    });
  return { deals: mcDeals, meetings: mcMeetings };
}
