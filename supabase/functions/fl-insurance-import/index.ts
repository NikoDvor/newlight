// Imports the Florida DFS "All Valid Licenses - Business" bulk CSV into
// public.fl_insurance_licensees.
//
// The file is a ~26 MB static snapshot (no API), which is far too large to hold
// in one edge-function invocation, so this runs as a resumable byte-window
// import: each call fetches a Range slice starting at `start_byte`, processes
// whole lines only, and returns `next_byte` to continue from. Call repeatedly
// until `done` is true.
//
// Verified live: the CSV header is
// "License Number","Full Name","NPN Number","Residency Type","License TYCL",
// "License TYCL Desc","License Status","License Issue Date","Email Address",
// "Business Phone","Business Address1","Business Address2","Business City",
// "Business State","Business Zip","Business County","Mailing Address",
// "Mailing Address2","Mailing City","Mailing State","Mailing Zip"
// Several columns are Excel-escaped as ="value" — unwrapped below.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CSV_URL =
  "https://www.myfloridacfo.com/downloads/AAS/LicenseeSearch/AllValidLicensesBusiness.csv";
const TIME_BUDGET_MS = 110_000;
const WINDOW_BYTES = 6 * 1024 * 1024;
const BATCH = 500;

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// RFC4180-ish splitter: handles quoted fields containing commas.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

// Unwrap Excel guards: ="7410936" -> 7410936
const clean = (v: string | undefined) => {
  if (v == null) return null;
  let s = v.trim();
  const m = s.match(/^="?(.*?)"?$/);
  if (m) s = m[1];
  s = s.replace(/^"|"$/g, "").trim();
  return s.length ? s : null;
};

const parseDate = (v: string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const started = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const startByte = Math.max(0, Number(body.start_byte) || 0);
    const windowBytes = Math.max(512 * 1024, Number(body.window_bytes) || WINDOW_BYTES);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const resp = await fetch(CSV_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (NewLightBDR bulk import)",
        Accept: "*/*",
        Range: `bytes=${startByte}-${startByte + windowBytes - 1}`,
      },
    });
    if (!resp.ok && resp.status !== 206) {
      return json({ error: `Florida DFS returned ${resp.status}`, source_url: CSV_URL }, 502);
    }
    const contentRange = resp.headers.get("content-range");
    const totalBytes = contentRange ? Number(contentRange.split("/")[1]) : null;

    const reader = resp.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let consumed = 0; // bytes of complete lines handled
    let rows = 0;
    let inserted = 0;
    let pending: Record<string, unknown>[] = [];
    const seen = new Set<string>();
    let isFirstWindowLine = true;

    const flush = async () => {
      if (!pending.length) return;
      const { error } = await supabase
        .from("fl_insurance_licensees")
        .upsert(pending, { onConflict: "license_number,license_tycl" });
      if (error) throw new Error(`DB upsert failed: ${error.message}`);
      inserted += pending.length;
      pending = [];
    };

    const handleLine = (line: string) => {
      if (isFirstWindowLine) {
        isFirstWindowLine = false;
        // header row (first window) — skip
        if (startByte === 0) return;
      }
      if (!line.trim()) return;
      const f = splitCsvLine(line.replace(/\r$/, ""));
      if (f.length < 16) return;
      const licenseNumber = clean(f[0]);
      const name = clean(f[1]);
      if (!licenseNumber || !name) return;
      const tycl = clean(f[4]) ?? "";
      const key = `${licenseNumber}|${tycl}`;
      if (seen.has(key)) return; // upsert can't touch the same key twice in one batch
      seen.add(key);
      rows++;
      pending.push({
        license_number: licenseNumber,
        license_tycl: tycl,
        business_name: name,
        npn: clean(f[2]),
        residency_type: clean(f[3]),
        license_type: clean(f[5]),
        license_status: clean(f[6]),
        license_issue_date: parseDate(clean(f[7])),
        email: clean(f[8]),
        phone: clean(f[9]),
        address1: clean(f[10]),
        address2: clean(f[11]),
        city: clean(f[12]),
        state: clean(f[13]) ?? "FL",
        zip: clean(f[14]),
        county: clean(f[15]),
        imported_at: new Date().toISOString(),
      });
    };

    let timedOut = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        consumed += new TextEncoder().encode(line).length + 1;
        handleLine(line);
        if (pending.length >= BATCH) await flush();
      }
      if (Date.now() - started > TIME_BUDGET_MS) { timedOut = true; break; }
    }
    await reader.cancel().catch(() => {});
    await flush();

    const nextByte = startByte + consumed;
    const reachedEnd = !timedOut && totalBytes != null && nextByte >= totalBytes;

    return json({
      ok: true,
      start_byte: startByte,
      next_byte: nextByte,
      total_bytes: totalBytes,
      rows_parsed: rows,
      rows_upserted: inserted,
      done: reachedEnd,
      percent: totalBytes ? Math.round((nextByte / totalBytes) * 1000) / 10 : null,
      elapsed_ms: Date.now() - started,
      source_url: CSV_URL,
    });
  } catch (err) {
    return json({ error: (err as Error).message || "Unknown error" }, 500);
  }
});
