// Shared BDR outcome definitions used by the Dialer and Street Walk pages.
// Each outcome is its own distinct value. objection === null skips the 50-hit unlock tracker.
export const OUTCOMES: { label: string; objection: string | null }[] = [
  { label: "Won", objection: null },
  { label: "Lost", objection: null },
  { label: "Said They Would Reach Out", objection: "We Will Reach Out" },
  { label: "Didn't Answer", objection: null },
  { label: "Gatekeeper", objection: "Gatekeeper" },
  { label: "Not Interested", objection: "Not Interested" },
  { label: "Don't See the Value", objection: "Don't See the Value" },
  { label: "Need to Think", objection: "Need to Think" },
  { label: "Need to Talk to Someone", objection: "Need to Talk to Someone" },
  { label: "Too Expensive", objection: "Too Expensive" },
  { label: "What's Your Pricing", objection: "What's Your Pricing" },
  { label: "Bad Experience", objection: "Bad Experience" },
  { label: "Already Have Someone", objection: "Already Have Someone" },
  { label: "In-House Team", objection: "In-House Team" },
  { label: "Stacked Objections", objection: "Stacked Objections" },
  { label: "Schedule Callback", objection: null },
];

export function stageForOutcome(label: string, fallback?: string | null): "cold" | "warm" | "hot" | "won" {
  if (label === "Won") return "won";
  if (label === "Lost") return "cold";
  if (label === "Schedule Callback" || label === "Call Back" || label === "Come Back") return "hot";
  if (label === "Didn't Answer") return ((fallback as any) || "cold");
  return "warm";
}
