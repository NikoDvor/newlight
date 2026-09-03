// Marks a deal (and its client) as fully activated once the onboarding meeting
// has actually happened. Idempotent — safe to call multiple times.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TEAM_EMAIL = "team@newlightgen.com";

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
    if (!res.ok) { console.error("[mark-fully-activated] Resend error:", res.status, await res.text().catch(() => "")); return false; }
    console.log("[mark-fully-activated] email sent successfully to", to);
    return true;
  } catch (e) { console.error("Email send error:", e); return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const body = await req.json().catch(() => null);
    const dealId = typeof body?.deal_id === "string" ? body.deal_id : null;
    if (!dealId) return json({ error: "deal_id is required" }, 400);

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: deal, error: dealErr } = await supabase
      .from("crm_deals")
      .select("id, client_id, assigned_user, deal_name, fully_activated_at")
      .eq("id", dealId)
      .maybeSingle();
    if (dealErr) return json({ error: dealErr.message }, 500);
    if (!deal) return json({ error: "Deal not found" }, 404);

    // Authorization: admin/operator, or the deal's assigned rep.
    let allowed = deal.assigned_user === callerId;
    if (!allowed) {
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", callerId);
      allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "operator");
    }
    if (!allowed) return json({ error: "Forbidden" }, 403);

    if (deal.fully_activated_at) return json({ ok: true, already_activated: true });

    const { error: updErr } = await supabase
      .from("crm_deals")
      .update({ fully_activated_at: new Date().toISOString() })
      .eq("id", dealId);
    if (updErr) return json({ error: updErr.message }, 500);

    // Resolve client business name
    let businessName = deal.deal_name || "Client";
    if (deal.client_id) {
      const { data: client } = await supabase
        .from("clients").select("business_name").eq("id", deal.client_id).maybeSingle();
      if (client?.business_name) businessName = client.business_name;
    }

    // Resolve assigned rep name/email
    let repEmail: string | null = null;
    let repName = "";
    if (deal.assigned_user) {
      const { data: emp } = await supabase
        .from("employee_profiles").select("full_name, email").eq("user_id", deal.assigned_user).maybeSingle();
      if (emp) { repEmail = emp.email || null; repName = emp.full_name || ""; }
      if (!repEmail || !repName) {
        const { data: wu } = await supabase
          .from("workspace_users").select("full_name, email").eq("user_id", deal.assigned_user).maybeSingle();
        if (wu) { repEmail = repEmail || wu.email || null; repName = repName || wu.full_name || ""; }
      }
      if (!repEmail) {
        const { data: authUser } = await supabase.auth.admin.getUserById(deal.assigned_user);
        repEmail = authUser?.user?.email || null;
      }
    }

    const link = `https://newlight-app.com/admin/clients/${deal.client_id || ""}`;
    const subject = `🎉 ${businessName} is fully activated`;
    const text = `Onboarding is complete — ${businessName} is now fully activated.${repName ? `\n\nRep: ${repName}` : ""}\n\nView the client: ${link}`;
    const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6">
      <p><strong>${businessName}</strong> is now fully activated. 🎉</p>
      <p>The onboarding meeting has taken place and onboarding is complete.</p>
      ${repName ? `<p>Rep: ${repName}</p>` : ""}
      <p><a href="${link}">View the client profile →</a></p>
    </div>`;

    const recipients = Array.from(new Set([repEmail, TEAM_EMAIL].filter(Boolean) as string[]));
    for (const to of recipients) await sendEmail(to, subject, html, text);

    await supabase.from("audit_logs").insert({
      client_id: deal.client_id,
      module: "client_activation",
      action: "fully_activated",
      metadata: { deal_id: dealId },
    });

    return json({ ok: true, already_activated: false });
  } catch (e) {
    console.error("[mark-fully-activated] error", e);
    return json({ error: String(e) }, 500);
  }
});
