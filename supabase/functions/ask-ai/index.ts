import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    let context = "You are Ask AI, the intelligent assistant for the NewLight platform. ";
    context += "You help clients understand their business data, setup status, growth opportunities, and next steps.\n";
    context += "Answer using real data provided below. Be specific, actionable, and concise.\n\n";

    if (client_id) {
      // Client info + CRM mode
      const { data: client } = await sb.from("clients").select("*").eq("id", client_id).maybeSingle();
      if (client) {
        context += `## Business Info\n- Name: ${client.business_name}\n- Industry: ${client.industry || "Not set"}\n- Location: ${client.primary_location || "Not set"}\n- Status: ${client.status}\n- Package: ${client.service_package || "Not set"}\n- CRM Mode: ${client.crm_mode || "native"}\n\n`;
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
        const pct = Math.round((done.length / steps.length) * 100);
        context += `## Onboarding (${pct}% complete)\n- Completed: ${done.join(", ") || "None"}\n- Missing: ${missing.join(", ") || "All done"}\n\n`;
      }

      // Integrations
      const { data: integrations } = await sb.from("client_integrations").select("integration_name, status").eq("client_id", client_id);
      if (integrations?.length) {
        const connected = integrations.filter(i => i.status === "connected").length;
        context += `## Integrations (${connected}/${integrations.length} connected)\n${integrations.map(i => `- ${i.integration_name}: ${i.status}`).join("\n")}\n\n`;
      }

      // CRM summary with pipeline breakdown
      const { count: contactCount } = await sb.from("crm_contacts").select("id", { count: "exact", head: true }).eq("client_id", client_id);
      const { data: allDeals } = await sb.from("crm_deals").select("deal_value, pipeline_stage, status").eq("client_id", client_id);
      const { count: leadCount } = await sb.from("crm_leads").select("id", { count: "exact", head: true }).eq("client_id", client_id);
      const { count: taskCount } = await sb.from("crm_tasks").select("id", { count: "exact", head: true }).eq("client_id", client_id).eq("status", "open");
      const { count: companyCount } = await sb.from("crm_companies").select("id", { count: "exact", head: true }).eq("client_id", client_id);

      const deals = allDeals || [];
      const openDeals = deals.filter(d => d.status === "open");
      const wonDeals = deals.filter(d => d.pipeline_stage === "closed_won");
      const lostDeals = deals.filter(d => d.pipeline_stage === "closed_lost");
      const pipelineValue = openDeals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
      const wonValue = wonDeals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);

      const stages = ["new_lead", "contacted", "qualified", "appointment_booked", "proposal_sent", "negotiation", "closed_won", "closed_lost"];
      const stageCounts = stages.map(st => `${st}: ${deals.filter(d => d.pipeline_stage === st).length}`).join(", ");

      context += `## CRM\n- Contacts: ${contactCount || 0}\n- Companies: ${companyCount || 0}\n- Leads: ${leadCount || 0}\n- Total Deals: ${deals.length}\n- Open Deals: ${openDeals.length} ($${pipelineValue.toLocaleString()} pipeline)\n- Won Deals: ${wonDeals.length} ($${wonValue.toLocaleString()} revenue)\n- Lost Deals: ${lostDeals.length}\n- Open Tasks: ${taskCount || 0}\n- Pipeline: ${stageCounts}\n\n`;

      // External CRM connection status
      if (client?.crm_mode === "external") {
        const { data: conn } = await sb.from("crm_connections").select("crm_provider_name, connection_status, last_synced_at").eq("client_id", client_id).limit(1).maybeSingle();
        if (conn) {
          context += `## External CRM Connection\n- Provider: ${conn.crm_provider_name}\n- Status: ${conn.connection_status}\n- Last Synced: ${conn.last_synced_at ? new Date(conn.last_synced_at).toLocaleString() : "Never"}\n\n`;
        }
        const { data: syncLogs } = await sb.from("crm_sync_logs").select("sync_status, records_processed, error_message, started_at").eq("client_id", client_id).order("started_at", { ascending: false }).limit(3);
        if (syncLogs?.length) {
          context += `## Recent Sync Logs\n${syncLogs.map(l => `- ${l.sync_status}: ${l.records_processed || 0} records (${new Date(l.started_at).toLocaleDateString()})${l.error_message ? ` Error: ${l.error_message}` : ""}`).join("\n")}\n\n`;
        }
      }

      // Calendar
      const { data: calEvents } = await sb.from("calendar_events").select("calendar_status, start_time").eq("client_id", client_id);
      if (calEvents) {
        const now = new Date();
        const upcoming = calEvents.filter(e => new Date(e.start_time) >= now && e.calendar_status !== "cancelled").length;
        const completed = calEvents.filter(e => e.calendar_status === "completed").length;
        const noShows = calEvents.filter(e => e.calendar_status === "no_show").length;
        const cancelled = calEvents.filter(e => e.calendar_status === "cancelled").length;
        context += `## Calendar\n- Total Events: ${calEvents.length}\n- Upcoming: ${upcoming}\n- Completed: ${completed}\n- No Shows: ${noShows}\n- Cancelled: ${cancelled}\n\n`;
      }

      // Reviews
      const { data: reviews } = await sb.from("review_requests").select("rating, status, recovery_needed, public_review_left").eq("client_id", client_id);
      if (reviews?.length) {
        const rated = reviews.filter((r: any) => r.rating);
        const avg = rated.length > 0 ? (rated.reduce((s: number, r: any) => s + r.rating, 0) / rated.length).toFixed(1) : "N/A";
        const fiveStars = rated.filter((r: any) => r.rating === 5).length;
        const recoveryNeeded = reviews.filter((r: any) => r.recovery_needed).length;
        const publicReviews = reviews.filter((r: any) => r.public_review_left).length;
        context += `## Reviews\n- Total Requests: ${reviews.length}\n- Avg Rating: ${avg}\n- 5-Star Reviews: ${fiveStars}\n- Recovery Needed: ${recoveryNeeded}\n- Public Reviews: ${publicReviews}\n\n`;
      }

      // Email
      const { data: emailConns } = await sb.from("email_connections").select("provider, status, email_address, last_synced_at").eq("client_id", client_id);
      const { count: inboxCount } = await sb.from("email_messages").select("id", { count: "exact", head: true }).eq("client_id", client_id).eq("folder", "inbox").eq("is_read", false);
      if (emailConns?.length || inboxCount) {
        context += `## Email\n`;
        if (emailConns?.length) {
          context += emailConns.map(c => `- ${c.provider} (${c.email_address || "unknown"}): ${c.status}`).join("\n") + "\n";
        }
        context += `- Unread Inbox: ${inboxCount || 0}\n\n`;
      }

      // Finance
      const { data: adjustments } = await sb.from("financial_adjustments").select("amount, type, created_at").eq("client_id", client_id);
      if (adjustments?.length) {
        const totalRevenue = adjustments.filter(a => a.type === "revenue").reduce((s, a) => s + Number(a.amount), 0);
        context += `## Finance\n- Revenue Adjustments: ${adjustments.length}\n- Total Tracked Revenue: $${totalRevenue.toLocaleString()}\n\n`;
      }

      // Recent activity
      const { data: activities } = await sb.from("crm_activities").select("activity_type, activity_note, created_at").eq("client_id", client_id).order("created_at", { ascending: false }).limit(15);
      if (activities?.length) {
        context += `## Recent Activity\n${activities.map(a => `- ${a.activity_type}: ${a.activity_note || "No note"} (${new Date(a.created_at).toLocaleDateString()})`).join("\n")}\n\n`;
      }

      // Ad campaigns
      const { data: campaigns } = await sb.from("ad_campaigns").select("campaign_name, platform, status, spend, leads, roas").eq("client_id", client_id);
      if (campaigns?.length) {
        const totalSpend = campaigns.reduce((s, c) => s + (Number(c.spend) || 0), 0);
        const totalLeads = campaigns.reduce((s, c) => s + (Number(c.leads) || 0), 0);
        context += `## Ads\n- Active Campaigns: ${campaigns.filter(c => c.status === "active").length}\n- Total Spend: $${totalSpend.toLocaleString()}\n- Total Leads: ${totalLeads}\n${campaigns.map(c => `- ${c.campaign_name} (${c.platform}): ${c.status}, $${Number(c.spend || 0).toLocaleString()} spent, ${c.leads || 0} leads`).join("\n")}\n\n`;
      }

      // Automation health
      const { data: automations } = await sb.from("automations").select("name, enabled").eq("client_id", client_id);
      if (automations?.length) {
        const enabled = automations.filter(a => a.enabled).length;
        context += `## Automations\n- Total: ${automations.length}\n- Active: ${enabled}\n- Disabled: ${automations.length - enabled}\n\n`;
      }

      // Workforce & Payroll
      const { data: workers } = await sb.from("workers").select("full_name, role_title, department, status, pay_type, hourly_rate, salary_amount").eq("client_id", client_id);
      if (workers?.length) {
        const active = workers.filter(w => w.status === "active").length;
        context += `## Workforce\n- Total Workers: ${workers.length}\n- Active: ${active}\n${workers.slice(0, 10).map(w => `- ${w.full_name} (${w.role_title || "No title"}, ${w.department || "No dept"}) — ${w.pay_type}, ${w.status}`).join("\n")}\n\n`;
      }

      const { data: payrollRuns } = await sb.from("payroll_runs").select("pay_period_start, pay_period_end, net_pay_total, payroll_status").eq("client_id", client_id).order("created_at", { ascending: false }).limit(5);
      if (payrollRuns?.length) {
        const totalPaid = payrollRuns.filter(p => p.payroll_status === "paid").reduce((s, p) => s + (Number(p.net_pay_total) || 0), 0);
        context += `## Payroll\n- Recent Runs: ${payrollRuns.length}\n- Total Paid: $${totalPaid.toLocaleString()}\n${payrollRuns.map(p => `- ${p.pay_period_start} to ${p.pay_period_end}: $${Number(p.net_pay_total || 0).toLocaleString()} (${p.payroll_status})`).join("\n")}\n\n`;
      }

      // Health Scores
      const { data: healthScores } = await sb.from("client_health_scores").select("*").eq("client_id", client_id).maybeSingle();
      if (healthScores) {
        context += `## Health Scores\n- Overall: ${healthScores.overall_score}/100\n- Website: ${healthScores.website_score}\n- SEO: ${healthScores.seo_score}\n- Leads: ${healthScores.leads_score}\n- Reviews: ${healthScores.reviews_score}\n- Social: ${healthScores.social_score}\n- Ads: ${healthScores.ads_score}\n- Automation: ${healthScores.automation_score}\n- Conversion: ${healthScores.conversion_score}\n\n`;
      }
    }

    context += "\nProvide actionable, specific answers using the data above. Suggest concrete next steps. If data is missing, acknowledge it and recommend what to set up. Be concise but helpful.";

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
