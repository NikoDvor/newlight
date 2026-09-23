// Texas Department of Insurance — licensed insurance AGENCIES / businesses.
// Live source: Texas open data portal (Socrata), dataset 3yqc-fcdt
// "Insurance agencies and businesses approved to manage insurance-related products".
//
// Verified live: city values are stored UPPERCASE, so `upper(city)='AUSTIN'` is
// the reliable filter (mirrors how the SEC search handles casing quirks).
// The dataset has one row per license QUALIFICATION, so a single agency appears
// multiple times — rows are deduped by agency_license_number.
// The dataset carries city/state/zip but no street address.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SOCRATA = "https://data.texas.gov/resource/3yqc-fcdt.json";
const PAGE = 1000;

interface Row {
  business_name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  license_type: string | null;
  license_number: string | null;
  npn: string | null;
  source: "TX_DFS";
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const esc = (s: string) => s.replace(/'/g, "''");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const cityRaw = typeof body.city === "string" ? body.city.trim() : "";
    const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
    const maxResults = Math.max(1, Math.min(300, Number(body.max_results) || 50));

    const cities = cityRaw.split(",").map((c) => c.trim()).filter(Boolean);

    if (!cities.length && !keyword) {
      return json({ error: "Provide at least a city or a keyword for the Texas insurance search." }, 400);
    }

    const clauses: string[] = ["upper(state)='TX'"];
    if (cities.length) {
      clauses.push(
        "(" + cities.map((c) => `upper(city)='${esc(c.toUpperCase())}'`).join(" OR ") + ")",
      );
    }
    if (keyword) clauses.push(`upper(org_name) like '%${esc(keyword.toUpperCase())}%'`);
    const where = clauses.join(" AND ");

    const byLicense = new Map<string, Row>();
    const perCity: Record<string, number> = {};
    let rawRows = 0;
    let offset = 0;
    let sourceUrl = "";
    const started = Date.now();

    while (byLicense.size < maxResults && Date.now() - started < 45000) {
      const params = new URLSearchParams({
        $where: where,
        $limit: String(PAGE),
        $offset: String(offset),
        $order: "org_name",
      });
      const url = `${SOCRATA}?${params.toString()}`;
      sourceUrl = url;
      const resp = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "NewLightBDR/1.0 (bdr-lead-sourcing)" },
      });
      if (!resp.ok) {
        const detail = (await resp.text().catch(() => "")).slice(0, 400);
        if (byLicense.size > 0) break; // keep what we already have
        return json({ error: `Texas open data returned ${resp.status}`, detail, source_url: url }, 502);
      }
      const page = await resp.json();
      if (!Array.isArray(page) || page.length === 0) break;
      rawRows += page.length;

      for (const r of page) {
        const lic = String(r.agency_license_number ?? "").trim();
        const key = lic || `npn:${r.npn}|${r.org_name}`;
        const city = r.city ?? null;
        const existing = byLicense.get(key);
        if (existing) {
          // merge the extra qualification into the license type label
          const q = r.qualification ? String(r.qualification) : "";
          if (q && existing.license_type && !existing.license_type.includes(q)) {
            existing.license_type = `${existing.license_type}, ${q}`;
          }
          continue;
        }
        if (city) perCity[city] = (perCity[city] ?? 0) + 1;
        byLicense.set(key, {
          business_name: String(r.org_name ?? "").trim(),
          city,
          state: r.state ?? "TX",
          address: r.pstl_cd ? `${city ?? ""}${city ? ", " : ""}TX ${String(r.pstl_cd).slice(0, 5)}` : null,
          license_type: [r.license_type, r.qualification].filter(Boolean).join(" — ") || null,
          license_number: lic || null,
          npn: r.npn ? String(r.npn) : null,
          source: "TX_DFS",
        });
      }

      if (page.length < PAGE) break;
      offset += PAGE;
    }

    const results = Array.from(byLicense.values()).slice(0, maxResults);

    return json({
      results,
      total: byLicense.size,
      returned: results.length,
      raw_rows_walked: rawRows,
      cities_searched: cities,
      per_city_total: perCity,
      source: "TX DFS",
      source_url: sourceUrl,
      note:
        "Texas Department of Insurance agency licenses via data.texas.gov (dataset 3yqc-fcdt). Deduped by agency license number; the raw dataset lists one row per license qualification. City/ZIP only — no street address published.",
    });
  } catch (err) {
    return json({ error: (err as Error).message || "Unknown error" }, 500);
  }
});
