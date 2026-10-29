// Copies a finished Zoom cloud recording into the app (meeting-recordings bucket) and
// records it in nl_meeting_recordings. Called from zoom-webhook on recording.completed,
// in the background (EdgeRuntime.waitUntil) so Zoom gets its 200 within 3 seconds.
//
// Files are streamed straight from Zoom into Storage (never held in memory):
//   video  — MP4, preferring shared_screen_with_speaker_view, then speaker_view, then any MP4
//   audio  — M4A (audio_only)
//   transcript — VTT text (audio_transcript), stored on the row as text
// If a copy fails, the Zoom share link + passcode are still saved so the meeting stays watchable.

import { getAccessToken } from "./zoom.ts";

const NEWLIGHT_CLIENT_ID = "00000000-0000-0000-0000-0000000000ff";
const BUCKET = "meeting-recordings";

type ZoomFile = { id?: string; file_type?: string; file_extension?: string; recording_type?: string; file_size?: number; download_url?: string; status?: string };

function pickVideo(files: ZoomFile[]) {
  const mp4 = files.filter((f) => (f.file_type || "").toUpperCase() === "MP4" && f.download_url);
  const order = ["shared_screen_with_speaker_view", "shared_screen_with_speaker_view(CC)", "speaker_view", "active_speaker", "gallery_view", "shared_screen"];
  return mp4.sort((a, b) => (order.indexOf(a.recording_type || "") + 99) % 99 - (order.indexOf(b.recording_type || "") + 99) % 99)[0];
}

async function streamToStorage(sb: any, downloadUrl: string, token: string, path: string, contentType: string): Promise<number> {
  const url = `${downloadUrl}${downloadUrl.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`download ${res.status}`);
  const size = Number(res.headers.get("content-length") || 0);
  const up = await fetch(`${Deno.env.get("SUPABASE_URL")}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": contentType,
      "x-upsert": "true",
      ...(size ? { "Content-Length": String(size) } : {}),
    },
    body: res.body,
    // @ts-ignore Deno streaming request body
    duplex: "half",
  });
  if (!up.ok) throw new Error(`storage ${up.status}: ${(await up.text()).slice(0, 200)}`);
  return size;
}

export async function saveZoomRecording(sb: any, payload: any): Promise<string> {
  const obj = payload?.payload?.object ?? {};
  const zoomId = obj.id ? String(obj.id) : null;
  const zoomUuid = obj.uuid ? String(obj.uuid) : null;
  const files: ZoomFile[] = obj.recording_files ?? [];
  const token: string = payload?.download_token || (await getAccessToken());

  // Match the meeting in our calendar (NewLight salesmen meetings).
  let ev: any = null;
  if (zoomId) {
    const { data } = await sb.from("bdr_calendar_events")
      .select("id, user_id, lead_id, meeting_kind, title, starts_at")
      .eq("zoom_meeting_id", zoomId).order("starts_at", { ascending: false }).limit(1).maybeSingle();
    ev = data;
  }
  let leadName: string | null = null;
  if (ev?.lead_id) {
    const { data } = await sb.from("nl_bdr_leads").select("business_name").eq("id", ev.lead_id).maybeSingle();
    leadName = data?.business_name ?? null;
  }

  const base = {
    client_id: NEWLIGHT_CLIENT_ID,
    owner_user_id: ev?.user_id ?? null,
    event_id: ev?.id ?? null,
    lead_id: ev?.lead_id ?? null,
    source: "zoom",
    title: leadName ? `${leadName} — ${ev?.meeting_kind || "meeting"}` : (obj.topic || "Zoom meeting"),
    meeting_kind: ev?.meeting_kind ?? null,
    zoom_meeting_id: zoomId,
    zoom_uuid: zoomUuid,
    started_at: obj.start_time ?? ev?.starts_at ?? null,
    duration_minutes: obj.duration ?? null,
    zoom_share_url: obj.share_url ?? null,
    zoom_share_password: obj.recording_play_passcode ?? obj.password ?? null,
    status: "processing",
    updated_at: new Date().toISOString(),
  };
  const { data: row, error } = await sb.from("nl_meeting_recordings")
    .upsert(base, { onConflict: "zoom_uuid" }).select("id").single();
  if (error) throw error;

  const folder = `${NEWLIGHT_CLIENT_ID}/${ev?.user_id ?? "unassigned"}/${row.id}`;
  const errors: string[] = [];
  const patch: Record<string, unknown> = {};
  let total = 0;

  const video = pickVideo(files);
  if (video?.download_url) {
    try { total += await streamToStorage(sb, video.download_url, token, `${folder}/video.mp4`, "video/mp4"); patch.video_path = `${folder}/video.mp4`; }
    catch (e) { errors.push(`video: ${(e as Error).message}`); }
  }
  const audio = files.find((f) => (f.file_type || "").toUpperCase() === "M4A" && f.download_url);
  if (audio?.download_url) {
    try { total += await streamToStorage(sb, audio.download_url, token, `${folder}/audio.m4a`, "audio/mp4"); patch.audio_path = `${folder}/audio.m4a`; }
    catch (e) { errors.push(`audio: ${(e as Error).message}`); }
  }
  const tr = files.find((f) => (f.file_type || "").toUpperCase() === "TRANSCRIPT" && f.download_url);
  if (tr?.download_url) {
    try {
      const r = await fetch(`${tr.download_url}${tr.download_url.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`);
      if (r.ok) patch.transcript = await r.text(); else errors.push(`transcript: ${r.status}`);
    } catch (e) { errors.push(`transcript: ${(e as Error).message}`); }
  }

  const gotSomething = patch.video_path || patch.audio_path || patch.transcript;
  await sb.from("nl_meeting_recordings").update({
    ...patch,
    size_bytes: total || null,
    status: errors.length ? (gotSomething ? "partial" : "failed") : "ready",
    error: errors.length ? errors.join("; ") : null,
    updated_at: new Date().toISOString(),
  }).eq("id", row.id);

  if (patch.transcript && ev?.id) {
    await sb.from("bdr_calendar_events").update({ zoom_transcript: patch.transcript, zoom_transcript_fetched_at: new Date().toISOString() }).eq("id", ev.id);
  }
  return row.id;
}
