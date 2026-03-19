import { supabase } from "@/integrations/supabase/client";

// ─── Sales Spine Automation Service ────────────────────────────────
// Handles trigger profile execution for the internal sales lifecycle.

const exec = (builder: any): Promise<any> => Promise.resolve(builder);

async function logActivity(type: string, note: string, meta?: Record<string, any>) {
  return exec(supabase.from("audit_logs").insert({
    action: type,
    module: "sales",
    metadata: { note, ...meta },
  }));
}

// ─── INTAKE: Create full sales record set ──────────────────────────

export async function executeSalesIntake(data: {
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  website?: string;
  industry?: string;
  location?: string;
  source?: string;
  assignedSalesmanId?: string;
  prospectId?: string;
}) {
  // 1. Find or create a global client context for admin sales
  // We use prospect_id linkage instead of client_id for admin sales records
  const clientId = undefined; // Admin sales records don't need client_id

  // 2. Create company
  const { data: company } = await supabase.from("crm_companies").insert({
    client_id: "00000000-0000-0000-0000-000000000000", // placeholder
    company_name: data.businessName,
    website: data.website || null,
    industry: data.industry || null,
    email: data.email,
    phone: data.phone || null,
    city: data.location || null,
    assigned_salesman_user_id: data.assignedSalesmanId || null,
  } as any).select("id").single();

  // 3. Create contact
  const { data: contact } = await supabase.from("crm_contacts").insert({
    client_id: "00000000-0000-0000-0000-000000000000",
    full_name: data.contactName,
    email: data.email,
    phone: data.phone || null,
    company_id: company?.id || null,
    lead_source: data.source || "admin_intake",
    contact_status: "lead",
  } as any).select("id").single();

  // 4. Create deal
  const { data: deal } = await supabase.from("crm_deals").insert({
    client_id: "00000000-0000-0000-0000-000000000000",
    contact_id: contact?.id || null,
    company_id: company?.id || null,
    deal_name: `${data.businessName} — New Opportunity`,
    pipeline_stage: "new_lead",
    deal_value: 0,
    status: "open",
    assigned_user: data.assignedSalesmanId || null,
    lead_source: data.source || "admin_intake",
    qualification_status: "unqualified",
  } as any).select("id").single();

  await logActivity("sales_intake_created", `Sales intake: ${data.businessName}`, {
    contact_id: contact?.id, company_id: company?.id, deal_id: deal?.id,
  });

  return { contactId: contact?.id, companyId: company?.id, dealId: deal?.id };
}

// ─── MEETING COMPLETED + QUALIFIED ─────────────────────────────────

export async function onMeetingQualified(meetingId: string, dealId: string, outcome: string) {
  const promises: Promise<any>[] = [];

  // Update deal stage
  promises.push(exec(
    supabase.from("crm_deals").update({
      pipeline_stage: "qualified",
      qualification_status: "qualified",
    } as any).eq("id", dealId)
  ));

  // Update meeting
  promises.push(exec(
    supabase.from("sales_meetings").update({
      status: "completed",
      meeting_outcome: outcome,
    } as any).eq("id", meetingId)
  ));

  promises.push(logActivity("meeting_qualified", `Meeting completed, deal qualified`, { meeting_id: meetingId, deal_id: dealId }));

  await Promise.all(promises);
}

// ─── PROPOSAL DRAFT CREATION ───────────────────────────────────────

export async function createProposalDraft(params: {
  dealId: string;
  contactId?: string;
  companyId?: string;
  prospectId?: string;
  templateId?: string;
  title: string;
  assignedSalesmanId?: string;
}) {
  const { data: proposal } = await supabase.from("proposals").insert({
    deal_id: params.dealId,
    contact_id: params.contactId || null,
    company_id: params.companyId || null,
    prospect_id: params.prospectId || null,
    template_id: params.templateId || null,
    proposal_title: params.title,
    proposal_status: "draft",
    assigned_salesman_user_id: params.assignedSalesmanId || null,
  } as any).select("id").single();

  if (proposal) {
    // Link to deal
    await exec(supabase.from("crm_deals").update({
      proposal_id_current: proposal.id,
      pipeline_stage: "proposal_drafted",
    } as any).eq("id", params.dealId));

    // Create review task
    await exec(supabase.from("crm_tasks").insert({
      client_id: "00000000-0000-0000-0000-000000000000",
      title: `Review Proposal Draft: ${params.title}`,
      description: "Review and finalize proposal before sending to prospect.",
      status: "open",
      priority: "high",
      task_category: "proposal_review",
      deal_id: params.dealId,
      proposal_id: proposal.id,
    } as any));

    await logActivity("proposal_drafted", `Proposal draft created: ${params.title}`, {
      proposal_id: proposal.id, deal_id: params.dealId,
    });
  }

  return proposal;
}

// ─── PROPOSAL SENT ─────────────────────────────────────────────────

export async function onProposalSent(proposalId: string, dealId: string, recipientEmail: string) {
  const now = new Date().toISOString();

  await Promise.all([
    exec(supabase.from("proposals").update({
      proposal_status: "sent",
      sent_at: now,
    } as any).eq("id", proposalId)),
    exec(supabase.from("crm_deals").update({
      pipeline_stage: "proposal_sent",
    } as any).eq("id", dealId)),
    exec(supabase.from("email_delivery_records").insert({
      related_type: "proposal",
      related_id: proposalId,
      deal_id: dealId,
      proposal_id: proposalId,
      recipient_email: recipientEmail,
      email_subject: "Your Proposal from NewLight Marketing",
      delivery_status: "sent",
      delivery_channel: "proposal_send",
      sent_at: now,
    } as any)),
    logActivity("proposal_sent", `Proposal sent to ${recipientEmail}`, { proposal_id: proposalId, deal_id: dealId }),
  ]);
}

// ─── DEAL CLOSED WON ───────────────────────────────────────────────

export async function onDealClosedWon(dealId: string, deal: any) {
  const promises: Promise<any>[] = [];

  promises.push(exec(
    supabase.from("crm_deals").update({
      pipeline_stage: "closed_won",
      status: "won",
      qualification_status: "closed_won",
      close_date: new Date().toISOString().split("T")[0],
    } as any).eq("id", dealId)
  ));

  // Create setup tasks bundle
  const setupTasks = [
    { title: "Send Activation Form", category: "client_handoff" },
    { title: "Confirm Branding Assets", category: "branding_setup" },
    { title: "Calendar Setup", category: "calendar_setup" },
    { title: "CRM Pipeline Setup", category: "workspace_setup" },
    { title: "Website Setup", category: "website_setup" },
    { title: "Online Background Audit", category: "audit_setup" },
    { title: "Integration Setup", category: "integration_setup" },
    { title: "Client Invite & Access Setup", category: "client_handoff" },
  ];

  for (const task of setupTasks) {
    promises.push(exec(supabase.from("crm_tasks").insert({
      client_id: "00000000-0000-0000-0000-000000000000",
      title: `${task.title} — ${deal.deal_name || "New Client"}`,
      description: `Setup task for closed deal: ${deal.deal_name}`,
      status: "open",
      priority: "high",
      task_category: task.category,
      deal_id: dealId,
    } as any)));
  }

  promises.push(logActivity("deal_closed_won", `Deal closed won: ${deal.deal_name} — $${Number(deal.deal_value || 0).toLocaleString()}`, {
    deal_id: dealId, value: deal.deal_value,
  }));

  await Promise.all(promises);
}

// ─── DEAL CLOSED LOST ──────────────────────────────────────────────

export async function onDealClosedLost(dealId: string, deal: any, reason?: string) {
  await Promise.all([
    exec(supabase.from("crm_deals").update({
      pipeline_stage: "closed_lost",
      status: "lost",
      qualification_status: "closed_lost",
      close_date: new Date().toISOString().split("T")[0],
      notes_summary: reason ? `Lost reason: ${reason}` : deal.notes_summary,
    } as any).eq("id", dealId)),
    logActivity("deal_closed_lost", `Deal lost: ${deal.deal_name}${reason ? ` — ${reason}` : ""}`, {
      deal_id: dealId, reason,
    }),
  ]);
}
