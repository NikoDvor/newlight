import { useEffect, useMemo } from "react";
import { Pencil, RotateCcw, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  PACKAGE_ORDER, buildPlan, defaultPrices, money, needsApproval,
  type Cadence, type Ongoing, type PackageDefaults, type PackageKey, type PlanResult,
} from "@/lib/packages";
import PlanPreview from "./PlanPreview";

export interface PlanState {
  pkg: PackageKey;
  avgClient: number;
  setup: number;
  monthly: number;
  editSetup: boolean;
  editMonthly: boolean;
  cadence: Cadence;
  paymentPlan: boolean;
  ongoing: Ongoing;
  commissionRate: number;
  commissionRateOngoing: number;
  signDate: string; // YYYY-MM-DD
}

export function initialPlanState(defs: Record<PackageKey, PackageDefaults>, avgClient = 0): PlanState {
  const p = defs.growth;
  const d = defaultPrices(p, avgClient);
  const today = new Date();
  return {
    pkg: "growth", avgClient, setup: d.setup, monthly: d.monthly, editSetup: false, editMonthly: false,
    cadence: "monthly", paymentPlan: false, ongoing: "retainer", commissionRate: p.commission_rate, commissionRateOngoing: p.commission_rate_ongoing,
    signDate: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
  };
}

export function planFromState(defs: Record<PackageKey, PackageDefaults>, s: PlanState): PlanResult {
  const [y, m, d] = s.signDate.split("-").map(Number);
  return buildPlan({
    pkg: defs[s.pkg], setup: s.setup, monthly: s.monthly, cadence: s.cadence, paymentPlan: s.paymentPlan,
    ongoing: s.pkg === "growth" ? s.ongoing : "retainer", commissionRate: s.commissionRate, commissionRateOngoing: s.commissionRateOngoing,
    signDate: new Date(Date.UTC(y, m - 1, d)),
  });
}

const chip = (on: boolean) =>
  `rounded-lg border px-3 py-2 text-[12.5px] font-semibold transition-all ${on ? "border-[hsl(197,100%,55%)] bg-[hsla(197,100%,55%,.12)] text-white shadow-[0_0_16px_-6px_hsl(197,100%,55%)]" : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white"}`;

function PriceField({ label, val, def, editing, onEdit, onVal, hint }: { label: string; val: number; def: number; editing: boolean; onEdit: (e: boolean) => void; onVal: (n: number) => void; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-white/50">{label}</span>
        {editing ? (
          <button type="button" onClick={() => { onEdit(false); onVal(def); }} className="inline-flex items-center gap-1 text-[11px] text-white/55 hover:text-white"><RotateCcw className="h-3 w-3" />Default</button>
        ) : (
          <button type="button" onClick={() => onEdit(true)} className="inline-flex items-center gap-1 text-[11px] text-[hsl(197,100%,65%)]"><Pencil className="h-3 w-3" />Edit</button>
        )}
      </div>
      {editing ? (
        <Input type="number" min={0} value={val || ""} onChange={(e) => onVal(Number(e.target.value || 0))} className="mt-1.5 bg-white/5 border-white/10 text-white text-lg font-semibold" autoFocus />
      ) : (
        <div className="mt-1 text-xl font-bold tabular-nums text-white">{money(val)}</div>
      )}
      <div className="mt-1 flex items-center gap-2 text-[10.5px] text-white/40">
        {editing && Math.abs(val - def) > 0.5 && <span className="rounded bg-[hsla(42,100%,60%,.12)] px-1.5 py-0.5 font-bold text-[hsl(42,100%,65%)]">CUSTOM PRICE</span>}
        <span>{hint || `Default ${money(def)}`}</span>
      </div>
    </div>
  );
}

/**
 * Package + price + payment-option picker with a live dated preview.
 * Prices fill in automatically (Growth from the average client value); each has an Edit pencil for negotiated numbers.
 */
export default function PlanBuilder({ defs, value, onChange, showSignDate = false, lockAvgFromDiscovery }: {
  defs: Record<PackageKey, PackageDefaults>;
  value: PlanState;
  onChange: (v: PlanState) => void;
  showSignDate?: boolean;
  lockAvgFromDiscovery?: number | null; // average client value found in Discovery numbers
}) {
  const pkg = defs[value.pkg];
  const dflt = useMemo(() => defaultPrices(pkg, value.avgClient), [pkg, value.avgClient]);
  const set = (patch: Partial<PlanState>) => onChange({ ...value, ...patch });

  // Keep auto prices in sync unless the salesman edited them.
  useEffect(() => {
    const patch: Partial<PlanState> = {};
    if (!value.editSetup && value.setup !== dflt.setup) patch.setup = dflt.setup;
    if (!value.editMonthly && value.monthly !== dflt.monthly) patch.monthly = dflt.monthly;
    if (Object.keys(patch).length) onChange({ ...value, ...patch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dflt.setup, dflt.monthly, value.editSetup, value.editMonthly]);

  const plan = useMemo(() => planFromState(defs, value), [defs, value]);
  const approval = needsApproval(pkg, value.setup, value.pkg === "growth" && value.ongoing === "commission" ? dflt.monthly : value.monthly, dflt);
  const isGrowth = value.pkg === "growth";
  const belowFloor = isGrowth && value.avgClient > 0 && value.avgClient < pkg.min_avg_client;


  return (
    <div className="space-y-4">
      {/* Package */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {PACKAGE_ORDER.map((k) => (
          <button key={k} type="button" onClick={() => set({ pkg: k, editSetup: false, editMonthly: false, ongoing: k === "growth" ? value.ongoing : "retainer" })}
            className={`${chip(value.pkg === k)} text-left`}>
            <div className="text-[14px]">{defs[k].label}</div>
            <div className="mt-0.5 text-[10.5px] font-normal leading-snug text-white/50">{defs[k].steps}</div>
          </button>
        ))}
      </div>

      {/* Average client (Growth) */}
      {isGrowth && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <label className="text-[11px] uppercase tracking-wider text-white/50">Their average client value (per year)</label>
          <Input type="number" min={0} value={value.avgClient || ""} onChange={(e) => set({ avgClient: Number(e.target.value || 0) })}
            placeholder="e.g. 10000" className="mt-1.5 bg-white/5 border-white/10 text-white" />
          <p className="mt-1 text-[11px] text-white/45">
            {lockAvgFromDiscovery ? `From their Discovery numbers: ${money(lockAvgFromDiscovery)}. ` : "Revenue ÷ number of clients. "}
            Setup = 1 average client · retainer = ½ average client a month · minimum average {money(pkg.min_avg_client)}.
          </p>
          {belowFloor && <p className="mt-1 text-[11px] text-[hsl(42,100%,65%)]">Below the minimum — prices use {money(pkg.min_avg_client)}.</p>}
        </div>
      )}

      {/* Payment options */}
      <div className="flex flex-wrap gap-2">
        {(["monthly", "annual"] as const).map((c) => (
          <button key={c} type="button" onClick={() => set({ cadence: c, paymentPlan: c === "annual" ? false : value.paymentPlan, ongoing: c === "annual" ? "retainer" : value.ongoing })} className={chip(value.cadence === c)}>
            {c === "monthly" ? "Monthly" : `Annual · ${pkg.annual_discount_pct}% off`}
          </button>
        ))}
        {value.cadence === "monthly" && (
          <button type="button" onClick={() => set({ paymentPlan: !value.paymentPlan })} className={chip(value.paymentPlan)}>
            Payment plan · 2 payments (+{pkg.payment_plan_markup_pct}%)
          </button>
        )}
        {isGrowth && value.cadence === "monthly" && (["retainer", "commission"] as const).map((o) => (
          <button key={o} type="button" onClick={() => set({ ongoing: o })} className={chip(value.ongoing === o)}>
            {o === "retainer" ? "Retainer" : `Commission ${value.commissionRate}% / ${value.commissionRateOngoing}%`}
          </button>
        ))}
      </div>

      {/* Prices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <PriceField label="Setup" val={value.setup} def={dflt.setup} editing={value.editSetup}
          onEdit={(e) => set({ editSetup: e })} onVal={(n) => set({ setup: n })} />
        {!(isGrowth && value.ongoing === "commission" && value.cadence === "monthly") ? (
          <PriceField label={isGrowth ? "Monthly retainer (after 90 days)" : "Monthly"} val={value.monthly} def={dflt.monthly} editing={value.editMonthly}
            onEdit={(e) => set({ editMonthly: e })} onVal={(n) => set({ monthly: n })} />
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 grid grid-cols-2 gap-2">
            <label className="text-[11px] text-white/50">Year 1 %<Input type="number" value={value.commissionRate} onChange={(e) => set({ commissionRate: Number(e.target.value || 0) })} className="mt-1 bg-white/5 border-white/10 text-white" /></label>
            <label className="text-[11px] text-white/50">After %<Input type="number" value={value.commissionRateOngoing} onChange={(e) => set({ commissionRateOngoing: Number(e.target.value || 0) })} className="mt-1 bg-white/5 border-white/10 text-white" /></label>
          </div>
        )}
      </div>

      {showSignDate && (
        <label className="block text-[11px] uppercase tracking-wider text-white/50">Example signing date
          <Input type="date" value={value.signDate} onChange={(e) => set({ signDate: e.target.value })} className="mt-1 bg-white/5 border-white/10 text-white" />
        </label>
      )}

      {approval && (
        <div className="flex items-start gap-2 rounded-lg border border-[hsla(42,100%,60%,.4)] bg-[hsla(42,100%,60%,.08)] px-3 py-2 text-[12px] text-white">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[hsl(42,100%,62%)]" />
          More than {pkg.discount_approval_pct}% under the default — an admin must approve before the Pay &amp; Sign link can be sent.
        </div>
      )}

      <PlanPreview plan={plan} />
    </div>
  );
}
