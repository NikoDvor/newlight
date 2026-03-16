import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { MetricCard } from "@/components/MetricCard";
import { SetupBanner } from "@/components/SetupBanner";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon, Clock, Users, Plus, Check, X, RefreshCw,
  Video, MapPin, Link2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-accent/10 text-accent border-accent/20",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  no_show: "bg-destructive/10 text-destructive border-destructive/20",
  rescheduled: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled", confirmed: "Confirmed", completed: "Completed",
  cancelled: "Cancelled", no_show: "No Show", rescheduled: "Rescheduled",
};

export default function CalendarPage() {
  const { activeClientId } = useWorkspace();
  const [events, setEvents] = useState<any[]>([]);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "", contact_name: "", contact_email: "", contact_phone: "",
    start_date: "", start_time: "", duration: "30", location: "zoom",
    event_type_id: "",
  });

  const fetchData = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [evRes, etRes] = await Promise.all([
      supabase.from("calendar_events").select("*").eq("client_id", activeClientId)
        .order("start_time", { ascending: true }),
      supabase.from("event_types").select("*").eq("client_id", activeClientId)
        .order("created_at", { ascending: false }),
    ]);
    setEvents(evRes.data || []);
    setEventTypes(etRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeClientId]);

  const createEvent = async () => {
    if (!activeClientId || !newEvent.title || !newEvent.start_date || !newEvent.start_time) return;
    const startTime = new Date(`${newEvent.start_date}T${newEvent.start_time}`);
    const endTime = new Date(startTime.getTime() + parseInt(newEvent.duration) * 60000);

    const { error } = await supabase.from("calendar_events").insert({
      client_id: activeClientId,
      title: newEvent.title,
      contact_name: newEvent.contact_name || null,
      contact_email: newEvent.contact_email || null,
      contact_phone: newEvent.contact_phone || null,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      location: newEvent.location,
      event_type_id: newEvent.event_type_id || null,
      calendar_status: "scheduled",
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("crm_activities").insert({
      client_id: activeClientId, activity_type: "appointment_booked",
      activity_note: `Appointment "${newEvent.title}" booked for ${newEvent.contact_name || "Unknown"}`,
    });
    toast({ title: "Event Created" });
    setNewEvent({ title: "", contact_name: "", contact_email: "", contact_phone: "", start_date: "", start_time: "", duration: "30", location: "zoom", event_type_id: "" });
    setNewEventOpen(false);
    fetchData();
  };

  const updateEventStatus = async (eventId: string, status: string) => {
    await supabase.from("calendar_events").update({ calendar_status: status }).eq("id", eventId);
    // If completed, trigger review request automation
    if (status === "completed") {
      const event = events.find(e => e.id === eventId);
      if (event?.contact_name) {
        await supabase.from("review_requests").insert({
          client_id: activeClientId!,
          customer_name: event.contact_name,
          customer_email: event.contact_email || null,
          customer_phone: event.contact_phone || null,
          channel: event.contact_phone ? "sms" : "email",
          platform: "google",
          status: "sent",
        });
        await supabase.from("crm_activities").insert({
          client_id: activeClientId!, activity_type: "review_request_auto",
          activity_note: `Auto review request sent to ${event.contact_name} after completed appointment`,
        });
      }
    }
    await supabase.from("crm_activities").insert({
      client_id: activeClientId!, activity_type: "appointment_status_changed",
      activity_note: `Appointment status changed to ${STATUS_LABEL[status] || status}`,
    });
    toast({ title: `Status updated to ${STATUS_LABEL[status]}` });
    fetchData();
  };

  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.start_time) >= now && e.calendar_status !== "cancelled");
  const completedCount = events.filter(e => e.calendar_status === "completed").length;
  const noShowCount = events.filter(e => e.calendar_status === "no_show").length;
  const cancelledCount = events.filter(e => e.calendar_status === "cancelled").length;
  const hasData = events.length > 0;

  const selectedDateEvents = date ? events.filter(e => {
    const eventDate = new Date(e.start_time);
    return eventDate.toDateString() === date.toDateString();
  }) : [];

  const locationIcon = (loc: string) => {
    if (loc === "zoom") return <Video className="h-3 w-3" />;
    if (loc === "office") return <MapPin className="h-3 w-3" />;
    return <Link2 className="h-3 w-3" />;
  };

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Calendar" description="Branded scheduling, bookings, and appointment management" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6">
          <p className="text-muted-foreground">Select a workspace to view Calendar.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Calendar" description="Branded scheduling, bookings, and appointment management">
        <Dialog open={newEventOpen} onOpenChange={setNewEventOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> New Event</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="text-foreground">Schedule New Event</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>Title *</Label><Input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} placeholder="Event title" className="bg-background border-border" /></div>
              {eventTypes.length > 0 && (
                <div><Label>Event Type</Label>
                  <Select value={newEvent.event_type_id} onValueChange={v => setNewEvent(p => ({ ...p, event_type_id: v }))}>
                    <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{eventTypes.filter(e => e.active).map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.duration_minutes} min)</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date *</Label><Input type="date" value={newEvent.start_date} onChange={e => setNewEvent(p => ({ ...p, start_date: e.target.value }))} className="bg-background border-border" /></div>
                <div><Label>Time *</Label><Input type="time" value={newEvent.start_time} onChange={e => setNewEvent(p => ({ ...p, start_time: e.target.value }))} className="bg-background border-border" /></div>
              </div>
              <div><Label>Duration (minutes)</Label><Input type="number" value={newEvent.duration} onChange={e => setNewEvent(p => ({ ...p, duration: e.target.value }))} className="bg-background border-border" /></div>
              <div><Label>Contact Name</Label><Input value={newEvent.contact_name} onChange={e => setNewEvent(p => ({ ...p, contact_name: e.target.value }))} className="bg-background border-border" /></div>
              <div><Label>Contact Email</Label><Input type="email" value={newEvent.contact_email} onChange={e => setNewEvent(p => ({ ...p, contact_email: e.target.value }))} className="bg-background border-border" /></div>
              <div><Label>Contact Phone</Label><Input value={newEvent.contact_phone} onChange={e => setNewEvent(p => ({ ...p, contact_phone: e.target.value }))} className="bg-background border-border" /></div>
              <div><Label>Location</Label>
                <Select value={newEvent.location} onValueChange={v => setNewEvent(p => ({ ...p, location: v }))}>
                  <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zoom">Zoom</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={createEvent}>Create Event</Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {!hasData && (
        <SetupBanner icon={CalendarIcon} title="Set Up Your Calendar"
          description="Create events, manage appointments, and automate booking workflows. Completed appointments automatically trigger review requests."
          actionLabel="Create First Event" onAction={() => setNewEventOpen(true)} />
      )}

      <WidgetGrid columns="repeat(auto-fit, minmax(180px, 1fr))">
        <MetricCard label="Upcoming" value={hasData ? String(upcomingEvents.length) : "—"} change={hasData ? "Active bookings" : "Book first"} icon={CalendarIcon} />
        <MetricCard label="Completed" value={hasData ? String(completedCount) : "—"} change={hasData ? "Total completed" : "—"} icon={Check} />
        <MetricCard label="Cancelled" value={hasData ? String(cancelledCount) : "—"} change="" icon={X} />
        <MetricCard label="No Shows" value={hasData ? String(noShowCount) : "—"} change="" icon={Clock} />
        <MetricCard label="Event Types" value={String(eventTypes.length)} change="" icon={Users} />
      </WidgetGrid>

      <Tabs defaultValue="upcoming" className="mt-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="all">All Events</TabsTrigger>
          <TabsTrigger value="types">Event Types</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcomingEvents.length === 0 ? (
            <DataCard title="Upcoming Appointments">
              <div className="py-8 text-center">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.08)" }}>
                  <CalendarIcon className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">No upcoming appointments</p>
                <p className="text-xs text-muted-foreground mb-4">Schedule your first event to get started.</p>
                <Button size="sm" onClick={() => setNewEventOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Event</Button>
              </div>
            </DataCard>
          ) : (
            upcomingEvents.slice(0, 20).map((ev, i) => (
              <motion.div key={ev.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="card-widget p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{ev.contact_name || "No contact"} · {Math.round((new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime()) / 60000)} min</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{new Date(ev.start_time).toLocaleDateString()}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                      {locationIcon(ev.location || "other")}
                      <span>{new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={STATUS_STYLE[ev.calendar_status] || "bg-muted text-muted-foreground border-border"}>
                    {STATUS_LABEL[ev.calendar_status] || ev.calendar_status}
                  </Badge>
                  <Select onValueChange={(v) => updateEventStatus(ev.id, v)}>
                    <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Update" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirm</SelectItem>
                      <SelectItem value="completed">Complete</SelectItem>
                      <SelectItem value="cancelled">Cancel</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                      <SelectItem value="rescheduled">Reschedule</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            ))
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <DataCard title="Calendar View">
            <div className="flex justify-center">
              <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md" />
            </div>
            <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border">
              <p className="text-sm font-medium text-foreground">
                {date ? date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Select a date"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{selectedDateEvents.length} appointment{selectedDateEvents.length !== 1 ? "s" : ""} scheduled</p>
              {selectedDateEvents.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedDateEvents.map(ev => (
                    <div key={ev.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-background border border-border">
                      <span className="font-medium text-foreground">{ev.title}</span>
                      <span className="text-muted-foreground">{new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DataCard>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <DataCard title="All Events">
            {events.length === 0 ? (
              <div className="py-8 text-center"><p className="text-sm text-muted-foreground">No events yet.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Title</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Contact</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Date</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3 pr-4">Status</th>
                      <th className="text-left text-xs font-medium text-muted-foreground py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(ev => (
                      <tr key={ev.id} className="border-b border-border last:border-0 hover:bg-secondary transition-colors">
                        <td className="text-sm font-medium py-3 pr-4">{ev.title}</td>
                        <td className="text-sm text-muted-foreground py-3 pr-4">{ev.contact_name || "—"}</td>
                        <td className="text-xs text-muted-foreground py-3 pr-4">{new Date(ev.start_time).toLocaleString()}</td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className={STATUS_STYLE[ev.calendar_status] || ""}>
                            {STATUS_LABEL[ev.calendar_status] || ev.calendar_status}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Select onValueChange={(v) => updateEventStatus(ev.id, v)}>
                            <SelectTrigger className="w-[100px] h-7 text-[10px]"><SelectValue placeholder="Update" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="confirmed">Confirm</SelectItem>
                              <SelectItem value="completed">Complete</SelectItem>
                              <SelectItem value="cancelled">Cancel</SelectItem>
                              <SelectItem value="no_show">No Show</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataCard>
        </TabsContent>

        <TabsContent value="types" className="mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Event Types</h3>
          </div>
          {eventTypes.length === 0 ? (
            <DataCard title="Event Types">
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No event types configured. Event types are set up during onboarding.</p>
              </div>
            </DataCard>
          ) : (
            <WidgetGrid columns="repeat(auto-fit, minmax(260px, 1fr))">
              {eventTypes.map((et, i) => (
                <motion.div key={et.id} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="card-widget p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-3 w-3 rounded-full" style={{ background: et.color || "hsl(211 96% 56%)" }} />
                    <p className="text-sm font-semibold text-foreground flex-1">{et.name}</p>
                    <Badge variant="outline" className={et.active ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}>
                      {et.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><p className="text-muted-foreground">Duration</p><p className="font-medium text-foreground">{et.duration_minutes} min</p></div>
                    <div><p className="text-muted-foreground">Buffer Before</p><p className="font-medium text-foreground">{et.buffer_before || 0} min</p></div>
                    <div><p className="text-muted-foreground">Buffer After</p><p className="font-medium text-foreground">{et.buffer_after || 0} min</p></div>
                  </div>
                </motion.div>
              ))}
            </WidgetGrid>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
