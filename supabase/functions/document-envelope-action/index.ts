import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyPaidSignedIfTransition } from "../_shared/paid-signed-notify.ts";
import { generateSignedAgreementPdf } from "../_shared/agreement-pdf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL QUEUED - no RESEND_API_KEY] to=${to} subject="${subject}"`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "NewLight <team@newlightgen.com>", to: [to], subject, text, html }),
    });
    if (!res.ok) { console.error("Resend error:", res.status, await res.text().catch(() => "")); return false; }
    return true;
  } catch (e) { console.error("Email send error:", e); return false; }
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "America/Los_Angeles",
  });
}

function esc(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function signingReceiptHtml(args: { title: string; signerName: string; signedAt: string; signedPdfUrl: string }): string {
  const { title, signerName, signedAt, signedPdfUrl } = args;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">Your signed agreement</h1>
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">Hi ${esc(signerName)},</p>
    <p style="font-size:14px;line-height:1.6;margin:0 0 20px;">Your agreement <strong>${esc(title)}</strong> was signed on <strong>${esc(signedAt)}</strong>.</p>
    <div style="margin:20px 0;">
      <a href="${esc(signedPdfUrl)}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">View / download your signed agreement</a>
    </div>
    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:24px 0 0;">Please keep this copy for your records.</p>
    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:8px 0 0;">— NewLight</p>
  </div>
</body></html>`;
}

/** Unbranded receipt for client-owned agreements (client_agreement envelopes). */
function genericReceiptHtml(args: { title: string; signerName: string; signedAt: string; signedPdfUrl: string }): string {
  const { title, signerName, signedAt, signedPdfUrl } = args;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">Your signed agreement</h1>
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">Hi ${esc(signerName)},</p>
    <p style="font-size:14px;line-height:1.6;margin:0 0 20px;">Your agreement <strong>${esc(title)}</strong> was signed on <strong>${esc(signedAt)}</strong>.</p>
    <div style="margin:20px 0;">
      <a href="${esc(signedPdfUrl)}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">View / download your signed agreement</a>
    </div>
    <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:24px 0 0;">Please keep this copy for your records.</p>
  </div>
</body></html>`;
}

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
      const wasFirstView = !envelope.viewed_at;
      if (wasFirstView) {
        await supabase.from("document_envelopes").update({
          viewed_at: new Date().toISOString(),
          status: envelope.status === "sent" ? "viewed" : envelope.status,
        }).eq("id", envelope.id);
        envelope.viewed_at = new Date().toISOString();
        if (envelope.status === "sent") envelope.status = "viewed";
        await emitOnboardingEvent("onboarding_bundle_viewed", "Onboarding Bundle Viewed", { ip });
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
        metadata: { envelope_id: envelope.id, envelope_type: envelope.envelope_type, signer: signer_name, ip },
      });

      await emitOnboardingEvent("onboarding_bundle_signed", "Onboarding Bundle Signed", { signer: signer_name, signer_email, ip });

      // Durable PDF snapshot of the signed agreement (idempotent per envelope).
      let signed_pdf_url: string | null = null;
      if (envelope.envelope_type === "service_agreement" || envelope.envelope_type === "client_agreement") {
        signed_pdf_url = await generateSignedAgreementPdf(supabase, envelope.id, {
          signerName: signer_name,
          signerEmail: signer_email,
          signedAt: sig?.created_at || new Date().toISOString(),
          ip,
          title: envelope.title,
        });
      }

      // Signing-receipt email: client + rep/ops copy. Failures are logged but never block the sign response.
      if (signed_pdf_url && envelope.envelope_type === "service_agreement" && envelope.related_type === "crm_deal" && envelope.related_id) {
        try {
          let repEmail: string | null = null;
          let repName: string | null = null;
          const { data: deal } = await supabase
            .from("crm_deals")
            .select("assigned_user")
            .eq("id", envelope.related_id)
            .maybeSingle();
          if (deal?.assigned_user) {
            const { data: profile } = await supabase
              .from("employee_profiles")
              .select("full_name, email")
              .eq("user_id", deal.assigned_user)
              .maybeSingle();
            repName = profile?.full_name || null;
            repEmail = profile?.email || null;
            if (!repEmail) {
              const { data: user, error: userErr } = await supabase.auth.admin.getUserById(deal.assigned_user);
              if (!userErr && user?.user?.email) repEmail = user.user.email;
            }
          }

          const signedAtLabel = fmtWhen(sig?.created_at || new Date().toISOString());
          const subject = `Your signed agreement — ${envelope.title}`;
          const html = signingReceiptHtml({
            title: envelope.title,
            signerName: signer_name,
            signedAt: signedAtLabel,
            signedPdfUrl: signed_pdf_url,
          });
          const text = [
            `Hi ${signer_name},`,
            ``,
            `Your agreement "${envelope.title}" was signed on ${signedAtLabel}.`,
            ``,
            `View your signed agreement: ${signed_pdf_url}`,
            ``,
            `Please keep this copy for your records.`,
            `— NewLight`,
          ].join("\n");

          await sendEmail(envelope.recipient_email, subject, html, text);
          if (repEmail && repEmail !== envelope.recipient_email) {
            await sendEmail(repEmail, subject, html, text);
          }
          await sendEmail("team@newlightgen.com", subject, html, text);
        } catch (emailErr) {
          console.error("Signing receipt email failed:", emailErr);
        }
      }

      // Client-owned agreements: unbranded receipt to the signer + whoever sent it. No NewLight ops copy.
      if (signed_pdf_url && envelope.envelope_type === "client_agreement") {
        try {
          let senderEmail: string | null = null;
          if (envelope.created_by) {
            const { data: profile } = await supabase
              .from("employee_profiles")
              .select("email")
              .eq("user_id", envelope.created_by)
              .maybeSingle();
            senderEmail = profile?.email || null;
            if (!senderEmail) {
              const { data: wsUser } = await supabase
                .from("workspace_users")
                .select("email")
                .eq("user_id", envelope.created_by)
                .maybeSingle();
              senderEmail = wsUser?.email || null;
            }
            if (!senderEmail) {
              const { data: user, error: userErr } = await supabase.auth.admin.getUserById(envelope.created_by);
              if (!userErr && user?.user?.email) senderEmail = user.user.email;
            }
          }

          const signedAtLabel = fmtWhen(sig?.created_at || new Date().toISOString());
          const subject = `Your signed agreement — ${envelope.title}`;
          const html = genericReceiptHtml({
            title: envelope.title,
            signerName: signer_name,
            signedAt: signedAtLabel,
            signedPdfUrl: signed_pdf_url,
          });
          const text = [
            `Hi ${signer_name},`,
            ``,
            `Your agreement "${envelope.title}" was signed on ${signedAtLabel}.`,
            ``,
            `View your signed agreement: ${signed_pdf_url}`,
            ``,
            `Please keep this copy for your records.`,
          ].join("\n");

          await sendEmail(envelope.recipient_email, subject, html, text);
          if (senderEmail && senderEmail !== envelope.recipient_email) {
            await sendEmail(senderEmail, subject, html, text);
          }
        } catch (emailErr) {
          console.error("Client agreement receipt email failed:", emailErr);
        }
      }


      // If this is a service_agreement whose linked deal already has its initial invoice paid,
      // atomically transition to paid_signed and notify ops.
      let notify: any = null;
      if (envelope.envelope_type === "service_agreement" && envelope.related_type === "crm_deal" && envelope.related_id) {
        const { data: deal } = await supabase
          .from("crm_deals")
          .select("id, payment_invoice_id")
          .eq("id", envelope.related_id)
          .maybeSingle();
        if (deal?.payment_invoice_id) {
          const { data: inv } = await supabase
            .from("invoices")
            .select("invoice_status")
            .eq("id", deal.payment_invoice_id)
            .maybeSingle();
          if (inv?.invoice_status === "paid") {
            const origin = req.headers.get("origin") || req.headers.get("referer") || "";
            let originBase = ""; try { originBase = origin ? new URL(origin).origin : ""; } catch { originBase = ""; }
            const paySignUrl = originBase ? `${originBase}/pay-sign/${share_token}` : `/pay-sign/${share_token}`;
            notify = await notifyPaidSignedIfTransition(supabase, deal.id, { paySignUrl, envelopeId: envelope.id });
          } else {
            await supabase.from("crm_deals").update({ pay_sign_status: "signed" }).eq("id", deal.id);
          }
        }
      }

      return json({ success: true, status: "signed", signature: sig, notify, signed_pdf_url });
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
        metadata: { envelope_id: envelope.id, envelope_type: envelope.envelope_type, reason: rejection_reason },
      });

      await emitOnboardingEvent("onboarding_bundle_declined", "Onboarding Bundle Declined", { reason: rejection_reason });

      return json({ success: true, status: "declined" });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});
