// Public booking endpoint for a BDR's personal calendar.
// Supports round-robin pool: if the matched calendar is in the round-robin pool,
// the booking is reassigned to the least-recently-assigned active pool member.
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

    // 1. Find the originating calendar
    const { data: originCal, error: calErr } = await supabase
      .from("bdr_calendars")
      .select("id, user_id, client_id, name, booking_active, round_robin_pool")
      .eq("booking_slug", booking_slug)
      .maybeSingle();
    if (calErr || !originCal) {
      return new Response(JSON.stringify({ error: "Booking link not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (originCal.booking_active === false) {
      return new Response(JSON.stringify({ error: "Bookings are paused" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Round-robin assignment (even rotation = least-recently-assigned) — scoped to the same client tenant
    let assignedCal: { id: string; user_id: string; client_id: string; name: string } = originCal as any;
    let roundRobin = false;
    if (originCal.round_robin_pool) {
      const { data: pool } = await supabase
        .from("bdr_calendars")
        .select("id, user_id, client_id, name, last_assigned_at")
        .eq("round_robin_pool", true)
        .eq("booking_active", true)
        .eq("client_id", originCal.client_id)
        .order("last_assigned_at", { ascending: true, nullsFirst: true })
        .limit(1);
      if (pool && pool.length) {
        assignedCal = pool[0] as any;
        roundRobin = true;
      }
    }

    const start = new Date(starts_at);
    const end = new Date(start.getTime() + (Number(duration_minutes) || 30) * 60_000);

    // 3. Create lead (CRM record for the BDR's My Leads)
    const noteParts: string[] = [];
    if (roundRobin && assignedCal.user_id !== originCal.user_id) {
      noteParts.push(`Round-robin from ${originCal.name}`);
    }
    if (notes) noteParts.push(notes);

    const { data: lead, error: leadErr } = await supabase
      .from("nl_bdr_leads")
      .insert({
        user_id: assignedCal.user_id,
        client_id: assignedCal.client_id,
        business_name: business_name || customer_name,
        owner_name: customer_name,
        phone: phone || null,
        email: email || null,
        lead_source: "booking_form",
        status: "follow_up",
        pipeline_stage: "hot",
        notes: noteParts.join("\n") || null,
        list_name: "Booking Form",
      })
      .select("id")
      .single();
    if (leadErr) throw leadErr;

    // 4. Create event on assigned BDR's calendar
    const { data: evt, error: evtErr } = await supabase
      .from("bdr_calendar_events")
      .insert({
        user_id: assignedCal.user_id,
        client_id: assignedCal.client_id,
        calendar_id: assignedCal.id,
        title: `Booking: ${customer_name}${business_name ? " — " + business_name : ""}`,
        description: notes || null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        lead_id: lead.id,
        stage: "hot",
        source: roundRobin ? "round_robin" : "booking_form",
        notes: notes || null,
        metadata: {
          customer_name,
          business_name,
          phone,
          email,
          round_robin: roundRobin,
          origin_calendar_id: originCal.id,
        },
      })
      .select("id")
      .single();
    if (evtErr) throw evtErr;

    // 5. Stamp last_assigned_at for fair rotation
    if (roundRobin) {
      await supabase
        .from("bdr_calendars")
        .update({ last_assigned_at: new Date().toISOString() })
        .eq("id", assignedCal.id);
    }

    return new Response(JSON.stringify({
      ok: true,
      event_id: evt.id,
      lead_id: lead.id,
      assigned_to: assignedCal.user_id,
      assigned_calendar: assignedCal.name,
      round_robin: roundRobin,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
