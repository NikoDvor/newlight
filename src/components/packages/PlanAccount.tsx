import { useCallback, useEffect, useState } from "react";
import { Loader2, Landmark, CreditCard, CheckCircle2, AlertTriangle, PauseCircle, Plus, RotateCw, Ban, PlayCircle, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { money, parseYmd } from "@/lib/packages";

/**
 * Package plan on a client account: guarantee tracker (Growth), every scheduled charge, revenue from new clients.
 * AdminDealPlan → Client Records (full controls). ClientPlan → the client's Billing page (read + report revenue).
 */

const PKG_LABEL: Record<string, string> = { growth: "Growth", command_center: "Command Center", enterprise: "Enterprise" };
const fmtD = (s: string | null | undefined) => (s ? parseYmd(s.slice(0, 10)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—");
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000));

interface PlanData {
  plan: any | null;
  schedule: any[];
  revenue: any[];
  made_back: number;
  wire?: any | null;
  wire_reference?: string;
}

async function invokeBilling(body: any) {
  const { data, error } = await supabase.functions.invoke("nl-billing", { body });
  const err = (error as any)?.message || (data as any)?.error;
  if (err) throw new Error(err);
  return data as any;
}

/* ---------- pieces ---------- */

function GuaranteeTracker({ deal, madeBack, dark }: { deal: any; madeBack: number; dark: boolean }) {
  if (deal.package !== "growth") return null;
  const goal = Number(deal.initial_fee || 0);
  const pct = goal ? Math.min(100, Math.round((madeBack / goal) * 100)) : 0;
  const started = deal.guarantee_started_at;
  const day = started ? daysSince(started) : 0;
  const dayPct = Math.min(100, Math.round((day / 90) * 100));
  const done = !!deal.billing_start_date;
  const muted = dark ? "text-white/55" : "text-muted-foreground";
  const strong = dark ? "text-white" : "text-foreground";
  const track = dark ? "bg-white/10" : "bg-muted";
  return (
    <div className={`rounded-xl border p-4 ${dark ? "border-white/10 bg-white/[0.03]" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className={`text-sm font-semibold ${strong} flex items-center gap-2`}><Trophy className="h-4 w-4 text-amber-400" />90-day commitment (continued service)</div>
        <div className={`text-xs ${muted}`}>
          {!started ? "Starts at the first payment" : done ? `Made it back · billing from ${fmtD(deal.billing_start_date)}` : day <= 90 ? `Day ${day} of 90` : `Day ${day} — working free until made back`}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div>
          <div className={`flex justify-between text-[11px] ${muted}`}><span>Made back from new clients</span><span className={`tabular-nums font-semibold ${strong}`}>{money(madeBack)} of {money(goal)} · {pct}%</span></div>
          <div className={`mt-1 h-2.5 rounded-full ${track} overflow-hidden`}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? "hsl(152,70%,45%)" : "linear-gradient(90deg,hsl(197,100%,50%),hsl(211,96%,60%))" }} />
          </div>
        </div>
        {started && !done && (
          <div>
            <div className={`flex justify-between text-[11px] ${muted}`}><span>Time</span><span className="tabular-nums">{Math.min(day, 90)} / 90 days{deal.guarantee_ends_at ? ` · ends ${fmtD(deal.guarantee_ends_at)}` : ""}</span></div>
            <div className={`mt-1 h-1.5 rounded-full ${track} overflow-hidden`}><div className="h-full rounded-full bg-amber-400/80" style={{ width: `${dayPct}%` }} /></div>
          </div>
        )}
      </div>
      <p className={`mt-2 text-[11px] ${muted}`}>
        Ongoing {deal.pricing_model === "commission" ? "commission" : "retainer"} billing starts on the 1st after day 90 <b>and</b> once the setup fee has been made back — whichever is later.
      </p>
    </div>
  );
}

const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "text-sky-300 bg-sky-400/10" },
  processing: { label: "Processing", cls: "text-indigo-300 bg-indigo-400/10" },
  paid: { label: "Paid", cls: "text-emerald-300 bg-emerald-400/10" },
  failed: { label: "Failed", cls: "text-red-300 bg-red-400/10" },
  waived: { label: "Waived", cls: "text-white/50 bg-white/5" },
};

function ScheduleTable({ rows, dark, onAction, busy }: { rows: any[]; dark: boolean; onAction?: (a: string, row: any) => void; busy?: string | null }) {
  if (!rows.length) return <p className={`text-xs ${dark ? "text-white/45" : "text-muted-foreground"}`}>No charges scheduled yet — they appear once the agreement is signed.</p>;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className={dark ? "text-left text-white/45" : "text-left text-muted-foreground"}>
          {["Due", "Charge", "Method", "Amount", "Status", onAction ? "" : null].filter((h) => h !== null).map((h) => <th key={h as string} className="py-1.5 pr-3 font-medium whitespace-nowrap">{h}</th>)}
        </tr></thead>
        <tbody>
          {rows.map((r) => {
            const st = STATUS[r.status] || STATUS.scheduled;
            const late = r.status === "scheduled" && r.due_date < today;
            return (
              <tr key={r.id} className={`border-t ${dark ? "border-white/5 text-white/85" : "border-border"} align-top`}>
                <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums">{fmtD(r.due_date)}</td>
                <td className="py-1.5 pr-3"><div className="font-medium">{r.label}</div>{r.covers && <div className={dark ? "text-white/40" : "text-muted-foreground"}>{r.covers}</div>}{r.failure_reason && r.status === "failed" && <div className="text-red-400">{r.failure_reason}</div>}</td>
                <td className="py-1.5 pr-3 whitespace-nowrap">{r.method === "wire" ? <span className="inline-flex items-center gap-1 text-amber-400"><Landmark className="h-3 w-3" />Wire</span> : <span className="inline-flex items-center gap-1 text-sky-400"><CreditCard className="h-3 w-3" />Automatic</span>}</td>
                <td className="py-1.5 pr-3 whitespace-nowrap tabular-nums font-semibold">{r.amount != null ? money(r.amount, true) : "Calculated monthly"}</td>
                <td className="py-1.5 pr-3 whitespace-nowrap"><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${late ? "text-amber-300 bg-amber-400/10" : st.cls}`}>{late ? "Overdue" : st.label}</span></td>
                {onAction && (
                  <td className="py-1.5 whitespace-nowrap">
                    <div className="flex gap-1">
                      {r.method === "wire" && r.status === "scheduled" && (
                        <Button size="sm" className="h-6 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700" disabled={busy === r.id} onClick={() => onAction("wire_received", r)}>
                          {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3 mr-1" />Wire received</>}
                        </Button>
                      )}
                      {r.method === "stripe" && r.status === "failed" && (
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[11px]" disabled={busy === r.id} onClick={() => onAction("retry_now", r)}><RotateCw className="h-3 w-3 mr-1" />Retry</Button>
                      )}
                      {["scheduled", "failed"].includes(r.status) && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-white/50" disabled={busy === r.id} onClick={() => onAction("waive", r)}><Ban className="h-3 w-3 mr-1" />Waive</Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RevenueForm({ onSubmit, dark }: { onSubmit: (v: { new_client_label: string; client_started_on: string; month: string; revenue: number }) => Promise<void>; dark: boolean }) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [v, setV] = useState({ new_client_label: "", client_started_on: "", month: thisMonth, revenue: "" });
  const [busy, setBusy] = useState(false);
  const cls = dark ? "bg-white/5 border-white/10 text-white h-8 text-xs" : "h-8 text-xs";
  const ok = v.new_client_label.trim() && v.client_started_on && v.month && v.revenue !== "";
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
      <Input className={`${cls} col-span-2 sm:col-span-1`} placeholder="New client name" value={v.new_client_label} onChange={(e) => setV({ ...v, new_client_label: e.target.value })} />
      <label className={`text-[10px] ${dark ? "text-white/45" : "text-muted-foreground"}`}>Started<Input type="date" className={cls} value={v.client_started_on} onChange={(e) => setV({ ...v, client_started_on: e.target.value })} /></label>
      <label className={`text-[10px] ${dark ? "text-white/45" : "text-muted-foreground"}`}>Month<Input type="month" className={cls} value={v.month} onChange={(e) => setV({ ...v, month: e.target.value })} /></label>
      <Input type="number" min={0} className={cls} placeholder="Revenue $" value={v.revenue} onChange={(e) => setV({ ...v, revenue: e.target.value })} />
      <Button size="sm" className="h-8" disabled={!ok || busy} onClick={async () => {
        setBusy(true);
        try { await onSubmit({ ...v, revenue: Number(v.revenue) }); setV({ new_client_label: "", client_started_on: "", month: thisMonth, revenue: "" }); }
        finally { setBusy(false); }
      }}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5 mr-1" />Add</>}</Button>
    </div>
  );
}

function RevenueList({ rows, dark }: { rows: any[]; dark: boolean }) {
  if (!rows.length) return <p className={`text-xs ${dark ? "text-white/45" : "text-muted-foreground"}`}>No revenue recorded yet.</p>;
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.id} className={`flex items-center justify-between text-xs border-t pt-1 ${dark ? "border-white/5 text-white/80" : "border-border"}`}>
          <span>{r.new_client_label} <span className={dark ? "text-white/40" : "text-muted-foreground"}>· {fmtD(r.month).replace(/ \d+,/, "")}{r.entry_kind === "client_confirmed" ? " · reported by client" : r.entry_kind === "pipeline" ? " · from pipeline" : ""}</span></span>
          <span className="tabular-nums font-semibold">{money(r.revenue)}</span>
        </div>
      ))}
    </div>
  );
}

function PlanSummary({ deal, dark }: { deal: any; dark: boolean }) {
  const muted = dark ? "text-white/45" : "text-muted-foreground";
  const strong = dark ? "text-white" : "text-foreground";
  const annual = deal.billing_cadence === "annual";
  const tiles = [
    { k: "Package", v: PKG_LABEL[deal.package] || deal.package },
    annual ? { k: "Annual (first year)", v: money(deal.annual_amount_first) } : { k: deal.payment_plan ? "Setup (2 payments)" : "Setup", v: money(deal.payment_plan ? deal.payment_plan_total : deal.initial_fee) },
    annual ? { k: "Every year after", v: money(deal.annual_amount_renewal) }
      : deal.pricing_model === "commission" ? { k: "Commission", v: `${deal.commission_rate}% yr 1 / ${deal.commission_rate_ongoing}%` }
      : { k: "Monthly", v: money(deal.recurring_fee) },
    { k: "Billing starts", v: deal.billing_start_date ? fmtD(deal.billing_start_date) : deal.package === "growth" ? "After guarantee" : "—" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {tiles.map((t) => (
        <div key={t.k} className={`rounded-lg px-3 py-2 ${dark ? "bg-white/[0.04]" : "bg-muted/50"}`}>
          <div className={`text-[10px] uppercase tracking-wider ${muted}`}>{t.k}</div>
          <div className={`text-sm font-bold tabular-nums ${strong}`}>{t.v}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- admin ---------- */

export function AdminDealPlan({ dealId }: { dealId: string }) {
  const [data, setData] = useState<PlanData | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    const db = supabase as any;
    const [{ data: deal }, { data: schedule }, { data: revenue }] = await Promise.all([
      db.from("crm_deals").select("*").eq("id", dealId).maybeSingle(),
      db.from("nl_billing_schedule").select("*").eq("deal_id", dealId).neq("status", "cancelled").order("due_date"),
      db.from("nl_attributed_revenue").select("*").eq("deal_id", dealId).order("month", { ascending: false }),
    ]);
    const made = (revenue || []).reduce((s: number, r: any) => s + Number(r.revenue || 0), 0);
    setData({ plan: deal, schedule: schedule || [], revenue: revenue || [], made_back: made });
  }, [dealId]);
  useEffect(() => { load(); }, [load]);

  const act = async (action: string, extra: any, key: string, ok: string) => {
    setBusy(key);
    try { await invokeBilling({ action, ...extra }); toast({ title: ok }); await load(); }
    catch (e) { toast({ title: "Couldn't do that", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(null); }
  };

  if (!data) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin text-white/40 mx-auto" /></div>;
  const deal = data.plan;
  if (!deal?.package) return <p className="text-xs text-white/45">This client is on an older (pre-package) agreement — no automatic billing plan.</p>;
  const canConfirm = deal.package === "growth" && deal.guarantee_started_at && !deal.billing_start_date && deal.billing_cadence !== "annual";

  return (
    <div className="space-y-3">
      {deal.work_paused_at && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <span className="flex items-center gap-2"><PauseCircle className="h-4 w-4" />Work paused {fmtD(deal.work_paused_at)} — {deal.work_paused_reason}</span>
          <Button size="sm" variant="outline" className="h-6 text-[11px]" disabled={busy === "resume"} onClick={() => act("resume", { deal_id: deal.id }, "resume", "Work resumed")}><PlayCircle className="h-3 w-3 mr-1" />Resume</Button>
        </div>
      )}
      {!deal.recurring_method_saved_at && deal.paid_signed_at && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200"><AlertTriangle className="h-4 w-4" />No saved payment method for automatic charges yet.</div>
      )}
      <PlanSummary deal={deal} dark />
      <GuaranteeTracker deal={deal} madeBack={data.made_back} dark />
      {canConfirm && (
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={busy === "madeback"}
          onClick={() => act("confirm_made_back", { deal_id: deal.id }, "madeback", "Confirmed — ongoing billing scheduled")}>
          {busy === "madeback" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Confirm "Made it back"</>}
        </Button>
      )}
      {deal.package === "growth" && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2">
          <div className="text-xs font-semibold text-white">Revenue from new clients we brought in</div>
          <RevenueForm dark onSubmit={async (v) => {
            const { error } = await (supabase as any).from("nl_attributed_revenue").insert({
              deal_id: deal.id, client_id: deal.provisioned_client_id || null, new_client_label: v.new_client_label.trim(),
              client_started_on: v.client_started_on, month: `${v.month}-01`, revenue: v.revenue, source: "admin", entry_kind: "admin",
            });
            if (error) { toast({ title: "Couldn't add", description: error.message, variant: "destructive" }); return; }
            await load();
          }} />
          <RevenueList rows={data.revenue} dark />
        </div>
      )}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="text-xs font-semibold text-white mb-2">Charges</div>
        <ScheduleTable rows={data.schedule} dark busy={busy}
          onAction={(a, r) => {
            if (a === "waive" && !confirm(`Waive "${r.label}" (${money(r.amount, true)})? It won't be charged.`)) return;
            act(a, { schedule_id: r.id }, r.id, a === "wire_received" ? "Wire marked received" : a === "retry_now" ? "Retry sent" : "Charge waived");
          }} />
      </div>
    </div>
  );
}

/* ---------- client ---------- */

export function ClientPlan({ clientId }: { clientId: string }) {
  const [data, setData] = useState<PlanData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setData(await invokeBilling({ action: "client_plan", client_id: clientId })); setErr(null); }
    catch (e) { setErr((e as Error).message); }
  }, [clientId]);
  useEffect(() => { load(); }, [load]);

  if (err) return null; // older accounts / function not deployed yet: page falls back to the legacy billing view
  if (!data) return <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" /></div>;
  const deal = data.plan;
  if (!deal) return null;
  const today = new Date().toISOString().slice(0, 10);
  const next = data.schedule.find((r) => ["scheduled", "failed"].includes(r.status));
  const owedWire = data.schedule.find((r) => r.method === "wire" && r.status === "scheduled");

  return (
    <div className="space-y-4 mb-6">
      {deal.work_paused_at && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500 flex items-start gap-2">
          <PauseCircle className="h-5 w-5 shrink-0" />
          <div><b>Work is paused.</b> {deal.work_paused_reason}. Your Command Center is read-only until the balance below is paid — everything resumes right away after that.</div>
        </div>
      )}
      <PlanSummary deal={deal} dark={false} />
      {next && (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
          <span>Next: <b>{next.label}</b> · {fmtD(next.due_date)} {next.due_date < today ? <span className="text-red-500">(overdue)</span> : null}</span>
          <span className="font-bold tabular-nums">{next.amount != null ? money(next.amount, true) : "Calculated monthly"} · {next.method === "wire" ? "bank wire" : "automatic"}</span>
        </div>
      )}
      {owedWire && data.wire && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm space-y-1">
          <div className="font-semibold flex items-center gap-2"><Landmark className="h-4 w-4" />Wire instructions — {money(owedWire.amount, true)} due {fmtD(owedWire.due_date)}</div>
          <div className="grid sm:grid-cols-2 gap-x-6 text-xs">
            {[["Account name", data.wire.account_name], ["Bank", data.wire.bank_name], ["Routing (ABA)", data.wire.routing_number], ["Account number", data.wire.account_number], ["SWIFT", data.wire.swift_code], ["Bank address", data.wire.bank_address], ["Reference", data.wire_reference]]
              .filter(([, v]) => v).map(([k, v]) => <div key={k as string}><span className="text-muted-foreground">{k}:</span> <b className="select-all">{v}</b></div>)}
          </div>
          <p className="text-[11px] text-muted-foreground">Put the reference on the wire. NewLight will never change these details by email — if you get one saying otherwise, call us first.</p>
        </div>
      )}
      <GuaranteeTracker deal={deal} madeBack={data.made_back} dark={false} />
      {deal.package === "growth" && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="text-sm font-semibold">Report revenue from new clients</div>
          <p className="text-xs text-muted-foreground">Each month, add revenue from clients who came in through our campaigns. {deal.pricing_model === "commission" ? "Commission is billed from these numbers (or from your pipeline records if we don't hear back within 7 days)." : "This is how we track the guarantee."}</p>
          <RevenueForm dark={false} onSubmit={async (v) => {
            try { await invokeBilling({ action: "client_add_revenue", client_id: clientId, ...v }); toast({ title: "Thanks — revenue recorded" }); await load(); }
            catch (e) { toast({ title: "Couldn't add", description: (e as Error).message, variant: "destructive" }); }
          }} />
          <RevenueList rows={data.revenue} dark={false} />
        </div>
      )}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-sm font-semibold mb-2">Payment schedule</div>
        <ScheduleTable rows={data.schedule} dark={false} />
      </div>
    </div>
  );
}
