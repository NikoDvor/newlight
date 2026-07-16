// Search SEC IAPD (Investment Adviser Public Disclosure) for RIA firms.
// Real data source: https://api.adviserinfo.sec.gov/search/firm
// Returns normalized rows the client can import into nl_bdr_leads.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SEC_ENDPOINT = "https://api.adviserinfo.sec.gov/search/firm";

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
  // AUM is not exposed in the search index; would require parsing Form ADV PDFs.
  aum: null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const state = typeof body.state === "string" ? body.state.trim().toUpperCase() : "";
    const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
    const pageSize = Math.max(1, Math.min(50, Number(body.max_results) || 25));

    if (!keyword && !state) {
      return json({ error: "Provide at least a keyword or a state." }, 400);
    }

    const params = new URLSearchParams({
      query: keyword || "*",
      pageNumber: "1",
      pageSize: String(pageSize),
      hl: "true",
      includePrevious: "false",
      sortField: "Relevance",
      sortOrder: "Desc",
      investorType: "all",
    });
    if (state) params.set("state", state);

    const secUrl = `${SEC_ENDPOINT}?${params.toString()}`;
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
    const total = data?.hits?.total ?? hits.length;

    const results: FirmResult[] = hits.map((h: any) => {
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

    return json({
      results,
      total,
      returned: results.length,
      source: "SEC IAPD",
      source_url: secUrl,
      note: "AUM is not exposed by the SEC IAPD search index. Enable AUM enrichment by fetching Form ADV Part 1 filings in a follow-up.",
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
