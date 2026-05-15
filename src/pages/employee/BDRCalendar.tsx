import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight, Plus, Link2, Copy, Check, X, Trash2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ensureBdrCalendar, BdrCalendar } from "@/lib/bdrCalendar";

interface Event {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  source: string;
  outcome: string | null;
  stage: string | null;
  lead_id: string | null;
  notes: string | null;
}

const SOURCE_TONE: Record<string, string> = {
  dialer: "hsl(211,96%,62%)",       // blue – call logs
  manual: "hsl(268,82%,68%)",       // purple – manual blocks
  booking_form: "hsl(146,68%,48%)", // green – booked appts
  sdr_mirror: "hsl(38,92%,58%)",    // amber – mirrored
};
const SOURCE_LABEL: Record<string, string> = {
  dialer: "Dialer",
  manual: "Manual",
  booking_form: "Booking",
  sdr_mirror: "SDR",
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function startOfWeek(d: Date) { const x = new Date(d); x.setDate(d.getDate() - d.getDay()); x.setHours(0,0,0,0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(d.getDate() + n); return x; }
function sameDay(a: Date, b: Date) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function fmtTime(d: Date) { return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BDRCalendar() {
  const [calendar, setCalendar] = useState<BdrCalendar | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [addPrefill, setAddPrefill] = useState<Date | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<Event | null>(null);

  useEffect(() => { (async () => {
    const cal = await ensureBdrCalendar();
    setCalendar(cal);
    if (cal) {
      const { data } = await (supabase as any)
        .from("bdr_calendar_events")
        .select("id, title, description, starts_at, ends_at, source, outcome, stage, lead_id, notes")
        .eq("user_id", cal.user_id)
        .order("starts_at", { ascending: true });
      setEvents(data || []);
    }
    setLoading(false);
  })(); }, []);

  const refresh = useCallback(async () => {
    if (!calendar) return;
    const { data } = await (supabase as any)
      .from("bdr_calendar_events")
      .select("id, title, description, starts_at, ends_at, source, outcome, stage, lead_id, notes")
      .eq("user_id", calendar.user_id)
      .order("starts_at", { ascending: true });
    setEvents(data || []);
  }, [calendar]);

  const visibleEvents = useMemo(() => {
    const start = view === "month" ? startOfMonth(cursor) : startOfWeek(cursor);
    const end = view === "month" ? endOfMonth(cursor) : addDays(startOfWeek(cursor), 6);
    end.setHours(23,59,59,999);
    return events.filter(e => {
      const d = new Date(e.starts_at);
      return d >= start && d <= end;
    });
  }, [events, view, cursor]);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, Event[]>();
    visibleEvents.forEach(e => {
      const d = new Date(e.starts_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(e);
    });
    return m;
  }, [visibleEvents]);

  const bookingUrl = calendar?.booking_slug ? `${window.location.origin}/bdr/book/${calendar.booking_slug}` : "";

  const onCellClick = (date: Date) => {
    const d = new Date(date);
    if (d.getHours() === 0) d.setHours(9, 0, 0, 0);
    setAddPrefill(d);
    setShowAdd(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>;
  }
  if (!calendar) {
    return <div className="p-8 text-white/60 text-sm">Could not load your calendar.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{calendar.name}</h1>
          <p className="text-xs text-white/50 mt-1">Your personal pipeline calendar</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowShare(true)} className="border-white/15 text-white/80">
            <Link2 className="h-4 w-4 mr-1" /> Booking Link
          </Button>
          <Button size="sm" onClick={() => { setAddPrefill(null); setShowAdd(true); }}
            className="bg-[hsl(211,96%,56%)] hover:bg-[hsl(211,96%,48%)]">
            <Plus className="h-4 w-4 mr-1" /> Add Event
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}
            aria-label="Calendar settings"
            className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/5">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-2 rounded-lg" style={{ background: "hsla(215,35%,10%,.6)", border: "1px solid hsla(211,96%,60%,.12)" }}>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70" onClick={() => {
            const d = new Date(cursor);
            if (view === "month") d.setMonth(d.getMonth() - 1); else d.setDate(d.getDate() - 7);
            setCursor(d);
          }}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" className="text-white/70 text-xs" onClick={() => setCursor(new Date())}>Today</Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70" onClick={() => {
            const d = new Date(cursor);
            if (view === "month") d.setMonth(d.getMonth() + 1); else d.setDate(d.getDate() + 7);
            setCursor(d);
          }}><ChevronRight className="h-4 w-4" /></Button>
          <span className="text-white text-sm font-semibold ml-2">
            {view === "month"
              ? cursor.toLocaleDateString([], { month: "long", year: "numeric" })
              : `${startOfWeek(cursor).toLocaleDateString([], { month: "short", day: "numeric" })} – ${addDays(startOfWeek(cursor),6).toLocaleDateString([], { month: "short", day: "numeric" })}`}
          </span>
        </div>
        <div className="flex rounded-md overflow-hidden border border-white/10">
          {(["month","week"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-3 py-1.5 text-xs font-medium capitalize"
              style={{
                background: view === v ? "hsla(211,96%,56%,.15)" : "transparent",
                color: view === v ? "hsl(211,96%,72%)" : "hsl(0,0%,70%)",
              }}>{v}</button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <MonthView cursor={cursor} eventsByDay={eventsByDay} onCellClick={onCellClick} onEventClick={setSelected} />
      ) : (
        <WeekView cursor={cursor} eventsByDay={eventsByDay} onCellClick={onCellClick} onEventClick={setSelected} />
      )}

      <QuickAddDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        prefill={addPrefill}
        calendar={calendar}
        onCreated={() => { setShowAdd(false); refresh(); }}
      />

      <ShareDialog open={showShare} onOpenChange={setShowShare} url={bookingUrl} copied={copied}
        onCopy={() => { navigator.clipboard.writeText(bookingUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }} />

      <EventDetailDialog event={selected} onClose={() => setSelected(null)} onDeleted={() => { setSelected(null); refresh(); }} />

      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        calendar={calendar}
        bookingUrl={bookingUrl}
        onSaved={(updated) => setCalendar(updated)}
      />
    </div>
  );
}

function MonthView({ cursor, eventsByDay, onCellClick, onEventClick }: {
  cursor: Date; eventsByDay: Map<string, Event[]>; onCellClick: (d: Date) => void; onEventClick: (e: Event) => void;
}) {
  const first = startOfMonth(cursor);
  const last = endOfMonth(cursor);
  const gridStart = startOfWeek(first);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    days.push(d);
    if (i >= 34 && d > last && d.getDay() === 6) break;
  }
  const today = new Date();
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsla(211,96%,60%,.12)" }}>
      <div className="grid grid-cols-7 text-[10px] uppercase tracking-wider text-white/55" style={{ background: "hsl(215,35%,12%)" }}>
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="px-2 py-2 text-center font-semibold">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7" style={{ background: "hsla(215,35%,8%,.8)" }}>
        {days.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const dayEvents = eventsByDay.get(key) || [];
          const isToday = sameDay(d, today);
          return (
            <button key={i} onClick={() => onCellClick(d)}
              className="text-left border-b border-r border-white/5 p-1.5 min-h-[80px] hover:bg-white/[0.03] transition-colors"
              style={{ opacity: inMonth ? 1 : 0.35 }}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${isToday ? "text-[hsl(211,96%,72%)] font-bold" : "text-white/70"}`}>{d.getDate()}</span>
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(e => (
                  <div key={e.id} onClick={(ev) => { ev.stopPropagation(); onEventClick(e); }}
                    className="text-[10px] truncate px-1 py-0.5 rounded cursor-pointer"
                    style={{ background: `${SOURCE_TONE[e.source] || "#888"}22`, color: SOURCE_TONE[e.source] || "#fff", borderLeft: `2px solid ${SOURCE_TONE[e.source] || "#888"}` }}>
                    {fmtTime(new Date(e.starts_at))} {e.title}
                  </div>
                ))}
                {dayEvents.length > 3 && <div className="text-[9px] text-white/40 px-1">+{dayEvents.length - 3} more</div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ cursor, eventsByDay, onCellClick, onEventClick }: {
  cursor: Date; eventsByDay: Map<string, Event[]>; onCellClick: (d: Date) => void; onEventClick: (e: Event) => void;
}) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7am..6pm
  const today = new Date();
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsla(211,96%,60%,.12)" }}>
      <div className="grid grid-cols-[60px_repeat(7,1fr)] text-[10px] uppercase tracking-wider text-white/55" style={{ background: "hsl(215,35%,12%)" }}>
        <div />
        {days.map((d, i) => (
          <div key={i} className="px-2 py-2 text-center font-semibold">
            <div>{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]}</div>
            <div className={`text-sm mt-0.5 ${sameDay(d, today) ? "text-[hsl(211,96%,72%)]" : "text-white/80"}`}>{d.getDate()}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[60px_repeat(7,1fr)]" style={{ background: "hsla(215,35%,8%,.8)" }}>
        {hours.map(h => (
          <div key={`row-${h}`} className="contents">
            <div className="px-2 py-1 text-[10px] text-white/40 border-r border-b border-white/5">
              {h % 12 === 0 ? 12 : h % 12}{h < 12 ? "am" : "pm"}
            </div>
            {days.map((d, i) => {
              const slot = new Date(d); slot.setHours(h, 0, 0, 0);
              const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
              const dayEvents = eventsByDay.get(key) || [];
              const slotEvents = dayEvents.filter(e => new Date(e.starts_at).getHours() === h);
              return (
                <button key={`${i}-${h}`} onClick={() => onCellClick(slot)}
                  className="border-b border-r border-white/5 p-1 min-h-[44px] text-left hover:bg-white/[0.03] transition-colors">
                  {slotEvents.map(e => (
                    <div key={e.id} onClick={(ev) => { ev.stopPropagation(); onEventClick(e); }}
                      className="text-[10px] truncate px-1 py-0.5 rounded cursor-pointer mb-0.5"
                      style={{ background: `${SOURCE_TONE[e.source] || "#888"}22`, color: SOURCE_TONE[e.source] || "#fff", borderLeft: `2px solid ${SOURCE_TONE[e.source] || "#888"}` }}>
                      {e.title}
                    </div>
                  ))}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickAddDialog({ open, onOpenChange, prefill, calendar, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; prefill: Date | null; calendar: BdrCalendar; onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const base = prefill || (() => { const d = new Date(); d.setMinutes(0,0,0); d.setHours(d.getHours()+1); return d; })();
      setStart(toLocalInput(base));
      setTitle(""); setNotes(""); setDuration(30);
    }
  }, [open, prefill]);

  const save = async () => {
    if (!title.trim() || !start) return;
    setSaving(true);
    const startDate = new Date(start);
    const endDate = new Date(startDate.getTime() + duration * 60_000);
    const { error } = await (supabase as any).from("bdr_calendar_events").insert({
      user_id: calendar.user_id,
      calendar_id: calendar.id,
      title: title.trim(),
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      notes: notes || null,
      description: notes || null,
      source: "manual",
    });
    setSaving(false);
    if (error) { toast({ title: "Couldn't save event", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Event added" });
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[hsl(215,35%,10%)] border-white/10 text-white">
        <DialogHeader><DialogTitle>Add Event</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-white/60">Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Follow-up call, block, reminder…" className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60">Start</Label>
              <Input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60">Duration (min)</Label>
              <Input type="number" min={5} step={5} value={duration} onChange={e => setDuration(Number(e.target.value) || 30)} className="bg-white/5 border-white/10 text-white" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/60">Notes</Label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/70">Cancel</Button>
          <Button onClick={save} disabled={saving || !title.trim() || !start} className="bg-[hsl(211,96%,56%)] hover:bg-[hsl(211,96%,48%)]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShareDialog({ open, onOpenChange, url, copied, onCopy }: {
  open: boolean; onOpenChange: (v: boolean) => void; url: string; copied: boolean; onCopy: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[hsl(215,35%,10%)] border-white/10 text-white">
        <DialogHeader><DialogTitle>Your booking link</DialogTitle></DialogHeader>
        <p className="text-xs text-white/60">Share this link with prospects. Bookings show up on your calendar and are added to My Leads as Hot Leads.</p>
        <div className="flex items-center gap-2 mt-3">
          <Input readOnly value={url} className="bg-white/5 border-white/10 text-white font-mono text-xs" />
          <Button onClick={onCopy} className="bg-[hsl(211,96%,56%)] hover:bg-[hsl(211,96%,48%)]">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EventDetailDialog({ event, onClose, onDeleted }: { event: Event | null; onClose: () => void; onDeleted: () => void; }) {
  const [deleting, setDeleting] = useState(false);
  if (!event) return null;
  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  const remove = async () => {
    setDeleting(true);
    const { error } = await (supabase as any).from("bdr_calendar_events").delete().eq("id", event.id);
    setDeleting(false);
    if (error) { toast({ title: "Couldn't delete", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Event deleted" });
    onDeleted();
  };
  return (
    <Dialog open={!!event} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[hsl(215,35%,10%)] border-white/10 text-white">
        <DialogHeader><DialogTitle>{event.title}</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="text-white/70">{start.toLocaleString()} – {fmtTime(end)}</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded" style={{ background: `${SOURCE_TONE[event.source] || "#888"}22`, color: SOURCE_TONE[event.source] || "#fff" }}>{event.source}</span>
            {event.outcome && <span className="text-white/60">Outcome: {event.outcome}</span>}
            {event.stage && <span className="text-white/60">Stage: {event.stage}</span>}
          </div>
          {event.description && <p className="text-white/70 whitespace-pre-wrap">{event.description}</p>}
          {event.notes && event.notes !== event.description && <p className="text-white/60 text-xs whitespace-pre-wrap">{event.notes}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-white/70"><X className="h-4 w-4 mr-1" />Close</Button>
          <Button variant="destructive" onClick={remove} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-1" />Delete</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const TIMEZONES = [
  "America/Los_Angeles","America/Denver","America/Chicago","America/New_York",
  "America/Phoenix","America/Anchorage","Pacific/Honolulu",
  "America/Toronto","America/Vancouver","America/Mexico_City",
  "Europe/London","Europe/Dublin","Europe/Paris","Europe/Berlin","Europe/Madrid","Europe/Rome",
  "Africa/Johannesburg","Asia/Dubai","Asia/Kolkata","Asia/Singapore","Asia/Hong_Kong",
  "Asia/Tokyo","Australia/Sydney","Pacific/Auckland",
];

function SettingsDialog({ open, onOpenChange, calendar, bookingUrl, onSaved }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  calendar: BdrCalendar;
  bookingUrl: string;
  onSaved: (cal: BdrCalendar) => void;
}) {
  const [name, setName] = useState(calendar.name);
  const [tz, setTz] = useState(calendar.timezone);
  const [bookingTitle, setBookingTitle] = useState(calendar.booking_title || "");
  const [bookingDesc, setBookingDesc] = useState(calendar.booking_description || "");
  const [bookingActive, setBookingActive] = useState(calendar.booking_active);
  const [availability, setAvailability] = useState(calendar.availability);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setName(calendar.name);
      setTz(calendar.timezone);
      setBookingTitle(calendar.booking_title || "");
      setBookingDesc(calendar.booking_description || "");
      setBookingActive(calendar.booking_active);
      setAvailability(calendar.availability);
    }
  }, [open, calendar]);

  const updateDay = (key: string, patch: Partial<{ enabled: boolean; start: string; end: string }>) => {
    setAvailability(prev => ({
      ...prev,
      [key]: { enabled: true, start: "09:00", end: "17:00", ...prev[key], ...patch },
    }));
  };

  const copyLink = () => {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const patch = {
      name: name.trim(),
      timezone: tz,
      availability,
      booking_title: bookingTitle.trim() || null,
      booking_description: bookingDesc.trim() || null,
      booking_active: bookingActive,
    };
    const { data, error } = await (supabase as any)
      .from("bdr_calendars")
      .update(patch)
      .eq("id", calendar.id)
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Settings saved" });
    onSaved(data as BdrCalendar);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[hsl(215,35%,10%)] border-white/10 text-white max-w-lg max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Calendar Settings</DialogTitle></DialogHeader>

        <div className="space-y-5">
          {/* Name + Timezone */}
          <section className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60">Calendar name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60">Timezone</Label>
              <select value={tz} onChange={e => setTz(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white">
                {TIMEZONES.map(z => <option key={z} value={z} className="bg-[hsl(215,35%,12%)]">{z}</option>)}
              </select>
            </div>
          </section>

          {/* Availability */}
          <section className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-white/50 font-semibold">Availability hours</div>
            <div className="space-y-1.5">
              {DAYS.map(d => {
                const cfg = availability[d.key] || { enabled: false, start: "09:00", end: "17:00" };
                return (
                  <div key={d.key} className="flex items-center gap-2 text-sm">
                    <label className="flex items-center gap-2 w-28 shrink-0 cursor-pointer">
                      <input type="checkbox" checked={!!cfg.enabled}
                        onChange={e => updateDay(d.key, { enabled: e.target.checked })}
                        className="h-4 w-4 accent-[hsl(211,96%,56%)] cursor-pointer" />
                      <span className="text-white/80">{d.label}</span>
                    </label>
                    <Input type="time" value={cfg.start} disabled={!cfg.enabled}
                      onChange={e => updateDay(d.key, { start: e.target.value })}
                      className="bg-white/5 border-white/10 text-white h-9 flex-1 disabled:opacity-40" />
                    <span className="text-white/40 text-xs">to</span>
                    <Input type="time" value={cfg.end} disabled={!cfg.enabled}
                      onChange={e => updateDay(d.key, { end: e.target.value })}
                      className="bg-white/5 border-white/10 text-white h-9 flex-1 disabled:opacity-40" />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Booking form settings */}
          <section className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-white/50 font-semibold">Booking page</div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60">Page title</Label>
              <Input value={bookingTitle} onChange={e => setBookingTitle(e.target.value)}
                placeholder={calendar.name}
                className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60">Description / bio</Label>
              <textarea value={bookingDesc} onChange={e => setBookingDesc(e.target.value)} rows={3}
                placeholder="Tell prospects what to expect from this call…"
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white" />
            </div>
            <label className="flex items-center justify-between gap-2 p-3 rounded-md bg-white/[0.03] border border-white/10 cursor-pointer">
              <div>
                <div className="text-sm text-white">Booking link active</div>
                <div className="text-xs text-white/50">Pause to stop accepting new bookings.</div>
              </div>
              <input type="checkbox" checked={bookingActive}
                onChange={e => setBookingActive(e.target.checked)}
                className="h-5 w-9 accent-[hsl(211,96%,56%)] cursor-pointer" />
            </label>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60">Your booking link</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={bookingUrl} className="bg-white/5 border-white/10 text-white font-mono text-xs" />
                <Button type="button" onClick={copyLink} className="bg-[hsl(211,96%,56%)] hover:bg-[hsl(211,96%,48%)] shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/70">Cancel</Button>
          <Button onClick={save} disabled={saving || !name.trim()}
            className="bg-[hsl(211,96%,56%)] hover:bg-[hsl(211,96%,48%)]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
