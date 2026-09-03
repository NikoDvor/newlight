import { computeQuote } from "@/lib/workspaceQuoteEngine";
import type { WorkspaceProfile } from "@/lib/workspaceProfileTypes";

function makeProfile(industry: WorkspaceProfile["industry"], archetype: WorkspaceProfile["archetype"]): WorkspaceProfile {
  return {
    industry,
    niche: null,
    archetype,
    zoomTier: "z2",
    legacyProfileType: "consultative_sales",
    legacyIndustryValue: industry,
    metadata: {
      revenueModel: "recurring",
      salesCycle: "medium",
      ticketSize: "high",
      complexityLevel: "medium",
      complianceLevel: "high",
    },
  };
}

const financial = makeProfile("financial_legal", "retainers");
const homeServices = makeProfile("home_services", "appointments");

const cases = [
  { name: "Financial, App Store, no custom", profile: financial, custom: null },
  { name: "Financial, App Store, custom $15,000", profile: financial, custom: 15000 },
  { name: "Non-financial (home services), App Store, custom $5,000", profile: homeServices, custom: 5000 },
];

for (const c of cases) {
  const result = computeQuote({
    workspaceProfile: c.profile,
    selectedModules: [],
    hasPurchasedPlatformSetup: false,
    includeAppStoreLaunchUpgrade: true,
    appStoreCustomAmount: c.custom,
  });
  console.log(`\n${c.name}:`);
  console.log(JSON.stringify({
    platformSetup: result.platformSetup,
    appStoreLaunchFee: result.appStoreLaunchFee,
    totalUpfront: result.totalUpfront,
    lineItems: result.lineItems,
  }, null, 2));
}
