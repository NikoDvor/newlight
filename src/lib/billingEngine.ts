import { supabase } from "@/integrations/supabase/client";

// ─── Billing Engine — auto-creates billing records after proposal acceptance ──

function invoiceNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const seq = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${y}-${m}-${seq}`;
}

export async function createBillingFromProposal(proposalId: string, opts?: { pendingSignature?: boolean }) {
  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .single();
  if (!proposal) return null;

  const clientId = proposal.client_id;
  if (!clientId) return null;

  // ── Dedup check: reuse existing billing records for this proposal ──
  const { data: existingBa } = await supabase
    .from("billing_accounts")
    .select("id")
    .eq("proposal_id", proposalId)
    .limit(1)
    .maybeSingle();

  if (existingBa) {
    // Already created — find linked records and return
    const { data: existingSub } = await supabase.from("subscriptions").select("id").eq("billing_account_id", existingBa.id).limit(1).maybeSingle();
    const { data: existingContract } = await supabase.from("contract_records").select("id").eq("proposal_id", proposalId).limit(1).maybeSingle();
    const { data: existingInv } = await supabase.from("invoices").select("id").eq("proposal_id", proposalId).limit(1).maybeSingle();

    await supabase.from("audit_logs").insert({
      action: "billing_reused_existing",
      client_id: clientId,
      module: "billing",
      metadata: { proposal_id: proposalId, billing_account_id: existingBa.id, reason: "duplicate_prevention" },
    });

    return {
      billingAccountId: existingBa.id,
      subscriptionId: existingSub?.id ?? null,
      contractRecordId: existingContract?.id ?? null,
      invoiceId: existingInv?.id ?? null,
      reused: true,
    };
  }

  // 1. Billing account
  const { data: ba } = await supabase
    .from("billing_accounts")
    .insert({
      client_id: clientId,
      contact_id: proposal.contact_id ?? null,
      company_id: proposal.company_id ?? null,
      deal_id: proposal.deal_id ?? null,
      proposal_id: proposalId,
      billing_status: "Pending Setup",
      billing_email: null,
    } as any)
    .select("id")
    .single();
  if (!ba) return null;

  const setupFee = Number(proposal.setup_fee) || 0;
  const monthlyFee = Number(proposal.monthly_fee) || 0;
  const contractMonths = parseInt(proposal.contract_term) || 6;
  const startDate = new Date().toISOString().split("T")[0];
  const endDate = new Date(Date.now() + contractMonths * 30 * 86400000).toISOString().split("T")[0];
  const nextInvoice = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  // 2. Subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .insert({
      client_id: clientId,
      billing_account_id: ba.id,
      proposal_id: proposalId,
      subscription_name: (proposal as any).proposal_title || "Service Subscription",
      service_package_type: (proposal as any).service_package_type || "custom",
      subscription_status: setupFee > 0 ? "Pending Payment" : "Active",
      billing_frequency: "Monthly",
      monthly_amount: monthlyFee,
      setup_fee_amount: setupFee,
      ad_spend_commitment_amount: Number((proposal as any).ad_spend_commitment) || 0,
      contract_length_months: contractMonths,
      contract_start_date: startDate,
      contract_end_date: endDate,
      next_invoice_date: nextInvoice,
    } as any)
    .select("id")
    .single();

  // 3. Contract record — pending signature unless explicitly signed
  let contractRecordId: string | null = null;
  if (sub) {
    const pendingSig = opts?.pendingSignature !== false; // default true
    const { data: cr } = await supabase.from("contract_records").insert({
      client_id: clientId,
      proposal_id: proposalId,
      subscription_id: sub.id,
      contract_status: pendingSig ? "Pending Signature" : "Signed",
      contract_length_months: contractMonths,
      start_date: startDate,
      end_date: endDate,
      signed_at: pendingSig ? null : new Date().toISOString(),
      enforcement_mode: "Standard",
    } as any).select("id").single();
    contractRecordId = cr?.id ?? null;
  }

  // 4. Setup fee invoice
  let invoiceId: string | null = null;
  if (setupFee > 0) {
    const { data: inv } = await supabase
      .from("invoices")
      .insert({
        client_id: clientId,
        billing_account_id: ba.id,
        subscription_id: sub?.id ?? null,
        proposal_id: proposalId,
        invoice_number: invoiceNumber(),
        invoice_type: "Setup Fee",
        invoice_status: "Issued",
        subtotal_amount: setupFee,
        tax_amount: 0,
        total_amount: setupFee,
        amount_paid: 0,
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
        issued_at: new Date().toISOString(),
      } as any)
      .select("id")
      .single();

    if (inv) {
      invoiceId = inv.id;
      await supabase.from("invoice_line_items").insert({
        invoice_id: inv.id,
        item_name: "Setup Fee",
        item_description: "One-time onboarding and setup",
        item_type: "setup",
        quantity: 1,
        unit_price: setupFee,
        total_price: setupFee,
      } as any);
    }
  }

  // 5. Billing event + audit
  await supabase.from("billing_events").insert({
    client_id: clientId,
    related_type: "proposal",
    related_id: proposalId,
    event_type: "billing_created_from_proposal",
    event_note: `Billing account, subscription, and contract created from proposal acceptance`,
  } as any);

  await supabase.from("audit_logs").insert({
    action: "billing_created_from_proposal",
    module: "billing",
    metadata: { proposal_id: proposalId, billing_account_id: ba.id },
  });

  return { billingAccountId: ba.id, subscriptionId: sub?.id };
}
