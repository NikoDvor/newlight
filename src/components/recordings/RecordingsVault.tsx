import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, Mic, FileText, Upload, Search, X, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NEWLIGHT_INTERNAL_CLIENT_ID } from "@/hooks/useEmployeeClientId";

/**
 * Meeting recordings vault — one component for every place it shows:
 *   mine — a salesman's own recordings (employee app / client team member)
 *   team — everyone in a workspace (NewLight admin, client owner, admin's sub-account view)
 * Zoom meetings on NewLight's account arrive automatically (zoom-webhook). Anything else is uploaded here.
 * Files live in the private "meeting-recordings" bucket at <client_id>/<owner>/<id>/…; opened with 1-hour signed links.
 */

export interface RecordingRow {
  id: string; client_id: string; owner_user_id: string | null; lead_id: string | null; event_id: string | null;
  source: "zoom" | "upload"; title: string | null; meeting_kind: string | null; started_at: string | null;
  duration_minutes: number | null; video_path: string | null; audio_path: string | null; transcript: string | null;
  zoom_share_url: string | null; zoom_share_password: string | null; status: string; error: string | null; created_at: string;
}

const db = supabase as any;
const KIND: Record<string, string> = { discovery: "Discovery", closing: "Closing", onboarding: "Onboarding", check_in: "Check-in", service: "Service" };

export default function RecordingsVault({ mode, clientId, title, leadId }: { mode: "mine" | "team"; clientId: string; title?: string; leadId?: string }) {
  const { user } = useWorkspace();
  const { toast } = useToast();
  const [rows, setRows] = useState<RecordingRow[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [leads, setLeads] = useState<Record<string, string>>({});
  const [owner, setOwner] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<RecordingRow | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    let query = db.from("nl_meeting_recordings").select("*").eq("client_id", clientId).order("started_at", { ascending: false, nullsFirst: false }).limit(500);
    if (mode === "mine") query = query.eq("owner_user_id", user.id);
    if (leadId) query = query.eq("lead_id", leadId);
    const { data } = await query;
    const list: RecordingRow[] = data || [];
    setRows(list);
    const ownerIds = Array.from(new Set(list.map((r) => r.owner_user_id).filter(Boolean)));
    const leadIds = Array.from(new Set(list.map((r) => r.lead_id).filter(Boolean)));
    const [{ data: emps }, { data: ls }] = await Promise.all([
      ownerIds.length ? db.from("employee_profiles").select("user_id, full_name").in("user_id", ownerIds) : Promise.resolve({ data: [] }),
      leadIds.length ? db.from("nl_bdr_leads").select("id, business_name").in("id", leadIds) : Promise.resolve({ data: [] }),
    ]);
    setNames(Object.fromEntries((emps || []).map((e: any) => [e.user_id, e.full_name])));
    setLeads(Object.fromEntries((ls || []).map((l: any) => [l.id, l.business_name])));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id, clientId, mode, leadId]);

  const filtered = useMemo(() => (rows || []).filter((r) => {
    if (owner && r.owner_user_id !== owner) return false;
    if (!q.trim()) return true;
    const hay = `${r.title || ""} ${r.lead_id ? leads[r.lead_id] || "" : ""} ${r.owner_user_id ? names[r.owner_user_id] || "" : ""}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  }), [rows, owner, q, leads, names]);

  const when = (iso: string | null) => iso ? new Date(iso).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{title || (mode === "mine" ? "My Recordings" : "Meeting Recordings")}</h1>
          <p className="mt-1 text-sm text-white/50">Meetings on our Zoom save here automatically. Anything else — upload it.</p>
        </div>
        <Button onClick={() => setShowUpload(true)}><Upload className="mr-1.5 h-4 w-4" />Upload a recording</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/35" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by firm or title" className="pl-8" />
        </div>
        {mode === "team" && (
          <select value={owner} onChange={(e) => setOwner(e.target.value)} className="rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white">
            <option value="" className="bg-[hsl(215,35%,12%)]">Everyone</option>
            {(Object.entries(names) as [string, string][]).sort((a, b) => a[1].localeCompare(b[1])).map(([id, n]) => <option key={id} value={id} className="bg-[hsl(215,35%,12%)]">{n}</option>)}
          </select>
        )}
      </div>

      {!rows ? <p className="py-10 text-center text-sm text-white/40">Loading…</p> : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] py-12 text-center">
          <Film className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-2 text-sm text-white/50">{rows.length ? "Nothing matches." : "No recordings yet."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r, i) => (
            <motion.button key={r.id} type="button" onClick={() => setOpen(r)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }}
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-[hsla(222,40%,8%,.82)] p-3 text-left hover:border-[hsla(197,100%,55%,.45)]">
              <div className="w-1 self-stretch rounded-full" style={{ background: r.status === "ready" ? "hsl(197,100%,58%)" : r.status === "processing" ? "hsl(42,100%,60%)" : r.status === "failed" ? "hsl(0,85%,60%)" : "hsl(28,100%,60%)" }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-white">{r.lead_id && leads[r.lead_id] ? leads[r.lead_id] : r.title || "Recording"}</div>
                <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-white/50">
                  <span>{when(r.started_at || r.created_at)}</span>
                  {r.meeting_kind && <span>{KIND[r.meeting_kind] || r.meeting_kind}</span>}
                  {r.duration_minutes ? <span>{r.duration_minutes} min</span> : null}
                  {mode === "team" && r.owner_user_id && <span className="text-white/70">{names[r.owner_user_id] || "Salesman"}</span>}
                  <span>{r.source === "zoom" ? "Zoom" : "Uploaded"}</span>
                  {r.status === "processing" && <span className="text-[hsl(42,100%,65%)]">Saving…</span>}
                  {r.status === "failed" && <span className="text-[hsl(0,85%,70%)]">Copy failed — Zoom link kept</span>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5 text-white/45">
                {r.video_path && <Film className="h-4 w-4" />}{r.audio_path && <Mic className="h-4 w-4" />}{r.transcript && <FileText className="h-4 w-4" />}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {open && <Player rec={open} lead={open.lead_id ? leads[open.lead_id] : undefined} canDelete={mode === "team"} onClose={() => setOpen(null)} onDeleted={() => { setOpen(null); load(); }} />}
        {showUpload && <UploadSheet clientId={clientId} leadId={leadId} onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); load(); toast({ title: "Recording saved" }); }} />}
      </AnimatePresence>
    </div>
  );
}

function Player({ rec, lead, canDelete, onClose, onDeleted }: { rec: RecordingRow; lead?: string; canDelete: boolean; onClose: () => void; onDeleted: () => void }) {
  const [video, setVideo] = useState<string | null>(null);
  const [audio, setAudio] = useState<string | null>(null);
  const [tab, setTab] = useState<"watch" | "transcript">("watch");
  useEffect(() => {
    const sign = async (p: string | null, set: (u: string) => void) => {
      if (!p) return;
      const { data } = await supabase.storage.from("meeting-recordings").createSignedUrl(p, 3600);
      if (data?.signedUrl) set(data.signedUrl);
    };
    sign(rec.video_path, setVideo); sign(rec.audio_path, setAudio);
  }, [rec.id]);
  const transcript = useMemo(() => (rec.transcript || "").replace(/^WEBVTT.*\n/, "").replace(/^\d+\n/gm, "").replace(/^\d{2}:\d{2}:\d{2}\.\d{3} --> .*\n/gm, "").trim(), [rec.transcript]);
  const del = async () => {
    if (!window.confirm("Delete this recording for everyone?")) return;
    const paths = [rec.video_path, rec.audio_path].filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from("meeting-recordings").remove(paths);
    await db.from("nl_meeting_recordings").delete().eq("id", rec.id);
    onDeleted();
  };
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: 30 }}
        className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[hsl(222,40%,7%)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[16px] font-semibold text-white">{lead || rec.title || "Recording"}</div>
            <div className="text-[11px] text-white/45">{rec.started_at ? new Date(rec.started_at).toLocaleString() : ""}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-white/60" /></button>
        </div>
        {rec.transcript && (
          <div className="mt-3 inline-flex rounded-lg border border-white/10 p-0.5">
            {(["watch", "transcript"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-md px-3 py-1 text-[11px] font-semibold ${tab === t ? "bg-white/10 text-white" : "text-white/50"}`}>{t === "watch" ? "Watch / listen" : "Transcript"}</button>
            ))}
          </div>
        )}
        {tab === "watch" ? (
          <div className="mt-3 space-y-3">
            {rec.video_path ? (video ? <video src={video} controls playsInline className="w-full rounded-lg bg-black" /> : <Loader2 className="mx-auto h-6 w-6 animate-spin text-white/40" />) : null}
            {!rec.video_path && rec.audio_path && (audio ? <audio src={audio} controls className="w-full" /> : <Loader2 className="mx-auto h-6 w-6 animate-spin text-white/40" />)}
            {!rec.video_path && !rec.audio_path && rec.zoom_share_url && (
              <a href={rec.zoom_share_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[hsl(197,100%,65%)] underline">
                Watch on Zoom <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {rec.zoom_share_url && rec.zoom_share_password && <p className="text-[11px] text-white/45">Zoom passcode: {rec.zoom_share_password}</p>}
            {rec.status === "processing" && <p className="text-[12px] text-[hsl(42,100%,65%)]">Still saving from Zoom — check back in a few minutes.</p>}
          </div>
        ) : (
          <pre className="mt-3 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg bg-white/[0.03] p-3 text-[12.5px] leading-relaxed text-white/80">{transcript}</pre>
        )}
        {canDelete && (
          <button type="button" onClick={del} className="mt-4 inline-flex items-center gap-1 text-[11px] text-white/40 hover:text-[hsl(0,85%,70%)]"><Trash2 className="h-3.5 w-3.5" />Delete recording</button>
        )}
      </motion.div>
    </motion.div>
  );
}

function UploadSheet({ clientId, leadId, onClose, onDone }: { clientId: string; leadId?: string; onClose: () => void; onDone: () => void }) {
  const { user } = useWorkspace();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [leadQ, setLeadQ] = useState("");
  const [leadHits, setLeadHits] = useState<{ id: string; business_name: string }[]>([]);
  const [lead, setLead] = useState<{ id: string; business_name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (leadId || leadQ.trim().length < 2) { setLeadHits([]); return; }
    const t = setTimeout(async () => {
      const { data } = await db.from("nl_bdr_leads").select("id, business_name").ilike("business_name", `%${leadQ.trim()}%`).limit(8);
      setLeadHits(data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [leadQ, leadId]);

  const save = async () => {
    if (!file || !user?.id) return;
    setBusy(true); setPct(10);
    try {
      const id = crypto.randomUUID();
      const isVideo = file.type.startsWith("video/");
      const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "m4a")).toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${clientId}/${user.id}/${id}/upload.${ext}`;
      const timer = setInterval(() => setPct((p) => Math.min(90, p + 3)), 600);
      const { error: upErr } = await supabase.storage.from("meeting-recordings").upload(path, file, { contentType: file.type || undefined, upsert: false });
      clearInterval(timer);
      if (upErr) throw upErr;
      setPct(95);
      const { error } = await db.from("nl_meeting_recordings").insert({
        id, client_id: clientId, owner_user_id: user.id, lead_id: leadId || lead?.id || null, source: "upload",
        title: title.trim() || lead?.business_name || file.name, started_at: new Date(date).toISOString(),
        video_path: isVideo ? path : null, audio_path: isVideo ? null : path, size_bytes: file.size, status: "ready",
      });
      if (error) throw error;
      onDone();
    } catch (e: any) {
      const big = /size|large|413|exceed/i.test(e?.message || "");
      toast({ title: "Upload failed", description: big ? "That file is too big for one upload. Trim it or upload the audio only." : e?.message || "Try again.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={busy ? undefined : onClose}>
      <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: 30 }}
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[hsl(222,40%,7%)] p-5 space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Upload a recording</h2><button type="button" onClick={onClose} disabled={busy}><X className="h-5 w-5 text-white/60" /></button></div>
        <p className="text-[12px] text-white/50">For meetings that weren't on our Zoom — in person, phone, or the client's own Zoom. Always tell everyone you're recording first.</p>
        <input ref={inputRef} type="file" accept="video/*,audio/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button type="button" onClick={() => inputRef.current?.click()} className="w-full rounded-xl border border-dashed border-[hsla(197,100%,55%,.4)] py-6 text-center text-sm text-white/70 hover:bg-white/[0.03]">
          {file ? <span className="text-white">{file.name} · {(file.size / 1048576).toFixed(0)} MB</span> : "Choose a video or audio file"}
        </button>
        {!leadId && clientId === NEWLIGHT_INTERNAL_CLIENT_ID && (
          <div className="relative">
            <Input value={lead ? lead.business_name : leadQ} onChange={(e) => { setLead(null); setLeadQ(e.target.value); }} placeholder="Which firm? (optional)" />
            {leadHits.length > 0 && !lead && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-white/10 bg-[hsl(222,40%,9%)]">
                {leadHits.map((l) => <button key={l.id} type="button" onClick={() => { setLead(l); setLeadHits([]); }} className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-white/5">{l.business_name}</button>)}
              </div>
            )}
          </div>
        )}
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" />
        <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        {busy && <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><motion.div className="h-full bg-[hsl(197,100%,58%)]" animate={{ width: `${pct}%` }} /></div>}
        <Button className="w-full" disabled={!file || busy} onClick={save}>{busy ? "Uploading…" : "Save recording"}</Button>
      </motion.div>
    </motion.div>
  );
}
