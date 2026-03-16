import { PageHeader } from "@/components/PageHeader";
import { ModuleHelpPanel } from "@/components/ModuleHelpPanel";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { MetricCard } from "@/components/MetricCard";
import { SetupBanner } from "@/components/SetupBanner";
import { BackArrow } from "@/components/BackArrow";
import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon, Clock, Users, Plus, Check, X, RefreshCw,
  Video, MapPin, Link2, ChevronLeft, ChevronRight, List, LayoutGrid, Columns, CalendarDays,
  Settings2, Trash2, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { onAppointmentBooked, onAppointmentCompleted, onAppointmentCancelled, onNoShow } from "@/lib/crmAutomations";

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

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am-8pm

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = getDaysInMonth(year, month);
  const prevDays = getDaysInMonth(year, month - 1);
  const grid: { day: number; inMonth: boolean; date: Date }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    grid.push({ day: prevDays - i, inMonth: false, date: new Date(year, month - 1, prevDays - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push({ day: d, inMonth: true, date: new Date(year, month, d) });
  }
  while (grid.length < 42) {
    const d = grid.length - firstDay - daysInMonth + 1;
    grid.push({ day: d, inMonth: false, date: new Date(year, month + 1, d) });
  }
  return grid;
}

function getWeekDays(date: Date) {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarPage() {
  const { activeClientId } = useWorkspace();
  const [events, setEvents] = useState<any[]>([]);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day" | "agenda">("month");
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<any>(null);
  const [newEvent, setNewEvent] = useState({
    title: "", contact_name: "", contact_email: "", contact_phone: "",
    start_date: "", start_time: "", duration: "30", location: "zoom",
    event_type_id: "", notes: "", contact_id: "",
  });

  const fetchData = async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const [evRes, etRes, cRes] = await Promise.all([
      supabase.from("calendar_events").select("*").eq("client_id", activeClientId).order("start_time", { ascending: true }),
      supabase.from("event_types").select("*").eq("client_id", activeClientId).order("created_at", { ascending: false }),
      supabase.from("crm_contacts").select("id, full_name, email, phone").eq("client_id", activeClientId).order("full_name").limit(200),
    ]);
    setEvents(evRes.data || []);
    setEventTypes(etRes.data || []);
    setContacts(cRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeClientId]);

  const createEvent = async () => {
    if (!activeClientId || !newEvent.title || !newEvent.start_date || !newEvent.start_time) return;
    const startTime = new Date(`${newEvent.start_date}T${newEvent.start_time}`);
    const endTime = new Date(startTime.getTime() + parseInt(newEvent.duration) * 60000);
    const { error } = await supabase.from("calendar_events").insert({
      client_id: activeClientId, title: newEvent.title,
      contact_name: newEvent.contact_name || null, contact_email: newEvent.contact_email || null,
      contact_phone: newEvent.contact_phone || null, start_time: startTime.toISOString(),
      end_time: endTime.toISOString(), location: newEvent.location,
      event_type_id: newEvent.event_type_id || null, calendar_status: "scheduled",
      notes: newEvent.notes || null, contact_id: newEvent.contact_id || null,
      booking_source: "manual",
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    // Fire automation hooks
    await onAppointmentBooked(activeClientId, {
      id: "", title: newEvent.title, contact_name: newEvent.contact_name,
      contact_email: newEvent.contact_email, contact_phone: newEvent.contact_phone,
      contact_id: newEvent.contact_id || null,
    });
    toast({ title: "Event Created" });
    setNewEvent({ title: "", contact_name: "", contact_email: "", contact_phone: "", start_date: "", start_time: "", duration: "30", location: "zoom", event_type_id: "", notes: "", contact_id: "" });
    setNewEventOpen(false);
    fetchData();
  };

  const updateEventStatus = async (eventId: string, status: string, reason?: string) => {
    const updateData: any = { calendar_status: status };
    if (status === "cancelled" && reason) updateData.cancellation_reason = reason;
    if (status === "rescheduled" && reason) updateData.reschedule_reason = reason;
    await supabase.from("calendar_events").update(updateData).eq("id", eventId);
    const event = events.find(e => e.id === eventId);
    if (event) {
      if (status === "completed") await onAppointmentCompleted(activeClientId!, event);
      else if (status === "cancelled") await onAppointmentCancelled(activeClientId!, event, reason);
      else if (status === "no_show") await onNoShow(activeClientId!, event);
    }
    toast({ title: `Status updated to ${STATUS_LABEL[status]}` });
    setDetailEvent(null);
    fetchData();
  };

  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.start_time) >= now && e.calendar_status !== "cancelled");
  const completedCount = events.filter(e => e.calendar_status === "completed").length;
  const noShowCount = events.filter(e => e.calendar_status === "no_show").length;
  const cancelledCount = events.filter(e => e.calendar_status === "cancelled").length;

  const monthGrid = useMemo(() => getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const eventsForDay = (date: Date) => events.filter(e => isSameDay(new Date(e.start_time), date));

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const locationIcon = (loc: string) => {
    if (loc === "zoom") return <Video className="h-3 w-3" />;
    if (loc === "office") return <MapPin className="h-3 w-3" />;
    return <Link2 className="h-3 w-3" />;
  };

  const selectContact = (id: string) => {
    const c = contacts.find(ct => ct.id === id);
    if (c) {
      setNewEvent(p => ({ ...p, contact_id: id, contact_name: c.full_name, contact_email: c.email || "", contact_phone: c.phone || "" }));
    }
  };

  if (!activeClientId) {
    return (
      <div>
        <PageHeader title="Calendar" description="Branded scheduling, bookings, and appointment management" />
        <div className="card-widget p-8 rounded-2xl text-center mt-6"><p className="text-muted-foreground">Select a workspace to view Calendar.</p></div>
      </div>
    );
  }

  const headerLabel = view === "month"
    ? currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : view === "week"
    ? `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div>
      <PageHeader title="Calendar" description="Branded scheduling, bookings, and appointment management">
        <Dialog open={newEventOpen} onOpenChange={setNewEventOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> New Event</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="text-foreground">Schedule New Event</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><Label>Title *</Label><Input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} placeholder="Event title" className="bg-background border-border" /></div>
              {eventTypes.length > 0 && (
                <div><Label>Event Type</Label>
                  <Select value={newEvent.event_type_id} onValueChange={v => setNewEvent(p => ({ ...p, event_type_id: v }))}>
                    <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{eventTypes.filter(e => e.active).map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.duration_minutes} min)</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {contacts.length > 0 && (
                <div><Label>Link CRM Contact</Label>
                  <Select value={newEvent.contact_id} onValueChange={selectContact}>
                    <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select contact" /></SelectTrigger>
                    <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name} {c.email ? `(${c.email})` : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {/* Duration selector */}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Duration (min)</Label>
                  <Select value={newEvent.duration} onValueChange={v => setNewEvent(p => ({ ...p, duration: v }))}>
                    <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                      <SelectItem value="90">90 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Location</Label>
                  <Select value={newEvent.location} onValueChange={v => setNewEvent(p => ({ ...p, location: v }))}>
                    <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zoom">Zoom</SelectItem><SelectItem value="office">Office</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem><SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Dynamic Time Slot Picker */}
              {activeClientId && (
                <TimeSlotPicker
                  clientId={activeClientId}
                  duration={parseInt(newEvent.duration) || 30}
                  selectedDate={newEvent.start_date}
                  selectedTime={newEvent.start_time}
                  onDateChange={d => setNewEvent(p => ({ ...p, start_date: d, start_time: "" }))}
                  onTimeChange={t => setNewEvent(p => ({ ...p, start_time: t }))}
                />
              )}
              <div><Label>Contact Name</Label><Input value={newEvent.contact_name} onChange={e => setNewEvent(p => ({ ...p, contact_name: e.target.value }))} className="bg-background border-border" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={newEvent.contact_email} onChange={e => setNewEvent(p => ({ ...p, contact_email: e.target.value }))} className="bg-background border-border" /></div>
                <div><Label>Phone</Label><Input value={newEvent.contact_phone} onChange={e => setNewEvent(p => ({ ...p, contact_phone: e.target.value }))} className="bg-background border-border" /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={newEvent.notes} onChange={e => setNewEvent(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." className="bg-background border-border min-h-[60px]" /></div>
              <Button className="w-full" onClick={createEvent}>Create Event</Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <ModuleHelpPanel
        moduleName="Calendar"
        description="This is where your appointments are scheduled and tracked. Bookings create CRM records, reminders go out automatically, and completed appointments can trigger review requests."
        tips={["Reminders are sent 24h, 3h, and 30min before appointments", "Completed appointments can trigger automatic review requests", "No-shows are flagged for follow-up"]}
      />

      {events.length === 0 && (
        <SetupBanner icon={CalendarIcon} title="Set Up Your Calendar"
          description="Create events, manage appointments, and automate booking workflows."
          actionLabel="Create First Event" onAction={() => setNewEventOpen(true)} />
      )}

      <WidgetGrid columns="repeat(auto-fit, minmax(160px, 1fr))">
        <MetricCard label="Upcoming" value={String(upcomingEvents.length)} change="Active" icon={CalendarIcon} />
        <MetricCard label="Completed" value={String(completedCount)} change="" icon={Check} />
        <MetricCard label="Cancelled" value={String(cancelledCount)} change="" icon={X} />
        <MetricCard label="No Shows" value={String(noShowCount)} change="" icon={Clock} />
        <MetricCard label="Event Types" value={String(eventTypes.length)} change="" icon={Users} />
      </WidgetGrid>

      {/* Calendar Controls */}
      <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}><ChevronRight className="h-4 w-4" /></Button>
          <h3 className="text-sm font-semibold text-foreground ml-2">{headerLabel}</h3>
        </div>
        <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
          {[
            { v: "month" as const, icon: LayoutGrid, label: "Month" },
            { v: "week" as const, icon: Columns, label: "Week" },
            { v: "day" as const, icon: CalendarDays, label: "Day" },
            { v: "agenda" as const, icon: List, label: "Agenda" },
          ].map(({ v, icon: Icon, label }) => (
            <Button key={v} variant={view === v ? "default" : "ghost"} size="sm" className="h-7 text-xs gap-1" onClick={() => setView(v)}>
              <Icon className="h-3 w-3" />{label}
            </Button>
          ))}
        </div>
      </div>

      {/* MONTH VIEW */}
      {view === "month" && (
        <div className="mt-4 card-widget rounded-2xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="px-2 py-2 text-[10px] font-semibold text-muted-foreground text-center uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthGrid.map((cell, i) => {
              const dayEvents = eventsForDay(cell.date);
              const isToday = isSameDay(cell.date, new Date());
              return (
                <div key={i} onClick={() => { setCurrentDate(cell.date); setView("day"); }}
                  className={`min-h-[80px] p-1 border-b border-r border-border cursor-pointer hover:bg-secondary/50 transition-colors ${!cell.inMonth ? "bg-muted/30" : ""}`}>
                  <span className={`text-[11px] font-medium inline-flex h-6 w-6 items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : cell.inMonth ? "text-foreground" : "text-muted-foreground"}`}>{cell.day}</span>
                  {dayEvents.slice(0, 3).map(ev => (
                    <div key={ev.id} onClick={e => { e.stopPropagation(); setDetailEvent(ev); }}
                      className="text-[9px] leading-tight truncate px-1 py-0.5 rounded bg-primary/10 text-primary mt-0.5 cursor-pointer hover:bg-primary/20">
                      {new Date(ev.start_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <span className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 3} more</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {view === "week" && (
        <div className="mt-4 card-widget rounded-2xl overflow-hidden overflow-x-auto">
          <div className="grid grid-cols-8 min-w-[700px]">
            <div className="border-b border-r border-border p-2" />
            {weekDays.map((d, i) => (
              <div key={i} className={`border-b border-r border-border p-2 text-center ${isSameDay(d, new Date()) ? "bg-primary/5" : ""}`}>
                <p className="text-[10px] text-muted-foreground uppercase">{d.toLocaleDateString("en-US", { weekday: "short" })}</p>
                <p className={`text-sm font-semibold ${isSameDay(d, new Date()) ? "text-primary" : "text-foreground"}`}>{d.getDate()}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-8 min-w-[700px]">
            {HOURS.map(hour => (
              <div key={hour} className="contents">
                <div className="border-b border-r border-border px-2 py-3 text-[10px] text-muted-foreground text-right pr-3">
                  {hour > 12 ? hour - 12 : hour}{hour >= 12 ? "pm" : "am"}
                </div>
                {weekDays.map((d, di) => {
                  const dayEv = eventsForDay(d).filter(e => new Date(e.start_time).getHours() === hour);
                  return (
                    <div key={di} className="border-b border-r border-border p-0.5 min-h-[48px] relative">
                      {dayEv.map(ev => (
                        <div key={ev.id} onClick={() => setDetailEvent(ev)}
                          className="text-[9px] leading-tight px-1 py-0.5 rounded bg-primary/10 text-primary mb-0.5 cursor-pointer hover:bg-primary/20 truncate">
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DAY VIEW */}
      {view === "day" && (
        <div className="mt-4 card-widget rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">{currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
            <p className="text-xs text-muted-foreground">{eventsForDay(currentDate).length} appointments</p>
          </div>
          {HOURS.map(hour => {
            const dayEv = eventsForDay(currentDate).filter(e => new Date(e.start_time).getHours() === hour);
            return (
              <div key={hour} className="flex border-b border-border min-h-[56px]">
                <div className="w-16 shrink-0 px-3 py-3 text-[11px] text-muted-foreground text-right border-r border-border">
                  {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? "PM" : "AM"}
                </div>
                <div className="flex-1 p-1 space-y-1">
                  {dayEv.map(ev => (
                    <div key={ev.id} onClick={() => setDetailEvent(ev)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors">
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{ev.title}</p>
                        <p className="text-[10px] text-muted-foreground">{ev.contact_name || "No contact"} · {Math.round((new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime()) / 60000)} min</p>
                      </div>
                      {locationIcon(ev.location || "other")}
                      <Badge variant="outline" className={`text-[9px] ${STATUS_STYLE[ev.calendar_status] || ""}`}>{STATUS_LABEL[ev.calendar_status] || ev.calendar_status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AGENDA VIEW */}
      {view === "agenda" && (
        <div className="mt-4 space-y-3">
          {upcomingEvents.length === 0 ? (
            <DataCard title="Upcoming Appointments">
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No upcoming appointments</p>
                <Button size="sm" className="mt-3" onClick={() => setNewEventOpen(true)}><Plus className="h-4 w-4 mr-1" /> New Event</Button>
              </div>
            </DataCard>
          ) : (
            upcomingEvents.slice(0, 30).map((ev, i) => (
              <motion.div key={ev.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                onClick={() => setDetailEvent(ev)}
                className="card-widget p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors">
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
                  <Badge variant="outline" className={STATUS_STYLE[ev.calendar_status] || ""}>{STATUS_LABEL[ev.calendar_status] || ev.calendar_status}</Badge>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* EVENT DETAIL DIALOG */}
      <Dialog open={!!detailEvent} onOpenChange={open => !open && setDetailEvent(null)}>
        <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
          {detailEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />{detailEvent.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[10px] text-muted-foreground uppercase">Date & Time</p>
                    <p className="text-sm text-foreground">{new Date(detailEvent.start_time).toLocaleString()}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Duration</p>
                    <p className="text-sm text-foreground">{Math.round((new Date(detailEvent.end_time).getTime() - new Date(detailEvent.start_time).getTime()) / 60000)} min</p></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[10px] text-muted-foreground uppercase">Status</p>
                    <Badge variant="outline" className={STATUS_STYLE[detailEvent.calendar_status] || ""}>{STATUS_LABEL[detailEvent.calendar_status] || detailEvent.calendar_status}</Badge></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase">Location</p>
                    <div className="flex items-center gap-1 text-sm text-foreground">{locationIcon(detailEvent.location || "other")}{detailEvent.location || "—"}</div></div>
                </div>
                {detailEvent.contact_name && (
                  <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1">Contact</p>
                    <p className="text-sm font-medium text-foreground">{detailEvent.contact_name}</p>
                    {detailEvent.contact_email && <p className="text-xs text-muted-foreground">{detailEvent.contact_email}</p>}
                    {detailEvent.contact_phone && <p className="text-xs text-muted-foreground">{detailEvent.contact_phone}</p>}
                  </div>
                )}
                {detailEvent.notes && (
                  <div><p className="text-[10px] text-muted-foreground uppercase">Notes</p><p className="text-sm text-foreground">{detailEvent.notes}</p></div>
                )}
                {detailEvent.cancellation_reason && (
                  <div><p className="text-[10px] text-muted-foreground uppercase">Cancellation Reason</p><p className="text-sm text-destructive">{detailEvent.cancellation_reason}</p></div>
                )}
                <div className="border-t border-border pt-3">
                  <p className="text-[10px] text-muted-foreground uppercase mb-2">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {["confirmed", "completed", "cancelled", "no_show", "rescheduled"].filter(s => s !== detailEvent.calendar_status).map(s => (
                      <Button key={s} size="sm" variant="outline" className="text-xs" onClick={() => updateEventStatus(detailEvent.id, s)}>
                        {STATUS_LABEL[s]}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
