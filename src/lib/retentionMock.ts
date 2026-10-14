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

export const MOCK_RETENTION: RetentionRecord[] = [];

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

export const MOCK_SIGNED_DOCS: SignedDoc[] = [];

export const DOC_STATUS_COLOR: Record<SignatureDocStatus, string> = {
  sent: "bg-white/10 text-white/60",
  viewed: "bg-sky-500/15 text-sky-300",
  signed: "bg-amber-500/15 text-amber-300",
  completed: "bg-emerald-500/15 text-emerald-300",
};
