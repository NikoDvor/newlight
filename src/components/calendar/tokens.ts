import type { EventKind } from "./types";

/**
 * Canonical calendar event → CSS-variable color mapping.
 * All values reference tokens defined in src/index.css so the palette can
 * shift with theme changes and never hardcodes hex/hsl.
 */
export const EVENT_COLOR_VAR: Record<EventKind, string> = {
  discovery: "var(--cal-dot-discovery)",
  closing: "var(--cal-dot-closing)",
  dialer: "var(--cal-dot-dialer)",
  manual: "var(--cal-dot-manual)",
  booking_form: "var(--cal-dot-booking-form)",
  sdr_mirror: "var(--cal-dot-sdr-mirror)",
  default: "var(--cal-dot-default)",
};

export const EVENT_LABEL: Record<EventKind, string> = {
  discovery: "Discovery",
  closing: "Closing",
  dialer: "Dialer",
  manual: "Manual",
  booking_form: "Booking",
  sdr_mirror: "SDR",
  default: "Event",
};

export function resolveEventKind(source?: string | null): EventKind {
  if (!source) return "default";
  if (source in EVENT_COLOR_VAR) return source as EventKind;
  return "default";
}

export function eventColor(kind?: string | null): string {
  return EVENT_COLOR_VAR[resolveEventKind(kind)];
}
