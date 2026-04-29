import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Camera, Download, FileAudio, Mic, Play, Save, Square, Trash2, Upload, Video, Waves, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const BUCKET = "practice-recordings";

type RecordingType = "audio" | "video" | "upload";

interface PracticeRecordingRow {
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

interface PracticeRecording extends PracticeRecordingRow {
  playbackUrl: string | null;
}

interface PendingRecording {
  blob: Blob;
  url: string;
  type: RecordingType;
  fileName: string;
  durationSeconds: number | null;
  contentType: string;
}

interface PracticeRecordingVaultProps {
  chapterId: string;
  lockedPreview?: boolean;
}

const permissionMessage = "Please allow microphone/camera access in your browser settings to record.";

const fileExtensionFor = (blob: Blob, type: RecordingType, sourceName?: string) => {
  const named = sourceName?.split(".").pop();
  if (named && named !== sourceName) return named.toLowerCase();
  if (blob.type.includes("webm")) return "webm";
  if (blob.type.includes("mp4")) return "mp4";
  if (blob.type.includes("mpeg")) return "mp3";
  if (blob.type.includes("wav")) return "wav";
  if (blob.type.includes("ogg")) return "ogg";
  return type === "video" ? "webm" : "webm";
};

const isVideoRecording = (recording: Pick<PracticeRecording, "recording_type" | "file_url" | "content_type">) => {
  const path = recording.file_url.toLowerCase();
  return recording.recording_type === "video" || !!recording.content_type?.startsWith("video/") || path.endsWith(".mp4") || path.endsWith(".mov") || path.endsWith(".webm");
};

const formatDuration = (seconds?: number | null) => {
  if (!seconds || seconds < 1) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
};

const readMediaDuration = (url: string, type: RecordingType) => new Promise<number | null>((resolve) => {
  const media = document.createElement(type === "video" ? "video" : "audio");
  media.preload = "metadata";
  media.onloadedmetadata = () => resolve(Number.isFinite(media.duration) ? Math.round(media.duration) : null);
  media.onerror = () => resolve(null);
  media.src = url;
});

export function PracticeRecordingVault({ chapterId, lockedPreview = false }: PracticeRecordingVaultProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<PracticeRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordingType, setRecordingType] = useState<Exclude<RecordingType, "upload"> | null>(null);
  const [activePlaybackId, setActivePlaybackId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [pending, setPending] = useState<PendingRecording | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadRecordings = async (activeUserId?: string) => {
    const uid = activeUserId || userId;
    if (!uid) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("nl_practice_recordings")
      .select("id,user_id,chapter_id,file_url,recording_type,created_at,notes,file_name,file_size,duration_seconds,content_type")
      .eq("chapter_id", chapterId)
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Recordings failed to load", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const rows = (data || []) as PracticeRecordingRow[];
    const withUrls = await Promise.all(rows.map(async (row) => {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(row.file_url, 60 * 60);
      return { ...row, playbackUrl: signed?.signedUrl || null };
    }));
    setRecordings(withUrls);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      setUserId(user?.id || null);
      if (user?.id) await loadRecordings(user.id);
      else setLoading(false);
    };
    init();
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  useEffect(() => {
    if (!recordingType) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recordingType]);

  useEffect(() => () => {
    if (pending?.url) URL.revokeObjectURL(pending.url);
  }, [pending?.url]);

  const discardPending = () => {
    if (pending?.url) URL.revokeObjectURL(pending.url);
    setPending(null);
  };

  const uploadPending = async () => {
    if (!pending) return;
    if (!userId) {
      toast({ title: "Sign in required", description: "Please sign in before saving practice recordings.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const ext = fileExtensionFor(pending.blob, pending.type, pending.fileName);
    const path = `${userId}/${chapterId}/${Date.now()}-${pending.type}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, pending.blob, {
      contentType: pending.contentType || pending.blob.type || "application/octet-stream",
      upsert: false,
    });

    if (uploadError) {
      toast({ title: "Recording upload failed", description: uploadError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error: rowError } = await (supabase as any).from("nl_practice_recordings").insert({
      user_id: userId,
      chapter_id: chapterId,
      file_url: path,
      recording_type: pending.type,
      notes: notes.trim() || null,
      file_name: pending.fileName,
      file_size: pending.blob.size,
      duration_seconds: pending.durationSeconds,
      content_type: pending.contentType || pending.blob.type || null,
    });

    if (rowError) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast({ title: "Recording save failed", description: rowError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    setNotes("");
    discardPending();
    await loadRecordings(userId);
    toast({ title: "Practice recording saved" });
    setSaving(false);
  };

  const startRecording = async (type: Exclude<RecordingType, "upload">) => {
    if (lockedPreview) {
      toast({ title: "Recording locked", description: "Unlock this chapter to save practice recordings." });
      return;
    }
    if (saving || recordingType) {
      toast({ title: "Recording is already in progress", description: "Stop the current recording before starting another one." });
      return;
    }
    if (pending) discardPending();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast({ title: "Recording is not available", description: "Your browser does not support in-browser recording.", variant: "destructive" });
      return;
    }
    try {
      setElapsed(0);
      setRecordingType(type);
      const stream = await navigator.mediaDevices.getUserMedia(type === "video" ? { audio: true, video: true } : { audio: true });
      streamRef.current = stream;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (type === "video" && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        await videoPreviewRef.current.play().catch(() => undefined);
      }
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || (type === "video" ? "video/webm" : "audio/webm") });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
        const url = URL.createObjectURL(blob);
        const durationSeconds = await readMediaDuration(url, type);
        setPending({
          blob,
          url,
          type,
          fileName: `${type}-practice-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${fileExtensionFor(blob, type)}`,
          durationSeconds,
          contentType: blob.type || (type === "video" ? "video/webm" : "audio/webm"),
        });
        setRecordingType(null);
        setElapsed(0);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(500);
    } catch (error) {
      setRecordingType(null);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      toast({ title: "Recording could not start", description: permissionMessage, variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleUploadClick = () => {
    if (lockedPreview) {
      toast({ title: "Upload locked", description: "Unlock this chapter to save practice recordings." });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
      toast({ title: "Unsupported file", description: "Please choose an audio or video file.", variant: "destructive" });
      return;
    }
    if (pending) discardPending();
    const url = URL.createObjectURL(file);
    const durationSeconds = await readMediaDuration(url, file.type.startsWith("video/") ? "video" : "audio");
    setPending({ blob: file, url, type: "upload", fileName: file.name, durationSeconds, contentType: file.type });
  };

  const updateNotes = async (recording: PracticeRecording, nextNotes: string) => {
    setRecordings((rows) => rows.map((row) => row.id === recording.id ? { ...row, notes: nextNotes } : row));
    await (supabase as any).from("nl_practice_recordings").update({ notes: nextNotes.trim() || null }).eq("id", recording.id);
  };

  const deleteRecording = async (recording: PracticeRecording) => {
    const { error } = await (supabase as any).from("nl_practice_recordings").delete().eq("id", recording.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.storage.from(BUCKET).remove([recording.file_url]);
    setRecordings((rows) => rows.filter((row) => row.id !== recording.id));
    toast({ title: "Recording deleted" });
  };

  const elapsedLabel = formatDuration(elapsed);
  const isRecordingVideo = recordingType === "video";

  return (
    <section
      className="mt-6 rounded-2xl p-5 shadow-[0_0_36px_hsla(211,96%,60%,.08)] sm:p-6"
      style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <FileAudio className="h-4 w-4 text-primary" />
            Practice Recording Vault
          </div>
          <h2 className="text-xl font-semibold text-foreground">Save your reps for review</h2>
        </div>
        {recordingType && (
          <div className="inline-flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/15 px-3 py-1 text-xs font-semibold text-destructive">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
            Recording {elapsedLabel}
          </div>
        )}
      </div>

      <Textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Optional notes for your next recording…"
        disabled={lockedPreview || saving || !!recordingType}
        className="mb-4 min-h-[76px] border-primary/15 bg-background/40 text-sm"
      />

      {!recordingType && !pending && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Button type="button" variant="outline" onClick={() => startRecording("audio")} className="h-12 gap-2 border-primary/25 bg-primary/10">
            <Mic className="h-4 w-4" /> Record audio
          </Button>
          <Button type="button" variant="outline" onClick={() => startRecording("video")} className="h-12 gap-2 border-primary/25 bg-primary/10">
            <Camera className="h-4 w-4" /> Record video
          </Button>
          <Button type="button" variant="outline" onClick={handleUploadClick} className="h-12 gap-2 border-primary/25 bg-primary/10">
            <Upload className="h-4 w-4" /> Upload file
          </Button>
          <input ref={fileInputRef} type="file" accept="audio/*,video/*" className="hidden" onChange={handleUpload} />
        </div>
      )}

      {recordingType && (
        <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          {isRecordingVideo ? (
            <video ref={videoPreviewRef} autoPlay muted playsInline className="aspect-video w-full rounded-xl border border-primary/15 bg-background/50 object-cover" />
          ) : (
            <div className="flex min-h-[120px] items-center justify-center gap-2 rounded-xl border border-primary/15 bg-background/40">
              {Array.from({ length: 18 }).map((_, index) => (
                <span
                  key={index}
                  className="w-1 animate-pulse rounded-full bg-primary"
                  style={{ height: `${18 + ((index * 13) % 42)}px`, animationDelay: `${index * 45}ms` }}
                />
              ))}
            </div>
          )}
          <Button type="button" onClick={stopRecording} className="mt-4 h-12 w-full gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:h-14 sm:text-base">
            <Square className="h-5 w-5 fill-current" /> Stop Recording
          </Button>
        </div>
      )}

      {pending && (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-background/35 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {pending.contentType.startsWith("video/") ? <Video className="h-4 w-4 text-primary" /> : <Waves className="h-4 w-4 text-primary" />}
              {pending.fileName}
            </div>
            <span className="text-xs text-muted-foreground">{formatDuration(pending.durationSeconds)}</span>
          </div>
          {pending.contentType.startsWith("video/") ? (
            <video src={pending.url} controls className="aspect-video w-full rounded-xl border border-primary/10 bg-background/50" />
          ) : (
            <audio src={pending.url} controls className="w-full" />
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={discardPending} disabled={saving} className="gap-2">
              <X className="h-4 w-4" /> Discard
            </Button>
            <Button type="button" onClick={uploadPending} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save to Vault"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between gap-3 border-t border-primary/10 pt-4">
          <h3 className="text-sm font-semibold text-foreground">Saved recordings</h3>
          <span className="text-xs text-muted-foreground">{recordings.length} saved</span>
        </div>
        {loading ? (
          <div className="rounded-xl border border-primary/10 bg-background/30 p-4 text-sm text-muted-foreground">Loading recordings…</div>
        ) : recordings.length === 0 ? (
          <div className="rounded-xl border border-primary/10 bg-background/30 p-4 text-sm text-muted-foreground">No practice recordings saved for this chapter yet.</div>
        ) : recordings.map((recording) => (
          <div key={recording.id} className="rounded-xl border border-primary/10 bg-background/30 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                {isVideoRecording(recording) ? <Video className="h-4 w-4 text-primary" /> : <FileAudio className="h-4 w-4 text-primary" />}
                {new Date(recording.created_at).toLocaleString()}
                {!!recording.duration_seconds && <span className="text-xs text-muted-foreground">· {formatDuration(recording.duration_seconds)}</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setActivePlaybackId(activePlaybackId === recording.id ? null : recording.id)} className="h-8 gap-1.5 border-primary/20 bg-primary/10">
                  <Play className="h-4 w-4" /> Play
                </Button>
                {recording.playbackUrl && (
                  <Button type="button" size="sm" variant="ghost" asChild className="h-8 gap-1.5 text-muted-foreground hover:text-primary">
                    <a href={recording.playbackUrl} download={recording.file_name || "practice-recording"}><Download className="h-4 w-4" /> Download</a>
                  </Button>
                )}
                <Button type="button" size="sm" variant="ghost" onClick={() => deleteRecording(recording)} className="h-8 gap-1.5 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
            {recording.notes && <p className="mb-3 rounded-lg border border-primary/10 bg-background/40 p-3 text-sm text-muted-foreground">{recording.notes}</p>}
            {activePlaybackId === recording.id && recording.playbackUrl && (isVideoRecording(recording) ? (
              <video src={recording.playbackUrl} controls autoPlay className="w-full rounded-lg border border-primary/10 bg-background/50" />
            ) : (
              <audio src={recording.playbackUrl} controls autoPlay className="w-full" />
            ))}
            <Textarea
              value={recording.notes || ""}
              onChange={(event) => updateNotes(recording, event.target.value)}
              placeholder="Add notes for this recording…"
              className="mt-3 min-h-[64px] border-primary/10 bg-background/40 text-sm"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
