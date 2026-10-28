import { supabase } from "@/integrations/supabase/client";

/**
 * Extra people on a meeting (bdr_meeting_attendees). On Zoom meetings they get
 * the same confirmation, Zoom link, reminders and reschedule notices as the
 * client — by email, plus texts once they opt in from the link in that email.
 * Meetings away from our Zoom (bdr_calendar_events.is_external) send nothing.
 */
export interface AttendeeDraft {
  name: string;
  email: string;
  phone: string;
}

export interface Attendee {
  id: string;
  event_id: string;
  lead_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  sms_consent: boolean;
}

const db = supabase as any;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function attendeeDraftValid(a: AttendeeDraft): boolean {
  const hasEmail = EMAIL_RE.test(a.email.trim());
  const hasPhone = a.phone.replace(/\D/g, "").length >= 10;
  const emailOk = !a.email.trim() || hasEmail;
  return a.name.trim().length > 0 && (hasEmail || hasPhone) && emailOk;
}

export function cleanDrafts(drafts: AttendeeDraft[]) {
  return drafts.filter(attendeeDraftValid).map((a) => ({
    name: a.name.trim(),
    email: a.email.trim() ? a.email.trim().toLowerCase() : null,
    phone: a.phone.replace(/\D/g, "").length >= 10 ? a.phone.trim() : null,
  }));
}

export async function fetchAttendees(eventId: string): Promise<Attendee[]> {
  const { data, error } = await db.from("bdr_meeting_attendees")
    .select("id, event_id, lead_id, name, email, phone, sms_consent")
    .eq("event_id", eventId).order("created_at", { ascending: true });
  if (error) { console.error("fetchAttendees failed", error); return []; }
  return (data || []) as Attendee[];
}

/** People who joined this lead's earlier meetings — for one-tap reuse. */
export async function fetchLeadAttendeeSuggestions(leadId: string): Promise<AttendeeDraft[]> {
  const { data, error } = await db.from("bdr_meeting_attendees")
    .select("name, email, phone, created_at")
    .eq("lead_id", leadId).order("created_at", { ascending: false }).limit(100);
  if (error) return [];
  const seen = new Set<string>();
  const out: AttendeeDraft[] = [];
  for (const a of data || []) {
    const key = (a.email || "").toLowerCase() || (a.phone || "").replace(/\D/g, "").slice(-10) || a.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: a.name, email: a.email || "", phone: a.phone || "" });
  }
  return out;
}

/** Notify attendees of a meeting (all, or one). Does nothing for away meetings. */
export function notifyAttendees(eventId: string, attendeeId?: string) {
  supabase.functions
    .invoke("meeting-reschedule-notice", { body: { event_id: eventId, mode: "attendees", attendee_id: attendeeId || null } })
    .then(({ error }) => { if (error) console.error("attendee notice failed", error); })
    .catch((e) => console.error("attendee notice failed", e));
}

/** Insert attendees on an event. Returns the created rows. */
export async function insertAttendees(eventId: string, leadId: string | null, drafts: AttendeeDraft[]): Promise<Attendee[]> {
  const rows = cleanDrafts(drafts);
  if (!rows.length) return [];
  const { data, error } = await db.from("bdr_meeting_attendees")
    .insert(rows.map((r) => ({ ...r, event_id: eventId, lead_id: leadId })))
    .select("id, event_id, lead_id, name, email, phone, sms_consent");
  if (error) throw new Error(error.message);
  return (data || []) as Attendee[];
}

/** Carry attendees (and their text opt-in) from an old meeting to its reschedule. */
export async function copyAttendees(fromEventId: string, toEventId: string): Promise<void> {
  const { data } = await db.from("bdr_meeting_attendees")
    .select("lead_id, name, email, phone, sms_consent, sms_consent_at").eq("event_id", fromEventId);
  if (!data?.length) return;
  const { error } = await db.from("bdr_meeting_attendees")
    .insert(data.map((a: any) => ({ ...a, event_id: toEventId })));
  if (error) console.error("copyAttendees failed", error);
}
