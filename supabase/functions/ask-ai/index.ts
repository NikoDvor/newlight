import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, client_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Gather workspace context
    let context = "You are Ask AI, the intelligent assistant for the NewLight platform. ";
    context += "You help clients understand their business data, setup status, growth opportunities, and next steps.\n\n";

    if (client_id) {
      // Client info
      const { data: client } = await sb.from("clients").select("*").eq("id", client_id).maybeSingle();
      if (client) {
        context += `## Business Info\n- Name: ${client.business_name}\n- Industry: ${client.industry || "Not set"}\n- Location: ${client.primary_location || "Not set"}\n- Status: ${client.status}\n\n`;
      }

      // Branding
      const { data: branding } = await sb.from("client_branding").select("company_name, display_name, dashboard_title, welcome_message").eq("client_id", client_id).maybeSingle();
      if (branding) {
        context += `## Branding\n- Company: ${branding.company_name || "Not set"}\n- Dashboard: ${branding.dashboard_title || "Default"}\n\n`;
      }

      // Onboarding
      const { data: onboarding } = await sb.from("onboarding_progress").select("*").eq("client_id", client_id).maybeSingle();
      if (onboarding) {
        const steps = ["business_info", "website_connected", "google_business_connected", "review_platform_connected", "ad_account_connected", "crm_setup", "team_setup", "launch_ready"];
        const done = steps.filter(s => (onboarding as any)[s]);
        const missing = steps.filter(s => !(onboarding as any)[s]);
        context += `## Onboarding\n- Completed: ${done.join(", ") || "None"}\n- Missing: ${missing.join(", ") || "All done"}\n\n`;
      }

      // Integrations
      const { data: integrations } = await sb.from("client_integrations").select("integration_name, status").eq("client_id", client_id);
      if (integrations?.length) {
        context += `## Integrations\n${integrations.map(i => `- ${i.integration_name}: ${i.status}`).join("\n")}\n\n`;
      }

      // CRM summary
      const { count: contactCount } = await sb.from("crm_contacts").select("id", { count: "exact", head: true }).eq("client_id", client_id);
      const { count: leadCount } = await sb.from("crm_leads").select("id", { count: "exact", head: true }).eq("client_id", client_id);
      const { count: dealCount } = await sb.from("crm_deals").select("id", { count: "exact", head: true }).eq("client_id", client_id);
      const { count: taskCount } = await sb.from("crm_tasks").select("id", { count: "exact", head: true }).eq("client_id", client_id).eq("status", "open");
      context += `## CRM\n- Contacts: ${contactCount || 0}\n- Leads: ${leadCount || 0}\n- Deals: ${dealCount || 0}\n- Open Tasks: ${taskCount || 0}\n\n`;

      // Calendar
      const { count: upcomingEvents } = await sb.from("calendar_events").select("id", { count: "exact", head: true }).eq("client_id", client_id).gte("start_time", new Date().toISOString());
      context += `## Calendar\n- Upcoming events: ${upcomingEvents || 0}\n\n`;

      // Reviews
      const { count: reviewCount } = await sb.from("review_requests").select("id", { count: "exact", head: true }).eq("client_id", client_id);
      context += `## Reviews\n- Review requests: ${reviewCount || 0}\n\n`;

      // Recent activity
      const { data: activities } = await sb.from("crm_activities").select("activity_type, activity_note, created_at").eq("client_id", client_id).order("created_at", { ascending: false }).limit(5);
      if (activities?.length) {
        context += `## Recent Activity\n${activities.map(a => `- ${a.activity_type}: ${a.activity_note || "No note"} (${new Date(a.created_at).toLocaleDateString()})`).join("\n")}\n\n`;
      }
    }

    context += "\nProvide actionable, specific answers. Use data above when relevant. Suggest next steps. Be concise but helpful.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: context },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up in Settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("AI error:", status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ask-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
