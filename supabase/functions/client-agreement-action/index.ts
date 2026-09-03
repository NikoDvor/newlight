// Standalone action handler for client-owned agreements (envelope_type === "client_agreement").
// Fully independent of document-envelope-action: no shared code beyond the generic PDF renderer.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateSignedAgreementPdf } from "../_shared/agreement-pdf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Local HTML-escape helper (intentionally not imported from shared NewLight modules). */
function escapeHtml(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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
      body: JSON.stringify({ from: "Agreements <team@newlightgen.com>", to: [to], subject, text, html }),
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

/** Unbranded signing receipt — no vendor signature line. */
function receiptHtml(args: { title: string; signerName: string; signedAt: string; signedPdfUrl: string }): string {
  const { title, signerName, signedAt, signedPdfUrl } = args;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;">Your signed agreement</h1>
    <p style="font-size:14px;line-height:1.6;margin:0 0 12px;">Hi ${escapeHtml(signerName)},</p>
    <p style="font-size:14px;line-height:1.6;margin:0 0 20px;">Your agreement <strong>${escapeHtml(title)}</strong> was signed on <strong>${escapeHtml(signedAt)}</strong>.</p>
    <div style="margin:20px 0;">
      <a href="${escapeHtml(signedPdfUrl)}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">View / download your signed agreement</a>
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

    // Hard guard: this function only ever handles client-owned agreements.
    if (envelope.envelope_type !== "client_agreement") {
      return json({ error: "This endpoint only handles client_agreement envelopes" }, 400);
    }

    const terminalStates = ["signed", "declined", "expired"];
    const forwardedFor = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : null;
    const userAgent = req.headers.get("user-agent");

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
        action: "client_agreement_signed",
        module: "client_agreements",
        status: "success",
        metadata: { envelope_id: envelope.id, envelope_type: envelope.envelope_type, signer: signer_name, ip },
      });

      // Durable PDF snapshot (idempotent per envelope).
      const signed_pdf_url = await generateSignedAgreementPdf(supabase, envelope.id, {
        signerName: signer_name,
        signerEmail: signer_email,
        signedAt: sig?.created_at || new Date().toISOString(),
        ip,
        title: envelope.title,
      });

      // Unbranded receipt to the signer + whoever sent it. Email failures never block signing.
      if (signed_pdf_url) {
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
          const html = receiptHtml({
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

      return json({ success: true, status: "signed", signature: sig, signed_pdf_url });
    }

    if (action === "decline") {
      await supabase.from("document_envelopes").update({
        status: "declined",
        completed_at: new Date().toISOString(),
      }).eq("id", envelope.id);

      await supabase.from("audit_logs").insert({
        client_id: envelope.client_id,
        action: "client_agreement_declined",
        module: "client_agreements",
        status: "success",
        metadata: { envelope_id: envelope.id, envelope_type: envelope.envelope_type, reason: rejection_reason },
      });

      return json({ success: true, status: "declined" });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});
