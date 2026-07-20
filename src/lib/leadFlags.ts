// Shared parsing for CORPORATE / BOOTH RENTER / BD-AFFILIATED flags
// embedded inside the owner_name field from the Lead Researcher output.
// Used by BDRMyLeads (import preview) and BDRDialer (table row badges).

export type LeadFlag = "CORPORATE" | "BOOTH RENTER" | "BD-AFFILIATED";

export function parseLeadFlags(ownerName: string | null | undefined): LeadFlag[] {
  const s = (ownerName || "").toLowerCase();
  const out: LeadFlag[] = [];
  if (s.includes("corporate account")) out.push("CORPORATE");
  if (s.includes("booth renter")) out.push("BOOTH RENTER");
  if (s.includes("bd-affiliated") || s.includes("bd affiliated")) out.push("BD-AFFILIATED");
  return out;
}

// Strip the raw flag markers from owner_name for cleaner display when
// the flags are already rendered as separate badges.
export function stripLeadFlags(ownerName: string | null | undefined): string {
  if (!ownerName) return "";
  return ownerName
    .replace(/\bcorporate account\b/gi, "")
    .replace(/\bbooth renter\b/gi, "")
    .replace(/\bbd[- ]affiliated\b/gi, "")
    .replace(/[\[\](){}]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,;:\-–—]+|[\s,;:\-–—]+$/g, "")
    .trim();
}
