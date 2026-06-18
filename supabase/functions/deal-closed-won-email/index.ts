import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { deal_id, company_name, deal_value } = await req.json();
    if (!deal_id) return new Response(JSON.stringify({ error: "deal_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = Deno.env.get("SMTP_PORT");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.log("SMTP credentials not configured — email skipped");
      return new Response(JSON.stringify({ success: true, note: "SMTP not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = `🎉 Deal Won: ${company_name} — $${Number(deal_value || 0).toLocaleString()}`;
    const body = `A deal has been marked as Won in the NewLight Command Center.\n\nCompany: ${company_name}\nDeal Value: $${Number(deal_value || 0).toLocaleString()}\nDeal ID: ${deal_id}\n\nLog in to review: https://app.newlightmarketing.com/admin/deals/${deal_id}`;

    const recipients = ["niko@newlightgen.com", "jordan@newlightgen.com"];

    for (const to of recipients) {
      await fetch(`https://${smtpHost}:${smtpPort}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${btoa(`${smtpUser}:${smtpPass}`)}`,
        },
        body: JSON.stringify({ to, subject, text: body, from: smtpUser }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
