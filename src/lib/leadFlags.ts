// Shared parsing for flags embedded inside the owner_name field from the
// Lead Researcher output: CORPORATE / BOOTH RENTER / BD-AFFILIATED (fixed
// strings) and FIT-RISK:<reason> (variable text). Used by BDRMyLeads
// (import preview), BDRDialer and LeadFields (table row badges).

export function parseLeadFlags(ownerName: string | null | undefined): string[] {
  const s = (ownerName || "").toLowerCase();
  const out: string[] = [];
  if (s.includes("corporate account")) out.push("CORPORATE");
  if (s.includes("booth renter")) out.push("BOOTH RENTER");
  if (s.includes("bd-affiliated") || s.includes("bd affiliated")) out.push("BD-AFFILIATED");
  // FIT-RISK carries a variable reason, e.g. "[FIT-RISK: solo, $245K AUM]"
  const fitRisk = ownerName?.match(/fit-risk\s*:\s*([^\]]+)/i);
  if (fitRisk) out.push(`FIT-RISK: ${fitRisk[1].trim()}`);
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
    // Remove the variable FIT-RISK reason text before stripping brackets,
    // so "FIT-RISK: solo, $245K AUM" doesn't leak into the display name.
    .replace(/fit-risk\s*:\s*[^\]]+/gi, "")
    .replace(/[\[\](){}]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,;:\-–—]+|[\s,;:\-–—]+$/g, "")
    .trim();
}

// A lead can now hold up to two independent numbers (Front Desk and Owner
// Direct). Legacy leads only have the single `phone` field with a `phone_type`.
// This helper normalizes both shapes into the display list used across the
// dialer and lead cards. It also decides which one is the "primary" tel: link
// (owner direct wins when present — it's the more valuable connect).
export interface LeadPhoneShape {
  phone?: string | null;
  phone_type?: string | null;
  front_desk_phone?: string | null;
  owner_direct_phone?: string | null;
}
export interface LeadPhoneEntry {
  number: string;
  label: "Owner Direct" | "Front Desk" | "Owner" | "Phone";
  kind: "owner_direct" | "front_desk" | "legacy_owner" | "legacy_front_desk" | "legacy_unknown";
}
export function getLeadPhones(lead: LeadPhoneShape): LeadPhoneEntry[] {
  const out: LeadPhoneEntry[] = [];
  const owner = (lead.owner_direct_phone || "").trim();
  const front = (lead.front_desk_phone || "").trim();
  if (owner) out.push({ number: owner, label: "Owner Direct", kind: "owner_direct" });
  if (front) out.push({ number: front, label: "Front Desk", kind: "front_desk" });
  if (out.length > 0) return out;
  // Legacy fallback: single phone + phone_type
  const legacy = (lead.phone || "").trim();
  if (!legacy) return [];
  if (lead.phone_type === "owner") {
    out.push({ number: legacy, label: "Owner", kind: "legacy_owner" });
  } else if (lead.phone_type === "front_desk") {
    out.push({ number: legacy, label: "Front Desk", kind: "legacy_front_desk" });
  } else {
    out.push({ number: legacy, label: "Phone", kind: "legacy_unknown" });
  }
  return out;
}
export function getPrimaryLeadPhone(lead: LeadPhoneShape): string | null {
  const list = getLeadPhones(lead);
  return list[0]?.number || null;
}
