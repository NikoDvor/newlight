import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LOST_REASONS, RESCHEDULE_REASONS, type LostReason } from "@/lib/meetingOutcomes";
import {
  JOURNEY_KINDS, buildLeadJourney, journeyKindLabel, journeyStatusText,
  type JourneyEvent, type JourneyOutcome, type LeadJourney,
} from "@/lib/leadJourney";

export const JOURNEY_EVENT_SELECT = "id, lead_id, meeting_kind, attempt_number, meeting_sequence, attendance, starts_at, created_at, user_id";
export const JOURNEY_OUTCOME_SELECT = "id, event_id, lead_id, rep_user_id, meeting_kind, attempt_number, meeting_sequence, attendance, result, next_step, reschedule_reason, primary_lost_reason, lost_reasons, logged_at";

const reasonLabel = (k: string) => LOST_REASONS[k as LostReason] || k;
const NEXT: Record<string, string> = { form_2: "Form 2", form_3: "Pay & Sign", activated: "Activated" };
const pctText = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const fmtDate = (iso: string) => new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** Batch loader: one events query + one outcomes query for many leads. */
export async function loadLeadJourneys(leadIds: string[]): Promise<Map<string, LeadJourney>> {
  if (!leadIds.length) return new Map();
  const db = supabase as any;
  const evs: JourneyEvent[] = [];
  const outs: JourneyOutcome[] = [];
  for (let i = 0; i < leadIds.length; i += 200) {
    const chunk = leadIds.slice(i, i + 200);
    const [{ data: e }, { data: o }] = await Promise.all([
      db.from("bdr_calendar_events").select(JOURNEY_EVENT_SELECT).in("lead_id", chunk).in("meeting_kind", JOURNEY_KINDS as unknown as string[]),
      db.from("bdr_meeting_outcomes").select(JOURNEY_OUTCOME_SELECT).in("lead_id", chunk),
    ]);
    evs.push(...(e || [])); outs.push(...(o || []));
  }
  return buildLeadJourney(evs, outs);
}

function rowText(r: LeadJourney["timeline"][number]) {
  const o = r.outcome;
  const att = o?.attendance || r.event?.attendance;
  const attText = att === "attended" ? "Attended" : att === "no_show" ? "No-show" : att === "cancelled" ? "Cancelled" : att === "rescheduled" ? "Rescheduled" : null;
  if (!o) {
    if (r.event && new Date(r.event.starts_at).getTime() > Date.now() && (!att || att === "pending")) return { text: "Upcoming", tone: "muted" };
    if (att === "rescheduled" || att === "cancelled") return { text: attText!, tone: "muted" };
    return { text: "Outcome needed", tone: "red" };
  }
  let res = "";
  if (o.result === "won") res = `Won${o.next_step ? ` → ${NEXT[o.next_step] || o.next_step}` : ""}`;
  else if (o.result === "rescheduled") res = `Rescheduled${o.reschedule_reason ? ` (${RESCHEDULE_REASONS[o.reschedule_reason as keyof typeof RESCHEDULE_REASONS] || o.reschedule_reason})` : ""}`;
  else res = `Lost${o.primary_lost_reason ? ` — ${reasonLabel(o.primary_lost_reason)}` : ""}`;
  const tone = o.result === "won" ? "green" : o.result === "lost" ? "red" : "muted";
  return { text: `${attText && r.kind !== "pay_sign" ? `${attText} → ` : ""}${res}`, tone };
}

export function JourneyCompact({ journey }: { journey: LeadJourney }) {
  const j = journey;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      {j.meetings} meeting{j.meetings === 1 ? "" : "s"} · {j.reschedules} resched · {pctText(j.attendanceRate)} attended
      {j.status === "lost" && (
        <span className="px-1.5 py-0.5 rounded bg-destructive/15 text-destructive font-medium">
          {j.lostAt?.meetingSequence ? `Lost at mtg ${j.lostAt.meetingSequence}` : "Lost"}
        </span>
      )}
      {j.status === "won" && <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">Won</span>}
    </span>
  );
}

interface Props { leadId: string; compact?: boolean; journey?: LeadJourney | null; reloadKey?: number }

export default function LeadMeetingJourney({ leadId, compact, journey: provided, reloadKey }: Props) {
  const [loaded, setLoaded] = useState<LeadJourney | null>(null);
  const [loading, setLoading] = useState(!provided);

  useEffect(() => {
    if (provided !== undefined) return;
    let cancelled = false;
    setLoading(true);
    loadLeadJourneys([leadId]).then((m) => { if (!cancelled) { setLoaded(m.get(leadId) || null); setLoading(false); } })
      .catch((e) => { console.error("[LeadMeetingJourney]", e); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [leadId, provided, reloadKey]);

  const j = provided !== undefined ? provided : loaded;
  if (compact) return j && j.meetings > 0 ? <JourneyCompact journey={j} /> : null;
  if (loading) return <p className="text-xs text-muted-foreground">Loading journey…</p>;
  if (!j || (j.meetings === 0 && j.timeline.length === 0)) return <p className="text-xs text-muted-foreground">No tracked meetings yet.</p>;

  let headline = journeyStatusText(j, reasonLabel);
  if (j.status === "in_progress") {
    const next = j.timeline.find((r) => r.event && !r.outcome && new Date(r.event.starts_at).getTime() > Date.now() && (!r.event.attendance || r.event.attendance === "pending"));
    headline = next?.event
      ? `In progress — next: ${journeyKindLabel(next.kind, next.attempt)}, ${new Date(next.event.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
      : "In progress";
  }
  const tone = j.status === "won" ? "text-emerald-400" : j.status === "lost" ? "text-destructive" : "text-foreground";

  const chips: [string, string][] = [
    ["Meetings", String(j.meetings)], ["Attended", String(j.attended)], ["No-shows", String(j.noShows)],
    ["Reschedules", String(j.reschedules)], ["Cancellations", String(j.cancellations)],
    ["Attendance", pctText(j.attendanceRate)], ["Reschedule", pctText(j.rescheduleRate)],
    ...JOURNEY_KINDS.map((k) => [k === "check_in" ? "Check-ins" : k[0].toUpperCase() + k.slice(1), `${j.stages[k].held}/${j.stages[k].booked}`] as [string, string]),
  ];

  return (
    <div className="space-y-3">
      <p className={`text-sm font-medium ${tone}`}>{headline}</p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map(([l, v]) => (
          <span key={l} className="text-[11px] rounded-md border border-border bg-muted/30 px-2 py-1">
            <span className="text-muted-foreground">{l}</span> <span className="text-foreground font-medium">{v}</span>
          </span>
        ))}
      </div>
      <div className="space-y-1.5">
        {j.timeline.map((r, i) => {
          const t = rowText(r);
          const c = t.tone === "red" ? "text-destructive" : t.tone === "green" ? "text-emerald-400" : "text-muted-foreground";
          const when = r.event ? fmtDate(r.event.starts_at) : r.outcome ? fmtDate(r.outcome.logged_at) : "";
          return (
            <div key={(r.event?.id || r.outcome?.id || "") + i} className="text-xs rounded-md bg-muted/20 border border-border px-2.5 py-1.5">
              <span className="text-foreground">{r.sequence ? `Meeting ${r.sequence} · ` : ""}{journeyKindLabel(r.kind, r.attempt)}</span>
              <span className="text-muted-foreground"> · {when} · </span>
              <span className={c}>{t.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
