// Shared calendar types. Backend-agnostic — adapters map into these shapes.

export type EventKind =
  | "discovery"
  | "closing"
  | "dialer"
  | "manual"
  | "booking_form"
  | "sdr_mirror"
  | "default";

export interface CalendarEventLike {
  id: string;
  /** ISO string or Date */
  startsAt: string | Date;
  /** Optional end for agenda display */
  endsAt?: string | Date;
  title?: string;
  description?: string | null;
  kind?: EventKind | string;
  /** Passthrough for parent onClick handlers */
  raw?: unknown;
}
