import { supabase } from "@/integrations/supabase/client";
import { ensureBdrCalendar } from "@/lib/bdrCalendar";

/**
 * Creates an extra meeting with a lead ("they want another meeting before the next form").
 * Not a reschedule: it is its own meeting with its own outcome. The database numbers it
 * (followup_number 1, 2, 3…) so close rates can count how many extra meetings a lead needed.
 * The lead's stage does not change — only the forms move a lead.
 */
export async function createExtraMeeting(args: {
  leadId: string;
  kind: "discovery" | "closing" | "onboarding" | "check_in";
  extraType: string;
  label: string;
  start: Date;
  durationMinutes?: number;
  notes?: string | null;
  away?: boolean;
  /** false = caller sends the notice itself (e.g. after adding attendees, so they get it too). */
  notify?: boolean;
}): Promise<string> {
  const db = supabase as any;
  const cal = await ensureBdrCalendar();
  if (!cal) throw new Error("No calendar found");
  const { data: lead } = await db.from("nl_bdr_leads")
    .select("id, client_id, business_name, owner_name, phone, email").eq("id", args.leadId).maybeSingle();
  if (!lead) throw new Error("Lead not found");
  const end = new Date(args.start.getTime() + (args.durationMinutes ?? 60) * 60_000);
  const notes = args.notes?.trim() || null;
  const { data: created, error } = await db.from("bdr_calendar_events").insert({
    user_id: (cal as any).user_id,
    client_id: lead.client_id || (cal as any).client_id,
    calendar_id: (cal as any).id,
    lead_id: lead.id,
    title: `${args.label}: ${lead.business_name}`,
    description: notes,
    notes,
    starts_at: args.start.toISOString(),
    ends_at: end.toISOString(),
    source: "extra_meeting",
    meeting_kind: args.kind,
    is_extra: true,
    extra_type: args.extraType,
    is_external: !!args.away,
    attendance: "pending",
    metadata: {
      customer_name: lead.owner_name || null,
      business_name: lead.business_name,
      phone: lead.phone || null,
      email: lead.email || null,
      extra_type: args.extraType,
    },
  }).select("id").single();
  if (error) throw new Error(error.message);

  if (args.notify !== false) sendExtraMeetingNotice(created.id);
  return created.id as string;
}

/** Zoom link + client/rep/attendee notice (fire-and-forget; never blocks scheduling). */
export function sendExtraMeetingNotice(eventId: string) {
  supabase.functions
    .invoke("meeting-reschedule-notice", { body: { event_id: eventId, mode: "scheduled" } })
    .then(({ error: nErr }) => { if (nErr) console.error("extra meeting notice failed", nErr); })
    .catch((e) => console.error("extra meeting notice failed", e));
}

/** "Discovery #1", "Discovery follow-up 2", "Closing follow-up 1 · try 2" */
export function meetingLabel(kind: string | null | undefined, attempt?: number | null, followup?: number | null) {
  const SHORT: Record<string, string> = { discovery: "Discovery", closing: "Closing", onboarding: "Onboarding", pay_sign: "Pay & Sign", check_in: "Check-in" };
  const k = SHORT[kind || ""] || "Meeting";
  if (kind === "pay_sign") return k;
  const f = followup ?? 0;
  const a = attempt ?? 1;
  if (f > 0) return `${k} follow-up ${f}${a > 1 ? ` · try ${a}` : ""}`;
  return `${k} #${a}`;
}
