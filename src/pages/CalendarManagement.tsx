import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { SetupBanner } from "@/components/SetupBanner";
import { DataCard } from "@/components/DataCard";
import { MetricCard } from "@/components/MetricCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Calendar, Plus, Search, Filter, Users, Clock, Link2, Eye,
  Settings2, Trash2, Copy, MoreHorizontal, CalendarDays
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const CALENDAR_TYPES = [
  { value: "single", label: "Single", desc: "One owner, one booking flow" },
  { value: "team", label: "Team", desc: "Shared among multiple users" },
  { value: "round_robin", label: "Round Robin", desc: "Distribute bookings fairly" },
  { value: "department", label: "Department", desc: "Department-level calendar" },
  { value: "staff", label: "Staff", desc: "Tied to a specific staff member" },
  { value: "internal", label: "Internal", desc: "Not public-facing, workspace only" },
];

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

export default function CalendarManagement() {
  const { activeClientId } = useWorkspace();
  const navigate = useNavigate();
  const [calendars, setCalendars] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [calUsers, setCalUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newCal, setNewCal] = useState({
    calendar_name: "", calendar_type: "single", description: "",
    timezone: "America/Los_Angeles", default_location: "", color: "#3B82F6",
  });

  const fetchData = useCallback(async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [cRes, aRes, uRes] = await Promise.all([
      supabase.from("calendars").select("*").eq("client_id", activeClientId).order("created_at"),
      supabase.from("appointments").select("id, calendar_id, status").eq("client_id", activeClientId),
      supabase.from("calendar_users").select("id, calendar_id").eq("client_id", activeClientId),
    ]);
    setCalendars(cRes.data || []);
    setAppointments(aRes.data || []);
    setCalUsers(uRes.data || []);
    setLoading(false);
  }, [activeClientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createCalendar = async () => {
    if (!activeClientId || !newCal.calendar_name.trim()) {
      toast.error("Calendar name is required"); return;
    }
    const { data, error } = await supabase.from("calendars").insert({
      client_id: activeClientId,
      calendar_name: newCal.calendar_name,
      calendar_type: newCal.calendar_type,
      description: newCal.description || null,
      timezone: newCal.timezone,
      default_location: newCal.default_location || null,
      color: newCal.color,
      is_active: true,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    // Create owner access record
    const { data: { user } } = await supabase.auth.getUser();
    if (user && data) {
      await supabase.from("calendar_users").insert({
        client_id: activeClientId, calendar_id: data.id,
        user_id: user.id, role: "owner",
      });
    }
    // Audit log
    await supabase.from("audit_logs").insert({
      client_id: activeClientId, action: "calendar_created",
      module: "calendar", user_id: user?.id || null,
      metadata: { calendar_name: newCal.calendar_name, calendar_type: newCal.calendar_type },
    });
    toast.success("Calendar created");
    setNewCal({ calendar_name: "", calendar_type: "single", description: "", timezone: "America/Los_Angeles", default_location: "", color: "#3B82F6" });
    setCreateOpen(false);
    fetchData();
  };

  const deleteCalendar = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await supabase.from("calendars").delete().eq("id", id);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      client_id: activeClientId, action: "calendar_deleted",
      module: "calendar", user_id: user?.id || null,
      metadata: { calendar_name: name },
    });
    toast.success("Calendar deleted");
    fetchData();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("calendars").update({ is_active: !current }).eq("id", id);
    toast.success(current ? "Calendar deactivated" : "Calendar activated");
    fetchData();
  };

  const getBookingCount = (calId: string) => appointments.filter(a => a.calendar_id === calId && a.status !== "cancelled").length;
  const getUserCount = (calId: string) => calUsers.filter(u => u.calendar_id === calId).length;

  const filtered = calendars.filter(c => {
    if (searchTerm && !c.calendar_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterType !== "all" && c.calendar_type !== filterType) return false;
    if (filterStatus === "active" && !c.is_active) return false;
    if (filterStatus === "inactive" && c.is_active) return false;
    return true;
  });

  const activeCount = calendars.filter(c => c.is_active).length;
  const totalAppts = appointments.filter(a => a.status !== "cancelled").length;

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Calendar Management" description="Multi-calendar system management" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to manage calendars.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Calendar Management" description="Create, configure, and manage your workspace calendars">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> Create Calendar</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-foreground">Create New Calendar</DialogTitle></DialogHeader>
            <ModuleHelpPanel moduleName="Calendar Types" description="Choose the type that best fits your scheduling needs. Single is for one person, Team is shared, Round Robin distributes bookings fairly across team members, and Internal is for workspace-only use." />
            <div className="space-y-4 pt-1">
              <div><Label>Calendar Name *</Label><Input value={newCal.calendar_name} onChange={e => setNewCal(p => ({ ...p, calendar_name: e.target.value }))} placeholder="e.g. Sales Consultations" className="bg-background border-border" /></div>
              <div><Label>Type</Label>
                <Select value={newCal.calendar_type} onValueChange={v => setNewCal(p => ({ ...p, calendar_type: v }))}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CALENDAR_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="font-medium">{t.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">— {t.desc}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Textarea value={newCal.description} onChange={e => setNewCal(p => ({ ...p, description: e.target.value }))} placeholder="What is this calendar for?" className="bg-background border-border min-h-[60px]" /></div>
              <div><Label>Timezone</Label>
                <Select value={newCal.timezone} onValueChange={v => setNewCal(p => ({ ...p, timezone: v }))}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern</SelectItem>
                    <SelectItem value="America/Chicago">Central</SelectItem>
                    <SelectItem value="America/Denver">Mountain</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Australia/Sydney">Sydney</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Default Location</Label><Input value={newCal.default_location} onChange={e => setNewCal(p => ({ ...p, default_location: e.target.value }))} placeholder="e.g. Zoom, Office, Phone" className="bg-background border-border" /></div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-1">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewCal(p => ({ ...p, color: c }))}
                      className={`h-7 w-7 rounded-lg border-2 transition-all ${newCal.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={createCalendar}>Create Calendar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <ModuleHelpPanel moduleName="Calendar Management"
        description="Manage multiple calendars for your workspace. Each calendar can have its own team members, availability, appointment types, booking links, and reminder rules. Calendars are scoped to your workspace — employees only see calendars assigned to them."
        tips={[
          "Use Team calendars for shared scheduling across your staff",
          "Round Robin calendars distribute bookings fairly between assigned users",
          "Internal calendars are not public-facing — great for internal meetings",
          "Each calendar gets its own booking link for clients to self-schedule",
        ]}
      />

      {calendars.length === 0 && !loading && (
        <SetupBanner icon={Calendar} title="Create Your First Calendar"
          description="Calendars power your booking system. Create a calendar, set up availability, define appointment types, and share a booking link with your clients."
          actionLabel="Create Calendar" onAction={() => setCreateOpen(true)} />
      )}

      <WidgetGrid columns="repeat(auto-fit, minmax(150px, 1fr))">
        <MetricCard label="Total Calendars" value={String(calendars.length)} icon={CalendarDays} />
        <MetricCard label="Active" value={String(activeCount)} icon={Calendar} />
        <MetricCard label="Team Members" value={String(calUsers.length)} icon={Users} />
        <MetricCard label="Bookings" value={String(totalAppts)} icon={Clock} />
      </WidgetGrid>

      {/* Filters */}
      {calendars.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search calendars..." className="pl-9 bg-background border-border" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] bg-background border-border"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CALENDAR_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] bg-background border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Calendar List */}
      {filtered.length > 0 && (
        <div className="mt-6 space-y-3">
          {filtered.map(cal => {
            const bookings = getBookingCount(cal.id);
            const users = getUserCount(cal.id);
            const typeInfo = CALENDAR_TYPES.find(t => t.value === cal.calendar_type);
            return (
              <DataCard key={cal.id} title="" className="!mb-0">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${cal.color || "#3B82F6"}22` }}>
                    <Calendar className="h-5 w-5" style={{ color: cal.color || "#3B82F6" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => navigate(`/calendar-management/${cal.id}`)}
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                        {cal.calendar_name}
                      </button>
                      <Badge variant="secondary" className="text-[10px]">{typeInfo?.label || cal.calendar_type}</Badge>
                      <Badge variant={cal.is_active ? "default" : "outline"} className="text-[10px]">
                        {cal.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {cal.timezone} · {users} user{users !== 1 ? "s" : ""} · {bookings} booking{bookings !== 1 ? "s" : ""}
                      {cal.description && ` · ${cal.description.slice(0, 60)}${cal.description.length > 60 ? "…" : ""}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1 text-xs"
                      onClick={() => navigate(`/calendar-management/${cal.id}`)}>
                      <Eye className="h-3 w-3" /> View
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/calendar-management/${cal.id}`)}>
                          <Settings2 className="h-3 w-3 mr-2" /> Manage Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/calendar-management/${cal.id}?tab=team`)}>
                          <Users className="h-3 w-3 mr-2" /> Manage Users
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/calendar-management/${cal.id}?tab=availability`)}>
                          <Clock className="h-3 w-3 mr-2" /> Manage Availability
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/calendar-management/${cal.id}?tab=types`)}>
                          <CalendarDays className="h-3 w-3 mr-2" /> Appointment Types
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/book/${cal.id}`);
                          toast.success("Booking link copied");
                        }}>
                          <Copy className="h-3 w-3 mr-2" /> Copy Booking Link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(cal.id, cal.is_active)}>
                          {cal.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteCalendar(cal.id, cal.calendar_name)}>
                          <Trash2 className="h-3 w-3 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </DataCard>
            );
          })}
        </div>
      )}

      {calendars.length > 0 && filtered.length === 0 && (
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground text-sm">No calendars match your filters.</p>
        </div>
      )}
    </div>
  );
}
