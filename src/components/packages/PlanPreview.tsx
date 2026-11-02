import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Landmark, CreditCard, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mergeDefaults, money, parseYmd, type PackageDefaults, type PackageKey, type PlanResult } from "@/lib/packages";

/** Package defaults from the DB (admin-editable), merged onto the built-in ones. */
export function usePackageDefaults() {
  const [defs, setDefs] = useState<Record<PackageKey, PackageDefaults>>(() => mergeDefaults([]));
  const [loaded, setLoaded] = useState(false);
  const reload = async () => {
    const { data } = await (supabase as any).from("nl_package_defaults").select("*");
    setDefs(mergeDefaults(data || []));
    setLoaded(true);
  };
  useEffect(() => { reload(); }, []);
  return { defs, loaded, reload };
}

const fmtDate = (s: string) => parseYmd(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Dated charge timeline — every charge with its amount, what it covers, and Wire vs Stripe (automatic). */
export default function PlanPreview({ plan, compact = false, maxLines = 14 }: { plan: PlanResult; compact?: boolean; maxLines?: number }) {
  const items = [
    ...plan.lines.map((l) => ({ date: l.date, type: "charge" as const, l })),
    ...plan.milestones.map((m) => ({ date: m.date, type: "milestone" as const, m })),
  ].sort((a, b) => a.date.localeCompare(b.date) || (a.type === "milestone" ? -1 : 1));
  const shown = items.slice(0, maxLines);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        {plan.annualFirst != null ? (
          <>
            <Stat label="Annual, first year" value={money(plan.annualFirst, true)} />
            <Stat label="Every year after" value={money(plan.annualRenewal, true)} />
            <Stat label="Paid by" value="Wire" />
          </>
        ) : (
          <>
            <Stat label="First 12 months" value={plan.firstYearTotal != null ? money(plan.firstYearTotal, true) : "Varies"} />
            <Stat label={plan.guaranteeEnds ? "Guarantee ends" : "Billing starts"} value={plan.guaranteeEnds ? fmtDate(plan.guaranteeEnds) : plan.billingStart ? fmtDate(plan.billingStart) : "—"} />
            <Stat label="Payment plan" value={plan.paymentPlanTotal != null ? money(plan.paymentPlanTotal, true) : "No"} />
          </>
        )}
      </div>
      <div className="relative pl-4">
        <div aria-hidden className="absolute left-[5px] top-1 bottom-1 w-px bg-gradient-to-b from-[hsl(197,100%,55%)] via-[hsla(197,100%,55%,.4)] to-transparent" />
        {shown.map((it, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}
            className={`relative mb-1.5 ${compact ? "py-1" : "py-1.5"}`}>
            <span aria-hidden className="absolute -left-4 top-1/2 h-px w-3" style={{ background: it.type === "milestone" ? "hsl(42,100%,60%)" : "hsl(197,100%,60%)" }} />
            {it.type === "milestone" ? (
              <div className="flex items-center gap-2 text-[11.5px] text-[hsl(42,100%,68%)]">
                <Flag className="h-3 w-3" /> <span className="tabular-nums">{fmtDate(it.m.date)}</span> · {it.m.label}
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] tabular-nums text-white/50">{fmtDate(it.l.date)}</span>
                    <MethodTag method={it.l.method} />
                  </div>
                  <div className="text-[13px] font-medium text-white">{it.l.label}</div>
                  {it.l.covers && <div className="text-[11px] text-white/45">{it.l.covers}</div>}
                </div>
                <div className="text-right text-[14px] font-semibold tabular-nums text-white">{it.l.amount != null ? money(it.l.amount, true) : "Varies"}</div>
              </div>
            )}
          </motion.div>
        ))}
        {items.length > shown.length && <p className="text-[11px] text-white/40">…and every month after on the 1st.</p>}
      </div>
    </div>
  );
}

export function MethodTag({ method }: { method: "stripe" | "wire" }) {
  return method === "wire" ? (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-bold tracking-wider text-[hsl(42,100%,65%)] bg-[hsla(42,100%,60%,.1)]"><Landmark className="h-2.5 w-2.5" />WIRE</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-bold tracking-wider text-[hsl(197,100%,65%)] bg-[hsla(197,100%,55%,.1)]"><CreditCard className="h-2.5 w-2.5" />AUTOMATIC</span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.04] px-2 py-2">
      <div className="text-[14px] font-bold tabular-nums text-white">{value}</div>
      <div className="text-[9.5px] uppercase tracking-wider text-white/45 mt-0.5">{label}</div>
    </div>
  );
}
