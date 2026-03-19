import { supabase } from "@/integrations/supabase/client";

// ─── Proposal Auto-Generation Engine ───────────────────────────────

const DEFAULT_TEMPLATES: Record<string, { title: string; deliverables: string[]; setupFee: number; monthlyFee: number; term: string }> = {
  lead_generation: {
    title: "Lead Generation & Appointments Package",
    deliverables: ["Google Ads Management", "Landing Page Optimization", "CRM Pipeline Setup", "Lead Tracking Dashboard", "Bi-weekly Performance Reports"],
    setupFee: 997, monthlyFee: 1997, term: "6 months",
  },
  ecommerce_growth: {
    title: "Online Sales Growth Package",
    deliverables: ["eCommerce SEO Audit & Fix", "Google Shopping Ads", "Social Media Ads (Meta)", "Conversion Rate Optimization", "Monthly Revenue Reports"],
    setupFee: 1497, monthlyFee: 2497, term: "6 months",
  },
  local_visibility: {
    title: "Local Visibility Package",
    deliverables: ["Google Business Profile Optimization", "Local SEO (Citations + On-Page)", "Review Generation System", "Social Media Posting", "Monthly Visibility Report"],
    setupFee: 497, monthlyFee: 1497, term: "6 months",
  },
  custom: {
    title: "Custom Growth Package",
    deliverables: ["Tailored to your business needs"],
    setupFee: 0, monthlyFee: 0, term: "6 months",
  },
};

function generateShareToken(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
}

export async function generateProposalFromBooking(params: {
  contactId?: string;
  companyId?: string;
  dealId?: string;
  prospectId?: string;
  assignedSalesUserId?: string;
  serviceType?: string;
  businessName?: string;
}) {
  // Find the best template
  const templateKey = params.serviceType && DEFAULT_TEMPLATES[params.serviceType] ? params.serviceType : "custom";
  const template = DEFAULT_TEMPLATES[templateKey];

  // Try to load a DB template if available
  const { data: dbTemplate } = await supabase
    .from("proposal_templates")
    .select("*")
    .eq("is_active", true)
    .eq("service_package", templateKey)
    .limit(1)
    .single();

  const setupFee = dbTemplate?.default_setup_fee ?? template.setupFee;
  const monthlyFee = dbTemplate?.default_monthly_fee ?? template.monthlyFee;
  const contractTerm = dbTemplate?.default_contract_term ?? template.term;
  const proposalTitle = `${params.businessName || "New Client"} — ${template.title}`;
  const shareToken = generateShareToken();

  // Create the proposal
  const { data: proposal, error } = await supabase.from("proposals").insert({
    proposal_title: proposalTitle,
    proposal_type: "service_proposal",
    proposal_status: "generated",
    contact_id: params.contactId || null,
    company_id: params.companyId || null,
    deal_id: params.dealId || null,
    prospect_id: params.prospectId || null,
    assigned_salesman_user_id: params.assignedSalesUserId || null,
    template_id: dbTemplate?.id || null,
    setup_fee: setupFee,
    monthly_fee: monthlyFee,
    contract_term: contractTerm,
    share_token: shareToken,
    service_package_type: templateKey,
    pricing_model: "monthly_retainer",
    expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    version_number: 1,
  } as any).select("id").single();

  if (error || !proposal) return null;

  // Create line items from template deliverables
  const deliverables = dbTemplate?.template_config
    ? (dbTemplate.template_config as any)?.deliverables || template.deliverables
    : template.deliverables;

  if (deliverables.length > 0) {
    await supabase.from("proposal_line_items").insert(
      deliverables.map((d: string, i: number) => ({
        proposal_id: proposal.id,
        item_name: d,
        item_type: "service",
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        sort_order: i,
      }))
    );
  }

  // Create default sections
  const templateConfig = dbTemplate?.template_config as any;
  const defaultSections = [
    { key: "overview", title: "Proposal Overview", content: `We're excited to present a tailored growth plan for ${params.businessName || "your business"}. This proposal outlines the services, deliverables, and investment to help you achieve your growth goals.`, order: 0 },
    { key: "deliverables", title: "What's Included", content: deliverables.map((d: string) => `• ${d}`).join("\n"), order: 1 },
    { key: "timeline", title: "Timeline", content: templateConfig?.timeline || "Full launch within 7-14 business days of acceptance.", order: 2 },
    { key: "guarantee", title: "Our Guarantee", content: templateConfig?.guarantee || "We're committed to delivering measurable results within the agreed timeline.", order: 3 },
    { key: "next_steps", title: "Next Steps", content: "1. Accept this proposal\n2. Complete the onboarding form\n3. Kickoff call with your dedicated team\n4. Launch!", order: 4 },
  ];

  await supabase.from("proposal_sections").insert(
    defaultSections.map(s => ({
      proposal_id: proposal.id,
      section_key: s.key,
      section_title: s.title,
      content: s.content,
      section_order: s.order,
    }))
  );

  // Link to deal if exists
  if (params.dealId) {
    await supabase.from("crm_deals").update({
      proposal_id_current: proposal.id,
      pipeline_stage: "proposal_drafted",
    } as any).eq("id", params.dealId);
  }

  // Log
  await supabase.from("audit_logs").insert({
    action: "proposal_auto_generated",
    module: "sales",
    metadata: { proposal_id: proposal.id, deal_id: params.dealId, template: templateKey },
  });

  return { proposalId: proposal.id, shareToken };
}

// ─── Post-Acceptance Automation ────────────────────────────────────

export async function onProposalAccepted(proposalId: string) {
  const { data: proposal } = await supabase.from("proposals").select("*").eq("id", proposalId).single();
  if (!proposal) return;

  // Update deal to closed_won
  if (proposal.deal_id) {
    await supabase.from("crm_deals").update({
      pipeline_stage: "closed_won",
      status: "won",
      close_date: new Date().toISOString().split("T")[0],
    } as any).eq("id", proposal.deal_id);
  }

  // Create audit trail
  await supabase.from("audit_logs").insert({
    action: "proposal_accepted_automation",
    module: "sales",
    metadata: { proposal_id: proposalId, deal_id: proposal.deal_id },
  });
}
