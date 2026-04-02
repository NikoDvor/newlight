import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Palette, Globe, Package, Clock, Users, CalendarDays, MessageCircle, Plug, StickyNote,
  CheckCircle2, AlertCircle, Upload, Link2, Lock, Loader2, Send, RotateCcw,
  AlertTriangle, Bell, Ban, Eye, ChevronDown, ChevronUp
} from "lucide-react";
import { seedSetupItems, CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/setupItemsSeeder";
import { TeamAccessSection } from "@/components/setup/TeamAccessSection";
import { SetupActivityFeed } from "@/components/SetupActivityFeed";

interface SetupItem {
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

interface ClientInfo {
  id: string;
  business_name: string;
  payment_status: string;
  implementation_status: string;
  portal_last_login_at: string | null;
}

const CATEGORY_ICONS: Record<string, any> = {
  branding: Palette, website: Globe, services: Package, team: Users,
  calendar: CalendarDays, messaging: MessageCircle, integrations: Plug,
  billing: Clock, internal: StickyNote,
};

const STATUS_DISPLAY: Record<string, { label: string; color: string; icon: any }> = {
  missing: { label: "Needed", color: "hsl(0 70% 60%)", icon: AlertCircle },
  requested: { label: "Requested by Team", color: "hsl(38 92% 50%)", icon: Bell },
  reminded: { label: "Reminder Sent", color: "hsl(24 90% 50%)", icon: Bell },
  received: { label: "Under Review", color: "hsl(211 96% 56%)", icon: Eye },
  revision_needed: { label: "Needs Revision", color: "hsl(270 60% 60%)", icon: RotateCcw },
  blocked: { label: "Blocked", color: "hsl(0 70% 50%)", icon: Ban },
  completed: { label: "Complete", color: "hsl(152 60% 44%)", icon: CheckCircle2 },
};

// Priority for sorting: lower = higher priority
const STATUS_PRIORITY: Record<string, number> = {
  revision_needed: 0, requested: 1, reminded: 2, blocked: 3,
  missing: 4, received: 5, completed: 6,
};

function isOverdue(item: SetupItem): boolean {
  if (!item.target_due_date) return false;
  return new Date(item.target_due_date) < new Date() && !["received", "completed"].includes(item.item_status);
}

function needsAction(item: SetupItem): boolean {
  return ["requested", "reminded", "revision_needed"].includes(item.item_status) || isOverdue(item);
}

export default function SetupPortal() {
  const { activeClientId } = useWorkspace();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [items, setItems] = useState<SetupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, { value: string; fileUrl: string; responseNote: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!activeClientId) return;
    const [clientRes, itemsRes] = await Promise.all([
      supabase.from("clients").select("id, business_name, payment_status, implementation_status").eq("id", activeClientId).single(),
      supabase.from("client_setup_items" as any).select("*").eq("client_id", activeClientId).order("created_at"),
    ]);
    if (clientRes.data) setClient(clientRes.data as any);
    let setupItems = (itemsRes.data || []) as any as SetupItem[];
    if (setupItems.length === 0) {
      await seedSetupItems(activeClientId);
      const { data: seeded } = await supabase.from("client_setup_items" as any).select("*").eq("client_id", activeClientId).order("created_at");
      setupItems = (seeded || []) as any as SetupItem[];
    }
    setItems(setupItems);
    const edits: Record<string, { value: string; fileUrl: string; responseNote: string }> = {};
    setupItems.forEach(item => {
      edits[item.id] = { value: item.client_value || "", fileUrl: item.client_file_url || "", responseNote: item.client_response_note || "" };
    });
    setEditValues(edits);
    setLoading(false);
    if (activeClientId) {
      supabase.from("clients").update({
        portal_last_login_at: new Date().toISOString(),
        portal_invite_status: "accepted",
      } as any).eq("id", activeClientId).then(() => {});
    }
  }, [activeClientId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmitItem = async (item: SetupItem) => {
    const edit = editValues[item.id];
    if (!edit?.value && !edit?.fileUrl) {
      toast.error("Please enter information or provide a link/file");
      return;
    }
    setSubmitting(item.id);
    const now = new Date().toISOString();
    const isRevision = item.item_status === "revision_needed";
    await supabase.from("client_setup_items" as any).update({
      client_value: edit.value || null,
      client_file_url: edit.fileUrl || null,
      client_response_note: edit.responseNote || null,
      client_submitted_at: now,
      item_status: "received",
    } as any).eq("id", item.id);

    const auditAction = isRevision ? "client_setup_revision_resubmitted" : "client_setup_response_submitted";
    await supabase.from("audit_logs").insert({
      client_id: activeClientId!,
      action: auditAction,
      module: "setup_portal",
      metadata: { item_key: item.item_key, item_label: item.item_label, had_response_note: !!edit.responseNote } as any,
    });

    setItems(prev => prev.map(i => i.id === item.id ? {
      ...i, client_value: edit.value, client_file_url: edit.fileUrl,
      client_response_note: edit.responseNote, client_submitted_at: now, item_status: "received"
    } : i));
    toast.success(isRevision ? `"${item.item_label}" revision submitted` : `"${item.item_label}" submitted successfully`);
    setSubmitting(null);
  };

  const handleFileUpload = async (item: SetupItem, file: File) => {
    if (!activeClientId) return;
    setUploading(item.id);
    const ext = file.name.split(".").pop();
    const path = `${activeClientId}/setup/${item.item_key}.${ext}`;
    const { error } = await supabase.storage.from("client-logos").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed: " + error.message); setUploading(null); return; }
    const { data: urlData } = supabase.storage.from("client-logos").getPublicUrl(path);
    setEditValues(prev => ({ ...prev, [item.id]: { ...prev[item.id], fileUrl: urlData.publicUrl } }));

    await supabase.from("audit_logs").insert({
      client_id: activeClientId,
      action: "client_setup_file_reuploaded",
      module: "setup_portal",
      metadata: { item_key: item.item_key, file_name: file.name } as any,
    });
    toast.success("File uploaded");
    setUploading(null);
  };

  // Derived stats
  const clientItems = useMemo(() => items.filter(i => i.submitted_by_client), [items]);
  const actionItems = useMemo(() => clientItems.filter(needsAction), [clientItems]);
  const overdueItems = useMemo(() => clientItems.filter(isOverdue), [clientItems]);
  const revisionItems = useMemo(() => clientItems.filter(i => i.item_status === "revision_needed"), [clientItems]);
  const requestedItems = useMemo(() => clientItems.filter(i => ["requested", "reminded"].includes(i.item_status)), [clientItems]);
  const completedItems = useMemo(() => clientItems.filter(i => ["received", "completed"].includes(i.item_status)), [clientItems]);
  const blockedItems = useMemo(() => clientItems.filter(i => i.item_status === "blocked"), [clientItems]);

  const totalClient = clientItems.length;
  const submittedCount = completedItems.length;
  const progressPct = totalClient > 0 ? Math.round((submittedCount / totalClient) * 100) : 0;

  // Sort items within categories by priority
  const sortItems = (arr: SetupItem[]) =>
    [...arr].sort((a, b) => {
      const oa = isOverdue(a) ? -1 : 0;
      const ob = isOverdue(b) ? -1 : 0;
      if (oa !== ob) return oa - ob;
      return (STATUS_PRIORITY[a.item_status] ?? 5) - (STATUS_PRIORITY[b.item_status] ?? 5);
    });

  const grouped = useMemo(() =>
    CATEGORY_ORDER
      .map(cat => {
        const catItems = sortItems(items.filter(i => i.category === cat && i.submitted_by_client));
        const catComplete = catItems.filter(i => ["received", "completed"].includes(i.item_status)).length;
        const catOverdue = catItems.filter(isOverdue).length;
        const catRevision = catItems.filter(i => i.item_status === "revision_needed").length;
        const catWaiting = catItems.filter(i => ["requested", "reminded"].includes(i.item_status)).length;
        return {
          category: cat, label: CATEGORY_LABELS[cat], icon: CATEGORY_ICONS[cat] || StickyNote,
          items: catItems, complete: catComplete, overdue: catOverdue, revision: catRevision, waiting: catWaiting,
        };
      })
      .filter(g => g.items.length > 0),
    [items]
  );

  if (loading) return <div className="text-muted-foreground text-center py-20">Loading setup portal…</div>;

  const isPaid = client?.payment_status === "paid";
  if (!isPaid) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
          <Lock className="h-8 w-8 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Setup Portal Locked</h1>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Your setup portal will unlock once payment has been confirmed. If you've already made payment, please contact our team.
        </p>
      </div>
    );
  }

  const toggleCat = (cat: string) => setCollapsedCats(prev => {
    const next = new Set(prev);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    return next;
  });

  const renderItemCard = (item: SetupItem) => {
    const edit = editValues[item.id] || { value: "", fileUrl: "", responseNote: "" };
    const statusInfo = STATUS_DISPLAY[item.item_status] || STATUS_DISPLAY.missing;
    const StatusIcon = statusInfo.icon;
    const isSubmitted = ["received", "completed"].includes(item.item_status);
    const isLogoOrAsset = ["logo_primary", "logo_secondary", "brand_colors", "brand_fonts"].includes(item.item_key);
    const overdue = isOverdue(item);
    const isRevision = item.item_status === "revision_needed";
    const isRequested = ["requested", "reminded"].includes(item.item_status);
    const showActionHighlight = overdue || isRevision || isRequested;

    return (
      <div
        key={item.id}
        className={`rounded-xl border p-4 space-y-3 transition-colors ${
          overdue ? "border-destructive/60 bg-destructive/[0.03]" :
          isRevision ? "border-purple-500/40 bg-purple-500/[0.03]" :
          isRequested ? "border-amber-500/40 bg-amber-500/[0.03]" :
          "border-border/40"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{item.item_label}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            {overdue && (
              <Badge variant="outline" className="text-[10px] border-0 gap-0.5 text-destructive bg-destructive/10">
                <AlertTriangle className="h-3 w-3" /> Overdue
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] border-0 gap-0.5" style={{ color: statusInfo.color, background: `${statusInfo.color}15` }}>
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>

        {/* Due date */}
        {item.target_due_date && (
          <p className={`text-[10px] flex items-center gap-1 ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            <Clock className="h-3 w-3" />
            Due: {new Date(item.target_due_date).toLocaleDateString()}
            {overdue && " — please submit as soon as possible"}
          </p>
        )}

        {/* Admin request note */}
        {item.admin_request_note && (
          <div className={`rounded-lg p-2.5 text-xs ${
            isRevision ? "bg-purple-500/10 text-purple-200 border border-purple-500/20" :
            "bg-amber-500/10 text-amber-200 border border-amber-500/20"
          }`}>
            <p className="font-medium text-[10px] uppercase tracking-wider mb-0.5">
              {isRevision ? "Revision needed — from your team:" : "Message from your team:"}
            </p>
            {item.admin_request_note}
          </div>
        )}

        {/* Previous submission visible for revision */}
        {isRevision && item.client_value && (
          <div className="bg-muted/30 rounded-lg p-2.5 text-xs text-muted-foreground border border-border/30">
            <p className="font-medium text-[10px] uppercase tracking-wider mb-0.5">Your previous submission:</p>
            {item.client_value}
            {item.client_file_url && (
              <p className="text-[10px] text-primary mt-1 flex items-center gap-1 truncate">
                <Link2 className="h-3 w-3 shrink-0" /> {item.client_file_url}
              </p>
            )}
          </div>
        )}

        {/* Last reminded */}
        {item.last_reminded_at && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Bell className="h-3 w-3" /> Last reminder: {new Date(item.last_reminded_at).toLocaleDateString()}
            {item.reminder_count > 1 && ` (${item.reminder_count} reminders sent)`}
          </p>
        )}

        {/* Blocked reason */}
        {item.item_status === "blocked" && item.blocked_reason && (
          <div className="bg-destructive/10 rounded-lg p-2.5 text-xs text-destructive border border-destructive/20">
            <p className="font-medium text-[10px] uppercase tracking-wider mb-0.5">Blocked:</p>
            {item.blocked_reason}
          </div>
        )}

        {/* Input area — show for actionable items, hide for completed unless updating */}
        {!isSubmitted || showActionHighlight ? (
          <>
            {isLogoOrAsset ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste asset link…"
                    value={edit.fileUrl}
                    onChange={e => setEditValues(prev => ({ ...prev, [item.id]: { ...prev[item.id], fileUrl: e.target.value } }))}
                    className="flex-1 text-sm"
                  />
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" accept="image/*,.pdf,.ai,.svg,.eps"
                      onChange={e => { if (e.target.files?.[0]) handleFileUpload(item, e.target.files[0]); }}
                    />
                    <Button variant="outline" size="sm" className="h-10 gap-1" asChild>
                      <span>
                        {uploading === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        Upload
                      </span>
                    </Button>
                  </label>
                </div>
                {edit.fileUrl && (
                  <p className="text-[10px] text-primary flex items-center gap-1 truncate">
                    <Link2 className="h-3 w-3 shrink-0" /> {edit.fileUrl}
                  </p>
                )}
                <Textarea
                  placeholder="Additional notes about this asset…"
                  value={edit.value}
                  onChange={e => setEditValues(prev => ({ ...prev, [item.id]: { ...prev[item.id], value: e.target.value } }))}
                  rows={2} className="text-sm"
                />
              </div>
            ) : (
              <Textarea
                placeholder={isRevision ? "Submit your revised response…" : `Enter your ${item.item_label.toLowerCase()} details…`}
                value={edit.value}
                onChange={e => setEditValues(prev => ({ ...prev, [item.id]: { ...prev[item.id], value: e.target.value } }))}
                rows={3} className="text-sm"
              />
            )}

            {/* Response note back to admin */}
            {showActionHighlight && (
              <Input
                placeholder="Add a note for the team (optional)…"
                value={edit.responseNote}
                onChange={e => setEditValues(prev => ({ ...prev, [item.id]: { ...prev[item.id], responseNote: e.target.value } }))}
                className="text-sm"
              />
            )}
          </>
        ) : null}

        {/* Submitted timestamp */}
        {item.client_submitted_at && (
          <p className="text-[10px] text-muted-foreground">
            Last submitted: {new Date(item.client_submitted_at).toLocaleString()}
          </p>
        )}

        {/* Submit button */}
        <div className="flex justify-end">
          {isSubmitted && !showActionHighlight ? (
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
              onClick={() => {
                // Expand for editing
                setItems(prev => prev.map(i => i.id === item.id ? { ...i, item_status: "requested" } : i));
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Update
            </Button>
          ) : (
            <Button size="sm" onClick={() => handleSubmitItem(item)} disabled={submitting === item.id || item.item_status === "blocked"}
              className="gap-1.5"
              variant={isRevision ? "default" : "default"}
            >
              {submitting === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                isRevision ? <RotateCcw className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
              {isRevision ? "Resubmit" : "Submit"}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Setup Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit your business details and assets so our team can configure your workspace.
        </p>
      </div>

      {/* ── Attention Panel ── */}
      {actionItems.length > 0 && (
        <Card className="border border-amber-500/30 shadow-sm bg-amber-500/[0.03]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              What Needs Your Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4">
            <div className="flex flex-wrap gap-3 mt-1">
              {overdueItems.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {overdueItems.length} overdue
                </div>
              )}
              {revisionItems.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-purple-400 font-medium">
                  <RotateCcw className="h-3.5 w-3.5" />
                  {revisionItems.length} need revision
                </div>
              )}
              {requestedItems.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                  <Bell className="h-3.5 w-3.5" />
                  {requestedItems.length} requested
                </div>
              )}
              {blockedItems.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                  <Ban className="h-3.5 w-3.5" />
                  {blockedItems.length} blocked
                </div>
              )}
            </div>
            <div className="mt-3 space-y-1.5">
              {actionItems.slice(0, 5).map(item => {
                const si = STATUS_DISPLAY[item.item_status] || STATUS_DISPLAY.missing;
                return (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1">
                    <span className="text-foreground">{item.item_label}</span>
                    <div className="flex items-center gap-1.5">
                      {isOverdue(item) && <Badge variant="outline" className="text-[9px] border-0 text-destructive bg-destructive/10">Overdue</Badge>}
                      <Badge variant="outline" className="text-[9px] border-0" style={{ color: si.color, background: `${si.color}15` }}>
                        {si.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {actionItems.length > 5 && (
                <p className="text-[10px] text-muted-foreground">+{actionItems.length - 5} more items below</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Progress Card ── */}
      <Card className="border border-border/50 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Setup Progress</p>
              <p className="text-xs text-muted-foreground">{submittedCount} of {totalClient} items submitted</p>
            </div>
            <span className="text-2xl font-bold text-primary">{progressPct}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          {progressPct === 100 && (
            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> All items submitted! Our team is reviewing your information.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Implementation Status */}
      {client?.implementation_status && (
        <div className="rounded-xl p-3 flex items-center gap-3 border border-border/50 bg-primary/[0.03]">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Implementation Status</p>
            <p className="text-xs text-muted-foreground capitalize">{client.implementation_status.replace(/_/g, " ")}</p>
          </div>
        </div>
      )}

      {/* ── Setup Sections with category progress ── */}
      {grouped.map((group, gi) => {
        const Icon = group.icon;
        const collapsed = collapsedCats.has(group.category);
        const allDone = group.complete === group.items.length;

        return (
          <motion.div key={group.category} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.04 }}>
            <Card className={`border shadow-sm ${allDone ? "border-emerald-500/20" : "border-border/50"}`}>
              <CardHeader
                className="pb-2 bg-primary/[0.02] cursor-pointer select-none"
                onClick={() => toggleCat(group.category)}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    {group.label}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {/* Category stats */}
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-emerald-400">{group.complete}/{group.items.length}</span>
                      {group.overdue > 0 && <Badge variant="outline" className="text-[9px] border-0 text-destructive bg-destructive/10 py-0">{group.overdue} overdue</Badge>}
                      {group.revision > 0 && <Badge variant="outline" className="text-[9px] border-0 text-purple-400 bg-purple-500/10 py-0">{group.revision} revision</Badge>}
                      {group.waiting > 0 && <Badge variant="outline" className="text-[9px] border-0 text-amber-400 bg-amber-500/10 py-0">{group.waiting} requested</Badge>}
                    </div>
                    {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>
              {!collapsed && (
                <CardContent className="space-y-3 pt-3">
                  {group.items.map(renderItemCard)}
                </CardContent>
              )}
            </Card>
          </motion.div>
        );
      })}

      {/* Team & User Access Section */}
      {(() => {
        const teamItem = items.find(i => i.item_key === "team_members");
        return (
          <TeamAccessSection
            clientId={activeClientId!}
            setupItemId={teamItem?.id || null}
            initialValue={teamItem?.client_value || null}
            onSaved={load}
          />
        );
      })()}

      {/* Internal items */}
      {items.filter(i => !i.submitted_by_client).length > 0 && (
        <Card className="border border-border/50 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground mb-2">Internal Setup Items</p>
            <p className="text-xs text-muted-foreground mb-3">
              These items are being handled by our team. No action needed from you.
            </p>
            <div className="space-y-2">
              {items.filter(i => !i.submitted_by_client).map(item => {
                const statusInfo = STATUS_DISPLAY[item.item_status] || STATUS_DISPLAY.missing;
                return (
                  <div key={item.id} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-foreground">{item.item_label}</span>
                    <Badge variant="outline" className="text-[9px] border-0" style={{ color: statusInfo.color, background: `${statusInfo.color}15` }}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
