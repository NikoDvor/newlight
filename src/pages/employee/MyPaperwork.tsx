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
  const [w9Url, setW9Url] = useState("");
  useEffect(() => {
    (supabase as any).from("nl_contractor_settings").select("value").eq("key", "w9_upload_url").maybeSingle().then(({ data }: any) => setW9Url(data?.value ?? ""));
  }, []);

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
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">My Paperwork</h1>
        <p className="mt-1 text-sm text-white/80">Two steps and you're set up to get paid. Everything else in the app stays open while you do this.</p>
      </div>

      <div className="grid-preserve grid grid-cols-2 gap-2">
        <StepTile n={1} label="Sign your agreement" done={unsigned.length === 0} />
        <StepTile n={2} label="W-9 for payouts" done={w9} />
      </div>

      {packet.docs.map((d) => <DocCard key={d.doc_id} doc={d} onSigned={load} />)}

      <section className="rounded-2xl border border-white/12 bg-[hsl(222,40%,8%)] p-4 sm:p-5">
        <div className="flex items-center gap-2">
          {w9 ? <CheckCircle2 className="h-5 w-5 text-[hsl(152,60%,58%)]" /> : <span className="grid h-6 w-6 place-items-center rounded-md bg-white/10 text-xs font-black text-white">2</span>}
          <h2 className="text-[15px] font-bold text-white">W-9 for payouts</h2>
        </div>
        {w9 ? (
          <p className="mt-2 text-sm text-white/85">Received. You're all set to be paid commission.</p>
        ) : (
          <div className="mt-2 space-y-2 text-sm text-white/85">
            <p>Fill out the IRS <a className="font-semibold text-[hsl(197,100%,72%)] underline" href="https://www.irs.gov/pub/irs-pdf/fw9.pdf" target="_blank" rel="noreferrer">Form W-9</a>, and write down the bank account you want commission sent to (bank name, routing and account number). Upload both {w9Url ? <a className="font-semibold text-[hsl(197,100%,72%)] underline" href={w9Url} target="_blank" rel="noreferrer">through this secure link</a> : "through the secure link NewLight sends you"}. Never by email or text.</p>
            <p>Commission can't be sent until your W-9 is in.</p>
            <p className="flex items-start gap-2 text-white/75"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Your Social Security number and bank details only ever go through that secure link: never into this app, and never by email or text.</p>
          </div>
        )}
      </section>

      <MyPay />
    </div>
  );
}

type LedgerEntry = { id: string; client: string; role: string; rate: number; base: number; amount: number; status: string; earned_on: string; due_on: string; note: string | null; payout_id: string | null };
type LedgerPayout = { id: string; total: number; method: string; sent_on: string; reference: string };
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
                <span className="flex-1">{fmtDate(p.sent_on)} · {p.method === "ach" ? "ACH" : "Wire"} · ref {p.reference}</span>
                <b className="text-white">{money(Number(p.total))}</b>
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

function DocCard({ doc, onSigned }: { doc: PacketDoc; onSigned: () => void }) {
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
          <Button size="sm" variant="outline" onClick={() => printSignedCopy({ title: doc.title, body: s.body, typedName: s.typed_name, signedAt: s.signed_at, sha256: s.body_sha256 })}>
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
        <span className="grid h-6 w-6 place-items-center rounded-md bg-white/10 text-xs font-black text-white">1</span>
        <h2 className="text-[15px] font-bold text-white">Read and sign: {doc.title}</h2>
      </div>
      <AgreementText body={doc.body} className="max-h-[60vh] overflow-y-auto" />
      <div className="space-y-3 rounded-2xl border border-white/12 bg-[hsl(222,40%,8%)] p-4 sm:p-5">
        <label className="flex items-start gap-3 text-sm text-white/90">
          <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
          <span>I've read this agreement. I agree to sign it electronically, and that my typed name is my legal signature.</span>
        </label>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-white/75" htmlFor="sig-name">Type your full legal name</label>
          <Input id="sig-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" className="mt-1 font-serif text-lg" autoComplete="name" />
        </div>
        <Button onClick={sign} disabled={busy || !consent || name.trim().length < 3} className="w-full sm:w-auto">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />} Sign agreement
        </Button>
      </div>
    </section>
  );
}
