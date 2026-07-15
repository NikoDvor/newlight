export type RetentionStatus = "active" | "cancelling" | "churned" | "saved";

export interface RetentionRecord {
  id: string;
  client: string;
  reason: string;
  reasonLabel: string;
  notes?: string;
  requestedAt: string;
  offerShown: boolean;
  offerAccepted: boolean;
  status: RetentionStatus;
  mrr: number;
}

export const REASON_LABELS: Record<string, string> = {
  cost: "Cost too high",
  not_results: "Not seeing results",
  switching: "Switching providers",
  closed: "Business closed",
  other: "Other",
};

export const MOCK_RETENTION: RetentionRecord[] = [
  { id: "r1", client: "Bright Dental Group", reason: "cost", reasonLabel: REASON_LABELS.cost, requestedAt: "2026-07-08", offerShown: true, offerAccepted: true, status: "saved", mrr: 1490, notes: "Wanted 20% off — accepted." },
  { id: "r2", client: "Peak Roofing Co", reason: "not_results", reasonLabel: REASON_LABELS.not_results, requestedAt: "2026-07-10", offerShown: true, offerAccepted: false, status: "cancelling", mrr: 2200, notes: "Wants a quick strategy call before final decision." },
  { id: "r3", client: "Harbor Family Law", reason: "switching", reasonLabel: REASON_LABELS.switching, requestedAt: "2026-07-04", offerShown: true, offerAccepted: false, status: "churned", mrr: 1800 },
  { id: "r4", client: "Sunset Spa & Wellness", reason: "closed", reasonLabel: REASON_LABELS.closed, requestedAt: "2026-06-28", offerShown: false, offerAccepted: false, status: "churned", mrr: 990, notes: "Owner retiring." },
  { id: "r5", client: "Cedar Creek Fitness", reason: "cost", reasonLabel: REASON_LABELS.cost, requestedAt: "2026-07-12", offerShown: true, offerAccepted: true, status: "saved", mrr: 1250 },
  { id: "r6", client: "Northgate Auto Repair", reason: "not_results", reasonLabel: REASON_LABELS.not_results, requestedAt: "2026-07-13", offerShown: true, offerAccepted: false, status: "cancelling", mrr: 1690 },
  { id: "r7", client: "Willow HVAC", reason: "other", reasonLabel: REASON_LABELS.other, requestedAt: "2026-07-01", offerShown: true, offerAccepted: true, status: "saved", mrr: 1400, notes: "Paused for 30 days instead of cancelling." },
];

export const STATUS_COLOR: Record<RetentionStatus, string> = {
  active: "bg-white/10 text-white/60",
  cancelling: "bg-amber-500/15 text-amber-300",
  churned: "bg-red-500/15 text-red-300",
  saved: "bg-emerald-500/15 text-emerald-300",
};

// ---------- Signed documents (e-signature) ----------

export type SignatureDocStatus = "sent" | "viewed" | "signed" | "completed";

export interface SignedDoc {
  id: string;
  title: string;
  recipient: string;
  recipientEmail: string;
  status: SignatureDocStatus;
  sentAt: string;
  updatedAt: string;
  signedAt?: string;
  ip?: string;
  pages: number;
}

export const MOCK_SIGNED_DOCS: SignedDoc[] = [
  { id: "d1", title: "Growth Package Proposal — Bright Dental", recipient: "Dr. Amelia Cho", recipientEmail: "amelia@brightdental.com", status: "completed", sentAt: "2026-07-05", updatedAt: "2026-07-06", signedAt: "2026-07-06 10:14", ip: "73.19.44.12", pages: 6 },
  { id: "d2", title: "Enterprise Agreement — Peak Roofing", recipient: "Marcus Vale", recipientEmail: "mvale@peakroof.co", status: "viewed", sentAt: "2026-07-11", updatedAt: "2026-07-12", pages: 8 },
  { id: "d3", title: "Master Services Agreement — Harbor Law", recipient: "Rebecca Harbor", recipientEmail: "rh@harborlaw.com", status: "sent", sentAt: "2026-07-13", updatedAt: "2026-07-13", pages: 4 },
  { id: "d4", title: "SEO Retainer — Cedar Creek Fitness", recipient: "Jordan Ellis", recipientEmail: "jordan@cedarcreekfit.com", status: "signed", sentAt: "2026-07-09", updatedAt: "2026-07-10", signedAt: "2026-07-10 15:42", ip: "104.28.19.55", pages: 3 },
  { id: "d5", title: "Website Build SOW — Willow HVAC", recipient: "Priya Nair", recipientEmail: "priya@willowhvac.com", status: "completed", sentAt: "2026-06-30", updatedAt: "2026-07-02", signedAt: "2026-07-02 09:03", ip: "68.114.201.7", pages: 5 },
  { id: "d6", title: "Ads Management Addendum — Northgate Auto", recipient: "Chris Boland", recipientEmail: "cb@northgateauto.com", status: "viewed", sentAt: "2026-07-12", updatedAt: "2026-07-13", pages: 2 },
];

export const DOC_STATUS_COLOR: Record<SignatureDocStatus, string> = {
  sent: "bg-white/10 text-white/60",
  viewed: "bg-sky-500/15 text-sky-300",
  signed: "bg-amber-500/15 text-amber-300",
  completed: "bg-emerald-500/15 text-emerald-300",
};
