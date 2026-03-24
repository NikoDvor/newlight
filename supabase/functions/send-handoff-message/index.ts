import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HandoffRequest {
  client_id: string;
  business_name: string;
  owner_email: string;
  owner_phone?: string | null;
  preferred_contact_method?: string; // "email" | "sms" | "both"
  sms_consent?: boolean;
  workspace_slug: string;
  base_url: string;
}

function buildEmailHtml(p: {
  businessName: string;
  workspaceUrl: string;
  setupUrl: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#3B82F610;border-radius:16px;padding:16px;">
        <span style="font-size:28px;">🚀</span>
      </div>
    </div>
    <h1 style="font-size:22px;font-weight:bold;color:#111;text-align:center;margin:0 0 8px;">
      Your workspace is ready!
    </h1>
    <p style="font-size:14px;color:#6b7280;text-align:center;margin:0 0 28px;line-height:1.5;">
      ${p.businessName} has been set up on NewLight. Open your workspace to get started.
    </p>

    <div style="text-align:center;margin-bottom:16px;">
      <a href="${p.workspaceUrl}" style="display:inline-block;background:#3B82F6;color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">
        Open Your Workspace
      </a>
    </div>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${p.setupUrl}" style="display:inline-block;background:#f3f4f6;color:#374151;font-size:13px;font-weight:500;padding:10px 24px;border-radius:8px;text-decoration:none;">
        Continue Setup →
      </a>
    </div>

    <div style="background:#f9fafb;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:13px;font-weight:600;color:#111;margin:0 0 8px;">📱 Install as an app</p>
      <p style="font-size:12px;color:#6b7280;margin:0 0 4px;line-height:1.5;">
        Open your workspace link on your phone, then:
      </p>
      <ul style="font-size:12px;color:#6b7280;margin:8px 0 0;padding-left:18px;line-height:1.8;">
        <li><strong>iPhone:</strong> Tap Share → "Add to Home Screen"</li>
        <li><strong>Android:</strong> Tap ⋮ menu → "Add to Home screen"</li>
        <li><strong>Desktop:</strong> Look for the install icon in your browser's address bar</li>
      </ul>
    </div>

    <div style="border-top:1px solid #e5e7eb;padding-top:16px;">
      <p style="font-size:11px;color:#9ca3af;margin:0 0 4px;">Your workspace link (bookmark this):</p>
      <p style="font-size:12px;color:#374151;margin:0;word-break:break-all;font-family:monospace;">${p.workspaceUrl}</p>
    </div>

    <p style="font-size:10px;color:#d1d5db;text-align:center;margin:24px 0 0;">
      Powered by NewLight Marketing
    </p>
  </div>
</body>
</html>`;
}

function buildSmsText(p: {
  businessName: string;
  workspaceUrl: string;
  setupUrl: string;
}) {
  return `Your ${p.businessName} workspace is ready! 🚀\n\nOpen your app: ${p.workspaceUrl}\n\nContinue setup: ${p.setupUrl}\n\nAdd to your home screen for app access.\n\n— NewLight`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body: HandoffRequest = await req.json();
    const {
      client_id,
      business_name,
      owner_email,
      owner_phone,
      preferred_contact_method = "email",
      sms_consent = false,
      workspace_slug,
      base_url,
    } = body;

    if (!client_id || !owner_email || !workspace_slug || !base_url) {
      return new Response(
        JSON.stringify({ error: "client_id, owner_email, workspace_slug, and base_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workspaceUrl = `${base_url}/w/${workspace_slug}`;
    const setupUrl = `${base_url}/auth?redirect=/setup-center`;

    const result: {
      email_status: string;
      sms_status: string;
      email_error?: string;
      sms_error?: string;
    } = {
      email_status: "not_attempted",
      sms_status: "not_attempted",
    };

    const shouldEmail = preferred_contact_method === "email" || preferred_contact_method === "both";
    const shouldSms = (preferred_contact_method === "sms" || preferred_contact_method === "both") && sms_consent && owner_phone;

    // ── EMAIL ────────────────────────────────────────────────────────
    if (shouldEmail) {
      // Email delivery requires a configured email domain (Lovable Cloud Emails).
      // The invite email from Supabase Auth is the primary delivery channel.
      // This handoff message is supplementary — mark honestly.
      result.email_status = "not_configured";
      result.email_error = "Transactional email not configured — set up an email domain in Cloud to enable branded handoff emails";
    }

    // ── SMS ──────────────────────────────────────────────────────────
    if (shouldSms) {
      const twilioApiKey = Deno.env.get("TWILIO_API_KEY");
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

      if (twilioApiKey && lovableApiKey) {
        try {
          // Twilio connector gateway — path auto-prefixes /2010-04-01/Accounts/{AccountSid}
          const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
          const smsText = buildSmsText({ businessName: business_name, workspaceUrl, setupUrl });

          const smsResponse = await fetch(`${GATEWAY_URL}/Messages.json`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${lovableApiKey}`,
              "X-Connection-Api-Key": twilioApiKey,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: owner_phone!,
              Body: smsText,
            }).toString(),
          });

          if (smsResponse.ok) {
            result.sms_status = "sent";
          } else {
            const errData = await smsResponse.text();
            result.sms_status = "failed";
            result.sms_error = `SMS send failed [${smsResponse.status}]: ${errData.substring(0, 200)}`;
          }
        } catch (e) {
          result.sms_status = "failed";
          result.sms_error = (e as Error).message;
        }
      } else {
        result.sms_status = "not_configured";
        result.sms_error = "SMS provider not connected — link a Twilio connector to enable";
      }
    } else if ((preferred_contact_method === "sms" || preferred_contact_method === "both") && !sms_consent) {
      result.sms_status = "not_attempted";
      result.sms_error = "SMS consent not given";
    } else if ((preferred_contact_method === "sms" || preferred_contact_method === "both") && !owner_phone) {
      result.sms_status = "not_attempted";
      result.sms_error = "No phone number provided";
    }

    // ── Update client record with delivery statuses ──────────────────
    await Promise.all([
      adminClient.from("clients").update({
        email_delivery_status: result.email_status,
        sms_delivery_status: result.sms_status,
        last_handoff_sent_at: new Date().toISOString(),
      }).eq("id", client_id),
      adminClient.from("audit_logs").insert({
        action: "handoff_message_sent",
        client_id,
        module: "onboarding",
        metadata: {
          email_status: result.email_status,
          sms_status: result.sms_status,
          email_error: result.email_error || null,
          sms_error: result.sms_error || null,
          preferred_contact_method,
          workspace_url: workspaceUrl,
        },
      }),
    ]);

    const emailHtml = buildEmailHtml({ businessName: business_name, workspaceUrl, setupUrl });

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        workspace_url: workspaceUrl,
        setup_url: setupUrl,
        email_html_preview: result.email_status === "not_configured" ? emailHtml : undefined,
        sms_text_preview: result.sms_status === "not_configured" ? buildSmsText({ businessName: business_name, workspaceUrl, setupUrl }) : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
