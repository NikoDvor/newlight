import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, Layers, RotateCcw, Wallet, Target, Loader2, Check } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { PANEL, SUBPANEL, StatTile } from "@/components/pipeline/PipelineRevenueOpportunity";
import { fmtMoney, fmtPct } from "@/lib/pipelineRevenue";
import {
  EMPTY_INPUTS, baselineModel, computeDiscovery, projectModel,
  type DiscoveryInputs, type DiscoveryModel, type Period,
} from "@/lib/discoveryNumbers";

/**
 * Prospect mode of the Pipeline Revenue Opportunity panel — same visuals,
 * fed by the prospect's own numbers from the discovery call instead of our
 * pipeline. Saved per lead (nl_discovery_numbers), so the closing call can
 * reopen it. All maths in src/lib/discoveryNumbers.ts.
 */
const ease = [0.22, 1, 0.36, 1] as any;
const GREEN = "hsl(152 62% 55%)";
const GOLD = "hsl(var(--nl-gold))";
const SKY = "hsl(var(--nl-sky))";

const num = (s: string): number | null => {
  const n = Number(String(s).replace(/[^0-9.]/g, ""));
  return s.trim() === "" || !Number.isFinite(n) ? null : n;
};
const fmtNum = (n: number | null | undefined, digits = 0) =>
  n == null ? "—" : n.toLocaleString(undefined, { maximumFractionDigits: digits });

function PeriodSwitch({ value, onChange, disabled }: { value: Period; onChange: (p: Period) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex rounded-md overflow-hidden border border-white/10 text-[10px] shrink-0">
      {(["month", "year"] as const).map((p) => (
        <button key={p} type="button" disabled={disabled} onClick={() => onChange(p)}
          className={`px-1.5 py-0.5 ${value === p ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"}`}>
          {p === "month" ? "/mo" : "/yr"}
        </button>
      ))}
    </div>
  );
}

function Entry({
  label, hint, value, onChange, money, period, onPeriod, disabled,
}: {
  label: string; hint: string; value: number | null; onChange: (v: number | null) => void;
  money?: boolean; period?: Period; onPeriod?: (p: Period) => void; disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value == null ? "" : String(value));
  useEffect(() => { setDraft(value == null ? "" : String(value)); }, [value]);
  return (
    <div className="rounded-lg p-2.5" style={SUBPANEL}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">{label}</label>
        {period && onPeriod && <PeriodSwitch value={period} onChange={onPeriod} disabled={disabled} />}
      </div>
      <div className="flex items-center gap-1 mt-1">
        {money && <span className="text-sm text-white/40">$</span>}
        <input
          inputMode="decimal" disabled={disabled} value={draft} placeholder="—"
          onChange={(e) => { const v = e.target.value.replace(/[^0-9.,]/g, ""); setDraft(v); onChange(num(v.replace(/,/g, ""))); }}
          className="w-full bg-transparent text-lg font-semibold tabular-nums text-white/90 outline-none placeholder:text-white/20"
        />
      </div>
      <p className="text-[10px] text-white/30 leading-tight">{hint}</p>
    </div>
  );
}

function LeverRow({
  label, display, value, min, max, step, onChange, entry,
}: {
  label: string; display: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; entry: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] text-white/65 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {entry}
          <span className="text-[11px] tabular-nums font-semibold" style={{ color: SKY }}>{display}</span>
        </div>
      </div>
      <Slider className="mt-2 prv-slider" value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

export default function DiscoveryNumbersPanel({
  leadId, eventId, businessName, readOnly = false, className = "",
}: { leadId: string; eventId?: string | null; businessName?: string | null; readOnly?: boolean; className?: string }) {
  const reduced = useReducedMotion();
  const [inputs, setInputs] = useState<DiscoveryInputs>(EMPTY_INPUTS);
  const [model, setModel] = useState<DiscoveryModel | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [bizName, setBizName] = useState<string | null>(businessName ?? null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loaded.current = false;
    setLoading(true);
    (async () => {
      const db = supabase as any;
      const [{ data: row }, { data: lead }] = await Promise.all([
        db.from("nl_discovery_numbers").select("*").eq("lead_id", leadId).maybeSingle(),
        db.from("nl_bdr_leads").select("user_id, business_name").eq("id", leadId).maybeSingle(),
      ]);
      if (cancelled) return;
      setOwnerId(lead?.user_id ?? null);
      if (lead?.business_name) setBizName(lead.business_name);
      if (row) {
        const n = (v: any) => (v == null ? null : Number(v));
        setInputs({
          firm_type: row.firm_type, goal_revenue: n(row.goal_revenue), goal_revenue_period: row.goal_revenue_period,
          goal_clients: n(row.goal_clients), current_revenue: n(row.current_revenue), current_revenue_period: row.current_revenue_period,
          current_clients: n(row.current_clients), new_leads: n(row.new_leads), new_leads_period: row.new_leads_period,
          leads_per_client: n(row.leads_per_client),
        });
        setModel(row.model_leads != null || row.model_close_rate != null || row.model_ticket != null
          ? { leads: Number(row.model_leads ?? 0), closeRate: Number(row.model_close_rate ?? 0), ticket: Number(row.model_ticket ?? 0) }
          : null);
      } else { setInputs(EMPTY_INPUTS); setModel(null); }
      setLoading(false);
      setTimeout(() => { loaded.current = true; }, 0);
    })();
    return () => { cancelled = true; };
  }, [leadId]);

  const result = useMemo(() => computeDiscovery(inputs), [inputs]);
  const base = useMemo(() => baselineModel(result), [result]);
  const m = model ?? base;
  const dirty = model != null && (Math.round(model.leads) !== Math.round(base.leads)
    || Math.abs(model.closeRate - base.closeRate) > 0.0005 || Math.round(model.ticket) !== Math.round(base.ticket));
  const proj = useMemo(() => projectModel(result, m), [result, m]);
  const isInsurance = inputs.firm_type === "insurance";
  const unit = isInsurance ? "policies" : "households";
  const unitOne = isInsurance ? "policy" : "client";

  // Autosave (debounced) once loaded.
  useEffect(() => {
    if (!loaded.current || readOnly || !ownerId) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      const { error } = await (supabase as any).from("nl_discovery_numbers").upsert({
        lead_id: leadId, user_id: ownerId, event_id: eventId || null, ...inputs,
        model_leads: model ? model.leads : null,
        model_close_rate: model ? Math.min(1, Math.max(0, model.closeRate)) : null,
        model_ticket: model ? model.ticket : null,
      }, { onConflict: "lead_id" });
      setSaveState(error ? "error" : "saved");
      if (error) console.error("discovery numbers save failed", error);
    }, 800);
    return () => clearTimeout(t);
  }, [inputs, model]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<DiscoveryInputs>) => { setInputs((p) => ({ ...p, ...patch })); };
  const setM = (patch: Partial<DiscoveryModel>) => setModel({ ...m, ...patch });

  if (loading) {
    return (
      <div className={`rounded-2xl p-6 ${className}`} style={PANEL}>
        <div className="h-5 w-56 rounded bg-white/[0.06] animate-pulse" />
        <div className="h-11 w-72 rounded bg-white/[0.05] animate-pulse mt-4" />
      </div>
    );
  }

  const leadsMax = Math.max(50, Math.round((base.leads || 20) * 3));
  const ticketMax = Math.max(20000, Math.round((base.ticket || 5000) * 3));
  const headline = result.gapRevenue;
  const tiles = [
    { label: "Where they are", color: "hsl(var(--nl-cyan))", big: fmtMoney(result.currentRevenue ?? 0), sub: `${fmtNum(result.currentClients)} ${unit} · per year` },
    { label: "Their goal", color: GOLD, big: fmtMoney(result.goalRevenue ?? 0), sub: `${fmtNum(result.goalClients)} ${unit} · per year` },
    { label: "The gap", color: "hsl(0 68% 62%)", big: fmtMoney(result.gapRevenue ?? 0), sub: `${fmtNum(result.gapClients)} ${unit}` },
    { label: "Current pace", color: GREEN, big: fmtMoney(result.newRevenue ?? 0), sub: `${fmtNum(result.newClients, 1)} new ${unit} / yr · ${fmtNum(result.leadsPerYear)} leads` },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}
      className={`rounded-2xl overflow-hidden relative prv-grain ${className}`} style={PANEL}
    >
      {/* ── headline ── */}
      <div className="p-5 sm:p-6 pb-4 relative">
        <div className="absolute inset-x-0 top-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsla(211,96%,70%,.5), transparent)" }} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" style={{ color: SKY }} />
              {bizName ? `${bizName} · ` : ""}Gap to goal
            </p>
            <div className="relative mt-2">
              {!reduced && <span className="prv-halo" aria-hidden />}
              <div className="relative overflow-hidden">
                {!reduced && <span className="prv-scan" aria-hidden />}
                <motion.div
                  key={`gap-${Math.round(headline ?? 0)}`}
                  initial={{ opacity: 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
                  className="relative text-[2rem] sm:text-[2.6rem] leading-none font-bold tabular-nums"
                  style={{
                    backgroundImage: "linear-gradient(120deg, hsl(var(--nl-ice)), hsl(var(--nl-sky)) 55%, hsl(var(--nl-electric)))",
                    WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
                    filter: "drop-shadow(0 2px 18px hsla(211,96%,60%,.35))",
                  }}
                >
                  {headline == null ? "—" : fmtMoney(headline)}
                </motion.div>
              </div>
            </div>
            <p className="text-[11px] text-white/45 mt-1.5">
              {result.missing.length
                ? `Enter ${result.missing.join(", ")} to finish the picture`
                : `Per year · ${fmtMoney(result.shortAtPace ?? 0)} still short at their current pace`}
            </p>
          </div>
          <div className="flex items-stretch gap-2.5">
            <StatTile icon={Wallet} label="Avg ticket" value={result.avgTicket == null ? "—" : fmtMoney(result.avgTicket)} sub={`per ${unitOne} / yr`} tone="good" />
            <StatTile icon={Target} label="Close rate" value={result.closeRate == null ? "—" : fmtPct(result.closeRate, 1)}
              sub={inputs.leads_per_client ? `1 in ${fmtNum(inputs.leads_per_client, 1)} leads` : "leads per client"} tone={(result.closeRate ?? 0) >= 0.2 ? "good" : "warn"} />
          </div>
        </div>
      </div>

      {/* ── their numbers (entries) ── */}
      <div className="px-5 sm:px-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">Their numbers</span>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <span className="text-[10px] text-white/35 inline-flex items-center gap-1">
                {saveState === "saving" ? <><Loader2 className="h-3 w-3 animate-spin" />Saving</> : saveState === "saved" ? <><Check className="h-3 w-3" />Saved</> : saveState === "error" ? <span className="text-red-400">Not saved</span> : null}
              </span>
            )}
            <div className="inline-flex rounded-md overflow-hidden border border-white/10 text-[10px]">
              {(["ria", "insurance"] as const).map((f) => (
                <button key={f} type="button" disabled={readOnly} onClick={() => set({ firm_type: f })}
                  className={`px-2 py-0.5 ${inputs.firm_type === f ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"}`}>
                  {f === "ria" ? "Advisor" : "Insurance"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-3">
          <Entry label="Goal revenue" hint="1 · next year's goal" money value={inputs.goal_revenue} disabled={readOnly}
            onChange={(v) => set({ goal_revenue: v })} period={inputs.goal_revenue_period} onPeriod={(p) => set({ goal_revenue_period: p })} />
          <Entry label={`Goal ${unit}`} hint="1 · next year's goal" value={inputs.goal_clients} disabled={readOnly}
            onChange={(v) => set({ goal_clients: v })} />
          <Entry label="Current revenue" hint="1b · where they are now" money value={inputs.current_revenue} disabled={readOnly}
            onChange={(v) => set({ current_revenue: v })} period={inputs.current_revenue_period} onPeriod={(p) => set({ current_revenue_period: p })} />
          <Entry label={`Current ${unit}`} hint="1b · where they are now" value={inputs.current_clients} disabled={readOnly}
            onChange={(v) => set({ current_clients: v })} />
          <Entry label="New leads" hint="4 · new clients × leads per client" value={inputs.new_leads} disabled={readOnly}
            onChange={(v) => set({ new_leads: v })} period={inputs.new_leads_period} onPeriod={(p) => set({ new_leads_period: p })} />
          <Entry label={`Leads per ${unitOne}`} hint={`4 · leads it takes to land one ${unitOne}`} value={inputs.leads_per_client} disabled={readOnly}
            onChange={(v) => set({ leads_per_client: v && v > 0 ? v : null })} />
        </div>
      </div>

      {/* ── where they are vs goal (same tile style as the funnel) ── */}
      <div className="px-5 sm:px-6 pb-5 grid gap-2.5 grid-cols-2 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <motion.div key={t.label}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.5, ease }}
            className="rounded-xl p-3.5 relative overflow-hidden prv-grain" style={SUBPANEL}>
            <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: t.color }} />
            <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: t.color }}>{t.label}</span>
            <span className="block text-xl sm:text-2xl font-bold text-white/90 tabular-nums mt-1.5">{t.big}</span>
            <p className="text-[11px] text-white/45 tabular-nums">{t.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── interactive model: our contribution ── */}
      <div className="px-5 sm:px-6 pb-6">
        <div className="rounded-xl p-4" style={SUBPANEL}>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <span className="text-[10px] uppercase tracking-wider text-white/45 font-semibold flex items-center gap-1.5">
              <Layers className="h-3 w-3" /> Missed revenue opportunity · drag to model
            </span>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-wider text-white/35">Added per year</p>
                <motion.p className="text-lg font-bold tabular-nums leading-none"
                  style={{ color: dirty ? GOLD : SKY }} animate={{ scale: dirty ? [1, 1.04, 1] : 1 }} transition={{ duration: 0.25 }}>
                  +{fmtMoney(proj.missedOpportunity)}
                </motion.p>
              </div>
              {dirty && !readOnly && (
                <button onClick={() => setModel(null)} className="text-[10px] text-white/45 hover:text-white/80 inline-flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3.5">
            <LeverRow label="New leads per year" display={fmtNum(m.leads)} value={Math.round(m.leads)} min={0} max={leadsMax} step={1}
              onChange={(v) => setM({ leads: v })}
              entry={<input inputMode="numeric" value={Math.round(m.leads)} disabled={readOnly}
                onChange={(e) => setM({ leads: num(e.target.value) ?? 0 })}
                className="w-20 rounded-md bg-white/[0.05] px-2 py-0.5 text-[12px] tabular-nums text-white/85 outline-none text-right" />} />
            <LeverRow label="Close rate" display={`${fmtPct(m.closeRate, 1)}${m.closeRate > 0 ? ` · 1 in ${fmtNum(1 / m.closeRate, 1)}` : ""}`}
              value={Math.round(m.closeRate * 1000) / 10} min={0} max={100} step={0.5}
              onChange={(v) => setM({ closeRate: v / 100 })}
              entry={<input inputMode="decimal" value={m.closeRate > 0 ? Math.round((1 / m.closeRate) * 10) / 10 : ""} placeholder="leads/client" disabled={readOnly}
                title={`Leads per ${unitOne}`}
                onChange={(e) => { const v = num(e.target.value); setM({ closeRate: v && v > 0 ? Math.min(1, 1 / v) : 0 }); }}
                className="w-20 rounded-md bg-white/[0.05] px-2 py-0.5 text-[12px] tabular-nums text-white/85 outline-none text-right" />} />
            <LeverRow label="Average ticket" display={fmtMoney(m.ticket)} value={Math.round(m.ticket)} min={0} max={ticketMax} step={100}
              onChange={(v) => setM({ ticket: v })}
              entry={<input inputMode="numeric" value={Math.round(m.ticket)} disabled={readOnly}
                onChange={(e) => setM({ ticket: num(e.target.value) ?? 0 })}
                className="w-24 rounded-md bg-white/[0.05] px-2 py-0.5 text-[12px] tabular-nums text-white/85 outline-none text-right" />} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { k: "New revenue / yr", v: fmtMoney(proj.modelRevenue) },
              { k: `${unit[0].toUpperCase()}${unit.slice(1)} needed for goal`, v: fmtNum(proj.clientsNeeded) },
              { k: "Leads needed for goal", v: fmtNum(proj.leadsNeeded) },
            ].map((x) => (
              <div key={x.k} className="rounded-md bg-white/[0.03] px-2.5 py-2">
                <p className="text-[9px] uppercase tracking-wider text-white/35">{x.k}</p>
                <p className="text-[13px] font-semibold tabular-nums text-white/85 leading-tight mt-0.5">{x.v}</p>
              </div>
            ))}
          </div>

          {proj.gapClosedShare != null && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-white/45 mb-1">
                <span>Gap closed: <span className="tabular-nums text-white/75">{fmtPct(proj.gapClosedShare)}</span></span>
                <span>Remaining: <span className="tabular-nums text-white/75">{fmtMoney(proj.gapRemaining ?? 0)}</span></span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.05]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${proj.gapClosedShare * 100}%` }} transition={{ duration: 0.5, ease }}
                  style={{ background: proj.gapClosedShare >= 1 ? GREEN : GOLD, height: "100%" }} />
              </div>
            </div>
          )}
          <p className="mt-2 text-[10px] text-white/35">
            Illustration from the numbers they gave, per year. Not a guarantee of results.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
