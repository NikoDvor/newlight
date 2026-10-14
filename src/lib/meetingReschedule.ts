import { supabase } from "@/integrations/supabase/client";

export interface RescheduleLead {
  id: string;
  client_id: string | null;
  business_name: string;
  unattended_since?: string | null;
}

/**
 * Reschedule = create a NEW meeting (copy of the old one at the new time),
 * mark the old one 'rescheduled', write the audit log and clear the
 * Unattended flag. Returns the new event id. Throws on any failure that
 * would leave the two meetings inconsistent.
 */
export async function rescheduleMeeting(args: {
  eventId: string;
  lead: RescheduleLead;
  start: Date;
  durationMinutes?: number;
}): Promise<string> {
  const { eventId, lead, start } = args;
  const end = new Date(start.getTime() + (args.durationMinutes ?? 60) * 60_000);
  const db = supabase as any;

  const { data: old, error: readErr } = await db.from("bdr_calendar_events")
    .select("user_id, client_id, calendar_id, lead_id, title, description, source, metadata, zoom_meeting_id, zoom_join_url, zoom_start_url, meeting_kind, reschedule_count, starts_at")
    .eq("id", eventId).single();
  if (readErr || !old) throw new Error(readErr?.message || "Meeting not found");

  const nextCount = (old.reschedule_count ?? 0) + 1;
  const { reschedule_count: _rc, starts_at: previousStartsAt, ...copy } = old;
  const { data: created, error: insErr } = await db.from("bdr_calendar_events")
    .insert({ ...copy, starts_at: start.toISOString(), ends_at: end.toISOString(), attendance: "pending", reschedule_count: nextCount })
    .select("id").single();
  if (insErr || !created) throw new Error(insErr?.message || "Could not create new meeting");

  const { error: updErr } = await db.from("bdr_calendar_events")
    .update({ attendance: "rescheduled" }).eq("id", eventId);
  if (updErr) throw new Error(`New meeting created, but the old one could not be marked rescheduled: ${updErr.message}`);

  if (lead.client_id) {
    await db.from("audit_logs").insert({
      client_id: lead.client_id,
      module: "bdr_pipeline",
      action: "meeting_rescheduled",
      metadata: {
        lead_id: lead.id,
        business_name: lead.business_name,
        previous_starts_at: previousStartsAt ?? null,
        new_starts_at: start.toISOString(),
        old_event_id: eventId,
        new_event_id: created.id,
      },
    });
  }

  if (lead.unattended_since !== null) {
    await db.from("nl_bdr_leads")
      .update({ unattended_since: null, unattended_return_stage: null, unattended_warned_at: null })
      .eq("id", lead.id);
  }

  return created.id as string;
}
