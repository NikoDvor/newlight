import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Send, Bell, CheckCircle2, AlertTriangle, RotateCcw, Copy,
  Clock, X, Mail, MessageSquare, Smartphone
} from "lucide-react";
import {
  logNotificationSend, generateMessage, canSend,
  type MessageContext
} from "@/lib/notificationService";

export interface SetupItemWithRequest {
  id: string;
  category: string;
  item_key: string;
  item_label: string;
  item_status: string;
  notes: string | null;
  submitted_by_client: boolean;
  client_value: string | null;
  client_file_url: string | null;
  client_submitted_at: string | null;
  admin_notes: string | null;
  requested_at: string | null;
  last_reminded_at: string | null;
  reminder_count: number;
  admin_request_note: string | null;
  client_response_note: string | null;
  target_due_date: string | null;
  returned_for_revision_at: string | null;
  blocked_reason: string | null;
}

interface SetupItemActionsProps {
  item: SetupItemWithRequest;
  clientId: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  preferredChannel?: string;
  portalLink: string;
  onUpdate: (itemId: string, updates: Partial<SetupItemWithRequest>) => void;
}

const STATUS_CHIPS: Record<string, { label: string; color: string; bg: string }> = {
  missing: { label: "Missing", color: "text-red-400", bg: "bg-red-500/10" },
  requested: { label: "Requested", color: "text-amber-400", bg: "bg-amber-500/10" },
  reminded: { label: "Reminded", color: "text-orange-400", bg: "bg-orange-500/10" },
  received: { label: "Received", color: "text-[hsl(var(--nl-sky))]", bg: "bg-[hsla(211,96%,60%,.1)]" },
  revision_needed: { label: "Revision Needed", color: "text-purple-400", bg: "bg-purple-500/10" },
  blocked: { label: "Blocked", color: "text-red-400", bg: "bg-red-500/10" },
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/10" },
};

const CHANNEL_OPTIONS = [
  { value: "email", label: "Email", icon: Mail },
  { value: "sms", label: "SMS", icon: Smartphone },
  { value: "portal", label: "Portal Only", icon: MessageSquare },
];

export function SetupItemActions({
  item, clientId, clientName, clientEmail, clientPhone,
  preferredChannel = "email", portalLink, onUpdate
}: SetupItemActionsProps) {
  const [showComposer, setShowComposer] = useState(false);
  const [requestNote, setRequestNote] = useState(item.admin_request_note || "");
  const [dueDate, setDueDate] = useState(item.target_due_date || "");
  const [blockedReason, setBlockedReason] = useState(item.blocked_reason || "");
  const [selectedChannel, setSelectedChannel] = useState(preferredChannel);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  const chip = STATUS_CHIPS[item.item_status] || STATUS_CHIPS.missing;
  const isOverdue = item.target_due_date && new Date(item.target_due_date) < new Date() && !["completed", "received"].includes(item.item_status);
  const isWaiting = ["requested", "reminded"].includes(item.item_status);

  const buildContext = (): MessageContext => ({
    clientName,
    itemLabel: item.item_label,
    dueDate: dueDate || undefined,
    portalLink,
    adminNote: requestNote || undefined,
    blockedReason: blockedReason || undefined,
  });

  const updatePreview = (templateKey: string) => {
    const format = selectedChannel === "sms" ? "sms" : "email";
    const msg = generateMessage(templateKey, format as any, buildContext());
    setEditSubject(msg.subject);
    setEditBody(msg.body);
    setPreviewMode(true);
  };

  const updateItem = async (updates: Record<string, any>, action: string, metadata?: Record<string, any>) => {
    await supabase.from("client_setup_items" as any).update(updates).eq("id", item.id);
    await supabase.from("audit_logs").insert({
      client_id: clientId,
      action,
      module: "setup_request",
      metadata: { item_id: item.id, item_key: item.item_key, item_label: item.item_label, ...metadata } as any,
    });
    onUpdate(item.id, updates as any);
  };

  const sendNotification = async (actionType: string) => {
    await logNotificationSend({
      clientId,
      setupItemId: item.id,
      actionType,
      channel: selectedChannel,
      recipientEmail: selectedChannel === "email" ? (clientEmail || undefined) : undefined,
      recipientPhone: selectedChannel === "sms" ? (clientPhone || undefined) : undefined,
      subject: editSubject,
      body: editBody,
      metadata: { item_key: item.item_key, item_label: item.item_label },
    });
  };

  const handleRequest = async () => {
    const sendKey = `request-${item.id}`;
    if (!canSend(sendKey)) {
      toast.error("Request just sent — please wait before resending");
      return;
    }
    const now = new Date().toISOString();
    await updateItem(
      { item_status: "requested", requested_at: now, admin_request_note: requestNote || null, target_due_date: dueDate || null },
      "setup_item_requested",
      { note: requestNote, due_date: dueDate, channel: selectedChannel }
    );
    if (previewMode) await sendNotification("request");
    toast.success(`Requested "${item.item_label}" from client`);
    setShowComposer(false);
    setPreviewMode(false);
  };

  const handleReminder = async () => {
    const sendKey = `remind-${item.id}`;
    if (!canSend(sendKey)) {
      toast.error("Reminder just sent — please wait before resending");
      return;
    }
    const now = new Date().toISOString();
    await updateItem(
      { item_status: "reminded", last_reminded_at: now, reminder_count: (item.reminder_count || 0) + 1 },
      "setup_item_reminded",
      { reminder_count: (item.reminder_count || 0) + 1, channel: selectedChannel }
    );
    // Auto-generate and log notification
    const msg = generateMessage("reminder", selectedChannel === "sms" ? "sms" : "email", buildContext());
    await logNotificationSend({
      clientId, setupItemId: item.id, actionType: "reminder",
      channel: selectedChannel,
      recipientEmail: selectedChannel === "email" ? (clientEmail || undefined) : undefined,
      subject: msg.subject, body: msg.body,
      metadata: { item_key: item.item_key },
    });
    toast.success(`Reminder sent for "${item.item_label}"`);
  };

  const handleReceived = async () => {
    await updateItem({ item_status: "received" }, "setup_item_received");
    toast.success(`Marked "${item.item_label}" as received`);
  };

  const handleCompleted = async () => {
    await updateItem({ item_status: "completed" }, "setup_item_completed");
    toast.success(`Marked "${item.item_label}" as completed`);
  };

  const handleReturnForRevision = async () => {
    const now = new Date().toISOString();
    await updateItem(
      { item_status: "revision_needed", returned_for_revision_at: now },
      "setup_item_returned_for_revision"
    );
    const msg = generateMessage("revision_needed", selectedChannel === "sms" ? "sms" : "email", buildContext());
    await logNotificationSend({
      clientId, setupItemId: item.id, actionType: "revision_needed",
      channel: selectedChannel,
      recipientEmail: selectedChannel === "email" ? (clientEmail || undefined) : undefined,
      subject: msg.subject, body: msg.body,
    });
    toast.success(`Returned "${item.item_label}" for revision`);
  };

  const handleBlocked = async () => {
    await updateItem(
      { item_status: "blocked", blocked_reason: blockedReason || null },
      "setup_item_blocked",
      { reason: blockedReason }
    );
    toast.success(`Marked "${item.item_label}" as blocked`);
    setShowComposer(false);
  };

  const copyMessage = (type: "email" | "sms") => {
    const msg = generateMessage(
      isOverdue ? "overdue_reminder" : "request",
      type, buildContext()
    );
    navigator.clipboard.writeText(type === "sms" ? msg.body : `Subject: ${msg.subject}\n\n${msg.body}`);
    toast.success(`${type === "email" ? "Email" : "SMS"} message copied`);
    supabase.from("audit_logs").insert({
      client_id: clientId,
      action: `setup_message_copied_${type}`,
      module: "setup_request",
      metadata: { item_id: item.id, item_key: item.item_key, type } as any,
    });
  };

  return (
    <div className="space-y-2">
      {/* Status + meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${chip.color} ${chip.bg}`}>{chip.label}</span>
        {isOverdue && (
          <span className="text-[9px] px-2 py-0.5 rounded-full font-medium text-red-400 bg-red-500/10 flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" /> Overdue
          </span>
        )}
        {isWaiting && (
          <span className="text-[9px] px-2 py-0.5 rounded-full font-medium text-amber-400 bg-amber-500/10">Waiting on Client</span>
        )}
        {item.reminder_count > 0 && (
          <span className="text-[9px] text-white/25">{item.reminder_count} reminder{item.reminder_count > 1 ? "s" : ""}</span>
        )}
        {item.requested_at && (
          <span className="text-[9px] text-white/20">Requested {new Date(item.requested_at).toLocaleDateString()}</span>
        )}
        {item.last_reminded_at && (
          <span className="text-[9px] text-white/20">Last reminded {new Date(item.last_reminded_at).toLocaleDateString()}</span>
        )}
        {item.target_due_date && (
          <span className={`text-[9px] ${isOverdue ? "text-red-400" : "text-white/25"}`}>Due {new Date(item.target_due_date).toLocaleDateString()}</span>
        )}
      </div>

      {item.blocked_reason && (
        <p className="text-[10px] text-red-400">⚠ Blocked: {item.blocked_reason}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5 flex-wrap">
        {["missing", "reminded"].includes(item.item_status) && !item.requested_at && (
          <Button size="sm" onClick={() => { updatePreview("request"); setShowComposer(true); }} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white gap-1 text-[10px] h-6 px-2">
            <Send className="h-2.5 w-2.5" /> Request
          </Button>
        )}
        {["requested", "reminded", "missing", "revision_needed"].includes(item.item_status) && item.requested_at && (
          <Button size="sm" variant="outline" onClick={handleReminder} className="border-white/10 text-white hover:bg-white/10 gap-1 text-[10px] h-6 px-2">
            <Bell className="h-2.5 w-2.5" /> Remind
          </Button>
        )}
        {["requested", "reminded", "revision_needed", "missing"].includes(item.item_status) && (
          <Button size="sm" variant="outline" onClick={handleReceived} className="border-white/10 text-white hover:bg-white/10 gap-1 text-[10px] h-6 px-2">
            <CheckCircle2 className="h-2.5 w-2.5" /> Received
          </Button>
        )}
        {item.item_status === "received" && (
          <>
            <Button size="sm" variant="outline" onClick={handleCompleted} className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 gap-1 text-[10px] h-6 px-2">
              <CheckCircle2 className="h-2.5 w-2.5" /> Complete
            </Button>
            <Button size="sm" variant="outline" onClick={handleReturnForRevision} className="border-purple-500/20 text-purple-400 hover:bg-purple-500/10 gap-1 text-[10px] h-6 px-2">
              <RotateCcw className="h-2.5 w-2.5" /> Return
            </Button>
          </>
        )}
        {!["blocked", "completed"].includes(item.item_status) && (
          <Button size="sm" variant="outline" onClick={() => setShowComposer(s => !s)} className="border-white/10 text-white/40 hover:bg-white/10 gap-1 text-[10px] h-6 px-2">
            <AlertTriangle className="h-2.5 w-2.5" /> Block
          </Button>
        )}
        {["requested", "reminded", "missing", "revision_needed"].includes(item.item_status) && (
          <>
            <Button size="sm" variant="outline" onClick={() => copyMessage("email")} className="border-white/[0.06] text-white/30 hover:bg-white/10 gap-1 text-[10px] h-6 px-2">
              <Copy className="h-2.5 w-2.5" /> Email
            </Button>
            <Button size="sm" variant="outline" onClick={() => copyMessage("sms")} className="border-white/[0.06] text-white/30 hover:bg-white/10 gap-1 text-[10px] h-6 px-2">
              <Copy className="h-2.5 w-2.5" /> SMS
            </Button>
          </>
        )}
      </div>

      {/* Composer panel */}
      {showComposer && (
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">Request / Block</p>
            <button onClick={() => { setShowComposer(false); setPreviewMode(false); }} className="text-white/30 hover:text-white/60">
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* Channel selector */}
          <div className="flex gap-1">
            {CHANNEL_OPTIONS.map(ch => {
              const ChIcon = ch.icon;
              const active = selectedChannel === ch.value;
              return (
                <button
                  key={ch.value}
                  onClick={() => { setSelectedChannel(ch.value); if (previewMode) updatePreview("request"); }}
                  className={`text-[9px] px-2 py-1 rounded-full flex items-center gap-1 transition-colors ${
                    active ? "bg-[hsl(var(--nl-electric))] text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                  }`}
                >
                  <ChIcon className="h-2.5 w-2.5" /> {ch.label}
                </button>
              );
            })}
          </div>

          {/* Recipient display */}
          {selectedChannel === "email" && clientEmail && (
            <p className="text-[9px] text-white/30">To: {clientEmail}</p>
          )}
          {selectedChannel === "sms" && clientPhone && (
            <p className="text-[9px] text-white/30">To: {clientPhone}</p>
          )}
          {selectedChannel === "email" && !clientEmail && (
            <p className="text-[9px] text-amber-400">⚠ No email on file — message will be logged only</p>
          )}

          <Input
            placeholder="Request note (visible in request message)…"
            value={requestNote}
            onChange={e => setRequestNote(e.target.value)}
            className="text-[10px] h-7 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="text-[10px] rounded-md px-2 py-1 bg-white/[0.04] border border-white/[0.08] text-white/60 flex-1"
            />
            <Input
              placeholder="Blocked reason…"
              value={blockedReason}
              onChange={e => setBlockedReason(e.target.value)}
              className="text-[10px] h-7 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 flex-1"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { if (!previewMode) updatePreview("request"); else handleRequest(); }}
              className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white gap-1 text-[10px] h-6 px-3">
              <Send className="h-2.5 w-2.5" /> {previewMode ? "Confirm & Send" : "Preview Request"}
            </Button>
            {blockedReason && (
              <Button size="sm" variant="outline" onClick={handleBlocked} className="border-red-500/20 text-red-400 hover:bg-red-500/10 gap-1 text-[10px] h-6 px-3">
                <AlertTriangle className="h-2.5 w-2.5" /> Mark Blocked
              </Button>
            )}
          </div>

          {/* Message Preview */}
          {previewMode && (
            <div className="p-2 rounded bg-white/[0.02] border border-white/[0.05] space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[9px] text-white/30 uppercase tracking-wider">
                  {selectedChannel === "sms" ? "SMS" : "Email"} Preview
                </p>
                <button onClick={() => {
                  const body = selectedChannel === "sms" ? editBody : `Subject: ${editSubject}\n\n${editBody}`;
                  navigator.clipboard.writeText(body);
                  toast.success("Copied");
                }} className="text-[9px] text-white/30 hover:text-white/60 flex items-center gap-0.5">
                  <Copy className="h-2.5 w-2.5" /> Copy
                </button>
              </div>
              {selectedChannel !== "sms" && (
                <Input
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value)}
                  className="text-[10px] h-6 bg-white/[0.02] border-white/[0.05] text-white/70"
                />
              )}
              <Textarea
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                rows={selectedChannel === "sms" ? 2 : 5}
                className="text-[10px] bg-white/[0.02] border-white/[0.05] text-white/50"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Bulk actions component ───
interface BulkRequestActionsProps {
  items: SetupItemWithRequest[];
  clientId: string;
  clientName: string;
  clientEmail?: string | null;
  portalLink: string;
  category?: string;
  onUpdate: (updates: Array<{ id: string; updates: Partial<SetupItemWithRequest> }>) => void;
}

export function BulkRequestActions({ items, clientId, clientName, clientEmail, portalLink, category, onUpdate }: BulkRequestActionsProps) {
  const missing = items.filter(i => ["missing", "revision_needed"].includes(i.item_status));
  const requested = items.filter(i => ["requested", "reminded"].includes(i.item_status));
  const overdue = items.filter(i => i.target_due_date && new Date(i.target_due_date) < new Date() && !["completed", "received"].includes(i.item_status));

  const bulkRequest = async () => {
    const sendKey = `bulk-request-${clientId}-${category || "all"}`;
    if (!canSend(sendKey)) {
      toast.error("Bulk request just sent — please wait");
      return;
    }
    if (missing.length === 0) return;
    const now = new Date().toISOString();
    const ids = missing.map(i => i.id);
    await supabase.from("client_setup_items" as any).update({ item_status: "requested", requested_at: now }).in("id", ids);
    await supabase.from("audit_logs").insert({
      client_id: clientId,
      action: "bulk_setup_request",
      module: "setup_request",
      metadata: { category, count: ids.length, item_keys: missing.map(i => i.item_key) } as any,
    });
    // Log notification
    const ctx: MessageContext = {
      clientName,
      itemLabels: missing.map(i => i.item_label),
      portalLink,
    };
    const msg = generateMessage("request", "email", ctx);
    await logNotificationSend({
      clientId, actionType: "bulk_request", channel: "email",
      recipientEmail: clientEmail || undefined,
      subject: msg.subject, body: msg.body,
      metadata: { category, count: ids.length },
    });
    onUpdate(ids.map(id => ({ id, updates: { item_status: "requested", requested_at: now } })));
    toast.success(`Requested ${ids.length} missing items`);
  };

  const bulkRemind = async () => {
    const sendKey = `bulk-remind-${clientId}-${category || "all"}`;
    if (!canSend(sendKey)) {
      toast.error("Bulk reminder just sent — please wait");
      return;
    }
    if (requested.length === 0) return;
    const now = new Date().toISOString();
    const ids = requested.map(i => i.id);
    for (const i of requested) {
      await supabase.from("client_setup_items" as any)
        .update({ item_status: "reminded", last_reminded_at: now, reminder_count: (i.reminder_count || 0) + 1 })
        .eq("id", i.id);
    }
    await supabase.from("audit_logs").insert({
      client_id: clientId,
      action: "bulk_setup_reminder",
      module: "setup_request",
      metadata: { category, count: ids.length } as any,
    });
    const ctx: MessageContext = {
      clientName,
      itemLabels: requested.map(i => i.item_label),
      portalLink,
    };
    const msg = generateMessage("reminder", "email", ctx);
    await logNotificationSend({
      clientId, actionType: "bulk_reminder", channel: "email",
      recipientEmail: clientEmail || undefined,
      subject: msg.subject, body: msg.body,
      metadata: { category, count: ids.length },
    });
    onUpdate(ids.map((id, idx) => ({ id, updates: { item_status: "reminded", last_reminded_at: now, reminder_count: (requested[idx].reminder_count || 0) + 1 } })));
    toast.success(`Reminded ${ids.length} items`);
  };

  const copyBulkMessage = () => {
    const ctx: MessageContext = {
      clientName,
      itemLabels: missing.map(i => i.item_label),
      portalLink,
    };
    const msg = generateMessage("request", "email", ctx);
    navigator.clipboard.writeText(`Subject: ${msg.subject}\n\n${msg.body}`);
    toast.success("Bulk request message copied");
  };

  if (missing.length === 0 && requested.length === 0) return null;

  return (
    <div className="flex gap-1.5 flex-wrap">
      {missing.length > 0 && (
        <>
          <Button size="sm" onClick={bulkRequest} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white gap-1 text-[10px] h-6 px-2">
            <Send className="h-2.5 w-2.5" /> Request All Missing ({missing.length})
          </Button>
          <Button size="sm" variant="outline" onClick={copyBulkMessage} className="border-white/10 text-white/40 hover:bg-white/10 gap-1 text-[10px] h-6 px-2">
            <Copy className="h-2.5 w-2.5" /> Copy Message
          </Button>
        </>
      )}
      {requested.length > 0 && (
        <Button size="sm" variant="outline" onClick={bulkRemind} className="border-amber-500/20 text-amber-400 hover:bg-amber-500/10 gap-1 text-[10px] h-6 px-2">
          <Bell className="h-2.5 w-2.5" /> Remind All ({requested.length})
        </Button>
      )}
      {overdue.length > 0 && (
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 self-center">
          {overdue.length} overdue
        </span>
      )}
    </div>
  );
}
