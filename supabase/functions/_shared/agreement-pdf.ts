// Generates a durable PDF snapshot of a signed service agreement and stores it
// in the private "signed-agreements" bucket + a document_envelope_items row.
// The stored document_url is a long-lived signed URL so it can be linked from email.

import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

export const SIGNED_PDF_ITEM_NAME = "Signed Service Agreement (PDF)";
const BUCKET = "signed-agreements";
const SIGNED_URL_TTL = 60 * 60 * 24 * 365; // 1 year

function decodeDataUrlHtml(url: string): string | null {
  if (!url?.startsWith("data:")) return null;
  const comma = url.indexOf(",");
  if (comma < 0) return null;
  const meta = url.slice(5, comma);
  const payload = url.slice(comma + 1);
  try {
    if (meta.includes(";base64")) {
      const bin = atob(payload);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    }
    return decodeURIComponent(payload);
  } catch {
    return null;
  }
}

/** Very small HTML → text-block converter tuned for the agreement markup. */
export function htmlToBlocks(html: string): { text: string; bold: boolean; size: number }[] {
  let s = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  // Mark headings so we can bold them after tag stripping.
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n\u0001H1\u0001$1\n");
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\u0001H2\u0001$1\n");
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n\u0001H3\u0001$1\n");
  s = s.replace(/<(br|hr)\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|li|tr|section|table)>/gi, "\n");
  s = s.replace(/<\/t[dh]>/gi, "  ");
  s = s.replace(/<li[^>]*>/gi, "• ");
  s = s.replace(/<[^>]+>/g, "");
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const out: { text: string; bold: boolean; size: number }[] = [];
  for (const raw of s.split("\n")) {
    const line = raw.replace(/[ \t]+/g, " ").trim();
    if (!line) {
      out.push({ text: "", bold: false, size: 10 });
      continue;
    }
    if (line.startsWith("\u0001H1\u0001")) out.push({ text: line.slice(4).trim(), bold: true, size: 16 });
    else if (line.startsWith("\u0001H2\u0001")) out.push({ text: line.slice(4).trim(), bold: true, size: 13 });
    else if (line.startsWith("\u0001H3\u0001")) out.push({ text: line.slice(4).trim(), bold: true, size: 11 });
    else out.push({ text: line, bold: false, size: 10 });
  }
  // Collapse runs of blank lines
  return out.filter((b, i) => !(b.text === "" && out[i - 1]?.text === ""));
}

export async function buildPdfBytes(
  blocks: { text: string; bold: boolean; size: number }[],
  footerLines: string[],
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 612, H = 792, M = 54;
  const maxWidth = W - M * 2;
  let page = pdf.addPage([W, H]);
  let y = H - M;

  const newPage = () => { page = pdf.addPage([W, H]); y = H - M; };

  const drawWrapped = (text: string, size: number, isBold: boolean) => {
    const f = isBold ? bold : font;
    // sanitize characters WinAnsi cannot encode
    const clean = text.replace(/[^\x20-\x7E•—–’‘“”§]/g, "").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[—–]/g, "-");
    if (!clean) { y -= size * 0.9; return; }
    const words = clean.split(" ");
    let line = "";
    const flush = () => {
      if (!line) return;
      if (y < M + size) newPage();
      page.drawText(line, { x: M, y, size, font: f, color: rgb(0.07, 0.09, 0.15) });
      y -= size * 1.45;
      line = "";
    };
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(test, size) > maxWidth) { flush(); line = w; }
      else line = test;
    }
    flush();
  };

  for (const b of blocks) {
    if (b.bold) y -= 6;
    drawWrapped(b.text, b.size, b.bold);
  }

  if (footerLines.length) {
    y -= 14;
    if (y < M + 60) newPage();
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color: rgb(0.8, 0.83, 0.88) });
    y -= 18;
    for (const l of footerLines) drawWrapped(l, 9, false);
  }

  return await pdf.save();
}

/**
 * Creates (idempotently) the signed-agreement PDF for an envelope.
 * Returns the signed URL, or null if it could not be produced.
 */
// deno-lint-ignore no-explicit-any
export async function generateSignedAgreementPdf(
  supabase: any,
  envelopeId: string,
  meta: { signerName?: string | null; signerEmail?: string | null; signedAt?: string | null; ip?: string | null; title?: string | null },
): Promise<string | null> {
  try {
    const { data: existing } = await supabase
      .from("document_envelope_items")
      .select("id, document_url")
      .eq("envelope_id", envelopeId)
      .eq("document_name", SIGNED_PDF_ITEM_NAME)
      .maybeSingle();
    if (existing?.document_url) return existing.document_url;

    const { data: items } = await supabase
      .from("document_envelope_items")
      .select("document_name, document_url, display_order")
      .eq("envelope_id", envelopeId)
      .order("display_order");

    const source = (items || []).find((i: any) => decodeDataUrlHtml(i.document_url || ""));
    const html = source ? decodeDataUrlHtml(source.document_url) : null;
    if (!html) {
      console.warn("[agreement-pdf] no inline HTML source for envelope", envelopeId);
      return null;
    }

    const signedAt = meta.signedAt ? new Date(meta.signedAt) : new Date();
    const footer = [
      "ELECTRONIC SIGNATURE CERTIFICATE",
      `Signed by: ${meta.signerName || "-"}${meta.signerEmail ? ` (${meta.signerEmail})` : ""}`,
      `Signed at: ${signedAt.toISOString()}`,
      meta.ip ? `IP address: ${meta.ip}` : "",
      `Envelope ID: ${envelopeId}`,
    ].filter(Boolean);

    const bytes = await buildPdfBytes(htmlToBlocks(html), footer);
    const path = `${envelopeId}/signed-service-agreement-${signedAt.getTime()}.pdf`;

    const up = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (up.error) {
      console.error("[agreement-pdf] upload failed", up.error);
      return null;
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);
    if (signErr || !signed?.signedUrl) {
      console.error("[agreement-pdf] signed url failed", signErr);
      return null;
    }

    await supabase.from("document_envelope_items").insert({
      envelope_id: envelopeId,
      document_name: SIGNED_PDF_ITEM_NAME,
      document_url: signed.signedUrl,
      display_order: 90,
    } as any);

    return signed.signedUrl;
  } catch (e) {
    console.error("[agreement-pdf] error", e);
    return null;
  }
}

/** Looks up the stored signed-agreement PDF URL for a deal (via its envelope). */
// deno-lint-ignore no-explicit-any
export async function getSignedAgreementUrlForDeal(supabase: any, dealId: string): Promise<string | null> {
  const { data: deal } = await supabase
    .from("crm_deals")
    .select("service_agreement_envelope_id")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal?.service_agreement_envelope_id) return null;
  const { data: item } = await supabase
    .from("document_envelope_items")
    .select("document_url")
    .eq("envelope_id", deal.service_agreement_envelope_id)
    .eq("document_name", SIGNED_PDF_ITEM_NAME)
    .maybeSingle();
  return item?.document_url || null;
}
