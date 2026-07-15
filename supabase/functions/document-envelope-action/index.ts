import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { share_token, action, signer_name, signer_email, signature_data, rejection_reason } = body;

    if (!share_token || !action) return json({ error: "Missing share_token or action" }, 400);
    if (!["view", "sign", "decline"].includes(action)) return json({ error: "Invalid action" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: envelope, error: fetchErr } = await supabase
      .from("document_envelopes")
      .select("*")
      .eq("share_token", share_token)
      .single();

    if (fetchErr || !envelope) return json({ error: "Envelope not found" }, 404);

    const terminalStates = ["signed", "declined", "expired"];
    const forwardedFor = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : null;
    const userAgent = req.headers.get("user-agent");

    const emitOnboardingEvent = async (eventKey: string, eventName: string, extra: Record<string, unknown> = {}) => {
      if (envelope.envelope_type !== "onboarding_bundle" || !envelope.client_id) return;
      await supabase.from("automation_events").insert({
        client_id: envelope.client_id,
        event_type: eventKey,
        event_key: eventKey,
        event_name: eventName,
        related_type: "document_envelope",
        related_id: envelope.id,
        event_data: { envelope_id: envelope.id, envelope_type: envelope.envelope_type, ...extra },
      });
    };

    if (action === "view") {
      if (!envelope.viewed_at) {
        await supabase.from("document_envelopes").update({
          viewed_at: new Date().toISOString(),
          status: envelope.status === "sent" ? "viewed" : envelope.status,
        }).eq("id", envelope.id);
        envelope.viewed_at = new Date().toISOString();
        if (envelope.status === "sent") envelope.status = "viewed";
      }
      const { data: items } = await supabase
        .from("document_envelope_items")
        .select("*")
        .eq("envelope_id", envelope.id)
        .order("display_order");
      return json({ envelope, items: items || [] });
    }

    if (terminalStates.includes(envelope.status)) {
      return json({ error: "Envelope is in a terminal state", status: envelope.status }, 409);
    }

    if (action === "sign") {
      if (!signer_name || !signer_email) return json({ error: "Signer name and email required" }, 400);

      const { data: sig, error: sigErr } = await supabase
        .from("document_envelope_signatures")
        .insert({
          envelope_id: envelope.id,
          signer_name,
          signer_email,
          signature_data: signature_data || null,
          ip_address: ip,
          user_agent: userAgent,
        })
        .select()
        .single();

      if (sigErr) return json({ error: sigErr.message }, 500);

      await supabase.from("document_envelopes").update({
        status: "signed",
        completed_at: new Date().toISOString(),
      }).eq("id", envelope.id);

      await supabase.from("audit_logs").insert({
        client_id: envelope.client_id,
        action: "envelope_signed",
        module: "document_envelopes",
        status: "success",
        metadata: { envelope_id: envelope.id, signer: signer_name, ip },
      });

      return json({ success: true, status: "signed", signature: sig });
    }

    if (action === "decline") {
      await supabase.from("document_envelopes").update({
        status: "declined",
        completed_at: new Date().toISOString(),
      }).eq("id", envelope.id);

      await supabase.from("audit_logs").insert({
        client_id: envelope.client_id,
        action: "envelope_declined",
        module: "document_envelopes",
        status: "success",
        metadata: { envelope_id: envelope.id, reason: rejection_reason },
      });

      return json({ success: true, status: "declined" });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});
