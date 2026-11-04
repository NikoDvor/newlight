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

type StateRow = { state_code: string; state_name: string; allowed: boolean; note: string | null; report_note?: string | null; tax_note?: string | null; report_days?: number | null };
type Hire = { id: string; email: string; full_name: string; business_name: string | null; state_code: string; commission_terms: string; status: HireStatus; user_id: string | null;
  w9_received_at: string | null; created_at: string; ended_at: string | null; mailing_address: string | null; phone: string | null; work_city: string | null; entity_type: string | null;
  countersigned_at: string | null; countersign_name: string | null; w9_requested_at: string | null; tin_matched_at: string | null; state_report_filed_at: string | null;
  state_report_confirmation: string | null; offboarding: Record<string, string | boolean> | null };
type Sig = { id: string; hire_id: string; doc_slug: string; doc_title: string; doc_version: number; body_snapshot: string; body_sha256: string; typed_name: string; signed_at: string; ip: string | null; user_agent: string | null };
type Doc = { id: string; slug: string; version: number; title: string; body_md: string; active: boolean; created_at: string;
  applies_states: string[] | null; applies_cities: string[] | null; sort_order: number; renew_months: number | null; after_countersign: boolean; summary: string | null };

/** The latest version of every document that applies to this rep (same rules as the database). */
function docsFor(h: Hire, docs: Doc[]) {
  const latest = new Map<string, Doc>();
  for (const d of docs) if (d.active && (!latest.has(d.slug) || latest.get(d.slug)!.version < d.version)) latest.set(d.slug, d);
  const cityKey = `${(h.work_city ?? "").trim().toLowerCase()}|${h.state_code}`;
  return [...latest.values()].filter((d) => (!d.applies_states || d.applies_states.includes(h.state_code))
    && (!d.applies_cities || d.applies_cities.includes(cityKey))).sort((a, b) => a.sort_order - b.sort_order);
}
function currentSig(h: Hire, d: Doc, sigs: Sig[]) {
  return sigs.filter((g) => g.hire_id === h.id && g.doc_slug === d.slug)
    .filter((g) => !d.renew_months || new Date(g.signed_at).getTime() > Date.now() - d.renew_months * 30.44 * 864e5)
    .sort((a, b) => b.signed_at.localeCompare(a.signed_at))[0];
}
function addDays(iso: string, n: number) { const d = new Date(iso); d.setDate(d.getDate() + n); return d; }

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white"><FileSignature className="h-6 w-6" /> Contractor Paperwork</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/80">Commission-only sales reps (1099). The app picks the right documents from where each rep works; they sign in the app. W-9s go through TaxBandits and bank details through your secure link, never into this app.</p>
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
          <TabsTrigger value="agreement">Documents</TabsTrigger>
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
                const need = docsFor(h, docs);
                const done = need.filter((d) => currentSig(h, d, sigs)).length;
                const st = states.find((s) => s.state_code === h.state_code);
                return (
                  <button key={h.id} type="button" onClick={() => setViewing(h)}
                    className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-white/12 bg-[hsl(222,40%,9%)] p-3 text-left hover:border-white/25">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-white">{h.full_name}</p>
                      <p className="truncate text-xs text-white/75">{h.email} · {st?.state_name ?? h.state_code}</p>
                    </div>
                    <div className="text-xs text-white/80">Signed {done}/{need.length}{h.countersigned_at ? " · countersigned" : ""} · {h.w9_received_at ? "W-9 ✓" : "No W-9"}</div>
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

      {viewing && <HireDialog hire={hires.find((x) => x.id === viewing.id) ?? viewing} sigs={sigs} docs={docs} states={states} userId={user?.id}
        onChanged={load} onClose={() => setViewing(null)} />}
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
  const latest = useMemo(() => {
    const m = new Map<string, Doc>();
    for (const d of docs) if (d.active && (!m.has(d.slug) || m.get(d.slug)!.version < d.version)) m.set(d.slug, d);
    return [...m.values()].sort((a, b) => a.sort_order - b.sort_order);
  }, [docs]);
  const [slug, setSlug] = useState("contractor-agreement");
  const current = latest.find((d) => d.slug === slug) ?? latest[0];
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  if (!current) return <p className="text-white/80">No documents found.</p>;
  const who = (d: Doc) => [d.applies_states ? `Reps in ${d.applies_states.join(", ")}` : null, d.applies_cities ? `Reps working in ${d.applies_cities.map((c) => c.replace("|", ", ").replace(/^./, (x) => x.toUpperCase())).join("; ")}` : null].filter(Boolean).join(" · ") || "Every rep";
  const save = async () => {
    setBusy(true);
    const { error } = await db.from("nl_contractor_docs").insert({ slug: current.slug, version: current.version + 1, title: current.title, body_md: text, created_by: userId,
      applies_states: current.applies_states, applies_cities: current.applies_cities, sort_order: current.sort_order, renew_months: current.renew_months,
      after_countersign: current.after_countersign, summary: current.summary });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Saved as version ${current.version + 1}`);
    setEditing(false); onSaved();
  };
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {latest.map((d) => (
          <button key={d.slug} type="button" onClick={() => { setSlug(d.slug); setEditing(false); }}
            className="rounded-xl border p-3 text-left" style={d.slug === current.slug ? { borderColor: "hsl(197,100%,60%)", background: "hsla(197,100%,55%,.1)" } : { borderColor: "rgba(255,255,255,.12)", background: "hsl(222,40%,9%)" }}>
            <p className="text-sm font-bold text-white">{d.title}</p>
            <p className="text-xs text-white/75">{who(d)}{d.renew_months ? ` · re-signed every ${d.renew_months} months` : ""}{d.after_countersign ? " · after you countersign" : ""}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/85"><b className="text-white">{current.title}</b> · version {current.version} · {new Date(current.created_at).toLocaleDateString()}</p>
        {!editing && <Button size="sm" variant="outline" onClick={() => { setText(current.body_md); setEditing(true); }}>Edit (saves a new version)</Button>}
      </div>
      <p className="text-xs text-white/70">The app attaches each document automatically to the reps it applies to; there's nothing to switch on. Anyone who already signed keeps the exact text they signed. Blanks like {"{{contractor_name}}"} fill in automatically.</p>
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

function Row({ done, title, children }: { done: boolean; title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/12 bg-[hsl(222,40%,9%)] p-3">
      <p className="flex items-center gap-2 font-semibold text-white">{done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(152,60%,58%)]" /> : <span className="h-4 w-4 shrink-0 rounded-full border border-white/40" />}{title}</p>
      {children && <div className="mt-2 space-y-2 pl-6 text-xs text-white/85">{children}</div>}
    </div>
  );
}
function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return <Button size="sm" variant={on ? "outline" : "default"} onClick={onClick}>{on ? <><Undo2 className="mr-1.5 h-3.5 w-3.5" />Undo: {label}</> : label}</Button>;
}

/* ---------- One rep: onboarding checklist, documents, offboarding ---------- */
function HireDialog({ hire: h, sigs, docs, states, userId, onChanged, onClose }: { hire: Hire; sigs: Sig[]; docs: Doc[]; states: StateRow[]; userId?: string; onChanged: () => void; onClose: () => void }) {
  const st = states.find((s) => s.state_code === h.state_code);
  const need = docsFor(h, docs);
  const visible = need.filter((d) => !d.after_countersign || h.countersigned_at);
  const agreementSig = sigs.filter((g) => g.hire_id === h.id && g.doc_slug === "contractor-agreement").sort((a, b) => b.signed_at.localeCompare(a.signed_at))[0];
  const allSigned = need.every((d) => (d.after_countersign && !h.countersigned_at) ? false : !!currentSig(h, d, sigs));
  const [csName, setCsName] = useState("");
  const [repDate, setRepDate] = useState(h.state_report_filed_at ?? "");
  const [repConf, setRepConf] = useState(h.state_report_confirmation ?? "");
  const [open, setOpen] = useState<string | null>(null);
  const off = (h.offboarding ?? {}) as Record<string, string | boolean>;
  const reportStart = h.countersigned_at ?? agreementSig?.signed_at ?? h.created_at;
  const reportDue = st?.report_days ? addDays(reportStart, st.report_days) : null;

  const upd = async (fields: Record<string, unknown>, msg: string) => {
    const { error } = await db.from("nl_contractor_hires").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", h.id);
    if (error) return toast.error(error.message);
    await db.rpc("nl_contractor_refresh_status", { p_hire_id: h.id });
    toast.success(msg); onChanged();
  };
  const stamp = (field: string, on: boolean, label: string) => upd({ [field]: on ? new Date().toISOString() : null, ...(field === "w9_received_at" ? { w9_received_by: on ? userId : null } : {}) }, on ? `${label} marked` : `${label} cleared`);
  const countersign = async () => {
    const { error } = await db.rpc("nl_contractor_countersign", { p_hire_id: h.id, p_name: csName });
    if (error) return toast.error(error.message);
    toast.success("Countersigned. The rep can now download the fully signed agreement."); onChanged();
  };
  const ready = !!h.mailing_address && allSigned && !!h.countersigned_at && !!h.w9_received_at && !!h.tin_matched_at && (!st?.report_note || !!h.state_report_filed_at);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{h.full_name}</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid-preserve grid grid-cols-2 gap-2 text-white/85">
            <p><span className="text-white/65">Email</span><br />{h.email}</p>
            <p><span className="text-white/65">Works from</span><br />{h.work_city ? `${h.work_city}, ` : ""}{st?.state_name ?? h.state_code}</p>
            <p><span className="text-white/65">Mailing address</span><br />{h.mailing_address || "Not given yet"}</p>
            <p><span className="text-white/65">Business</span><br />{h.business_name || "—"}{h.entity_type ? ` · ${h.entity_type}` : ""}</p>
          </div>
          {ready && h.status !== "ended" && <p className="rounded-xl border border-[hsla(152,60%,58%,.5)] bg-[hsla(152,60%,40%,.12)] p-3 font-bold text-[hsl(152,60%,70%)]">Fully onboarded: ready to sell and be paid.</p>}

          {h.status !== "ended" && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-white/75">Onboarding, in order</p>
              <Row done={!!h.user_id && !!h.mailing_address} title="1. Rep logs in and enters their details">
                {!h.user_id && <p>They need an app account with {h.email}. Add them on the Team page if they don't have one.</p>}
              </Row>
              <Row done={allSigned} title={`2. Rep signs ${need.length} document${need.length === 1 ? "" : "s"} picked for where they work`}>
                {need.map((d) => {
                  const g = currentSig(h, d, sigs);
                  return (
                    <div key={d.slug} className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 flex-1">{g ? "✓" : "○"} {d.title}{d.after_countersign && !h.countersigned_at ? " (after you countersign)" : ""}</span>
                      {g && <button type="button" className="font-semibold text-[hsl(197,100%,72%)]" onClick={() => setOpen(open === g.id ? null : g.id)}>{open === g.id ? "Hide" : "View"}</button>}
                      {g && <button type="button" className="font-semibold text-[hsl(197,100%,72%)]" onClick={() => printSignedCopy({ title: g.doc_title, body: g.body_snapshot, typedName: g.typed_name, signedAt: g.signed_at, sha256: g.body_sha256, ip: g.ip,
                        countersign: d.slug === "contractor-agreement" && h.countersigned_at ? { name: h.countersign_name ?? "", at: h.countersigned_at } : null })}><Download className="mr-0.5 inline h-3.5 w-3.5" />PDF</button>}
                      {g && open === g.id && (
                        <div className="w-full space-y-2">
                          <p className="text-white/75">Typed name {g.typed_name} · {new Date(g.signed_at).toLocaleString()} · IP {g.ip || "not captured"} · fingerprint {g.body_sha256.slice(0, 16)}…</p>
                          <AgreementText body={g.body_snapshot} />
                        </div>
                      )}
                    </div>
                  );
                })}
                {visible.length === 0 && <p>Nothing yet.</p>}
              </Row>
              <Row done={!!h.countersigned_at} title="3. You countersign">
                {h.countersigned_at ? <p>Countersigned by {h.countersign_name} on {new Date(h.countersigned_at).toLocaleDateString()}. The rep can download the fully signed copy.</p> : agreementSig ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input value={csName} onChange={(e) => setCsName(e.target.value)} placeholder="Type your full name" className="h-9" />
                    <Button size="sm" onClick={countersign} disabled={csName.trim().length < 3}><FileSignature className="mr-1.5 h-3.5 w-3.5" />Countersign</Button>
                  </div>
                ) : <p>Available once the rep signs the agreement.</p>}
              </Row>
              <Row done={!!h.w9_received_at && !!h.tin_matched_at} title="4. W-9 in TaxBandits, tax ID verified">
                <p>Send the W-9 request from TaxBandits, then run its TIN match. Their SSN stays in TaxBandits. No W-9, no pay.</p>
                <div className="flex flex-wrap gap-2">
                  <Toggle on={!!h.w9_requested_at} label="W-9 requested" onClick={() => stamp("w9_requested_at", !h.w9_requested_at, "W-9 requested")} />
                  <Toggle on={!!h.w9_received_at} label="W-9 received" onClick={() => stamp("w9_received_at", !h.w9_received_at, "W-9 received")} />
                  <Toggle on={!!h.tin_matched_at} label="TIN match passed" onClick={() => stamp("tin_matched_at", !h.tin_matched_at, "TIN match")} />
                </div>
              </Row>
              <Row done={!!h.state_report_filed_at || !st?.report_note} title={st?.report_note ? `5. Report them to ${st.state_name}` : "5. State report: not needed for this state"}>
                {st?.report_note && (
                  <>
                    <p>{st.report_note} {reportDue && !h.state_report_filed_at && <b className={reportDue < new Date() ? "text-[hsl(0,80%,72%)]" : "text-white"}>Due by {reportDue.toLocaleDateString()}.</b>} Type their SSN on the state's site from the W-9 in TaxBandits; only the confirmation goes here.</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input type="date" value={repDate} onChange={(e) => setRepDate(e.target.value)} className="h-9 sm:w-44" />
                      <Input value={repConf} onChange={(e) => setRepConf(e.target.value)} placeholder="Confirmation number" className="h-9" />
                      <Button size="sm" disabled={!repDate} onClick={() => upd({ state_report_filed_at: repDate, state_report_confirmation: repConf.trim() || null }, "State report saved")}>Save</Button>
                    </div>
                  </>
                )}
              </Row>
              <Row done={!!h.mailing_address && allSigned} title="6. Bank details saved as a payee in your bank">
                <p>From the rep's upload through your secure link. They never go into this app.</p>
              </Row>
            </div>
          )}

          {h.status !== "ended" ? (
            <details className="rounded-xl border border-white/12 bg-[hsl(222,40%,9%)] p-3">
              <summary className="cursor-pointer font-semibold text-white">Ending the agreement</summary>
              <div className="mt-2 space-y-2 text-xs text-white/85">
                {[
                  ["notice", "Sent written notice by email (14 days, or immediately for a serious breach)"],
                  ["access", "Removed their app access (Team page) the day it ends"],
                  ["data", "Rep confirmed in writing they deleted NewLight data"],
                  ["final", "Final commission statement sent; later commissions still paid as client money clears"],
                ].map(([k, label]) => (
                  <label key={k} className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" checked={!!off[k]} onChange={(e) => upd({ offboarding: { ...off, [k]: e.target.checked ? new Date().toISOString() : false } }, "Saved")} />
                    <span>{label}</span>
                  </label>
                ))}
                <p className="text-white/70">Never make final pay depend on them signing a release.</p>
                <Button size="sm" variant="ghost" className="text-[hsl(0,80%,72%)]" onClick={() => upd({ status: "ended", ended_at: new Date().toISOString() }, `${h.full_name}'s agreement marked ended`).then(onClose)}>Mark agreement ended</Button>
              </div>
            </details>
          ) : <p className="text-white/80">Agreement ended {h.ended_at ? new Date(h.ended_at).toLocaleDateString() : ""}. Keep these records for 6 years.</p>}
        </div>
      </DialogContent>
    </Dialog>
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
      <p className="font-bold text-white">Secure link for payout bank details</p>
      <p className="mt-1 text-xs text-white/80">Make a file-request (upload-only) link into a folder only you can open, with two-step login turned on (for example a Dropbox File Request or a Google Drive folder). Reps upload the bank account they want paid to there; save it as a payee in your bank. W-9s go through TaxBandits (it requests, stores and verifies them), not this link.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        <Button onClick={save} disabled={url.trim() === saved || !/^https:\/\//.test(url.trim())}>Save link</Button>
      </div>
    </div>
  );
}
