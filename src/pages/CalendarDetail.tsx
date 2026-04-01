import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { BackArrow } from "@/components/BackArrow";
import { DataCard } from "@/components/DataCard";
import { MetricCard } from "@/components/MetricCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState as useStateHook } from "react";

function useWorkspaceZoomEnabled(clientId: string | null) {
  const [zoom, setZoom] = useStateHook<boolean>(false);
  useEffect(() => {
    if (!clientId) return;
    supabase.from("workspace_automation_config").select("module_flags")
      .eq("client_id", clientId).maybeSingle()
      .then(({ data }) => {
        const flags = (data?.module_flags as any) || {};
        setZoom(flags.zoom_meetings === true || flags.meeting_intelligence === true);
      });
  }, [clientId]);
  return zoom;
}
import {
  Calendar, Users, Clock, Link2, Bell, Settings2, Plus, Trash2,
  MapPin, Video, Phone, Globe, Copy, Save, Ban, CalendarDays, Edit2
} from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LOC_TYPES = [
  { value: "virtual", label: "Virtual", icon: Video },
  { value: "in_person", label: "In Person", icon: MapPin },
  { value: "phone", label: "Phone", icon: Phone },
  { value: "custom", label: "Custom", icon: Globe },
];
const LINK_TYPES = ["zoom", "google_meet", "phone", "custom", "none"];
const CHANNELS = ["email", "sms", "in_app"];
const USER_ROLES = ["owner", "editor", "member", "viewer", "booking_only"];

export default function CalendarDetail() {
  const { calendarId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeClientId } = useWorkspace();
  const initialTab = searchParams.get("tab") || "overview";

  const [cal, setCal] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [blackouts, setBlackouts] = useState<any[]>([]);
  const [apptTypes, setApptTypes] = useState<any[]>([]);
  const [bookingLinks, setBookingLinks] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addBlackoutOpen, setAddBlackoutOpen] = useState(false);
  const [addTypeOpen, setAddTypeOpen] = useState(false);
  const [editTypeOpen, setEditTypeOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [addReminderOpen, setAddReminderOpen] = useState(false);
  const [addLinkOpen, setAddLinkOpen] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState({ email: "", role: "member" });
  const [newBlackout, setNewBlackout] = useState({ start: "", end: "", reason: "" });
  const [newType, setNewType] = useState({
    name: "", description: "", duration_minutes: "30", buffer_before: "0", buffer_after: "0",
    location_type: "virtual", meeting_link_type: "zoom", confirmation_message: "", reminders_enabled: true,
  });
  const [newReminder, setNewReminder] = useState({ reminder_type: "before_appointment", offset_minutes: "60", channel: "email" });
  const [newLink, setNewLink] = useState({ slug: "", is_public: true });

  const fetchAll = useCallback(async () => {
    if (!calendarId || !activeClientId) return;
    setLoading(true);
    const [cRes, uRes, aRes, bRes, tRes, lRes, rRes, appRes] = await Promise.all([
      supabase.from("calendars").select("*").eq("id", calendarId).single(),
      supabase.from("calendar_users").select("*").eq("calendar_id", calendarId),
      supabase.from("calendar_availability").select("*").eq("calendar_id", calendarId).order("day_of_week"),
      supabase.from("calendar_blackout_dates").select("*").eq("calendar_id", calendarId).order("start_datetime"),
      supabase.from("calendar_appointment_types").select("*").eq("calendar_id", calendarId).order("created_at"),
      supabase.from("calendar_booking_links").select("*").eq("calendar_id", calendarId),
      supabase.from("calendar_reminder_rules").select("*").eq("calendar_id", calendarId),
      supabase.from("appointments").select("id, status").eq("calendar_id", calendarId),
    ]);
    setCal(cRes.data);
    setUsers(uRes.data || []);
    setAvailability(aRes.data || []);
    setBlackouts(bRes.data || []);
    setApptTypes(tRes.data || []);
    setBookingLinks(lRes.data || []);
    setReminders(rRes.data || []);
    setAppointments(appRes.data || []);
    setLoading(false);
  }, [calendarId, activeClientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Availability helpers ──
  const saveAvailability = async (dayData: { day_of_week: number; start_time: string; end_time: string; slot_interval_minutes: number; is_active: boolean }) => {
    const existing = availability.find(a => a.day_of_week === dayData.day_of_week);
    if (existing) {
      await supabase.from("calendar_availability").update(dayData).eq("id", existing.id);
    } else {
      await supabase.from("calendar_availability").insert({
        client_id: activeClientId, calendar_id: calendarId, timezone: cal?.timezone || "America/Los_Angeles", ...dayData,
      });
    }
    toast.success(`${DAYS[dayData.day_of_week]} availability saved`);
    fetchAll();
  };

  const resetDefaults = async () => {
    // Delete existing, insert M-F 9-5
    await supabase.from("calendar_availability").delete().eq("calendar_id", calendarId);
    const defaults = [1, 2, 3, 4, 5].map(d => ({
      client_id: activeClientId!, calendar_id: calendarId!,
      day_of_week: d, start_time: "09:00", end_time: "17:00",
      slot_interval_minutes: 30, is_active: true, timezone: cal?.timezone || "America/Los_Angeles",
    }));
    await supabase.from("calendar_availability").insert(defaults);
    toast.success("Reset to weekday defaults");
    fetchAll();
  };

  // ── CRUD helpers ──
  const addUser = async () => {
    if (!newUser.email.trim()) { toast.error("Email required"); return; }
    // Find user by email — in a real system we'd look up profiles
    const { data, error } = await supabase.from("calendar_users").insert({
      client_id: activeClientId, calendar_id: calendarId,
      user_id: crypto.randomUUID(), // placeholder — real implementation would resolve from profiles
      role: newUser.role,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("User added");
    setNewUser({ email: "", role: "member" });
    setAddUserOpen(false);
    fetchAll();
  };

  const removeUser = async (id: string) => {
    await supabase.from("calendar_users").delete().eq("id", id);
    toast.success("User removed");
    fetchAll();
  };

  const addBlackout = async () => {
    if (!newBlackout.start || !newBlackout.end) { toast.error("Start and end required"); return; }
    await supabase.from("calendar_blackout_dates").insert({
      client_id: activeClientId, calendar_id: calendarId,
      start_datetime: newBlackout.start, end_datetime: newBlackout.end,
      reason: newBlackout.reason || null,
    });
    toast.success("Blackout date added");
    setNewBlackout({ start: "", end: "", reason: "" });
    setAddBlackoutOpen(false);
    fetchAll();
  };

  const deleteBlackout = async (id: string) => {
    await supabase.from("calendar_blackout_dates").delete().eq("id", id);
    toast.success("Blackout removed");
    fetchAll();
  };

  const addApptType = async () => {
    if (!newType.name.trim()) { toast.error("Name required"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("calendar_appointment_types").insert({
      client_id: activeClientId, calendar_id: calendarId,
      name: newType.name, description: newType.description || null,
      duration_minutes: parseInt(newType.duration_minutes),
      buffer_before: parseInt(newType.buffer_before),
      buffer_after: parseInt(newType.buffer_after),
      location_type: newType.location_type, meeting_link_type: newType.meeting_link_type,
      confirmation_message: newType.confirmation_message || null,
      reminders_enabled: newType.reminders_enabled,
    });
    await supabase.from("audit_logs").insert({
      client_id: activeClientId, action: "appointment_type_created", module: "calendar",
      user_id: user?.id || null, metadata: { calendar_id: calendarId, name: newType.name },
    });
    toast.success("Appointment type created");
    setNewType({ name: "", description: "", duration_minutes: "30", buffer_before: "0", buffer_after: "0", location_type: "virtual", meeting_link_type: "zoom", confirmation_message: "", reminders_enabled: true });
    setAddTypeOpen(false);
    fetchAll();
  };

  const openEditType = (t: any) => {
    setEditingType({
      ...t,
      duration_minutes: String(t.duration_minutes),
      buffer_before: String(t.buffer_before),
      buffer_after: String(t.buffer_after),
    });
    setEditTypeOpen(true);
  };

  const saveEditType = async () => {
    if (!editingType) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("calendar_appointment_types").update({
      name: editingType.name,
      description: editingType.description || null,
      duration_minutes: parseInt(editingType.duration_minutes),
      buffer_before: parseInt(editingType.buffer_before),
      buffer_after: parseInt(editingType.buffer_after),
      location_type: editingType.location_type,
      meeting_link_type: editingType.meeting_link_type,
      confirmation_message: editingType.confirmation_message || null,
      reminders_enabled: editingType.reminders_enabled,
      is_active: editingType.is_active,
    }).eq("id", editingType.id);
    await supabase.from("audit_logs").insert({
      client_id: activeClientId, action: "appointment_type_updated", module: "calendar",
      user_id: user?.id || null, metadata: { calendar_id: calendarId, name: editingType.name },
    });
    toast.success("Appointment type updated");
    setEditTypeOpen(false);
    setEditingType(null);
    fetchAll();
  };

  const toggleApptTypeActive = async (id: string, currentActive: boolean) => {
    await supabase.from("calendar_appointment_types").update({ is_active: !currentActive }).eq("id", id);
    toast.success(currentActive ? "Appointment type deactivated" : "Appointment type activated");
    fetchAll();
  };

  const deleteApptType = async (id: string) => {
    await supabase.from("calendar_appointment_types").delete().eq("id", id);
    toast.success("Appointment type deleted");
    fetchAll();
  };

  const addBookingLink = async () => {
    if (!newLink.slug.trim()) { toast.error("Slug required"); return; }
    const { error } = await supabase.from("calendar_booking_links").insert({
      client_id: activeClientId, calendar_id: calendarId,
      slug: newLink.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      is_public: newLink.is_public, is_active: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Booking link created");
    setNewLink({ slug: "", is_public: true });
    setAddLinkOpen(false);
    fetchAll();
  };

  const toggleLink = async (id: string, field: "is_active" | "is_public", current: boolean) => {
    await supabase.from("calendar_booking_links").update({ [field]: !current }).eq("id", id);
    toast.success("Updated");
    fetchAll();
  };

  const deleteLink = async (id: string) => {
    await supabase.from("calendar_booking_links").delete().eq("id", id);
    toast.success("Link deleted");
    fetchAll();
  };

  const addReminder = async () => {
    await supabase.from("calendar_reminder_rules").insert({
      client_id: activeClientId, calendar_id: calendarId,
      reminder_type: newReminder.reminder_type,
      offset_minutes: parseInt(newReminder.offset_minutes),
      channel: newReminder.channel, is_active: true,
    });
    toast.success("Reminder rule added");
    setNewReminder({ reminder_type: "before_appointment", offset_minutes: "60", channel: "email" });
    setAddReminderOpen(false);
    fetchAll();
  };

  const deleteReminder = async (id: string) => {
    await supabase.from("calendar_reminder_rules").delete().eq("id", id);
    toast.success("Reminder deleted");
    fetchAll();
  };

  if (!cal && !loading) {
    return (
      <div>
        <BackArrow to="/calendar-management" label="Back to Calendars" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Calendar not found.</p>
        </div>
      </div>
    );
  }

  if (loading || !cal) {
    return (
      <div>
        <BackArrow to="/calendar-management" label="Back to Calendars" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6 animate-pulse">
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

  const activeAppts = appointments.filter(a => a.status !== "cancelled").length;

  return (
    <div>
      <BackArrow to="/calendar-management" label="Back to Calendars" />
      <PageHeader title={cal.calendar_name} description={`${cal.calendar_type} calendar · ${cal.timezone}`}>
        <Badge variant={cal.is_active ? "default" : "outline"}>{cal.is_active ? "Active" : "Inactive"}</Badge>
      </PageHeader>

      <Tabs defaultValue={initialTab} className="mt-2">
        <TabsList className="bg-secondary flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="blackouts">Blackouts</TabsTrigger>
          <TabsTrigger value="types">Appt Types</TabsTrigger>
          <TabsTrigger value="links">Booking Links</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="mt-4">
          <WidgetGrid columns="repeat(auto-fit, minmax(150px, 1fr))">
            <MetricCard label="Team Members" value={String(users.length)} icon={Users} />
            <MetricCard label="Appt Types" value={String(apptTypes.length)} icon={CalendarDays} />
            <MetricCard label="Active Bookings" value={String(activeAppts)} icon={Clock} />
            <MetricCard label="Booking Links" value={String(bookingLinks.length)} icon={Link2} />
          </WidgetGrid>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <DataCard title="Details">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-medium capitalize">{cal.calendar_type}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Timezone</span><span className="font-medium">{cal.timezone}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium">{cal.default_location || "Not set"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Color</span><span className="flex items-center gap-2"><span className="h-4 w-4 rounded" style={{ background: cal.color || "#3B82F6" }} />{cal.color || "#3B82F6"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={cal.is_active ? "default" : "outline"}>{cal.is_active ? "Active" : "Inactive"}</Badge></div>
              </div>
            </DataCard>
            <DataCard title="Description">
              <p className="text-sm text-muted-foreground">{cal.description || "No description set."}</p>
            </DataCard>
          </div>
        </TabsContent>

        {/* ── TEAM ACCESS ── */}
        <TabsContent value="team" className="mt-4">
          <DataCard title="Team Access" action={
            <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> Add User</Button></DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div><Label>Email</Label><Input value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} placeholder="user@example.com" className="bg-background border-border" /></div>
                  <div><Label>Role</Label>
                    <Select value={newUser.role} onValueChange={v => setNewUser(p => ({ ...p, role: v }))}>
                      <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>{USER_ROLES.map(r => <SelectItem key={r} value={r}><span className="capitalize">{r.replace("_", " ")}</span></SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={addUser}>Add User</Button>
                </div>
              </DialogContent>
            </Dialog>
          }>
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No team members assigned yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{u.user_id?.slice(0, 8)}…</p>
                      <Badge variant="secondary" className="text-[10px] capitalize mt-0.5">{u.role.replace("_", " ")}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Select defaultValue={u.role} onValueChange={async v => {
                        await supabase.from("calendar_users").update({ role: v }).eq("id", u.id);
                        toast.success("Role updated");
                        fetchAll();
                      }}>
                        <SelectTrigger className="h-7 text-xs w-[110px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{USER_ROLES.map(r => <SelectItem key={r} value={r}><span className="capitalize">{r.replace("_", " ")}</span></SelectItem>)}</SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeUser(u.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DataCard>
        </TabsContent>

        {/* ── AVAILABILITY ── */}
        <TabsContent value="availability" className="mt-4">
          <DataCard title="Weekly Availability" action={
            <Button variant="outline" size="sm" onClick={resetDefaults}>Reset to Defaults</Button>
          }>
            <div className="space-y-3">
              {DAYS.map((day, idx) => {
                const slot = availability.find(a => a.day_of_week === idx);
                const isActive = slot?.is_active ?? false;
                return (
                  <div key={idx} className="flex items-center gap-3 flex-wrap py-2 border-b border-border last:border-0">
                    <div className="w-24">
                      <div className="flex items-center gap-2">
                        <Switch checked={isActive} onCheckedChange={v => saveAvailability({
                          day_of_week: idx, start_time: slot?.start_time || "09:00",
                          end_time: slot?.end_time || "17:00", slot_interval_minutes: slot?.slot_interval_minutes || 30, is_active: v,
                        })} />
                        <span className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{day.slice(0, 3)}</span>
                      </div>
                    </div>
                    {isActive && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Input type="time" defaultValue={slot?.start_time || "09:00"} className="w-[120px] h-8 text-xs bg-background border-border"
                          onBlur={e => saveAvailability({ day_of_week: idx, start_time: e.target.value, end_time: slot?.end_time || "17:00", slot_interval_minutes: slot?.slot_interval_minutes || 30, is_active: true })} />
                        <span className="text-muted-foreground text-xs">to</span>
                        <Input type="time" defaultValue={slot?.end_time || "17:00"} className="w-[120px] h-8 text-xs bg-background border-border"
                          onBlur={e => saveAvailability({ day_of_week: idx, start_time: slot?.start_time || "09:00", end_time: e.target.value, slot_interval_minutes: slot?.slot_interval_minutes || 30, is_active: true })} />
                        <Select defaultValue={String(slot?.slot_interval_minutes || 30)} onValueChange={v => saveAvailability({
                          day_of_week: idx, start_time: slot?.start_time || "09:00", end_time: slot?.end_time || "17:00", slot_interval_minutes: parseInt(v), is_active: true,
                        })}>
                          <SelectTrigger className="w-[90px] h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 min</SelectItem>
                            <SelectItem value="30">30 min</SelectItem>
                            <SelectItem value="45">45 min</SelectItem>
                            <SelectItem value="60">60 min</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </DataCard>
        </TabsContent>

        {/* ── BLACKOUT DATES ── */}
        <TabsContent value="blackouts" className="mt-4">
          <DataCard title="Blackout Dates" action={
            <Dialog open={addBlackoutOpen} onOpenChange={setAddBlackoutOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> Add Blackout</Button></DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle>Add Blackout Date</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div><Label>Start</Label><Input type="datetime-local" value={newBlackout.start} onChange={e => setNewBlackout(p => ({ ...p, start: e.target.value }))} className="bg-background border-border" /></div>
                  <div><Label>End</Label><Input type="datetime-local" value={newBlackout.end} onChange={e => setNewBlackout(p => ({ ...p, end: e.target.value }))} className="bg-background border-border" /></div>
                  <div><Label>Reason</Label><Input value={newBlackout.reason} onChange={e => setNewBlackout(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Holiday, Vacation" className="bg-background border-border" /></div>
                  <Button className="w-full" onClick={addBlackout}>Add Blackout</Button>
                </div>
              </DialogContent>
            </Dialog>
          }>
            {blackouts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No blackout dates configured.</p>
            ) : (
              <div className="divide-y divide-border">
                {blackouts.map(b => (
                  <div key={b.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{new Date(b.start_datetime).toLocaleDateString()} — {new Date(b.end_datetime).toLocaleDateString()}</p>
                      {b.reason && <p className="text-xs text-muted-foreground">{b.reason}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteBlackout(b.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </DataCard>
        </TabsContent>

        {/* ── APPOINTMENT TYPES ── */}
        <TabsContent value="types" className="mt-4">
          <DataCard title="Appointment Types" action={
            <Dialog open={addTypeOpen} onOpenChange={setAddTypeOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> Add Type</Button></DialogTrigger>
              <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create Appointment Type</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div><Label>Name *</Label><Input value={newType.name} onChange={e => setNewType(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Strategy Call" className="bg-background border-border" /></div>
                  <div><Label>Description</Label><Textarea value={newType.description} onChange={e => setNewType(p => ({ ...p, description: e.target.value }))} className="bg-background border-border min-h-[50px]" /></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label>Duration (min)</Label><Input type="number" value={newType.duration_minutes} onChange={e => setNewType(p => ({ ...p, duration_minutes: e.target.value }))} className="bg-background border-border" /></div>
                    <div><Label>Buffer Before</Label><Input type="number" value={newType.buffer_before} onChange={e => setNewType(p => ({ ...p, buffer_before: e.target.value }))} className="bg-background border-border" /></div>
                    <div><Label>Buffer After</Label><Input type="number" value={newType.buffer_after} onChange={e => setNewType(p => ({ ...p, buffer_after: e.target.value }))} className="bg-background border-border" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Location Type</Label>
                      <Select value={newType.location_type} onValueChange={v => setNewType(p => ({ ...p, location_type: v }))}>
                        <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>{LOC_TYPES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Meeting Link</Label>
                      <Select value={newType.meeting_link_type} onValueChange={v => setNewType(p => ({ ...p, meeting_link_type: v }))}>
                        <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>{LINK_TYPES.map(l => <SelectItem key={l} value={l}><span className="capitalize">{l.replace("_", " ")}</span></SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Confirmation Message</Label><Textarea value={newType.confirmation_message} onChange={e => setNewType(p => ({ ...p, confirmation_message: e.target.value }))} placeholder="Message shown after booking" className="bg-background border-border min-h-[50px]" /></div>
                  <div className="flex items-center gap-2">
                    <Switch checked={newType.reminders_enabled} onCheckedChange={v => setNewType(p => ({ ...p, reminders_enabled: v }))} />
                    <Label>Reminders Enabled</Label>
                  </div>
                  <Button className="w-full" onClick={addApptType}>Create Appointment Type</Button>
                </div>
              </DialogContent>
            </Dialog>
          }>
            {apptTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No appointment types configured. Add your first one to enable bookings.</p>
            ) : (
              <div className="divide-y divide-border">
                {apptTypes.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div className="cursor-pointer flex-1" onClick={() => openEditType(t)}>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{t.name}</p>
                        <Badge variant="secondary" className="text-[10px]">{t.duration_minutes} min</Badge>
                        <Badge variant={t.is_active ? "default" : "outline"} className="text-[10px]">{t.is_active ? "Active" : "Inactive"}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.location_type} · {t.meeting_link_type !== "none" ? t.meeting_link_type.replace("_", " ") : "No link"}
                        {t.buffer_before > 0 && ` · ${t.buffer_before}min buffer before`}
                        {t.buffer_after > 0 && ` · ${t.buffer_after}min buffer after`}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditType(t)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleApptTypeActive(t.id, t.is_active)}>
                        {t.is_active ? <Ban className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteApptType(t.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DataCard>

          {/* Edit Appointment Type Dialog */}
          <Dialog open={editTypeOpen} onOpenChange={setEditTypeOpen}>
            <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Edit Appointment Type</DialogTitle></DialogHeader>
              {editingType && (
                <div className="space-y-3 pt-2">
                  <div><Label>Name *</Label><Input value={editingType.name} onChange={e => setEditingType((p: any) => ({ ...p, name: e.target.value }))} className="bg-background border-border" /></div>
                  <div><Label>Description</Label><Textarea value={editingType.description || ""} onChange={e => setEditingType((p: any) => ({ ...p, description: e.target.value }))} className="bg-background border-border min-h-[50px]" /></div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label>Duration (min)</Label><Input type="number" value={editingType.duration_minutes} onChange={e => setEditingType((p: any) => ({ ...p, duration_minutes: e.target.value }))} className="bg-background border-border" /></div>
                    <div><Label>Buffer Before</Label><Input type="number" value={editingType.buffer_before} onChange={e => setEditingType((p: any) => ({ ...p, buffer_before: e.target.value }))} className="bg-background border-border" /></div>
                    <div><Label>Buffer After</Label><Input type="number" value={editingType.buffer_after} onChange={e => setEditingType((p: any) => ({ ...p, buffer_after: e.target.value }))} className="bg-background border-border" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Location Type</Label>
                      <Select value={editingType.location_type} onValueChange={v => setEditingType((p: any) => ({ ...p, location_type: v }))}>
                        <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>{LOC_TYPES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Meeting Link</Label>
                      <Select value={editingType.meeting_link_type} onValueChange={v => setEditingType((p: any) => ({ ...p, meeting_link_type: v }))}>
                        <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                        <SelectContent>{LINK_TYPES.map(l => <SelectItem key={l} value={l}><span className="capitalize">{l.replace("_", " ")}</span></SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Confirmation Message</Label><Textarea value={editingType.confirmation_message || ""} onChange={e => setEditingType((p: any) => ({ ...p, confirmation_message: e.target.value }))} placeholder="Message shown after booking" className="bg-background border-border min-h-[50px]" /></div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editingType.is_active} onCheckedChange={v => setEditingType((p: any) => ({ ...p, is_active: v }))} />
                    <Label>Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editingType.reminders_enabled} onCheckedChange={v => setEditingType((p: any) => ({ ...p, reminders_enabled: v }))} />
                    <Label>Reminders Enabled</Label>
                  </div>
                  <Button className="w-full" onClick={saveEditType}>Save Changes</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── BOOKING LINKS ── */}
        <TabsContent value="links" className="mt-4">
          <DataCard title="Booking Links" action={
            <Dialog open={addLinkOpen} onOpenChange={setAddLinkOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> Add Link</Button></DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle>Create Booking Link</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div><Label>Slug *</Label><Input value={newLink.slug} onChange={e => setNewLink(p => ({ ...p, slug: e.target.value }))} placeholder="e.g. consultation" className="bg-background border-border" /></div>
                  <div className="text-xs text-muted-foreground">URL: {window.location.origin}/book/{newLink.slug || "your-slug"}</div>
                  <div className="flex items-center gap-2">
                    <Switch checked={newLink.is_public} onCheckedChange={v => setNewLink(p => ({ ...p, is_public: v }))} />
                    <Label>Public</Label>
                  </div>
                  <Button className="w-full" onClick={addBookingLink}>Create Link</Button>
                </div>
              </DialogContent>
            </Dialog>
          }>
            {bookingLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No booking links created yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {bookingLinks.map(l => {
                  const url = `${window.location.origin}/book/${l.slug}`;
                  return (
                    <div key={l.id} className="flex items-center justify-between py-3 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{url}</p>
                        <div className="flex gap-2 mt-0.5">
                          <Badge variant={l.is_active ? "default" : "outline"} className="text-[10px]">{l.is_active ? "Active" : "Inactive"}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{l.is_public ? "Public" : "Private"}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleLink(l.id, "is_active", l.is_active)}>
                          {l.is_active ? <Ban className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteLink(l.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DataCard>
        </TabsContent>

        {/* ── REMINDERS ── */}
        <TabsContent value="reminders" className="mt-4">
          <DataCard title="Reminder Rules" action={
            <Dialog open={addReminderOpen} onOpenChange={setAddReminderOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-3 w-3" /> Add Rule</Button></DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle>Add Reminder Rule</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div><Label>Type</Label>
                    <Select value={newReminder.reminder_type} onValueChange={v => setNewReminder(p => ({ ...p, reminder_type: v }))}>
                      <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmation">Confirmation</SelectItem>
                        <SelectItem value="before_appointment">Pre-Appointment</SelectItem>
                        <SelectItem value="follow_up">Follow-Up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Offset (minutes)</Label><Input type="number" value={newReminder.offset_minutes} onChange={e => setNewReminder(p => ({ ...p, offset_minutes: e.target.value }))} className="bg-background border-border" /></div>
                  <div><Label>Channel</Label>
                    <Select value={newReminder.channel} onValueChange={v => setNewReminder(p => ({ ...p, channel: v }))}>
                      <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>{CHANNELS.map(c => <SelectItem key={c} value={c}><span className="capitalize">{c.replace("_", " ")}</span></SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={addReminder}>Add Rule</Button>
                </div>
              </DialogContent>
            </Dialog>
          }>
            {reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No reminder rules configured.</p>
            ) : (
              <div className="divide-y divide-border">
                {reminders.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium capitalize">{r.reminder_type.replace("_", " ")}</p>
                      <p className="text-xs text-muted-foreground">{r.offset_minutes} min · {r.channel} · {r.is_active ? "Active" : "Inactive"}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteReminder(r.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </DataCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
