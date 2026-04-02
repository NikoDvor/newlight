import { useEffect, useState, useCallback } from "react";
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
  CheckCircle2, AlertCircle, Upload, Link2, Lock, Loader2, Send
} from "lucide-react";
import { seedSetupItems, CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/setupItemsSeeder";

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
}

interface ClientInfo {
  id: string;
  business_name: string;
  payment_status: string;
  implementation_status: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  branding: Palette,
  website: Globe,
  services: Package,
  team: Users,
  calendar: CalendarDays,
  messaging: MessageCircle,
  integrations: Plug,
  billing: Clock,
  internal: StickyNote,
};

const STATUS_DISPLAY: Record<string, { label: string; color: string; icon: any }> = {
  missing: { label: "Needed", color: "hsl(0 70% 60%)", icon: AlertCircle },
  requested: { label: "Requested", color: "hsl(38 92% 50%)", icon: AlertCircle },
  received: { label: "Under Review", color: "hsl(211 96% 56%)", icon: Loader2 },
  completed: { label: "Complete", color: "hsl(152 60% 44%)", icon: CheckCircle2 },
};

export default function SetupPortal() {
  const { activeClientId } = useWorkspace();
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [items, setItems] = useState<SetupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, { value: string; fileUrl: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

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
    // Init edit values from existing client_value
    const edits: Record<string, { value: string; fileUrl: string }> = {};
    setupItems.forEach(item => {
      edits[item.id] = { value: item.client_value || "", fileUrl: item.client_file_url || "" };
    });
    setEditValues(edits);
    setLoading(false);
    // Track portal login
    if (activeClientId) {
      supabase.from("clients").update({
        portal_last_login_at: new Date().toISOString(),
        portal_invite_status: "accepted",
      } as any).eq("id", activeClientId).then(() => {});
    }
  }, [activeClientId]);

  const handleSubmitItem = async (item: SetupItem) => {
    const edit = editValues[item.id];
    if (!edit?.value && !edit?.fileUrl) {
      toast.error("Please enter information or provide a link/file");
      return;
    }
    setSubmitting(item.id);
    const now = new Date().toISOString();
    await supabase.from("client_setup_items" as any).update({
      client_value: edit.value || null,
      client_file_url: edit.fileUrl || null,
      client_submitted_at: now,
      item_status: "received",
    } as any).eq("id", item.id);

    // Audit log
    await supabase.from("audit_logs").insert({
      client_id: activeClientId!,
      action: "client_setup_submission",
      module: "setup_portal",
      metadata: { item_key: item.item_key, item_label: item.item_label } as any,
    });

    setItems(prev => prev.map(i => i.id === item.id ? {
      ...i, client_value: edit.value, client_file_url: edit.fileUrl, client_submitted_at: now, item_status: "received"
    } : i));
    toast.success(`"${item.item_label}" submitted successfully`);
    setSubmitting(null);
  };

  const handleFileUpload = async (item: SetupItem, file: File) => {
    if (!activeClientId) return;
    setUploading(item.id);
    const ext = file.name.split(".").pop();
    const path = `${activeClientId}/setup/${item.item_key}.${ext}`;
    const { data, error } = await supabase.storage.from("client-logos").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("client-logos").getPublicUrl(path);
    setEditValues(prev => ({ ...prev, [item.id]: { ...prev[item.id], fileUrl: urlData.publicUrl } }));
    toast.success("File uploaded");
    setUploading(null);
  };

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

  const clientItems = items.filter(i => i.submitted_by_client);
  const totalClient = clientItems.length;
  const submittedCount = clientItems.filter(i => ["received", "completed"].includes(i.item_status)).length;
  const progressPct = totalClient > 0 ? Math.round((submittedCount / totalClient) * 100) : 0;

  const grouped = CATEGORY_ORDER
    .map(cat => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      icon: CATEGORY_ICONS[cat] || StickyNote,
      items: items.filter(i => i.category === cat && i.submitted_by_client),
    }))
    .filter(g => g.items.length > 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Setup Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit your business details and assets so our team can configure your workspace.
        </p>
      </div>

      {/* Progress Card */}
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

      {/* Setup Sections */}
      {grouped.map((group, gi) => {
        const Icon = group.icon;
        return (
          <motion.div key={group.category} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 }}>
            <Card className="border border-border/50 shadow-sm">
              <CardHeader className="pb-2 bg-primary/[0.02]">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  {group.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-3">
                {group.items.map(item => {
                  const edit = editValues[item.id] || { value: "", fileUrl: "" };
                  const statusInfo = STATUS_DISPLAY[item.item_status] || STATUS_DISPLAY.missing;
                  const StatusIcon = statusInfo.icon;
                  const isSubmitted = ["received", "completed"].includes(item.item_status);
                  const isLogoOrAsset = ["logo_primary", "logo_secondary", "brand_colors", "brand_fonts"].includes(item.item_key);

                  return (
                    <div key={item.id} className="rounded-xl border border-border/40 p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{item.item_label}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-0 gap-1" style={{ color: statusInfo.color, background: `${statusInfo.color}15` }}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </div>

                      {/* Admin notes / instructions */}
                      {item.admin_notes && (
                        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">{item.admin_notes}</p>
                      )}

                      {/* Input area */}
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
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*,.pdf,.ai,.svg,.eps"
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
                            rows={2}
                            className="text-sm"
                          />
                        </div>
                      ) : (
                        <Textarea
                          placeholder={`Enter your ${item.item_label.toLowerCase()} details…`}
                          value={edit.value}
                          onChange={e => setEditValues(prev => ({ ...prev, [item.id]: { ...prev[item.id], value: e.target.value } }))}
                          rows={3}
                          className="text-sm"
                        />
                      )}

                      {/* Submitted timestamp */}
                      {item.client_submitted_at && (
                        <p className="text-[10px] text-muted-foreground">
                          Last submitted: {new Date(item.client_submitted_at).toLocaleString()}
                        </p>
                      )}

                      {/* Submit button */}
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleSubmitItem(item)}
                          disabled={submitting === item.id}
                          className="gap-1.5"
                        >
                          {submitting === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isSubmitted ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          {isSubmitted ? "Update" : "Submit"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      {/* Internal items notice */}
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
