import { supabase } from "@/integrations/supabase/client";

// ─── Appointment Lifecycle Service ─────────────────────────────────
// Centralises all appointment status transitions and cross-module effects.

const exec = (builder: any): Promise<any> => Promise.resolve(builder);

async function logActivity(clientId: string, type: string, note: string, opts?: {
  contactId?: string; companyId?: string; relatedType?: string; relatedId?: string;
}) {
  return exec(supabase.from("crm_activities").insert({
    client_id: clientId, activity_type: type, activity_note: note,
    contact_id: opts?.contactId || null, company_id: opts?.companyId || null,
    related_type: opts?.relatedType || null, related_id: opts?.relatedId || null,
  }));
}

async function logAudit(clientId: string, action: string, metadata?: Record<string, any>) {
  return exec(supabase.from("audit_logs").insert({
    client_id: clientId, action, module: "calendar", metadata: metadata || {},
  }));
}

async function createNotification(clientId: string, title: string, message: string, relatedId?: string) {
  try {
    await exec(supabase.from("notifications" as any).insert({
      client_id: clientId, type: "appointment", title, message,
      module: "calendar", related_id: relatedId || null, status: "unread",
    }));
  } catch { /* notifications table may not exist */ }
}

function updateContact(contactId: string) {
  return exec(supabase.from("crm_contacts").update({
    last_interaction_date: new Date().toISOString(),
  } as any).eq("id", contactId));
}

// ─── STATUS TRANSITIONS ───────────────────────────────────────────

export async function confirmAppointment(clientId: string, appt: any) {
  const promises: Promise<any>[] = [
    exec(supabase.from("appointments").update({ status: "confirmed" }).eq("id", appt.id)),
    logActivity(clientId, "appointment_confirmed", `Appointment "${appt.title}" confirmed`, {
      contactId: appt.contact_id, relatedType: "appointment", relatedId: appt.id,
    }),
    logAudit(clientId, "appointment_confirmed", { appointment_id: appt.id }),
    createNotification(clientId, "Appointment Confirmed", `"${appt.title}" has been confirmed`),
  ];
  if (appt.contact_id) promises.push(updateContact(appt.contact_id));
  await Promise.all(promises);
}

export async function completeAppointment(clientId: string, appt: any) {
  const promises: Promise<any>[] = [
    exec(supabase.from("appointments").update({ status: "completed" }).eq("id", appt.id)),
    logActivity(clientId, "appointment_completed", `Appointment "${appt.title}" completed`, {
      contactId: appt.contact_id, relatedType: "appointment", relatedId: appt.id,
    }),
    logAudit(clientId, "appointment_completed", { appointment_id: appt.id }),
    createNotification(clientId, "Appointment Completed", `"${appt.title}" marked completed`),
  ];
  if (appt.contact_id) promises.push(updateContact(appt.contact_id));

  // Trigger review request workflow
  if (appt.contact_id) {
    const { data: contact } = await supabase.from("crm_contacts")
      .select("full_name, email, phone").eq("id", appt.contact_id).maybeSingle();
    if (contact) {
      promises.push(exec(supabase.from("review_requests" as any).insert({
        client_id: clientId,
        customer_name: contact.full_name,
        customer_email: contact.email || null,
        customer_phone: contact.phone || null,
        channel: contact.phone ? "sms" : "email",
        platform: "google",
        status: "sent",
        contact_id: appt.contact_id,
        appointment_id: appt.id,
      })));
      promises.push(logActivity(clientId, "review_request_auto",
        `Auto review request sent to ${contact.full_name} after completed appointment`, {
          contactId: appt.contact_id, relatedType: "appointment", relatedId: appt.id,
        }));
    }
  }

  await Promise.all(promises);
}

export async function cancelAppointment(clientId: string, appt: any, reason?: string) {
  const promises: Promise<any>[] = [
    exec(supabase.from("appointments").update({
      status: "cancelled", cancellation_reason: reason || null,
    }).eq("id", appt.id)),
    logActivity(clientId, "appointment_cancelled",
      `Appointment "${appt.title}" cancelled${reason ? `: ${reason}` : ""}`, {
        contactId: appt.contact_id, relatedType: "appointment", relatedId: appt.id,
      }),
    logAudit(clientId, "appointment_cancelled", { appointment_id: appt.id, reason }),
    createNotification(clientId, "Appointment Cancelled", `"${appt.title}" was cancelled${reason ? `: ${reason}` : ""}`),
  ];
  if (appt.contact_id) promises.push(updateContact(appt.contact_id));
  await Promise.all(promises);
}

export async function rescheduleAppointment(clientId: string, appt: any, newStart: string, newEnd: string, reason?: string) {
  const promises: Promise<any>[] = [
    exec(supabase.from("appointments").update({
      status: "rescheduled",
      start_time: newStart,
      end_time: newEnd,
      reschedule_reason: reason || null,
    }).eq("id", appt.id)),
    logActivity(clientId, "appointment_rescheduled",
      `Appointment "${appt.title}" rescheduled${reason ? `: ${reason}` : ""}`, {
        contactId: appt.contact_id, relatedType: "appointment", relatedId: appt.id,
      }),
    logAudit(clientId, "appointment_rescheduled", { appointment_id: appt.id, new_start: newStart, reason }),
    createNotification(clientId, "Appointment Rescheduled", `"${appt.title}" has been rescheduled`),
  ];
  if (appt.contact_id) promises.push(updateContact(appt.contact_id));
  await Promise.all(promises);
}

export async function markNoShow(clientId: string, appt: any) {
  const promises: Promise<any>[] = [
    exec(supabase.from("appointments").update({ status: "no_show" }).eq("id", appt.id)),
    logActivity(clientId, "no_show", `No-show for "${appt.title}"`, {
      contactId: appt.contact_id, relatedType: "appointment", relatedId: appt.id,
    }),
    logAudit(clientId, "appointment_no_show", { appointment_id: appt.id }),
    createNotification(clientId, "No Show", `"${appt.title}" marked as no-show`),
    // Create follow-up task
    exec(supabase.from("crm_tasks").insert({
      client_id: clientId,
      title: `Follow up: No-show — ${appt.title}`,
      description: `Customer did not show up. Follow up to reschedule.`,
      priority: "high",
      status: "open",
      related_type: "appointment",
      related_id: appt.id,
    })),
  ];
  if (appt.contact_id) promises.push(updateContact(appt.contact_id));
  await Promise.all(promises);
}
