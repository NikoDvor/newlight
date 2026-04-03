import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { share_token, action, signer_name, signer_email, signature_data, rejection_reason } = await req.json();

    if (!share_token || !action) return json({ error: "Missing share_token or action" }, 400);
    if (!["accept", "reject", "view"].includes(action)) return json({ error: "Invalid action" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: proposal, error: fetchErr } = await supabase
      .from("proposals")
      .select("*")
      .eq("share_token", share_token)
      .single();

    if (fetchErr || !proposal) return json({ error: "Proposal not found" }, 404);

    const terminalStates = ["accepted", "declined", "expired"];

    if (action === "view") {
      if (!proposal.viewed_at) {
        await supabase.from("proposals").update({
          viewed_at: new Date().toISOString(),
          proposal_status: proposal.proposal_status === "sent" ? "viewed" : proposal.proposal_status,
        }).eq("id", proposal.id);
        proposal.viewed_at = new Date().toISOString();
        if (proposal.proposal_status === "sent") proposal.proposal_status = "viewed";
      }

      const [sRes, lRes] = await Promise.all([
        supabase.from("proposal_sections").select("*").eq("proposal_id", proposal.id).order("section_order"),
        supabase.from("proposal_line_items").select("*").eq("proposal_id", proposal.id).order("sort_order"),
      ]);

      return json({ proposal, sections: sRes.data || [], lineItems: lRes.data || [] });
    }

    if (terminalStates.includes(proposal.proposal_status)) return json({ error: "Proposal is in a terminal state" }, 409);

    if (action === "accept") {
      if (!signer_name || !signer_email) return json({ error: "Signer name and email required" }, 400);

      await supabase.from("proposal_signatures").insert({
        proposal_id: proposal.id,
        signer_name,
        signer_email,
        signature_data: signature_data || null,
        ip_address: req.headers.get("x-forwarded-for") || null,
      });

      await supabase.from("proposals").update({
        proposal_status: "accepted",
        accepted_at: new Date().toISOString(),
      }).eq("id", proposal.id);

      await supabase.from("audit_logs").insert({
        action: "proposal_accepted",
        module: "sales",
        metadata: { proposal_id: proposal.id, signer: signer_name },
      });

      return json({ success: true, status: "accepted" });
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

      return json({ success: true, status: "declined" });
    }

    return json({ error: "Unknown action" }, 400);
  } catch {
    return json({ error: "Internal error" }, 500);
  }
});
