import { createClient } from 'npm:@supabase/supabase-js@2';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { client_id } = await req.json();
    if (!client_id) return new Response(JSON.stringify({ error: "client_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Pull client data
    const { data: client } = await supabase
      .from("clients")
      .select("business_name, business_type, city, state, phone, email, slug")
      .eq("id", client_id)
      .single();

    if (!client) return new Response(JSON.stringify({ error: "Client not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Pull SEO keywords (top 10 by search volume)
    const { data: keywords } = await supabase
      .from("seo_keywords")
      .select("keyword, search_volume, keyword_type")
      .eq("client_id", client_id)
      .order("search_volume", { ascending: false })
      .limit(10);

    // Pull content opportunities (top 5)
    const { data: content } = await supabase
      .from("seo_content_opportunities")
      .select("title, content_type, target_keyword")
      .eq("client_id", client_id)
      .limit(5);

    // Pull activation draft for service areas and modules
    const { data: activation } = await supabase
      .from("activation_drafts")
      .select("service_areas, selected_modules, notes")
      .eq("client_id", client_id)
      .maybeSingle();

    // Build context string
    const keywordList = keywords?.map(k => k.keyword).join(", ") || "none yet";
    const contentList = content?.map(c => c.title).join(", ") || "none yet";
    const serviceAreas = activation?.service_areas || client.city || "local area";
    const modules = activation?.selected_modules?.join(", ") || "general services";

    const userPrompt = `You are building a complete website for a service business using Lovable (a React/TypeScript builder). Generate a detailed, ready-to-use Lovable project prompt that will build a professional 4-page website.

Business Details:
- Name: ${client.business_name}
- Industry: ${client.business_type}
- Location: ${client.city}, ${client.state}
- Phone: ${client.phone || "TBD"}
- Email: ${client.email || "TBD"}
- Service Areas: ${serviceAreas}
- Services/Modules: ${modules}

SEO Keywords to weave into copy: ${keywordList}
Content opportunities to address: ${contentList}

Generate a Lovable prompt that builds:
1. Home page — hero with business name, tagline, CTA button, services overview, trust badges, testimonials placeholder
2. Services page — detailed service cards for each service offered
3. About page — business story, team section placeholder, values
4. Contact page — contact form, phone, email, service area map placeholder, Google Maps embed placeholder

Design requirements:
- Professional, modern design appropriate for a ${client.business_type} business
- Mobile-first responsive layout
- Color scheme that fits the industry
- Clear CTAs on every page
- Fast loading, clean code

The prompt should be self-contained — someone should be able to paste it directly into a new Lovable project and get a complete working website. Be specific about colors, fonts, layout, and copy. Use the actual business name and details throughout.`;

    // Call Lovable AI gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 4000,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const aiData = await aiResponse.json();
    console.log("AI response status:", aiResponse.status);
    console.log("AI response data:", JSON.stringify(aiData));
    const brief = aiData.choices?.[0]?.message?.content;
    console.log("Brief extracted:", brief ? "yes, length=" + brief.length : "null/undefined");

    if (!brief) return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Build Lovable Build with URL
    const encodedPrompt = encodeURIComponent(brief);
    const buildUrl = `https://lovable.dev/?autosubmit=true#prompt=${encodedPrompt}`;

    // Save to client_websites
    await supabase
      .from("client_websites")
      .update({ website_brief: brief, website_build_url: buildUrl, last_updated_at: new Date().toISOString() })
      .eq("client_id", client_id);

    return new Response(JSON.stringify({ brief, build_url: buildUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
