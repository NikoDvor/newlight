import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Clock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface TimeSlotPickerProps {
  clientId: string;
  duration: number; // minutes
  selectedDate: string; // YYYY-MM-DD
  selectedTime: string; // HH:MM
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}

interface AvailabilityWindow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  enabled: boolean;
}

function generateSlots(startTime: string, endTime: string, durationMin: number, bufferMin: number = 0): string[] {
  const slots: string[] = [];
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  const step = durationMin + bufferMin;

  for (let m = startMinutes; m + durationMin <= endMinutes; m += step) {
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

export function TimeSlotPicker({
  clientId, duration, selectedDate, selectedTime, onDateChange, onTimeChange,
}: TimeSlotPickerProps) {
  const [availability, setAvailability] = useState<AvailabilityWindow[]>([]);
  const [bookedSlots, setBookedSlots] = useState<{ start: string; end: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Generate next 14 days
  const dateOptions = useMemo(() => {
    const dates: { value: string; label: string; dayOfWeek: number }[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
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
    if (!clientId) return;
    supabase.from("availability_settings").select("*").eq("client_id", clientId)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAvailability(data);
        } else {
          // Default: Mon-Fri 9am-5pm
          setAvailability([1, 2, 3, 4, 5].map(d => ({
            day_of_week: d, start_time: "09:00", end_time: "17:00", enabled: true,
          })));
        }
        setLoading(false);
      });
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !selectedDate) { setBookedSlots([]); return; }
    const dayStart = `${selectedDate}T00:00:00`;
    const dayEnd = `${selectedDate}T23:59:59`;
    supabase.from("calendar_events").select("start_time, end_time")
      .eq("client_id", clientId)
      .neq("calendar_status", "cancelled")
      .gte("start_time", dayStart)
      .lte("start_time", dayEnd)
      .then(({ data }) => {
        setBookedSlots((data || []).map(e => ({
          start: new Date(e.start_time).toTimeString().slice(0, 5),
          end: new Date(e.end_time).toTimeString().slice(0, 5),
        })));
      });
  }, [clientId, selectedDate]);

  const selectedDayOfWeek = selectedDate ? new Date(selectedDate + "T12:00:00").getDay() : -1;
  const dayAvailability = availability.find(a => a.day_of_week === selectedDayOfWeek && a.enabled);

  const availableSlots = useMemo(() => {
    if (!dayAvailability) return [];
    const allSlots = generateSlots(dayAvailability.start_time, dayAvailability.end_time, duration);
    // Filter out booked slots
    return allSlots.filter(slot => {
      const [sh, sm] = slot.split(":").map(Number);
      const slotStart = sh * 60 + sm;
      const slotEnd = slotStart + duration;
      return !bookedSlots.some(booked => {
        const [bsh, bsm] = booked.start.split(":").map(Number);
        const [beh, bem] = booked.end.split(":").map(Number);
        const bookedStart = bsh * 60 + bsm;
        const bookedEnd = beh * 60 + bem;
        return slotStart < bookedEnd && slotEnd > bookedStart;
      });
    });
  }, [dayAvailability, bookedSlots, duration]);

  // Filter dates to only show available days
  const availableDates = dateOptions.filter(d => {
    const dayAvail = availability.find(a => a.day_of_week === d.dayOfWeek && a.enabled);
    return !!dayAvail;
  });

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading availability...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Date Selection */}
      <div>
        <Label className="text-xs flex items-center gap-1.5 mb-2">
          <Clock className="h-3.5 w-3.5" /> Select Date
        </Label>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {availableDates.slice(0, 10).map(d => (
            <button
              key={d.value}
              onClick={() => { onDateChange(d.value); onTimeChange(""); }}
              className={cn(
                "shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors border",
                selectedDate === d.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/50 text-foreground border-border hover:bg-secondary"
              )}
            >
              {d.label}
            </button>
          ))}
          {availableDates.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No availability configured</p>
          )}
        </div>
      </div>

      {/* Time Slot Selection */}
      {selectedDate && (
        <div>
          <Label className="text-xs mb-2 block">Available Times</Label>
          {!dayAvailability ? (
            <p className="text-xs text-muted-foreground py-2">Not available on this day</p>
          ) : availableSlots.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No available slots — all times booked</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto">
              {availableSlots.map(slot => (
                <button
                  key={slot}
                  onClick={() => onTimeChange(slot)}
                  className={cn(
                    "px-2 py-2 rounded-lg text-xs font-medium transition-colors border text-center",
                    selectedTime === slot
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/50 text-foreground border-border hover:bg-secondary"
                  )}
                >
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
