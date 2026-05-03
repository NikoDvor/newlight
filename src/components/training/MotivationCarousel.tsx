import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence, motion } from "framer-motion";

const FIELD_LABELS: Record<string, string> = {
  quote: "YOUR QUOTE",
  real_reason: "YOUR WHY",
  goal_1_month: "1 MONTH GOAL",
  goal_3_month: "3 MONTH GOAL",
  goal_6_month: "6 MONTH GOAL",
  goal_12_month: "12 MONTH GOAL",
  hard_day_letter: "WHEN IT GETS HARD",
  final_statement: "YOUR DECLARATION",
  anchor: "YOUR ANCHOR",
  what_i_will: "YOUR STANDARD",
};

const FIELD_KEYS = Object.keys(FIELD_LABELS);

interface Entry {
  field_key: string;
  field_value: string;
  label: string;
}

export function MotivationCarousel() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await (supabase as any)
        .from("nl_user_reflections")
        .select("field_key, field_value")
        .eq("user_id", user.id)
        .in("field_key", FIELD_KEYS);
      const filtered: Entry[] = (data || [])
        .filter((r: any) => r.field_value?.trim())
        .map((r: any) => ({ field_key: r.field_key, field_value: r.field_value, label: FIELD_LABELS[r.field_key] || r.field_key }));
      // Sort by FIELD_KEYS order
      filtered.sort((a, b) => FIELD_KEYS.indexOf(a.field_key) - FIELD_KEYS.indexOf(b.field_key));
      setEntries(filtered);
      setLoading(false);
    })();
  }, []);

  const go = useCallback((dir: 1 | -1) => {
    setIndex((prev) => (prev + dir + entries.length) % entries.length);
  }, [entries.length]);

  useEffect(() => {
    if (entries.length <= 1) return;
    timerRef.current = setInterval(() => setIndex((p) => (p + 1) % entries.length), 6000);
    return () => clearInterval(timerRef.current);
  }, [entries.length]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (entries.length > 1) timerRef.current = setInterval(() => setIndex((p) => (p + 1) % entries.length), 6000);
  }, [entries.length]);

  if (loading) return null;

  if (entries.length === 0) {
    return (
      <div
        className="rounded-[20px] p-8 text-center"
        style={{
          background: "hsla(215,35%,10%,.95)",
          border: "1px solid hsla(211,96%,60%,.2)",
          boxShadow: "0 0 40px hsla(211,96%,56%,.08)",
        }}
      >
        <p className="text-sm text-white/50">Complete Module 8 to unlock your personal motivation board</p>
      </div>
    );
  }

  const current = entries[index];

  return (
    <div
      className="relative rounded-[20px] p-8 overflow-hidden"
      style={{
        background: "hsla(215,35%,10%,.95)",
        border: "1px solid hsla(211,96%,60%,.2)",
        boxShadow: "0 0 40px hsla(211,96%,56%,.08)",
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${current.field_key}-${index}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="min-h-[80px]"
        >
          <p
            className="mb-3 text-[10px] font-bold tracking-[0.2em]"
            style={{ color: "hsl(211,96%,56%)" }}
          >
            {current.label}
          </p>
          <p className="text-lg font-medium leading-[1.7] text-white whitespace-pre-line">
            {current.field_value}
          </p>
        </motion.div>
      </AnimatePresence>

      {entries.length > 1 && (
        <>
          <button
            onClick={() => { go(-1); resetTimer(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-white/30 hover:text-white/70 transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => { go(1); resetTimer(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-white/30 hover:text-white/70 transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="flex justify-center gap-1.5 mt-5">
            {entries.map((_, i) => (
              <button
                key={i}
                onClick={() => { setIndex(i); resetTimer(); }}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === index ? 20 : 6,
                  background: i === index ? "hsl(211,96%,56%)" : "hsla(211,96%,56%,.25)",
                }}
                aria-label={`Go to entry ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
