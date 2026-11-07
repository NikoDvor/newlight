// Calling-hours gate: no outbound sales calls before 8:00am or after 9:00pm in the recipient's local time.
// Unknown state => the strictest window that is legal in every US zone for a Pacific-based team (8am-6pm Pacific).
const ZONE: Record<string, string> = {
  CT: "America/New_York", DE: "America/New_York", DC: "America/New_York", FL: "America/New_York", GA: "America/New_York",
  ME: "America/New_York", MD: "America/New_York", MA: "America/New_York", NH: "America/New_York", NJ: "America/New_York",
  NY: "America/New_York", NC: "America/New_York", OH: "America/New_York", PA: "America/New_York", RI: "America/New_York",
  SC: "America/New_York", VT: "America/New_York", VA: "America/New_York", WV: "America/New_York", MI: "America/New_York",
  IN: "America/New_York", KY: "America/New_York",
  AL: "America/Chicago", AR: "America/Chicago", IL: "America/Chicago", IA: "America/Chicago", LA: "America/Chicago",
  MN: "America/Chicago", MS: "America/Chicago", MO: "America/Chicago", OK: "America/Chicago", WI: "America/Chicago",
  TX: "America/Chicago", KS: "America/Chicago", NE: "America/Chicago", ND: "America/Chicago", SD: "America/Chicago", TN: "America/Chicago",
  CO: "America/Denver", MT: "America/Denver", NM: "America/Denver", UT: "America/Denver", WY: "America/Denver", ID: "America/Denver", AZ: "America/Phoenix",
  CA: "America/Los_Angeles", NV: "America/Los_Angeles", OR: "America/Los_Angeles", WA: "America/Los_Angeles",
  AK: "America/Anchorage", HI: "Pacific/Honolulu",
};

function hourIn(tz: string, d: Date): number {
  return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz }).format(d)) % 24;
}

/** Returns null if calling is allowed now, otherwise a short reason. */
export function callingHoursBlock(state: string | null | undefined, now = new Date()): string | null {
  const tz = state ? ZONE[state.trim().toUpperCase()] : undefined;
  if (tz) {
    const h = hourIn(tz, now);
    return h >= 8 && h < 21 ? null : `Outside calling hours (8am–9pm) in ${state!.toUpperCase()}.`;
  }
  const h = hourIn("America/Los_Angeles", now);
  return h >= 8 && h < 18 ? null : "Outside calling hours (state unknown — call between 8am and 6pm Pacific).";
}
