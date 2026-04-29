import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Camera, FileAudio, Mic, Play, Trash2, Upload, Video } from "lucide-react";
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
}

interface PracticeRecording extends PracticeRecordingRow {
  playbackUrl: string | null;
}

interface PracticeRecordingVaultProps {
  chapterId: string;
  lockedPreview?: boolean;
}

const fileExtensionFor = (blob: Blob, type: RecordingType) => {
  if (blob.type.includes("webm")) return "webm";
  if (blob.type.includes("mp4")) return "mp4";
  if (blob.type.includes("mpeg")) return "mp3";
  if (blob.type.includes("wav")) return "wav";
  return type === "video" ? "webm" : "webm";
};

const isVideoRecording = (recording: PracticeRecording) => {
  const path = recording.file_url.toLowerCase();
  return recording.recording_type === "video" || path.endsWith(".mp4") || path.endsWith(".mov") || path.endsWith(".webm");
};

export function PracticeRecordingVault({ chapterId, lockedPreview = false }: PracticeRecordingVaultProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<PracticeRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordingType, setRecordingType] = useState<RecordingType | null>(null);
  const [notes, setNotes] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  const loadRecordings = async (activeUserId?: string) => {
    const uid = activeUserId || userId;
    if (!uid) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("nl_practice_recordings")
      .select("id,user_id,chapter_id,file_url,recording_type,created_at,notes")
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

  const uploadBlob = async (blob: Blob, type: RecordingType, sourceName?: string) => {
    if (!userId) {
      toast({ title: "Sign in required", description: "Please sign in before saving practice recordings.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const ext = sourceName?.split(".").pop() || fileExtensionFor(blob, type);
    const safeType = type === "upload" && blob.type.startsWith("video/") ? "video" : type === "upload" && blob.type.startsWith("audio/") ? "audio" : type;
    const path = `${userId}/${chapterId}/${Date.now()}-${type}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type || (safeType === "video" ? "video/webm" : "audio/webm"),
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
      recording_type: type,
      notes: notes.trim() || null,
    });

    if (rowError) {
      await supabase.storage.from(BUCKET).remove([path]);
      toast({ title: "Recording save failed", description: rowError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    setNotes("");
    await loadRecordings(userId);
    toast({ title: "Practice recording saved" });
    setSaving(false);
  };

  const startRecording = async (type: Exclude<RecordingType, "upload">) => {
    if (lockedPreview || saving || recordingType) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(type === "video" ? { audio: true, video: true } : { audio: true });
      streamRef.current = stream;
      if (type === "video" && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
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
        setRecordingType(null);
        setElapsed(0);
        await uploadBlob(blob, type);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setElapsed(0);
      setRecordingType(type);
    } catch (error) {
      toast({ title: "Recording could not start", description: "Allow microphone/camera access and try again.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await uploadBlob(file, "upload", file.name);
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

  const elapsedLabel = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

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
        {recordingType && <div className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Recording {elapsedLabel}</div>}
      </div>

      <Textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Optional notes for your next recording…"
        disabled={lockedPreview || saving || !!recordingType}
        className="mb-4 min-h-[76px] border-primary/15 bg-background/40 text-sm"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Button type="button" variant="outline" onClick={() => startRecording("audio")} disabled={lockedPreview || saving || !!recordingType} className="gap-2 border-primary/25 bg-primary/10">
          <Mic className="h-4 w-4" /> Record audio
        </Button>
        <Button type="button" variant="outline" onClick={() => startRecording("video")} disabled={lockedPreview || saving || !!recordingType} className="gap-2 border-primary/25 bg-primary/10">
          <Camera className="h-4 w-4" /> Record video
        </Button>
        <label className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-medium text-foreground transition-colors ${lockedPreview || saving || recordingType ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-primary/15"}`}>
          <Upload className="h-4 w-4" /> Upload file
          <input type="file" accept="audio/*,video/*" className="hidden" onChange={handleUpload} disabled={lockedPreview || saving || !!recordingType} />
        </label>
      </div>

      {recordingType === "video" && <video ref={videoPreviewRef} autoPlay muted playsInline className="mt-4 aspect-video w-full rounded-xl border border-primary/15 bg-background/50 object-cover" />}

      {recordingType && (
        <Button type="button" onClick={stopRecording} disabled={saving} className="mt-4 w-full gap-2 sm:w-auto">
          <Video className="h-4 w-4" /> Stop and save recording
        </Button>
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
                {isVideoRecording(recording) ? <Video className="h-4 w-4 text-primary" /> : <Play className="h-4 w-4 text-primary" />}
                {new Date(recording.created_at).toLocaleString()}
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => deleteRecording(recording)} className="h-8 gap-1.5 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
            {recording.playbackUrl && (isVideoRecording(recording) ? (
              <video src={recording.playbackUrl} controls className="w-full rounded-lg border border-primary/10 bg-background/50" />
            ) : (
              <audio src={recording.playbackUrl} controls className="w-full" />
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
