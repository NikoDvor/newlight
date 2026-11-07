// Send an outbound SMS via Twilio and log it (success OR failure) into
// client_text_messages for RIA/BD-style recordkeeping. Uses the same Twilio
// connector-gateway pattern as booking-confirmation-sms.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireClientAccess, authJson } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// SECURITY RULES (do not weaken):
//  - Caller must be staff or a member of the client workspace (requireClientAccess).
//  - The destination must be the stored phone of a crm_contact in that workspace (no arbitrary numbers).
//  - Recipient needs SMS consent (see hasConsent), must not be on nl_dnc_numbers, and no texts 9pm-8am
//    recipient-local (America/Los_Angeles when unknown). Every message ends with the STOP line.
// TODO: inbound STOP replies are not processed anywhere yet (no Twilio inbound webhook writes to
// nl_dnc_numbers); wire that up so opt-outs are honored automatically.

const STOP_LINE = "Reply STOP to opt out.";
const phone10 = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(-10);

// Recipient-local timezone from the contact's state; default America/Los_Angeles when unknown.
const STATE_TZ: Record<string, string> = {
  CT: "America/New_York", DE: "America/New_York", FL: "America/New_York", GA: "America/New_York", IN: "America/New_York",
  KY: "America/New_York", ME: "America/New_York", MD: "America/New_York", MA: "America/New_York", MI: "America/New_York",
  NH: "America/New_York", NJ: "America/New_York", NY: "America/New_York", NC: "America/New_York", OH: "America/New_York",
  PA: "America/New_York", RI: "America/New_York", SC: "America/New_York", VT: "America/New_York", VA: "America/New_York",
  WV: "America/New_York", DC: "America/New_York",
  AL: "America/Chicago", AR: "America/Chicago", IL: "America/Chicago", IA: "America/Chicago", KS: "America/Chicago",
  LA: "America/Chicago", MN: "America/Chicago", MS: "America/Chicago", MO: "America/Chicago", NE: "America/Chicago",
  ND: "America/Chicago", OK: "America/Chicago", SD: "America/Chicago", TN: "America/Chicago", TX: "America/Chicago", WI: "America/Chicago",
  AZ: "America/Phoenix", CO: "America/Denver", ID: "America/Denver", MT: "America/Denver", NM: "America/Denver", UT: "America/Denver", WY: "America/Denver",
  CA: "America/Los_Angeles", NV: "America/Los_Angeles", OR: "America/Los_Angeles", WA: "America/Los_Angeles",
  AK: "America/Anchorage", HI: "Pacific/Honolulu",
};
function recipientTz(state: unknown): string {
  return STATE_TZ[String(state ?? "").trim().toUpperCase()] ?? "America/Los_Angeles";
}
function inQuietHours(tz: string, now = new Date()): boolean {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz }).format(now)) % 24;
  return hour >= 21 || hour < 8;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Declared here so every path below (Twilio success/failure/log) can use them.
  let status = "sent";
  let errorNote: string | null = null;
  let sid: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { client_id, contact_id, phone_number, message_body } = body ?? {};

    if (!client_id || !contact_id || !phone_number || !message_body) {
      return json({ error: "client_id, contact_id, phone_number, message_body are required" }, 400);
    }
    if (typeof message_body !== "string" || message_body.length > 1500) {
      return json({ error: "message_body must be <= 1500 characters" }, 400);
    }

    // Authorization: staff or a member of this client workspace.
    const auth = await requireClientAccess(req, admin, String(client_id), anonKey, supabaseUrl);
    if (!auth.ok) return authJson(auth, corsHeaders);
    const userId = auth.userId;

    // Recipient must be a contact of THIS workspace and the number must be that contact's stored number.
    const { data: contact } = await admin
      .from("crm_contacts")
      .select("id, client_id, phone, secondary_phone, state, tags")
      .eq("id", contact_id)
      .eq("client_id", client_id)
      .maybeSingle();
    if (!contact) return json({ error: "Contact not found in this workspace" }, 404);
    const to10 = phone10(phone_number);
    if (to10.length !== 10 || (to10 !== phone10(contact.phone) && to10 !== phone10(contact.secondary_phone))) {
      return json({ error: "phone_number must match the contact's stored phone number" }, 400);
    }

    // Suppression list (nl_dnc_numbers is keyed by the 10-digit number).
    const { data: dnc } = await admin.from("nl_dnc_numbers").select("phone_normalized").eq("phone_normalized", to10).maybeSingle();
    if (dnc) return json({ error: "Recipient has opted out / is on the do-not-contact list", code: "suppressed" }, 403);

    // Consent. There is no per-contact consent column yet, so consent is: the contact is tagged
    // 'sms_consent'/'sms_opt_in', OR the number is the workspace owner's own phone and the client row has
    // sms_consent/allow_sms. An explicit decline (bdr_calendar_events.metadata.sms_consent === false on a
    // booking with this number) always blocks.
    // TODO: add a real crm_contacts.sms_consent column and consent timestamp.
    const tags: string[] = ((contact.tags as string[] | null) ?? []).map((t) => String(t).toLowerCase());
    let hasConsent = tags.includes("sms_consent") || tags.includes("sms_opt_in");
    if (!hasConsent) {
      const { data: cl } = await admin.from("clients").select("owner_phone, sms_consent, allow_sms").eq("id", client_id).maybeSingle();
      if (cl && (cl.sms_consent === true || cl.allow_sms === true) && phone10(cl.owner_phone) === to10) hasConsent = true;
    }
    if (hasConsent) {
      const { data: declines } = await admin
        .from("bdr_calendar_events")
        .select("metadata")
        .eq("metadata->>sms_consent", "false")
        .ilike("metadata->>phone", `%${to10.slice(-4)}`)
        .limit(20);
      if ((declines ?? []).some((r: any) => phone10((r.metadata as any)?.phone) === to10)) hasConsent = false;
    }
    if (!hasConsent) return json({ error: "Recipient has not given SMS consent", code: "no_consent" }, 403);

    // Quiet hours: no texts 9pm-8am recipient-local.
    const tz = recipientTz(contact.state);
    if (inQuietHours(tz)) {
      return json({ error: `Quiet hours: texts are not sent between 9pm and 8am recipient-local time (${tz}). Try again later.`, code: "quiet_hours" }, 409);
    }

    // Every message carries the opt-out line.
    const finalBody = /reply\s+stop/i.test(message_body) ? message_body : `${message_body.trimEnd()} ${STOP_LINE}`;

    // Attempt Twilio send
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const FROM = "+18555066111";
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
      status = "failed";
      errorNote = "Twilio credentials not configured in this environment (LOVABLE_API_KEY or TWILIO_API_KEY missing).";
    } else {
      try {
        const resp = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TWILIO_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: phone_number, From: FROM, Body: finalBody }),
        });
        const respBody = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          status = "failed";
          errorNote = `Twilio ${resp.status}: ${respBody?.message || JSON.stringify(respBody).slice(0, 400)}`;
        } else {
          sid = respBody?.sid ?? null;
        }
      } catch (e) {
        status = "failed";
        errorNote = `Network error: ${(e as Error).message}`;
      }
    }

    // Always log, success or failure — recordkeeping requirement.
    const { data: logged, error: logErr } = await admin
      .from("client_text_messages")
      .insert({
        client_id,
        contact_id,
        direction: "outbound",
        phone_number,
        message_body: finalBody,
        twilio_message_sid: sid,
        send_status: status,
        error_note: errorNote,
        sent_by_user_id: userId,
      })
      .select()
      .single();

    if (logErr) {
      console.error("client_text_messages insert failed:", logErr);
      return json({ error: "Log write failed", details: logErr.message }, 500);
    }

    return json({ success: status === "sent", status, error_note: errorNote, record: logged }, 200);
  } catch (e) {
    console.error("send-compliance-text error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
