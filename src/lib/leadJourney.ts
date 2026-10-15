/**
 * Per-lead meeting journey: rolls tracked meetings (discovery / closing /
 * onboarding) and their outcomes into counts, rates, status and a timeline.
 * Pure — callers load the rows.
 */

export const JOURNEY_KINDS = ["discovery", "closing", "onboarding"] as const;
export type JourneyKind = (typeof JOURNEY_KINDS)[number];

export interface JourneyEvent {
  id: string;
  lead_id: string | null;
  meeting_kind: string | null;
  attempt_number: number | null;
  meeting_sequence?: number | null;
  attendance: string | null;
  starts_at: string;
  created_at?: string | null;
  user_id?: string | null;
}

export interface JourneyOutcome {
  id?: string;
  event_id: string;
  lead_id: string | null;
  rep_user_id?: string | null;
  meeting_kind: string;
  attempt_number: number | null;
  meeting_sequence?: number | null;
  attendance: string | null;
  result: "won" | "rescheduled" | "lost";
  next_step: string | null;
  reschedule_reason: string | null;
  primary_lost_reason: string | null;
  lost_reasons?: string[] | null;
  logged_at: string;
}

export interface JourneyTimelineRow {
  event: JourneyEvent | null; // null for the pay_sign row
  outcome: JourneyOutcome | null;
  sequence: number | null;
  kind: string;
  attempt: number;
}

export interface LostAt {
  meetingSequence: number | null;
  kind: string;
  attempt: number;
  wasRescheduledMeeting: boolean;
  reason: string | null;
  viaCancel: boolean;
}

export interface LeadJourney {
  leadId: string;
  meetings: number;
  attended: number;
  noShows: number;
  reschedules: number;
  cancellations: number;
  attendanceRate: number | null;
  rescheduleRate: number | null;
  stages: Record<JourneyKind, { held: number; booked: number }>;
  furthestStage: JourneyKind | "pay_sign" | "activated" | null;
  status: "won" | "lost" | "in_progress";
  lostAt: LostAt | null;
  timeline: JourneyTimelineRow[];
}

const isTracked = (k: string | null | undefined): k is JourneyKind => JOURNEY_KINDS.includes((k || "") as JourneyKind);

export function buildLeadJourney(events: JourneyEvent[], outcomes: JourneyOutcome[]): Map<string, LeadJourney> {
  const evByLead = new Map<string, JourneyEvent[]>();
  events.forEach((e) => {
    if (!e.lead_id || !isTracked(e.meeting_kind)) return;
    const a = evByLead.get(e.lead_id) || []; a.push(e); evByLead.set(e.lead_id, a);
  });
  const outByEvent = new Map<string, JourneyOutcome>();
  const paySignByLead = new Map<string, JourneyOutcome>();
  const outsByLead = new Map<string, JourneyOutcome[]>();
  outcomes.forEach((o) => {
    if (o.meeting_kind === "pay_sign") { if (o.lead_id) paySignByLead.set(o.lead_id, o); }
    else outByEvent.set(o.event_id, o);
    if (o.lead_id) { const a = outsByLead.get(o.lead_id) || []; a.push(o); outsByLead.set(o.lead_id, a); }
  });

  const result = new Map<string, LeadJourney>();
  const leadIds = new Set<string>([...evByLead.keys(), ...paySignByLead.keys()]);
  leadIds.forEach((leadId) => {
    const evs = (evByLead.get(leadId) || []).slice().sort((a, b) =>
      (a.meeting_sequence ?? 1e9) - (b.meeting_sequence ?? 1e9) ||
      String(a.created_at || a.starts_at).localeCompare(String(b.created_at || b.starts_at)));
    const outs = outsByLead.get(leadId) || [];

    let attended = 0, noShows = 0, reschedules = 0, cancellations = 0;
    const stages: LeadJourney["stages"] = {
      discovery: { held: 0, booked: 0 }, closing: { held: 0, booked: 0 }, onboarding: { held: 0, booked: 0 },
    };
    const timeline: JourneyTimelineRow[] = evs.map((e) => {
      const o = outByEvent.get(e.id) || null;
      const att = o?.attendance || e.attendance;
      if (att === "attended") attended++;
      else if (att === "no_show") noShows++;
      if (e.attendance === "rescheduled") reschedules++;
      if (e.attendance === "cancelled" || o?.attendance === "cancelled") cancellations++;
      const k = e.meeting_kind as JourneyKind;
      stages[k].booked++;
      if (att === "attended") stages[k].held++;
      return { event: e, outcome: o, sequence: e.meeting_sequence ?? null, kind: k, attempt: e.attempt_number ?? 1 };
    });
    const ps = paySignByLead.get(leadId) || null;
    if (ps) timeline.push({ event: null, outcome: ps, sequence: null, kind: "pay_sign", attempt: ps.attempt_number ?? 1 });

    const meetings = evs.length;
    const activated = outs.some((o) => o.meeting_kind === "onboarding" && o.result === "won");
    const lost = outs.filter((o) => o.result === "lost").sort((a, b) => b.logged_at.localeCompare(a.logged_at))[0];

    let furthest: LeadJourney["furthestStage"] = null;
    if (stages.discovery.booked) furthest = "discovery";
    if (stages.closing.booked) furthest = "closing";
    if (outs.some((o) => o.meeting_kind === "closing" && o.result === "won") || ps) furthest = "pay_sign";
    if (stages.onboarding.booked) furthest = "onboarding";
    if (activated) furthest = "activated";

    let lostAt: LostAt | null = null;
    if (lost) {
      const isPs = lost.meeting_kind === "pay_sign";
      const attempt = lost.attempt_number ?? 1;
      lostAt = {
        meetingSequence: isPs ? null : (lost.meeting_sequence ?? evs.find((e) => e.id === lost.event_id)?.meeting_sequence ?? null),
        kind: lost.meeting_kind,
        attempt,
        wasRescheduledMeeting: !isPs && attempt > 1,
        reason: lost.primary_lost_reason,
        viaCancel: lost.attendance === "cancelled",
      };
    }

    result.set(leadId, {
      leadId, meetings, attended, noShows, reschedules, cancellations,
      attendanceRate: attended + noShows ? attended / (attended + noShows) : null,
      rescheduleRate: meetings ? reschedules / meetings : null,
      stages, furthestStage: furthest,
      status: activated ? "won" : lost ? "lost" : "in_progress",
      lostAt, timeline,
    });
  });
  return result;
}

const SHORT: Record<string, string> = { discovery: "Discovery", closing: "Closing", onboarding: "Onboarding", pay_sign: "Pay & Sign", activated: "Activated" };
export const journeyKindLabel = (k: string, attempt?: number | null) => (k === "pay_sign" ? "Pay & Sign" : `${SHORT[k] || k} #${attempt ?? 1}`);
export const furthestStageLabel = (s: LeadJourney["furthestStage"]) => (s ? SHORT[s] : "—");

/** "Lost at meeting 3 — Closing #1 — Too expensive" style status text. */
export function journeyStatusText(j: LeadJourney, reasonLabel: (k: string) => string): string {
  if (j.status === "won") return `Won — activated after ${j.meetings} meeting${j.meetings === 1 ? "" : "s"}${j.reschedules ? ` (${j.reschedules} reschedule${j.reschedules === 1 ? "" : "s"})` : ""}`;
  if (j.status === "lost" && j.lostAt) {
    const l = j.lostAt;
    const where = l.kind === "pay_sign" ? "Pay & Sign" : `${l.meetingSequence ? `meeting ${l.meetingSequence} — ` : ""}${journeyKindLabel(l.kind, l.attempt)}`;
    const reasons = l.reason ? ` — ${reasonLabel(l.reason)}` : "";
    return `Lost at ${where}${l.viaCancel ? " (cancelled)" : ""}${reasons}`;
  }
  return "In progress";
}
