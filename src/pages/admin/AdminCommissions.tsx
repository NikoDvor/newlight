import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Download, Loader2, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { fmtDate, money, necThreshold, todayISO } from "@/lib/contractorPaperwork";

/**
 * Commission payments are entered by hand. There are no preset rates: you decide the amount, send it from your bank,
 * and record it here with the confirmation number. Payments show on the rep's own ledger and add up for the year-end 1099s.
 */
type Hire = { id: string; full_name: string; email: string; state_code: string; status: string; w9_received_at: string | null };
type Payout = { id: string; hire_id: string | null; payee_name: string | null; total: number; method: string; sent_on: string; bank_reference: string; note: string | null; reconciled_at: string | null };
type StateRow = { state_code: string; state_name: string; tax_note: string | null };

const db = supabase as any;
const METHOD: Record<string, string> = { wire: "Wire", ach: "ACH", check: "Check", zelle: "Zelle", cash: "Cash", other: "Other" };
const selectCls = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

export default function AdminCommissions() {
  const { isAdmin, user } = useWorkspace();
  const [d, setD] = useState<{ hires: Hire[]; payouts: Payout[]; states: StateRow[] } | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const q = await Promise.all([
      db.from("nl_contractor_hires").select("id, full_name, email, state_code, status, w9_received_at").order("full_name"),
      db.from("nl_commission_payouts").select("*").order("sent_on", { ascending: false }),
      db.from("nl_contractor_states").select("state_code, state_name, tax_note"),
    ]);
    const err = q.find((r: any) => r.error)?.error;
    if (err) toast.error(err.message);
    setD({ hires: q[0].data ?? [], payouts: q[1].data ?? [], states: q[2].data ?? [] });
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!isAdmin) return <p className="p-6 text-white/80">Admins only.</p>;
  if (!d) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;

  const payeeName = (p: Payout) => (p.hire_id ? d.hires.find((h) => h.id === p.hire_id)?.full_name : null) ?? p.payee_name ?? "—";
  const year = String(new Date().getFullYear());
  const ytd = d.payouts.filter((p) => p.sent_on.startsWith(year)).reduce((s, p) => s + Number(p.total), 0);
  const unmatched = d.payouts.filter((p) => !p.reconciled_at).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white"><Wallet className="h-6 w-6" /> Commission Payments</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/80">Manual payments only. Send the money from your bank, then record the amount and confirmation number here.</p>
        </div>
        <Button onClick={() => setAdding(true)}><Plus className="mr-1.5 h-4 w-4" /> Record payment</Button>
      </div>

      <div className="grid-preserve grid grid-cols-2 gap-2 sm:gap-3">
        <Stat label={`Paid in ${year}`} value={money(ytd)} color="hsl(152 60% 58%)" />
        <Stat label="Not matched to bank yet" value={String(unmatched)} color={unmatched ? "hsl(35 92% 66%)" : "hsl(215 15% 70%)"} />
      </div>

      <Tabs defaultValue="payouts">
        <TabsList>
          <TabsTrigger value="payouts">Payments &amp; bank match</TabsTrigger>
          <TabsTrigger value="year">Year-end 1099s</TabsTrigger>
        </TabsList>
        <TabsContent value="payouts" className="mt-4">
          <PayoutsTab payouts={d.payouts} payeeName={payeeName} hires={d.hires} onChanged={load} />
        </TabsContent>
        <TabsContent value="year" className="mt-4">
          <YearEnd payouts={d.payouts} hires={d.hires} states={d.states} />
        </TabsContent>
      </Tabs>

      {adding && <PaymentDialog hires={d.hires} userId={user?.id} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/12 bg-[hsl(222,40%,9%)] p-3">
      <p className="text-2xl font-black tabular-nums" style={{ color }}>{value}</p>
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

/* ---------- Record a payment ---------- */
function PaymentDialog({ hires, userId, onClose, onSaved }: { hires: Hire[]; userId?: string; onClose: () => void; onSaved: () => void }) {
  const [who, setWho] = useState("");        // hire id, or "other"
  const [other, setOther] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("wire");
  const [sent, setSent] = useState(todayISO());
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const amt = Number(amount.replace(/[$,]/g, ""));
  const hire = hires.find((h) => h.id === who);
  const ok = amt > 0 && (hire || (who === "other" && other.trim().length > 1));
  const save = async () => {
    if (!window.confirm(`Record ${money(amt)} to ${hire?.full_name ?? other.trim()}? Recorded payments are permanent and can't be edited.`)) return;
    setBusy(true);
    const { error } = await db.from("nl_commission_payouts").insert({
      hire_id: hire?.id ?? null, payee_name: hire ? null : other.trim(), total: amt, method, sent_on: sent,
      bank_reference: ref.trim() || "—", note: note.trim() || null, created_by: userId ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${money(amt)} to ${hire?.full_name ?? other.trim()} recorded`);
    onSaved();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>Record a commission payment</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <Field label="Paid to">
            <select className={selectCls} value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="">Choose…</option>
              {hires.filter((h) => h.status !== "ended").map((h) => <option key={h.id} value={h.id}>{h.full_name}</option>)}
              <option value="other">Someone else (not a contractor record)</option>
            </select>
          </Field>
          {who === "other" && <Field label="Name"><Input value={other} onChange={(e) => setOther(e.target.value)} /></Field>}
          {hire && !hire.w9_received_at && (
            <p className="flex items-center gap-1.5 rounded-md border border-[hsla(35,92%,62%,.5)] px-2 py-1.5 text-xs font-bold text-[hsl(35,92%,70%)]"><AlertTriangle className="h-3.5 w-3.5" /> No W-9 on file for {hire.full_name} yet.</p>
          )}
          <div className="grid-preserve grid grid-cols-2 gap-2">
            <Field label="Amount"><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="2,500" /></Field>
            <Field label="Sent on"><Input type="date" value={sent} onChange={(e) => setSent(e.target.value)} /></Field>
          </div>
          <div className="grid-preserve grid grid-cols-2 gap-2">
            <Field label="How"><select className={selectCls} value={method} onChange={(e) => setMethod(e.target.value)}>{Object.entries(METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="Confirmation # (optional)"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
          </div>
          <Field label="What it's for (optional)" hint="Client name, deal, or anything you'll want to remember."><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={!ok || busy}>{busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Record payment</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Payments list + monthly bank match + statements ---------- */
function PayoutsTab({ payouts, payeeName, hires, onChanged }: { payouts: Payout[]; payeeName: (p: Payout) => string; hires: Hire[]; onChanged: () => void }) {
  const months = Array.from(new Set([...payouts.map((p) => p.sent_on.slice(0, 7)), todayISO().slice(0, 7)])).sort().reverse();
  const [month, setMonth] = useState(months[0]);
  const inMonth = payouts.filter((p) => p.sent_on.startsWith(month));
  const label = (m: string) => new Date(m + "-15T12:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const toggle = async (p: Payout) => {
    const { error } = await db.from("nl_commission_payouts").update({ reconciled_at: p.reconciled_at ? null : new Date().toISOString() }).eq("id", p.id);
    if (error) return toast.error(error.message);
    onChanged();
  };
  const statement = (p: Payout) => {
    const h = hires.find((x) => x.id === p.hire_id);
    const w = window.open("", "_blank"); if (!w) return;
    const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Payment statement</title><style>body{font:13px/1.5 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#111}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left}</style></head><body>
<h2>Commission payment</h2><p>Vivid Virtual Creations LLC dba NewLight Marketing → ${esc(h?.full_name ?? p.payee_name ?? "")}<br/>Sent ${fmtDate(p.sent_on)} by ${METHOD[p.method] ?? p.method}${p.bank_reference && p.bank_reference !== "—" ? ` · confirmation ${esc(p.bank_reference)}` : ""}</p>
<table><tr><th>For</th><th style="text-align:right">Amount</th></tr><tr><td>${esc(p.note ?? "Commission")}</td><td style="text-align:right">${money(Number(p.total))}</td></tr><tr><td><b>Total sent</b></td><td style="text-align:right"><b>${money(Number(p.total))}</b></td></tr></table>
<p style="color:#555;margin-top:20px">You're an independent contractor. No taxes were withheld. Keep this for your records.</p><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
    w.document.close();
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className={`${selectCls} w-auto`} value={month} onChange={(e) => setMonth(e.target.value)}>{months.map((m) => <option key={m} value={m}>{label(m)}</option>)}</select>
        <p className="text-xs text-white/75">Once a month: open your bank statement and tick each line that matches. Sent in {label(month)}: <b className="text-white">{money(inMonth.reduce((s, p) => s + Number(p.total), 0))}</b></p>
      </div>
      {inMonth.length === 0 ? <Empty title="No payments this month" body="Payments you record show up here to match against your bank statement." /> : (
        <div className="space-y-1.5">
          {inMonth.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/12 bg-[hsl(222,40%,9%)] px-3 py-2.5 text-sm">
              <button type="button" onClick={() => toggle(p)} className="flex items-center gap-1.5 text-xs font-bold" style={{ color: p.reconciled_at ? "hsl(152,60%,58%)" : "rgba(255,255,255,.7)" }}>
                <CheckCircle2 className="h-4 w-4" />{p.reconciled_at ? "Matched" : "Match"}
              </button>
              <span className="min-w-0 basis-full truncate font-semibold text-white sm:flex-1 sm:basis-auto">{payeeName(p)}{p.note ? <span className="font-normal text-white/70"> · {p.note}</span> : null}</span>
              <span className="text-xs text-white/80">{fmtDate(p.sent_on)} · {METHOD[p.method] ?? p.method}{p.bank_reference && p.bank_reference !== "—" ? ` · ${p.bank_reference}` : ""}</span>
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
