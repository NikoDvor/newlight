import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, FileSignature, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { AgreementText, fmtDate, money, printSignedCopy, todayISO, type Packet, type PacketDoc } from "@/lib/contractorPaperwork";

/** The rep signs their contractor agreement here. Never blocks training or anything else in the app. */
export default function MyPaperwork() {
  const [packet, setPacket] = useState<Packet | null | undefined>(undefined);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("nl_contractor_my_packet" as any);
    if (error) { toast.error(error.message); setPacket(null); return; }
    setPacket((data as Packet) ?? null);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (packet === undefined) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;
  if (!packet) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/12 bg-[hsl(222,40%,8%)] p-8 text-center">
        <FileSignature className="mx-auto h-8 w-8 text-white/60" />
        <p className="mt-3 text-base font-bold text-white">No paperwork for you yet</p>
        <p className="mt-1 text-sm text-white/75">When NewLight sends your agreement, it shows up here.</p>
      </div>
    );
  }

  const unsigned = packet.docs.filter((d) => !d.signature);
  const w9 = !!packet.hire.w9_received_at;
  const hasProfile = !!packet.hire.mailing_address;
  const cs = packet.hire.countersigned_at ? { name: packet.hire.countersign_name ?? "", at: packet.hire.countersigned_at } : null;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">My Paperwork &amp; Pay</h1>
        <p className="mt-1 text-sm text-white/80">Three steps and you're set up to get paid. Everything else in the app stays open while you do this.</p>
      </div>

      <div className="grid-preserve grid grid-cols-3 gap-2">
        <StepTile n={1} label="Your details" done={hasProfile} />
        <StepTile n={2} label={`Sign (${packet.docs.length - unsigned.length}/${packet.docs.length})`} done={hasProfile && unsigned.length === 0 && !packet.waiting_countersign} />
        <StepTile n={3} label="W-9 & bank" done={w9} />
      </div>

      <ProfileForm hire={packet.hire} onSaved={load} />

      {(
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-white/10 text-xs font-black text-white">2</span>
            <h2 className="text-[15px] font-bold text-white">Your onboarding documents</h2>
          </div>
          <p className="text-sm text-white/80">{hasProfile ? "These are picked for where you work. Sign each one; you can save a copy of everything you sign." : "Here is everything you'll sign. Read them now; add your details above to unlock signing."}</p>
          {packet.docs.map((d) => <DocCard key={d.doc_id} doc={d} locked={!hasProfile} countersign={d.slug === "contractor-agreement" ? cs : null} onSigned={load} />)}
          {packet.waiting_countersign && (
            <p className="rounded-xl border border-white/12 bg-[hsl(222,40%,8%)] p-3 text-sm text-white/85">One more page appears here after NewLight countersigns your agreement.</p>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-white/12 bg-[hsl(222,40%,8%)] p-4 sm:p-5">
        <div className="flex items-center gap-2">
          {w9 ? <CheckCircle2 className="h-5 w-5 text-[hsl(152,60%,58%)]" /> : <span className="grid h-6 w-6 place-items-center rounded-md bg-white/10 text-xs font-black text-white">3</span>}
          <h2 className="text-[15px] font-bold text-white">W-9 and payout bank details</h2>
        </div>
        {w9 ? (
          <p className="mt-2 text-sm text-white/85">Received. You're all set to be paid commission.</p>
        ) : (
          <div className="mt-2 space-y-2 text-sm text-white/85">
            <p><b className="text-white">W-9:</b> you'll get an email from <b className="text-white">TaxBandits</b>, NewLight's IRS-authorized tax-form service, asking you to fill out your W-9 online. Do it there.</p>
            <p>Commission can't be sent until your W-9 is in.</p>
            <p className="flex items-start gap-2 text-white/75"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Never send your Social Security number by email, text or in this app. It only goes into the TaxBandits form.</p>
          </div>
        )}
        <BankForm />
      </section>

      <MyPay />
    </div>
  );
}

type LedgerEntry = { id: string; client: string; role: string; rate: number; base: number; amount: number; status: string; earned_on: string; due_on: string; note: string | null; payout_id: string | null };
type LedgerPayout = { id: string; total: number; method: string; sent_on: string; reference: string; note?: string | null };
const PAY_METHOD: Record<string, string> = { wire: "Wire", ach: "ACH", check: "Check", zelle: "Zelle", cash: "Cash", other: "Other" };
function MyPay() {
  const [l, setL] = useState<{ entries: LedgerEntry[]; payouts: LedgerPayout[] } | null>(null);
  useEffect(() => { supabase.rpc("nl_commission_my_ledger" as any).then(({ data }) => setL((data as any) ?? null)); }, []);
  if (!l) return null;
  const today = todayISO();
  const pending = l.entries.filter((e) => e.status === "earned");
  const year = new Date().getFullYear();
  const paidYear = l.payouts.filter((p) => p.sent_on.startsWith(String(year))).reduce((s, p) => s + Number(p.total), 0);
  return (
    <section className="rounded-2xl border border-white/12 bg-[hsl(222,40%,8%)] p-4 sm:p-5">
      <h2 className="text-[15px] font-bold text-white">My pay</h2>
      <p className="mt-1 text-xs text-white/75">You're paid within 3 business days after your client's payment clears in NewLight's bank. No taxes are taken out; set some aside.</p>
      <div className="grid-preserve mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/12 bg-[hsl(222,40%,10%)] p-3"><p className="text-lg font-black tabular-nums text-white">{money(pending.reduce((s, e) => s + Number(e.amount), 0))}</p><p className="text-[11px] font-bold uppercase tracking-wide text-white/75">On its way</p></div>
        <div className="rounded-xl border border-white/12 bg-[hsl(222,40%,10%)] p-3"><p className="text-lg font-black tabular-nums text-white">{money(paidYear)}</p><p className="text-[11px] font-bold uppercase tracking-wide text-white/75">Paid in {year}</p></div>
      </div>
      {l.entries.length === 0 ? <p className="mt-3 text-sm text-white/75">No commissions yet. They show up here as soon as a client of yours pays.</p> : (
        <div className="mt-3 space-y-1">
          {l.entries.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/85">
              <span className="min-w-0 basis-full truncate font-semibold text-white sm:flex-1 sm:basis-auto">{e.client}</span>
              <span>{e.role === "setter" ? "Booked" : "Closed"} · {(e.rate * 100).toFixed(0)}%</span>
              <span>{e.status === "paid" ? "Paid" : e.status === "reversed" ? "Cancelled (client refund)" : e.earned_on > today ? `Client money clears ${fmtDate(e.earned_on)}` : `Coming by ${fmtDate(e.due_on)}`}</span>
              <b className={e.amount < 0 ? "text-[hsl(0,80%,72%)]" : "text-white"}>{money(Number(e.amount))}</b>
              {e.note && <span className="w-full text-white/70">{e.note}</span>}
            </div>
          ))}
        </div>
      )}
      {l.payouts.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-white/75">Payments sent to you</p>
          <div className="mt-1 space-y-1">
            {l.payouts.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-x-3 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/85">
                <span className="flex-1">{fmtDate(p.sent_on)} · {PAY_METHOD[p.method] ?? p.method}{p.reference && p.reference !== "—" ? ` · ref ${p.reference}` : ""}{p.note ? ` · ${p.note}` : ""}</span>
                <b className="text-white">{money(Number(p.total))}</b>
                <button type="button" className="font-semibold text-[hsl(197,100%,72%)]" onClick={() => printStatement(p, l.entries.filter((e) => e.payout_id === p.id))}>Statement</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function StepTile({ n, label, done }: { n: number; label: string; done: boolean }) {
  return (
    <div className="rounded-xl border p-3" style={done ? { borderColor: "hsla(152,60%,58%,.5)", background: "hsla(152,60%,40%,.14)" } : { borderColor: "rgba(255,255,255,.14)", background: "hsl(222,40%,9%)" }}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">Step {n}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-white">{done && <CheckCircle2 className="h-4 w-4 text-[hsl(152,60%,58%)]" />}{label}</p>
    </div>
  );
}

function DocCard({ doc, countersign, onSigned, locked = false }: { doc: PacketDoc; countersign: { name: string; at: string } | null; onSigned: () => void; locked?: boolean }) {
  const [consent, setConsent] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (doc.signature) {
    const s = doc.signature;
    return (
      <section className="rounded-2xl border border-[hsla(152,60%,58%,.45)] bg-[hsl(222,40%,8%)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[hsl(152,60%,58%)]" />
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-white">{doc.title}</p>
              <p className="text-xs text-white/75">Signed by {s.typed_name} · {new Date(s.signed_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => printSignedCopy({ title: doc.title, body: s.body, typedName: s.typed_name, signedAt: s.signed_at, sha256: s.body_sha256, countersign })}>
            <Download className="mr-1.5 h-4 w-4" /> Save a copy
          </Button>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-[hsl(197,100%,72%)]">Read what you signed</summary>
          <AgreementText body={s.body} className="mt-3" />
        </details>
      </section>
    );
  }

  const sign = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("nl_contractor_sign" as any, {
      p_doc_id: doc.doc_id, p_typed_name: name.trim(), p_consent: consent, p_body_sha256: doc.body_sha256, p_user_agent: navigator.userAgent,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Signed. A copy is saved here for you.");
    onSigned();
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <FileSignature className="h-5 w-5 text-white/80" />
        <h3 className="text-[15px] font-bold text-white">{doc.title}</h3>
      </div>
      {doc.summary && <p className="rounded-xl bg-white/[0.05] px-3 py-2 text-sm text-white/85"><b className="text-white">What this is:</b> {doc.summary}</p>}
      <AgreementText body={doc.body} className="max-h-[60vh] overflow-y-auto" />
      {locked ? <p className="rounded-xl border border-white/12 bg-[hsl(222,40%,8%)] p-3 text-sm text-white/80">Add your details (step 1) to sign this document.</p> : <div className="space-y-3 rounded-2xl border border-white/12 bg-[hsl(222,40%,8%)] p-4 sm:p-5">
        <label className="flex items-start gap-3 text-sm text-white/90">
          <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
          <span>I've read this document. I agree to sign it electronically, that my typed name is my legal signature, and that I can download a copy any time.</span>
        </label>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-white/75" htmlFor="sig-name">Type your full legal name</label>
          <Input id="sig-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" className="mt-1 font-serif text-lg" autoComplete="name" />
        </div>
        <Button onClick={sign} disabled={busy || !consent || name.trim().length < 3} className="w-full sm:w-auto">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />} Sign
        </Button>
      </div>}
    </section>
  );
}

function ProfileForm({ hire, onSaved }: { hire: Packet["hire"]; onSaved: () => void }) {
  const [open, setOpen] = useState(!hire.mailing_address);
  const [address, setAddress] = useState(hire.mailing_address ?? "");
  const [phone, setPhone] = useState(hire.phone ?? "");
  const [city, setCity] = useState(hire.work_city ?? "");
  const [entity, setEntity] = useState(hire.entity_type ?? "Individual / sole proprietor");
  const [biz, setBiz] = useState(hire.business_name ?? "");
  const [legal, setLegal] = useState(hire.full_name ?? "");
  const [stateCode, setStateCode] = useState(hire.mailing_address ? hire.state_code : "");
  const [states, setStates] = useState<{ state_code: string; state_name: string; allowed: boolean }[]>([]);
  useEffect(() => {
    (supabase as any).from("nl_contractor_states").select("state_code, state_name, allowed").order("state_name").then(({ data }: any) => setStates(data ?? []));
  }, []);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("nl_contractor_set_profile" as any, { p_address: address, p_phone: phone, p_city: city, p_entity: entity, p_business: biz, p_state: stateCode, p_full_name: legal.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved. Your documents are ready below.");
    setOpen(false); onSaved();
  };
  return (
    <section className="rounded-2xl border border-white/12 bg-[hsl(222,40%,8%)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        {hire.mailing_address ? <CheckCircle2 className="h-5 w-5 text-[hsl(152,60%,58%)]" /> : <span className="grid h-6 w-6 place-items-center rounded-md bg-white/10 text-xs font-black text-white">1</span>}
        <h2 className="flex-1 text-[15px] font-bold text-white">Your details</h2>
        {hire.mailing_address && !open && <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Edit</Button>}
      </div>
      {!open ? (
        <p className="mt-2 text-sm text-white/85">{hire.mailing_address} · works from {hire.work_city}, {hire.state_code}</p>
      ) : (
        <div className="mt-3 space-y-3 text-sm">
          <p className="text-white/80">The law requires your contract to show your mailing address. Your city picks the right documents for where you work.</p>
          <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-white/75">Full legal name (as it appears on your contract)</span>
            <Input className="mt-1" value={legal} onChange={(e) => setLegal(e.target.value)} autoComplete="name" /></label>
          <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-white/75">Mailing address</span>
            <Input className="mt-1" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, state, ZIP" autoComplete="street-address" /></label>
          <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-white/75">State you work from</span>
            <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={stateCode} onChange={(e) => setStateCode(e.target.value)}>
              <option value="">Choose your state</option>
              {states.map((x) => <option key={x.state_code} value={x.state_code} disabled={!x.allowed}>{x.state_name}{x.allowed ? "" : " (not available)"}</option>)}
            </select></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-white/75">City you work from</span>
              <Input className="mt-1" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Seattle" /></label>
            <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-white/75">Phone</span>
              <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-white/75">You work as</span>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={entity} onChange={(e) => setEntity(e.target.value)}>
                {["Individual / sole proprietor", "Single-member LLC", "LLC (multi-member)", "S corporation", "C corporation", "Partnership"].map((x) => <option key={x}>{x}</option>)}
              </select></label>
            <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-white/75">Business name (optional)</span>
              <Input className="mt-1" value={biz} onChange={(e) => setBiz(e.target.value)} placeholder="If you have one" /></label>
          </div>
          <p className="text-xs text-white/70">Your state picks which state-specific documents you sign.</p>
          <Button onClick={save} disabled={busy || address.trim().length < 8 || city.trim().length < 2 || !stateCode || legal.trim().length < 3}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save details</Button>
        </div>
      )}
    </section>
  );
}

function printStatement(p: LedgerPayout, lines: LedgerEntry[]) {
  const w = window.open("", "_blank"); if (!w) return;
  const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
  const rows = lines.map((e) => `<tr><td>${esc(e.client)}</td><td>${e.role === "setter" ? "Booked" : "Closed"}</td><td>${(e.rate * 100).toFixed(0)}% of ${money(Number(e.base))}</td><td>${fmtDate(e.earned_on)}</td><td style="text-align:right">${money(Number(e.amount))}</td></tr>`).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Commission statement</title><style>body{font:13px/1.5 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#111}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:6px;text-align:left}</style></head><body>
<h2>Commission statement</h2><p>Vivid Virtual Creations LLC dba NewLight Marketing<br/>Sent ${fmtDate(p.sent_on)} by ${PAY_METHOD[p.method] ?? p.method}${p.reference && p.reference !== "—" ? ` · confirmation ${esc(p.reference)}` : ""}${p.note ? ` · ${esc(p.note)}` : ""}</p>
<table><tr><th>Client</th><th>Credit</th><th>Rate</th><th>Client money cleared</th><th style="text-align:right">Amount</th></tr>${rows}<tr><td colspan=4>Fees or deductions</td><td style="text-align:right">None</td></tr><tr><td colspan=4><b>Total sent</b></td><td style="text-align:right"><b>${money(Number(p.total))}</b></td></tr></table>
<p style="color:#555;margin-top:20px">No taxes were withheld. Keep this for your records.</p><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
  w.document.close();
}

type BankRow = { account_holder: string; bank_name: string; account_type: string; routing_last4: string; account_last4: string; updated_at: string };
/** Where commission is sent. Full numbers are encrypted at rest; this screen only ever shows the last 4. */
function BankForm() {
  const [row, setRow] = useState<BankRow | null | undefined>(undefined);
  const [edit, setEdit] = useState(false);
  const [holder, setHolder] = useState("");
  const [bank, setBank] = useState("");
  const [type, setType] = useState("checking");
  const [routing, setRouting] = useState("");
  const [acct, setAcct] = useState("");
  const [acct2, setAcct2] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { data } = await (supabase as any).from("nl_rep_bank").select("account_holder, bank_name, account_type, routing_last4, account_last4, updated_at").maybeSingle();
    setRow((data as BankRow) ?? null);
  }, []);
  useEffect(() => { load(); }, [load]);
  const digits = (x: string) => x.replace(/\D/g, "");
  const valid = holder.trim().length >= 3 && bank.trim().length >= 2 && digits(routing).length === 9 && digits(acct).length >= 4 && digits(acct) === digits(acct2);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("nl_rep_bank_save" as any, { p_holder: holder.trim(), p_bank: bank.trim(), p_type: type, p_routing: routing, p_account: acct });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setRouting(""); setAcct(""); setAcct2(""); setEdit(false);
    toast.success("Bank details saved securely.");
    load();
  };
  if (row === undefined) return null;
  return (
    <div className="mt-4 border-t border-white/10 pt-4 text-sm text-white/85">
      <p className="font-bold text-white">Bank details for commission</p>
      {row && !edit ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-[hsl(152,60%,58%)]" />
          <span>{row.bank_name} · {row.account_type} · account ending {row.account_last4}</span>
          <Button size="sm" variant="ghost" onClick={() => { setEdit(true); setHolder(row.account_holder); setBank(row.bank_name); setType(row.account_type); }}>Change</Button>
        </div>
      ) : (
        <div className="mt-2 space-y-3">
          <p className="text-white/75">Encrypted when saved. NewLight can read it only to send your payment; you'll only ever see the last 4 digits here.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-white/75">Name on the account</span>
              <Input className="mt-1" value={holder} onChange={(e) => setHolder(e.target.value)} autoComplete="off" /></label>
            <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-white/75">Bank name</span>
              <Input className="mt-1" value={bank} onChange={(e) => setBank(e.target.value)} autoComplete="off" /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-white/75">Type</span>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="checking">Checking</option><option value="savings">Savings</option>
              </select></label>
            <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-white/75">Routing number (9 digits)</span>
              <Input className="mt-1" inputMode="numeric" value={routing} onChange={(e) => setRouting(e.target.value)} autoComplete="off" /></label>
            <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-white/75">Account number</span>
              <Input className="mt-1" inputMode="numeric" value={acct} onChange={(e) => setAcct(e.target.value)} autoComplete="off" /></label>
          </div>
          <label className="block sm:max-w-xs"><span className="text-xs font-bold uppercase tracking-wider text-white/75">Re-enter account number</span>
            <Input className="mt-1" inputMode="numeric" value={acct2} onChange={(e) => setAcct2(e.target.value)} autoComplete="off" /></label>
          {acct2 && digits(acct) !== digits(acct2) && <p className="text-xs text-[hsl(0,80%,72%)]">The account numbers don't match.</p>}
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy || !valid}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save bank details</Button>
            {row && <Button variant="ghost" onClick={() => setEdit(false)}>Cancel</Button>}
          </div>
        </div>
      )}
    </div>
  );
}
