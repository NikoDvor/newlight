import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, FileSignature, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { AgreementText, printSignedCopy, type Packet, type PacketDoc } from "@/lib/contractorPaperwork";

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
            <p>You'll get an email invite from our payout service. Fill in your W-9 and the bank account you want commission paid to <b className="text-white">there</b>.</p>
            <p className="flex items-start gap-2 text-white/75"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />NewLight's app never asks for your Social Security number or bank details. If anyone asks for them here, by text or by email, don't send them.</p>
          </div>
        )}
      </section>
    </div>
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
