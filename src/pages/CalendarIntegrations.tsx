import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { DataCard } from "@/components/DataCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plug, Calendar, RefreshCw, CheckCircle2, AlertCircle, Clock, Info, Loader2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

const PROVIDERS = [
  { id: "google", label: "Google Calendar", desc: "Sync with Google Workspace or personal Gmail calendars", icon: "🗓️" },
  { id: "outlook", label: "Outlook / Microsoft 365", desc: "Sync with Microsoft Outlook and Office 365 calendars", icon: "📅" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  not_connected: { label: "Not Connected", color: "bg-muted text-muted-foreground", icon: Plug },
  access_needed: { label: "Access Needed", color: "bg-amber-50 text-amber-700 border-amber-200", icon: AlertCircle },
  connected: { label: "Connected", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  needs_reconnect: { label: "Needs Reconnect", color: "bg-orange-50 text-orange-700 border-orange-200", icon: RefreshCw },
  error: { label: "Error", color: "bg-destructive/10 text-destructive", icon: AlertCircle },
};

export default function CalendarIntegrations() {
  const { activeClientId } = useWorkspace();
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [syncSettings, setSyncSettings] = useState<any[]>([]);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
  const [syncForm, setSyncForm] = useState({
    calendar_id: "",
    use_external_availability: true,
    push_bookings_to_external: false,
    sync_cancellations: false,
    sync_reschedules: false,
  });

  const fetchData = useCallback(async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [iRes, sRes, cRes] = await Promise.all([
      supabase.from("calendar_integrations").select("*").eq("client_id", activeClientId),
      supabase.from("calendar_sync_settings").select("*").eq("client_id", activeClientId),
      supabase.from("calendars").select("id, calendar_name").eq("client_id", activeClientId).eq("is_active", true),
    ]);
    setIntegrations(iRes.data || []);
    setSyncSettings(sRes.data || []);
    setCalendars(cRes.data || []);
    setLoading(false);
  }, [activeClientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const initConnection = async (provider: string) => {
    if (!activeClientId) return;
    const existing = integrations.find((i) => i.provider_name === provider);
    if (existing) {
      toast.info("Connection already exists. Use settings to manage.");
      return;
    }

    await supabase.from("calendar_integrations").insert({
      client_id: activeClientId,
      provider_name: provider,
      connection_status: "access_needed",
    });

    toast.success("Integration initialized — connect your account to complete setup");
    fetchData();
  };

  const openSyncSettings = (integration: any) => {
    setSelectedIntegration(integration);
    const existing = syncSettings.find((s) => s.calendar_id && integrations.find((i) => i.id === integration.id));
    if (existing) {
      setSyncForm({
        calendar_id: existing.calendar_id,
        use_external_availability: existing.use_external_availability,
        push_bookings_to_external: existing.push_bookings_to_external,
        sync_cancellations: existing.sync_cancellations,
        sync_reschedules: existing.sync_reschedules,
      });
    } else {
      setSyncForm({
        calendar_id: "",
        use_external_availability: true,
        push_bookings_to_external: false,
        sync_cancellations: false,
        sync_reschedules: false,
      });
    }
    setSettingsOpen(true);
  };

  const saveSyncSettings = async () => {
    if (!activeClientId || !syncForm.calendar_id) {
      toast.error("Please select a calendar");
      return;
    }

    const existing = syncSettings.find((s) => s.calendar_id === syncForm.calendar_id);

    if (existing) {
      await supabase.from("calendar_sync_settings").update({
        use_external_availability: syncForm.use_external_availability,
        push_bookings_to_external: syncForm.push_bookings_to_external,
        sync_cancellations: syncForm.sync_cancellations,
        sync_reschedules: syncForm.sync_reschedules,
      }).eq("id", existing.id);
    } else {
      await supabase.from("calendar_sync_settings").insert({
        client_id: activeClientId,
        calendar_id: syncForm.calendar_id,
        use_external_availability: syncForm.use_external_availability,
        push_bookings_to_external: syncForm.push_bookings_to_external,
        sync_cancellations: syncForm.sync_cancellations,
        sync_reschedules: syncForm.sync_reschedules,
      });
    }

    toast.success("Sync settings saved");
    setSettingsOpen(false);
    fetchData();
  };

  return (
    <div>
      <PageHeader title="Calendar Integrations" description="Connect external calendars to prevent double booking and sync events" />

      <ModuleHelpPanel
        title="External Calendar Sync"
        description="Connect Google Calendar or Outlook to your workspace so your team's external availability is automatically checked when customers book appointments. Events can be pushed to external calendars too."
        tips={[
          "External availability prevents double booking across systems",
          "Each staff member can connect their own calendar",
          "Cancellations and reschedules can sync both ways",
          "Your NewLight calendars remain the source of truth for booking",
        ]}
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {PROVIDERS.map((provider) => {
          const integration = integrations.find((i) => i.provider_name === provider.id);
          const status = integration?.connection_status || "not_connected";
          const statusConf = STATUS_CONFIG[status] || STATUS_CONFIG.not_connected;
          const StatusIcon = statusConf.icon;

          return (
            <motion.div
              key={provider.id}
              className="card-widget p-6 rounded-2xl"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold">{provider.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{provider.desc}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Badge className={`${statusConf.color} text-[10px] gap-1`}>
                  <StatusIcon className="h-2.5 w-2.5" />
                  {statusConf.label}
                </Badge>
                {integration?.last_synced_at && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    Last synced: {new Date(integration.last_synced_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                {!integration ? (
                  <Button size="sm" onClick={() => initConnection(provider.id)}>
                    <Plug className="h-3.5 w-3.5 mr-1.5" /> Connect
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => openSyncSettings(integration)}>
                      Sync Settings
                    </Button>
                    {status === "access_needed" && (
                      <Button size="sm" onClick={() => toast.info("OAuth connection flow coming soon — your settings are saved and ready")}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Authorize
                      </Button>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {syncSettings.length > 0 && (
        <DataCard title="Active Sync Rules" className="mt-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Calendar</th>
                  <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Read Availability</th>
                  <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Push Events</th>
                  <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Sync Cancels</th>
                  <th className="text-left text-xs font-medium text-muted-foreground py-3">Sync Reschedules</th>
                </tr>
              </thead>
              <tbody>
                {syncSettings.map((s) => {
                  const cal = calendars.find((c) => c.id === s.calendar_id);
                  return (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="text-sm font-medium py-3 pr-4">{cal?.calendar_name || "—"}</td>
                      <td className="py-3 pr-4"><Badge variant={s.use_external_availability ? "default" : "secondary"} className="text-[10px]">{s.use_external_availability ? "Yes" : "No"}</Badge></td>
                      <td className="py-3 pr-4"><Badge variant={s.push_bookings_to_external ? "default" : "secondary"} className="text-[10px]">{s.push_bookings_to_external ? "Yes" : "No"}</Badge></td>
                      <td className="py-3 pr-4"><Badge variant={s.sync_cancellations ? "default" : "secondary"} className="text-[10px]">{s.sync_cancellations ? "Yes" : "No"}</Badge></td>
                      <td className="py-3"><Badge variant={s.sync_reschedules ? "default" : "secondary"} className="text-[10px]">{s.sync_reschedules ? "Yes" : "No"}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DataCard>
      )}

      {/* Sync Settings Sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Sync Settings</SheetTitle>
            <SheetDescription>Configure how this integration syncs with your calendars</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="rounded-lg bg-secondary/50 border border-border p-3">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">How Sync Works</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                External availability is checked when customers book. Events can be pushed to your external calendar after booking.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Link to Calendar</Label>
              <Select value={syncForm.calendar_id} onValueChange={(v) => setSyncForm((s) => ({ ...s, calendar_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a calendar" /></SelectTrigger>
                <SelectContent>
                  {calendars.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.calendar_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Use External Availability</Label>
                <p className="text-[11px] text-muted-foreground">Check external calendar for conflicts when booking</p>
              </div>
              <Switch checked={syncForm.use_external_availability} onCheckedChange={(v) => setSyncForm((s) => ({ ...s, use_external_availability: v }))} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Push Bookings</Label>
                <p className="text-[11px] text-muted-foreground">Create events in external calendar when booked</p>
              </div>
              <Switch checked={syncForm.push_bookings_to_external} onCheckedChange={(v) => setSyncForm((s) => ({ ...s, push_bookings_to_external: v }))} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Sync Cancellations</Label>
                <p className="text-[11px] text-muted-foreground">Cancel external events when cancelled here</p>
              </div>
              <Switch checked={syncForm.sync_cancellations} onCheckedChange={(v) => setSyncForm((s) => ({ ...s, sync_cancellations: v }))} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Sync Reschedules</Label>
                <p className="text-[11px] text-muted-foreground">Update external events when rescheduled here</p>
              </div>
              <Switch checked={syncForm.sync_reschedules} onCheckedChange={(v) => setSyncForm((s) => ({ ...s, sync_reschedules: v }))} />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button onClick={saveSyncSettings}>Save Settings</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
