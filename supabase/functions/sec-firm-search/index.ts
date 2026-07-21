// Search SEC IAPD (Investment Adviser Public Disclosure) for RIA firms.
// Real data source: https://api.adviserinfo.sec.gov/search/firm
// Returns normalized rows the client can import into nl_bdr_leads.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SEC_ENDPOINT = "https://api.adviserinfo.sec.gov/search/firm";
// SEC's search endpoint caps at ~20 hits/page regardless of requested pageSize.
const SEC_PAGE_SIZE = 100; // requested; actual returned is typically 20

interface FirmResult {
  crd: string;
  firm_name: string;
  city: string | null;
  state: string | null;
  street: string | null;
  sec_number: string | null;
  scope: string | null;
  branches: number | null;
  iapd_url: string;
  aum: null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const state = typeof body.state === "string" ? body.state.trim().toUpperCase() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
    const pageSize = Math.max(1, Math.min(100, Number(body.max_results) || 25));

    if (!keyword && !state && !city) {
      return json({ error: "Provide at least a keyword, state, or city." }, 400);
    }

    // Scale raw-record depth by filter narrowness. SEC returns ~20 hits/page
    // regardless of requested pageSize, so cap in terms of records, not pages.
    const maxRawRecords = city && state ? 2500 : state ? 1500 : 500;
    const HARD_PAGE_CAP = 150; // absolute safety net

    const cityLower = city.toLowerCase();
    const rawResults: FirmResult[] = [];
    const filtered: FirmResult[] = [];
    let total = 0;
    let pagesFetched = 0;
    let lastUrl = "";
    let stoppedReason: "end_of_results" | "safety_cap" | "satisfied" = "end_of_results";

    // SEC uses `start` offset (Elasticsearch-style), NOT `pageNumber`. Each
    // response returns ~20 hits regardless of pageSize. The `pageNumber` param
    // is silently ignored, so paginating with it just re-fetches page 1.
    const SEC_HITS_PER_PAGE = 20;

    for (let pageNumber = 1; pageNumber <= HARD_PAGE_CAP; pageNumber++) {
      const start = (pageNumber - 1) * SEC_HITS_PER_PAGE;
      const params = new URLSearchParams({
        query: keyword || "*",
        start: String(start),
        hl: "true",
        includePrevious: "false",
        sortField: "Relevance",
        sortOrder: "Desc",
        investorType: "all",
      });
      if (state) params.set("state", state);

      const secUrl = `${SEC_ENDPOINT}?${params.toString()}`;
      lastUrl = secUrl;
      const resp = await fetch(secUrl, {
        headers: {
          "User-Agent": "NewLightBDR/1.0 (bdr-lead-sourcing)",
          Accept: "application/json",
        },
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        return json({
          error: `SEC IAPD returned ${resp.status}`,
          detail: text.slice(0, 500),
          source_url: secUrl,
        }, 502);
      }

      const data = await resp.json();
      const hits = Array.isArray(data?.hits?.hits) ? data.hits.hits : [];
      if (pageNumber === 1) total = data?.hits?.total ?? hits.length;
      pagesFetched++;

      const pageRows: FirmResult[] = hits.map((h: any) => {
        const s = h?._source ?? {};
        let addr: any = {};
        try {
          addr = typeof s.firm_ia_address_details === "string"
            ? JSON.parse(s.firm_ia_address_details)?.officeAddress ?? {}
            : {};
        } catch { /* ignore */ }
        const crd = String(s.firm_source_id ?? "");
        return {
          crd,
          firm_name: s.firm_name ?? "",
          city: addr.city ?? null,
          state: addr.state ?? null,
          street: [addr.street1, addr.street2].filter(Boolean).join(", ") || null,
          sec_number: s.firm_ia_full_sec_number ? String(s.firm_ia_full_sec_number) : null,
          scope: s.firm_ia_scope ?? null,
          branches: typeof s.firm_branches_count === "number" ? s.firm_branches_count : null,
          iapd_url: crd ? `https://adviserinfo.sec.gov/firm/summary/${crd}` : "",
          aum: null,
        };
      });

      rawResults.push(...pageRows);

      // Strict server-side post-filter (SEC's own state filter leaks other states)
      for (const r of pageRows) {
        if (state && (r.state ?? "").toUpperCase() !== state) continue;
        if (cityLower && (r.city ?? "").toLowerCase() !== cityLower) continue;
        filtered.push(r);
      }

      // Short-circuit once we've satisfied the requested count
      if (filtered.length >= pageSize) {
        stoppedReason = "satisfied";
        break;
      }

      // End of SEC's results — empty page, or we've walked the full total
      if (hits.length === 0 || (total > 0 && rawResults.length >= total)) {
        stoppedReason = "end_of_results";
        break;
      }

      // Record-count safety cap scaled to filter narrowness
      if (rawResults.length >= maxRawRecords) {
        stoppedReason = "safety_cap";
        break;
      }

      if (pageNumber === HARD_PAGE_CAP) {
        stoppedReason = "safety_cap";
      }
    }

    const results = filtered.slice(0, pageSize);

    return json({
      results,
      total,
      returned: results.length,
      filtered_out: rawResults.length - filtered.length,
      raw_walked: rawResults.length,
      pages_fetched: pagesFetched,
      max_raw_records: maxRawRecords,
      stopped_reason: stoppedReason,
      source: "SEC IAPD",
      source_url: lastUrl,
      note: "Paginated walk with strict post-filter on state+city. AUM requires Form ADV parsing.",
    });

  } catch (err) {
    return json({ error: (err as Error).message || "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
