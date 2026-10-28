// Extra meeting attendees (bdr_meeting_attendees): shared loader + email body.
// Attendees get the same confirmation, Zoom link, reminders and reschedule
// notices as the client — email always, texts only after they opt in from the
// link in their email (public page /meeting-texts/:token).
// Meetings marked away from our Zoom (bdr_calendar_events.is_external) send
// attendees nothing; callers check that before using these helpers.

export const OPTIN_BASE = "https://newlight-app.com/meeting-texts/";

export interface MeetingAttendee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  sms_consent: boolean;
  optin_token: string;
}

// deno-lint-ignore no-explicit-any
export async function loadAttendees(admin: any, eventId: string): Promise<MeetingAttendee[]> {
  const { data, error } = await admin
    .from("bdr_meeting_attendees")
    .select("id, name, email, phone, sms_consent, optin_token")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[attendees] load failed:", error.message);
    return [];
  }
  return (data || []) as MeetingAttendee[];
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** One attendee email: greeting, the meeting line, Zoom link, and (until they
 *  opt in) a "Text me reminders" link. */
export function attendeeEmail(args: {
  attendee: MeetingAttendee;
  line: string; // e.g. "Your NewLight Closing meeting with Acme is scheduled for Tue, Nov 3, 10:00 AM PT."
  zoom?: string | null;
  businessName?: string | null;
}): { html: string; text: string } {
  const { attendee, line, zoom } = args;
  const optin = attendee.sms_consent ? "" : `${OPTIN_BASE}${attendee.optin_token}`;
  const text = [
    `Hi ${attendee.name || "there"},`,
    "",
    line,
    zoom ? `\nJoin on Zoom: ${zoom}` : "",
    optin ? `\nWant text reminders too? Turn them on here: ${optin}` : "",
    "",
    "— NewLight",
  ].filter((l) => l !== undefined).join("\n");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:520px;margin:0 auto;padding:24px;font-size:15px;line-height:1.6;">
<p>Hi ${esc(attendee.name || "there")},</p>
<p>${esc(line)}</p>
${zoom ? `<p>Join on Zoom: <a href="${esc(zoom)}">${esc(zoom)}</a></p>` : ""}
${optin ? `<p style="font-size:13px;color:#555;">Want text reminders too? <a href="${esc(optin)}">Text me reminders</a></p>` : ""}
<p>— NewLight</p></div>`;
  return { html, text };
}
