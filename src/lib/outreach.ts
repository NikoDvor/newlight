// Outreach (text + LinkedIn) helpers. Everything is sent by hand by the rep; the app only prepares and tracks.

export type PhoneType = "iphone_ios18" | "iphone_old" | "android_google" | "android_other";
export const PHONE_TYPES: { k: PhoneType; label: string }[] = [
  { k: "iphone_ios18", label: "iPhone — iOS 18 or newer" },
  { k: "iphone_old", label: "iPhone — older iOS" },
  { k: "android_google", label: "Android — Google Messages" },
  { k: "android_other", label: "Android — other messaging app" },
];
export const isIphone = (p: PhoneType) => p.startsWith("iphone");
export const canSchedule = (p: PhoneType) => p === "iphone_ios18" || p === "android_google";

export const DEFAULT_CAPS = { text: 40, li_connect: 20, li_message: 40 };
export const capForPhone = (p: PhoneType) => (p.startsWith("android") ? 25 : 40);
export const MIN_GAP_MIN = 2;
export const PLAN_DAYS = 3;

/** Reply outcomes: the Dialer's list plus the three text-only ones. */
export const OUTREACH_OUTCOMES: { group: string; items: string[] }[] = [
  { group: "Replied", items: ["Said They Would Reach Out", "Schedule Callback", "Need to Think", "Need to Talk to Someone", "What's Your Pricing"] },
  { group: "Objections", items: ["Not Interested", "Don't See the Value", "Too Expensive", "Already Have Someone", "In-House Team", "Bad Experience", "Stacked Objections"] },
  { group: "No contact", items: ["No Reply", "Didn't Answer", "Gatekeeper", "Didn't Get Past Gatekeeper", "Wrong Number", "Stop"] },
  { group: "Closed", items: ["Won", "Lost"] },
];

const STATE_TZ: Record<string, string> = {
  CT: "America/New_York", DE: "America/New_York", FL: "America/New_York", GA: "America/New_York", ME: "America/New_York", MD: "America/New_York",
  MA: "America/New_York", NH: "America/New_York", NJ: "America/New_York", NY: "America/New_York", NC: "America/New_York", OH: "America/New_York",
  PA: "America/New_York", RI: "America/New_York", SC: "America/New_York", VT: "America/New_York", VA: "America/New_York", WV: "America/New_York",
  DC: "America/New_York", MI: "America/New_York", IN: "America/New_York", KY: "America/New_York",
  AL: "America/Chicago", AR: "America/Chicago", IL: "America/Chicago", IA: "America/Chicago", KS: "America/Chicago", LA: "America/Chicago",
  MN: "America/Chicago", MS: "America/Chicago", MO: "America/Chicago", NE: "America/Chicago", ND: "America/Chicago", OK: "America/Chicago",
  SD: "America/Chicago", TN: "America/Chicago", TX: "America/Chicago", WI: "America/Chicago",
  AZ: "America/Phoenix", CO: "America/Denver", ID: "America/Denver", MT: "America/Denver", NM: "America/Denver", UT: "America/Denver", WY: "America/Denver",
  CA: "America/Los_Angeles", NV: "America/Los_Angeles", OR: "America/Los_Angeles", WA: "America/Los_Angeles",
  AK: "America/Anchorage", HI: "Pacific/Honolulu",
};
export const tzForState = (st?: string | null) => STATE_TZ[(st || "").toUpperCase()] || "America/Los_Angeles";

const hourIn = (d: Date, tz: string) => Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(d)) % 24;
/** 8am–8pm in the lead's own timezone. */
export const inWindow = (d: Date, st?: string | null) => { const h = hourIn(d, tzForState(st)); return h >= 8 && h < 20; };
/** Earliest time at or after `after` that is inside the lead's 8am–8pm window. */
export function nextInWindow(after: Date, st?: string | null): Date {
  const d = new Date(after.getTime());
  for (let i = 0; i < 200 && !inWindow(d, st); i++) d.setMinutes(d.getMinutes() + 15, 0, 0);
  return d;
}
export const laDay = (d: Date | string) => new Date(d).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles" });

/** "Dr. Michael Smith" → "Michael". Falls back to "there" so a blank never goes out. */
export const firstNameOf = (first?: string | null, full?: string | null) => {
  const f = (first || "").trim();
  if (/^[A-Za-z][A-Za-z'-]+$/.test(f)) return f[0].toUpperCase() + f.slice(1);
  const w = (full || "").replace(/^(mr|mrs|ms|dr|miss)\.?\s+/i, "").trim().split(/\s+/)[0] || "";
  return /^[A-Za-z][A-Za-z'-]+$/.test(w) ? w[0].toUpperCase() + w.slice(1).toLowerCase() : "there";
};
/** "Smith Wealth Management, LLC" → "Smith Wealth". */
export const shortFirm = (n?: string | null) => {
  const s = (n || "").replace(/[,.]/g, " ").replace(/\b(llc|inc|corp|corporation|co|ltd|lp|llp|pllc|pc)\b/gi, " ")
    .replace(/\b(wealth management|asset management|investment management|financial advisors|financial advisory|financial services|capital management|advisors|advisory)\b/gi, " ")
    .replace(/\s+/g, " ").trim();
  return s || (n || "").trim();
};
export const fillTemplate = (body: string, v: { first: string; rep: string; firm: string; city: string }) =>
  body.replace(/\{first\}/g, v.first).replace(/\{rep\}/g, v.rep).replace(/\{firm\}/g, v.firm).replace(/\{city\}/g, v.city || "your area");

export const phoneDigits = (p?: string | null) => { const d = (p || "").replace(/\D/g, ""); return d.length === 11 && d.startsWith("1") ? d.slice(1) : d; };
export const prettyPhone = (p?: string | null) => { const d = phoneDigits(p); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : (p || ""); };
/** Opens Messages with the text filled in. iOS uses &body=, Android uses ?body=. */
export function smsHref(phone: string | null | undefined, body: string, p: PhoneType) {
  const d = phoneDigits(phone);
  return `sms:+1${d}${isIphone(p) ? "&" : "?"}body=${encodeURIComponent(body)}`;
}

export const SCHEDULE_HELP: Record<PhoneType, { title: string; steps: string[]; note: string }> = {
  iphone_ios18: {
    title: "Schedule a text with Apple's Send Later",
    steps: [
      "Tap Text on the lead. Messages opens with the message already filled in. Edit it if you want.",
      "Tap the + button to the left of the message box.",
      "Tap Send Later.",
      "A time bubble appears above the keyboard. Tap it and pick the date and time (up to about 14 days ahead).",
      "Tap the send arrow. The message sits in the thread with a Send Later label and the time.",
      "Back in the app, pick the same time under Schedule and tap Scheduled.",
    ],
    note: "iMessage (blue bubble) only. Green-bubble numbers can't be scheduled, so send those the same day. To change or cancel, tap the scheduled message in the thread and choose Edit Time, Send Now or Delete. Keep your phone on and online at the time it sends. Menu names can differ slightly by iOS version.",
  },
  iphone_old: {
    title: "Older iPhones can't schedule texts",
    steps: ["Send each text the same day.", "Tap Text on the lead, edit if you want, tap Send in Messages.", "Tap Sent in the app."],
    note: "Send Later needs iOS 18 or newer. Update your iPhone if you want to plan ahead.",
  },
  android_google: {
    title: "Schedule a text in Google Messages",
    steps: [
      "Tap Text on the lead. Messages opens with the message already filled in. Edit it if you want.",
      "Touch and hold the send arrow.",
      "Pick a time (or Pick date & time), then confirm.",
      "Back in the app, pick the same time under Schedule and tap Scheduled.",
    ],
    note: "Sends as SMS, so your daily limit is lower (25). Menu names can differ by app version.",
  },
  android_other: {
    title: "Send same day",
    steps: ["Tap Text on the lead, edit if you want, tap Send in Messages.", "Tap Sent in the app."],
    note: "If your messaging app has scheduled send, you can use it. Otherwise send the same day. Daily limit is 25.",
  },
};
