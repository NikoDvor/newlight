// Purchases a Twilio local number for a client's marketing channel and wires
// its voice webhook to the public track-call function.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

const VALID_CHANNELS = ["google_ads", "meta_ads", "website", "organic_seo", "print", "referral"];

async function twilio(path: string, init: { method: string; body?: URLSearchParams }) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  if (!LOVABLE_API_KEY || !TWILIO_API_KEY) throw new Error("Twilio is not connected for this project.");

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: init.body,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Twilio request failed [${res.status}] ${path}: ${text}`);
    const err: any = new Error(text);
    err.status = res.status;
    throw err;
  }
  try { return JSON.parse(text); } catch { return {}; }
}

/** Turn Twilio's raw error body into something an admin can act on. */
function friendlyTwilioError(raw: string, status: number, areaCode?: string | null): string {
  let code: number | null = null;
  let message = raw;
  try {
    const parsed = JSON.parse(raw);
    code = parsed?.code ?? null;
    message = parsed?.message || raw;
  } catch { /* keep raw */ }

  if (code === 21404 || /no phone numbers available/i.test(message)) {
    return areaCode
      ? `No Twilio numbers are available in area code ${areaCode}, and no US fallback number could be purchased.`
      : "No Twilio numbers are currently available to purchase.";
  }
  if (code === 21451) return `Area code ${areaCode} is not valid for a US local number.`;
  if (code === 20003 || status === 401 || status === 403) {
    return "Twilio rejected the request as unauthorized. The connected Twilio credential likely lacks phone-number provisioning permissions (a Main API Key or a restricted key with IncomingPhoneNumbers access is required).";
  }
  if (code === 21649 || /insufficient funds|balance/i.test(message)) {
    return "The Twilio account has insufficient balance to purchase a phone number.";
  }
  if (status === 429) return "Twilio rate-limited the provisioning request. Try again in a moment.";
  return `Twilio error: ${message}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await anon.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const callerId = claims.claims.sub as string;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: isStaff } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    const { data: isOperator } = await admin.rpc("has_role", { _user_id: callerId, _role: "operator" });
    if (!isStaff && !isOperator) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const { client_id, channel, label, forwards_to, area_code } = body || {};

    if (!client_id || typeof client_id !== "string") return json({ error: "client_id is required" }, 400);
    if (!VALID_CHANNELS.includes(channel)) return json({ error: `channel must be one of: ${VALID_CHANNELS.join(", ")}` }, 400);
    if (!label || typeof label !== "string" || label.trim().length < 1) return json({ error: "label is required" }, 400);
    if (!forwards_to || !/^\+[1-9]\d{6,14}$/.test(String(forwards_to))) {
      return json({ error: "forwards_to must be a valid E.164 number, e.g. +18055551234" }, 400);
    }

    const { data: client } = await admin.from("clients").select("id, phone, business_name").eq("id", client_id).maybeSingle();
    if (!client) return json({ error: "Client not found" }, 404);

    // Prefer the client's own area code, else the forwarding number's.
    const digitsOf = (v?: string | null) => (v || "").replace(/\D/g, "");
    const areaFrom = (v?: string | null) => {
      const d = digitsOf(v);
      if (d.length === 11 && d.startsWith("1")) return d.slice(1, 4);
      if (d.length === 10) return d.slice(0, 3);
      return null;
    };
    const desiredArea: string | null =
      (typeof area_code === "string" && /^\d{3}$/.test(area_code) ? area_code : null) ||
      areaFrom(client.phone) ||
      areaFrom(forwards_to);

    // 1. Find an available number.
    let candidate: string | null = null;
    try {
      if (desiredArea) {
        const search = await twilio(`/AvailablePhoneNumbers/US/Local.json?AreaCode=${desiredArea}&VoiceEnabled=true&PageSize=1`, { method: "GET" });
        candidate = search?.available_phone_numbers?.[0]?.phone_number || null;
      }
      if (!candidate) {
        const search = await twilio(`/AvailablePhoneNumbers/US/Local.json?VoiceEnabled=true&PageSize=1`, { method: "GET" });
        candidate = search?.available_phone_numbers?.[0]?.phone_number || null;
      }
    } catch (e: any) {
      return json({ error: friendlyTwilioError(String(e?.message || e), e?.status || 500, desiredArea) }, 502);
    }

    if (!candidate) {
      return json({
        error: desiredArea
          ? `No Twilio numbers are available in area code ${desiredArea}, and no US fallback number was found.`
          : "No Twilio numbers are currently available to purchase.",
      }, 502);
    }

    // 2. Purchase it and point its voice webhook at track-call.
    const trackSecret = Deno.env.get("TRACK_CALL_SECRET");
    if (!trackSecret) return json({ error: "TRACK_CALL_SECRET is not configured." }, 500);
    const voiceUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/track-call?t=${encodeURIComponent(trackSecret)}`;

    let purchased: any;
    try {
      purchased = await twilio(`/IncomingPhoneNumbers.json`, {
        method: "POST",
        body: new URLSearchParams({
          PhoneNumber: candidate,
          FriendlyName: `${client.business_name || "Client"} — ${label}`,
          VoiceUrl: voiceUrl,
          VoiceMethod: "POST",
        }),
      });
    } catch (e: any) {
      return json({ error: friendlyTwilioError(String(e?.message || e), e?.status || 500, desiredArea) }, 502);
    }

    const purchasedNumber = purchased?.phone_number || candidate;

    // 3. Record it.
    const { data: row, error: insertErr } = await admin
      .from("channel_tracking_numbers")
      .insert({
        client_id,
        channel,
        label: label.trim(),
        twilio_number: purchasedNumber,
        forwards_to,
        active: true,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Provisioned number but failed to save row:", insertErr, purchasedNumber);
      return json({
        error: `Number ${purchasedNumber} was purchased on Twilio but could not be saved: ${insertErr.message}`,
      }, 500);
    }

    await admin.from("audit_logs").insert({
      client_id,
      action: "tracking_number_provisioned",
      module: "call_tracking",
      status: "success",
      metadata: { twilio_number: purchasedNumber, channel, label, forwards_to },
    });

    return json({ ok: true, tracking_number: row });
  } catch (e: any) {
    console.error("provision-tracking-number error:", e);
    return json({ error: String(e?.message || e) }, 500);
  }
});
