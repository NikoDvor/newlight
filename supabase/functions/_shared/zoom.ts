// Shared Zoom Server-to-Server OAuth helper.
// Uses account_credentials grant with basic auth from ZOOM_CLIENT_ID/SECRET
// and ZOOM_ACCOUNT_ID. Caches the token in-memory for the isolate lifetime.

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.token;
  }

  const clientId = Deno.env.get("ZOOM_CLIENT_ID");
  const clientSecret = Deno.env.get("ZOOM_CLIENT_SECRET");
  const accountId = Deno.env.get("ZOOM_ACCOUNT_ID");
  if (!clientId || !clientSecret || !accountId) {
    throw new Error("Missing Zoom OAuth env vars");
  }

  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Zoom token error ${res.status}: ${body}`);
  }
  const json = await res.json();
  const token = json.access_token as string;
  const expiresInSec = Number(json.expires_in ?? 3600);
  cachedToken = { token, expiresAt: now + expiresInSec * 1000 };
  return token;
}

export interface CreateZoomMeetingInput {
  topic: string;
  startTime: string; // ISO 8601 UTC
  durationMinutes: number;
  agenda?: string;
  timezone?: string;
}

export interface ZoomMeeting {
  id: number;
  join_url: string;
  start_url: string;
  password?: string;
  [key: string]: unknown;
}

export async function createZoomMeeting(input: CreateZoomMeetingInput): Promise<ZoomMeeting> {
  const token = await getAccessToken();
  const body = {
    topic: input.topic,
    type: 2, // scheduled
    start_time: input.startTime,
    duration: input.durationMinutes,
    timezone: input.timezone ?? "UTC",
    agenda: input.agenda ?? "",
    settings: {
      auto_recording: "cloud",
      join_before_host: true,
      waiting_room: false,
      host_video: true,
      participant_video: true,
      audio: "both",
      mute_upon_entry: true,
      approval_type: 2,
      registrants_email_notification: false,
    },
  };
  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Zoom create meeting ${res.status}: ${err}`);
  }
  return await res.json() as ZoomMeeting;
}

/**
 * Fetch cloud recording transcript(s) for a Zoom meeting.
 * Returns concatenated VTT text across all TRANSCRIPT recording files.
 */
export async function fetchMeetingTranscript(meetingId: string | number): Promise<string | null> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://api.zoom.us/v2/meetings/${encodeURIComponent(String(meetingId))}/recordings`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    console.error(`[zoom] fetch recordings ${res.status}: ${await res.text()}`);
    return null;
  }
  const data = await res.json();
  const files = (data.recording_files ?? []) as Array<{
    file_type?: string;
    recording_type?: string;
    download_url?: string;
  }>;
  const transcripts = files.filter(
    (f) => f.file_type === "TRANSCRIPT" || f.recording_type === "audio_transcript",
  );
  if (transcripts.length === 0) return null;

  const parts: string[] = [];
  for (const t of transcripts) {
    if (!t.download_url) continue;
    // download_access_token param is more reliable than Bearer for recording downloads
    const url = `${t.download_url}${t.download_url.includes("?") ? "&" : "?"}access_token=${token}`;
    const dl = await fetch(url);
    if (!dl.ok) {
      console.error(`[zoom] transcript download ${dl.status}`);
      continue;
    }
    parts.push(await dl.text());
  }
  return parts.length ? parts.join("\n\n") : null;
}
