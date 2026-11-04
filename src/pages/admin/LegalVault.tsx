import { useCallback, useEffect, useState } from "react";
import { Archive, Download, Eye, FileText, Loader2, Lock, Search, ShieldCheck, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { AgreementText, fmtDate, money, printSignedCopy, simpleMarkdownToHtml } from "@/lib/contractorPaperwork";

/**
 * Legal Vault: every legal record in one place. Rep agreements and signatures, client service agreements,
 * W-9 / state-report records, commission payouts, company documents, and an activity log nobody can edit.
 * Never holds SSNs, bank numbers or ID images (W-9s live in TaxBandits, bank details in the bank).
 */
type Row = { kind: string; id: string; title: string; person: string | null; hire_id?: string; deal_id?: string; date: string | null; retain_until: string | null;
  detail: string | null; category?: string; hold?: boolean; archived?: boolean; path?: string };
type Hire = { id: string; full_name: string; email: string; state_code: string; status: string; mailing_address: string | null; work_city: string | null;
  countersigned_at: string | null; countersign_name: string | null; w9_received_at: string | null; tin_matched_at: string | null; state_report_filed_at: string | null;
  state_report_confirmation: string | null; created_at: string; ended_at: string | null; offboarding: Record<string, unknown> | null };
type LegalDoc = { id: string; category: string; title: string; doc_date: string | null; storage_path: string; file_name: string; mime_type: string | null; size_bytes: number | null;
  sha256: string | null; notes: string | null; legal_hold: boolean; archived_at: string | null; uploaded_at: string };
type Audit = { id: number; at: string; actor: string | null; action: string; table_name: string; row_id: string | null; changes: Record<string, unknown> | null };

const db = supabase as any;
const KIND: Record<string, string> = {
  rep_document: "Rep signed document", countersignature: "Company countersignature", state_report: "State contractor report", w9: "W-9 / tax ID check",
  payout: "Commission payout", client_agreement: "Client service agreement", company_document: "Company document",
};
const CATEGORY: Record<string, string> = {
  formation: "Formation (Articles, operating agreement)", state_filing: "State filings (Statements of Information)", tax: "Tax (EIN letter, IRS notices)",
  insurance: "Insurance", attorney: "Attorney reviews and letters", agreement_template: "Signed-off agreement templates", other: "Other",
};
const TABLE: Record<string, string> = {
  nl_contractor_hires: "Contractor", nl_contractor_docs: "Document", nl_contractor_states: "State setting", nl_contractor_settings: "Setting",
  nl_contractor_signatures: "Signature", nl_commission_sales: "Sale", nl_commission_credits: "Sale credit", nl_commission_client_payments: "Client payment",
  nl_commission_entries: "Commission line", nl_commission_payouts: "Payout", nl_legal_documents: "Company document",
};

export default function LegalVault() {
  const { isAdmin } = useWorkspace();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [hires, setHires] = useState<Hire[]>([]);
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [hold, setHold] = useState(false);
  const [people, setPeople] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [idx, h, d, s, ep] = await Promise.all([
      db.rpc("nl_legal_vault_index"),
      db.from("nl_contractor_hires").select("*").order("full_name"),
      db.from("nl_legal_documents").select("*").order("uploaded_at", { ascending: false }),
      db.from("nl_contractor_settings").select("value").eq("key", "legal_hold").maybeSingle(),
      db.from("employee_profiles").select("user_id, full_name, email"),
    ]);
    const err = idx.error || h.error || d.error;
    if (err) toast.error(err.message);
    setRows(idx.data ?? []); setHires(h.data ?? []); setDocs(d.data ?? []); setHold(s.data?.value === "on");
    setPeople(Object.fromEntries((ep.data ?? []).map((p: any) => [p.user_id, p.full_name || p.email])));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!isAdmin) return <p className="p-6 text-white/80">Admins only.</p>;
  if (!rows) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;

  const setGlobalHold = async (on: boolean) => {
    if (!on && !window.confirm("Turn off the legal hold? Only do this when your attorney says the dispute or audit is over.")) return;
    const { error } = await db.from("nl_contractor_settings").upsert({ key: "legal_hold", value: on ? "on" : "off", updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    setHold(on); toast.success(on ? "Legal hold on: nothing in the vault can be deleted." : "Legal hold off.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white"><ShieldCheck className="h-6 w-6" /> Legal Vault</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/80">Every legal record in one place. Signed records can't be edited or deleted, and every change anyone makes is logged. W-9s stay in TaxBandits and bank details in your bank; neither is ever stored here.</p>
        </div>
        <label className="flex items-center gap-3 rounded-xl border px-3 py-2" style={hold ? { borderColor: "hsla(35,92%,62%,.6)", background: "hsla(35,92%,40%,.12)" } : { borderColor: "rgba(255,255,255,.14)" }}>
          <Lock className={`h-4 w-4 ${hold ? "text-[hsl(35,92%,66%)]" : "text-white/70"}`} />
          <span className="text-sm font-semibold text-white">Legal hold</span>
          <Switch checked={hold} onCheckedChange={setGlobalHold} />
        </label>
      </div>
      {hold && <p className="rounded-xl border border-[hsla(35,92%,62%,.5)] bg-[hsl(30,45%,12%)] p-3 text-sm text-white">A legal hold is on. Nothing in the vault can be deleted until you turn it off.</p>}

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">All records</TabsTrigger>
          <TabsTrigger value="reps">Rep files</TabsTrigger>
          <TabsTrigger value="company">Company documents</TabsTrigger>
          <TabsTrigger value="activity">Activity log</TabsTrigger>
        </TabsList>
        <TabsContent value="records" className="mt-4"><Records rows={rows} hires={hires} /></TabsContent>
        <TabsContent value="reps" className="mt-4"><RepFiles hires={hires} rows={rows} people={people} /></TabsContent>
        <TabsContent value="company" className="mt-4"><CompanyDocs docs={docs} globalHold={hold} onChanged={load} /></TabsContent>
        <TabsContent value="activity" className="mt-4"><Activity people={people} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return <div className="rounded-2xl border border-white/12 bg-[hsl(222,40%,8%)] p-8 text-center"><p className="font-bold text-white">{title}</p><p className="mt-1 text-sm text-white/75">{body}</p></div>;
}
const selectCls = "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground";
const when = (d: string | null) => (d ? fmtDate(d.slice(0, 10)) : "—");

/* ---------- All records ---------- */
function Records({ rows, hires }: { rows: Row[]; hires: Hire[] }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [view, setView] = useState<{ title: string; body: string; meta: string; print: () => void } | null>(null);
  const shown = rows.filter((r) => (kind === "all" || r.kind === kind)
    && (!q || `${r.title} ${r.person ?? ""} ${r.detail ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  const open = async (r: Row) => {
    if (r.kind === "rep_document") {
      const { data, error } = await db.from("nl_contractor_signatures").select("*").eq("id", r.id).single();
      if (error) return toast.error(error.message);
      const h = hires.find((x) => x.id === data.hire_id);
      const cs = data.doc_slug === "contractor-agreement" && h?.countersigned_at ? { name: h.countersign_name ?? "", at: h.countersigned_at } : null;
      setView({ title: data.doc_title, body: data.body_snapshot,
        meta: `Signed by ${data.typed_name} · ${new Date(data.signed_at).toLocaleString()} · IP ${data.ip || "not captured"} · fingerprint ${data.body_sha256}`,
        print: () => printSignedCopy({ title: data.doc_title, body: data.body_snapshot, typedName: data.typed_name, signedAt: data.signed_at, sha256: data.body_sha256, ip: data.ip, countersign: cs }) });
    } else if (r.kind === "client_agreement") {
      if (!r.deal_id) return toast.error("This agreement isn't linked to a deal.");
      const { data, error } = await supabase.functions.invoke("get-signed-agreement", { body: { deal_id: r.deal_id } });
      if (error || !data?.url) return toast.error(data?.error || "Couldn't open the signed agreement");
      window.open(data.url, "_blank", "noopener");
    } else if (r.kind === "company_document" && r.path) {
      const { data, error } = await supabase.storage.from("legal-vault").createSignedUrl(r.path, 300);
      if (error) return toast.error(error.message);
      window.open(data.signedUrl, "_blank", "noopener");
    }
  };
  const canOpen = (k: string) => ["rep_document", "client_agreement", "company_document"].includes(k);
  const csv = () => {
    const lines = [["Record type", "Record", "Person or company", "Date", "Keep until", "Details"],
      ...shown.map((r) => [KIND[r.kind] ?? r.kind, r.title, r.person ?? "", r.date?.slice(0, 10) ?? "", r.retain_until ?? "Permanently", r.detail ?? ""])];
    const blob = new Blob([lines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `legal-vault-index-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, document, confirmation…" className="pl-9" />
        </div>
        <select className={selectCls} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="all">All records ({rows.length})</option>
          {Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l} ({rows.filter((r) => r.kind === k).length})</option>)}
        </select>
        <Button variant="outline" onClick={csv} disabled={!shown.length}><Download className="mr-1.5 h-4 w-4" />Index (CSV)</Button>
      </div>
      {shown.length === 0 ? <Empty title="No records yet" body="Signed agreements, payouts, state reports and company documents appear here automatically." /> : (
        <div className="space-y-1.5">
          {shown.map((r) => (
            <div key={`${r.kind}:${r.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/12 bg-[hsl(222,40%,9%)] px-3 py-2.5 text-sm">
              <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
                <p className="truncate font-semibold text-white">{r.title}{r.archived ? " (archived)" : ""}</p>
                <p className="truncate text-xs text-white/75">{KIND[r.kind] ?? r.kind} · {r.person ?? "—"}{r.detail ? ` · ${r.detail}` : ""}</p>
              </div>
              <span className="text-xs text-white/80">{when(r.date)}</span>
              <span className="text-xs text-white/70">Keep until {r.retain_until ? fmtDate(r.retain_until) : "permanently"}</span>
              {r.hold && <Lock className="h-3.5 w-3.5 text-[hsl(35,92%,66%)]" />}
              {canOpen(r.kind) && <Button size="sm" variant="ghost" onClick={() => open(r)}><Eye className="mr-1 h-3.5 w-3.5" />Open</Button>}
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {view && (
            <>
              <DialogHeader><DialogTitle>{view.title}</DialogTitle></DialogHeader>
              <p className="break-all text-xs text-white/75">{view.meta}</p>
              <Button size="sm" variant="outline" className="w-fit" onClick={view.print}><Download className="mr-1.5 h-4 w-4" />Save as PDF</Button>
              <AgreementText body={view.body} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- One complete file per rep ---------- */
function RepFiles({ hires, rows, people }: { hires: Hire[]; rows: Row[]; people: Record<string, string> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const bundle = async (h: Hire) => {
    setBusy(h.id);
    const [sg, po, en, au] = await Promise.all([
      db.from("nl_contractor_signatures").select("*").eq("hire_id", h.id).order("signed_at"),
      db.from("nl_commission_payouts").select("*").eq("hire_id", h.id).order("sent_on"),
      db.from("nl_commission_entries").select("*, nl_commission_sales(client_name)").eq("hire_id", h.id).order("earned_on"),
      db.from("nl_contractor_audit").select("*").eq("table_name", "nl_contractor_hires").eq("row_id", h.id).order("at"),
    ]);
    setBusy(null);
    const err = sg.error || po.error || en.error || au.error;
    if (err) return toast.error(err.message);
    const esc = (s: string) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
    const retain = rows.find((r) => r.hire_id === h.id)?.retain_until;
    const docsHtml = (sg.data ?? []).map((g: any) => `<section class="doc">${simpleMarkdownToHtml(g.body_snapshot)}
      <div class="sig"><p>Signed electronically by <b>${esc(g.typed_name)}</b> · ${esc(new Date(g.signed_at).toLocaleString())} · IP ${esc(g.ip || "not captured")}</p>
      <p>Version ${g.doc_version} · fingerprint (SHA-256) ${esc(g.body_sha256)}</p>
      ${g.doc_slug === "contractor-agreement" && h.countersigned_at ? `<p>Countersigned for Vivid Virtual Creations LLC dba NewLight Marketing by <b>${esc(h.countersign_name ?? "")}</b> · ${esc(new Date(h.countersigned_at).toLocaleString())}</p>` : ""}</div></section>`).join("");
    const payRows = (po.data ?? []).map((p: any) => `<tr><td>${esc(p.sent_on)}</td><td>${esc(p.method.toUpperCase())}</td><td>${esc(p.bank_reference)}</td><td>${p.reconciled_at ? "Yes" : "No"}</td><td style="text-align:right">${money(Number(p.total))}</td></tr>`).join("");
    const entRows = (en.data ?? []).map((e: any) => `<tr><td>${esc(e.nl_commission_sales?.client_name ?? "")}</td><td>${e.role === "setter" ? "Booked" : "Closed"}</td><td>${(e.rate * 100).toFixed(0)}% of ${money(Number(e.base_amount))}</td><td>${esc(e.earned_on)}</td><td>${esc(e.status)}</td><td style="text-align:right">${money(Number(e.amount))}</td></tr>`).join("");
    const audRows = (au.data ?? []).map((a: any) => `<tr><td>${esc(new Date(a.at).toLocaleString())}</td><td>${esc(a.actor ? people[a.actor] ?? "Someone" : "System")}</td><td>${esc(a.action)}</td><td>${esc(Object.keys(a.changes ?? {}).filter((k) => !["id", "created_at"].includes(k)).join(", "))}</td></tr>`).join("");
    const w = window.open("", "_blank"); if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(h.full_name)} — contractor file</title>
<style>body{font:13px/1.5 Georgia,serif;color:#111;max-width:780px;margin:32px auto;padding:0 20px}h1{font-size:22px}h2{font-size:16px;margin-top:20px}table{width:100%;border-collapse:collapse;font-family:system-ui,sans-serif;font-size:12px}td,th{border-bottom:1px solid #ddd;padding:5px;text-align:left}
.doc{page-break-before:always}.sig{margin-top:18px;border-top:2px solid #111;padding-top:8px;font-family:system-ui,sans-serif;font-size:12px}.cover td:first-child{width:220px;color:#555}</style></head><body>
<h1>Contractor file: ${esc(h.full_name)}</h1><p>Vivid Virtual Creations LLC dba NewLight Marketing · prepared ${esc(new Date().toLocaleString())}</p>
<table class="cover">
<tr><td>Email</td><td>${esc(h.email)}</td></tr><tr><td>Mailing address</td><td>${esc(h.mailing_address ?? "—")}</td></tr>
<tr><td>Works from</td><td>${esc([h.work_city, h.state_code].filter(Boolean).join(", "))}</td></tr><tr><td>Status</td><td>${esc(h.status)}${h.ended_at ? ` (ended ${esc(h.ended_at.slice(0, 10))})` : ""}</td></tr>
<tr><td>Countersigned</td><td>${h.countersigned_at ? `${esc(h.countersign_name ?? "")}, ${esc(h.countersigned_at.slice(0, 10))}` : "No"}</td></tr>
<tr><td>W-9 received / TIN verified</td><td>${h.w9_received_at ? esc(h.w9_received_at.slice(0, 10)) : "No"} / ${h.tin_matched_at ? esc(h.tin_matched_at.slice(0, 10)) : "No"} (form held in TaxBandits)</td></tr>
<tr><td>State contractor report</td><td>${h.state_report_filed_at ? `${esc(h.state_report_filed_at)}${h.state_report_confirmation ? `, confirmation ${esc(h.state_report_confirmation)}` : ""}` : "Not filed / not required"}</td></tr>
<tr><td>Keep these records until</td><td>${retain ? esc(fmtDate(retain)) : "6 years after the last payment"}</td></tr></table>
<h2>Commission lines</h2><table><tr><th>Client</th><th>Credit</th><th>Rate</th><th>Client money cleared</th><th>Status</th><th style="text-align:right">Amount</th></tr>${entRows || `<tr><td colspan=6>None</td></tr>`}</table>
<h2>Payouts sent</h2><table><tr><th>Sent</th><th>How</th><th>Bank confirmation</th><th>Matched to statement</th><th style="text-align:right">Total</th></tr>${payRows || `<tr><td colspan=5>None</td></tr>`}</table>
<h2>Changes to this contractor's record</h2><table><tr><th>When</th><th>Who</th><th>Action</th><th>Fields</th></tr>${audRows || `<tr><td colspan=4>None</td></tr>`}</table>
${docsHtml}
<script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`);
    w.document.close();
  };
  if (!hires.length) return <Empty title="No contractors yet" body="Each rep's complete file appears here once you add them." />;
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-white/75">One printable file per rep: every signed document with its signature record, W-9 and state-report status, commission lines, payouts and the change history. Save it as a PDF for your attorney or an audit.</p>
      {hires.map((h) => (
        <div key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/12 bg-[hsl(222,40%,9%)] px-3 py-2.5 text-sm">
          <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
            <p className="truncate font-semibold text-white">{h.full_name}</p>
            <p className="truncate text-xs text-white/75">{h.email} · {h.status}{h.ended_at ? ` · ended ${fmtDate(h.ended_at.slice(0, 10))}` : ""}</p>
          </div>
          <span className="text-xs text-white/70">{rows.filter((r) => r.hire_id === h.id).length} records</span>
          <Button size="sm" variant="outline" onClick={() => bundle(h)} disabled={busy === h.id}>{busy === h.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}Full file (PDF)</Button>
        </div>
      ))}
    </div>
  );
}

/* ---------- Company documents ---------- */
async function sha256Hex(file: File) {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function CompanyDocs({ docs, globalHold, onChanged }: { docs: LegalDoc[]; globalHold: boolean; onChanged: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("formation");
  const [docDate, setDocDate] = useState("");
  const [notes, setNotes] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const upload = async () => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return toast.error("Files must be under 25 MB.");
    setBusy(true);
    try {
      const sha = await sha256Hex(file);
      if (docs.some((d) => d.sha256 === sha)) { toast.error("This exact file is already in the vault."); return; }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);
      const path = `${category}/${crypto.randomUUID()}-${safe}`;
      const up = await supabase.storage.from("legal-vault").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
      if (up.error) { toast.error(up.error.message); return; }
      const { error } = await db.from("nl_legal_documents").insert({ category, title: title.trim(), doc_date: docDate || null, storage_path: path, file_name: file.name,
        mime_type: file.type || null, size_bytes: file.size, sha256: sha, notes: notes.trim() || null });
      if (error) { await supabase.storage.from("legal-vault").remove([path]); toast.error(error.message); return; }
      toast.success("Saved to the vault");
      setFile(null); setTitle(""); setDocDate(""); setNotes(""); setConfirm(false); onChanged();
    } finally { setBusy(false); }
  };
  const act = async (d: LegalDoc, fields: Record<string, unknown>, msg: string) => {
    const { error } = await db.from("nl_legal_documents").update(fields).eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success(msg); onChanged();
  };
  const remove = async (d: LegalDoc) => {
    if (!window.confirm(`Delete "${d.title}"? This is only allowed within 24 hours of uploading it.`)) return;
    const { error } = await db.from("nl_legal_documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    await supabase.storage.from("legal-vault").remove([d.storage_path]);
    toast.success("Deleted"); onChanged();
  };
  const openDoc = async (d: LegalDoc) => {
    const { data, error } = await supabase.storage.from("legal-vault").createSignedUrl(d.storage_path, 300);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank", "noopener");
  };
  const list = docs.filter((d) => showArchived || !d.archived_at);
  const recent = (d: LegalDoc) => Date.now() - new Date(d.uploaded_at).getTime() < 24 * 3600e3;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/12 bg-[hsl(222,40%,8%)] p-4">
        <p className="flex items-center gap-2 font-bold text-white"><Upload className="h-4 w-4" />Add a company document</p>
        <p className="mt-1 text-xs text-white/80">Articles of Organization, Statements of Information, the IRS EIN letter, insurance policies, attorney letters, agreement templates your attorney approved. Private to admins. Each file is fingerprinted so you can prove it wasn't changed.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm"><span className="text-xs font-bold uppercase tracking-wider text-white/75">File</span>
            <Input type="file" className="mt-1" accept=".pdf,.png,.jpg,.jpeg,.heic,.docx,.doc,.txt" onChange={(e) => { const f = e.target.files?.[0] ?? null; setFile(f); if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, "")); }} /></label>
          <label className="block text-sm"><span className="text-xs font-bold uppercase tracking-wider text-white/75">Type</span>
            <select className={`${selectCls} mt-1 w-full`} value={category} onChange={(e) => setCategory(e.target.value)}>{Object.entries(CATEGORY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="block text-sm"><span className="text-xs font-bold uppercase tracking-wider text-white/75">Title</span>
            <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Articles of Organization (filed Oct 9, 2024)" /></label>
          <label className="block text-sm"><span className="text-xs font-bold uppercase tracking-wider text-white/75">Date on the document</span>
            <Input type="date" className="mt-1" value={docDate} onChange={(e) => setDocDate(e.target.value)} /></label>
          <label className="block text-sm sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wider text-white/75">Notes (optional)</span>
            <Input className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        </div>
        <label className="mt-3 flex items-start gap-2 text-xs text-white/85">
          <input type="checkbox" className="mt-0.5" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
          <span>This file has no Social Security numbers, bank or card numbers, or ID images (black them out first; W-9s belong in TaxBandits).</span>
        </label>
        <Button className="mt-3" onClick={upload} disabled={!file || title.trim().length < 3 || !confirm || busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save to vault</Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-white">{list.length} document{list.length === 1 ? "" : "s"}</p>
        <label className="flex items-center gap-2 text-xs text-white/80"><Switch checked={showArchived} onCheckedChange={setShowArchived} />Show archived</label>
      </div>
      {list.length === 0 ? <Empty title="No company documents yet" body="Start with the Articles of Organization, both Statements of Information and the EIN letter." /> : (
        <div className="space-y-1.5">
          {list.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/12 bg-[hsl(222,40%,9%)] px-3 py-2.5 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-white/70" />
              <div className="min-w-0 basis-[calc(100%-2rem)] sm:flex-1 sm:basis-auto">
                <p className="truncate font-semibold text-white">{d.title}{d.archived_at ? " (archived)" : ""}</p>
                <p className="truncate text-xs text-white/75">{CATEGORY[d.category] ?? d.category} · {d.doc_date ? fmtDate(d.doc_date) : "no date"} · added {fmtDate(d.uploaded_at.slice(0, 10))}{d.notes ? ` · ${d.notes}` : ""}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => openDoc(d)}><Eye className="mr-1 h-3.5 w-3.5" />Open</Button>
              <Button size="sm" variant="ghost" onClick={() => act(d, { legal_hold: !d.legal_hold }, d.legal_hold ? "Hold removed" : "On legal hold")}>
                <Lock className={`mr-1 h-3.5 w-3.5 ${d.legal_hold ? "text-[hsl(35,92%,66%)]" : ""}`} />{d.legal_hold ? "On hold" : "Hold"}</Button>
              {!d.archived_at
                ? <Button size="sm" variant="ghost" onClick={() => act(d, { archived_at: new Date().toISOString() }, "Archived")}><Archive className="mr-1 h-3.5 w-3.5" />Archive</Button>
                : <Button size="sm" variant="ghost" onClick={() => act(d, { archived_at: null }, "Restored")}>Restore</Button>}
              {recent(d) && !d.legal_hold && !globalHold && <Button size="sm" variant="ghost" className="text-[hsl(0,80%,72%)]" onClick={() => remove(d)}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Activity log ---------- */
function Activity({ people }: { people: Record<string, string> }) {
  const [rows, setRows] = useState<Audit[] | null>(null);
  const [table, setTable] = useState("all");
  useEffect(() => {
    let q = db.from("nl_contractor_audit").select("*").order("at", { ascending: false }).limit(300);
    if (table !== "all") q = q.eq("table_name", table);
    q.then(({ data, error }: any) => { if (error) toast.error(error.message); setRows(data ?? []); });
  }, [table]);
  const summary = (a: Audit) => {
    const keys = Object.keys(a.changes ?? {}).filter((k) => !["id", "created_at", "updated_at"].includes(k));
    if (a.action !== "update") return keys.length ? `${keys.length} fields` : "";
    return keys.map((k) => {
      const v = (a.changes as any)[k];
      const fmt = (x: unknown) => (x === null || x === undefined ? "empty" : typeof x === "object" ? "…" : String(x).slice(0, 40));
      return `${k.replace(/_/g, " ")}: ${fmt(v?.[0])} → ${fmt(v?.[1])}`;
    }).join(" · ");
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className={selectCls} value={table} onChange={(e) => setTable(e.target.value)}>
          <option value="all">Everything</option>
          {Object.entries(TABLE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <p className="text-xs text-white/75">Every change to contractor, commission and vault records, with who made it. Nobody can edit or delete this log.</p>
      </div>
      {!rows ? <Loader2 className="h-5 w-5 animate-spin text-white/60" /> : rows.length === 0 ? <Empty title="Nothing logged yet" body="Changes show up here as they happen." /> : (
        <div className="space-y-1">
          {rows.map((a) => (
            <div key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-white/85">
              <span className="text-white/70">{new Date(a.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
              <span className="font-semibold text-white">{a.actor ? people[a.actor] ?? "Someone" : "System"}</span>
              <span>{a.action === "insert" ? "added" : a.action === "update" ? "changed" : "removed"} {TABLE[a.table_name] ?? a.table_name}</span>
              <span className="w-full break-words text-white/70 sm:w-auto sm:flex-1">{summary(a)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

