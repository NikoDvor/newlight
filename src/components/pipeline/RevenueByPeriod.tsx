import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, CalendarRange } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney } from "@/lib/pipelineRevenue";
import { computeRevenuePeriods, type PeriodRow, type RevenueEvent } from "@/lib/revenuePeriods";

/**
 * Won revenue by period — Today / Week / Month / Quarter / Year / All-Time.
 *
 * Reads the SAME closed-won source as the Pipeline Revenue Opportunity widget:
 * the auto-logged `financial_adjustments` revenue rows for a workspace, or the
 * rep's own closed_won `crm_deals` when scoped to one salesperson. No second
 * definition of revenue is introduced here.
 */
export interface RevenueByPeriodProps {
  clientId: string | null | undefined;
  /** When set, the breakdown is scoped to this rep's own closed-won deals. */
  repUserId?: string | null;
  title?: string;
  subtitle?: string;
  className?: string;
}

const PANEL: React.CSSProperties = {
  background:
    "linear-gradient(155deg, hsla(215,40%,11%,.92) 0%, hsla(222,42%,7%,.94) 58%, hsla(211,60%,10%,.9) 100%)",
  border: "1px solid hsla(211,96%,60%,.16)",
  boxShadow:
    "0 24px 60px -32px hsla(211,96%,50%,.55), inset 0 1px 0 hsla(211,96%,80%,.07), inset 0 -30px 60px -50px hsla(211,96%,70%,.35)",
};

const SUBPANEL: React.CSSProperties = {
  background: "hsla(215,38%,10%,.62)",
  border: "1px solid hsla(211,96%,60%,.10)",
  boxShadow: "inset 0 1px 0 hsla(211,96%,85%,.05), inset 0 -18px 30px -30px hsla(211,96%,70%,.4)",
};

const ease = [0.22, 1, 0.36, 1] as any;

function Delta({ row }: { row: PeriodRow }) {
  if (row.compareLabel === null) {
    return <span className="text-[10px] text-white/35">since inception</span>;
  }
  if (row.changePct === null) {
    return (
      <span className="text-[10px] text-white/35">
        no {row.compareLabel.replace("vs ", "")} baseline
      </span>
    );
  }
  const up = row.changePct > 0.001;
  const down = row.changePct < -0.001;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const color = up ? "hsl(150,70%,58%)" : down ? "hsl(3,80%,66%)" : "hsla(0,0%,100%,.4)";
  return (
    <span className="text-[10px] flex items-center gap-1" style={{ color }}>
      <Icon className="h-3 w-3" />
      {up ? "+" : ""}
      {(row.changePct * 100).toFixed(0)}%
      <span className="text-white/30">{row.compareLabel}</span>
    </span>
  );
}

export function RevenueByPeriod({
  clientId,
  repUserId = null,
  title = "Revenue by Period",
  subtitle,
  className = "",
}: RevenueByPeriodProps) {
  const reduced = useReducedMotion();
  const [events, setEvents] = useState<RevenueEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      setLoading(true);
      try {
        if (repUserId) {
          const { data } = await (supabase as any)
            .from("crm_deals")
            .select("id,deal_value,close_date,created_at,pipeline_stage")
            .eq("client_id", clientId)
            .in("pipeline_stage", ["closed_won", "won"])
            .or(`assigned_user.eq.${repUserId},assigned_operator_user_id.eq.${repUserId}`)
            .limit(5000);
          if (!active) return;
          setEvents(
            (data ?? []).map((d: any) => ({
              amount: Number(d.deal_value) || 0,
              at: d.close_date || d.created_at,
            })),
          );
        } else {
          const { data } = await (supabase as any)
            .from("financial_adjustments")
            .select("id,amount,created_at,type")
            .eq("client_id", clientId)
            .eq("type", "revenue")
            .limit(5000);
          if (!active) return;
          setEvents(
            (data ?? []).map((r: any) => ({ amount: Number(r.amount) || 0, at: r.created_at })),
          );
        }
      } catch {
        if (active) setEvents([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [clientId, repUserId]);

  const rows = useMemo(() => computeRevenuePeriods(events), [events]);

  if (!clientId) return null;

  if (loading) {
    return (
      <div className={`rounded-2xl p-5 sm:p-6 ${className}`} style={PANEL}>
        <div className="h-4 w-44 rounded bg-white/[0.06] animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mt-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.section
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease }}
      className={`rounded-2xl overflow-hidden relative prv-grain ${className}`}
      style={PANEL}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, hsla(211,96%,70%,.5), transparent)" }}
      />
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold flex items-center gap-1.5">
              <CalendarRange className="h-3 w-3" style={{ color: "hsl(var(--nl-sky))" }} />
              {title}
            </p>
            <p className="text-xs text-white/45 mt-1">
              {subtitle ??
                (repUserId
                  ? "Your own closed-won revenue, same source as the team pipeline."
                  : "Closed-won revenue, same source as the pipeline widget.")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {rows.map((row, i) => (
            <motion.div
              key={row.key}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.06, duration: 0.45, ease }}
              className="rounded-xl p-3"
              style={SUBPANEL}
            >
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
                {row.label}
              </p>
              <p className="text-lg sm:text-xl font-semibold text-white mt-1 tabular-nums">
                {fmtMoney(row.total)}
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <Delta row={row} />
              </div>
              {row.key !== "all" && (
                <p className="text-[10px] text-white/30 mt-1">
                  {row.count} deal{row.count === 1 ? "" : "s"}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export default RevenueByPeriod;
