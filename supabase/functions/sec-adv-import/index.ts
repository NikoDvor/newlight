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

function splitCsvLine(line: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur); return out;
}

// Collapse Item 5.G into BDR-friendly labels, in Form ADV order.
export function deriveServices(y: (k: string) => boolean): string[] {
  const s: string[] = [];
  if (y("5G(1)")) s.push("Financial Planning");
  if (y("5G(2)") || y("5G(5)")) s.push("Portfolio Management");
  if (y("5G(6)")) s.push("Pension Consulting");
  if (y("5G(3)") || y("5G(4)")) s.push("Fund Management");
  if (y("5G(7)")) s.push("Adviser Selection");
  return s;
}

async function latestZipUrl(): Promise<string> {
  const html = await (await fetch(PAGE_URL, { headers: { "User-Agent": UA } })).text();
  const links = [...html.matchAll(/href="([^"]+\.zip)"/g)].map((m) => m[1]).filter((h) => !/exempt/i.test(h));
  if (!links.length) throw new Error("No registered-adviser ZIP link found on SEC page");
  return links[0].startsWith("http") ? links[0] : `https://www.sec.gov${links[0]}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const started = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const startRow = Math.max(0, Number(body.start_row) || 0);
    const zipUrl = typeof body.zip_url === "string" && body.zip_url ? body.zip_url : await latestZipUrl();

    const zr = await fetch(zipUrl, { headers: { "User-Agent": UA } });
    if (!zr.ok) return json({ error: `SEC returned ${zr.status}`, zip_url: zipUrl }, 502);
    const files = unzipSync(new Uint8Array(await zr.arrayBuffer()), { filter: (f) => /\.csv$/i.test(f.name) });
    const name = Object.keys(files)[0];
    if (!name) return json({ error: "ZIP contained no CSV", zip_url: zipUrl }, 502);
    // SEC's roster is Windows-1252 encoded.
    const text = new TextDecoder("windows-1252").decode(files[name]);
    const lines = text.split(/\r?\n/);
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
    for (; row < totalRows; row++) {
      const line = lines[row + 1];
      if (!line || !line.trim()) continue;
      const f = splitCsvLine(line);
      const crd = (f[iCrd] || "").trim();
      if (!crd || seen.has(crd)) continue;
      seen.add(crd);
      const services = deriveServices((k) => (f[col(k)] || "").trim().toUpperCase() === "Y");
      pending.push({
        crd, firm_name: (f[iName] || "").trim() || null, sec_number: iSec >= 0 ? (f[iSec] || "").trim() || null : null,
        services, focus_label: services.slice(0, 2).join(" + ") || null, source_file: zipUrl, imported_at: now,
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
