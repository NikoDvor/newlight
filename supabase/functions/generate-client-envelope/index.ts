// Generates a client-provided ("BYO") agreement envelope from the client's own
// template in client_agreement_templates, with {{merge_field}} substitution.
// Sign-only — no payment step is wired into this flow.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { esc } from "../_shared/service-agreement-html.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function mergeTemplate(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (full, key: string) => {
    const v = values?.[key];
    if (v === undefined || v === null || String(v).trim() === "") return full; // leave gaps visible
    return esc(String(v));
  });
}

function wrapHtml(title: string, mergedBody: string): string {
  // Generic / unbranded on purpose: this is the CLIENT's own content.
  const paragraphs = mergedBody
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${esc(title)}</title>
<style>
  body { margin:0; padding:32px 20px; background:#fff; color:#111; font-family:Georgia,'Times New Roman',serif; line-height:1.65; }
  .doc { max-width:760px; margin:0 auto; }
  h1 { font-size:22px; font-weight:700; margin:0 0 20px; font-family:Arial,Helvetica,sans-serif; }
  p { font-size:14px; margin:0 0 14px; white-space:pre-wrap; }
  .footer { margin-top:32px; padding-top:14px; border-top:1px solid #e5e7eb; font-size:11px; color:#6b7280; font-family:Arial,Helvetica,sans-serif; }
</style></head><body><div class="doc">
<h1>${esc(title)}</h1>
${paragraphs}
<div class="footer">This agreement was provided by the issuing business. It is delivered and executed electronically; the signer's name, email, IP address, timestamp and user agent are recorded on signature.</div>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await anonClient.auth.getUser(jwt);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const body = await req.json().catch(() => null);
    const clientId: string | null = typeof body?.client_id === "string" ? body.client_id : null;
    const recipientName: string | null = typeof body?.recipient_name === "string" ? body.recipient_name.trim() : null;
    const recipientEmail: string | null = typeof body?.recipient_email === "string" ? body.recipient_email.trim() : null;
    const fieldValues: Record<string, string> = body?.field_values && typeof body.field_values === "object" ? body.field_values : {};
    const relatedType: string | null = body?.deal_id ? "crm_deal" : (typeof body?.related_type === "string" ? body.related_type : null);
    const relatedId: string | null = typeof body?.deal_id === "string" ? body.deal_id : (typeof body?.related_id === "string" ? body.related_id : null);

    if (!clientId) return json({ error: "client_id is required" }, 400);
    if (!recipientName || !recipientEmail) return json({ error: "recipient_name and recipient_email are required" }, 400);

    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: caller belongs to this client, or is admin/operator.
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", callerId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "operator");
    if (!isAdmin) {
      const { data: ws } = await supabase
        .from("workspace_users")
        .select("id")
        .eq("client_id", clientId)
        .eq("user_id", callerId)
        .maybeSingle();
      if (!ws) return json({ error: "Forbidden" }, 403);
    }

    const { data: template } = await supabase
      .from("client_agreement_templates")
      .select("id, template_name, template_body, is_active")
      .eq("client_id", clientId)
      .eq("is_active", true)
      .maybeSingle();

    if (!template?.template_body) {
      return json({ error: "No agreement template configured yet — set one up first." }, 400);
    }

    const title = `${template.template_name || "Agreement"} — ${recipientName}`;
    const merged = mergeTemplate(template.template_body as string, fieldValues);
    const html = wrapHtml(template.template_name || "Agreement", merged);
    const dataUrl = `data:text/html;base64,${btoa(unescape(encodeURIComponent(html)))}`;

    const nowIso = new Date().toISOString();
    const { data: envelope, error: envErr } = await supabase
      .from("document_envelopes")
      .insert({
        client_id: clientId,
        envelope_type: "client_agreement",
        title,
        status: "sent",
        sent_at: nowIso,
        related_type: relatedType,
        related_id: relatedId,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        created_by: callerId,
      } as any)
      .select("id, share_token")
      .single();
    if (envErr) return json({ error: envErr.message }, 500);

    const { error: itemErr } = await supabase.from("document_envelope_items").insert([
      { envelope_id: envelope!.id, document_name: template.template_name || "Agreement", document_url: dataUrl, display_order: 0 },
    ] as any);
    if (itemErr) return json({ error: itemErr.message }, 500);

    await supabase.from("audit_logs").insert({
      client_id: clientId,
      action: "client_agreement_sent",
      module: "client_agreements",
      status: "success",
      metadata: { envelope_id: envelope!.id, related_type: relatedType, related_id: relatedId, recipient_email: recipientEmail },
    } as any);

    return json({ ok: true, envelope_id: envelope!.id, share_token: envelope!.share_token });
  } catch (e) {
    return json({ error: String((e as any)?.message || e) }, 500);
  }
});
