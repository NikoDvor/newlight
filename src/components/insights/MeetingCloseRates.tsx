import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Target, CalendarCheck, CalendarX, Repeat, Hourglass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LOST_REASON_LABEL } from "@/lib/pipelineRevenue";
import { computeMeetingCloseRates, type MeetingCloseRates as Model, type StageClose } from "@/lib/meetingCloseRates";

const pct = (r: number, n: number) => (n ? `${(r * 100).toFixed(1)}%` : "—");
const LOW_N = 5;

/**
 * Close rates for every meeting in the funnel, plus attendance and reschedules.
 * Main close rate = first booked meeting → won client (decided deals only).
 */
export function MeetingCloseRates({ clientId }: { clientId: string }) {
  const [model, setModel] = useState<Model | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = supabase as any;
      const [{ data: deals }, { data: meetings }] = await Promise.all([
        db.from("crm_deals").select("id,pipeline_stage,lost_reason").eq("client_id", clientId).limit(10000),
        db.from("sales_meetings").select("deal_id,meeting_type,status,attended,start_time").eq("client_id", clientId).limit(10000),
      ]);
      if (cancelled) return;
      setModel(computeMeetingCloseRates(deals ?? [], meetings ?? []));
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  if (!model || model.booked === 0) return null;
  const { main } = model;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 rounded-2xl border bg-card p-5"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(197 92% 48%))" }}>
          <Target className="h-3.5 w-3.5" style={{ color: "hsl(210 40% 98%)" }} />
        </div>
        <h3 className="text-base font-bold text-foreground">Close Rates by Meeting</h3>
        <span className="text-[11px] text-muted-foreground">All time · every meeting, reschedule and show-up, from your live pipeline</span>
      </div>

      {/* main close rate */}
      <div className="rounded-xl border p-4 mb-4 flex flex-wrap items-end gap-x-6 gap-y-2" style={{ borderColor: "hsl(var(--border))" }}>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Close rate · all time</p>
          <p className="text-4xl font-bold tabular-nums leading-none mt-1" style={{ color: "hsl(142 71% 40%)" }}>
            {pct(main.rate, main.n)}
          </p>
        </div>
        <div className="text-sm text-foreground/80 leading-snug">
          <p><span className="font-semibold">First booked meeting → won client.</span></p>
          <p className="text-muted-foreground text-[13px]">
            {main.hits} won of {main.n} decided
            {main.inProgress ? ` · ${main.inProgress} still in progress (not counted yet)` : ""}
            {main.n < LOW_N ? " · low sample" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 ml-auto">
          {model.mainByTier.filter((t) => t.n > 0).map((t) => (
            <div key={t.tier} className="rounded-lg px-2.5 py-1.5 text-[12px]" style={{ background: "hsl(var(--muted) / 0.5)" }}>
              <span className="text-muted-foreground">{t.tier === "0" ? "First meeting on time" : `First meeting ${t.label.toLowerCase()}`}</span>{" "}
              <span className="font-semibold tabular-nums text-foreground">{pct(t.rate, t.n)}</span>{" "}
              <span className="text-muted-foreground tabular-nums">({t.hits}/{t.n})</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {model.stages.map((s) => <StageCard key={s.kind} s={s} />)}
      </div>
    </motion.div>
  );
}

function StageCard({ s }: { s: StageClose }) {
  const a = s.attendance;
  return (
    <div className="rounded-xl border p-4 min-w-0" style={{ borderColor: "hsl(var(--border))" }}>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{s.label}</p>
      <p className="text-2xl font-bold tabular-nums mt-1 text-foreground">{pct(s.close.rate, s.close.n)}</p>
      <p className="text-[12px] text-muted-foreground leading-snug">
        {s.question} · {s.close.hits} of {s.close.n}
        {s.inProgress ? ` · ${s.inProgress} in progress` : ""}
      </p>

      <div className="grid grid-cols-2 gap-1.5 mt-3 text-[12px]">
        <Mini icon={CalendarCheck} label="Show-up" value={a.held + a.noShow ? `${(a.showRate * 100).toFixed(1)}%` : "—"} />
        <Mini icon={CalendarX} label="No-shows" value={String(a.noShow)} />
        <Mini icon={Repeat} label="Rescheduled" value={String(a.rescheduled)} />
        <Mini icon={Hourglass} label="Upcoming" value={String(a.upcoming)} />
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5">
        {a.held} held of {a.booked} past bookings{a.cancelled ? ` · ${a.cancelled} cancelled` : ""}
      </p>

      <div className="mt-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Close rate by reschedules</p>
        <table className="w-full text-[12px]">
          <tbody>
            {s.byTier.map((t) => (
              <tr key={t.tier} className="border-t" style={{ borderColor: "hsl(var(--border))" }}>
                <td className="py-1 pr-2 text-foreground/80">{t.label}</td>
                <td className="py-1 text-right tabular-nums text-foreground">{pct(t.rate, t.n)}</td>
                <td className="py-1 pl-2 text-right tabular-nums text-muted-foreground w-12">n={t.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {s.topLostReason && (
        <p className="text-[12px] text-foreground/80 mt-3">
          Lost here: <span className="font-semibold">{s.lostHere}</span> · top reason{" "}
          <span className="font-semibold">{LOST_REASON_LABEL[s.topLostReason.reason] || s.topLostReason.reason}</span>{" "}
          ({s.topLostReason.count})
        </p>
      )}
    </div>
  );
}

function Mini({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg px-2 py-1.5 flex items-center gap-1.5 min-w-0" style={{ background: "hsl(var(--muted) / 0.5)" }}>
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground truncate">{label}</span>
      <span className="ml-auto font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}
