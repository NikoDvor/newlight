import ReactMarkdown from "react-markdown";

/** Contractor paperwork (1099 commission-only sales reps). Nothing here ever holds an SSN or bank number. */

export type PacketDoc = {
  doc_id: string;
  slug: string;
  version: number;
  title: string;
  summary?: string | null;
  body: string;
  body_sha256: string;
  signature: null | { id: string; signed_at: string; typed_name: string; doc_version: number; body: string; body_sha256: string };
};
export type Packet = {
  hire: { id: string; full_name: string; business_name: string | null; state_code: string; status: string; w9_received_at: string | null;
    mailing_address: string | null; phone: string | null; work_city: string | null; entity_type: string | null; countersigned_at: string | null; countersign_name: string | null };
  waiting_countersign?: boolean;
  docs: PacketDoc[];
};

export const money = (n: number) => (n < 0 ? "-" : "") + "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtDate = (d: string) => new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
export const todayISO = () => { const t = new Date(); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; };
/** Federal 1099-NEC threshold by year paid (OBBBA: $2,000 from 2026, indexed from 2027 — update when the IRS publishes it). */
export const NEC_THRESHOLD: Record<number, number> = { 2025: 600, 2026: 2000 };
export const necThreshold = (y: number) => NEC_THRESHOLD[y] ?? 2000;

export type HireStatus = "invited" | "signed" | "active" | "ended";
export const STATUS_LABEL: Record<HireStatus, string> = {
  invited: "Needs to sign",
  signed: "Signed · waiting on W-9",
  active: "Ready to be paid",
  ended: "Ended",
};
export const STATUS_COLOR: Record<HireStatus, string> = {
  invited: "hsl(35 92% 62%)",
  signed: "hsl(197 100% 66%)",
  active: "hsl(152 60% 58%)",
  ended: "hsl(215 15% 60%)",
};

/** Exhibit A text for a new contractor. Rates follow the packages & billing spec (setup fee only). */
export function defaultCommissionTerms(ratePct: number) {
  return [
    `- **Rate:** ${ratePct}% of the **setup fee** paid by each client the Contractor brings in.`,
    `- Commission is on the setup fee **only**: never on monthly fees, retainers, revenue commissions the client pays the Company, ad budgets, or the extra 10% charged on payment plans.`,
    `- **Payment plans:** half of the commission is earned when each of the two setup payments clears.`,
    `- **Annual plans:** commission is figured on the regular setup amount for that package.`,
    `- If the setup fee is negotiated, commission is on the amount the client actually pays.`,
  ].join("\n");
}

const mdDark = {
  h1: ({ children }: any) => <h1 className="text-xl sm:text-2xl font-black text-white">{children}</h1>,
  h2: ({ children }: any) => <h2 className="mt-6 text-[15px] font-bold text-white">{children}</h2>,
  p: ({ children }: any) => <p className="mt-2 text-[14px] leading-relaxed text-white/90">{children}</p>,
  ul: ({ children }: any) => <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-white/90">{children}</ul>,
  li: ({ children }: any) => <li>{children}</li>,
  strong: ({ children }: any) => <strong className="font-bold text-white">{children}</strong>,
  em: ({ children }: any) => <em className="text-white/75">{children}</em>,
  hr: () => <hr className="my-5 border-white/15" />,
};

/** The agreement text, on a solid panel so the moving background never sits behind it. */
export function AgreementText({ body, className = "" }: { body: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/12 bg-[hsl(222,40%,8%)] p-4 sm:p-6 ${className}`}>
      <ReactMarkdown components={mdDark as any}>{body}</ReactMarkdown>
    </div>
  );
}

/** Opens a clean printable copy (Save as PDF from the print dialog). */
export function printSignedCopy(opts: { title: string; body: string; typedName: string; signedAt: string; sha256: string; ip?: string | null; countersign?: { name: string; at: string } | null }) {
  const html = simpleMarkdownToHtml(opts.body);
  const when = new Date(opts.signedAt).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(opts.title)}</title>
<style>body{font:14px/1.55 Georgia,serif;color:#111;max-width:720px;margin:40px auto;padding:0 20px}h1{font-size:22px}h2{font-size:16px;margin-top:22px}
.sig{margin-top:28px;border-top:2px solid #111;padding-top:12px;font-family:system-ui,sans-serif;font-size:12px}.sig b{font-size:16px;font-family:Georgia,serif}</style></head>
<body>${html}<div class="sig"><p>Signed electronically by <b>${esc(opts.typedName)}</b></p><p>${esc(when)}${opts.ip ? ` · IP ${esc(opts.ip)}` : ""}</p>
<p>Document fingerprint (SHA-256): ${esc(opts.sha256)}</p>${opts.countersign ? `<p style="margin-top:14px">Countersigned for Vivid Virtual Creations LLC dba NewLight Marketing by <b>${esc(opts.countersign.name)}</b><br/>${esc(new Date(opts.countersign.at).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" }))}</p>` : ""}</div><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
  w.document.close();
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<i>$2</i>");

/** Enough markdown for the agreement (headings, bold, italics, bullet lists, rules, paragraphs). */
export function simpleMarkdownToHtml(md: string) {
  const out: string[] = [];
  let list = false;
  const close = () => { if (list) { out.push("</ul>"); list = false; } };
  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    if (/^- /.test(line)) { if (!list) { out.push("<ul>"); list = true; } out.push(`<li>${inline(line.slice(2))}</li>`); continue; }
    close();
    if (!line.trim()) continue;
    if (line.startsWith("## ")) out.push(`<h2>${inline(line.slice(3))}</h2>`);
    else if (line.startsWith("# ")) out.push(`<h1>${inline(line.slice(2))}</h1>`);
    else if (/^-{3,}$/.test(line)) out.push("<hr/>");
    else out.push(`<p>${inline(line)}</p>`);
  }
  close();
  return out.join("\n");
}
