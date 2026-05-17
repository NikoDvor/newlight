import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight, Plus, Link2, Copy, Check, X, Trash2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ensureBdrCalendar, BdrCalendar } from "@/lib/bdrCalendar";
import CustomerProfilePanel from "@/components/CustomerProfilePanel";

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
  const [profileLeadId, setProfileLeadId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const handleEventClick = (e: Event) => {
    if (e.lead_id) setProfileLeadId(e.lead_id);
    else setSelected(e);
  };

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
    setSelectedDay(d);
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
    <div className="space-y-5 pb-24 relative">
      {/* Header */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{calendar.name}</h1>
          <p className="text-xs text-white/50 mt-1">Your personal pipeline calendar</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowShare(true)}
            className="border-white/10 bg-white/[0.04] text-white/85 hover:bg-white/[0.08] hover:text-white h-9 rounded-full px-4">
            <Link2 className="h-3.5 w-3.5 mr-1.5" /> Share Booking Link
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}
            aria-label="Calendar settings"
            className="h-9 w-9 text-white/65 hover:text-white hover:bg-white/5 rounded-full">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Nav toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white/70 hover:text-white hover:bg-white/5" onClick={() => {
            const d = new Date(cursor);
            if (view === "month") d.setMonth(d.getMonth() - 1); else d.setDate(d.getDate() - 7);
            setCursor(d);
          }}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-white text-base font-semibold px-1 truncate min-w-0">
            {view === "month"
              ? cursor.toLocaleDateString([], { month: "long", year: "numeric" })
              : `${startOfWeek(cursor).toLocaleDateString([], { month: "short", day: "numeric" })} – ${addDays(startOfWeek(cursor),6).toLocaleDateString([], { month: "short", day: "numeric" })}`}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white/70 hover:text-white hover:bg-white/5" onClick={() => {
            const d = new Date(cursor);
            if (view === "month") d.setMonth(d.getMonth() + 1); else d.setDate(d.getDate() + 7);
            setCursor(d);
          }}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" className="h-8 px-3 ml-1 text-white/70 text-xs rounded-full hover:text-white hover:bg-white/5" onClick={() => { const t = new Date(); setCursor(t); setSelectedDay(t); }}>Today</Button>
        </div>
        <div className="flex rounded-full overflow-hidden bg-white/[0.04] border border-white/10 shrink-0 p-0.5">
          {(["month","week"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-3 py-1 text-[11px] font-semibold capitalize transition-colors rounded-full"
              style={{
                background: view === v ? "hsl(211,96%,56%)" : "transparent",
                color: view === v ? "white" : "hsl(0,0%,65%)",
              }}>{v}</button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <>
          <MonthView cursor={cursor} eventsByDay={eventsByDay} selectedDay={selectedDay}
            onSelectDay={(d) => setSelectedDay(d)} />
          <DayAgenda
            day={selectedDay}
            events={eventsByDay.get(`${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}`) || []}
            onEventClick={setSelected}
          />
        </>
      ) : (
        <WeekView cursor={cursor} events={events} selectedDay={selectedDay}
          onSelectDay={setSelectedDay} onEventClick={setSelected} />
      )}

      {/* Floating Add button */}
      <button
        onClick={() => { setAddPrefill((() => { const d = new Date(selectedDay); d.setHours(9,0,0,0); return d; })()); setShowAdd(true); }}
        aria-label="Add event"
        className="fixed bottom-20 right-5 sm:bottom-6 sm:right-6 z-30 h-14 w-14 rounded-full flex items-center justify-center text-white transition-transform active:scale-95"
        style={{ background: "hsl(211,96%,56%)", boxShadow: "0 10px 30px -8px hsla(211,96%,55%,.6), 0 0 0 1px hsla(211,96%,70%,.3) inset" }}>
        <Plus className="h-6 w-6" />
      </button>

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

function MonthView({ cursor, eventsByDay, selectedDay, onSelectDay }: {
  cursor: Date; eventsByDay: Map<string, Event[]>; selectedDay: Date; onSelectDay: (d: Date) => void;
}) {
  const first = startOfMonth(cursor);
  const gridStart = startOfWeek(first);
  const days: Date[] = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = new Date();
  return (
    <div className="w-full rounded-2xl overflow-hidden p-2 sm:p-3"
      style={{ border: "1px solid hsla(0,0%,100%,.07)", background: "hsla(215,30%,9%,.7)", boxShadow: "0 1px 0 hsla(0,0%,100%,.04) inset" }}>
      <div className="grid grid-cols-7 w-full text-[10px] uppercase tracking-[0.14em] text-white/40 mb-1">
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} className="min-w-0 py-2 text-center font-semibold">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 w-full gap-y-1">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          const dayEvents = eventsByDay.get(key) || [];
          const isToday = sameDay(d, today);
          const isSelected = sameDay(d, selectedDay);
          const sources = Array.from(new Set(dayEvents.map(e => e.source))).slice(0, 3);
          const showRing = isSelected && !isToday;
          return (
            <button key={i} onClick={() => onSelectDay(d)}
              className="min-w-0 h-12 sm:h-14 flex flex-col items-center justify-center gap-1 transition-colors"
              style={{ opacity: inMonth ? 1 : 0.3 }}>
              <span
                className="inline-flex items-center justify-center text-[13px] transition-all"
                style={{
                  width: 32, height: 32, borderRadius: 999,
                  background: isToday ? "hsl(211,96%,56%)" : (showRing ? "hsla(211,96%,56%,.14)" : "transparent"),
                  color: isToday ? "white" : (showRing ? "hsl(211,96%,82%)" : "hsl(0,0%,90%)"),
                  boxShadow: isToday ? "0 4px 14px -4px hsla(211,96%,55%,.7)" : (showRing ? "inset 0 0 0 1px hsla(211,96%,60%,.45)" : undefined),
                  fontWeight: isToday ? 700 : 500,
                }}>
                {d.getDate()}
              </span>
              <span className="flex gap-1 h-1.5 items-center">
                {sources.map(s => (
                  <span key={s} className="h-1.5 w-1.5 rounded-full" style={{ background: SOURCE_TONE[s] || "#888" }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayAgenda({ day, events, onEventClick }: {
  day: Date; events: Event[]; onEventClick: (e: Event) => void;
}) {
  const sorted = [...events].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between px-1">
        <div className="text-white text-base font-semibold">
          {day.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
        </div>
        <div className="text-[11px] text-white/45">{sorted.length} {sorted.length === 1 ? "event" : "events"}</div>
      </div>
      {sorted.length === 0 ? (
        <div className="rounded-2xl py-10 text-center text-xs text-white/40"
          style={{ border: "1px dashed hsla(0,0%,100%,.08)", background: "hsla(215,30%,9%,.4)" }}>
          No events scheduled. Tap + to add one.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(e => {
            const tone = SOURCE_TONE[e.source] || "#888";
            return (
              <button key={e.id} onClick={() => onEventClick(e)}
                className="w-full flex items-center gap-3 text-left px-3 py-3 rounded-xl transition-all hover:translate-x-0.5"
                style={{ background: "hsla(215,30%,11%,.85)", border: "1px solid hsla(0,0%,100%,.06)", borderLeft: `3px solid ${tone}` }}>
                <div className="flex flex-col items-center justify-center w-14 shrink-0">
                  <span className="text-[11px] text-white/55 font-medium leading-none">{fmtTime(new Date(e.starts_at))}</span>
                  <span className="text-[10px] text-white/30 mt-0.5 leading-none">{fmtTime(new Date(e.ends_at))}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate font-medium">{e.title}</div>
                  {e.description && <div className="text-[11px] text-white/45 truncate mt-0.5">{e.description}</div>}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
                  style={{ background: `${tone}22`, color: tone }}>
                  {SOURCE_LABEL[e.source] || e.source}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WeekView({ cursor, events, selectedDay, onSelectDay, onEventClick }: {
  cursor: Date; events: Event[]; selectedDay: Date; onSelectDay: (d: Date) => void; onEventClick: (e: Event) => void;
}) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = new Date();
  const slots: { h: number; m: number }[] = [];
  for (let h = 6; h <= 20; h++) { slots.push({ h, m: 0 }); slots.push({ h, m: 30 }); }
  slots.push({ h: 21, m: 0 });

  const dayEvents = events.filter(e => sameDay(new Date(e.starts_at), selectedDay))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const isToday = sameDay(d, today);
          const isSelected = sameDay(d, selectedDay);
          return (
            <button key={i} onClick={() => onSelectDay(d)}
              className="min-w-0 flex flex-col items-center gap-1 py-2 rounded-xl transition-all"
              style={{
                background: isSelected ? "hsl(211,96%,56%)" : "hsla(215,30%,11%,.7)",
                border: `1px solid ${isSelected ? "hsla(211,96%,70%,.5)" : "hsla(0,0%,100%,.06)"}`,
              }}>
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: isSelected ? "rgba(255,255,255,.85)" : "hsl(0,0%,55%)" }}>
                {["S","M","T","W","T","F","S"][d.getDay()]}
              </span>
              <span className="text-base font-bold" style={{ color: isSelected ? "white" : (isToday ? "hsl(211,96%,72%)" : "hsl(0,0%,90%)") }}>
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid hsla(0,0%,100%,.07)", background: "hsla(215,30%,9%,.7)" }}>
        <div className="max-h-[58vh] overflow-y-auto divide-y divide-white/[0.04]">
          {slots.map(({ h, m }) => {
            const slotStart = new Date(selectedDay); slotStart.setHours(h, m, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + 30 * 60_000);
            const inSlot = dayEvents.filter(e => {
              const t = new Date(e.starts_at);
              return t >= slotStart && t < slotEnd;
            });
            const label = `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2,"0")} ${h < 12 ? "AM" : "PM"}`;
            return (
              <div key={`${h}-${m}`} className="grid grid-cols-[68px_1fr] min-h-[44px]">
                <div className="px-2 py-2 text-[10px] text-white/35 text-right font-medium">{label}</div>
                <div className="px-2 py-1.5 space-y-1">
                  {inSlot.map(e => {
                    const tone = SOURCE_TONE[e.source] || "#888";
                    return (
                      <button key={e.id} onClick={() => onEventClick(e)}
                        className="w-full text-left px-2.5 py-1.5 rounded-md text-[12px] truncate transition-colors"
                        style={{ background: `${tone}22`, borderLeft: `3px solid ${tone}` }}>
                        <span className="text-white font-medium">{e.title}</span>
                        <span className="text-white/50 ml-2 text-[10px]">{fmtTime(new Date(e.starts_at))}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QuickAddDialog({ open, onOpenChange, prefill, calendar, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; prefill: Date | null; calendar: BdrCalendar; onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const base = prefill || (() => { const d = new Date(); d.setMinutes(0,0,0); d.setHours(d.getHours()+1); return d; })();
      const pad = (n: number) => String(n).padStart(2, "0");
      setDate(`${base.getFullYear()}-${pad(base.getMonth()+1)}-${pad(base.getDate())}`);
      setStartTime(`${pad(base.getHours())}:${pad(base.getMinutes())}`);
      const endBase = new Date(base.getTime() + 30 * 60_000);
      setEndTime(`${pad(endBase.getHours())}:${pad(endBase.getMinutes())}`);
      setTitle(""); setNotes("");
    }
  }, [open, prefill]);

  const save = async () => {
    if (!title.trim() || !date || !startTime || !endTime) return;
    setSaving(true);
    const startDate = new Date(`${date}T${startTime}`);
    let endDate = new Date(`${date}T${endTime}`);
    if (endDate <= startDate) endDate = new Date(startDate.getTime() + 30 * 60_000);
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
      <DialogContent className="bg-[hsl(215,35%,10%)] border-white/10 text-white rounded-2xl">
        <DialogHeader><DialogTitle className="text-lg">Add Event</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-white/60">Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Follow-up call, block, reminder…" className="bg-white/5 border-white/10 text-white h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/60">Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white/5 border-white/10 text-white h-11" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60">Start time</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-white/5 border-white/10 text-white h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/60">End time</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-white/5 border-white/10 text-white h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-white/60">Notes</Label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Optional details…"
              className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-white/70">Cancel</Button>
          <Button onClick={save} disabled={saving || !title.trim() || !date} className="bg-[hsl(211,96%,56%)] hover:bg-[hsl(211,96%,48%)] rounded-full px-5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Event"}
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
  const [roundRobin, setRoundRobin] = useState<boolean>((calendar as any).round_robin_pool ?? false);
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
      setRoundRobin((calendar as any).round_robin_pool ?? false);
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
      round_robin_pool: roundRobin,
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

          {/* Round-Robin Pool */}
          <section className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-white/50 font-semibold">Team rotation</div>
            <label className="flex items-center justify-between gap-2 p-3 rounded-md bg-white/[0.03] border border-white/10 cursor-pointer">
              <div>
                <div className="text-sm text-white">Round-Robin Pool</div>
                <div className="text-xs text-white/50">Share inbound bookings evenly with other pool members. Least-recently-assigned BDR receives the next booking.</div>
              </div>
              <input type="checkbox" checked={roundRobin}
                onChange={e => setRoundRobin(e.target.checked)}
                className="h-5 w-9 accent-[hsl(211,96%,56%)] cursor-pointer" />
            </label>
          </section>

          {/* External sync — coming soon */}
          <section className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-white/50 font-semibold">External calendar sync</div>
            <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-white/[0.02] border border-white/10 opacity-60">
              <div>
                <div className="text-sm text-white">Google Calendar sync</div>
                <div className="text-xs text-white/50">Two-way sync with your personal Google Calendar.</div>
              </div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-white/5 text-white/60 border border-white/10">Coming soon</span>
            </div>
            <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-white/[0.02] border border-white/10 opacity-60">
              <div>
                <div className="text-sm text-white">Outlook sync</div>
                <div className="text-xs text-white/50">Two-way sync with your Outlook calendar.</div>
              </div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-white/5 text-white/60 border border-white/10">Coming soon</span>
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
