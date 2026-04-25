import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { client_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!client_id) return new Response(JSON.stringify({ error: "Missing client_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!supabaseAnonKey || !authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: hasAccess, error: accessError } = await authClient.rpc("user_has_client_access", { _user_id: user.id, _client_id: client_id });
    if (accessError || !hasAccess) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sb = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      { data: client },
      { data: newContacts },
      { data: newDeals },
      { data: events },
      { data: reviews },
      { data: healthScores },
      { data: adjustments },
    ] = await Promise.all([
      sb.from("clients").select("business_name, industry").eq("id", client_id).maybeSingle(),
      sb.from("crm_contacts").select("id").eq("client_id", client_id).gte("created_at", weekAgo),
      sb.from("crm_deals").select("deal_value, pipeline_stage").eq("client_id", client_id).gte("created_at", weekAgo),
      sb.from("calendar_events").select("calendar_status").eq("client_id", client_id).gte("created_at", weekAgo),
      sb.from("review_requests").select("rating").eq("client_id", client_id).gte("created_at", weekAgo),
      sb.from("client_health_scores").select("overall_score").eq("client_id", client_id).maybeSingle(),
      sb.from("financial_adjustments").select("amount, type").eq("client_id", client_id).gte("created_at", weekAgo),
    ]);

    const newLeads = (newContacts || []).length;
    const dealsCreated = (newDeals || []).length;
    const wonDeals = (newDeals || []).filter(d => d.pipeline_stage === "closed_won");
    const wonRevenue = wonDeals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
    const appts = (events || []).length;
    const completedAppts = (events || []).filter(e => e.calendar_status === "completed").length;
    const reviewsSent = (reviews || []).length;
    const avgRating = (reviews || []).filter(r => r.rating).length > 0
      ? ((reviews || []).filter(r => r.rating).reduce((s, r) => s + r.rating, 0) / (reviews || []).filter(r => r.rating).length).toFixed(1)
      : "N/A";
    const growthScore = healthScores?.overall_score || 0;
    const weekRevenue = (adjustments || []).filter(a => a.type === "revenue").reduce((s, a) => s + Number(a.amount), 0);

    const prompt = `Generate a concise weekly growth report for ${client?.business_name || "this business"} (${client?.industry || "general"}).

Data for the past 7 days:
- Growth Score: ${growthScore}/100
- New Leads: ${newLeads}
- Deals Created: ${dealsCreated}
- Deals Won: ${wonDeals.length} ($${wonRevenue.toLocaleString()})
- Appointments Booked: ${appts}
- Appointments Completed: ${completedAppts}
- Review Requests Sent: ${reviewsSent}
- Average Rating: ${avgRating}
- Revenue This Week: $${weekRevenue.toLocaleString()}

Write a brief executive summary (3-4 sentences), then list 3 key highlights and 3 recommended actions for next week. Use markdown formatting.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a business growth analyst. Write concise, data-driven weekly reports." },
          { role: "user", content: prompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("weekly-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
