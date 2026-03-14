import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { MetricCard } from "@/components/MetricCard";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Calendar as CalendarIcon, Clock, Users, Plus, Check, X, RefreshCw,
  Video, MapPin, Link2, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";

const upcomingEvents = [
  { title: "Strategy Session", contact: "John Martinez", time: "Today, 2:00 PM", duration: "60 min", status: "Confirmed", type: "Consultation", location: "Zoom" },
  { title: "Growth Review", contact: "Emma Davis", time: "Today, 4:30 PM", duration: "30 min", status: "Scheduled", type: "Review", location: "Office" },
  { title: "Onboarding Call", contact: "David Lee", time: "Tomorrow, 10:00 AM", duration: "45 min", status: "Confirmed", type: "Onboarding", location: "Zoom" },
  { title: "Sales Discovery", contact: "Rachel Kim", time: "Tomorrow, 1:00 PM", duration: "30 min", status: "Scheduled", type: "Discovery", location: "Phone" },
  { title: "Follow-up Meeting", contact: "Tom Baker", time: "Mar 17, 11:00 AM", duration: "30 min", status: "Rescheduled", type: "Follow-up", location: "Zoom" },
  { title: "Quarterly Review", contact: "Sarah Chen", time: "Mar 18, 3:00 PM", duration: "60 min", status: "Confirmed", type: "Review", location: "Office" },
];

const eventTypes = [
  { name: "Strategy Session", duration: 60, buffer: 15, color: "hsl(211 96% 56%)", bookings: 24, active: true },
  { name: "Discovery Call", duration: 30, buffer: 10, color: "hsl(197 92% 68%)", bookings: 42, active: true },
  { name: "Onboarding Call", duration: 45, buffer: 15, color: "hsl(187 70% 58%)", bookings: 18, active: true },
  { name: "Quick Check-in", duration: 15, buffer: 5, color: "hsl(222 68% 44%)", bookings: 56, active: true },
  { name: "Review Meeting", duration: 60, buffer: 15, color: "hsl(210 55% 86%)", bookings: 12, active: false },
];

const availabilityDays = [
  { day: "Monday", start: "9:00 AM", end: "5:00 PM", enabled: true },
  { day: "Tuesday", start: "9:00 AM", end: "5:00 PM", enabled: true },
  { day: "Wednesday", start: "9:00 AM", end: "5:00 PM", enabled: true },
  { day: "Thursday", start: "9:00 AM", end: "5:00 PM", enabled: true },
  { day: "Friday", start: "9:00 AM", end: "3:00 PM", enabled: true },
  { day: "Saturday", start: "10:00 AM", end: "1:00 PM", enabled: false },
  { day: "Sunday", start: "", end: "", enabled: false },
];

const statusStyle = (s: string) => {
  if (s === "Confirmed" || s === "Completed") return "bg-primary/10 text-primary border-primary/20";
  if (s === "Scheduled") return "bg-accent/10 text-accent border-accent/20";
  if (s === "Cancelled") return "bg-destructive/10 text-destructive border-destructive/20";
  if (s === "Rescheduled") return "bg-muted text-muted-foreground border-border";
  if (s === "No Show") return "bg-destructive/10 text-destructive border-destructive/20";
  return "bg-muted text-muted-foreground border-border";
};

const locationIcon = (loc: string) => {
  if (loc === "Zoom") return <Video className="h-3 w-3" />;
  if (loc === "Office") return <MapPin className="h-3 w-3" />;
  return <Link2 className="h-3 w-3" />;
};

export default function CalendarPage() {
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [newEventOpen, setNewEventOpen] = useState(false);

  return (
    <div>
      <PageHeader title="Calendar" description="Branded scheduling, bookings, and appointment management" />

      {/* Metrics */}
      <WidgetGrid columns="repeat(auto-fit, minmax(180px, 1fr))">
        <MetricCard title="Upcoming" value="12" change="" icon={CalendarIcon} />
        <MetricCard title="Booked This Week" value="8" change="+33%" icon={Clock} />
        <MetricCard title="Completed" value="142" change="+12%" icon={Check} />
        <MetricCard title="No Shows" value="3" change="-25%" icon={X} />
        <MetricCard title="Next Appointment" value="2:00 PM" change="Today" icon={Users} />
      </WidgetGrid>

      <Tabs defaultValue="upcoming" className="mt-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="types">Event Types</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Upcoming Tab */}
        <TabsContent value="upcoming" className="mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Upcoming Appointments</h3>
            <Dialog open={newEventOpen} onOpenChange={setNewEventOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> New Event
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Schedule New Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-foreground">Title</Label>
                    <Input placeholder="Event title" className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-foreground">Event Type</Label>
                    <Select>
                      <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {eventTypes.filter(e => e.active).map(e => (
                          <SelectItem key={e.name} value={e.name}>{e.name} ({e.duration} min)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-foreground">Date</Label>
                      <Input type="date" className="bg-background border-border" />
                    </div>
                    <div>
                      <Label className="text-foreground">Time</Label>
                      <Input type="time" className="bg-background border-border" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-foreground">Contact Name</Label>
                    <Input placeholder="Contact name" className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-foreground">Contact Email</Label>
                    <Input type="email" placeholder="email@example.com" className="bg-background border-border" />
                  </div>
                  <div>
                    <Label className="text-foreground">Location</Label>
                    <Select>
                      <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select location" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="office">Office</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full bg-primary text-primary-foreground" onClick={() => {
                    toast({ title: "Event created", description: "Confirmation will be sent automatically." });
                    setNewEventOpen(false);
                  }}>Create Event</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {upcomingEvents.map((ev, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card-widget p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{ev.title}</p>
                    <p className="text-xs text-muted-foreground">{ev.contact} · {ev.duration}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{ev.time}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                      {locationIcon(ev.location)}
                      <span>{ev.location}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusStyle(ev.status)}>{ev.status}</Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* Calendar View Tab */}
        <TabsContent value="calendar" className="mt-4">
          <DataCard title="Calendar View">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md"
              />
            </div>
            <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border">
              <p className="text-sm font-medium text-foreground">
                {date ? date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Select a date"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">2 appointments scheduled</p>
            </div>
          </DataCard>
        </TabsContent>

        {/* Event Types Tab */}
        <TabsContent value="types" className="mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Event Types</h3>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Type
            </Button>
          </div>
          <WidgetGrid columns="repeat(auto-fit, minmax(260px, 1fr))">
            {eventTypes.map((et, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="card-widget p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-3 w-3 rounded-full" style={{ background: et.color }} />
                  <p className="text-sm font-semibold text-foreground flex-1">{et.name}</p>
                  <Badge variant="outline" className={et.active ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}>
                    {et.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium text-foreground">{et.duration} min</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Buffer</p>
                    <p className="font-medium text-foreground">{et.buffer} min</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bookings</p>
                    <p className="font-medium text-foreground">{et.bookings}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1 text-xs border-primary/20 text-primary hover:bg-primary/5">Edit</Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs border-border">Copy Link</Button>
                </div>
              </motion.div>
            ))}
          </WidgetGrid>
        </TabsContent>

        {/* Availability Tab */}
        <TabsContent value="availability" className="mt-4">
          <DataCard title="Weekly Availability">
            <div className="space-y-3">
              {availabilityDays.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border bg-background/50">
                  <div className="flex items-center gap-3 w-24">
                    <Switch checked={d.enabled} />
                    <span className={`text-sm font-medium ${d.enabled ? "text-foreground" : "text-muted-foreground"}`}>{d.day}</span>
                  </div>
                  {d.enabled ? (
                    <div className="flex items-center gap-2">
                      <Input value={d.start} className="w-28 h-8 text-xs bg-background border-border" readOnly />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input value={d.end} className="w-28 h-8 text-xs bg-background border-border" readOnly />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unavailable</span>
                  )}
                </div>
              ))}
            </div>
            <Button className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90">Save Availability</Button>
          </DataCard>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <WidgetGrid columns="1fr 1fr">
            <DataCard title="Booking Settings">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Auto-confirm bookings</p>
                    <p className="text-xs text-muted-foreground">Automatically confirm new appointments</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Send confirmation SMS</p>
                    <p className="text-xs text-muted-foreground">SMS confirmation to contact</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Send confirmation email</p>
                    <p className="text-xs text-muted-foreground">Email confirmation to contact</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Allow cancellations</p>
                    <p className="text-xs text-muted-foreground">Let contacts cancel via link</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Allow rescheduling</p>
                    <p className="text-xs text-muted-foreground">Let contacts reschedule</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </DataCard>
            <DataCard title="Reminder Settings">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">24-hour reminder</p>
                    <p className="text-xs text-muted-foreground">SMS + Email</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">3-hour reminder</p>
                    <p className="text-xs text-muted-foreground">SMS only</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">30-minute reminder</p>
                    <p className="text-xs text-muted-foreground">SMS only</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Follow-up after completion</p>
                    <p className="text-xs text-muted-foreground">Auto-create follow-up task</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </DataCard>
          </WidgetGrid>
        </TabsContent>
      </Tabs>
    </div>
  );
}
