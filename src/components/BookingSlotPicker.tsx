import { useMemo, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BookingSlot {
  date: Date;
  label: string;
}

interface BookingSlotPickerProps {
  slots: BookingSlot[];
  selectedSlot: string;
  onSelectSlot: (iso: string) => void;
}

interface DayGroup {
  key: string;
  date: Date;
  weekday: string;
  dayNum: number;
  month: string;
  slots: BookingSlot[];
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function groupByDay(slots: BookingSlot[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const s of slots) {
    const d = s.date;
    const key = dayKey(d);
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        weekday: d.toLocaleDateString([], { weekday: "short" }),
        dayNum: d.getDate(),
        month: d.toLocaleDateString([], { month: "short" }),
        slots: [],
      };
      map.set(key, g);
    }
    g.slots.push(s);
  }
  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function BookingSlotPicker({ slots, selectedSlot, onSelectSlot }: BookingSlotPickerProps) {
  const days = useMemo(() => groupByDay(slots), [slots]);

  const selectedDayFromProp = selectedSlot ? dayKey(new Date(selectedSlot)) : null;
  const [browseDay, setBrowseDay] = useState<string | null>(null);

  const activeKey = selectedDayFromProp ?? browseDay ?? days[0]?.key ?? "";
  const activeDay = days.find(d => d.key === activeKey) ?? days[0];

  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!stripRef.current || !activeDay) return;
    const el = stripRef.current.querySelector<HTMLElement>(`[data-day-key="${activeDay.key}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeDay?.key]);

  if (days.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6 text-center text-sm text-white/60">
        No available times right now.
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-3 sm:p-4"
      style={{ boxShadow: "0 0 0 1px hsl(211 96% 56% / 0.08), 0 10px 40px -20px hsl(211 96% 56% / 0.25)" }}
    >
      <div className="mb-4">
        <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2 px-1">Select a date</div>
        <div
          ref={stripRef}
          className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x scroll-smooth"
          style={{ scrollbarWidth: "thin" }}
        >
          {days.map(d => {
            const active = d.key === activeDay?.key;
            return (
              <motion.button
                key={d.key}
                data-day-key={d.key}
                type="button"
                onClick={() => {
                  setBrowseDay(d.key);
                  if (selectedSlot && dayKey(new Date(selectedSlot)) !== d.key) onSelectSlot("");
                }}
                whileTap={{ scale: 0.96 }}
                className={cn(
                  "snap-start shrink-0 min-w-[68px] min-h-[64px] rounded-xl border px-3 py-2 flex flex-col items-center justify-center gap-0.5 transition-colors",
                  active
                    ? "bg-[hsl(211,96%,56%)] border-[hsl(211,96%,56%)] text-white shadow-[0_0_20px_-4px_hsl(211,96%,56%,0.6)]"
                    : "bg-white/5 border-white/10 text-white/75 hover:bg-white/10"
                )}
              >
                <span className="text-[10px] uppercase tracking-wider opacity-80">{d.weekday}</span>
                <span className="text-lg font-semibold leading-none">{d.dayNum}</span>
                <span className="text-[10px] opacity-70">{d.month}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2 px-1">
          {activeDay ? activeDay.date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }) : "Times"}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDay?.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
          >
            {activeDay?.slots.map(s => {
              const iso = s.date.toISOString();
              const active = iso === selectedSlot;
              return (
                <motion.button
                  key={iso}
                  type="button"
                  onClick={() => onSelectSlot(iso)}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ y: -1 }}
                  className={cn(
                    "relative min-h-[44px] rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
                    active
                      ? "bg-[hsl(211,96%,56%)] border-[hsl(211,96%,56%)] text-white shadow-[0_0_18px_-4px_hsl(211,96%,56%,0.7)] ring-1 ring-[hsl(211,96%,56%)]/40"
                      : "bg-white/5 border-white/10 text-white/85 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  {active && <Check className="h-3.5 w-3.5" />}
                  {formatTime(s.date)}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
