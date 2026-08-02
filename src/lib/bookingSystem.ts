// Shared model for the 5-method booking-system check run against a lead's
// already-known website. Used by the dialer, street walk, my-leads and the
// admin/team lead tables so the Yes / No / Unknown semantics never drift.

export const BOOKING_METHOD_LABELS: Record<string, string> = {
  url_path: "1 · Booking URL/path",
  embed_script: "2 · Embedded booking widget",
  cta_text: "3 · Booking CTA text",
  structured_data: "4 · Structured data / meta",
  footer_linkout: "5 · Footer / contact link-out",
};

export const BOOKING_METHOD_ORDER = Object.keys(BOOKING_METHOD_LABELS);

export interface BookingSystemShape {
  website?: string | null;
  has_booking_system?: boolean | null;
  booking_system_exists?: boolean | null;
  booking_platform?: string | null;
  booking_system_platform?: string | null;
  booking_system_methods?: string[] | null;
  booking_system_checked_at?: string | null;
}

export type BookingSystemState = "yes" | "no" | "unknown";

/** Never infer "No" from an unchecked lead — absence of data is Unknown. */
export function bookingSystemState(lead: BookingSystemShape): BookingSystemState {
  const v = lead.booking_system_exists ?? lead.has_booking_system;
  if (v === true) return "yes";
  if (v === false) return "no";
  return "unknown";
}

export function bookingSystemPlatform(lead: BookingSystemShape): string | null {
  return lead.booking_system_platform || lead.booking_platform || null;
}

export function bookingSystemMethods(lead: BookingSystemShape): string[] {
  return (lead.booking_system_methods || []).filter(Boolean);
}

/** Human-readable detail used for badge tooltips / expandable detail rows. */
export function bookingSystemDetail(lead: BookingSystemShape): string {
  const state = bookingSystemState(lead);
  const methods = bookingSystemMethods(lead);
  const platform = bookingSystemPlatform(lead);
  const lines: string[] = [];
  lines.push(
    state === "yes" ? "Booking system: Yes"
      : state === "no" ? "Booking system: No (site checked, none of the 5 routes matched)"
      : "Booking system: Unknown (not checked yet)",
  );
  if (platform) lines.push(`Platform: ${platform}`);
  if (methods.length) {
    lines.push("Confirmed by:");
    for (const m of methods) lines.push(`• ${BOOKING_METHOD_LABELS[m] || m}`);
  } else if (state === "no") {
    lines.push("All 5 detection routes ran and found nothing.");
  }
  if (lead.booking_system_checked_at) {
    lines.push(`Checked ${new Date(lead.booking_system_checked_at).toLocaleString()}`);
  }
  if (!lead.website) lines.push("No website on file — cannot be checked.");
  return lines.join("\n");
}

/** Parse the "confidence High/Med/Low" marker the researcher prompt writes into notes. */
export function parseLeadConfidence(notes: string | null | undefined): "High" | "Medium" | "Low" | null {
  const s = (notes || "").toLowerCase();
  const m = s.match(/confidence[:\s-]*\s*(high|med(?:ium)?|low)/);
  if (!m) return null;
  if (m[1].startsWith("h")) return "High";
  if (m[1].startsWith("m")) return "Medium";
  return "Low";
}

/** Pull the "methods confirmed" / verified-via fragment out of the notes blob. */
export function parseVerificationMethods(notes: string | null | undefined): string | null {
  const s = (notes || "").trim();
  if (!s) return null;
  const m = s.match(/(?:methods?\s+confirmed|verified\s+(?:via|by)|confirmed\s+(?:via|by))\s*[:\-–]\s*([^\n.;]+)/i);
  return m ? m[1].trim() : null;
}
