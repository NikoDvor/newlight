// ── Workspace Niche Intelligence Registry ──
// Each niche maps to an industry + archetype and carries behavior metadata
// for future pricing, demo-data seeding, and module emphasis.

import type { IndustryCategory, BusinessArchetype, ZoomTier } from "@/lib/workspaceProfileTypes";

// ── Enums for metadata ──
export type RevenueModel = "lead_gen" | "subscription" | "high_ticket" | "transactional" | "project_based" | "membership" | "commission" | "donation";
export type SalesCycle = "short" | "medium" | "long";
export type TicketSize = "low" | "medium" | "high" | "very_high";
export type ComplexityLevel = "low" | "medium" | "high" | "enterprise";
export type ComplianceLevel = "none" | "moderate" | "high";
export type PricingTier = "low" | "medium" | "high" | "premium";
export type ModulePriority = 1 | 2 | 3 | 4 | 5;

export interface DemoDataProfile {
  startingRevenueRange: [number, number];
  leadVolumeRange: [number, number];
  conversionRateRange: [number, number];
}

export interface PricingProfile {
  setupTier: PricingTier;
  monthlyTier: PricingTier;
}

export interface ModulePriorities {
  crm: ModulePriority;
  ads: ModulePriority;
  seo: ModulePriority;
  website: ModulePriority;
  automation: ModulePriority;
  aiInsights: ModulePriority;
}

export interface NicheDefinition {
  id: string;
  label: string;
  industry: IndustryCategory;
  archetype: BusinessArchetype;
  defaultZoomTier: ZoomTier;
  revenueModel: RevenueModel;
  salesCycle: SalesCycle;
  ticketSize: TicketSize;
  complexityLevel: ComplexityLevel;
  complianceLevel: ComplianceLevel;
  demoDataProfile: DemoDataProfile;
  pricingProfile: PricingProfile;
  modulePriority: ModulePriorities;
}

// ── Helper to reduce boilerplate ──
function niche(
  id: string,
  label: string,
  industry: IndustryCategory,
  archetype: BusinessArchetype,
  defaultZoomTier: ZoomTier,
  revenueModel: RevenueModel,
  salesCycle: SalesCycle,
  ticketSize: TicketSize,
  complexityLevel: ComplexityLevel,
  complianceLevel: ComplianceLevel,
  demo: DemoDataProfile,
  pricing: PricingProfile,
  modules: ModulePriorities
): NicheDefinition {
  return { id, label, industry, archetype, defaultZoomTier, revenueModel, salesCycle, ticketSize, complexityLevel, complianceLevel, demoDataProfile: demo, pricingProfile: pricing, modulePriority: modules };
}

// ── Full Niche Registry ──
export const NICHE_REGISTRY: NicheDefinition[] = [

  // ═══════════════════════════════════════
  // HEALTHCARE & WELLNESS
  // ═══════════════════════════════════════
  niche("med_spa", "Med Spa", "healthcare_wellness", "appointments", "z2", "high_ticket", "long", "high", "high", "high",
    { startingRevenueRange: [40000, 120000], leadVolumeRange: [80, 300], conversionRateRange: [15, 35] },
    { setupTier: "premium", monthlyTier: "premium" },
    { crm: 5, ads: 5, seo: 4, website: 4, automation: 5, aiInsights: 4 }),

  niche("dentist", "Dentist", "healthcare_wellness", "appointments", "z2", "lead_gen", "short", "medium", "medium", "high",
    { startingRevenueRange: [50000, 200000], leadVolumeRange: [60, 250], conversionRateRange: [20, 45] },
    { setupTier: "high", monthlyTier: "high" },
    { crm: 4, ads: 4, seo: 5, website: 4, automation: 4, aiInsights: 3 }),

  niche("chiropractor", "Chiropractor", "healthcare_wellness", "appointments", "z1", "lead_gen", "short", "medium", "medium", "moderate",
    { startingRevenueRange: [20000, 80000], leadVolumeRange: [40, 150], conversionRateRange: [25, 50] },
    { setupTier: "medium", monthlyTier: "medium" },
    { crm: 4, ads: 4, seo: 4, website: 3, automation: 3, aiInsights: 2 }),

  niche("physical_therapy", "Physical Therapy", "healthcare_wellness", "appointments", "z2", "lead_gen", "medium", "medium", "medium", "high",
    { startingRevenueRange: [30000, 120000], leadVolumeRange: [30, 120], conversionRateRange: [30, 55] },
    { setupTier: "high", monthlyTier: "medium" },
    { crm: 4, ads: 3, seo: 4, website: 3, automation: 4, aiInsights: 3 }),

  niche("dermatology", "Dermatology", "healthcare_wellness", "appointments", "z2", "high_ticket", "medium", "high", "high", "high",
    { startingRevenueRange: [60000, 250000], leadVolumeRange: [50, 200], conversionRateRange: [20, 40] },
    { setupTier: "premium", monthlyTier: "high" },
    { crm: 5, ads: 4, seo: 4, website: 4, automation: 4, aiInsights: 4 }),

  niche("plastic_surgery", "Plastic Surgery", "healthcare_wellness", "appointments", "z2", "high_ticket", "long", "very_high", "high", "high",
    { startingRevenueRange: [100000, 500000], leadVolumeRange: [30, 100], conversionRateRange: [10, 25] },
    { setupTier: "premium", monthlyTier: "premium" },
    { crm: 5, ads: 5, seo: 4, website: 5, automation: 5, aiInsights: 5 }),

  niche("mental_health", "Mental Health Clinic", "healthcare_wellness", "appointments", "z2", "lead_gen", "medium", "medium", "medium", "high",
    { startingRevenueRange: [20000, 100000], leadVolumeRange: [20, 80], conversionRateRange: [30, 60] },
    { setupTier: "medium", monthlyTier: "medium" },
    { crm: 4, ads: 3, seo: 4, website: 3, automation: 4, aiInsights: 3 }),

  niche("wellness_center", "Wellness Center", "healthcare_wellness", "appointments", "z2", "membership", "short", "medium", "medium", "moderate",
    { startingRevenueRange: [15000, 80000], leadVolumeRange: [40, 180], conversionRateRange: [20, 45] },
    { setupTier: "medium", monthlyTier: "medium" },
    { crm: 4, ads: 3, seo: 3, website: 4, automation: 3, aiInsights: 2 }),

  niche("fitness_gym", "Gym / Fitness Studio", "healthcare_wellness", "appointments", "z2", "membership", "short", "low", "low", "none",
    { startingRevenueRange: [10000, 60000], leadVolumeRange: [60, 300], conversionRateRange: [15, 35] },
    { setupTier: "medium", monthlyTier: "medium" },
    { crm: 3, ads: 4, seo: 3, website: 3, automation: 4, aiInsights: 2 }),

  // ═══════════════════════════════════════
  // FINANCIAL & LEGAL
  // ═══════════════════════════════════════
  niche("financial_advisor", "Financial Advisor", "financial_legal", "high_ticket_recurring", "z1", "high_ticket", "long", "very_high", "high", "high",
    { startingRevenueRange: [50000, 300000], leadVolumeRange: [10, 50], conversionRateRange: [10, 25] },
    { setupTier: "premium", monthlyTier: "premium" },
    { crm: 5, ads: 3, seo: 3, website: 4, automation: 5, aiInsights: 5 }),

  niche("wealth_management", "Wealth Management Firm", "financial_legal", "high_ticket_recurring", "z3", "high_ticket", "long", "very_high", "enterprise", "high",
    { startingRevenueRange: [100000, 1000000], leadVolumeRange: [5, 30], conversionRateRange: [8, 20] },
    { setupTier: "premium", monthlyTier: "premium" },
    { crm: 5, ads: 2, seo: 3, website: 4, automation: 5, aiInsights: 5 }),

  niche("cpa_accounting", "CPA / Accounting Firm", "financial_legal", "retainers", "z2", "subscription", "medium", "medium", "medium", "high",
    { startingRevenueRange: [30000, 150000], leadVolumeRange: [20, 80], conversionRateRange: [20, 40] },
    { setupTier: "high", monthlyTier: "high" },
    { crm: 5, ads: 3, seo: 4, website: 3, automation: 4, aiInsights: 4 }),

  niche("tax_firm", "Tax Firm", "financial_legal", "retainers", "z2", "project_based", "medium", "medium", "medium", "high",
    { startingRevenueRange: [20000, 100000], leadVolumeRange: [30, 120], conversionRateRange: [25, 50] },
    { setupTier: "medium", monthlyTier: "medium" },
    { crm: 4, ads: 3, seo: 4, website: 3, automation: 3, aiInsights: 3 }),

  niche("law_firm_general", "Law Firm (General)", "financial_legal", "retainers", "z2", "high_ticket", "long", "high", "high", "high",
    { startingRevenueRange: [50000, 300000], leadVolumeRange: [15, 60], conversionRateRange: [15, 30] },
    { setupTier: "premium", monthlyTier: "high" },
    { crm: 5, ads: 3, seo: 4, website: 4, automation: 4, aiInsights: 4 }),

  niche("personal_injury_law", "Personal Injury Law Firm", "financial_legal", "high_ticket_recurring", "z2", "lead_gen", "long", "very_high", "high", "high",
    { startingRevenueRange: [100000, 500000], leadVolumeRange: [20, 80], conversionRateRange: [5, 15] },
    { setupTier: "premium", monthlyTier: "premium" },
    { crm: 5, ads: 5, seo: 5, website: 5, automation: 5, aiInsights: 5 }),

  niche("estate_planning", "Estate Planning Firm", "financial_legal", "high_ticket_recurring", "z1", "high_ticket", "long", "high", "high", "high",
    { startingRevenueRange: [40000, 200000], leadVolumeRange: [10, 40], conversionRateRange: [15, 30] },
    { setupTier: "high", monthlyTier: "high" },
    { crm: 5, ads: 3, seo: 4, website: 4, automation: 4, aiInsights: 4 }),

  niche("insurance_agency", "Insurance Agency", "financial_legal", "retainers", "z2", "commission", "medium", "medium", "medium", "high",
    { startingRevenueRange: [30000, 150000], leadVolumeRange: [40, 200], conversionRateRange: [10, 25] },
    { setupTier: "high", monthlyTier: "high" },
    { crm: 5, ads: 4, seo: 3, website: 3, automation: 5, aiInsights: 4 }),

  // ═══════════════════════════════════════
  // AGENCIES & PROFESSIONAL SERVICES
  // ═══════════════════════════════════════
  niche("marketing_agency", "Marketing Agency", "agencies_professional", "retainers", "z2", "subscription", "medium", "high", "high", "none",
    { startingRevenueRange: [30000, 200000], leadVolumeRange: [20, 80], conversionRateRange: [15, 30] },
    { setupTier: "high", monthlyTier: "high" },
    { crm: 5, ads: 3, seo: 3, website: 4, automation: 5, aiInsights: 5 }),

  niche("consulting_firm", "Consulting Firm", "agencies_professional", "high_ticket_recurring", "z2", "high_ticket", "long", "very_high", "high", "none",
    { startingRevenueRange: [50000, 500000], leadVolumeRange: [5, 30], conversionRateRange: [15, 35] },
    { setupTier: "premium", monthlyTier: "high" },
    { crm: 5, ads: 2, seo: 3, website: 4, automation: 4, aiInsights: 5 }),

  niche("creative_agency", "Creative Agency", "agencies_professional", "projects", "z2", "project_based", "medium", "high", "medium", "none",
    { startingRevenueRange: [20000, 150000], leadVolumeRange: [10, 50], conversionRateRange: [20, 40] },
    { setupTier: "high", monthlyTier: "medium" },
    { crm: 4, ads: 2, seo: 3, website: 5, automation: 3, aiInsights: 3 }),

  niche("web_design_agency", "Web Design Agency", "agencies_professional", "projects", "z2", "project_based", "medium", "medium", "medium", "none",
    { startingRevenueRange: [15000, 100000], leadVolumeRange: [15, 60], conversionRateRange: [20, 40] },
    { setupTier: "medium", monthlyTier: "medium" },
    { crm: 4, ads: 3, seo: 4, website: 5, automation: 3, aiInsights: 3 }),

  niche("business_coaching", "Business Coaching", "agencies_professional", "high_ticket_recurring", "z1", "high_ticket", "medium", "high", "low", "none",
    { startingRevenueRange: [10000, 80000], leadVolumeRange: [20, 100], conversionRateRange: [10, 25] },
    { setupTier: "medium", monthlyTier: "medium" },
    { crm: 5, ads: 4, seo: 3, website: 4, automation: 4, aiInsights: 4 }),

  niche("staffing_agency", "Staffing / Recruiting Agency", "agencies_professional", "retainers", "z3", "commission", "medium", "high", "high", "moderate",
    { startingRevenueRange: [40000, 300000], leadVolumeRange: [30, 150], conversionRateRange: [10, 25] },
    { setupTier: "high", monthlyTier: "high" },
    { crm: 5, ads: 3, seo: 3, website: 3, automation: 5, aiInsights: 4 }),

  niche("it_services", "IT Services / MSP", "agencies_professional", "retainers", "z2", "subscription", "medium", "high", "high", "moderate",
    { startingRevenueRange: [30000, 200000], leadVolumeRange: [15, 60], conversionRateRange: [15, 30] },
    { setupTier: "high", monthlyTier: "high" },
    { crm: 5, ads: 2, seo: 3, website: 3, automation: 5, aiInsights: 4 }),

  // ═══════════════════════════════════════
  // HOME SERVICES & CONTRACTORS
  // ═══════════════════════════════════════
  niche("hvac", "HVAC", "home_services", "appointments", "z2", "lead_gen", "short", "medium", "medium", "moderate",
    { startingRevenueRange: [30000, 150000], leadVolumeRange: [60, 300], conversionRateRange: [20, 45] },
    { setupTier: "medium", monthlyTier: "medium" },
    { crm: 4, ads: 5, seo: 5, website: 4, automation: 4, aiInsights: 3 }),

  niche("plumbing", "Plumbing", "home_services", "appointments", "z2", "lead_gen", "short", "medium", "medium", "moderate",
    { startingRevenueRange: [20000, 120000], leadVolumeRange: [50, 250], conversionRateRange: [25, 50] },
    { setupTier: "medium", monthlyTier: "medium" },
    { crm: 4, ads: 5, seo: 5, website: 3, automation: 4, aiInsights: 2 }),

  niche("roofing", "Roofing", "home_services", "projects", "z2", "lead_gen", "medium", "high", "medium", "moderate",
    { startingRevenueRange: [40000, 250000], leadVolumeRange: [30, 120], conversionRateRange: [15, 35] },
    { setupTier: "high", monthlyTier: "medium" },
    { crm: 5, ads: 5, seo: 5, website: 4, automation: 4, aiInsights: 3 }),

  niche("landscaping", "Landscaping", "home_services", "appointments", "z2", "lead_gen", "short", "medium", "low", "none",
    { startingRevenueRange: [15000, 80000], leadVolumeRange: [40, 200], conversionRateRange: [25, 50] },
    { setupTier: "low", monthlyTier: "medium" },
    { crm: 3, ads: 4, seo: 4, website: 3, automation: 3, aiInsights: 2 }),

  niche("cleaning_company", "Cleaning Company", "home_services", "appointments", "z2", "lead_gen", "short", "low", "low", "none",
    { startingRevenueRange: [10000, 60000], leadVolumeRange: [50, 250], conversionRateRange: [20, 45] },
    { setupTier: "low", monthlyTier: "low" },
    { crm: 3, ads: 4, seo: 4, website: 3, automation: 4, aiInsights: 2 }),

  niche("electrical_contractor", "Electrical Contractor", "home_services", "appointments", "z2", "lead_gen", "short", "medium", "medium", "moderate",
    { startingRevenueRange: [25000, 120000], leadVolumeRange: [40, 180], conversionRateRange: [25, 50] },
    { setupTier: "medium", monthlyTier: "medium" },
    { crm: 4, ads: 4, seo: 5, website: 3, automation: 4, aiInsights: 2 }),

  niche("general_contractor", "General Contractor", "home_services", "projects", "z2", "project_based", "long", "high", "high", "moderate",
    { startingRevenueRange: [50000, 300000], leadVolumeRange: [10, 50], conversionRateRange: [20, 40] },
    { setupTier: "high", monthlyTier: "high" },
    { crm: 5, ads: 3, seo: 4, website: 4, automation: 4, aiInsights: 3 }),

  // ═══════════════════════════════════════
  // REAL ESTATE
  // ═══════════════════════════════════════
  niche("real_estate_agent", "Real Estate Agent", "real_estate", "high_ticket_recurring", "z1", "commission", "long", "very_high", "medium", "moderate",
    { startingRevenueRange: [30000, 200000], leadVolumeRange: [20, 100], conversionRateRange: [5, 15] },
    { setupTier: "medium", monthlyTier: "medium" },
    { crm: 5, ads: 4, seo: 4, website: 4, automation: 5, aiInsights: 4 }),

  niche("real_estate_team", "Real Estate Team", "real_estate", "high_ticket_recurring", "z2", "commission", "long", "very_high", "high", "moderate",
    { startingRevenueRange: [80000, 500000], leadVolumeRange: [50, 300], conversionRateRange: [5, 15] },
    { setupTier: "high", monthlyTier: "high" },
    { crm: 5, ads: 5, seo: 4, website: 5, automation: 5, aiInsights: 5 }),

  niche("brokerage", "Brokerage", "real_estate", "enterprise_accounts", "z3", "commission", "long", "very_high", "enterprise", "high",
    { startingRevenueRange: [200000, 2000000], leadVolumeRange: [100, 800], conversionRateRange: [3, 12] },
    { setupTier: "premium", monthlyTier: "premium" },
    { crm: 5, ads: 4, seo: 4, website: 5, automation: 5, aiInsights: 5 }),

  niche("property_management", "Property Management", "real_estate", "retainers", "z2", "subscription", "medium", "medium", "medium", "moderate",
    { startingRevenueRange: [20000, 100000], leadVolumeRange: [15, 60], conversionRateRange: [20, 40] },
    { setupTier: "medium", monthlyTier: "medium" },
    { crm: 4, ads: 2, seo: 3, website: 3, automation: 5, aiInsights: 3 }),

  niche("mortgage_broker", "Mortgage Broker", "real_estate", "high_ticket_recurring", "z1", "commission", "medium", "high", "medium", "high",
    { startingRevenueRange: [30000, 200000], leadVolumeRange: [20, 80], conversionRateRange: [10, 25] },
    { setupTier: "high", monthlyTier: "medium" },
    { crm: 5, ads: 4, seo: 3, website: 3, automation: 5, aiInsights: 4 }),

  // ═══════════════════════════════════════
  // ECOMMERCE & RETAIL
  // ═══════════════════════════════════════
  niche("shopify_brand", "Shopify Brand", "ecommerce_retail", "ecommerce", "z1", "transactional", "short", "low", "low", "none",
    { startingRevenueRange: [5000, 50000], leadVolumeRange: [200, 2000], conversionRateRange: [1, 4] },
    { setupTier: "low", monthlyTier: "medium" },
    { crm: 2, ads: 5, seo: 5, website: 3, automation: 4, aiInsights: 3 }),

  niche("amazon_seller", "Amazon Seller", "ecommerce_retail", "ecommerce", "z1", "transactional", "short", "low", "medium", "moderate",
    { startingRevenueRange: [10000, 100000], leadVolumeRange: [300, 5000], conversionRateRange: [5, 15] },
    { setupTier: "medium", monthlyTier: "medium" },
    { crm: 2, ads: 5, seo: 3, website: 2, automation: 4, aiInsights: 4 }),

  niche("local_retail", "Local Retail Store", "ecommerce_retail", "transactions", "z1", "transactional", "short", "low", "low", "none",
    { startingRevenueRange: [10000, 60000], leadVolumeRange: [100, 500], conversionRateRange: [10, 30] },
    { setupTier: "low", monthlyTier: "low" },
    { crm: 3, ads: 4, seo: 4, website: 4, automation: 3, aiInsights: 2 }),

  niche("dtc_brand", "DTC Brand", "ecommerce_retail", "ecommerce", "z2", "transactional", "short", "medium", "medium", "none",
    { startingRevenueRange: [20000, 200000], leadVolumeRange: [500, 5000], conversionRateRange: [2, 5] },
    { setupTier: "high", monthlyTier: "high" },
    { crm: 3, ads: 5, seo: 4, website: 5, automation: 5, aiInsights: 4 }),

  // ═══════════════════════════════════════
  // HOSPITALITY & LOCAL
  // ═══════════════════════════════════════
  niche("barbershop", "Barbershop", "hospitality_local", "appointments", "z1", "transactional", "short", "low", "low", "none",
    { startingRevenueRange: [5000, 30000], leadVolumeRange: [50, 200], conversionRateRange: [30, 60] },
    { setupTier: "low", monthlyTier: "low" },
    { crm: 2, ads: 3, seo: 4, website: 3, automation: 3, aiInsights: 1 }),

  niche("hair_salon", "Hair Salon", "hospitality_local", "appointments", "z2", "transactional", "short", "low", "low", "none",
    { startingRevenueRange: [10000, 60000], leadVolumeRange: [60, 250], conversionRateRange: [25, 55] },
    { setupTier: "low", monthlyTier: "low" },
    { crm: 3, ads: 3, seo: 4, website: 3, automation: 3, aiInsights: 2 }),

  niche("nail_salon", "Nail Salon", "hospitality_local", "appointments", "z1", "transactional", "short", "low", "low", "none",
    { startingRevenueRange: [5000, 30000], leadVolumeRange: [40, 180], conversionRateRange: [30, 60] },
    { setupTier: "low", monthlyTier: "low" },
    { crm: 2, ads: 3, seo: 3, website: 3, automation: 3, aiInsights: 1 }),

  niche("yoga_studio", "Yoga Studio", "hospitality_local", "appointments", "z1", "membership", "short", "low", "low", "none",
    { startingRevenueRange: [5000, 30000], leadVolumeRange: [30, 120], conversionRateRange: [20, 45] },
    { setupTier: "low", monthlyTier: "low" },
    { crm: 3, ads: 3, seo: 3, website: 3, automation: 3, aiInsights: 2 }),

  niche("restaurant", "Restaurant", "hospitality_local", "transactions", "z2", "transactional", "short", "low", "medium", "moderate",
    { startingRevenueRange: [20000, 150000], leadVolumeRange: [100, 600], conversionRateRange: [20, 50] },
    { setupTier: "medium", monthlyTier: "medium" },
    { crm: 2, ads: 4, seo: 4, website: 4, automation: 3, aiInsights: 2 }),

  niche("hotel", "Hotel / Hospitality", "hospitality_local", "transactions", "z3", "transactional", "short", "medium", "high", "moderate",
    { startingRevenueRange: [50000, 500000], leadVolumeRange: [200, 2000], conversionRateRange: [5, 15] },
    { setupTier: "high", monthlyTier: "high" },
    { crm: 3, ads: 4, seo: 4, website: 5, automation: 4, aiInsights: 3 }),

  niche("auto_shop", "Auto Repair / Detail Shop", "hospitality_local", "appointments", "z1", "lead_gen", "short", "medium", "low", "none",
    { startingRevenueRange: [15000, 80000], leadVolumeRange: [40, 200], conversionRateRange: [25, 50] },
    { setupTier: "low", monthlyTier: "low" },
    { crm: 3, ads: 4, seo: 5, website: 3, automation: 3, aiInsights: 2 }),

  // ═══════════════════════════════════════
  // SAAS, TECH & DIGITAL
  // ═══════════════════════════════════════
  niche("saas_startup", "SaaS Startup", "saas_tech", "subscription_saas", "z2", "subscription", "medium", "medium", "high", "none",
    { startingRevenueRange: [5000, 100000], leadVolumeRange: [100, 1000], conversionRateRange: [2, 8] },
    { setupTier: "high", monthlyTier: "high" },
    { crm: 4, ads: 4, seo: 4, website: 5, automation: 5, aiInsights: 5 }),

  niche("ai_tool_company", "AI Tool Company", "saas_tech", "subscription_saas", "z2", "subscription", "medium", "medium", "high", "none",
    { startingRevenueRange: [5000, 200000], leadVolumeRange: [200, 3000], conversionRateRange: [1, 5] },
    { setupTier: "high", monthlyTier: "high" },
    { crm: 4, ads: 4, seo: 5, website: 5, automation: 5, aiInsights: 5 }),

  niche("platform_business", "Platform Business", "saas_tech", "subscription_saas", "z3", "subscription", "long", "high", "enterprise", "moderate",
    { startingRevenueRange: [20000, 500000], leadVolumeRange: [50, 500], conversionRateRange: [3, 10] },
    { setupTier: "premium", monthlyTier: "premium" },
    { crm: 5, ads: 3, seo: 4, website: 5, automation: 5, aiInsights: 5 }),

  // ═══════════════════════════════════════
  // LOGISTICS, INDUSTRIAL & MANUFACTURING
  // ═══════════════════════════════════════
  niche("logistics_company", "Logistics / Freight", "logistics_industrial", "enterprise_accounts", "z3", "project_based", "long", "high", "enterprise", "moderate",
    { startingRevenueRange: [100000, 1000000], leadVolumeRange: [10, 50], conversionRateRange: [10, 25] },
    { setupTier: "premium", monthlyTier: "premium" },
    { crm: 5, ads: 2, seo: 2, website: 3, automation: 5, aiInsights: 4 }),

  niche("manufacturer", "Manufacturing Company", "logistics_industrial", "enterprise_accounts", "z4", "project_based", "long", "very_high", "enterprise", "high",
    { startingRevenueRange: [200000, 5000000], leadVolumeRange: [5, 30], conversionRateRange: [15, 35] },
    { setupTier: "premium", monthlyTier: "premium" },
    { crm: 5, ads: 1, seo: 2, website: 3, automation: 5, aiInsights: 5 }),

  niche("distributor", "Wholesale / Distribution", "logistics_industrial", "enterprise_accounts", "z3", "transactional", "medium", "high", "high", "moderate",
    { startingRevenueRange: [100000, 2000000], leadVolumeRange: [10, 60], conversionRateRange: [15, 30] },
    { setupTier: "high", monthlyTier: "high" },
    { crm: 5, ads: 2, seo: 2, website: 3, automation: 5, aiInsights: 4 }),

  // ═══════════════════════════════════════
  // EDUCATION, COACHING & TRAINING
  // ═══════════════════════════════════════
  niche("online_course", "Online Course Creator", "education_coaching", "subscription_saas", "z1", "subscription", "short", "low", "low", "none",
    { startingRevenueRange: [3000, 50000], leadVolumeRange: [100, 1000], conversionRateRange: [2, 8] },
    { setupTier: "low", monthlyTier: "low" },
    { crm: 3, ads: 5, seo: 4, website: 5, automation: 5, aiInsights: 3 }),

  niche("coaching_program", "Coaching Program", "education_coaching", "high_ticket_recurring", "z1", "high_ticket", "medium", "high", "low", "none",
    { startingRevenueRange: [10000, 100000], leadVolumeRange: [30, 150], conversionRateRange: [5, 15] },
    { setupTier: "medium", monthlyTier: "medium" },
    { crm: 5, ads: 4, seo: 3, website: 4, automation: 5, aiInsights: 4 }),

  niche("tutoring", "Tutoring / Test Prep", "education_coaching", "appointments", "z1", "transactional", "short", "low", "low", "none",
    { startingRevenueRange: [5000, 30000], leadVolumeRange: [20, 100], conversionRateRange: [25, 50] },
    { setupTier: "low", monthlyTier: "low" },
    { crm: 3, ads: 3, seo: 4, website: 3, automation: 3, aiInsights: 2 }),

  niche("training_academy", "Training Academy", "education_coaching", "retainers", "z2", "membership", "medium", "medium", "medium", "moderate",
    { startingRevenueRange: [20000, 120000], leadVolumeRange: [30, 200], conversionRateRange: [10, 25] },
    { setupTier: "medium", monthlyTier: "medium" },
    { crm: 4, ads: 3, seo: 3, website: 4, automation: 4, aiInsights: 3 }),

  // ═══════════════════════════════════════
  // NONPROFIT & COMMUNITY
  // ═══════════════════════════════════════
  niche("nonprofit", "Nonprofit Organization", "nonprofit_community", "retainers", "z2", "donation", "medium", "low", "medium", "moderate",
    { startingRevenueRange: [5000, 50000], leadVolumeRange: [30, 200], conversionRateRange: [5, 15] },
    { setupTier: "low", monthlyTier: "low" },
    { crm: 4, ads: 3, seo: 3, website: 4, automation: 4, aiInsights: 2 }),

  niche("religious_org", "Religious Organization", "nonprofit_community", "retainers", "z2", "donation", "short", "low", "low", "none",
    { startingRevenueRange: [3000, 30000], leadVolumeRange: [20, 100], conversionRateRange: [10, 30] },
    { setupTier: "low", monthlyTier: "low" },
    { crm: 3, ads: 2, seo: 3, website: 4, automation: 3, aiInsights: 1 }),

  niche("community_group", "Community Group / Association", "nonprofit_community", "retainers", "z2", "membership", "short", "low", "low", "none",
    { startingRevenueRange: [2000, 20000], leadVolumeRange: [20, 100], conversionRateRange: [15, 35] },
    { setupTier: "low", monthlyTier: "low" },
    { crm: 3, ads: 2, seo: 2, website: 3, automation: 3, aiInsights: 1 }),
];

// ── Lookup helpers ──

/** Get all niches for a given industry */
export function getNichesByIndustry(industry: IndustryCategory): NicheDefinition[] {
  return NICHE_REGISTRY.filter((n) => n.industry === industry);
}

/** Find a single niche by id */
export function getNicheById(id: string): NicheDefinition | undefined {
  return NICHE_REGISTRY.find((n) => n.id === id);
}

/** Get all unique industry values that have niches */
export function getIndustriesWithNiches(): IndustryCategory[] {
  return [...new Set(NICHE_REGISTRY.map((n) => n.industry))];
}
