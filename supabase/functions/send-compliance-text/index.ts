// Send an outbound SMS via Twilio and log it (success OR failure) into
// client_text_messages for RIA/BD-style recordkeeping. Uses the same Twilio
// connector-gateway pattern as booking-confirmation-sms.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const { client_id, contact_id, phone_number, message_body } = body ?? {};

    if (!client_id || !phone_number || !message_body) {
      return json({ error: "client_id, phone_number, message_body are required" }, 400);
    }
    if (typeof message_body !== "string" || message_body.length > 1600) {
      return json({ error: "message_body must be <= 1600 characters" }, 400);
    }

    // Authorization: user must be able to access this client workspace.
    const { data: canAccess } = await userClient.rpc("user_can_access_client", {
      _user_id: userId,
      _client_id: client_id,
    });
    if (!canAccess) return json({ error: "Forbidden" }, 403);

    const admin = createClient(supabaseUrl, serviceKey);

    // Attempt Twilio send
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const FROM = Deno.env.get("TWILIO_FROM_NUMBER") || "+18058940908";

    let sid: string | null = null;
    let status = "sent";
    let errorNote: string | null = null;

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
          body: new URLSearchParams({ To: phone_number, From: FROM, Body: message_body }),
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
        contact_id: contact_id ?? null,
        direction: "outbound",
        phone_number,
        message_body,
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
