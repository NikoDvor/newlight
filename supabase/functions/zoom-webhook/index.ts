// Zoom Event Subscription receiver.
// Handles endpoint.url_validation and logs recording.transcript_completed
// events, fetching the transcript text and storing it on the corresponding
// bdr_calendar_events row (matched by zoom_meeting_id).
//
// Public webhook — verify_jwt must be false (see config.toml).
// Auth: Zoom sends x-zm-signature = "v0=" + HMAC_SHA256(ZOOM_WEBHOOK_SECRET_TOKEN, "v0:" + x-zm-request-timestamp + ":" + rawBody).

import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { fetchMeetingTranscript } from "../_shared/zoom.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-zm-signature, x-zm-request-timestamp",
};

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("ZOOM_WEBHOOK_SECRET_TOKEN");
  if (!secret) {
    return new Response(JSON.stringify({ error: "Missing ZOOM_WEBHOOK_SECRET_TOKEN" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  let payload: any;
  try { payload = JSON.parse(rawBody); } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  // 1. URL validation handshake — respond with plainToken + HMAC(plainToken).
  if (payload?.event === "endpoint.url_validation") {
    const plainToken = payload?.payload?.plainToken ?? "";
    const encryptedToken = await hmacSha256Hex(secret, plainToken);
    return new Response(JSON.stringify({ plainToken, encryptedToken }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. Verify event signature for real events.
  const timestamp = req.headers.get("x-zm-request-timestamp") ?? "";
  const signature = req.headers.get("x-zm-signature") ?? "";
  const message = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${await hmacSha256Hex(secret, message)}`;
  if (!signature || signature !== expected) {
    console.warn("[zoom-webhook] signature mismatch");
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventType: string = payload?.event ?? "unknown";
  const meetingObj = payload?.payload?.object ?? {};
  const zoomMeetingId = meetingObj?.id ? String(meetingObj.id) : null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: logRow } = await supabase
    .from("zoom_webhook_events")
    .insert({ event_type: eventType, zoom_meeting_id: zoomMeetingId, payload })
    .select("id")
    .single();

  console.log(`[zoom-webhook] event=${eventType} meeting=${zoomMeetingId} logged=${logRow?.id}`);

  // 3. On transcript completed, fetch and store transcript text.
  if (eventType === "recording.transcript_completed" && zoomMeetingId) {
    try {
      const transcript = await fetchMeetingTranscript(zoomMeetingId);
      if (transcript) {
        const { error: updErr } = await supabase
          .from("bdr_calendar_events")
          .update({
            zoom_transcript: transcript,
            zoom_transcript_fetched_at: new Date().toISOString(),
          })
          .eq("zoom_meeting_id", zoomMeetingId);
        if (updErr) throw updErr;
        console.log(`[zoom-webhook] transcript stored (${transcript.length} chars) for meeting ${zoomMeetingId}`);
      } else {
        console.log(`[zoom-webhook] no transcript file yet for meeting ${zoomMeetingId}`);
      }
      if (logRow?.id) {
        await supabase.from("zoom_webhook_events")
          .update({ processed_at: new Date().toISOString() })
          .eq("id", logRow.id);
      }
    } catch (e) {
      const msg = (e as Error).message;
      console.error("[zoom-webhook] transcript fetch/store error:", msg);
      if (logRow?.id) {
        await supabase.from("zoom_webhook_events")
          .update({ processed_at: new Date().toISOString(), error: msg })
          .eq("id", logRow.id);
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
