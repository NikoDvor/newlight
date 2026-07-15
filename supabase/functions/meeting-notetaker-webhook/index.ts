// Vendor-agnostic AI meeting notetaker webhook receiver.
// URL: POST /functions/v1/meeting-notetaker-webhook/{client_id}
// Header: x-webhook-secret: <per-client secret from meeting_notetaker_configs>
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const url = new URL(req.url);
  // Path shape: /meeting-notetaker-webhook/{client_id}
  const parts = url.pathname.split("/").filter(Boolean);
  const clientId = parts[parts.length - 1];
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!clientId || !uuidRe.test(clientId)) {
    return json(400, { error: "Missing or invalid client_id in path" });
  }

  const providedSecret = req.headers.get("x-webhook-secret");
  if (!providedSecret) return json(401, { error: "Missing x-webhook-secret header" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: cfg } = await supabase
    .from("meeting_notetaker_configs")
    .select("id, webhook_secret, is_active, vendor_name")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!cfg || !cfg.is_active || cfg.webhook_secret !== providedSecret) {
    return json(401, { error: "Invalid webhook secret" });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const {
    external_meeting_id,
    title,
    meeting_date,
    duration_minutes,
    transcript,
    summary,
    action_items,
    sentiment,
    objections,
    interests,
    next_steps,
    follow_up_date,
    score,
  } = body ?? {};

  if (!external_meeting_id || typeof external_meeting_id !== "string") {
    return json(400, { error: "external_meeting_id (string) is required" });
  }
  if (!title || typeof title !== "string") {
    return json(400, { error: "title (string) is required" });
  }

  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  const actionItems = arr(action_items).filter((s) => typeof s === "string" && s.trim().length > 0);

  const payload: Record<string, unknown> = {
    client_id: clientId,
    external_meeting_id,
    notetaker_vendor: cfg.vendor_name,
    title,
    meeting_date: meeting_date ?? null,
    duration_minutes: duration_minutes ?? null,
    transcript: transcript ?? null,
    summary: summary ?? null,
    action_items: actionItems,
    sentiment: sentiment ?? "neutral",
    objections: arr(objections),
    interests: arr(interests),
    next_steps: arr(next_steps),
    follow_up_date: follow_up_date ?? null,
    score: score ?? null,
  };

  // Idempotent upsert on (client_id, external_meeting_id)
  const { data: existing } = await supabase
    .from("meeting_intelligence")
    .select("id")
    .eq("client_id", clientId)
    .eq("external_meeting_id", external_meeting_id)
    .maybeSingle();

  let meetingId: string;
  let wasInsert = false;

  if (existing) {
    const { error } = await supabase
      .from("meeting_intelligence")
      .update(payload)
      .eq("id", existing.id);
    if (error) return json(500, { error: error.message });
    meetingId = existing.id;
  } else {
    const { data: inserted, error } = await supabase
      .from("meeting_intelligence")
      .insert(payload)
      .select("id")
      .single();
    if (error) return json(500, { error: error.message });
    meetingId = inserted.id;
    wasInsert = true;
  }

  // Only create tasks on first insert to avoid duplicate tasks on retries
  let tasksCreated = 0;
  if (wasInsert && actionItems.length > 0) {
    const tasks = actionItems.map((t: string) => ({
      client_id: clientId,
      title: t.slice(0, 500),
      description: `From meeting: ${title}`,
      related_type: "meeting_intelligence",
      related_id: meetingId,
      task_category: "meeting_followup",
      priority: "medium",
      status: "open",
    }));
    const { error: tErr, data: tData } = await supabase.from("crm_tasks").insert(tasks).select("id");
    if (!tErr) tasksCreated = tData?.length ?? 0;
  }

  // Automation events
  await supabase.from("automation_events").insert({
    client_id: clientId,
    event_type: "meeting_transcript_received",
    event_key: "meeting_transcript_received",
    event_name: "Meeting Transcript Received",
    related_type: "meeting_intelligence",
    related_id: meetingId,
    event_data: {
      external_meeting_id,
      vendor: cfg.vendor_name,
      was_insert: wasInsert,
      action_items_count: actionItems.length,
    },
  });

  if (wasInsert && tasksCreated > 0) {
    await supabase.from("automation_events").insert({
      client_id: clientId,
      event_type: "meeting_action_items_created",
      event_key: "meeting_action_items_created",
      event_name: "Meeting Action Items Created",
      related_type: "meeting_intelligence",
      related_id: meetingId,
      event_data: {
        external_meeting_id,
        vendor: cfg.vendor_name,
        tasks_created: tasksCreated,
      },
    });
  }

  // Audit
  await supabase.from("audit_logs").insert({
    client_id: clientId,
    action: wasInsert ? "meeting_intelligence_received" : "meeting_intelligence_updated",
    module: "meeting_notetaker",
    metadata: {
      meeting_id: meetingId,
      external_meeting_id,
      vendor: cfg.vendor_name,
      tasks_created: tasksCreated,
    },
  });

  return json(200, {
    ok: true,
    meeting_id: meetingId,
    was_insert: wasInsert,
    tasks_created: tasksCreated,
  });
});
