// Search SEC IAPD (Investment Adviser Public Disclosure) for RIA firms.
// Real data source: https://api.adviserinfo.sec.gov/search/firm
// Returns normalized rows the client can import into nl_bdr_leads.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SEC_ENDPOINT = "https://api.adviserinfo.sec.gov/search/firm";
// SEC's search endpoint caps at ~20 hits/page regardless of requested pageSize.
const SEC_REQUESTED_PAGE_SIZE = 100; // requested; actual returned is typically 20

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

class SecError extends Error {
  constructor(public status: number, public detail: string, public url: string) {
    super(`SEC IAPD returned ${status}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const state = typeof body.state === "string" ? body.state.trim().toUpperCase() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
    const requestedMaxResults = Math.max(1, Math.min(100, Number(body.max_results) || 25));

    if (!keyword && !state && !city) {
      return json({ error: "Provide at least a keyword, state, or city." }, 400);
    }

    // City+state searches walk to completion (see completeness fix), so the
    // record cap is effectively lifted; page cap + time budget are the real
    // safety nets. Broader searches keep tighter depth.
    const maxRawRecords = city && state ? 40000 : state ? 1000 : 500;
    // 500 pages x 20 hits = 10,000 raw records — above the largest single-state
    // universe (CA is ~8,250 firms / ~413 pages). Measured live from the edge
    // runtime: concurrent fetching gets 429'd after ~2,500 records, while a
    // paced one-at-a-time walk sustains ~3 pages/sec cleanly (~130s for all of
    // CA). The time budget below is the real ceiling — it stops the walk and
    // returns partial results well before the edge wall-clock limit, so a deep
    // walk degrades into "fewer records scanned", never a failed request.
    const HARD_PAGE_CAP = 500;
    const TIME_BUDGET_MS = 130000;
    const CONCURRENCY = 1;
    const startedAt = Date.now();

    const cityLower = city ? normalizeCity(city) : "";
    const rawResults: FirmResult[] = [];
    const filtered: FirmResult[] = [];
    const seenCrd = new Set<string>();
    let total = 0;
    let pagesFetched = 0;
    let lastUrl = "";
    let stoppedReason:
      | "end_of_results"
      | "safety_cap"
      | "satisfied"
      | "time_budget"
      | "rate_limited" = "end_of_results";

    // SEC uses `start` offset (Elasticsearch-style), NOT `pageNumber`. Each
    // response returns ~20 hits regardless of pageSize. The `pageNumber` param
    // is silently ignored, so paginating with it just re-fetches page 1.
    const SEC_HITS_PER_PAGE = 20;

    const buildUrl = (start: number) => {
      const params = new URLSearchParams({
        start: String(start),
        pageSize: String(SEC_REQUESTED_PAGE_SIZE),
        size: String(SEC_REQUESTED_PAGE_SIZE),
        hl: "true",
        includePrevious: "false",
        sortField: "Relevance",
        sortOrder: "Desc",
        investorType: "all",
      });
      // SEC treats `query=*` as a literal match-nothing token. Omitting the
      // query param entirely performs a true broad/match-all search.
      if (keyword) params.set("query", keyword);
      if (state) params.set("state", state);
      return `${SEC_ENDPOINT}?${params.toString()}`;
    };

    const parseHits = (hits: any[]): FirmResult[] =>
      hits.map((h: any) => {
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

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    // Adaptive pacing: SEC throttles deep walks from shared edge egress IPs.
    // Once we see a 429 we slow every subsequent request down permanently.
    let paceMs = 50;

    const fetchPage = async (pageNumber: number) => {
      const secUrl = buildUrl((pageNumber - 1) * SEC_HITS_PER_PAGE);
      let lastErr: SecError | null = null;
      for (let attempt = 0; attempt < 6; attempt++) {
        if (attempt > 0) await sleep(1000 * attempt);
        else if (paceMs) await sleep(paceMs);
        const resp = await fetch(secUrl, {
          headers: {
            "User-Agent": "NewLightBDR/1.0 (bdr-lead-sourcing)",
            Accept: "application/json",
          },
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          lastErr = new SecError(resp.status, text.slice(0, 500), secUrl);
          if (resp.status === 429 || resp.status >= 500) {
            paceMs = Math.min(1500, paceMs + 300);
            continue;
          }
          throw lastErr;
        }
        const data = await resp.json();
        return {
          url: secUrl,
          hits: Array.isArray(data?.hits?.hits) ? data.hits.hits : [],
          total: data?.hits?.total ?? 0,
        };
      }
      throw lastErr!;
    };

    let done = false;
    for (let page = 1; page <= HARD_PAGE_CAP && !done; page += CONCURRENCY) {
      const batch: number[] = [];
      for (let i = 0; i < CONCURRENCY && page + i <= HARD_PAGE_CAP; i++) {
        batch.push(page + i);
      }

      let pages;
      try {
        pages = await Promise.all(batch.map(fetchPage));
      } catch (e) {
        if (e instanceof SecError) {
          // Already walked useful data: return partial rather than failing.
          if (rawResults.length > 0) {
            stoppedReason = "rate_limited";
            break;
          }
          return json({
            error: `SEC IAPD returned ${e.status}`,
            detail: e.detail,
            source_url: e.url,
          }, 502);
        }
        throw e;
      }

      for (const p of pages) {
        lastUrl = p.url;
        if (pagesFetched === 0) total = p.total || p.hits.length;
        pagesFetched++;

        const pageRows = parseHits(p.hits);
        rawResults.push(...pageRows);

        // Strict server-side post-filter (SEC's own state filter leaks other
        // states) plus CRD de-duplication (SEC returns some firms twice).
        for (const r of pageRows) {
          if (state && (r.state ?? "").toUpperCase() !== state) continue;
          if (cityLower && normalizeCity(r.city ?? "") !== cityLower) continue;
          if (r.crd && seenCrd.has(r.crd)) continue;
          if (r.crd) seenCrd.add(r.crd);
          filtered.push(r);
        }

        if (p.hits.length === 0) {
          stoppedReason = "end_of_results";
          done = true;
        }
      }

      if (done) break;

      // Without a city filter, stop once we can satisfy the requested count.
      // City searches must exhaust the available raw-result walk so relevant
      // firms ranked deeper by SEC are still counted and can be returned.
      if (!cityLower && filtered.length >= requestedMaxResults) {
        stoppedReason = "satisfied";
        break;
      }

      if (total > 0 && rawResults.length >= total) {
        stoppedReason = "end_of_results";
        break;
      }

      if (rawResults.length >= maxRawRecords) {
        stoppedReason = "safety_cap";
        break;
      }

      if (Date.now() - startedAt >= TIME_BUDGET_MS) {
        stoppedReason = "time_budget";
        break;
      }

      if (page + CONCURRENCY > HARD_PAGE_CAP) {
        stoppedReason = "safety_cap";
      }
    }

    const results = filtered.slice(0, requestedMaxResults);

    return json({
      results,
      total: cityLower ? filtered.length : total,
      sec_total: total,
      city_match_total: cityLower ? filtered.length : null,
      returned: results.length,
      filtered_out: rawResults.length - filtered.length,
      raw_walked: rawResults.length,
      pages_fetched: pagesFetched,
      max_raw_records: maxRawRecords,
      requested_sec_page_size: SEC_REQUESTED_PAGE_SIZE,
      stopped_reason: stoppedReason,
      source: "SEC IAPD",
      source_url: lastUrl,
      note: cityLower
        ? "Completed the available SEC result walk before applying the result limit. AUM requires Form ADV parsing."
        : "Paginated walk with strict post-filter on state. AUM requires Form ADV parsing.",
    });

  } catch (err) {
    return json({ error: (err as Error).message || "Unknown error" }, 500);
  }
});

// Tolerant city comparison: trim, collapse whitespace, strip punctuation
// (periods/commas) so "St. Louis", "st.  louis" and "st louis" all match,
// while staying an exact-equality check (not substring matching).
export function normalizeCity(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
