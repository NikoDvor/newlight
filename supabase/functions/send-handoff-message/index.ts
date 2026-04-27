import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HandoffRequest {
  client_id: string;
  business_name: string;
  owner_name?: string | null;
  owner_email: string;
  owner_phone?: string | null;
  preferred_contact_method?: string; // "email" | "sms" | "both"
  sms_consent?: boolean;
  workspace_slug: string;
  base_url: string;
  send_email?: boolean;
  send_sms?: boolean;
}

function buildEmailHtml(p: {
  businessName: string;
  ownerName?: string | null;
  downloadUrl: string;
  brandColor: string;
  logoUrl?: string | null;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;background:${p.brandColor};border-radius:18px;width:72px;height:72px;overflow:hidden;">
        ${p.logoUrl ? `<img src="${p.logoUrl}" alt="${p.businessName} logo" style="max-width:64px;max-height:64px;object-fit:contain;display:block;" />` : `<span style="font-size:24px;font-weight:800;color:#fff;">${p.businessName.slice(0, 2).toUpperCase()}</span>`}
      </div>
    </div>
    <h1 style="font-size:22px;font-weight:bold;color:#111;text-align:center;margin:0 0 8px;">
      Your ${p.businessName} app is ready
    </h1>
    <p style="font-size:14px;color:#6b7280;text-align:center;margin:0 0 28px;line-height:1.5;">
      ${p.ownerName ? `Hi ${p.ownerName}, ` : ""}download your branded app and add it to your home screen in two quick steps.
    </p>

    <div style="text-align:center;margin-bottom:16px;">
      <a href="${p.downloadUrl}" style="display:inline-block;background:${p.brandColor};color:#fff;font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;text-decoration:none;">
        Download Your App
      </a>
    </div>

    <div style="background:#f9fafb;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <p style="font-size:13px;font-weight:600;color:#111;margin:0 0 8px;">📱 Add to Home Screen</p>
      <ul style="font-size:12px;color:#6b7280;margin:8px 0 0;padding-left:18px;line-height:1.8;">
        <li><strong>iPhone:</strong> Tap the share button, then Add to Home Screen</li>
        <li><strong>Android:</strong> Tap Install on the Chrome prompt</li>
      </ul>
    </div>

    <div style="border-top:1px solid #e5e7eb;padding-top:16px;">
      <p style="font-size:11px;color:#9ca3af;margin:0 0 4px;">Your permanent app download link:</p>
      <p style="font-size:12px;color:#374151;margin:0;word-break:break-all;font-family:monospace;">${p.downloadUrl}</p>
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
  ownerName?: string | null;
  downloadUrl: string;
}) {
  return `Hi ${p.ownerName || "there"}, your ${p.businessName} app is ready. Download it here: ${p.downloadUrl} — tap the link and follow the 2 steps to add it to your home screen.`;
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
      owner_name,
      owner_email,
      owner_phone,
      preferred_contact_method = "email",
      sms_consent = false,
      workspace_slug,
      base_url,
      send_email,
      send_sms,
    } = body;

    if (!client_id || !owner_email || !workspace_slug || !base_url) {
      return new Response(
        JSON.stringify({ error: "client_id, owner_email, workspace_slug, and base_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workspaceUrl = `${base_url}/w/${workspace_slug}`;
    const downloadUrl = `${base_url}/app/${workspace_slug}`;
    const setupUrl = `${base_url}/auth?redirect=/setup-center`;

    const { data: branding } = await adminClient
      .from("client_branding")
      .select("company_name, app_display_name, logo_url, app_icon_url, pwa_icon_url, primary_color")
      .eq("client_id", client_id)
      .maybeSingle();

    const displayName = branding?.app_display_name || branding?.company_name || business_name;
    const brandColor = /^#[0-9a-f]{6}$/i.test(branding?.primary_color || "") ? branding!.primary_color : "#0EA5E9";
    const logoUrl = branding?.pwa_icon_url || branding?.app_icon_url || branding?.logo_url || null;

    const result: {
      email_status: string;
      sms_status: string;
      email_error?: string;
      sms_error?: string;
    } = {
      email_status: "not_attempted",
      sms_status: "not_attempted",
    };

    const shouldEmail = send_email ?? (preferred_contact_method === "email" || preferred_contact_method === "both");
    const shouldSms = send_sms ?? ((preferred_contact_method === "sms" || preferred_contact_method === "both") && sms_consent && owner_phone);

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
          const smsText = buildSmsText({ businessName: displayName, ownerName: owner_name, downloadUrl });

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
          app_download_url: downloadUrl,
        },
      }),
    ]);

    const emailHtml = buildEmailHtml({ businessName: displayName, ownerName: owner_name, downloadUrl, brandColor, logoUrl });

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        workspace_url: workspaceUrl,
        app_download_url: downloadUrl,
        setup_url: setupUrl,
        email_html_preview: result.email_status === "not_configured" ? emailHtml : undefined,
        sms_text_preview: result.sms_status === "not_configured" ? buildSmsText({ businessName: displayName, ownerName: owner_name, downloadUrl }) : undefined,
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
