import { useState } from "react";
import { Eye } from "lucide-react";
import { CheckCircle2, Circle, FileSignature, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { AgreementText, printSignedCopy } from "@/lib/contractorPaperwork";

const db = supabase as any;
type Doc = { doc_id: string; slug: string; title: string; summary: string | null; body: string;
  signature: null | { signed_at: string; typed_name: string; doc_version: number; body: string; body_sha256: string; ip: string | null } };
type Packet = { hire: { id: string; full_name: string; email: string; state_code: string; status: string; mailing_address: string | null; work_city: string | null;
  w9_requested_at: string | null; w9_received_at: string | null; countersigned_at: string | null; countersign_name: string | null }; w9_url: string | null; docs: Doc[] };

/** One salesman's paperwork from the admin side: who signed what (with the full text), W-9 status and the secure link. */
export default function RepPaperwork({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<Packet | null | undefined>(undefined);
  const [bank, setBank] = useState<{ account_holder: string; bank_name: string; account_type: string; account_last4: string; submitted_at: string } | null>(null);
  const [full, setFull] = useState<{ routing: string; account: string } | null>(null);
  const reveal = async () => {
    const { data, error } = await db.rpc("nl_rep_bank_reveal", { p_user: userId });
    if (error) return toast.error(error.message);
    setFull(data);
  };
  const load = async () => {
    db.from("nl_rep_bank").select("account_holder, bank_name, account_type, account_last4, submitted_at").eq("user_id", userId).maybeSingle().then(({ data }: any) => setBank(data ?? null));
    const { data, error } = await db.rpc("nl_contractor_admin_packet", { p_user: userId });
    if (error) { toast.error(error.message); setP(null); return; }
    setP((data as Packet) ?? null);
  };
  const show = () => { setOpen(true); setP(undefined); setFull(null); load(); };
  const signed = p ? p.docs.filter((d) => d.signature).length : 0;

  return (
    <>
      <button onClick={show} title="Paperwork" className="inline-flex items-center gap-1 text-white/40 transition-colors hover:text-[hsl(var(--nl-electric))]">
        <FileSignature className="h-3.5 w-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto" style={{ background: "hsl(218 35% 12%)", border: "1px solid hsla(211,96%,60%,.15)", color: "white" }}>
          <DialogHeader><DialogTitle className="text-white">Paperwork · {name || "Rep"}</DialogTitle></DialogHeader>
          {p === undefined ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-white/60" /> : p === null ? (
            <p className="text-sm text-white/75">No paperwork record for this account. <Link to="/admin/contractors" className="underline">Add one in Contractors</Link>.</p>
          ) : (
            <div className="space-y-4 text-sm">
              <p className="text-white/75">{p.hire.email} · works from {p.hire.mailing_address ? `${p.hire.work_city}, ${p.hire.state_code}` : "(hasn't added details yet)"} · <b className="text-white">{signed}/{p.docs.length} signed</b>{p.hire.countersigned_at ? " · countersigned" : ""}</p>

              <div className="space-y-2">
                {p.docs.map((d) => (
                  <div key={d.doc_id} className="rounded-lg bg-white/[0.05] px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {d.signature ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <Circle className="h-4 w-4 shrink-0 text-white/30" />}
                      <span className="flex-1 font-semibold">{d.title}</span>
                      <span className={`text-xs ${d.signature ? "text-emerald-300" : "text-amber-300"}`}>{d.signature ? "Signed" : "Not signed"}</span>
                    </div>
                    {d.signature && <p className="mt-1 text-xs text-white/60">{d.signature.typed_name} · {new Date(d.signature.signed_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}{d.signature.ip ? ` · ${d.signature.ip}` : ""}</p>}
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-xs font-semibold text-[hsl(var(--nl-electric))]">{d.signature ? "Read the signed document" : "Read the document"}</summary>
                      <AgreementText body={d.signature ? d.signature.body : d.body} className="mt-2 max-h-80 overflow-y-auto" />
                      {d.signature && (
                        <button className="mt-2 text-xs font-semibold text-[hsl(var(--nl-electric))]"
                          onClick={() => printSignedCopy({ title: d.title, body: d.signature!.body, typedName: d.signature!.typed_name, signedAt: d.signature!.signed_at, sha256: d.signature!.body_sha256, ip: d.signature!.ip, countersign: p.hire.countersigned_at ? { name: p.hire.countersign_name ?? "", at: p.hire.countersigned_at } : null })}>
                          Save / print a copy
                        </button>
                      )}
                    </details>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-white/[0.05] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {p.hire.w9_received_at ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Circle className="h-4 w-4 text-white/30" />}
                  <span className="flex-1 font-semibold">W-9 &amp; payout bank details</span>
                  <span className={`text-xs ${p.hire.w9_received_at ? "text-emerald-300" : "text-amber-300"}`}>{p.hire.w9_received_at ? `Received ${new Date(p.hire.w9_received_at).toLocaleDateString()}` : p.hire.w9_requested_at ? "Requested" : "Not received"}</span>
                </div>
                <div className="mt-2 border-t border-white/10 pt-2 text-xs">
                  {bank ? (
                    <>
                      <p className="text-white/80"><b className="text-white">Bank:</b> {bank.bank_name} · {bank.account_type} · {bank.account_holder} · ending {bank.account_last4} · added {new Date(bank.submitted_at).toLocaleDateString()}</p>
                      {full ? (
                        <p className="mt-1 select-all font-mono text-white">Routing {full.routing} · Account {full.account}</p>
                      ) : (
                        <button onClick={reveal} className="mt-1 inline-flex items-center gap-1 font-semibold text-[hsl(var(--nl-electric))]"><Eye className="h-3.5 w-3.5" />Show full numbers (logged)</button>
                      )}
                    </>
                  ) : <p className="text-white/60"><b className="text-white/80">Bank:</b> not added yet. The rep adds it in My Paperwork &amp; Pay.</p>}
                </div>
              </div>

              <p className="text-xs text-white/55">Countersign, mark the W-9 received and verify the tax ID on the <Link to="/admin/contractors" className="underline">Contractors page</Link>.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
