import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { computeAvailableSlots, DEFAULT_MIN_NOTICE_MINUTES } from "@/lib/availabilitySlots";

interface CalendarSlotPickerProps {
  calendarId: string;
  clientId: string;
  duration: number;
  bufferBefore?: number;
  bufferAfter?: number;
  minNoticeMinutes?: number;
  selectedDate: string;
  selectedTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  variant?: "default" | "dark";
}


function formatTime12(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function CalendarSlotPicker({
  calendarId, clientId, duration, bufferBefore = 0, bufferAfter = 0,
  minNoticeMinutes,
  selectedDate, selectedTime, onDateChange, onTimeChange, variant = "default",
}: CalendarSlotPickerProps) {
  const [availability, setAvailability] = useState<any[]>([]);
  const [blackouts, setBlackouts] = useState<any[]>([]);
  const [bookedSlots, setBookedSlots] = useState<{ start: Date; end: Date }[]>([]);
  const [calMinNotice, setCalMinNotice] = useState<number>(DEFAULT_MIN_NOTICE_MINUTES);
  const [loading, setLoading] = useState(true);

  const effectiveMinNotice = minNoticeMinutes ?? calMinNotice;

  const dateOptions = useMemo(() => {
    const dates: { value: string; label: string; dayOfWeek: number }[] = [];
    const today = new Date();
    // Include today (i=0) so "next hour" slots can appear when eligible.
    for (let i = 0; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push({
        value: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        dayOfWeek: d.getDay(),
      });
    }
    return dates;
  }, []);

  useEffect(() => {
    if (!calendarId) return;
    Promise.all([
      supabase.from("calendar_availability").select("*").eq("calendar_id", calendarId).eq("is_active", true),
      supabase.from("calendar_blackout_dates").select("start_datetime, end_datetime").eq("calendar_id", calendarId),
      supabase.from("calendars").select("min_notice_minutes").eq("id", calendarId).maybeSingle(),
    ]).then(([avRes, blRes, calRes]) => {
      setAvailability(avRes.data || []);
      setBlackouts(blRes.data || []);
      const mn = (calRes.data as any)?.min_notice_minutes;
      if (typeof mn === "number") setCalMinNotice(mn);
      setLoading(false);
    });
  }, [calendarId]);

  useEffect(() => {
    if (!calendarId || !selectedDate) { setBookedSlots([]); return; }
    const dayStart = `${selectedDate}T00:00:00`;
    const dayEnd = `${selectedDate}T23:59:59`;
    supabase.from("appointments").select("start_time, end_time")
      .eq("calendar_id", calendarId)
      .neq("status", "cancelled")
      .gte("start_time", dayStart)
      .lte("start_time", dayEnd)
      .then(({ data }) => {
        setBookedSlots((data || []).map(e => ({
          start: new Date(e.start_time),
          end: new Date(e.end_time),
        })));
      });
  }, [calendarId, selectedDate]);

  const isBlackedOut = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return blackouts.some(b => {
      const start = new Date(b.start_datetime);
      const end = new Date(b.end_datetime);
      return d >= start && d <= end;
    });
  };

  const selectedDayOfWeek = selectedDate ? new Date(selectedDate + "T12:00:00").getDay() : -1;
  const dayAvail = availability.find(a => a.day_of_week === selectedDayOfWeek);

  const availableSlots = useMemo(() => {
    if (!dayAvail || !selectedDate) return [] as string[];
    const rows = [{
      day_of_week: dayAvail.day_of_week,
      start_time: dayAvail.start_time,
      end_time: dayAvail.end_time,
      slot_interval_minutes: dayAvail.slot_interval_minutes || 30,
      enabled: true,
    }];
    // Anchor "today" of the util at the selected date so only that day is generated.
    const anchor = new Date(selectedDate + "T00:00:00");
    const now = new Date();
    // If the selected date is in the future, allow all slots on it (min notice already
    // satisfied by definition once we're past today), so pass now=anchor when needed.
    const useNow = anchor.toDateString() === now.toDateString() ? now : anchor;
    const dates = computeAvailableSlots(rows, {
      durationMinutes: duration,
      slotIntervalMinutes: dayAvail.slot_interval_minutes || 30,
      bufferBeforeMinutes: bufferBefore,
      bufferAfterMinutes: bufferAfter,
      minNoticeMinutes: anchor.toDateString() === now.toDateString() ? effectiveMinNotice : 0,
      daysAhead: 1,
      booked: bookedSlots,
      now: useNow,
    });
    return dates.map(d => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
  }, [dayAvail, bookedSlots, duration, bufferBefore, bufferAfter, effectiveMinNotice, selectedDate]);

  const availableDates = dateOptions.filter(d => {
    if (isBlackedOut(d.value)) return false;
    return !!availability.find(a => a.day_of_week === d.dayOfWeek);
  });

  const isDark = variant === "dark";

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 py-4", isDark ? "text-white/60" : "text-muted-foreground")}>
        <Loader2 className="h-4 w-4 animate-spin" /> Loading availability...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className={cn("text-xs flex items-center gap-1.5 mb-2", isDark && "text-white/60")}>
          <Clock className="h-3.5 w-3.5" /> Select Date
        </Label>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {availableDates.slice(0, 14).map(d => (
            <button key={d.value} onClick={() => { onDateChange(d.value); onTimeChange(""); }}
              className={cn(
                "shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
                selectedDate === d.value
                  ? isDark
                    ? "bg-[hsl(211,96%,56%)] text-white border-[hsl(211,96%,56%)]"
                    : "bg-primary text-primary-foreground border-primary"
                  : isDark
                    ? "bg-white/5 text-white/75 border-white/10 hover:bg-white/10"
                    : "bg-secondary/50 text-foreground border-border hover:bg-secondary"
              )}>
              {d.label}
            </button>
          ))}
          {availableDates.length === 0 && (
            <p className={cn("text-xs py-2", isDark ? "text-white/45" : "text-muted-foreground")}>No availability configured for this calendar.</p>
          )}
        </div>
      </div>

      {selectedDate && (
        <div>
          <Label className={cn("text-xs mb-2 block", isDark && "text-white/60")}>Available Times</Label>
          {!dayAvail ? (
            <p className={cn("text-xs py-2", isDark ? "text-white/45" : "text-muted-foreground")}>Not available on this day</p>
          ) : availableSlots.length === 0 ? (
            <p className={cn("text-xs py-2", isDark ? "text-white/45" : "text-muted-foreground")}>No available times — please contact us to schedule</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-[220px] overflow-y-auto">
              {availableSlots.map(slot => (
                <button key={slot} onClick={() => onTimeChange(slot)}
                  className={cn(
                    "px-2 py-2 rounded-lg text-xs font-medium transition-colors border text-center",
                    selectedTime === slot
                      ? isDark
                        ? "bg-[hsl(211,96%,56%)] text-white border-[hsl(211,96%,56%)]"
                        : "bg-primary text-primary-foreground border-primary"
                      : isDark
                        ? "bg-white/5 text-white/75 border-white/10 hover:bg-white/10"
                        : "bg-secondary/50 text-foreground border-border hover:bg-secondary"
                  )}>
                  {formatTime12(slot)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
