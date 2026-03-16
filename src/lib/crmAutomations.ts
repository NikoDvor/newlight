import { supabase } from "@/integrations/supabase/client";

// ─── Central CRM Automation Service ────────────────────────────────
// Every cross-module workflow goes through here so the platform
// behaves like one connected operating system.

type ActivityType =
  | "contact_created" | "contact_updated" | "company_created" | "company_updated"
  | "lead_created" | "lead_stage_changed" | "deal_created" | "deal_stage_changed" | "deal_won" | "deal_lost"
  | "task_created" | "task_completed" | "task_overdue"
  | "appointment_booked" | "appointment_confirmed" | "appointment_completed"
  | "appointment_cancelled" | "appointment_rescheduled" | "no_show"
  | "review_request_sent" | "review_request_auto" | "review_feedback_received"
  | "negative_feedback" | "public_review_requested" | "recovery_task_created"
  | "email_matched" | "email_sent" | "email_received"
  | "revenue_recorded" | "inactive_customer_detected"
  | "crm_sync_completed" | "crm_sync_failed"
  | "stage_changed" | "note_added" | "import_completed";

async function logActivity(clientId: string, type: ActivityType, note: string, opts?: {
  contactId?: string; companyId?: string; relatedType?: string; relatedId?: string;
}) {
  return supabase.from("crm_activities").insert({
    client_id: clientId,
    activity_type: type,
    activity_note: note,
    contact_id: opts?.contactId || null,
    company_id: opts?.companyId || null,
    related_type: opts?.relatedType || null,
    related_id: opts?.relatedId || null,
  });
}

async function logAudit(clientId: string, action: string, module: string, metadata?: Record<string, any>) {
  return supabase.from("audit_logs").insert({
    client_id: clientId, action, module, metadata: metadata || {},
  });
}

// ─── APPOINTMENT LIFECYCLE ─────────────────────────────────────────

export async function onAppointmentBooked(clientId: string, event: any) {
  const promises: Promise<any>[] = [];

  // Create or update contact
  if (event.contact_email || event.contact_name) {
    const { data: existing } = await supabase
      .from("crm_contacts")
      .select("id")
      .eq("client_id", clientId)
      .eq("email", event.contact_email || "")
      .maybeSingle();

    if (existing) {
      promises.push(
        supabase.from("crm_contacts").update({
          last_interaction_date: new Date().toISOString(),
          number_of_appointments: (event._contact_appts || 0) + 1,
        } as any).eq("id", existing.id)
      );
      // Link event to contact
      if (!event.contact_id) {
        promises.push(
          supabase.from("calendar_events").update({ contact_id: existing.id }).eq("id", event.id)
        );
      }
    } else if (event.contact_name) {
      const { data: newContact } = await supabase.from("crm_contacts").insert({
        client_id: clientId,
        full_name: event.contact_name,
        email: event.contact_email || null,
        phone: event.contact_phone || null,
        lead_source: "booking",
        pipeline_stage: "appointment_booked",
        first_contact_date: new Date().toISOString(),
        last_interaction_date: new Date().toISOString(),
        number_of_appointments: 1,
      } as any).select("id").single();
      if (newContact) {
        promises.push(
          supabase.from("calendar_events").update({ contact_id: newContact.id }).eq("id", event.id)
        );
        promises.push(logActivity(clientId, "contact_created", `Contact "${event.contact_name}" auto-created from booking`, { contactId: newContact.id }));
      }
    }
  }

  promises.push(logActivity(clientId, "appointment_booked", `Appointment "${event.title}" booked for ${event.contact_name || "Unknown"}`, {
    contactId: event.contact_id, relatedType: "calendar_event", relatedId: event.id,
  }));
  promises.push(logAudit(clientId, "appointment_booked", "calendar", { event_id: event.id, title: event.title }));

  await Promise.all(promises);
}

export async function onAppointmentCompleted(clientId: string, event: any) {
  const promises: Promise<any>[] = [];

  // Update contact last interaction
  if (event.contact_id) {
    promises.push(
      supabase.from("crm_contacts").update({
        last_interaction_date: new Date().toISOString(),
      } as any).eq("id", event.contact_id)
    );
  }

  // Auto-send review request
  if (event.contact_name) {
    promises.push(
      supabase.from("review_requests" as any).insert({
        client_id: clientId,
        customer_name: event.contact_name,
        customer_email: event.contact_email || null,
        customer_phone: event.contact_phone || null,
        channel: event.contact_phone ? "sms" : "email",
        platform: "google",
        status: "sent",
        contact_id: event.contact_id || null,
        appointment_id: event.id,
      })
    );
    promises.push(logActivity(clientId, "review_request_auto", `Auto review request sent to ${event.contact_name} after completed appointment`, {
      contactId: event.contact_id, relatedType: "calendar_event", relatedId: event.id,
    }));
  }

  promises.push(logActivity(clientId, "appointment_completed", `Appointment "${event.title}" completed`, {
    contactId: event.contact_id, relatedType: "calendar_event", relatedId: event.id,
  }));

  await Promise.all(promises);
}

export async function onAppointmentCancelled(clientId: string, event: any, reason?: string) {
  const promises: Promise<any>[] = [];
  promises.push(logActivity(clientId, "appointment_cancelled", `Appointment "${event.title}" cancelled${reason ? `: ${reason}` : ""}`, {
    contactId: event.contact_id, relatedType: "calendar_event", relatedId: event.id,
  }));
  promises.push(logAudit(clientId, "appointment_cancelled", "calendar", { event_id: event.id, reason }));
  await Promise.all(promises);
}

export async function onNoShow(clientId: string, event: any) {
  const promises: Promise<any>[] = [];
  // Create follow-up task
  promises.push(
    supabase.from("crm_tasks").insert({
      client_id: clientId,
      title: `Follow up: No-show — ${event.contact_name || event.title}`,
      description: `Customer did not show up for "${event.title}". Follow up to reschedule.`,
      priority: "high",
      status: "open",
      related_type: "calendar_event",
      related_id: event.id,
    })
  );
  promises.push(logActivity(clientId, "no_show", `No-show for "${event.title}" — ${event.contact_name || "Unknown"}`, {
    contactId: event.contact_id, relatedType: "calendar_event", relatedId: event.id,
  }));
  await Promise.all(promises);
}

// ─── DEAL LIFECYCLE ────────────────────────────────────────────────

export async function onDealStageChanged(clientId: string, dealId: string, newStage: string, deal: any, contacts: any[]) {
  const promises: Promise<any>[] = [];

  promises.push(logActivity(clientId, "deal_stage_changed", `Deal "${deal.deal_name}" moved to ${newStage}`, {
    contactId: deal.contact_id, relatedType: "deal", relatedId: dealId,
  }));

  if (newStage === "closed_won") {
    // Update contact revenue
    if (deal.contact_id && deal.deal_value) {
      const contact = contacts.find(c => c.id === deal.contact_id);
      if (contact) {
        const newRevenue = (Number(contact.lifetime_revenue) || 0) + (Number(deal.deal_value) || 0);
        promises.push(
          supabase.from("crm_contacts").update({
            lifetime_revenue: newRevenue,
            contact_status: "customer",
            last_interaction_date: new Date().toISOString(),
          } as any).eq("id", deal.contact_id)
        );
      }
    }
    // Update company revenue if linked
    if (deal.company_id && deal.deal_value) {
      promises.push(logActivity(clientId, "revenue_recorded", `$${Number(deal.deal_value).toLocaleString()} revenue from deal "${deal.deal_name}"`, {
        contactId: deal.contact_id, companyId: deal.company_id, relatedType: "deal", relatedId: dealId,
      }));
    }
    promises.push(logActivity(clientId, "deal_won", `Deal "${deal.deal_name}" won — $${Number(deal.deal_value || 0).toLocaleString()}`, {
      contactId: deal.contact_id, relatedType: "deal", relatedId: dealId,
    }));
    promises.push(logAudit(clientId, "deal_won", "crm", { deal_id: dealId, value: deal.deal_value }));
  }

  if (newStage === "closed_lost") {
    promises.push(logActivity(clientId, "deal_lost", `Deal "${deal.deal_name}" lost`, {
      contactId: deal.contact_id, relatedType: "deal", relatedId: dealId,
    }));
  }

  await Promise.all(promises);
}

// ─── REVIEW LIFECYCLE ──────────────────────────────────────────────

export async function onReviewFeedbackReceived(clientId: string, request: any, rating: number, feedbackText: string) {
  const promises: Promise<any>[] = [];

  promises.push(logActivity(clientId, "review_feedback_received", `Feedback received from ${request.customer_name}: ${rating}★`, {
    contactId: request.contact_id, relatedType: "review_request", relatedId: request.id,
  }));

  if (rating <= 3) {
    // Negative feedback → recovery
    promises.push(
      supabase.from("review_requests" as any).update({
        recovery_needed: true, status: "recovery_needed",
      }).eq("id", request.id)
    );
    promises.push(
      supabase.from("review_recovery_tasks" as any).insert({
        client_id: clientId,
        review_request_id: request.id,
        status: "open",
        notes: `Low rating (${rating}★) from ${request.customer_name}: "${feedbackText}"`,
      })
    );
    promises.push(
      supabase.from("crm_tasks").insert({
        client_id: clientId,
        title: `Service Recovery: ${request.customer_name} (${rating}★)`,
        description: `Customer left ${rating}-star feedback: "${feedbackText}". Contact them to resolve.`,
        priority: "high",
        status: "open",
        related_type: "review_request",
        related_id: request.id,
      })
    );
    promises.push(logActivity(clientId, "negative_feedback", `Negative feedback (${rating}★) from ${request.customer_name} — recovery task created`, {
      contactId: request.contact_id,
    }));
    promises.push(logActivity(clientId, "recovery_task_created", `Recovery task created for ${request.customer_name}`, {
      contactId: request.contact_id,
    }));
  } else {
    // Positive → prompt public review
    promises.push(
      supabase.from("review_requests" as any).update({
        status: "feedback_submitted",
      }).eq("id", request.id)
    );
    if (rating >= 4) {
      promises.push(logActivity(clientId, "public_review_requested", `Public review requested from ${request.customer_name} (${rating}★)`, {
        contactId: request.contact_id,
      }));
    }
  }

  // Update contact last interaction
  if (request.contact_id) {
    promises.push(
      supabase.from("crm_contacts").update({
        last_interaction_date: new Date().toISOString(),
      } as any).eq("id", request.contact_id)
    );
  }

  await Promise.all(promises);
}

// ─── EMAIL LIFECYCLE ───────────────────────────────────────────────

export async function onEmailReceived(clientId: string, email: any) {
  const promises: Promise<any>[] = [];

  // Try to match to contact
  if (email.from_address) {
    const { data: contact } = await supabase
      .from("crm_contacts")
      .select("id, full_name")
      .eq("client_id", clientId)
      .eq("email", email.from_address)
      .maybeSingle();

    if (contact) {
      promises.push(
        supabase.from("email_messages").update({ contact_id: contact.id }).eq("id", email.id)
      );
      promises.push(
        supabase.from("crm_contacts").update({
          last_interaction_date: new Date().toISOString(),
        } as any).eq("id", contact.id)
      );
      promises.push(logActivity(clientId, "email_received", `Email from ${contact.full_name}: "${email.subject || "No subject"}"`, {
        contactId: contact.id, relatedType: "email", relatedId: email.id,
      }));
    }
  }

  await Promise.all(promises);
}

export async function onEmailSent(clientId: string, email: any) {
  const promises: Promise<any>[] = [];
  promises.push(logActivity(clientId, "email_sent", `Email sent to ${email.to_address}: "${email.subject || "No subject"}"`, {
    contactId: email.contact_id, relatedType: "email", relatedId: email.id,
  }));
  if (email.contact_id) {
    promises.push(
      supabase.from("crm_contacts").update({
        last_interaction_date: new Date().toISOString(),
      } as any).eq("id", email.contact_id)
    );
  }
  await Promise.all(promises);
}

// ─── SYNC LIFECYCLE ────────────────────────────────────────────────

export async function onSyncCompleted(clientId: string, connectionId: string, recordsProcessed: number) {
  await Promise.all([
    supabase.from("crm_connections").update({
      last_synced_at: new Date().toISOString(),
      connection_status: "connected",
    } as any).eq("id", connectionId),
    logActivity(clientId, "crm_sync_completed", `CRM sync completed — ${recordsProcessed} records processed`),
    logAudit(clientId, "crm_sync_completed", "crm", { connection_id: connectionId, records: recordsProcessed }),
  ]);
}

export async function onSyncFailed(clientId: string, connectionId: string, error: string) {
  await Promise.all([
    supabase.from("crm_connections").update({
      connection_status: "error",
    } as any).eq("id", connectionId),
    supabase.from("crm_sync_logs").insert({
      client_id: clientId,
      crm_connection_id: connectionId,
      sync_type: "incremental",
      sync_status: "failed",
      error_message: error,
    } as any),
    logActivity(clientId, "crm_sync_failed", `CRM sync failed: ${error}`),
    logAudit(clientId, "crm_sync_failed", "crm", { connection_id: connectionId, error }),
  ]);
}

// ─── TASK LIFECYCLE ────────────────────────────────────────────────

export async function onTaskCreated(clientId: string, task: any) {
  await logActivity(clientId, "task_created", `Task "${task.title}" created`, {
    contactId: task.contact_id, relatedType: task.related_type, relatedId: task.related_id,
  });
}

export async function onTaskCompleted(clientId: string, task: any) {
  await logActivity(clientId, "task_completed", `Task "${task.title}" completed`, {
    contactId: task.contact_id, relatedType: task.related_type, relatedId: task.related_id,
  });
}

// ─── CONTACT LIFECYCLE ─────────────────────────────────────────────

export async function onContactCreated(clientId: string, contact: any) {
  await Promise.all([
    logActivity(clientId, "contact_created", `Contact "${contact.full_name}" created`, { contactId: contact.id }),
    logAudit(clientId, "contact_created", "crm", { contact_id: contact.id, name: contact.full_name }),
  ]);
}

export async function onLeadStageChanged(clientId: string, leadId: string, newStage: string, contactName: string) {
  await logActivity(clientId, "lead_stage_changed", `Lead "${contactName}" moved to ${newStage}`, {
    relatedType: "lead", relatedId: leadId,
  });
}
