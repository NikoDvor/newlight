import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSignature, Loader2, Plus, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { AgreementText, STATUS_COLOR, STATUS_LABEL, defaultCommissionTerms, printSignedCopy, type HireStatus } from "@/lib/contractorPaperwork";

type StateRow = { state_code: string; state_name: string; allowed: boolean; note: string | null; report_note?: string | null; tax_note?: string | null };
type Hire = { id: string; email: string; full_name: string; business_name: string | null; state_code: string; commission_terms: string; status: HireStatus; user_id: string | null; w9_received_at: string | null; created_at: string; ended_at: string | null };
type Sig = { id: string; hire_id: string; doc_title: string; doc_version: number; body_snapshot: string; body_sha256: string; typed_name: string; signed_at: string; ip: string | null; user_agent: string | null };
type Doc = { id: string; slug: string; version: number; title: string; body_md: string; active: boolean; created_at: string };

const db = supabase as any;

export default function AdminContractors() {
  const { user, isAdmin } = useWorkspace();
  const { pathname } = useLocation();
  const [hires, setHires] = useState<Hire[]>([]);
  const [sigs, setSigs] = useState<Sig[]>([]);
  const [states, setStates] = useState<StateRow[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<Hire | null>(null);

  const load = useCallback(async () => {
    const [h, g, s, d] = await Promise.all([
      db.from("nl_contractor_hires").select("*").order("created_at", { ascending: false }),
      db.from("nl_contractor_signatures").select("*").order("signed_at", { ascending: false }),
      db.from("nl_contractor_states").select("*").order("state_name"),
      db.from("nl_contractor_docs").select("*").order("version", { ascending: false }),
    ]);
    const err = h.error || g.error || s.error || d.error;
    if (err) toast.error(err.message);
    setHires(h.data ?? []); setSigs(g.data ?? []); setStates(s.data ?? []); setDocs(d.data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => ({
    invited: hires.filter((x) => x.status === "invited").length,
    signed: hires.filter((x) => x.status === "signed").length,
    active: hires.filter((x) => x.status === "active").length,
  }), [hires]);

  if (!isAdmin) return <p className="p-6 text-white/80">Admins only.</p>;

  const setW9 = async (h: Hire, received: boolean) => {
    const signed = sigs.some((g) => g.hire_id === h.id);
    const status: HireStatus = received ? (signed ? "active" : "invited") : (signed ? "signed" : "invited");
    const { error } = await db.from("nl_contractor_hires").update({
      w9_received_at: received ? new Date().toISOString() : null, w9_received_by: received ? user?.id : null, status, updated_at: new Date().toISOString(),
    }).eq("id", h.id);
    if (error) return toast.error(error.message);
    toast.success(received ? "W-9 marked received" : "W-9 mark removed");
    load();
  };
  const endHire = async (h: Hire) => {
    const { error } = await db.from("nl_contractor_hires").update({ status: "ended", ended_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", h.id);
    if (error) return toast.error(error.message);
    toast.success(`${h.full_name}'s agreement marked ended`);
    setViewing(null); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white"><FileSignature className="h-6 w-6" /> Contractor Paperwork</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/80">Commission-only sales reps (1099). They sign their agreement in the app; their W-9 and bank details go to your payout service, never into this app.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link to={(pathname.startsWith("/admin") ? "/admin" : "") + "/commissions"}>Commissions &amp; payouts</Link></Button>
          <Button onClick={() => setAdding(true)}><Plus className="mr-1.5 h-4 w-4" /> Add contractor</Button>
        </div>
      </div>

      <div className="grid-preserve grid grid-cols-3 gap-2 sm:gap-3">
        {(["invited", "signed", "active"] as HireStatus[]).map((k) => (
          <div key={k} className="rounded-xl border border-white/12 bg-[hsl(222,40%,9%)] p-3">
            <p className="text-2xl font-black tabular-nums" style={{ color: STATUS_COLOR[k] }}>{counts[k as "invited"]}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/75">{STATUS_LABEL[k]}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="people">
        <TabsList>
          <TabsTrigger value="people">Contractors</TabsTrigger>
          <TabsTrigger value="agreement">Agreement</TabsTrigger>
          <TabsTrigger value="states">States</TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="mt-4 space-y-4">
          <W9LinkCard />
          {loading ? <Loader2 className="h-5 w-5 animate-spin text-white/60" /> : hires.length === 0 ? (
            <div className="rounded-2xl border border-white/12 bg-[hsl(222,40%,8%)] p-8 text-center">
              <p className="font-bold text-white">No contractors yet</p>
              <p className="mt-1 text-sm text-white/75">Add one and they'll see "My Paperwork" the next time they log in.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {hires.map((h) => {
                const sig = sigs.find((g) => g.hire_id === h.id);
                const st = states.find((s) => s.state_code === h.state_code);
                return (
                  <button key={h.id} type="button" onClick={() => setViewing(h)}
                    className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-white/12 bg-[hsl(222,40%,9%)] p-3 text-left hover:border-white/25">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white">{h.full_name}</p>
                      <p className="truncate text-xs text-white/75">{h.email} · {st?.state_name ?? h.state_code}</p>
                    </div>
                    <div className="text-xs text-white/80">{sig ? `Signed ${new Date(sig.signed_at).toLocaleDateString()}` : "Not signed"} · {h.w9_received_at ? "W-9 ✓" : "No W-9"}</div>
                    <span className="rounded-md border px-2 py-0.5 text-xs font-bold" style={{ color: STATUS_COLOR[h.status], borderColor: STATUS_COLOR[h.status] }}>{STATUS_LABEL[h.status]}</span>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="agreement" className="mt-4">
          <AgreementEditor docs={docs} userId={user?.id} onSaved={load} />
        </TabsContent>

        <TabsContent value="states" className="mt-4">
          <StatesEditor states={states} onSaved={load} />
        </TabsContent>
      </Tabs>

      {adding && <AddDialog states={states} userId={user?.id} existing={hires} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {viewing && (() => {
            const h = hires.find((x) => x.id === viewing.id) ?? viewing;
            const sig = sigs.find((g) => g.hire_id === h.id);
            return (
              <>
                <DialogHeader><DialogTitle>{h.full_name}</DialogTitle></DialogHeader>
                <div className="space-y-4 text-sm">
                  <div className="grid-preserve grid grid-cols-2 gap-2 text-white/85">
                    <p><span className="text-white/65">Email</span><br />{h.email}</p>
                    <p><span className="text-white/65">State</span><br />{states.find((s) => s.state_code === h.state_code)?.state_name ?? h.state_code}</p>
                    <p><span className="text-white/65">Business</span><br />{h.business_name || "—"}</p>
                    <p><span className="text-white/65">Account linked</span><br />{h.user_id ? "Yes" : "Not yet — they haven't logged in"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {h.status !== "ended" && (h.w9_received_at
                      ? <Button size="sm" variant="outline" onClick={() => setW9(h, false)}><Undo2 className="mr-1.5 h-4 w-4" /> Undo W-9 received</Button>
                      : <Button size="sm" onClick={() => setW9(h, true)}><CheckCircle2 className="mr-1.5 h-4 w-4" /> W-9 received in payout service</Button>)}
                    {sig && <Button size="sm" variant="outline" onClick={() => printSignedCopy({ title: sig.doc_title, body: sig.body_snapshot, typedName: sig.typed_name, signedAt: sig.signed_at, sha256: sig.body_sha256, ip: sig.ip })}><Download className="mr-1.5 h-4 w-4" /> Signed copy (PDF)</Button>}
                    {h.status !== "ended" && <Button size="sm" variant="ghost" className="text-[hsl(0,80%,72%)]" onClick={() => endHire(h)}>End agreement</Button>}
                  </div>
                  {sig ? (
                    <>
                      <div className="rounded-xl border border-white/12 bg-[hsl(222,40%,9%)] p-3 text-xs text-white/80">
                        <p className="font-bold text-white">Signature record</p>
                        <p className="mt-1">Typed name: <b className="text-white">{sig.typed_name}</b> · {new Date(sig.signed_at).toLocaleString()} · version {sig.doc_version}</p>
                        <p>IP: {sig.ip || "not captured"} · Device: {sig.user_agent?.slice(0, 90) || "—"}</p>
                        <p className="break-all">Fingerprint (SHA-256): {sig.body_sha256}</p>
                      </div>
                      <AgreementText body={sig.body_snapshot} />
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-white">Exhibit A (their commission terms)</p>
                      <AgreementText body={h.commission_terms} />
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddDialog({ states, userId, existing, onClose, onSaved }: { states: StateRow[]; userId?: string; existing: Hire[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [biz, setBiz] = useState("");
  const [state, setState] = useState("");
  const [rate, setRate] = useState(15);
  const [terms, setTerms] = useState(defaultCommissionTerms(15));
  const [busy, setBusy] = useState(false);
  const st = states.find((s) => s.state_code === state);
  const dup = existing.some((h) => h.status !== "ended" && h.email.toLowerCase() === email.trim().toLowerCase());
  const ok = name.trim().length > 2 && /.+@.+\..+/.test(email) && !!st && st.allowed && terms.trim().length > 10 && !dup;

  const pickRate = (r: number) => { setRate(r); setTerms(defaultCommissionTerms(r)); };
  const save = async () => {
    setBusy(true);
    const { error } = await db.from("nl_contractor_hires").insert({
      full_name: name.trim(), email: email.trim().toLowerCase(), business_name: biz.trim() || null, state_code: state, commission_terms: terms.trim(), created_by: userId,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Added. They'll see the agreement when they log in with that email.");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle>Add a commission-only contractor</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <Field label="Full legal name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email they log in with"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {dup && <p className="mt-1 text-xs text-[hsl(0,80%,72%)]">This email already has open paperwork.</p>}
          </Field>
          <Field label="Their business name (optional)"><Input value={biz} onChange={(e) => setBiz(e.target.value)} placeholder="If they have an LLC or business" /></Field>
          <Field label="State they live and work in">
            <select value={state} onChange={(e) => setState(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
              <option value="">Pick a state</option>
              {states.map((s) => <option key={s.state_code} value={s.state_code} disabled={!s.allowed}>{s.state_name}{s.allowed ? "" : " (can't hire as contractor)"}</option>)}
            </select>
            {st?.note && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-[hsl(35,92%,70%)]"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{st.note}</p>
            )}
            {st?.allowed && st.report_note && <p className="mt-1.5 text-xs text-white/80"><b className="text-white">Your to-do:</b> {st.report_note} Do it on the state's website with their W-9 (never in this app).</p>}
          </Field>
          <Field label="Commission">
            <div className="grid-preserve grid grid-cols-2 gap-2">
              {[{ r: 15, l: "15% of setup (books meetings)" }, { r: 20, l: "20% of setup (closes)" }].map((x) => (
                <button key={x.r} type="button" onClick={() => pickRate(x.r)} className="rounded-lg border px-3 py-2 text-left text-xs font-semibold"
                  style={rate === x.r ? { borderColor: "hsl(197,100%,60%)", background: "hsla(197,100%,55%,.14)", color: "white" } : { borderColor: "rgba(255,255,255,.15)", color: "rgba(255,255,255,.85)" }}>{x.l}</button>
              ))}
            </div>
            <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={8} className="mt-2 font-mono text-xs" />
            <p className="mt-1 text-xs text-white/70">This becomes Exhibit A of their agreement. You can change the wording before you save; it's locked once they sign.</p>
          </Field>
          <p className="rounded-lg border border-white/12 bg-white/[0.04] p-2.5 text-xs text-white/80">They need an app account with this same email. If they don't have one yet, add them on the Team page.</p>
          <Button onClick={save} disabled={!ok || busy} className="w-full">{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add contractor</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><p className="mb-1 text-xs font-bold uppercase tracking-wider text-white/75">{label}</p>{children}</div>;
}

function AgreementEditor({ docs, userId, onSaved }: { docs: Doc[]; userId?: string; onSaved: () => void }) {
  const current = docs.find((d) => d.slug === "contractor-agreement" && d.active);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  if (!current) return <p className="text-white/80">No agreement found.</p>;
  const save = async () => {
    setBusy(true);
    const { error } = await db.from("nl_contractor_docs").insert({ slug: current.slug, version: current.version + 1, title: current.title, body_md: text, created_by: userId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Saved as version ${current.version + 1}`);
    setEditing(false); onSaved();
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/85"><b className="text-white">{current.title}</b> · version {current.version} · {new Date(current.created_at).toLocaleDateString()}</p>
        {!editing && <Button size="sm" variant="outline" onClick={() => { setText(current.body_md); setEditing(true); }}>Edit (saves a new version)</Button>}
      </div>
      <p className="text-xs text-white/70">Anyone who already signed keeps the exact text they signed. People who haven't signed yet get the newest version. Blanks like {"{{contractor_name}}"} and {"{{commission_terms}}"} fill in automatically.</p>
      {editing ? (
        <>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={24} className="font-mono text-xs" />
          <div className="flex gap-2">
            <Button onClick={save} disabled={busy || text.trim() === current.body_md.trim()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save as version {current.version + 1}</Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </>
      ) : <AgreementText body={current.body_md} />}
    </div>
  );
}

function StatesEditor({ states, onSaved }: { states: StateRow[]; onSaved: () => void }) {
  const toggle = async (s: StateRow, allowed: boolean) => {
    const { error } = await db.from("nl_contractor_states").update({ allowed, updated_at: new Date().toISOString() }).eq("state_code", s.state_code);
    if (error) return toast.error(error.message);
    onSaved();
  };
  return (
    <div className="space-y-2">
      <p className="text-xs text-white/75">California, Massachusetts and New Jersey are off by default: their law treats a rep selling our core service as an employee no matter what the contract says. Only turn one on after your attorney says so.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {states.map((s) => (
          <div key={s.state_code} className="flex items-start gap-3 rounded-xl border border-white/12 bg-[hsl(222,40%,9%)] p-3">
            <Switch checked={s.allowed} onCheckedChange={(v) => toggle(s, v)} className="mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{s.state_name}</p>
              {s.note && <p className="text-xs text-white/75">{s.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Where reps send their W-9 and payout bank details: a secure upload link you control (never this app, never email). */
function W9LinkCard() {
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState("");
  useEffect(() => {
    db.from("nl_contractor_settings").select("value").eq("key", "w9_upload_url").maybeSingle().then(({ data }: any) => { setUrl(data?.value ?? ""); setSaved(data?.value ?? ""); });
  }, []);
  const save = async () => {
    const { error } = await db.from("nl_contractor_settings").upsert({ key: "w9_upload_url", value: url.trim(), updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    setSaved(url.trim()); toast.success("Saved. Reps see this link on their paperwork page.");
  };
  return (
    <div className="rounded-2xl border border-white/12 bg-[hsl(222,40%,8%)] p-4">
      <p className="font-bold text-white">Secure link for W-9s and bank details</p>
      <p className="mt-1 text-xs text-white/80">Make a file-request (upload-only) link into a folder only you can open, with two-step login turned on (for example a Dropbox File Request or a Google Drive folder). Reps upload their W-9 and payout bank details there. Then save that bank info as a payee in your bank, and click "W-9 received" on the rep.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        <Button onClick={save} disabled={url.trim() === saved || !/^https:\/\//.test(url.trim())}>Save link</Button>
      </div>
    </div>
  );
}
