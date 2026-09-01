import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ensureServicePocCalendar, listServicePocs, type ServicePocPerson } from "@/lib/servicePocCalendar";
import { CalendarClock, Loader2, RefreshCw, Repeat, XCircle } from "lucide-react";

export const ADMIN_WEEKLY_SOURCE = "admin_weekly_recurring";

const cardStyle = { background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type EventRow = {
  id: string;
  title: string | null;
  start_time: string;
  end_time: string | null;
  notes: string | null;
  assigned_user: string | null;
  timezone: string | null;
  recurrence_series_id: string | null;
  recurrence_end_date: string | null;
  calendar_id: string | null;
};

/* --- Timezone-safe date math (same pattern as pay-sign-context) --- */
function makeLocalToUtc(tz: string) {
  const zonedOffsetMs = (dd: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(dd).reduce((acc: any, p) => { acc[p.type] = p.value; return acc; }, {});
    const asUtc = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour) % 24, Number(parts.minute), Number(parts.second),
    );
    return asUtc - dd.getTime();
  };
  return (y: number, m: number, day: number, h: number, mi: number) => {
    const naive = Date.UTC(y, m, day, h, mi, 0);
    let guess = new Date(naive - zonedOffsetMs(new Date(naive)));
    guess = new Date(naive - zonedOffsetMs(guess));
    return guess;
  };
}

function fmt(v: string | null | undefined, tz?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: tz || undefined,
  });
}

export default function RecurringMeetingsTab({ clientId, client }: { clientId: string; client: any }) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [pocs, setPocs] = useState<ServicePocPerson[]>([]);
  const [setupOpen, setSetupOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // setup form
  const [pocId, setPocId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");

  // reschedule
  const [rescheduleFor, setRescheduleFor] = useState<EventRow | null>(null);
  const [reDate, setReDate] = useState("");
  const [reTime, setReTime] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("calendar_events")
      .select("id,title,start_time,end_time,notes,assigned_user,timezone,recurrence_series_id,recurrence_end_date,calendar_id")
      .eq("client_id", clientId)
      .eq("booking_source", ADMIN_WEEKLY_SOURCE)
      .order("start_time", { ascending: true });
    setEvents((data as EventRow[]) || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
    listServicePocs().then(setPocs).catch(() => setPocs([]));
  }, [load]);

  const pocName = (id: string | null) =>
    pocs.find((p) => p.user_id === id)?.full_name || "Service POC";

  // Active series = the series with the most future occurrences.
  const series = useMemo(() => {
    const now = Date.now();
    const groups = new Map<string, EventRow[]>();
    for (const e of events) {
      if (!e.recurrence_series_id) continue;
      const arr = groups.get(e.recurrence_series_id) || [];
      arr.push(e);
      groups.set(e.recurrence_series_id, arr);
    }
    let best: { id: string; all: EventRow[]; upcoming: EventRow[] } | null = null;
    for (const [id, all] of groups) {
      const upcoming = all.filter((e) => new Date(e.start_time).getTime() > now);
      if (upcoming.length === 0) continue;
      if (!best || upcoming.length > best.upcoming.length) best = { id, all, upcoming };
    }
    return best;
  }, [events]);

  const logAudit = async (action: string, metadata: Record<string, unknown>) => {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      client_id: clientId,
      user_id: auth?.user?.id ?? null,
      module: "recurring_meetings",
      action,
      status: "success",
      metadata: metadata as any,
    });
  };

  /* ---------- Create series ---------- */
  const createSeries = async () => {
    if (!pocId) { toast({ title: "Pick a Service POC", variant: "destructive" }); return; }
    if (!/^\d{1,2}:\d{2}$/.test(time)) { toast({ title: "Enter a valid time", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const cal: any = await ensureServicePocCalendar(pocId);
      const tz = cal.timezone || "America/Los_Angeles";
      const localToUtc = makeLocalToUtc(tz);
      const [hh, mm] = time.split(":").map(Number);
      const dow = Number(dayOfWeek);

      const now = new Date();
      const nowParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      }).formatToParts(now).reduce((acc: any, p) => { acc[p.type] = p.value; return acc; }, {});
      const todayLocal = new Date(Date.UTC(Number(nowParts.year), Number(nowParts.month) - 1, Number(nowParts.day)));
      let deltaDays = (dow - todayLocal.getUTCDay() + 7) % 7;
      let first = localToUtc(todayLocal.getUTCFullYear(), todayLocal.getUTCMonth(), todayLocal.getUTCDate() + deltaDays, hh, mm);
      if (first.getTime() <= now.getTime()) {
        deltaDays += 7;
        first = localToUtc(todayLocal.getUTCFullYear(), todayLocal.getUTCMonth(), todayLocal.getUTCDate() + deltaDays, hh, mm);
      }

      const seriesId = crypto.randomUUID();
      const occurrences: Date[] = [];
      for (let i = 0; i < 12; i++) {
        occurrences.push(localToUtc(
          todayLocal.getUTCFullYear(), todayLocal.getUTCMonth(), todayLocal.getUTCDate() + deltaDays + i * 7, hh, mm,
        ));
      }
      const last = occurrences[occurrences.length - 1];

      const rows = occurrences.map((start) => ({
        calendar_id: cal.id,
        client_id: clientId,
        assigned_user: pocId,
        title: `Weekly Check-in: ${client?.business_name || "Client"}`,
        contact_name: client?.owner_name || null,
        company_name: client?.business_name || null,
        notes: notes.trim() || null,
        timezone: tz,
        start_time: start.toISOString(),
        end_time: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
        recurrence_frequency: "weekly",
        recurrence_series_id: seriesId,
        recurrence_end_date: last.toISOString(),
        booking_source: ADMIN_WEEKLY_SOURCE,
      }));

      const { error } = await supabase.from("calendar_events").insert(rows as any);
      if (error) throw new Error(error.message);
      await logAudit("series_created", { series_id: seriesId, poc_user_id: pocId, day_of_week: dow, time, count: 12 });
      toast({ title: "Weekly meetings scheduled", description: "12 occurrences created." });
      setSetupOpen(false);
      setNotes("");
      load();
    } catch (e: any) {
      toast({ title: "Could not schedule", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Renew ---------- */
  const renew = async () => {
    if (!series) return;
    setBusy(true);
    try {
      const sorted = [...series.all].sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time));
      const lastRow = sorted[sorted.length - 1];
      const lastStart = new Date(lastRow.start_time);
      const durationMs = lastRow.end_time
        ? new Date(lastRow.end_time).getTime() - lastStart.getTime()
        : 30 * 60 * 1000;

      const rows = Array.from({ length: 12 }, (_, i) => {
        const start = new Date(lastStart.getTime() + (i + 1) * 7 * 24 * 60 * 60 * 1000);
        return {
          calendar_id: lastRow.calendar_id,
          client_id: clientId,
          assigned_user: lastRow.assigned_user,
          title: lastRow.title,
          contact_name: client?.owner_name || null,
          company_name: client?.business_name || null,
          notes: lastRow.notes,
          timezone: lastRow.timezone,
          start_time: start.toISOString(),
          end_time: new Date(start.getTime() + durationMs).toISOString(),
          recurrence_frequency: "weekly",
          recurrence_series_id: series.id,
          recurrence_end_date: new Date(lastStart.getTime() + 12 * 7 * 24 * 60 * 60 * 1000).toISOString(),
          booking_source: ADMIN_WEEKLY_SOURCE,
        };
      });
      const { error } = await supabase.from("calendar_events").insert(rows as any);
      if (error) throw new Error(error.message);
      await logAudit("series_renewed", { series_id: series.id, count: 12 });
      toast({ title: "Renewed for 12 more weeks" });
      load();
    } catch (e: any) {
      toast({ title: "Could not renew", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  /* ---------- Single occurrence actions ---------- */
  const openReschedule = (evt: EventRow) => {
    const s = new Date(evt.start_time);
    const pad = (n: number) => String(n).padStart(2, "0");
    setReDate(`${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`);
    setReTime(`${pad(s.getHours())}:${pad(s.getMinutes())}`);
    setRescheduleFor(evt);
  };

  const saveReschedule = async () => {
    if (!rescheduleFor || !reDate || !reTime) return;
    setBusy(true);
    try {
      const prevStart = rescheduleFor.start_time;
      const durationMs = rescheduleFor.end_time
        ? new Date(rescheduleFor.end_time).getTime() - new Date(prevStart).getTime()
        : 30 * 60 * 1000;
      const [y, m, dd] = reDate.split("-").map(Number);
      const [hh, mi] = reTime.split(":").map(Number);
      const start = new Date(y, m - 1, dd, hh, mi, 0);
      const { error } = await supabase
        .from("calendar_events")
        .update({
          start_time: start.toISOString(),
          end_time: new Date(start.getTime() + durationMs).toISOString(),
        })
        .eq("id", rescheduleFor.id);
      if (error) throw new Error(error.message);
      await logAudit("occurrence_rescheduled", {
        event_id: rescheduleFor.id,
        series_id: rescheduleFor.recurrence_series_id,
        from: prevStart,
        to: start.toISOString(),
      });
      toast({ title: "Occurrence rescheduled" });
      setRescheduleFor(null);
      load();
    } catch (e: any) {
      toast({ title: "Could not reschedule", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const cancelOne = async (evt: EventRow) => {
    if (!confirm("Cancel just this occurrence? The rest of the series stays in place.")) return;
    setBusy(true);
    const { error } = await supabase.from("calendar_events").delete().eq("id", evt.id);
    setBusy(false);
    if (error) { toast({ title: "Could not cancel", description: error.message, variant: "destructive" }); return; }
    await logAudit("occurrence_cancelled", { event_id: evt.id, series_id: evt.recurrence_series_id, start_time: evt.start_time });
    toast({ title: "Occurrence cancelled" });
    load();
  };

  const endSeries = async () => {
    if (!series) return;
    if (!confirm("End this series? All future occurrences will be removed. Past meetings stay as history.")) return;
    setBusy(true);
    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("recurrence_series_id", series.id)
      .eq("booking_source", ADMIN_WEEKLY_SOURCE)
      .gt("start_time", new Date().toISOString());
    setBusy(false);
    if (error) { toast({ title: "Could not end series", description: error.message, variant: "destructive" }); return; }
    await logAudit("series_ended", { series_id: series.id });
    toast({ title: "Series ended" });
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
      </div>
    );
  }

  const upcoming = series?.upcoming ?? [];
  const next5 = upcoming.slice(0, 5);

  return (
    <div className="space-y-4">
      {!series ? (
        <div className="rounded-2xl p-10 text-center" style={cardStyle}>
          <Repeat className="h-6 w-6 mx-auto text-white/30" />
          <p className="text-sm text-white/70 mt-3">No weekly recurring meeting set up for this client.</p>
          <p className="text-xs text-white/40 mt-1">
            For post-Won, fully onboarded clients. Creates 12 weekly check-ins on a Service POC calendar.
          </p>
          <Button className="mt-4" onClick={() => setSetupOpen(true)}>
            <CalendarClock className="h-4 w-4 mr-2" /> Set Up Weekly Meeting
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl p-4 sm:p-5" style={cardStyle}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-white/35 font-semibold">Active Series</p>
                <p className="text-sm text-white/85 mt-1">
                  {pocName(next5[0]?.assigned_user ?? null)} ·{" "}
                  {DAYS[new Date(upcoming[0].start_time).getDay()]}s at{" "}
                  {new Date(upcoming[0].start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
                <p className="text-xs text-white/45 mt-0.5">{upcoming.length} upcoming occurrence{upcoming.length === 1 ? "" : "s"} remaining</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {upcoming.length < 4 && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={renew}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Renew for 12 more weeks
                  </Button>
                )}
                <Button size="sm" variant="ghost" disabled={busy} onClick={endSeries} className="text-[hsl(0,70%,68%)] hover:text-[hsl(0,70%,72%)]">
                  <XCircle className="h-3.5 w-3.5 mr-1.5" /> End Series
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-4 sm:p-5" style={cardStyle}>
            <p className="text-[10px] uppercase tracking-wider text-white/35 font-semibold mb-3">Next Occurrences</p>
            <div className="divide-y divide-white/5">
              {next5.map((evt) => (
                <div key={evt.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-white/80">{fmt(evt.start_time, evt.timezone)}</p>
                    <p className="text-xs text-white/40 truncate">{evt.title || "Weekly Check-in"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => openReschedule(evt)}>Reschedule this one</Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => cancelOne(evt)} className="text-white/50 hover:text-white/80">Cancel this one</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Setup dialog */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Set Up Weekly Meeting</DialogTitle>
            <DialogDescription className="text-xs">
              Creates 12 weekly occurrences on the selected Service POC's calendar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Service POC</label>
              <Select value={pocId} onValueChange={setPocId}>
                <SelectTrigger><SelectValue placeholder="Select POC" /></SelectTrigger>
                <SelectContent>
                  {pocs.map((p) => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              {pocs.length === 0 && <p className="text-[11px] text-white/40 mt-1">No Service POC users found.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Day of week</label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((dLabel, i) => <SelectItem key={dLabel} value={String(i)}>{dLabel}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Time</label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Agenda or context…" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSetupOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={busy || !pocId} onClick={createSeries}>
              {busy ? "Scheduling…" : "Create 12 weekly meetings"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule dialog */}
      <Dialog open={!!rescheduleFor} onOpenChange={(v) => !v && setRescheduleFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Reschedule occurrence</DialogTitle>
            <DialogDescription className="text-xs">
              Only this meeting moves — the rest of the series is unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date</label>
              <Input type="date" value={reDate} onChange={(e) => setReDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Time</label>
              <Input type="time" value={reTime} onChange={(e) => setReTime(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRescheduleFor(null)}>Cancel</Button>
            <Button size="sm" disabled={busy} onClick={saveReschedule}>{busy ? "Saving…" : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
