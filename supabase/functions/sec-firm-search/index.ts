// Search SEC IAPD (Investment Adviser Public Disclosure) for RIA firms.
// Real data source: https://api.adviserinfo.sec.gov/search/firm
// Returns normalized rows the client can import into nl_bdr_leads.
//
// Architecture note (verified live): SEC's search endpoint accepts a native
// `city` parameter. Using it scopes the walk to ~9 pages instead of paging
// through an entire state (CA = 413 pages), which avoids SEC's deep-pagination
// instability — measured live, a full statewide walk silently repeats some
// records and drops others (Arlington Financial Advisors, Ariadne Wealth
// Management, Omega Financial Group, Monarch Wealth Strategies, Certis Capital
// Management, Bourke Wealth Management, Athens Capital Management were all
// lost that way despite existing in SEC's data).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SEC_ENDPOINT = "https://api.adviserinfo.sec.gov/search/firm";
const SEC_REQUESTED_PAGE_SIZE = 100; // requested; SEC returns 20 per page
const SEC_HITS_PER_PAGE = 20;

interface FirmResult {
  crd: string;
  firm_name: string;
  city: string | null;
  state: string | null;
  street: string | null;
  sec_number: string | null;
  scope: string | null;
  /** true = Exempt Reporting Adviser (private-fund-only), false = registered, null = unknown */
  is_exempt_reporting?: boolean | null;
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
    const cityRaw = typeof body.city === "string" ? body.city.trim() : "";
    const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
    const requestedMaxResults = Math.max(1, Math.min(300, Number(body.max_results) || 25));

    if (!keyword && !state && !cityRaw) {
      return json({ error: "Provide at least a keyword, state, or city." }, 400);
    }

    // The city field accepts a comma-separated list so a rep can cover a metro
    // and its neighboring towns in one pass (e.g. "Santa Barbara, Montecito,
    // Goleta, Carpinteria, Summerland").
    const cities = cityRaw
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    const cityKeys = new Set(cities.map(normalizeCity));

    const HARD_PAGE_CAP = 500; // per search scope
    const TIME_BUDGET_MS = 90000;
    const startedAt = Date.now();

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

    // Single Relevance pass for every scope. The dual-sort merge was measured
    // against the 413-page STATEWIDE walk, where deep pagination is lossy and
    // the two orders drop different records. A city-scoped walk with SEC's
    // native city filter is shallow (~10 pages for a large metro), well under
    // that instability — a second sort pass only doubles the request volume
    // and trips SEC's rate limiter, which is what actually loses pages.
    const SORTS: { field: string; order: string }[] = [{ field: "Relevance", order: "Desc" }];

    const buildUrl = (start: number, city: string | null, sort = SORTS[0]) => {
      const params = new URLSearchParams({
        start: String(start),
        pageSize: String(SEC_REQUESTED_PAGE_SIZE),
        size: String(SEC_REQUESTED_PAGE_SIZE),
        hl: "true",
        includePrevious: "false",
        sortField: sort.field,
        sortOrder: sort.order,
        investorType: "all",
      });
      // SEC treats `query=*` as a literal match-nothing token. Omitting the
      // query param entirely performs a true broad/match-all search.
      if (keyword) params.set("query", keyword);
      if (state) params.set("state", state);
      if (city) params.set("city", city);
      return `${SEC_ENDPOINT}?${params.toString()}`;
    };

    const parseHits = (hits: any[]): FirmResult[] =>
      hits.map((h: any) => {
        const s = h?._source ?? {};
        let addr: any = {};
        try {
          const detail = s.firm_ia_address_details ?? s.firm_address_details;
          addr = typeof detail === "string" ? JSON.parse(detail)?.officeAddress ?? {} : {};
        } catch { /* ignore */ }
        const crd = String(s.firm_source_id ?? "");
        return {
          crd,
          firm_name: s.firm_name ?? "",
          city: addr.city ?? null,
          state: addr.state ?? null,
          street: [addr.street1, addr.street2].filter(Boolean).join(", ") || null,
          sec_number: s.firm_ia_full_sec_number ? String(s.firm_ia_full_sec_number) : null,
          scope: s.firm_ia_scope ?? s.firm_scope ?? null,
          branches: typeof s.firm_branches_count === "number" ? s.firm_branches_count : null,
          iapd_url: crd ? `https://adviserinfo.sec.gov/firm/summary/${crd}` : "",
          aum: null,
        };
      });

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let paceMs = 250;
    let skippedPages = 0;
    const missedPages: { page: number; city: string | null; sort: { field: string; order: string } }[] = [];

    // SEC intermittently answers with {errorCode: -1, "Search unavailable"} and
    // a null hits payload — verified live, it succeeds on retry.
    const fetchPage = async (pageNumber: number, city: string | null, sort = SORTS[0]) => {
      const secUrl = buildUrl((pageNumber - 1) * SEC_HITS_PER_PAGE, city, sort);
      let lastErr: SecError | null = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        if (Date.now() - startedAt >= TIME_BUDGET_MS) {
          throw new SecError(504, "Time budget reached", secUrl);
        }
        if (attempt > 0) await sleep(800 * attempt);
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
        const hits = data?.hits?.hits;
        if (!Array.isArray(hits)) {
          lastErr = new SecError(
            503,
            String(data?.errorMessage ?? "Search unavailable").slice(0, 200),
            secUrl,
          );
          continue; // transient SEC error — retry
        }
        return { url: secUrl, hits, total: data?.hits?.total ?? 0 };
      }
      throw lastErr!;
    };

    // Verified live: SEC's city filter is case-sensitive in an inconsistent
    // way — "SANTA BARBARA" returns 181 records while "Santa Barbara" returns
    // 66, yet "MONTECITO" errors where "Montecito" works. So probe the case
    // variants and walk whichever yields the most records.
    const titleCase = (s: string) =>
      s.toLowerCase().replace(/(^|[\s\-'])([a-z])/g, (_m, p, c) => p + c.toUpperCase());

    const resolveCity = async (city: string) => {
      // Probe ALL casing variants and keep the one yielding the largest set.
      // Returning the first non-zero variant made the walk vulnerable to a
      // transient SEC error on the first probe: it would silently fall through
      // to a lower-total variant (e.g. "Santa Barbara" = 66 vs "SANTA BARBARA"
      // = 181) and never cover the missing firms.
      const variants = Array.from(new Set([city.toUpperCase(), titleCase(city), city]));
      let best: { variant: string; total: number } | null = null;
      for (const v of variants) {
        try {
          const p = await fetchPage(1, v);
          const t = p.total || p.hits.length;
          if (t > 0 && (!best || t > best.total)) best = { variant: v, total: t };
        } catch { /* variant unusable — try the others */ }
      }
      return best;
    };

    // One scope per city (native SEC city filter), or a single statewide /
    // keyword scope when no city was given.
    const scopes: (string | null)[] = cities.length ? cities : [null];
    const perCityTotals: Record<string, number> = {};

    outer:
    for (const rawScopeCity of scopes) {
      let scopeCity = rawScopeCity;
      if (scopeCity) {
        const resolved = await resolveCity(scopeCity);
        if (!resolved || resolved.total === 0) continue;
        scopeCity = resolved.variant;
      }
      for (const sort of SORTS) {
      if (Date.now() - startedAt >= TIME_BUDGET_MS) {
        stoppedReason = "time_budget";
        break outer;
      }
      let scopeTotal = 0;
      for (let page = 1; page <= HARD_PAGE_CAP; page++) {
        let p;
        try {
          p = await fetchPage(page, scopeCity, sort);
        } catch (e) {
          if (e instanceof SecError) {
            // A transient SEC failure skips this page only — keep walking the
            // rest of the city so one flaky response can't truncate results.
            if (rawResults.length > 0) {
              stoppedReason = "rate_limited";
              skippedPages++;
              missedPages.push({ page, city: scopeCity, sort });
              if (scopeTotal > 0 && page * SEC_HITS_PER_PAGE >= scopeTotal) break;
              continue;
            }
            return json({
              error: `SEC IAPD returned ${e.status}`,
              detail: e.detail,
              source_url: e.url,
            }, 502);
          }
          throw e;
        }

        lastUrl = p.url;
        if (page === 1) {
          scopeTotal = p.total || p.hits.length;
          if (sort === SORTS[0]) {
            total += scopeTotal;
            if (scopeCity) perCityTotals[scopeCity] = scopeTotal;
          }
        }
        pagesFetched++;

        const pageRows = parseHits(p.hits);
        rawResults.push(...pageRows);

        // Safety net: SEC's own city/state matching can be looser than exact.
        // Should rarely reject anything now that the city is native.
        for (const r of pageRows) {
          if (state && (r.state ?? "").toUpperCase() !== state) continue;
          if (cityKeys.size && !cityKeys.has(normalizeCity(r.city ?? ""))) continue;
          if (r.crd && seenCrd.has(r.crd)) continue; // dedupe by CRD
          if (r.crd) seenCrd.add(r.crd);
          filtered.push(r);
        }

        if (p.hits.length === 0) break; // end of this scope
        if (scopeTotal > 0 && page * SEC_HITS_PER_PAGE >= scopeTotal) break;

        if (!cityKeys.size && filtered.length >= requestedMaxResults) {
          stoppedReason = "satisfied";
          break outer;
        }
        if (Date.now() - startedAt >= TIME_BUDGET_MS) {
          stoppedReason = "time_budget";
          break outer;
        }
        if (page === HARD_PAGE_CAP) stoppedReason = "safety_cap";
      }
      }
    }

    // Second chance for pages SEC failed on: retry them once at the end, when
    // the burst of requests that caused the throttling has passed.
    let recoveredPages = 0;
    for (const m of missedPages) {
      if (Date.now() - startedAt >= TIME_BUDGET_MS) break;
      try {
        const p = await fetchPage(m.page, m.city, m.sort);
        recoveredPages++;
        pagesFetched++;
        const pageRows = parseHits(p.hits);
        rawResults.push(...pageRows);
        for (const r of pageRows) {
          if (state && (r.state ?? "").toUpperCase() !== state) continue;
          if (cityKeys.size && !cityKeys.has(normalizeCity(r.city ?? ""))) continue;
          if (r.crd && seenCrd.has(r.crd)) continue;
          if (r.crd) seenCrd.add(r.crd);
          filtered.push(r);
        }
      } catch { /* still unavailable — leave it counted as skipped */ }
    }
    skippedPages -= recoveredPages;
    if (skippedPages <= 0 && stoppedReason === "rate_limited") {
      skippedPages = 0;
      stoppedReason = "end_of_results";
    }

    const results = filtered.slice(0, requestedMaxResults);

    // Exempt Reporting Adviser detection (verified live against SEC IAPD):
    // - SEC file number "802-" = SEC exempt reporting adviser; "801-" = registered.
    // - No SEC number = state-registered RIA OR state ERA; the firm detail
    //   record's orgScopeStatusFlags disambiguates (isERARegistered=Y with
    //   isSECRegistered=N and isStateRegistered=N).
    const needDetail: FirmResult[] = [];
    for (const r of results) {
      const sec = r.sec_number ?? "";
      if (sec.startsWith("802-")) r.is_exempt_reporting = true;
      else if (sec.startsWith("801-")) r.is_exempt_reporting = false;
      else if (r.crd) needDetail.push(r);
    }
    const DETAIL_CONCURRENCY = 6;
    for (let i = 0; i < needDetail.length; i += DETAIL_CONCURRENCY) {
      if (Date.now() - startedAt >= TIME_BUDGET_MS + 15000) break;
      await Promise.all(needDetail.slice(i, i + DETAIL_CONCURRENCY).map(async (r) => {
        try {
          const resp = await fetch(`${SEC_ENDPOINT}/${r.crd}`, {
            headers: { "User-Agent": "NewLightBDR/1.0 (bdr-lead-sourcing)", Accept: "application/json" },
          });
          if (!resp.ok) return;
          const d = await resp.json();
          const raw = d?.hits?.hits?.[0]?._source?.iacontent;
          const c = typeof raw === "string" ? JSON.parse(raw) : raw;
          const f = c?.orgScopeStatusFlags;
          if (!f) return;
          r.is_exempt_reporting =
            f.isERARegistered === "Y" && f.isSECRegistered !== "Y" && f.isStateRegistered !== "Y";
        } catch { /* unknown — leave null so it stays visible */ }
      }));
    }

    return json({
      results,
      total: cityKeys.size ? filtered.length : total,
      sec_total: total,
      city_match_total: cityKeys.size ? filtered.length : null,
      cities_searched: cities,
      per_city_sec_total: cityKeys.size ? perCityTotals : null,
      returned: results.length,
      filtered_out: rawResults.length - filtered.length,
      raw_walked: rawResults.length,
      pages_fetched: pagesFetched,
      skipped_pages: skippedPages,
      requested_sec_page_size: SEC_REQUESTED_PAGE_SIZE,
      stopped_reason: stoppedReason,
      source: "SEC IAPD",
      source_url: lastUrl,
      note: cityKeys.size
        ? "Queried SEC's native city filter per city, deduped by CRD. AUM requires Form ADV parsing."
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
