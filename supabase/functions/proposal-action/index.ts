import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { share_token, action, signer_name, signer_email, signature_data, rejection_reason } = await req.json();

    if (!share_token || !action) {
      return new Response(JSON.stringify({ error: "Missing share_token or action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!["accept", "reject", "view"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch proposal by share_token (server-side validation)
    const { data: proposal, error: fetchErr } = await supabase
      .from("proposals")
      .select("*")
      .eq("share_token", share_token)
      .single();

    if (fetchErr || !proposal) {
      return new Response(JSON.stringify({ error: "Proposal not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const terminalStates = ["accepted", "declined", "expired"];

    if (action === "view") {
      // Mark as viewed if not yet
      if (!proposal.viewed_at) {
        await supabase.from("proposals").update({
          viewed_at: new Date().toISOString(),
          proposal_status: proposal.proposal_status === "sent" ? "viewed" : proposal.proposal_status,
        }).eq("id", proposal.id);
      }
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (terminalStates.includes(proposal.proposal_status)) {
      return new Response(JSON.stringify({ error: "Proposal is in a terminal state" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "accept") {
      if (!signer_name || !signer_email) {
        return new Response(JSON.stringify({ error: "Signer name and email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Insert signature
      await supabase.from("proposal_signatures").insert({
        proposal_id: proposal.id,
        signer_name,
        signer_email,
        signature_data: signature_data || null,
        ip_address: req.headers.get("x-forwarded-for") || null,
      });

      // Update proposal status
      await supabase.from("proposals").update({
        proposal_status: "accepted",
        accepted_at: new Date().toISOString(),
      }).eq("id", proposal.id);

      // Audit log
      await supabase.from("audit_logs").insert({
        action: "proposal_accepted",
        module: "sales",
        metadata: { proposal_id: proposal.id, signer: signer_name },
      });

      return new Response(JSON.stringify({ success: true, status: "accepted" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "reject") {
      await supabase.from("proposals").update({
        proposal_status: "declined",
        declined_at: new Date().toISOString(),
        rejection_reason: rejection_reason || null,
      }).eq("id", proposal.id);

      await supabase.from("audit_logs").insert({
        action: "proposal_rejected",
        module: "sales",
        metadata: { proposal_id: proposal.id, reason: rejection_reason },
      });

      return new Response(JSON.stringify({ success: true, status: "declined" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
