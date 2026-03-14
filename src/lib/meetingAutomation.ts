import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FUNCTION_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/process-meeting-reminders`;

export async function triggerBookingConfirmation(prospectId: string, meetingDate: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({
      action: "queue_booking_confirmation",
      prospect_id: prospectId,
      meeting_date: meetingDate,
    }),
  });
  return res.json();
}

export async function markAssetReady(prospectId: string, assetType: "demo_app" | "demo_website" | "audit", link?: string) {
  const updateData: Record<string, any> = {};
  if (assetType === "demo_app") {
    updateData.demo_app_ready = true;
    if (link) updateData.demo_app_link = link;
  } else if (assetType === "demo_website") {
    updateData.demo_website_ready = true;
    if (link) updateData.demo_website_link = link;
  } else if (assetType === "audit") {
    updateData.audit_ready = true;
    if (link) updateData.audit_link = link;
  }

  await supabase
    .from("meeting_status")
    .update(updateData)
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false })
    .limit(1);
}

export async function getMeetingStatus(prospectId: string) {
  const { data } = await supabase
    .from("meeting_status")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getReminderHistory(prospectId: string) {
  const { data } = await supabase
    .from("meeting_reminders")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("scheduled_at", { ascending: true });
  return data || [];
}

export async function getMessageLog(prospectId: string) {
  const { data } = await supabase
    .from("message_send_log")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false });
  return data || [];
}

export const MEETING_STATUSES = [
  "booked", "confirmed", "demo_ready", "reminder_sent",
  "cancelled", "reschedule_requested", "rescheduled",
  "completed", "no_show",
] as const;

export const MEETING_STATUS_LABELS: Record<string, string> = {
  booked: "Booked",
  confirmed: "Confirmed",
  demo_ready: "Demo Ready",
  reminder_sent: "Reminder Sent",
  cancelled: "Cancelled",
  reschedule_requested: "Reschedule Requested",
  rescheduled: "Rescheduled",
  completed: "Meeting Completed",
  no_show: "No Show",
};

export const MEETING_STATUS_COLORS: Record<string, string> = {
  booked: "text-[hsl(var(--nl-sky))] bg-[hsla(211,96%,60%,.12)]",
  confirmed: "text-[hsl(var(--nl-neon))] bg-[hsla(211,96%,60%,.15)]",
  demo_ready: "text-emerald-400 bg-emerald-400/10",
  reminder_sent: "text-[hsl(var(--nl-cyan))] bg-[hsla(187,70%,58%,.12)]",
  cancelled: "text-red-400 bg-red-400/10",
  reschedule_requested: "text-yellow-400 bg-yellow-400/10",
  rescheduled: "text-[hsl(var(--nl-sky))] bg-[hsla(211,96%,60%,.12)]",
  completed: "text-emerald-400 bg-emerald-400/10",
  no_show: "text-red-400 bg-red-400/10",
};
