import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Download, CheckCircle2, ExternalLink, AlertTriangle, Loader2, Copy, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useEmployeeClientId } from "@/hooks/useEmployeeClientId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

type SourceKey = "SEC" | "TX_DFS" | "FL_DFS";

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
  source: SourceKey;
  license_type?: string | null;
  license_number?: string | null;
  /** Plain firm-type label (SEC Form ADV Item 5.G, or "Insurance"). */
  focus?: string | null;
  services?: string[];
}

type MatchType = "none" | "hard_crd" | "soft_name_city";
interface ClaimStatus {
  match_type: MatchType;
  claimed_by_self: boolean;
  claimed_by_name: string | null;
}

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA",
  "MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN",
  "TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

const INSURANCE_STATES = ["TX", "FL"];

const SOURCE_LABEL: Record<SourceKey, string> = {
  SEC: "SEC IAPD",
  TX_DFS: "TX DFS",
  FL_DFS: "FL DFS",
};

const SOURCE_STYLE: Record<SourceKey, { bg: string; fg: string }> = {
  SEC: { bg: "hsla(210,90%,55%,.15)", fg: "hsl(210,90%,70%)" },
  TX_DFS: { bg: "hsla(28,90%,55%,.15)", fg: "hsl(28,90%,68%)" },
  FL_DFS: { bg: "hsla(160,70%,45%,.15)", fg: "hsl(160,70%,58%)" },
};

function rowKey(r: FirmResult) {
  return r.crd
    ? `crd:${r.crd}`
    : `${r.source}:${(r.firm_name || "").toLowerCase()}|${(r.city || "").toLowerCase()}|${r.license_number ?? ""}`;
}

export default function BDRLeadSourcing() {
  const { user } = useWorkspace();
  const { clientId } = useEmployeeClientId();

  const [state, setState] = useState("CA");
  const [city, setCity] = useState("");
  const [keyword, setKeyword] = useState("wealth");
  const [minAum, setMinAum] = useState("");
  const [maxAum, setMaxAum] = useState("");
  const [maxResults, setMaxResults] = useState(25);
  const [loading, setLoading] = useState(false);
  const [insLoading, setInsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FirmResult[]>([]);
  const [meta, setMeta] = useState<{ total: number; source: string; note?: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [listName, setListName] = useState("SEC IAPD Import");
  const [claimMap, setClaimMap] = useState<Record<string, ClaimStatus>>({});

  const insuranceAvailable = INSURANCE_STATES.includes(state);

  async function checkClaimsBatch(rows: FirmResult[]) {
    if (!rows.length) return;
    const payload = rows.map((r) => ({ crd: r.crd || "", name: r.firm_name || "", city: r.city || "" }));
    const { data, error } = await (supabase as any).rpc("check_sec_results_claimed", { _rows: payload });
    if (error) {
      console.warn("check_sec_results_claimed failed:", error.message);
      return;
    }
    const map: Record<string, ClaimStatus> = {};
    (data || []).forEach((d: any, i: number) => {
      const k = rowKey(rows[i]);
      map[k] = {
        match_type: (d.match_type as MatchType) || "none",
        claimed_by_self: !!d.claimed_by_self,
        claimed_by_name: d.claimed_by_name ?? null,
      };
    });
    // Merge so an insurance search doesn't drop claim flags already computed
    // for SEC rows still showing in the table (and vice versa).
    setClaimMap((prev) => ({ ...prev, ...map }));
  }

  async function runSearch() {
    setLoading(true); setError(null); setResults([]); setMeta(null); setSelected(new Set()); setClaimMap({});
    try {
      const { data, error } = await supabase.functions.invoke("sec-firm-search", {
        body: {
          state,
          city: city.trim() || null,
          keyword,
          min_aum: minAum ? Number(minAum) : null,
          max_aum: maxAum ? Number(maxAum) : null,
          max_results: maxResults,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) {
        setError(`SEC fetch failed: ${(data as any).error}${(data as any).detail ? ` — ${(data as any).detail}` : ""}`);
        return;
      }
      const rows: FirmResult[] = ((data as any)?.results || []).map((r: any) => ({ ...r, source: "SEC" as const }));
      // Join to SEC Form ADV Item 5.G services by CRD for the Focus badge.
      const crds = rows.map((r) => r.crd).filter(Boolean);
      if (crds.length) {
        const { data: svc } = await (supabase as any).from("sec_adv_services")
          .select("crd, focus_label, services").in("crd", crds);
        const byCrd = new Map<string, any>((svc || []).map((s: any) => [s.crd, s]));
        rows.forEach((r) => {
          const s = byCrd.get(r.crd);
          if (s) { r.focus = s.focus_label ?? null; r.services = s.services ?? []; }
        });
      }
      setResults(rows);
      setMeta({ total: (data as any).total ?? rows.length, source: (data as any).source, note: (data as any).note });
      // Fire duplicate check in the background
      checkClaimsBatch(rows);
    } catch (e: any) {
      setError(`SEC fetch failed: ${e?.message || String(e)}`);
    } finally { setLoading(false); }
  }

  async function runInsuranceSearch() {
    if (!insuranceAvailable) return;
    const fn = state === "TX" ? "tx-insurance-search" : "fl-insurance-search";
    const sourceKey: SourceKey = state === "TX" ? "TX_DFS" : "FL_DFS";
    setInsLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke(fn, {
        body: { city: city.trim() || null, keyword: keyword.trim() || null, max_results: maxResults },
      });
      if (error) throw error;
      if ((data as any)?.error) {
        setError(`${SOURCE_LABEL[sourceKey]} fetch failed: ${(data as any).error}`);
        return;
      }
      const rows: FirmResult[] = ((data as any)?.results || []).map((r: any) => ({
        crd: "",
        firm_name: r.business_name,
        city: r.city ?? null,
        state: r.state ?? state,
        street: r.address ?? null,
        sec_number: null,
        scope: r.license_status ?? "LICENSED",
        branches: null,
        iapd_url: "",
        aum: null,
        source: sourceKey,
        license_type: r.license_type ?? null,
        license_number: r.license_number ?? null,
        focus: "Insurance",
      }));

      // APPEND to whatever is already on screen; dedupe against existing rows.
      let added: FirmResult[] = [];
      setResults((prev) => {
        const seen = new Set(prev.map(rowKey));
        added = rows.filter((r) => !seen.has(rowKey(r)));
        return [...prev, ...added];
      });
      setMeta((prev) => ({
        total: (prev?.total ?? 0) + rows.length,
        source: prev?.source ? `${prev.source} + ${(data as any).source}` : (data as any).source,
        note: (data as any).note,
      }));
      checkClaimsBatch(rows);
      toast({
        title: `Added ${rows.length} ${SOURCE_LABEL[sourceKey]} record${rows.length !== 1 ? "s" : ""}`,
        description: rows.length ? "Appended below your existing results." : "No licensed agencies matched those filters.",
      });
    } catch (e: any) {
      setError(`Insurance license fetch failed: ${e?.message || String(e)}`);
    } finally { setInsLoading(false); }
  }

  function toggleOne(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function importRows(rows: FirmResult[]) {
    if (!user?.id || !clientId) {
      toast({ title: "Not signed in", variant: "destructive" });
      return;
    }
    if (rows.length === 0) return;
    setImporting(true);
    const cleanList = listName.trim() || null;
    const inserts = rows.map((r) => ({
      user_id: user.id,
      client_id: clientId,
      business_name: r.firm_name,
      city: [r.city, r.state].filter(Boolean).join(", ") || null,
      website: r.iapd_url || null,
      crd: r.crd || null,
      niche: r.focus || null,
      notes: [
        r.source === "SEC" ? `Sourced from SEC IAPD.` : `Sourced from ${SOURCE_LABEL[r.source]} insurance licensing.`,
        r.sec_number ? `SEC #: ${r.sec_number}` : null,
        r.crd ? `CRD: ${r.crd}` : null,
        r.license_number ? `License #: ${r.license_number}` : null,
        r.license_type ? `License type: ${r.license_type}` : null,
        r.street ? `Address: ${r.street}` : null,
        r.branches != null ? `Branches: ${r.branches}` : null,
      ].filter(Boolean).join("\n"),
      list_name: cleanList,
      lead_source: r.source === "SEC" ? "sec_iapd_scrape" : r.source === "TX_DFS" ? "tx_dfs_insurance" : "fl_dfs_insurance",
      source_type: r.source === "SEC" ? "financial_advisor_scrape" : "insurance_agency_scrape",
    }));
    const { error } = await (supabase as any).from("nl_bdr_leads").insert(inserts);
    setImporting(false);
    if (error) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
      return;
    }
    setImported((prev) => {
      const next = new Set(prev);
      rows.forEach((r) => next.add(rowKey(r)));
      return next;
    });
    setSelected(new Set());
    toast({
      title: `Imported ${rows.length} lead${rows.length !== 1 ? "s" : ""}`,
      description: `Sent to My Leads${cleanList ? ` → "${cleanList}"` : ""}.`,
    });
  }

  async function copyForClaude() {
    if (!results.length) return;
    const eligible = results.filter((r) => {
      const c = claimMap[rowKey(r)];
      return !c || c.match_type === "none";
    });
    const excluded = results.length - eligible.length;
    if (!eligible.length) {
      toast({ title: "Nothing to copy", description: "All results are already claimed or likely duplicates.", variant: "destructive" });
      return;
    }
    const header = "Business Name | City | CRD | Source";
    const sep = "--- | --- | --- | ---";
    const body = eligible
      .map((r) => `${r.firm_name} | ${[r.city, r.state].filter(Boolean).join(", ") || "—"} | ${r.crd || r.license_number || "—"} | ${SOURCE_LABEL[r.source]}`)
      .join("\n");
    const text = `${header}\n${sep}\n${body}\n`;
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: `Copied ${eligible.length} row${eligible.length !== 1 ? "s" : ""} for Claude`,
        description: excluded > 0
          ? `${excluded} already-claimed / likely-duplicate row${excluded !== 1 ? "s" : ""} excluded.`
          : "Paste into your Lead Researcher prompt.",
      });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard access blocked by browser.", variant: "destructive" });
    }
  }

  const selectedRows = results.filter((r) => selected.has(rowKey(r)));
  const dupSummary = (() => {
    let hard = 0, soft = 0;
    results.forEach((r) => {
      const c = claimMap[rowKey(r)];
      if (c?.match_type === "hard_crd") hard++;
      else if (c?.match_type === "soft_name_city") soft++;
    });
    return { hard, soft };
  })();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lead Sourcing — SEC IAPD & State Insurance Licenses</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search state- and SEC-registered investment adviser firms in real time from adviserinfo.sec.gov, plus licensed
          insurance agencies in Texas and Florida, then push any row directly into your My Leads pipeline.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
          <div>
            <Label className="text-xs">State</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ANY">Any state</SelectItem>
                {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Santa Barbara, Montecito, Goleta" className="h-9" />
            <p className="text-[11px] text-muted-foreground mt-1">
              Separate multiple towns with commas to cover neighboring markets in one search.
            </p>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Keyword</Label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="wealth, retirement, planning…" className="h-9" />
            <p className="text-[11px] text-muted-foreground mt-1">
              Matches firm names only. Use one word — multi-word phrases like “financial services” are matched much more strictly by SEC and often return nothing. Leave blank to scan every firm in the state (most complete, takes up to ~2 minutes).
            </p>
            {keyword.trim().split(/\s+/).length > 1 && (
              <p className="text-[11px] text-amber-500 mt-1">
                Multi-word keyword detected — try just “{keyword.trim().split(/\s+/)[0]}” if results look too low.
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs">Min AUM ($M)</Label>
            <Input type="number" value={minAum} onChange={(e) => setMinAum(e.target.value)} placeholder="—" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Max AUM ($M)</Label>
            <Input type="number" value={maxAum} onChange={(e) => setMaxAum(e.target.value)} placeholder="—" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Max results</Label>
            <Input type="number" value={maxResults} min={1} max={300}
              onChange={(e) => setMaxResults(Math.max(1, Math.min(300, Number(e.target.value) || 25)))} className="h-9" />
            <p className="text-[11px] text-muted-foreground mt-1">
              Larger metro areas can have hundreds of firms — raising this for a city search is expected, not unusual.
            </p>
          </div>
          <div className="md:col-span-7 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-[11px] text-muted-foreground max-w-xl">
              AUM filters accepted but not applied server-side yet — SEC's search index doesn't return AUM. Follow-up will pull Form ADV Part 1 filings for enrichment. Insurance license search covers Texas and Florida only and ignores the AUM filters.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
              <div className="flex-1 sm:flex-none sm:w-56">
                <Label className="text-xs sm:hidden">Import list name</Label>
                <Input value={listName} onChange={(e) => setListName(e.target.value)} placeholder="Import list name" className="h-9 w-full" />
              </div>
              <Button onClick={runSearch} disabled={loading} className="h-9 w-full sm:w-auto">
                {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}
                Search SEC IAPD
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="w-full sm:w-auto">
                      <Button
                        variant="outline"
                        onClick={runInsuranceSearch}
                        disabled={!insuranceAvailable || insLoading}
                        className="h-9 w-full sm:w-auto"
                      >
                        {insLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                        Insurance License Search
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {insuranceAvailable
                      ? `Adds licensed ${state} insurance agencies to your current results.`
                      : "Insurance license search only available for TX and FL currently"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Errors */}
      {error && (
        <div className="rounded-xl p-4 flex gap-3" style={{ background: "hsla(0,72%,50%,.08)", border: "1px solid hsla(0,72%,50%,.35)" }}>
          <AlertTriangle className="h-5 w-5 shrink-0" style={{ color: "hsl(0,72%,65%)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "hsl(0,72%,75%)" }}>Real fetch failed — no fabricated data shown</p>
            <p className="text-xs text-muted-foreground mt-1 break-all">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm font-semibold">Results ({results.length} of {meta?.total?.toLocaleString?.() ?? results.length})</CardTitle>
              {meta?.note && <p className="text-[11px] text-muted-foreground mt-1">{meta.note}</p>}
              {(dupSummary.hard > 0 || dupSummary.soft > 0) && (
                <p className="text-[11px] mt-1">
                  {dupSummary.hard > 0 && <span style={{ color: "hsl(142,72%,55%)" }}>{dupSummary.hard} already imported</span>}
                  {dupSummary.hard > 0 && dupSummary.soft > 0 && <span className="text-muted-foreground"> · </span>}
                  {dupSummary.soft > 0 && <span style={{ color: "hsl(38,95%,65%)" }}>{dupSummary.soft} likely duplicate</span>}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={copyForClaude}>
                <Copy className="h-3 w-3 mr-1" />
                Copy for Claude Research
              </Button>
              <Button variant="outline" size="sm" disabled={selected.size === 0 || importing} onClick={() => importRows(selectedRows)}>
                {importing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                Import Selected ({selected.size})
              </Button>
              <Button size="sm" disabled={importing || results.length === 0} onClick={() => importRows(results)}>
                Import All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 min-h-0">
            <div className="max-h-[70dvh] overflow-auto overscroll-contain">
              <table className="nl-native-table w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    <Th className="w-8"></Th><Th>Firm</Th><Th>Source</Th><Th>Location</Th><Th>CRD</Th><Th>SEC #</Th><Th>Branches</Th><Th>Status</Th><Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const key = rowKey(r);
                    const isImported = imported.has(key);
                    const claim = claimMap[key];
                    const isHard = claim?.match_type === "hard_crd";
                    const isSoft = claim?.match_type === "soft_name_city";
                    const dim = isImported;
                    const srcStyle = SOURCE_STYLE[r.source];
                    return (
                      <motion.tr key={key + "-" + i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 30) * 0.02 }}
                        className="border-b border-white/[0.04] hover:bg-white/[0.03]"
                        style={dim ? { opacity: 0.55 } : undefined}>
                        <Td>
                          <input type="checkbox" checked={selected.has(key)} onChange={() => toggleOne(key)} disabled={isImported}
                            className="h-4 w-4 accent-primary" />
                        </Td>
                        <Td>
                          <div className="flex flex-col gap-0.5">
                            <span className={`font-medium ${dim ? "line-through text-muted-foreground" : "text-foreground"}`}>{r.firm_name}</span>
                            {r.license_type && (
                              <span className="text-[10px] text-muted-foreground">{r.license_type}</span>
                            )}
                            {isHard && (
                              <span className="text-[10px] font-semibold" style={{ color: "hsl(142,72%,55%)" }}>
                                Already imported{claim?.claimed_by_name ? ` · ${claim.claimed_by_name}` : ""}
                              </span>
                            )}
                            {isSoft && (
                              <span className="text-[10px] font-semibold" style={{ color: "hsl(38,95%,65%)" }}>
                                Likely duplicate — verify{claim?.claimed_by_name ? ` · ${claim.claimed_by_name}` : ""}
                              </span>
                            )}
                          </div>
                        </Td>
                        <Td>
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                              style={{ background: srcStyle.bg, color: srcStyle.fg }}>
                              {SOURCE_LABEL[r.source]}
                            </span>
                            {r.focus ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                                style={{ background: "hsla(262,80%,65%,.14)", color: "hsl(262,80%,78%)" }}
                                title={r.services?.length ? `SEC Form ADV services: ${r.services.join(", ")}` : undefined}>
                                {r.focus}
                              </span>
                            ) : r.source === "SEC" ? (
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap"
                                title="Not in SEC's registered-adviser file (state-registered or broker-dealer only)">Focus unknown</span>
                            ) : null}
                          </div>
                        </Td>
                        <Td className="text-muted-foreground">{[r.city, r.state].filter(Boolean).join(", ") || "—"}</Td>
                        <Td className="tabular-nums text-xs text-muted-foreground">{r.crd || "—"}</Td>
                        <Td className="tabular-nums text-xs text-muted-foreground">{r.sec_number || r.license_number || "—"}</Td>
                        <Td className="tabular-nums text-xs text-muted-foreground">{r.branches ?? "—"}</Td>
                        <Td>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: r.scope === "ACTIVE" || r.scope === "VALID" || r.scope === "LICENSED" ? "hsla(142,72%,42%,.15)" : "hsla(0,0%,50%,.15)",
                                     color: r.scope === "ACTIVE" || r.scope === "VALID" || r.scope === "LICENSED" ? "hsl(142,72%,55%)" : "hsl(0,0%,65%)" }}>
                            {r.scope || "—"}
                          </span>
                        </Td>
                        <Td>
                          <div className="flex items-center gap-1">
                            {r.iapd_url && (
                              <a href={r.iapd_url} target="_blank" rel="noreferrer" title="Open SEC profile"
                                 className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {isImported ? (
                              <span className="text-[11px] inline-flex items-center gap-1" style={{ color: "hsl(142,72%,55%)" }}>
                                <CheckCircle2 className="h-3 w-3" /> Sent
                              </span>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={importing}
                                onClick={() => importRows([r])}>
                                Send to My Leads
                              </Button>
                            )}
                          </div>
                        </Td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !insLoading && !error && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Enter a state and keyword, then Search SEC IAPD to fetch live firm records — or pick TX / FL and run an insurance license search.
        </p>
      )}
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <td className={`px-3 py-2.5 ${className}`} style={style}>{children}</td>;
}
