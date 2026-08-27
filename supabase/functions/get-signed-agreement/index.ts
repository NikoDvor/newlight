// Returns a fresh short-lived signed URL for a deal's signed service agreement.
// Authenticated internal users only. Legacy rows without storage_path fall back
// to the stored long-lived document_url.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SIGNED_PDF_ITEM_NAME } from "../_shared/agreement-pdf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "signed-agreements";
const FRESH_URL_TTL = 3600; // 1 hour

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Auth: any valid internal user JWT.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null);
    const dealId = typeof body?.deal_id === "string" ? body.deal_id : null;
    if (!dealId) return json({ error: "deal_id is required" }, 400);

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: deal, error: dealErr } = await supabase
      .from("crm_deals")
      .select("service_agreement_envelope_id")
      .eq("id", dealId)
      .maybeSingle();
    if (dealErr) return json({ error: dealErr.message }, 500);
    if (!deal?.service_agreement_envelope_id) {
      return json({ error: "No signed agreement for this deal yet" }, 404);
    }

    const { data: item, error: itemErr } = await supabase
      .from("document_envelope_items")
      .select("storage_path, document_url")
      .eq("envelope_id", deal.service_agreement_envelope_id)
      .eq("document_name", SIGNED_PDF_ITEM_NAME)
      .maybeSingle();
    if (itemErr) return json({ error: itemErr.message }, 500);

    if (item?.storage_path) {
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(item.storage_path, FRESH_URL_TTL);
      if (signErr || !signed?.signedUrl) {
        return json({ error: signErr?.message || "Could not sign agreement URL" }, 500);
      }
      return json({ url: signed.signedUrl });
    }

    if (item?.document_url) return json({ url: item.document_url });

    return json({ error: "No signed agreement for this deal yet" }, 404);
  } catch (e) {
    console.error("[get-signed-agreement] error", e);
    return json({ error: String(e) }, 500);
  }
});
