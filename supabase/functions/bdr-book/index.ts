// Public booking endpoint for a BDR's personal calendar.
// Creates a lead in nl_bdr_leads (stage = hot) and an event in bdr_calendar_events.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { booking_slug, customer_name, business_name, phone, email, starts_at, duration_minutes, notes } = body || {};
    if (!booking_slug || !customer_name || !starts_at) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: cal, error: calErr } = await supabase
      .from("bdr_calendars")
      .select("id, user_id, name, booking_active")
      .eq("booking_slug", booking_slug)
      .maybeSingle();
    if (calErr || !cal) {
      return new Response(JSON.stringify({ error: "Booking link not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (cal.booking_active === false) {
      return new Response(JSON.stringify({ error: "Bookings are paused" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const start = new Date(starts_at);
    const end = new Date(start.getTime() + (Number(duration_minutes) || 30) * 60_000);

    // Create lead
    const { data: lead, error: leadErr } = await supabase
      .from("nl_bdr_leads")
      .insert({
        user_id: cal.user_id,
        business_name: business_name || customer_name,
        owner_name: customer_name,
        phone: phone || null,
        lead_source: "booking_form",
        status: "follow_up",
        pipeline_stage: "hot",
        notes: [email ? `Email: ${email}` : null, notes || null].filter(Boolean).join("\n") || null,
        list_name: "Booking Form",
      })
      .select("id")
      .single();
    if (leadErr) throw leadErr;

    // Create event
    const { data: evt, error: evtErr } = await supabase
      .from("bdr_calendar_events")
      .insert({
        user_id: cal.user_id,
        calendar_id: cal.id,
        title: `Booking: ${customer_name}${business_name ? " — " + business_name : ""}`,
        description: notes || null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        lead_id: lead.id,
        stage: "hot",
        source: "booking_form",
        notes: notes || null,
        metadata: { customer_name, business_name, phone, email },
      })
      .select("id")
      .single();
    if (evtErr) throw evtErr;

    return new Response(JSON.stringify({ ok: true, event_id: evt.id, lead_id: lead.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
