import { supabase } from "@/integrations/supabase/client";

/**
 * Idempotent proposal generation from wizard Stage 2.
 * - If proposalId exists, update in place and bump version_number.
 * - Otherwise create a new proposal.
 * Returns { proposalId, version, action: "created" | "updated" }
 */
export async function generateProposalFromWizard(params: {
  proposalId?: string;
  clientId: string;
  dealId?: string;
  contactId?: string;
  companyId?: string;
  assignedSalesUserId?: string;
  servicePackage?: string;
  setupFee?: string;
  monthlyFee?: string;
  contractTerm?: string;
  salesNotes?: string;
  businessName?: string;
  isRevision?: boolean;
}): Promise<{ proposalId: string; version: number; action: "created" | "updated" } | null> {
  const {
    proposalId, clientId, dealId, contactId, companyId,
    assignedSalesUserId, servicePackage, setupFee, monthlyFee,
    contractTerm, salesNotes, businessName, isRevision
  } = params;

  const title = `${businessName || "Client"} — ${servicePackage || "Custom"} Package`;

  // ── UPDATE existing proposal ──
  if (proposalId) {
    const { data: existing } = await supabase
      .from("proposals")
      .select("id, version_number")
      .eq("id", proposalId)
      .single();

    if (existing) {
      const newVersion = (existing.version_number || 1) + 1;
      await supabase.from("proposals").update({
        proposal_title: title,
        setup_fee: Number(setupFee) || 0,
        monthly_fee: Number(monthlyFee) || 0,
        contract_term: contractTerm || "6 months",
        service_package_type: servicePackage || "custom",
        proposal_status: isRevision ? "revised" : "generated",
        version_number: newVersion,
        expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      } as any).eq("id", proposalId);

      // Log
      await Promise.all([
        supabase.from("audit_logs").insert({
          action: "proposal_updated_from_wizard",
          client_id: clientId,
          module: "sales",
          metadata: { proposal_id: proposalId, version: newVersion, is_revision: !!isRevision },
        }),
        supabase.from("crm_activities").insert({
          client_id: clientId,
          activity_type: "proposal_updated",
          activity_note: `Proposal v${newVersion} updated via wizard${isRevision ? " (revision)" : ""}`,
        }),
      ]);

      return { proposalId, version: newVersion, action: "updated" };
    }
  }

  // ── CREATE new proposal ──
  function generateShareToken(): string {
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
  }

  const { data: proposal, error } = await supabase.from("proposals").insert({
    proposal_title: title,
    proposal_type: "service_proposal",
    proposal_status: "generated",
    client_id: clientId,
    contact_id: contactId || null,
    company_id: companyId || null,
    deal_id: dealId || null,
    assigned_salesman_user_id: assignedSalesUserId || null,
    setup_fee: Number(setupFee) || 0,
    monthly_fee: Number(monthlyFee) || 0,
    contract_term: contractTerm || "6 months",
    share_token: generateShareToken(),
    service_package_type: servicePackage || "custom",
    pricing_model: "monthly_retainer",
    expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    version_number: 1,
  } as any).select("id").single();

  if (error || !proposal) return null;

  // Link to deal
  if (dealId) {
    await supabase.from("crm_deals").update({
      proposal_id_current: proposal.id,
    } as any).eq("id", dealId);
  }

  // Log
  await Promise.all([
    supabase.from("audit_logs").insert({
      action: "proposal_created_from_wizard",
      client_id: clientId,
      module: "sales",
      metadata: { proposal_id: proposal.id, version: 1, deal_id: dealId },
    }),
    supabase.from("crm_activities").insert({
      client_id: clientId,
      activity_type: "proposal_created",
      activity_note: `Proposal v1 created via wizard — ${title}`,
    }),
  ]);

  return { proposalId: proposal.id, version: 1, action: "created" };
}

/**
 * Mark proposal as accepted. Called on Won.
 */
export async function markProposalAccepted(proposalId: string, clientId: string) {
  await supabase.from("proposals").update({
    proposal_status: "accepted",
  } as any).eq("id", proposalId);

  await supabase.from("audit_logs").insert({
    action: "proposal_accepted_via_wizard",
    client_id: clientId,
    module: "sales",
    metadata: { proposal_id: proposalId },
  });
}
