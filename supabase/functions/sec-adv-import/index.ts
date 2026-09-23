// Imports SEC's monthly "Information About Registered Investment Advisers"
// bulk file (Form ADV firm roster) into public.sec_adv_services, deriving a
// plain "Focus" label from Item 5.G (types of advisory services).
//
// Verified live (ia09012026-registered.zip → 42 MB CSV, 17,149 firms, 448 cols):
//   "Organization CRD#", "SEC#", "Primary Business Name",
//   "5G(1)" Financial planning services
//   "5G(2)" Portfolio mgmt for individuals / small businesses
//   "5G(3)" Portfolio mgmt for investment companies (RICs/BDCs)
//   "5G(4)" Portfolio mgmt for pooled investment vehicles
//   "5G(5)" Portfolio mgmt for businesses / institutional clients
//   "5G(6)" Pension consulting
//   "5G(7)" Selection of other advisers
// Values are "Y" / "N". Firms roughly: 5G(1)=7,949, 5G(2)=11,169, 5G(4)=6,624.
//
// Resumable: pass { start_row } and call until done=true.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";

const PAGE_URL =
  "https://www.sec.gov/data-research/sec-markets-data/information-about-registered-investment-advisers-exempt-reporting-advisers";
const UA = "NewLight BDR admin@newlight-app.com";
const BATCH = 1000;
const TIME_BUDGET_MS = 100_000;

function json(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// SEC's roster has quoted fields containing line breaks. Split on newlines
// natively (cheap), then re-join physical lines while a quote is left open.
function csvRecords(text: string): string[] {
  const out: string[] = []; let buf: string | null = null;
  for (const line of text.split("\n")) {
    buf = buf === null ? line : buf + "\n" + line;
    if (((buf.match(/"/g) || []).length & 1) === 0) { out.push(buf.replace(/\r$/, "")); buf = null; }
  }
  if (buf) out.push(buf);
  return out;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur); return out;
}

// Collapse Item 5.G into BDR-friendly labels. `services` keeps every
// service the firm offers; the primary label is one plain category:
//   planning + portfolio mgmt  -> Wealth Management (typical planning-led RIA)
//   planning only              -> Financial Planning
//   portfolio mgmt (no plan.)  -> Portfolio Management (pure investment shop)
//   funds / pooled vehicles    -> Fund Management (institutional / hedge / PE)
//   pension consulting only    -> Pension Consulting
//   adviser selection only     -> Adviser Selection
export function deriveServices(y: (k: string) => boolean): { services: string[]; primary: string | null } {
  const fp = y("5G(1)"), pm = y("5G(2)") || y("5G(5)"), fund = y("5G(3)") || y("5G(4)"),
    pen = y("5G(6)"), sel = y("5G(7)");
  const services: string[] = [];
  if (fp) services.push("Financial Planning");
  if (pm) services.push("Portfolio Management");
  if (pen) services.push("Pension Consulting");
  if (fund) services.push("Fund Management");
  if (sel) services.push("Adviser Selection");
  const primary = fp && pm ? "Wealth Management"
    : fp ? "Financial Planning"
    : pm ? "Portfolio Management"
    : fund ? "Fund Management"
    : pen ? "Pension Consulting"
    : sel ? "Adviser Selection" : null;
  return { services, primary };
}

// SEC file names are inconsistent (ia09012026-registered.zip, ia08032026_1.zip,
// ia060126_0.zip, ia050120.zip), so parse the date from every non-exempt link
// and take the newest.
function zipDate(h: string): number {
  const m = h.match(/\/ia(\d{6,8})[^/]*\.zip$/i);
  if (!m) return 0;
  const d = m[1];
  const mm = d.slice(0, 2), dd = d.slice(2, 4);
  const yy = d.length === 8 ? d.slice(4) : `20${d.slice(4)}`;
  return Number(`${yy}${mm}${dd}`);
}

async function latestZipUrl(): Promise<string> {
  const html = await (await fetch(PAGE_URL, { headers: { "User-Agent": UA, Accept: "text/html" } })).text();
  const links = [...html.matchAll(/href="([^"]+\.zip)"/g)].map((m) => m[1])
    .filter((h) => !/exempt/i.test(h) && zipDate(h) > 0)
    .sort((a, b) => zipDate(b) - zipDate(a));
  // SEC sometimes serves the backend a stale cached copy of the page whose
  // newest link is years old. If so, probe this and last month's likely names.
  const cutoff = Number(new Date(Date.now() - 50 * 864e5).toISOString().slice(0, 10).replace(/-/g, ""));
  if (!links.length || zipDate(links[0]) < cutoff) {
    const base = "https://www.sec.gov/files/investment/data/other/information-about-registered-investment-advisers-exempt-reporting-advisers/";
    const now = new Date();
    for (let back = 0; back < 3; back++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0"), yyyy = String(d.getUTCFullYear()), yy = yyyy.slice(2);
      for (let day = 1; day <= 5; day++) {
        const dd = String(day).padStart(2, "0");
        for (const n of [`ia${mm}${dd}${yyyy}-registered.zip`, `ia${mm}${dd}${yyyy}.zip`, `ia${mm}${dd}${yyyy}_1.zip`, `ia${mm}${dd}${yy}.zip`, `ia${mm}${dd}${yy}_0.zip`]) {
          const r = await fetch(base + n, { method: "HEAD", headers: { "User-Agent": UA } }).catch(() => null);
          if (r?.ok && !(r.headers.get("content-type") || "").includes("html")) return base + n;
        }
      }
    }
  }
  if (!links.length) throw new Error("No registered-adviser ZIP link found on SEC page");
  return links[0].startsWith("http") ? links[0] : `https://www.sec.gov${links[0]}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const started = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const startRow = Math.max(0, Number(body.start_row) || 0);
    // Keep each call well inside the worker's CPU/memory limit; callers loop
    // on next_row until done (the monthly job does this automatically).
    const maxRows = Math.min(20000, Math.max(500, Number(body.max_rows) || 5000));
    const zipUrl = typeof body.zip_url === "string" && body.zip_url ? body.zip_url : await latestZipUrl();

    const zr = await fetch(zipUrl, { headers: { "User-Agent": UA } });
    if (!zr.ok) return json({ error: `SEC returned ${zr.status}`, zip_url: zipUrl }, 502);
    const files = unzipSync(new Uint8Array(await zr.arrayBuffer()), { filter: (f) => /\.csv$/i.test(f.name) });
    const name = Object.keys(files)[0];
    if (!name) return json({ error: "ZIP contained no CSV", zip_url: zipUrl }, 502);
    // SEC's roster is Windows-1252 encoded.
    const text = new TextDecoder("windows-1252").decode(files[name]);
    const lines = csvRecords(text);
    const header = splitCsvLine(lines[0]);
    const col = (k: string) => header.indexOf(k);
    const iCrd = col("Organization CRD#"), iSec = col("SEC#"), iName = col("Primary Business Name");
    const gCols = ["5G(1)", "5G(2)", "5G(3)", "5G(4)", "5G(5)", "5G(6)", "5G(7)"];
    const missing = [iCrd, iName, ...gCols.map(col)].some((i) => i < 0);
    if (missing) return json({ error: "Unexpected SEC column layout", header: header.slice(0, 20) }, 500);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const totalRows = lines.length - 1;
    const now = new Date().toISOString();
    let row = startRow, upserted = 0, pending: Record<string, unknown>[] = [];
    const flush = async () => {
      if (!pending.length) return;
      const { error } = await supabase.from("sec_adv_services").upsert(pending, { onConflict: "crd" });
      if (error) throw new Error(`DB upsert failed: ${error.message}`);
      upserted += pending.length; pending = [];
    };
    const seen = new Set<string>();
    const endRow = Math.min(totalRows, startRow + maxRows);
    for (; row < endRow; row++) {
      const line = lines[row + 1];
      if (!line) continue;
      const f = splitCsvLine(line);
      if (f.length < header.length / 2) continue;
      const crd = (f[iCrd] || "").trim();
      if (!/^\d+$/.test(crd) || seen.has(crd)) continue;
      seen.add(crd);
      const { services, primary } = deriveServices((k) => (f[col(k)] || "").trim().toUpperCase() === "Y");
      pending.push({
        crd, firm_name: (f[iName] || "").trim() || null, sec_number: iSec >= 0 ? (f[iSec] || "").trim() || null : null,
        services, focus_label: primary, source_file: zipUrl, imported_at: now,
      });
      if (pending.length >= BATCH) {
        await flush();
        if (Date.now() - started > TIME_BUDGET_MS) { row++; break; }
      }
    }
    await flush();
    return json({ ok: true, zip_url: zipUrl, start_row: startRow, next_row: row, total_rows: totalRows, rows_upserted: upserted, done: row >= totalRows, elapsed_ms: Date.now() - started });
  } catch (e) {
    return json({ error: (e as Error).message || "Unknown error" }, 500);
  }
});
