import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Download, Play, Search, Trash2, Upload, Vault, Video, Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const BUCKET = "practice-recordings";

type RecordingType = "audio" | "video" | "upload";
type SortMode = "recent" | "oldest" | "module";

interface ModuleRow {
  id: string;
  module_number: number;
  module_title: string;
}

interface ChapterRow {
  id: string;
  module_id: string;
  chapter_number: number;
  chapter_title: string;
}

interface RecordingRow {
  id: string;
  user_id: string;
  chapter_id: string;
  file_url: string;
  recording_type: RecordingType;
  created_at: string;
  notes: string | null;
  file_name?: string | null;
  file_size?: number | null;
  duration_seconds?: number | null;
  content_type?: string | null;
}

interface VaultRecording extends RecordingRow {
  playbackUrl: string | null;
  chapter: ChapterRow;
  module: ModuleRow;
}

interface PendingUpload {
  file: File;
  url: string;
  chapterId: string;
  notes: string;
  durationSeconds: number | null;
}

const formatBytes = (bytes: number) => {
  if (!bytes) return "0MB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
};

const formatDuration = (seconds?: number | null) => {
  if (!seconds || seconds < 1) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
};

const readMediaDuration = (url: string, isVideo: boolean) => new Promise<number | null>((resolve) => {
  const media = document.createElement(isVideo ? "video" : "audio");
  media.preload = "metadata";
  media.onloadedmetadata = () => resolve(Number.isFinite(media.duration) ? Math.round(media.duration) : null);
  media.onerror = () => resolve(null);
  media.src = url;
});

const isVideoRecording = (recording: Pick<VaultRecording, "recording_type" | "file_url" | "content_type">) => {
  const path = recording.file_url.toLowerCase();
  return recording.recording_type === "video" || !!recording.content_type?.startsWith("video/") || path.endsWith(".mp4") || path.endsWith(".mov") || path.endsWith(".webm");
};

export function PracticeRecordingVaultPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [recordings, setRecordings] = useState<VaultRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [search, setSearch] = useState("");
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [savingUpload, setSavingUpload] = useState(false);
  const [activeVideo, setActiveVideo] = useState<VaultRecording | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadVault = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const { data: track } = await supabase.from("nl_training_tracks").select("id").eq("track_key", "bdr").maybeSingle();
    const { data: moduleData } = track?.id
      ? await supabase.from("nl_training_modules").select("id,module_number,module_title").eq("track_id", track.id).order("module_number")
      : { data: [] as ModuleRow[] };
    const moduleRows = (moduleData || []) as ModuleRow[];
    setModules(moduleRows);

    const moduleIds = moduleRows.map((module) => module.id);
    const { data: chapterData } = moduleIds.length
      ? await supabase.from("nl_training_chapters").select("id,module_id,chapter_number,chapter_title").in("module_id", moduleIds).order("chapter_number")
      : { data: [] as ChapterRow[] };
    const chapterRows = (chapterData || []) as ChapterRow[];
    setChapters(chapterRows);

    const { data: recordingData, error } = await (supabase as any)
      .from("nl_practice_recordings")
      .select("id,user_id,chapter_id,file_url,recording_type,created_at,notes,file_name,file_size,duration_seconds,content_type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Vault failed to load", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const chapterById = new Map(chapterRows.map((chapter) => [chapter.id, chapter]));
    const moduleById = new Map(moduleRows.map((module) => [module.id, module]));
    const rows = ((recordingData || []) as RecordingRow[]).filter((recording) => chapterById.has(recording.chapter_id));
    const withUrls = await Promise.all(rows.map(async (row) => {
      const chapter = chapterById.get(row.chapter_id)!;
      const module = moduleById.get(chapter.module_id)!;
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(row.file_url, 60 * 60);
      return { ...row, chapter, module, playbackUrl: signed?.signedUrl || null };
    }));
    setRecordings(withUrls);
    setNoteDrafts(Object.fromEntries(withUrls.map((recording) => [recording.id, recording.notes || ""])));
    setLoading(false);
  };

  useEffect(() => {
    loadVault();
    return () => {
      if (pendingUpload?.url) URL.revokeObjectURL(pendingUpload.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRecordings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return recordings
      .filter((recording) => moduleFilter === "all" || recording.module.id === moduleFilter)
      .filter((recording) => !query || `${recording.notes || ""} ${recording.file_name || ""} ${recording.chapter.chapter_title}`.toLowerCase().includes(query))
      .sort((a, b) => {
        if (sortMode === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortMode === "module") return a.module.module_number - b.module.module_number || a.chapter.chapter_number - b.chapter.chapter_number || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [moduleFilter, recordings, search, sortMode]);

  const stats = useMemo(() => {
    const storage = recordings.reduce((sum, recording) => sum + (recording.file_size || 0), 0);
    const modulesPracticed = new Set(recordings.map((recording) => recording.module.id)).size;
    const last = recordings[0]?.created_at ? new Date(recordings[0].created_at).toLocaleDateString() : "—";
    return { storage, modulesPracticed, last };
  }, [recordings]);

  const grouped = useMemo(() => {
    const moduleMap = new Map<string, { module: ModuleRow; count: number; chapters: Map<string, { chapter: ChapterRow; recordings: VaultRecording[] }> }>();
    filteredRecordings.forEach((recording) => {
      if (!moduleMap.has(recording.module.id)) {
        moduleMap.set(recording.module.id, { module: recording.module, count: 0, chapters: new Map() });
      }
      const moduleGroup = moduleMap.get(recording.module.id)!;
      moduleGroup.count += 1;
      if (!moduleGroup.chapters.has(recording.chapter.id)) {
        moduleGroup.chapters.set(recording.chapter.id, { chapter: recording.chapter, recordings: [] });
      }
      moduleGroup.chapters.get(recording.chapter.id)!.recordings.push(recording);
    });
    return Array.from(moduleMap.values()).sort((a, b) => a.module.module_number - b.module.module_number);
  }, [filteredRecordings]);

  const openUploadPicker = () => fileInputRef.current?.click();

  const handleUploadSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
      toast({ title: "Unsupported file", description: "Please choose an audio or video file.", variant: "destructive" });
      return;
    }
    if (pendingUpload?.url) URL.revokeObjectURL(pendingUpload.url);
    const url = URL.createObjectURL(file);
    const durationSeconds = await readMediaDuration(url, file.type.startsWith("video/"));
    setPendingUpload({ file, url, chapterId: chapters[0]?.id || "", notes: "", durationSeconds });
  };

  const saveUpload = async () => {
    if (!pendingUpload || !userId || !pendingUpload.chapterId) return;
    setSavingUpload(true);
    const ext = pendingUpload.file.name.split(".").pop() || "webm";
    const type: RecordingType = pendingUpload.file.type.startsWith("video/") ? "video" : "audio";
    const path = `${userId}/${pendingUpload.chapterId}/${Date.now()}-vault-upload.${ext}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, pendingUpload.file, {
      contentType: pendingUpload.file.type,
      upsert: false,
    });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setSavingUpload(false);
      return;
    }
    const { error: rowError } = await (supabase as any).from("nl_practice_recordings").insert({
      user_id: userId,
      chapter_id: pendingUpload.chapterId,
      file_url: path,
      recording_type: type,
      notes: pendingUpload.notes.trim() || null,
      file_name: pendingUpload.file.name,
      file_size: pendingUpload.file.size,
      duration_seconds: pendingUpload.durationSeconds,
      content_type: pendingUpload.file.type,
    });
    if (rowError) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast({ title: "Save failed", description: rowError.message, variant: "destructive" });
      setSavingUpload(false);
      return;
    }
    URL.revokeObjectURL(pendingUpload.url);
    setPendingUpload(null);
    await loadVault();
    setSavingUpload(false);
    toast({ title: "Recording added to vault" });
  };

  const saveNote = async (recording: VaultRecording) => {
    const nextNotes = noteDrafts[recording.id] || "";
    const { error } = await (supabase as any).from("nl_practice_recordings").update({ notes: nextNotes.trim() || null }).eq("id", recording.id);
    if (error) {
      toast({ title: "Note failed to save", description: error.message, variant: "destructive" });
      return;
    }
    setRecordings((rows) => rows.map((row) => row.id === recording.id ? { ...row, notes: nextNotes.trim() || null } : row));
    toast({ title: "Note saved" });
  };

  const deleteRecording = async (recording: VaultRecording) => {
    const { error } = await (supabase as any).from("nl_practice_recordings").delete().eq("id", recording.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.storage.from(BUCKET).remove([recording.file_url]);
    setRecordings((rows) => rows.filter((row) => row.id !== recording.id));
    toast({ title: "Recording deleted" });
  };

  const downloadRecording = async (recording: VaultRecording) => {
    if (!recording.playbackUrl) return;
    const response = await fetch(recording.playbackUrl);
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = recording.file_name || `practice-recording-${recording.id}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  };

  if (!userId && !loading) {
    return <div className="rounded-2xl border border-primary/15 bg-background/40 p-8 text-sm text-muted-foreground">Sign in to view your Practice Recording Vault.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Vault className="h-4 w-4" /> Recording Vault
          </div>
          <h1 className="page-title">Practice Recording Vault</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Your recorded practice sessions — organized by module and chapter</p>
        </div>
        <Button onClick={openUploadPicker} className="gap-2">
          <Upload className="h-4 w-4" /> Upload Recording
        </Button>
        <input ref={fileInputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={handleUploadSelect} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Total recordings", recordings.length.toString()],
          ["Total storage used", formatBytes(stats.storage)],
          ["Modules practiced", stats.modulesPracticed.toString()],
          ["Last recorded date", stats.last],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-primary/15 bg-background/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {pendingUpload && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{pendingUpload.file.name}</p>
            <span className="text-xs text-muted-foreground">{formatBytes(pendingUpload.file.size)} · {formatDuration(pendingUpload.durationSeconds)}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={pendingUpload.chapterId} onValueChange={(chapterId) => setPendingUpload((prev) => prev ? { ...prev, chapterId } : prev)}>
              <SelectTrigger className="bg-background/50"><SelectValue placeholder="Tag to chapter" /></SelectTrigger>
              <SelectContent>
                {chapters.map((chapter) => {
                  const module = modules.find((m) => m.id === chapter.module_id);
                  return <SelectItem key={chapter.id} value={chapter.id}>M{module?.module_number}.{chapter.chapter_number} — {chapter.chapter_title}</SelectItem>;
                })}
              </SelectContent>
            </Select>
            <Input value={pendingUpload.notes} onChange={(event) => setPendingUpload((prev) => prev ? { ...prev, notes: event.target.value } : prev)} placeholder="Optional saved note" />
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => { URL.revokeObjectURL(pendingUpload.url); setPendingUpload(null); }}>Discard</Button>
            <Button onClick={saveUpload} disabled={savingUpload || !pendingUpload.chapterId}>Save to Vault</Button>
          </div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search recordings by note keyword…" className="pl-10" />
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger><SelectValue placeholder="Filter by module" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modules</SelectItem>
            {modules.map((module) => <SelectItem key={module.id} value={module.id}>Module {module.module_number}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
          <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="module">Module Order</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-xs font-medium text-muted-foreground">{recordings.length} recordings · {formatBytes(stats.storage)} used</div>

      {loading ? (
        <div className="rounded-2xl border border-primary/15 bg-background/40 p-8 text-sm text-muted-foreground">Loading vault…</div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary/20 bg-background/30 p-10 text-center text-sm text-muted-foreground">No saved recordings match this view.</div>
      ) : (
        <Accordion type="multiple" className="space-y-4" defaultValue={grouped.map((group) => group.module.id)}>
          {grouped.map((moduleGroup) => (
            <AccordionItem key={moduleGroup.module.id} value={moduleGroup.module.id} className="overflow-hidden rounded-2xl border border-primary/15 bg-background/35 px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex flex-col text-left">
                  <span className="text-base font-semibold text-foreground">Module {moduleGroup.module.module_number}: {moduleGroup.module.module_title}</span>
                  <span className="text-xs text-muted-foreground">{moduleGroup.count} recording{moduleGroup.count === 1 ? "" : "s"}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-5">
                {Array.from(moduleGroup.chapters.values()).map((chapterGroup) => (
                  <section key={chapterGroup.chapter.id} className="space-y-3">
                    <h3 className="text-sm font-semibold text-primary">Chapter {chapterGroup.chapter.chapter_number}: {chapterGroup.chapter.chapter_title}</h3>
                    <div className="grid gap-3 xl:grid-cols-2">
                      {chapterGroup.recordings.map((recording) => (
                        <article key={recording.id} className="rounded-2xl border border-primary/10 bg-[hsla(215,35%,10%,.62)] p-4">
                          <div className="mb-3 flex items-start gap-3">
                            <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10">
                              {isVideoRecording(recording) ? <Video className="h-7 w-7 text-primary" /> : <Waves className="h-7 w-7 text-primary" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">{recording.file_name || (isVideoRecording(recording) ? "Video practice" : "Audio practice")}</p>
                              <p className="mt-1 text-xs text-muted-foreground">Module {recording.module.module_number} · Chapter {recording.chapter.chapter_number}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{new Date(recording.created_at).toLocaleString()} · {formatDuration(recording.duration_seconds)}</p>
                            </div>
                          </div>
                          {isVideoRecording(recording) ? (
                            <Button variant="outline" onClick={() => setActiveVideo(recording)} className="mb-3 w-full gap-2 border-primary/25 bg-primary/10">
                              <Play className="h-4 w-4" /> Play video
                            </Button>
                          ) : recording.playbackUrl ? (
                            <audio src={recording.playbackUrl} controls className="mb-3 w-full" />
                          ) : null}
                          <Textarea value={noteDrafts[recording.id] || ""} onChange={(event) => setNoteDrafts((prev) => ({ ...prev, [recording.id]: event.target.value }))} placeholder="Add or edit saved note…" className="min-h-[70px] border-primary/10 bg-background/40 text-sm" />
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => saveNote(recording)} className="border-primary/20 bg-primary/10">Save note</Button>
                            <Button size="sm" variant="ghost" onClick={() => downloadRecording(recording)} className="gap-1.5 text-muted-foreground hover:text-primary"><Download className="h-4 w-4" /> Download</Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteRecording(recording)} className="gap-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /> Delete</Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <Dialog open={!!activeVideo} onOpenChange={(open) => !open && setActiveVideo(null)}>
        <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none rounded-none border-primary/15 bg-background p-3 sm:p-5">
          <DialogHeader>
            <DialogTitle>{activeVideo?.file_name || "Practice video"}</DialogTitle>
          </DialogHeader>
          {activeVideo?.playbackUrl && <video src={activeVideo.playbackUrl} controls autoPlay className="h-[calc(100dvh-5.5rem)] w-full rounded-xl bg-black object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
