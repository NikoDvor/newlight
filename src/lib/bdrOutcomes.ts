// Shared BDR outcome definitions used by the Dialer and Street Walk pages.
// Each outcome is its own distinct value. objection === null skips the 50-hit unlock tracker.
export type OutcomeCategory = "no_contact" | "positive" | "objection" | "closed";

export const OUTCOMES: { label: string; objection: string | null; category: OutcomeCategory }[] = [
  { label: "Won", objection: null, category: "closed" },
  { label: "Lost", objection: null, category: "closed" },
  { label: "Said They Would Reach Out", objection: "We Will Reach Out", category: "positive" },
  { label: "Didn't Answer", objection: null, category: "no_contact" },
  { label: "Gatekeeper", objection: "Gatekeeper", category: "no_contact" },
  { label: "Didn't Get Past Gatekeeper", objection: null, category: "no_contact" },
  { label: "Not Interested", objection: "Not Interested", category: "objection" },
  { label: "Don't See the Value", objection: "Don't See the Value", category: "objection" },
  { label: "Need to Think", objection: "Need to Think", category: "objection" },
  { label: "Need to Talk to Someone", objection: "Need to Talk to Someone", category: "objection" },
  { label: "Too Expensive", objection: "Too Expensive", category: "objection" },
  { label: "What's Your Pricing", objection: "What's Your Pricing", category: "objection" },
  { label: "Bad Experience", objection: "Bad Experience", category: "objection" },
  { label: "Already Have Someone", objection: "Already Have Someone", category: "objection" },
  { label: "In-House Team", objection: "In-House Team", category: "objection" },
  { label: "Stacked Objections", objection: "Stacked Objections", category: "objection" },
  { label: "Schedule Callback", objection: null, category: "positive" },
];

export function stageForOutcome(label: string, fallback?: string | null): "cold" | "warm" | "hot" | "won" {
  if (label === "Won") return "won";
  if (label === "Lost") return "cold";
  if (label === "Schedule Callback") return "hot";
  if (label === "Call Back" || label === "Come Back") return "warm";
  if (label === "Didn't Answer") return ((fallback as any) || "cold");
  return "warm";
}
