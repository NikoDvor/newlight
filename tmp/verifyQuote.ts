import { computeQuote } from "@/lib/workspaceQuoteEngine";
import type { WorkspaceProfile } from "@/lib/workspaceProfileTypes";

const profile: WorkspaceProfile = {
  industry: "financial_legal",
  niche: null,
  archetype: "retainers",
  zoomTier: "z2",
  legacyProfileType: "consultative_sales",
  legacyIndustryValue: "financial_legal",
  metadata: {
    revenueModel: "recurring",
    salesCycle: "medium",
    ticketSize: "high",
    complexityLevel: "medium",
    complianceLevel: "high",
  },
};

const noApp = computeQuote({
  workspaceProfile: profile,
  selectedModules: [],
  hasPurchasedPlatformSetup: false,
  includeAppStoreLaunchUpgrade: false,
});

const withApp = computeQuote({
  workspaceProfile: profile,
  selectedModules: [],
  hasPurchasedPlatformSetup: false,
  includeAppStoreLaunchUpgrade: true,
});

console.log("No App Store:", JSON.stringify({ totalUpfront: noApp.totalUpfront, platformSetup: noApp.platformSetup, appStoreLaunchFee: noApp.appStoreLaunchFee, lineItems: noApp.lineItems }, null, 2));
console.log("With App Store:", JSON.stringify({ totalUpfront: withApp.totalUpfront, platformSetup: withApp.platformSetup, appStoreLaunchFee: withApp.appStoreLaunchFee, lineItems: withApp.lineItems }, null, 2));
