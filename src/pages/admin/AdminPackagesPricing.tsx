import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Check, X, Save, Landmark, ShieldCheck, Calculator, ListChecks, Settings2, Receipt, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { NewLightHero } from "@/components/admin/NewLightHero";
import { DEFAULT_PACKAGES, PACKAGE_ORDER, defaultPrices, money, type PackageDefaults, type PackageKey } from "@/lib/packages";
import PlanBuilder, { initialPlanState, type PlanState } from "@/components/packages/PlanBuilder";
import { usePackageDefaults, MethodTag } from "@/components/packages/PlanPreview";
import { AdminDealPlan } from "@/components/packages/PlanAccount";

/**
 * Packages & Pricing (admin): approvals for custom prices, every upcoming / overdue charge, package defaults,
 * a simulator (same engine as Form 2 and Pay & Sign), wire details, and the rules in plain words.
 */
type Tab = "approvals" | "billing" | "defaults" | "simulator" | "wire" | "rules";
const TABS: { k: Tab; label: string; icon: any }[] = [
  { k: "approvals", label: "Approvals", icon: ShieldCheck },
  { k: "billing", label: "Charges", icon: Receipt },
  { k: "simulator", label: "Simulator", icon: Calculator },
  { k: "defaults", label: "Defaults", icon: Settings2 },
  { k: "wire", label: "Wire details", icon: Landmark },
  { k: "rules", label: "Rules", icon: BookOpen },
];
const PK: Record<string, string> = { growth: "Growth", command_center: "Command Center", enterprise: "Enterprise" };

export default function AdminPackagesPricing() {
  const [tab, setTab] = useState<Tab>("approvals");
  const { defs, loaded, reload } = usePackageDefaults();
  return (
    <div className="space-y-5">
      <NewLightHero title="Packages & Pricing" subtitle="Growth · Command Center · Enterprise — prices, approvals, charges and wires" />
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${tab === t.k ? "border-sky-400/60 bg-sky-400/10 text-white" : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white"}`}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>
      {!loaded ? <Loader2 className="h-5 w-5 animate-spin text-white/40" /> : (
        <>
          {tab === "approvals" && <Approvals />}
          {tab === "billing" && <Charges />}
          {tab === "simulator" && <Simulator defs={defs} />}
          {tab === "defaults" && <Defaults defs={defs} onSaved={reload} />}
          {tab === "wire" && <WireSettings />}
          {tab === "rules" && <Rules defs={defs} />}
        </>
      )}
    </div>
  );
}

const card = "rounded-xl border border-white/10 bg-white/[0.02] p-4";

/* ---------- approvals ---------- */
function Approvals() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    const db = supabase as any;
    const { data } = await db.from("crm_deals").select("id, deal_name, package, billing_cadence, initial_fee, recurring_fee, pricing_model, avg_client_value, pricing_defaults, assigned_user, created_at")
      .eq("price_approval_status", "pending").order("created_at", { ascending: false });
    const ids = Array.from(new Set((data || []).map((d: any) => d.assigned_user).filter(Boolean)));
    const { data: emps } = ids.length ? await db.from("employee_profiles").select("user_id, full_name").in("user_id", ids) : { data: [] };
    const nm = new Map((emps || []).map((e: any) => [e.user_id, e.full_name]));
    setRows((data || []).map((d: any) => ({ ...d, rep: nm.get(d.assigned_user) || "—" })));
  }, []);
  useEffect(() => { load(); }, [load]);
  const decide = async (id: string, approve: boolean) => {
    setBusy(id);
    const { data, error } = await supabase.functions.invoke("nl-billing", { body: { action: approve ? "approve_price" : "reject_price", deal_id: id } });
    setBusy(null);
    const err = (error as any)?.message || (data as any)?.error;
    if (err) { toast({ title: "Couldn't update", description: err, variant: "destructive" }); return; }
    toast({ title: approve ? "Approved — the salesman can send Pay & Sign" : "Rejected — the salesman was emailed" });
    load();
  };
  if (!rows) return <Loader2 className="h-5 w-5 animate-spin text-white/40" />;
  return (
    <div className={card}>
      <div className="text-sm font-semibold text-white mb-1">Custom prices waiting for approval</div>
      <p className="text-xs text-white/45 mb-3">Prices more than the allowed % under the default. The Pay &amp; Sign link is locked until you approve.</p>
      {rows.length === 0 ? <p className="py-4 text-center text-sm text-white/40">Nothing waiting.</p> : (
        <div className="space-y-2">
          {rows.map((d) => {
            const dflt = d.pricing_defaults || {};
            const off = (v: number, def: number) => (def ? Math.round((1 - v / def) * 100) : 0);
            return (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                <div className="text-xs text-white/80">
                  <div className="text-sm font-semibold text-white">{d.deal_name} <span className="text-white/45 font-normal">· {PK[d.package]} · {d.rep}</span></div>
                  <div>Setup <b>{money(d.initial_fee)}</b> <span className="text-white/45">(default {money(dflt.setup)}, {off(Number(d.initial_fee), Number(dflt.setup))}% off)</span></div>
                  {d.pricing_model !== "commission" && <div>Monthly <b>{money(d.recurring_fee)}</b> <span className="text-white/45">(default {money(dflt.monthly)}, {off(Number(d.recurring_fee), Number(dflt.monthly))}% off)</span></div>}
                  {d.avg_client_value && <div className="text-white/45">Average client {money(d.avg_client_value)}</div>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy === d.id} onClick={() => decide(d.id, true)}><Check className="h-3.5 w-3.5 mr-1" />Approve</Button>
                  <Button size="sm" variant="outline" disabled={busy === d.id} onClick={() => decide(d.id, false)}><X className="h-3.5 w-3.5 mr-1" />Reject</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- charges ---------- */
function Charges() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<"attention" | "upcoming" | "paid">("attention");
  useEffect(() => {
    (async () => {
      const db = supabase as any;
      const { data } = await db.from("nl_billing_schedule").select("*, deal:crm_deals(id, deal_name, package, work_paused_at)").neq("status", "cancelled").order("due_date").limit(1000);
      setRows(data || []);
    })();
  }, [open]);
  const today = new Date().toISOString().slice(0, 10);
  const in45 = new Date(Date.now() + 45 * 86400_000).toISOString().slice(0, 10);
  const list = useMemo(() => (rows || []).filter((r) =>
    filter === "attention" ? (r.status === "failed" || r.status === "processing" || (r.status === "scheduled" && r.due_date <= today) || (r.method === "wire" && r.status === "scheduled" && r.due_date <= in45))
      : filter === "upcoming" ? r.status === "scheduled" && r.due_date > today
      : r.status === "paid"), [rows, filter, today, in45]);
  const sum = (f: (r: any) => boolean) => (rows || []).filter(f).reduce((s, r) => s + Number(r.amount || 0), 0);
  const month = today.slice(0, 7);
  if (!rows) return <Loader2 className="h-5 w-5 animate-spin text-white/40" />;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { k: "Collected this month", v: money(sum((r) => r.status === "paid" && (r.paid_at || "").slice(0, 7) === month)) },
          { k: "Due next 30 days", v: money(sum((r) => r.status === "scheduled" && r.due_date >= today && r.due_date <= new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10))) },
          { k: "Failed / overdue", v: money(sum((r) => r.status === "failed" || (r.status === "scheduled" && r.due_date < today))) },
          { k: "Wires outstanding", v: money(sum((r) => r.method === "wire" && r.status === "scheduled")) },
        ].map((t) => (
          <div key={t.k} className="rounded-xl px-3 py-2.5 border border-white/10 bg-white/[0.03]">
            <div className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">{t.k}</div>
            <div className="text-lg font-bold tabular-nums text-white">{t.v}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {(["attention", "upcoming", "paid"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-2.5 py-1 text-xs font-semibold ${filter === f ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}>
            {f === "attention" ? "Needs attention" : f === "upcoming" ? "Upcoming" : "Paid"}
          </button>
        ))}
      </div>
      <div className={card}>
        {list.length === 0 ? <p className="py-4 text-center text-sm text-white/40">{filter === "attention" ? "Nothing needs attention." : "None."}</p> : (
          <div className="space-y-1">
            {list.map((r) => (
              <div key={r.id}>
                <button onClick={() => setOpen(open === r.deal_id ? null : r.deal_id)} className="w-full flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-white/[0.04]">
                  <span className="flex items-center gap-2 text-white/85">
                    <span className="tabular-nums text-white/50 w-24">{r.due_date}</span>
                    <MethodTag method={r.method} />
                    <b className="text-white">{r.deal?.deal_name}</b>
                    <span className="text-white/50">{PK[r.deal?.package]} · {r.label}</span>
                    {r.deal?.work_paused_at && <span className="rounded bg-red-500/15 px-1 text-[9px] font-bold text-red-300">PAUSED</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold ${r.status === "failed" || (r.status === "scheduled" && r.due_date < today) ? "text-red-300" : r.status === "paid" ? "text-emerald-300" : "text-sky-300"}`}>
                      {r.status === "scheduled" && r.due_date < today ? "overdue" : r.status}
                    </span>
                    <span className="tabular-nums font-semibold text-white">{r.amount != null ? money(r.amount, true) : "—"}</span>
                  </span>
                </button>
                {open === r.deal_id && <div className="px-2 pb-3 pt-1"><AdminDealPlan dealId={r.deal_id} /></div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- simulator ---------- */
function Simulator({ defs }: { defs: Record<PackageKey, PackageDefaults> }) {
  const [plan, setPlan] = useState<PlanState>(() => initialPlanState(defs, 10000));
  return (
    <div className={card}>
      <div className="text-sm font-semibold text-white mb-1">Plan simulator</div>
      <p className="text-xs text-white/45 mb-3">Same engine as Form 2 and Pay &amp; Sign. Change anything to see every charge, its date, and whether it's a wire or automatic.</p>
      <PlanBuilder defs={defs} value={plan} onChange={setPlan} showSignDate />
    </div>
  );
}

/* ---------- defaults ---------- */
const FIELDS: { k: keyof PackageDefaults; label: string; only?: PackageKey[]; suffix?: string }[] = [
  { k: "setup_fee", label: "Setup fee ($)", only: ["command_center", "enterprise"] },
  { k: "setup_multiplier", label: "Setup = × average client", only: ["growth"] },
  { k: "monthly_multiplier", label: "Monthly = × average client" },
  { k: "commission_rate", label: "Commission year 1 (%)", only: ["growth"] },
  { k: "commission_rate_ongoing", label: "Commission after (%)", only: ["growth"] },
  { k: "guarantee_days", label: "Guarantee (days)", only: ["growth"] },
  { k: "min_ad_budget", label: "Minimum ad budget ($/mo)", only: ["growth"] },
  { k: "annual_discount_pct", label: "Annual discount (%)" },
  { k: "payment_plan_markup_pct", label: "Payment plan markup (%)" },
  { k: "discount_approval_pct", label: "Needs approval if more than (%) under default" },
];
function Defaults({ defs, onSaved }: { defs: Record<PackageKey, PackageDefaults>; onSaved: () => void }) {
  const [draft, setDraft] = useState<Record<PackageKey, PackageDefaults>>(defs);
  const [saving, setSaving] = useState<PackageKey | null>(null);
  useEffect(() => setDraft(defs), [defs]);
  const save = async (k: PackageKey) => {
    setSaving(k);
    const d = draft[k];
    const row: any = { key: k, updated_at: new Date().toISOString() };
    for (const f of FIELDS) if (!f.only || f.only.includes(k)) row[f.k] = d[f.k];
    row.label = d.label; row.steps = d.steps;
    const { data: u } = await supabase.auth.getUser();
    row.updated_by = u.user?.id ?? null;
    const { error } = await (supabase as any).from("nl_package_defaults").upsert(row);
    setSaving(null);
    if (error) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${d.label} defaults saved`, description: "New Form 2s use these. Signed clients keep their price until renewal." });
    onSaved();
  };
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {PACKAGE_ORDER.map((k) => {
        const d = draft[k];
        const ex = defaultPrices(d, 10000);
        return (
          <div key={k} className={card}>
            <Input value={d.label} onChange={(e) => setDraft({ ...draft, [k]: { ...d, label: e.target.value } })} className="bg-white/5 border-white/10 text-white font-semibold mb-1" />
            <Input value={d.steps} onChange={(e) => setDraft({ ...draft, [k]: { ...d, steps: e.target.value } })} className="bg-white/5 border-white/10 text-white/70 text-xs mb-3" />
            <div className="space-y-2">
              {FIELDS.filter((f) => !f.only || f.only.includes(k)).map((f) => (
                <label key={f.k} className="flex items-center justify-between gap-2 text-[11.5px] text-white/60">
                  <span>{f.label}</span>
                  <Input type="number" value={(d[f.k] as any) ?? ""} onChange={(e) => setDraft({ ...draft, [k]: { ...d, [f.k]: e.target.value === "" ? null : Number(e.target.value) } })}
                    className="w-28 h-8 bg-white/5 border-white/10 text-white text-right" />
                </label>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-white/40">At a $10,000 average client: setup {money(ex.setup)}, monthly {money(ex.monthly)}. Built-in default: {k === "growth" ? "1× / ½× average client" : `${money(DEFAULT_PACKAGES[k].setup_fee)} + ${DEFAULT_PACKAGES[k].monthly_multiplier}× average client a month`}. No price floor.</p>
            <Button size="sm" className="mt-3 w-full" disabled={saving === k} onClick={() => save(k)}>
              {saving === k ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-1" />Save {d.label}</>}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- wire settings ---------- */
const WIRE_FIELDS: [string, string][] = [
  ["account_name", "Account name (beneficiary)"], ["bank_name", "Bank name"], ["routing_number", "Routing number (ABA, for wires)"],
  ["account_number", "Account number"], ["swift_code", "SWIFT (international, optional)"], ["bank_address", "Bank address"], ["note", "Note shown to clients (optional)"],
];
function WireSettings() {
  const [v, setV] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    (supabase as any).from("nl_wire_settings").select("*").eq("id", true).maybeSingle().then(({ data }: any) => { setV(data || {}); setLoaded(true); });
  }, []);
  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const row: any = { id: true, updated_by: u.user?.id ?? null, updated_at: new Date().toISOString() };
    for (const [k] of WIRE_FIELDS) row[k] = (v[k] || "").trim() || null;
    const { error } = await (supabase as any).from("nl_wire_settings").upsert(row);
    setSaving(false);
    if (error) { toast({ title: "Couldn't save", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Wire details saved", description: "Clients see these on Pay & Sign and their billing page when a wire is due." });
  };
  if (!loaded) return <Loader2 className="h-5 w-5 animate-spin text-white/40" />;
  return (
    <div className={`${card} max-w-xl`}>
      <div className="text-sm font-semibold text-white mb-1">Where clients send wires</div>
      <p className="text-xs text-white/45 mb-3">Admins only. Shown to a client only when they owe a wire (annual payments, and Command Center / Enterprise setup). Every wire email says NewLight never changes bank details by email.</p>
      <div className="space-y-2">
        {WIRE_FIELDS.map(([k, label]) => (
          <label key={k} className="block text-[11.5px] text-white/60">{label}
            <Input type={k === "account_number" && !reveal ? "password" : "text"} autoComplete="off" value={v[k] || ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} className="mt-1 bg-white/5 border-white/10 text-white" />
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" disabled={saving} onClick={save}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-1" />Save</>}</Button>
        <button className="text-xs text-white/50 hover:text-white" onClick={() => setReveal(!reveal)}>{reveal ? "Hide" : "Show"} account number</button>
      </div>
    </div>
  );
}

/* ---------- rules ---------- */
function Rules({ defs }: { defs: Record<PackageKey, PackageDefaults> }) {
  const g = defs.growth, c = defs.command_center, e = defs.enterprise;
  const cc = defaultPrices(c, 10000), en = defaultPrices(e, 10000);
  const sections: { h: string; items: string[] }[] = [
    { h: "Packages", items: [
      `${g.label} (${g.steps}): setup = ${g.setup_multiplier}× their average client. Then a retainer of ${g.monthly_multiplier}× average client a month, or commission ${g.commission_rate}% of new-client revenue in year 1, ${g.commission_rate_ongoing}% after. ${g.guarantee_days}-day guarantee. Ad budget minimum ${money(g.min_ad_budget)}/mo.`,
      `${c.label} (${c.steps}): ${money(cc.setup)} setup + ${c.monthly_multiplier}× their average client a month (${money(cc.monthly)}/mo at a $10,000 average client). No guarantee, no commission.`,
      `${e.label} (${e.steps}): ${money(en.setup)} setup + ${e.monthly_multiplier}× their average client a month (${money(en.monthly)}/mo at a $10,000 average client). Includes an exclusive metro market and a dedicated strategist. No guarantee, no commission, no ad minimum.`,
      "Average client value = their yearly revenue ÷ number of clients (Discovery numbers). There is no price floor. The monthly is worked out once at signing and stays a fixed dollar amount.",
    ] },
    { h: "Guarantee (Growth)", items: [
      "Starts on the day of the first payment.",
      "Ongoing billing starts on the 1st after the later of day 90 or \"made it back\" (new-client revenue ≥ setup paid). Admin confirms made-it-back with one tap.",
      "Reminders go out automatically at days 30, 60, 85 and 90, then weekly while working free.",
    ] },
    { h: "Payment options", items: [
      `Payment plan: setup × ${1 + g.payment_plan_markup_pct / 100}, split into 2 payments 30 days apart.`,
      `Annual: ${g.annual_discount_pct}% off. First year = (setup + 9 months) × ${(100 - g.annual_discount_pct) / 100} for Growth, (setup + 11 months — setup counts as month 1) × ${(100 - c.annual_discount_pct) / 100} for the others; every year after = 12 months × ${(100 - c.annual_discount_pct) / 100}. Charged on the signing date and each anniversary.`,
      "Monthly charges are on the 1st (Pacific). The first one covers the rest of the current month plus the next full month.",
    ] },
    { h: "Who pays how", items: [
      "Every annual payment: bank wire, every package, every year.",
      "Command Center / Enterprise setup: bank wire. Second payment-plan payment: automatic.",
      "Growth setup: automatic (Stripe).",
      "All monthly and commission charges: automatic — bank debit shown first, card second. Every client saves a method during Pay & Sign.",
    ] },
    { h: "Late and failed payments", items: [
      "Automatic charges retry on day 1 and day 3, then work pauses (client app read-only).",
      "Wires: reminders 30, 7 and 1 day before the due date; alerts on the due date and 1 day late; work pauses at 3 days late.",
      "Every alert goes to 805-836-3557, team@newlightgen.com, the salesman, and every client email and phone on the account (texts only if they opted in).",
    ] },
    { h: "Prices, approvals and changes", items: [
      "Prices fill in automatically. Salesmen can edit them; edited prices show a Custom price tag and go into the agreement.",
      `More than ${g.discount_approval_pct}% under the default needs admin approval before the Pay & Sign link can be sent.`,
      "Cancelling: 7 days' notice, no refunds. Annual doesn't renew if cancelled 7+ days before the anniversary.",
      "Upgrades are credited within 6 months. Downgrades only at renewal. Existing clients keep their price until renewal.",
      "Salesman pay: BDR 15% / SDR 20% of the setup (not the +10% plan markup). On a payment plan, half after each payment. Paid manually.",
    ] },
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {sections.map((s) => (
        <div key={s.h} className={card}>
          <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2"><ListChecks className="h-4 w-4 text-sky-300" />{s.h}</div>
          <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-white/70 list-disc pl-4">{s.items.map((i, n) => <li key={n}>{i}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}
