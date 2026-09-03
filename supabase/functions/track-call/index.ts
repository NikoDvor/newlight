// Public Twilio voice webhook. Logs the call into attribution_events, then
// forwards the caller to the client's real business line via TwiML.
//
// Auth: Twilio does not expose the account auth token through the Lovable
// connector gateway, so requests are authenticated with a shared secret in the
// webhook URL (?t=TRACK_CALL_SECRET), which is what provision-tracking-number
// configures on each purchased number. If a TWILIO_AUTH_TOKEN secret is ever
// added, X-Twilio-Signature is validated as well.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
};

const xml = (body: string, status = 200) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>${body}`, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/xml" },
  });

function esc(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Twilio request signature: base64(HMAC-SHA1(authToken, url + sorted k+v pairs)). */
async function validTwilioSignature(authToken: string, url: string, params: Record<string, string>, signature: string) {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return expected === signature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);

  // Parse the form-encoded Twilio payload up front (needed for both auth and logging).
  let params: Record<string, string> = {};
  try {
    const form = await req.formData();
    form.forEach((v, k) => { params[k] = String(v); });
  } catch (e) {
    console.error("track-call: unable to parse body", e);
    return xml(`<Response><Say>This number is not in service.</Say><Hangup/></Response>`, 400);
  }

  // --- Auth ---
  const expectedSecret = Deno.env.get("TRACK_CALL_SECRET");
  const providedSecret = url.searchParams.get("t");
  if (!expectedSecret || providedSecret !== expectedSecret) {
    console.error("track-call: rejected request with missing/invalid shared secret");
    return xml(`<Response><Say>This number is not in service.</Say><Hangup/></Response>`, 403);
  }

  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (authToken) {
    const signature = req.headers.get("x-twilio-signature") || "";
    const ok = signature && (await validTwilioSignature(authToken, req.url, params, signature));
    if (!ok) {
      console.error("track-call: invalid X-Twilio-Signature");
      return xml(`<Response><Say>This number is not in service.</Say><Hangup/></Response>`, 403);
    }
  }

  const to = params.To || "";
  const from = params.From || "";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let tracking: any = null;
  try {
    const { data, error } = await supabase
      .from("channel_tracking_numbers")
      .select("id, client_id, channel, label, forwards_to, active")
      .eq("twilio_number", to)
      .maybeSingle();
    if (error) throw error;
    tracking = data;
  } catch (e) {
    console.error("track-call: tracking number lookup failed", e);
  }

  if (!tracking || !tracking.active) {
    console.warn(`track-call: no active tracking number for To=${to}`);
    return xml(`<Response><Say>This number is not in service.</Say><Hangup/></Response>`);
  }

  // Logging must never block call forwarding.
  try {
    const { error } = await supabase.from("attribution_events").insert({
      client_id: tracking.client_id,
      channel: "call",
      source: tracking.channel,
      event_type: "call_received",
      contact_phone: from || null,
      occurred_at: new Date().toISOString(),
      raw_payload: params,
    });
    if (error) throw error;
  } catch (e) {
    console.error("track-call: attribution_events insert failed (call still forwarding)", e);
  }

  // Recording is intentionally disabled — no consent flow exists yet.
  return xml(
    `<Response><Dial answerOnBridge="true" callerId="${esc(to)}" record="do-not-record" timeout="25">` +
      `<Number>${esc(tracking.forwards_to)}</Number></Dial></Response>`,
  );
});
