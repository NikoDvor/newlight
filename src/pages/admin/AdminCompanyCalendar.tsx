import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  MonthGrid, WeekGrid, DayView, ViewSwitcher, CalendarGridSkeleton, CalendarEmptyState,
  resolveEventKind, type CalendarEventLike,
} from "@/components/calendar";

type View = "month" | "week" | "day";
const VIEWS = [
  { key: "month" as View, label: "Month" },
  { key: "week" as View, label: "Week" },
  { key: "day" as View, label: "Day" },
] as const;

interface Merged extends CalendarEventLike {
  clientId: string | null;
  userId: string | null;
}

const cardStyle = {
  background: "hsla(215,35%,10%,.8)",
  border: "1px solid hsla(211,96%,60%,.12)",
};

function SearchSelect({ value, onChange, options, allLabel }: {
  value: string; onChange: (v: string) => void; options: { id: string; label: string }[]; allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value)?.label ?? allLabel;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full sm:w-64 justify-between min-h-[44px]">
          <span className="truncate">{current}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {[{ id: "all", label: allLabel }, ...options].map((o) => (
                <CommandItem key={o.id} value={`${o.label} ${o.id}`} onSelect={() => { onChange(o.id); setOpen(false); }}>
                  <Check className={`mr-2 h-4 w-4 ${value === o.id ? "opacity-100" : "opacity-0"}`} />
                  <span className="truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function AdminCompanyCalendar() {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [events, setEvents] = useState<Merged[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [staff, setStaff] = useState<Record<string, string>>({});
  const [clientFilter, setClientFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");

  // Lookups (once)
  useEffect(() => {
    (async () => {
      const [c, e, w] = await Promise.all([
        supabase.from("clients").select("id,business_name").order("business_name"),
        supabase.from("employee_profiles").select("user_id,full_name").order("full_name"),
        supabase.from("workspace_users").select("user_id,full_name").order("full_name"),
      ]);
      setClients(Object.fromEntries((c.data || []).map((r: any) => [r.id, r.business_name || "Unnamed client"])));
      // Merge employee_profiles + workspace_users into one staff map; workspace_users wins on conflict
      // (more complete/current record) and rows with null user_id (pending invites) are skipped.
      const merged: Record<string, string> = {};
      for (const r of (e.data || [])) {
        if (r.user_id) merged[r.user_id] = r.full_name || "Unnamed";
      }
      for (const r of (w.data || [])) {
        if (r.user_id) merged[r.user_id] = r.full_name || merged[r.user_id] || "Unnamed";
      }
      setStaff(merged);
    })();
  }, []);

  // Month-range key (week/day views live inside the visible month range, padded a week each side)
  const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      from.setDate(from.getDate() - 7);
      const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      to.setDate(to.getDate() + 7);
      const f = from.toISOString(), t = to.toISOString();
      const [b, c, a] = await Promise.all([
        supabase.from("bdr_calendar_events").select("id,title,description,starts_at,ends_at,user_id,client_id,stage,outcome,source").gte("starts_at", f).lt("starts_at", t).limit(5000),
        supabase.from("calendar_events").select("id,title,description,start_time,end_time,assigned_user,client_id,calendar_status,booking_source").gte("start_time", f).lt("start_time", t).limit(5000),
        supabase.from("appointments").select("id,title,description,start_time,end_time,assigned_user_id,client_id,status,booking_source").gte("start_time", f).lt("start_time", t).limit(5000),
      ]);
      if (cancelled) return;
      const merged: Merged[] = [
        ...(b.data || []).map((r: any) => ({
          id: `bdr-${r.id}`, startsAt: r.starts_at, endsAt: r.ends_at, title: r.title || "Meeting",
          description: [r.stage, r.outcome].filter(Boolean).join(" · ") || r.description,
          kind: resolveEventKind(r.source), clientId: r.client_id, userId: r.user_id, raw: r,
        })),
        ...(c.data || []).map((r: any) => ({
          id: `cal-${r.id}`, startsAt: r.start_time, endsAt: r.end_time, title: r.title || "Booking",
          description: r.calendar_status || r.description, kind: resolveEventKind(r.booking_source),
          clientId: r.client_id, userId: r.assigned_user, raw: r,
        })),
        ...(a.data || []).map((r: any) => ({
          id: `apt-${r.id}`, startsAt: r.start_time, endsAt: r.end_time, title: r.title || "Appointment",
          description: r.status || r.description, kind: resolveEventKind(r.booking_source),
          clientId: r.client_id, userId: r.assigned_user_id, raw: r,
        })),
      ];
      setEvents(merged);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey]);

  const visible = useMemo(() => events
    .filter((e) => clientFilter === "all" || e.clientId === clientFilter)
    .filter((e) => staffFilter === "all" || e.userId === staffFilter)
    .map((e) => {
      const who = [e.clientId ? clients[e.clientId] : null, e.userId ? staff[e.userId] : "Unassigned"].filter(Boolean).join(" · ");
      return { ...e, description: [who, e.description].filter(Boolean).join(" — ") };
    }), [events, clientFilter, staffFilter, clients, staff]);

  const shift = (dir: number) => {
    const d = new Date(view === "month" ? cursor : selectedDay);
    if (view === "month") d.setMonth(d.getMonth() + dir, 1);
    else d.setDate(d.getDate() + (view === "week" ? 7 : 1) * dir);
    setCursor(d);
    if (view !== "month") setSelectedDay(d);
  };

  const label = view === "month"
    ? cursor.toLocaleDateString([], { month: "long", year: "numeric" })
    : selectedDay.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  const clientOpts = Object.entries(clients).map(([id, label]) => ({ id, label }));
  const staffOpts = Object.entries(staff).map(([id, label]) => ({ id, label }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Company Calendar</h1>
        <p className="text-sm text-muted-foreground">Every booked meeting across every client and your own team, in one view.</p>
      </div>

      <div className="rounded-2xl p-4 flex flex-col sm:flex-row gap-3 sm:items-center" style={cardStyle}>
        <SearchSelect value={clientFilter} onChange={setClientFilter} options={clientOpts} allLabel="All Clients" />
        <SearchSelect value={staffFilter} onChange={setStaffFilter} options={staffOpts} allLabel="All Staff" />
        <span className="text-xs text-muted-foreground sm:ml-auto">{visible.length} events in range</span>
      </div>

      <div className="rounded-2xl p-4 space-y-4" style={cardStyle}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium text-foreground min-w-[10rem] text-center">{label}</span>
            <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next"><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => { const n = new Date(); setCursor(n); setSelectedDay(n); }}>Today</Button>
          </div>
          <ViewSwitcher<View> value={view} onChange={setView} views={VIEWS} />
        </div>

        {loading ? (
          <CalendarGridSkeleton />
        ) : view === "month" ? (
          <>
            <MonthGrid monthCursor={cursor} selectedDay={selectedDay} events={visible}
              onSelectDay={(d) => { setSelectedDay(d); }} />
            <DayView day={selectedDay} events={visible} />
            {visible.length === 0 && <CalendarEmptyState title="No meetings this month" description="Try another month or clear the filters." compact />}
          </>
        ) : view === "week" ? (
          <WeekGrid weekCursor={selectedDay} selectedDay={selectedDay} events={visible}
            onSelectDay={(d) => { setSelectedDay(d); setCursor(d); }} />
        ) : (
          <DayView day={selectedDay} events={visible} />
        )}
      </div>
    </div>
  );
}
