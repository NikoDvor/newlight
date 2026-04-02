import { supabase } from "@/integrations/supabase/client";

// ─── Message Templates ───
export interface MessageContext {
  clientName: string;
  itemLabel?: string;
  itemLabels?: string[];
  dueDate?: string;
  portalLink: string;
  adminNote?: string;
  blockedReason?: string;
  category?: string;
}

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString() : "";

export const MESSAGE_TEMPLATES: Record<string, {
  subject: (ctx: MessageContext) => string;
  emailBody: (ctx: MessageContext) => string;
  smsBody: (ctx: MessageContext) => string;
}> = {
  request: {
    subject: (ctx) => `Action Needed: ${ctx.itemLabel || "Setup Information"} — ${ctx.clientName}`,
    emailBody: (ctx) => {
      const duePart = ctx.dueDate ? `\nPlease submit by: ${fmtDate(ctx.dueDate)}` : "";
      const notePart = ctx.adminNote ? `\n\nNote from your team:\n${ctx.adminNote}` : "";
      const items = ctx.itemLabels?.length
        ? ctx.itemLabels.map(l => `• ${l}`).join("\n")
        : ctx.itemLabel ? `• ${ctx.itemLabel}` : "";
      return `Hi ${ctx.clientName},\n\nWe need the following to continue your setup:\n\n${items}${duePart}${notePart}\n\nSubmit through your setup portal:\n${ctx.portalLink}\n\nThanks,\nNewLight Marketing`;
    },
    smsBody: (ctx) =>
      `Hi ${ctx.clientName}, we need your ${ctx.itemLabel || "setup info"}${ctx.dueDate ? ` by ${fmtDate(ctx.dueDate)}` : ""}. Submit here: ${ctx.portalLink}`,
  },
  reminder: {
    subject: (ctx) => `Reminder: ${ctx.itemLabel || "Setup Items"} Still Needed — ${ctx.clientName}`,
    emailBody: (ctx) => {
      const items = ctx.itemLabels?.length
        ? ctx.itemLabels.map(l => `• ${l}`).join("\n")
        : ctx.itemLabel ? `• ${ctx.itemLabel}` : "";
      return `Hi ${ctx.clientName},\n\nFriendly reminder — we're still waiting on:\n\n${items}${ctx.dueDate ? `\nDue: ${fmtDate(ctx.dueDate)}` : ""}\n\nPlease submit through your portal:\n${ctx.portalLink}\n\nThanks,\nNewLight Marketing`;
    },
    smsBody: (ctx) =>
      `Reminder: ${ctx.clientName}, we still need your ${ctx.itemLabel || "setup items"}. Submit here: ${ctx.portalLink}`,
  },
  overdue_reminder: {
    subject: (ctx) => `Overdue: ${ctx.itemLabel || "Setup Items"} — ${ctx.clientName}`,
    emailBody: (ctx) =>
      `Hi ${ctx.clientName},\n\nThe following setup items are now overdue:\n\n• ${ctx.itemLabel}${ctx.dueDate ? `\n  Was due: ${fmtDate(ctx.dueDate)}` : ""}\n\nPlease submit as soon as possible:\n${ctx.portalLink}\n\nThanks,\nNewLight Marketing`,
    smsBody: (ctx) =>
      `${ctx.clientName}, your ${ctx.itemLabel || "setup item"} is overdue. Please submit ASAP: ${ctx.portalLink}`,
  },
  revision_needed: {
    subject: (ctx) => `Revision Needed: ${ctx.itemLabel} — ${ctx.clientName}`,
    emailBody: (ctx) =>
      `Hi ${ctx.clientName},\n\nWe reviewed your submission for "${ctx.itemLabel}" and it needs a revision.${ctx.adminNote ? `\n\nFeedback:\n${ctx.adminNote}` : ""}\n\nPlease resubmit through your portal:\n${ctx.portalLink}\n\nThanks,\nNewLight Marketing`,
    smsBody: (ctx) =>
      `${ctx.clientName}, your "${ctx.itemLabel}" needs revision. Please update in your portal: ${ctx.portalLink}`,
  },
  blocked: {
    subject: (ctx) => `Setup Blocked: ${ctx.itemLabel} — ${ctx.clientName}`,
    emailBody: (ctx) =>
      `Hi ${ctx.clientName},\n\nYour setup item "${ctx.itemLabel}" is currently blocked.${ctx.blockedReason ? `\n\nReason: ${ctx.blockedReason}` : ""}\n\nPlease contact us or visit your portal for details:\n${ctx.portalLink}\n\nThanks,\nNewLight Marketing`,
    smsBody: (ctx) =>
      `${ctx.clientName}, "${ctx.itemLabel}" is blocked${ctx.blockedReason ? `: ${ctx.blockedReason}` : ""}. Contact us or visit: ${ctx.portalLink}`,
  },
  received: {
    subject: (ctx) => `Received: ${ctx.itemLabel} — ${ctx.clientName}`,
    emailBody: (ctx) =>
      `Hi ${ctx.clientName},\n\nWe received your submission for "${ctx.itemLabel}". Our team is reviewing it now.\n\nYou can track progress in your portal:\n${ctx.portalLink}\n\nThanks,\nNewLight Marketing`,
    smsBody: (ctx) =>
      `${ctx.clientName}, we received your "${ctx.itemLabel}". We'll review it shortly!`,
  },
};

// ─── Send Notification ───
export interface SendNotificationParams {
  clientId: string;
  setupItemId?: string;
  actionType: string;
  channel: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject: string;
  body: string;
  metadata?: Record<string, any>;
}

export async function logNotificationSend(params: SendNotificationParams): Promise<string | null> {
  // For now: log the send. When a real provider (email/SMS) is wired, 
  // this will dispatch to the provider first, then log.
  const sendStatus = params.channel === "portal" ? "sent" : "queued";
  
  const { data, error } = await supabase.from("notification_send_log" as any).insert({
    client_id: params.clientId,
    setup_item_id: params.setupItemId || null,
    action_type: params.actionType,
    channel: params.channel,
    recipient_email: params.recipientEmail || null,
    recipient_phone: params.recipientPhone || null,
    subject: params.subject,
    body_preview: params.body.substring(0, 500),
    send_status: sendStatus,
    metadata: params.metadata || null,
  } as any).select("id").single();

  // Also log to audit_logs for unified audit trail
  await supabase.from("audit_logs").insert({
    client_id: params.clientId,
    action: `notification_${params.actionType}_${params.channel}`,
    module: "notifications",
    metadata: {
      setup_item_id: params.setupItemId,
      channel: params.channel,
      recipient: params.recipientEmail || params.recipientPhone,
      subject: params.subject,
    } as any,
  });

  return (data as any)?.id || null;
}

// ─── Generate message from template ───
export function generateMessage(
  templateKey: string,
  format: "email" | "sms",
  ctx: MessageContext
): { subject: string; body: string } {
  const tpl = MESSAGE_TEMPLATES[templateKey] || MESSAGE_TEMPLATES.request;
  return {
    subject: tpl.subject(ctx),
    body: format === "sms" ? tpl.smsBody(ctx) : tpl.emailBody(ctx),
  };
}

// ─── Double-send protection ───
const recentSends = new Map<string, number>();

export function canSend(key: string, intervalMs = 30000): boolean {
  const last = recentSends.get(key);
  if (last && Date.now() - last < intervalMs) return false;
  recentSends.set(key, Date.now());
  return true;
}
