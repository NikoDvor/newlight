import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CalendarSlotPickerProps {
  calendarId: string;
  clientId: string;
  duration: number;
  bufferBefore?: number;
  bufferAfter?: number;
  selectedDate: string;
  selectedTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}

function generateSlots(startTime: string, endTime: string, durationMin: number, interval: number, bufferBefore: number, bufferAfter: number): string[] {
  const slots: string[] = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  for (let m = startMinutes; m + durationMin + bufferAfter <= endMinutes; m += interval) {
    if (m - bufferBefore < startMinutes && bufferBefore > 0) continue;
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return slots;
}

function formatTime12(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function CalendarSlotPicker({
  calendarId, clientId, duration, bufferBefore = 0, bufferAfter = 0,
  selectedDate, selectedTime, onDateChange, onTimeChange,
}: CalendarSlotPickerProps) {
  const [availability, setAvailability] = useState<any[]>([]);
  const [blackouts, setBlackouts] = useState<any[]>([]);
  const [bookedSlots, setBookedSlots] = useState<{ start: string; end: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const dateOptions = useMemo(() => {
    const dates: { value: string; label: string; dayOfWeek: number }[] = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
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
    ]).then(([avRes, blRes]) => {
      setAvailability(avRes.data || []);
      setBlackouts(blRes.data || []);
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
          start: new Date(e.start_time).toTimeString().slice(0, 5),
          end: new Date(e.end_time).toTimeString().slice(0, 5),
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
    if (!dayAvail) return [];
    const interval = dayAvail.slot_interval_minutes || 30;
    const allSlots = generateSlots(dayAvail.start_time, dayAvail.end_time, duration, interval, bufferBefore, bufferAfter);
    // Filter booked
    return allSlots.filter(slot => {
      const [sh, sm] = slot.split(":").map(Number);
      const slotStart = sh * 60 + sm - bufferBefore;
      const slotEnd = sh * 60 + sm + duration + bufferAfter;
      return !bookedSlots.some(booked => {
        const [bsh, bsm] = booked.start.split(":").map(Number);
        const [beh, bem] = booked.end.split(":").map(Number);
        const bookedStart = bsh * 60 + bsm;
        const bookedEnd = beh * 60 + bem;
        return slotStart < bookedEnd && slotEnd > bookedStart;
      });
    });
  }, [dayAvail, bookedSlots, duration, bufferBefore, bufferAfter]);

  const availableDates = dateOptions.filter(d => {
    if (isBlackedOut(d.value)) return false;
    return !!availability.find(a => a.day_of_week === d.dayOfWeek);
  });

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading availability...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs flex items-center gap-1.5 mb-2">
          <Clock className="h-3.5 w-3.5" /> Select Date
        </Label>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {availableDates.slice(0, 14).map(d => (
            <button key={d.value} onClick={() => { onDateChange(d.value); onTimeChange(""); }}
              className={cn(
                "shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
                selectedDate === d.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/50 text-foreground border-border hover:bg-secondary"
              )}>
              {d.label}
            </button>
          ))}
          {availableDates.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No availability configured for this calendar.</p>
          )}
        </div>
      </div>

      {selectedDate && (
        <div>
          <Label className="text-xs mb-2 block">Available Times</Label>
          {!dayAvail ? (
            <p className="text-xs text-muted-foreground py-2">Not available on this day</p>
          ) : availableSlots.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No available times — please contact us to schedule</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-[220px] overflow-y-auto">
              {availableSlots.map(slot => (
                <button key={slot} onClick={() => onTimeChange(slot)}
                  className={cn(
                    "px-2 py-2 rounded-lg text-xs font-medium transition-colors border text-center",
                    selectedTime === slot
                      ? "bg-primary text-primary-foreground border-primary"
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
