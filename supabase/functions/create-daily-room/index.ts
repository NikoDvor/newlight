import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const dailyKey = Deno.env.get("DAILY_API_KEY");
  if (!dailyKey) {
    return json({ error: "DAILY_API_KEY not configured — add it to Lovable secrets" }, 503);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const { record_type, record_id } = body;

    if (!record_type || !record_id) {
      return json({ error: "record_type and record_id required" }, 400);
    }
    if (!["appointment", "sales_meeting"].includes(record_type)) {
      return json({ error: "record_type must be appointment or sales_meeting" }, 400);
    }

    // Generate a unique room name
    const roomName = `nl-${record_type}-${record_id.slice(0, 8)}-${Date.now()}`;

    // Create room via Daily.co API
    const dailyRes = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dailyKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4, // 4 hour expiry
          enable_recording: "cloud",
          enable_chat: true,
          enable_knocking: true,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
    });

    if (!dailyRes.ok) {
      const err = await dailyRes.text();
      console.error("Daily.co API error:", err);
      return json({ error: "Failed to create Daily room" }, 502);
    }

    const room = await dailyRes.json();
    const roomUrl = room.url;

    // Save room URL to the record
    const table = record_type === "appointment" ? "appointments" : "sales_meetings";
    await serviceClient.from(table).update({
      daily_room_url: roomUrl,
      daily_room_name: roomName,
      meeting_started_at: new Date().toISOString(),
    }).eq("id", record_id);

    return json({ room_url: roomUrl, room_name: roomName });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return json({ error: msg }, 500);
  }
});
