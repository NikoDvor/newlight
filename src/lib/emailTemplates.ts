/**
 * Email lead templates (Niko, Nov 12 2026). Salesmen copy/paste these into their own email.
 * Personalized: owner's first name, next month (Pacific time, on the day it's copied), and which template:
 *  - YouTube: the owner/firm has a channel or appears in YouTube videos (found by the nightly research).
 *  - Podcast: the owner hosts or was a guest on a podcast (wording is a draft — Niko to confirm).
 *  - Standard: nothing found.
 * Signature is always Niko. Footer = postal address + opt-out line.
 */
export const EMAIL_FOOTER = "NewLight Marketing · 1558 Orchard Dr, Ojai, CA 93023 · Reply \"stop\" and I won't email you again.";

export function nextMonthName(now: Date = new Date()): string {
  const la = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  return new Date(la.getFullYear(), la.getMonth() + 1, 1).toLocaleString("en-US", { month: "long" });
}

export type MediaKind = "youtube" | "podcast" | null;
export interface EmailDraft { template: "standard" | "youtube" | "podcast"; subject: string; body: string }

export function buildEmail(opts: { firstName?: string | null; media?: MediaKind; podcastName?: string | null; hasYouTube?: boolean; now?: Date }): EmailDraft {
  const hi = `Hi ${opts.firstName?.trim() || "there"}.`;
  const media: MediaKind = opts.media ?? (opts.hasYouTube ? "youtube" : null);
  if (media === "youtube") {
    return {
      template: "youtube",
      subject: "RE; YouTube Content Interest",
      body: `${hi}\n\nI saw your YouTube content, I have a couple questions. When would be the next time for a chat?\n\nBest,\nNiko\n\n${EMAIL_FOOTER}`,
    };
  }
  if (media === "podcast") {
    const show = opts.podcastName?.trim();
    return {
      template: "podcast",
      subject: "RE; Podcast Interest",
      body: `${hi}\n\nI heard you on ${show ? `the ${show.replace(/^the\s+/i, "")} podcast` : "your podcast"}, I have a couple questions. When would be the next time for a chat?\n\nBest,\nNiko\n\n${EMAIL_FOOTER}`,
    };
  }
  const month = nextMonthName(opts.now);
  return {
    template: "standard",
    subject: `RE; About The New Clients In ${month}`,
    body: `${hi}\n\nI am just checking in on your availability about some new clientele. Can you take on 13 new accounts in ${month}?\n\nBest,\nNiko Dvortcsak\n\n${EMAIL_FOOTER}`,
  };
}
