import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed. Use POST." }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const token =
    req.headers.get("x-webhook-token")?.trim() ||
    url.searchParams.get("token")?.trim() ||
    "";

  let body: any = {};
  let parseError: string | null = null;
  try {
    body = await req.json();
  } catch {
    parseError = "Request body must be valid JSON.";
  }

  const clientId = typeof body?.client_id === "string" ? body.client_id.trim() : "";
  const rawAmount = body?.amount;
  const amount = typeof rawAmount === "number" ? rawAmount : Number(rawAmount);
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  const occurredAt = typeof body?.occurred_at === "string" ? body.occurred_at : "";

  const audit = async (status: "success" | "error", message: string, extra: Record<string, unknown> = {}) => {
    try {
      await admin.from("audit_logs").insert({
        client_id: UUID_RE.test(clientId) ? clientId : null,
        action: "external_revenue_webhook_received",
        module: "billing",
        status,
        metadata: {
          message,
          amount: Number.isFinite(amount) ? amount : null,
          description: description || null,
          occurred_at: occurredAt || null,
          token_present: token.length > 0,
          submitted_client_id: clientId || null,
          ...extra,
        },
      });
    } catch (_) { /* never block on audit */ }
  };

  const fail = async (status: number, error: string, extra: Record<string, unknown> = {}) => {
    await audit("error", error, extra);
    return json({ ok: false, error }, status);
  };

  if (parseError) return await fail(400, parseError);
  if (!UUID_RE.test(clientId)) return await fail(400, "client_id is required and must be a valid UUID.");
  if (!Number.isFinite(amount) || amount <= 0) return await fail(400, "amount is required and must be a number greater than 0.");
  if (occurredAt && Number.isNaN(Date.parse(occurredAt))) {
    return await fail(400, "occurred_at must be an ISO 8601 timestamp (e.g. 2026-01-31T14:00:00Z).");
  }
  if (!token) return await fail(401, "Missing webhook token. Send it as ?token= or the x-webhook-token header.");

  const { data: client, error: clientErr } = await admin
    .from("clients")
    .select("id, revenue_webhook_token")
    .eq("id", clientId)
    .maybeSingle();

  if (clientErr) return await fail(500, "Could not verify client.", { db_error: clientErr.message });
  if (!client || client.revenue_webhook_token !== token) {
    return await fail(401, "Invalid webhook token for this client_id.");
  }

  const { data: inserted, error: insertErr } = await admin
    .from("financial_adjustments")
    .insert({
      client_id: clientId,
      type: "revenue",
      amount,
      reason: description || "External CRM revenue",
      created_at: occurredAt ? new Date(occurredAt).toISOString() : new Date().toISOString(),
    })
    .select("id, amount, created_at")
    .single();

  if (insertErr) return await fail(500, "Failed to record revenue.", { db_error: insertErr.message });

  await audit("success", "Revenue recorded.", { adjustment_id: inserted.id });

  return json({
    ok: true,
    message: "Revenue recorded.",
    adjustment: inserted,
  });
});
