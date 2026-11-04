import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Download, Landmark, Loader2, Plus, Receipt, Undo2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import ContractorAlerts from "@/components/admin/ContractorAlerts";
import { NEWLIGHT_INTERNAL_CLIENT_ID } from "@/lib/newlightInternal";
import { fmtDate, money, necThreshold, todayISO } from "@/lib/contractorPaperwork";

/**
 * Commissions & payouts for 1099 reps. The owner sends the wire/ACH from the bank; this page says who is owed what and when,
 * records the bank confirmation, and lines it up with the bank statement and the year-end 1099s.
 */
type Hire = { id: string; full_name: string; email: string; state_code: string; status: string; w9_received_at: string | null };
type Sale = { id: string; deal_id: string | null; client_name: string; setup_fee: number; installments: number; signed_on: string; created_at: string };
type Credit = { id: string; sale_id: string; hire_id: string; role: "setter" | "closer"; rate: number };
type Pay = { id: string; sale_id: string; installment_no: number; amount: number; method: string; received_on: string; cleared_on: string; bank_reference: string | null; refunded_at: string | null; refund_reason: string | null };
type Entry = { id: string; hire_id: string; sale_id: string; client_payment_id: string | null; role: string; rate: number; base_amount: number; amount: number; status: "earned" | "paid" | "reversed"; earned_on: string; due_on: string; payout_id: string | null; note: string | null };
type Payout = { id: string; hire_id: string; total: number; method: string; sent_on: string; bank_reference: string; note: string | null; reconciled_at: string | null };
type StateRow = { state_code: string; state_name: string; tax_note: string | null };
type Deal = { id: string; deal_name: string; initial_fee: number | null; payment_plan: boolean | null };

const db = supabase as any;
const METHOD: Record<string, string> = { wire: "Wire", ach: "ACH", card: "Card", stripe: "Stripe" };

export default function AdminCommissions() {
  const { isAdmin } = useWorkspace();
  const [d, setD] = useState<{ hires: Hire[]; sales: Sale[]; credits: Credit[]; pays: Pay[]; entries: Entry[]; payouts: Payout[]; states: StateRow[]; deals: Deal[] } | null>(null);
  const [addSale, setAddSale] = useState(false);
  const [payFor, setPayFor] = useState<Sale | null>(null);
  const [payoutFor, setPayoutFor] = useState<Hire | null>(null);

  const load = useCallback(async () => {
    const q = await Promise.all([
      db.from("nl_contractor_hires").select("id, full_name, email, state_code, status, w9_received_at").order("full_name"),
      db.from("nl_commission_sales").select("*").order("signed_on", { ascending: false }),
      db.from("nl_commission_credits").select("*"),
      db.from("nl_commission_client_payments").select("*").order("received_on", { ascending: false }),
      db.from("nl_commission_entries").select("*").order("due_on"),
      db.from("nl_commission_payouts").select("*").order("sent_on", { ascending: false }),
      db.from("nl_contractor_states").select("state_code, state_name, tax_note"),
      db.from("crm_deals").select("id, deal_name, initial_fee, payment_plan").eq("client_id", NEWLIGHT_INTERNAL_CLIENT_ID).order("updated_at", { ascending: false }).limit(300),
    ]);
    const err = q.find((r: any) => r.error)?.error;
    if (err) toast.error(err.message);
    setD({ hires: q[0].data ?? [], sales: q[1].data ?? [], credits: q[2].data ?? [], pays: q[3].data ?? [], entries: q[4].data ?? [], payouts: q[5].data ?? [], states: q[6].data ?? [], deals: q[7].data ?? [] });
  }, []);
  useEffect(() => { load(); }, [load]);

  const today = todayISO();
  const owed = useMemo(() => {
    if (!d) return [];
    return d.hires.map((h) => {
      const open = d.entries.filter((e) => e.hire_id === h.id && e.status === "earned" && !e.payout_id);
      const ready = open.filter((e) => e.earned_on <= today);
      const waiting = open.filter((e) => e.earned_on > today);
      const net = ready.reduce((s, e) => s + Number(e.amount), 0);
      const nextDue = ready.filter((e) => e.amount > 0).map((e) => e.due_on).sort()[0];
      return { h, ready, waiting, net, nextDue, overdue: !!nextDue && nextDue < today };
    }).filter((x) => x.ready.length || x.waiting.length);
  }, [d, today]);

  if (!isAdmin) return <p className="p-6 text-white/80">Admins only.</p>;
  if (!d) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;

  const hireName = (id: string) => d.hires.find((h) => h.id === id)?.full_name ?? "—";
  const saleName = (id: string) => d.sales.find((s) => s.id === id)?.client_name ?? "—";
  const totalReady = owed.reduce((s, x) => s + Math.max(0, x.net), 0);
  const overdueCount = owed.filter((x) => x.overdue).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white"><Wallet className="h-6 w-6" /> Commissions &amp; Payouts</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/80">A commission is owed once the client's money clears, and you send it from your bank within 3 business days. Record the wire or ACH here with your bank's confirmation number.</p>
        </div>
        <Button onClick={() => setAddSale(true)}><Plus className="mr-1.5 h-4 w-4" /> New sale</Button>
      </div>

      <ContractorAlerts only={["payout:"]} />

      <div className="grid-preserve grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Ready to send" value={money(totalReady)} color="hsl(152 60% 58%)" />
        <Stat label="Past 3 business days" value={String(overdueCount)} color={overdueCount ? "hsl(0 80% 66%)" : "hsl(215 15% 70%)"} />
        <Stat label="Waiting for money to clear" value={money(owed.reduce((s, x) => s + x.waiting.reduce((a, e) => a + Number(e.amount), 0), 0))} color="hsl(197 100% 66%)" />
      </div>

      <Tabs defaultValue="owed">
        <TabsList>
          <TabsTrigger value="owed">To pay</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="payouts">Payouts &amp; bank match</TabsTrigger>
          <TabsTrigger value="year">Year-end 1099s</TabsTrigger>
        </TabsList>

        {/* ---------- To pay ---------- */}
        <TabsContent value="owed" className="mt-4 space-y-3">
          {owed.length === 0 && <Empty title="Nobody is owed anything right now" body="When a client's setup payment is recorded on a sale, each rep's commission shows up here." />}
          {owed.map(({ h, ready, waiting, net, nextDue, overdue }) => (
            <div key={h.id} className="rounded-2xl border bg-[hsl(222,40%,8%)] p-4" style={{ borderColor: overdue ? "hsla(0,80%,66%,.6)" : "rgba(255,255,255,.12)" }}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
                  <p className="font-bold text-white">{h.full_name}</p>
                  <p className="text-xs text-white/75">{ready.length ? <>Send by <b className={overdue ? "text-[hsl(0,80%,72%)]" : "text-white"}>{nextDue ? fmtDate(nextDue) : "—"}</b>{overdue && " · late"}</> : "Nothing has cleared yet"}</p>
                </div>
                <p className="text-xl font-black tabular-nums text-white">{money(net)}</p>
                {ready.length > 0 && (h.w9_received_at
                  ? <Button size="sm" onClick={() => setPayoutFor(h)} disabled={net <= 0}><Landmark className="mr-1.5 h-4 w-4" /> Record wire/ACH</Button>
                  : <span className="flex items-center gap-1 rounded-md border border-[hsla(35,92%,62%,.5)] px-2 py-1 text-xs font-bold text-[hsl(35,92%,70%)]"><AlertTriangle className="h-3.5 w-3.5" /> No W-9 yet: don't pay</span>)}
              </div>
              <div className="mt-3 space-y-1">
                {[...ready, ...waiting].map((e) => (
                  <div key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/85">
                    <span className="min-w-0 basis-full truncate font-semibold text-white sm:flex-1 sm:basis-auto">{saleName(e.sale_id)}</span>
                    <span>{e.role === "setter" ? "Booked" : "Closed"} · {(e.rate * 100).toFixed(0)}% of {money(Number(e.base_amount))}</span>
                    <span>{e.earned_on > today ? `Clears ${fmtDate(e.earned_on)}` : `Due ${fmtDate(e.due_on)}`}</span>
                    <span className={`font-bold tabular-nums ${e.amount < 0 ? "text-[hsl(0,80%,72%)]" : "text-white"}`}>{money(Number(e.amount))}</span>
                    {e.note && <span className="w-full text-white/70">{e.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ---------- Sales ---------- */}
        <TabsContent value="sales" className="mt-4 space-y-3">
          {d.sales.length === 0 && <Empty title="No sales yet" body={'Add one with "New sale": the client, the setup fee, and who booked and closed it.'} />}
          {d.sales.map((s) => {
            const cr = d.credits.filter((c) => c.sale_id === s.id);
            const ps = d.pays.filter((p) => p.sale_id === s.id).sort((a, b) => a.installment_no - b.installment_no);
            const nextInst = [1, 2].find((n) => n <= s.installments && !ps.some((p) => p.installment_no === n));
            return (
              <div key={s.id} className="rounded-2xl border border-white/12 bg-[hsl(222,40%,8%)] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
                    <p className="font-bold text-white">{s.client_name}</p>
                    <p className="text-xs text-white/75">Setup {money(Number(s.setup_fee))} · {s.installments === 2 ? "2 payments" : "1 payment"} · signed {fmtDate(s.signed_on)}{s.deal_id ? " · linked to pipeline deal" : ""}</p>
                  </div>
                  {nextInst && <Button size="sm" variant="outline" onClick={() => setPayFor(s)}><Receipt className="mr-1.5 h-4 w-4" /> Client paid</Button>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {cr.map((c) => <span key={c.id} className="rounded-md border border-white/15 px-2 py-0.5 text-white/85">{hireName(c.hire_id)} · {c.role === "setter" ? "booked" : "closed"} · {(c.rate * 100).toFixed(0)}%</span>)}
                </div>
                {ps.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {ps.map((p) => (
                      <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/85">
                        <span className="font-semibold text-white">Payment {p.installment_no}</span>
                        <span>{money(Number(p.amount))} by {METHOD[p.method]}</span>
                        <span>received {fmtDate(p.received_on)} · cleared {fmtDate(p.cleared_on)}</span>
                        {p.bank_reference && <span className="text-white/70">ref {p.bank_reference}</span>}
                        <span className="flex-1" />
                        {p.refunded_at
                          ? <span className="font-bold text-[hsl(0,80%,72%)]">Refunded{p.refund_reason ? `: ${p.refund_reason}` : ""}</span>
                          : <button type="button" className="font-semibold text-[hsl(0,80%,72%)]" onClick={async () => {
                              const reason = window.prompt("Refund or chargeback: what happened? (Commissions on this payment are cancelled, or taken from the next payout if already paid.)");
                              if (!reason) return;
                              const { error } = await db.rpc("nl_commission_reverse_payment", { p_payment_id: p.id, p_reason: reason });
                              if (error) return toast.error(error.message);
                              toast.success("Reversed"); load();
                            }}><Undo2 className="mr-1 inline h-3.5 w-3.5" />Refund / chargeback</button>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </TabsContent>

        {/* ---------- Payouts & bank match ---------- */}
        <TabsContent value="payouts" className="mt-4">
          <PayoutsTab payouts={d.payouts} entries={d.entries} hireName={hireName} saleName={saleName} hires={d.hires} pays={d.pays} onChanged={load} />
        </TabsContent>

        {/* ---------- Year-end ---------- */}
        <TabsContent value="year" className="mt-4">
          <YearEnd payouts={d.payouts} hires={d.hires} states={d.states} />
        </TabsContent>
      </Tabs>

      {addSale && <SaleDialog hires={d.hires.filter((h) => h.status !== "ended")} deals={d.deals.filter((x) => !d.sales.some((s) => s.deal_id === x.id))} onClose={() => setAddSale(false)} onSaved={() => { setAddSale(false); load(); }} />}
      {payFor && <ClientPaidDialog sale={payFor} pays={d.pays.filter((p) => p.sale_id === payFor.id)} onClose={() => setPayFor(null)} onSaved={() => { setPayFor(null); load(); }} />}
      {payoutFor && <PayoutDialog hire={payoutFor} entries={d.entries.filter((e) => e.hire_id === payoutFor.id && e.status === "earned" && !e.payout_id && e.earned_on <= today)} saleName={saleName} onClose={() => setPayoutFor(null)} onSaved={() => { setPayoutFor(null); load(); }} />}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/12 bg-[hsl(222,40%,9%)] p-3">
      <p className="text-lg font-black tabular-nums sm:text-2xl" style={{ color }}>{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wide text-white/75">{label}</p>
    </div>
  );
}
function Empty({ title, body }: { title: string; body: string }) {
  return <div className="rounded-2xl border border-white/12 bg-[hsl(222,40%,8%)] p-8 text-center"><p className="font-bold text-white">{title}</p><p className="mt-1 text-sm text-white/75">{body}</p></div>;
}
function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div><p className="mb-1 text-xs font-bold uppercase tracking-wider text-white/75">{label}</p>{children}{hint && <p className="mt-1 text-xs text-white/70">{hint}</p>}</div>;
}
const selectCls = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

/* ---------- New sale ---------- */
function SaleDialog({ hires, deals, onClose, onSaved }: { hires: Hire[]; deals: Deal[]; onClose: () => void; onSaved: () => void }) {
  const [dealId, setDealId] = useState("");
  const [client, setClient] = useState("");
  const [fee, setFee] = useState("");
  const [inst, setInst] = useState(1);
  const [signed, setSigned] = useState(todayISO());
  const [setter, setSetter] = useState("");
  const [closer, setCloser] = useState("");
  const [busy, setBusy] = useState(false);
  const pickDeal = (id: string) => {
    setDealId(id);
    const x = deals.find((y) => y.id === id);
    if (x) { setClient(x.deal_name); if (x.initial_fee) setFee(String(x.initial_fee)); setInst(x.payment_plan ? 2 : 1); }
  };
  const feeN = Number(fee.replace(/[$,]/g, ""));
  const ok = client.trim().length > 1 && feeN > 0 && (setter || closer);
  const save = async () => {
    setBusy(true);
    const { data, error } = await db.from("nl_commission_sales").insert({ deal_id: dealId || null, client_name: client.trim(), setup_fee: feeN, installments: inst, signed_on: signed }).select("id").single();
    if (error) { setBusy(false); return toast.error(error.message); }
    const rows = [setter && { sale_id: data.id, hire_id: setter, role: "setter", rate: 0.15 }, closer && { sale_id: data.id, hire_id: closer, role: "closer", rate: 0.2 }].filter(Boolean);
    const r2 = await db.from("nl_commission_credits").insert(rows);
    setBusy(false);
    if (r2.error) return toast.error(r2.error.message);
    toast.success(dealId ? "Sale added. Payments already marked paid in billing were pulled in." : "Sale added");
    onSaved();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>New sale</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <Field label="Pipeline deal (optional)" hint="Link it and client payments marked paid in billing (wire received / Stripe) come in by themselves.">
            <select className={selectCls} value={dealId} onChange={(e) => pickDeal(e.target.value)}>
              <option value="">Not linked — I'll record payments here</option>
              {deals.map((x) => <option key={x.id} value={x.id}>{x.deal_name}</option>)}
            </select>
          </Field>
          <Field label="Client"><Input value={client} onChange={(e) => setClient(e.target.value)} /></Field>
          <div className="grid-preserve grid grid-cols-2 gap-2">
            <Field label="Setup fee" hint="The regular setup amount, never the +10% plan charge."><Input inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="25,000" /></Field>
            <Field label="Payments"><select className={selectCls} value={inst} onChange={(e) => setInst(Number(e.target.value))}><option value={1}>1 payment</option><option value={2}>2-payment plan</option></select></Field>
          </div>
          <Field label="Client signed on"><Input type="date" value={signed} onChange={(e) => setSigned(e.target.value)} /></Field>
          <Field label="Booked the meeting (15%)">
            <select className={selectCls} value={setter} onChange={(e) => setSetter(e.target.value)}><option value="">Nobody / not a contractor</option>{hires.map((h) => <option key={h.id} value={h.id}>{h.full_name}</option>)}</select>
          </Field>
          <Field label="Closed the deal (20%)">
            <select className={selectCls} value={closer} onChange={(e) => setCloser(e.target.value)}><option value="">Nobody / not a contractor</option>{hires.map((h) => <option key={h.id} value={h.id}>{h.full_name}</option>)}</select>
          </Field>
          {feeN > 0 && (setter || closer) && (
            <p className="rounded-lg border border-white/12 bg-white/[0.04] p-2.5 text-xs text-white/85">
              {setter && <>Booked: {money(feeN * 0.15)} total. </>}{closer && <>Closed: {money(feeN * 0.2)} total. </>}{inst === 2 && "Half is owed as each payment clears."}
            </p>
          )}
          <Button className="w-full" disabled={!ok || busy} onClick={save}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add sale</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Client paid ---------- */
function ClientPaidDialog({ sale, pays, onClose, onSaved }: { sale: Sale; pays: Pay[]; onClose: () => void; onSaved: () => void }) {
  const next = [1, 2].find((n) => n <= sale.installments && !pays.some((p) => p.installment_no === n)) ?? 1;
  const [amount, setAmount] = useState(String(Math.round((sale.setup_fee / sale.installments) * (sale.installments === 2 ? 1.1 : 1))));
  const [method, setMethod] = useState("wire");
  const [received, setReceived] = useState(todayISO());
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const amt = Number(amount.replace(/[$,]/g, ""));
  const save = async () => {
    setBusy(true);
    const { error } = await db.from("nl_commission_client_payments").insert({ sale_id: sale.id, installment_no: next, amount: amt, method, received_on: received, cleared_on: received, bank_reference: ref.trim() || null });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Recorded. Commissions are on the To pay tab.");
    onSaved();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{sale.client_name}: payment {next}{sale.installments === 2 ? " of 2" : ""}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <Field label="Amount the client paid"><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <div className="grid-preserve grid grid-cols-2 gap-2">
            <Field label="How"><select className={selectCls} value={method} onChange={(e) => setMethod(e.target.value)}><option value="wire">Wire</option><option value="ach">ACH</option><option value="card">Card</option></select></Field>
            <Field label={method === "ach" ? "Settled on" : "Landed in bank on"}><Input type="date" value={received} onChange={(e) => setReceived(e.target.value)} /></Field>
          </div>
          <Field label="Bank reference (optional)" hint="The wire confirmation or ACH trace from your statement — not an account number."><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
          <p className="rounded-lg border border-white/12 bg-white/[0.04] p-2.5 text-xs text-white/85">
            {method === "wire" && "A wire counts as cleared the day it lands."}
            {method === "ach" && "An ACH counts as cleared 3 business days after it settles."}
            {method === "card" && "A card payment counts as cleared the day it settles, but it can be charged back for about 120 days. Prefer wire or ACH for setup fees."}
            {" "}Commission is owed within 3 business days after that.
          </p>
          <Button className="w-full" disabled={!(amt > 0) || busy} onClick={save}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record client payment</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Record a wire/ACH to a rep ---------- */
function PayoutDialog({ hire, entries, saleName, onClose, onSaved }: { hire: Hire; entries: Entry[]; saleName: (id: string) => string; onClose: () => void; onSaved: () => void }) {
  const [pick, setPick] = useState<Set<string>>(new Set(entries.map((e) => e.id)));
  const [method, setMethod] = useState("wire");
  const [sent, setSent] = useState(todayISO());
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const total = entries.filter((e) => pick.has(e.id)).reduce((s, e) => s + Number(e.amount), 0);
  const save = async () => {
    setBusy(true);
    const { error } = await db.rpc("nl_commission_record_payout", { p_hire_id: hire.id, p_entry_ids: [...pick], p_method: method, p_sent_on: sent, p_reference: ref, p_note: null });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${money(total)} to ${hire.full_name} recorded`);
    onSaved();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>Pay {hire.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <ol className="list-decimal space-y-1 pl-5 text-xs text-white/85">
            <li>In your bank, send <b className="text-white">{money(total)}</b> to {hire.full_name}'s saved payee (their bank details live only in your bank).</li>
            <li>Copy the confirmation number your bank shows and paste it below.</li>
          </ol>
          <div className="space-y-1">
            {entries.map((e) => (
              <label key={e.id} className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/85">
                <input type="checkbox" checked={pick.has(e.id)} onChange={(ev) => { const n = new Set(pick); ev.target.checked ? n.add(e.id) : n.delete(e.id); setPick(n); }} />
                <span className="min-w-0 flex-1 truncate">{saleName(e.sale_id)}{e.note ? ` — ${e.note}` : ""}</span>
                <b className={e.amount < 0 ? "text-[hsl(0,80%,72%)]" : "text-white"}>{money(Number(e.amount))}</b>
              </label>
            ))}
          </div>
          <div className="grid-preserve grid grid-cols-2 gap-2">
            <Field label="Sent by"><select className={selectCls} value={method} onChange={(e) => setMethod(e.target.value)}><option value="wire">Wire</option><option value="ach">ACH</option></select></Field>
            <Field label="Sent on"><Input type="date" value={sent} onChange={(e) => setSent(e.target.value)} /></Field>
          </div>
          <Field label="Bank confirmation number"><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Wire confirmation / ACH trace" /></Field>
          <Button className="w-full" disabled={busy || total <= 0 || ref.trim().length < 3} onClick={save}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record {money(total)} as sent</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Payouts list + monthly bank match + statements ---------- */
function PayoutsTab({ payouts, entries, hireName, saleName, hires, pays, onChanged }: { payouts: Payout[]; entries: Entry[]; hireName: (id: string) => string; saleName: (id: string) => string; hires: Hire[]; pays: Pay[]; onChanged: () => void }) {
  const months = Array.from(new Set([...payouts.map((p) => p.sent_on.slice(0, 7)), ...pays.map((p) => p.received_on.slice(0, 7)), todayISO().slice(0, 7)])).sort().reverse();
  const [month, setMonth] = useState(months[0]);
  const inMonth = payouts.filter((p) => p.sent_on.startsWith(month));
  const clientIn = pays.filter((p) => p.received_on.startsWith(month));
  const label = (m: string) => new Date(m + "-15T12:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const toggle = async (p: Payout) => {
    const { error } = await db.from("nl_commission_payouts").update({ reconciled_at: p.reconciled_at ? null : new Date().toISOString() }).eq("id", p.id);
    if (error) return toast.error(error.message);
    onChanged();
  };
  const statement = (p: Payout) => {
    const lines = entries.filter((e) => e.payout_id === p.id);
    const h = hires.find((x) => x.id === p.hire_id);
    const w = window.open("", "_blank"); if (!w) return;
    const rows = lines.map((e) => `<tr><td>${saleName(e.sale_id)}</td><td>${e.role === "setter" ? "Booked" : "Closed"}</td><td>${(e.rate * 100).toFixed(0)}% of ${money(Number(e.base_amount))}</td><td>${fmtDate(e.earned_on)}</td><td style="text-align:right">${money(Number(e.amount))}</td></tr>${e.note ? `<tr><td colspan=5 style="color:#555">${e.note}</td></tr>` : ""}`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Commission statement</title><style>body{font:13px/1.5 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#111}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left}</style></head><body>
<h2>Commission statement</h2><p>Vivid Virtual Creations LLC dba NewLight Marketing → ${h?.full_name ?? ""}<br/>Sent ${fmtDate(p.sent_on)} by ${METHOD[p.method]} · confirmation ${p.bank_reference}</p>
<table><tr><th>Client</th><th>Credit</th><th>Rate</th><th>Client money cleared</th><th style="text-align:right">Amount</th></tr>${rows}<tr><td colspan=4>Fees or deductions</td><td style="text-align:right">None${lines.some((e) => Number(e.amount) < 0) ? " (reversals shown above)" : ""}</td></tr><tr><td colspan=4><b>Total sent</b></td><td style="text-align:right"><b>${money(Number(p.total))}</b></td></tr></table>
<p style="color:#555;margin-top:20px">You're an independent contractor. No taxes were withheld. Keep this for your records.</p><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className={`${selectCls} w-auto`} value={month} onChange={(e) => setMonth(e.target.value)}>{months.map((m) => <option key={m} value={m}>{label(m)}</option>)}</select>
        <p className="text-xs text-white/75">Once a month: open your bank statement and tick each line that matches.</p>
      </div>
      <div className="grid-preserve grid grid-cols-2 gap-2">
        <Stat label={`Client setup money in · ${label(month)}`} value={money(clientIn.filter((p) => !p.refunded_at).reduce((s, p) => s + Number(p.amount), 0))} color="hsl(197 100% 66%)" />
        <Stat label={`Commissions sent · ${label(month)}`} value={money(inMonth.reduce((s, p) => s + Number(p.total), 0))} color="hsl(152 60% 58%)" />
      </div>
      {inMonth.length === 0 ? <Empty title="No payouts this month" body="Payouts you record show up here to match against your bank statement." /> : (
        <div className="space-y-1.5">
          {inMonth.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/12 bg-[hsl(222,40%,9%)] px-3 py-2.5 text-sm">
              <button type="button" onClick={() => toggle(p)} className="flex items-center gap-1.5 text-xs font-bold" style={{ color: p.reconciled_at ? "hsl(152,60%,58%)" : "rgba(255,255,255,.7)" }}>
                <CheckCircle2 className="h-4 w-4" />{p.reconciled_at ? "Matched" : "Match"}
              </button>
              <span className="min-w-0 basis-full truncate font-semibold text-white sm:flex-1 sm:basis-auto">{hireName(p.hire_id)}</span>
              <span className="text-xs text-white/80">{fmtDate(p.sent_on)} · {METHOD[p.method]} · {p.bank_reference}</span>
              <b className="tabular-nums text-white">{money(Number(p.total))}</b>
              <Button size="sm" variant="ghost" onClick={() => statement(p)}><Download className="mr-1 h-3.5 w-3.5" />Statement</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Year-end 1099-NEC ---------- */
function YearEnd({ payouts, hires, states }: { payouts: Payout[]; hires: Hire[]; states: StateRow[] }) {
  const years = Array.from(new Set([...payouts.map((p) => Number(p.sent_on.slice(0, 4))), new Date().getFullYear()])).sort().reverse();
  const [year, setYear] = useState(years[0]);
  const min = necThreshold(year);
  const rows = hires.map((h) => ({ h, total: payouts.filter((p) => p.hire_id === h.id && p.sent_on.startsWith(String(year))).reduce((s, p) => s + Number(p.total), 0), st: states.find((s) => s.state_code === h.state_code) }))
    .filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  const due = `February 1, ${year + 1}`;
  const csv = () => {
    const lines = [["Name", "Email", "State", `Paid in ${year}`, "1099-NEC needed", "State filing"], ...rows.map((r) => [r.h.full_name, r.h.email, r.h.state_code, r.total.toFixed(2), r.total >= min ? "Yes" : "No", r.st?.tax_note ?? ""])];
    const blob = new Blob([lines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `1099-totals-${year}.csv`; a.click();
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className={`${selectCls} w-auto`} value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
        <Button size="sm" variant="outline" onClick={csv} disabled={!rows.length}><Download className="mr-1.5 h-4 w-4" />Download totals (CSV)</Button>
      </div>
      <div className="rounded-xl border border-white/12 bg-[hsl(222,40%,9%)] p-3 text-xs text-white/85">
        Totals are what you actually <b className="text-white">sent</b> in {year}. Anyone paid {money(min)} or more needs a <b className="text-white">Form 1099-NEC</b>, filed with the IRS and given to them by <b className="text-white">{due}</b>. File free through the IRS's IRIS portal (apply for its access code at least 45 business days ahead). Some states also want their own copy; see each rep's note.
      </div>
      {rows.length === 0 ? <Empty title={`No payouts in ${year}`} body="Payouts you record add up here." /> : (
        <div className="space-y-1.5">
          {rows.map(({ h, total, st }) => (
            <div key={h.id} className="rounded-xl border border-white/12 bg-[hsl(222,40%,9%)] px-3 py-2.5 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1 truncate font-semibold text-white">{h.full_name} <span className="font-normal text-white/70">· {st?.state_name ?? h.state_code}</span></span>
                <b className="tabular-nums text-white">{money(total)}</b>
                <span className="rounded-md border px-2 py-0.5 text-xs font-bold" style={total >= min ? { color: "hsl(35,92%,66%)", borderColor: "hsl(35,92%,66%)" } : { color: "rgba(255,255,255,.7)", borderColor: "rgba(255,255,255,.2)" }}>{total >= min ? "1099-NEC needed" : "Under threshold"}</span>
              </div>
              {st?.tax_note && <p className="mt-1 text-xs text-white/75">{st.tax_note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
