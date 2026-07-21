import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Download, CheckCircle2, ExternalLink, AlertTriangle, Loader2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useEmployeeClientId } from "@/hooks/useEmployeeClientId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

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

function rowKey(r: FirmResult) {
  return r.crd ? `crd:${r.crd}` : `nc:${(r.firm_name || "").toLowerCase()}|${(r.city || "").toLowerCase()}`;
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
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FirmResult[]>([]);
  const [meta, setMeta] = useState<{ total: number; source: string; note?: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [listName, setListName] = useState("SEC IAPD Import");
  const [claimMap, setClaimMap] = useState<Record<string, ClaimStatus>>({});

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
    setClaimMap(map);
  }

  async function runSearch() {
    setLoading(true); setError(null); setResults([]); setMeta(null); setSelected(new Set()); setClaimMap({});
    try {
      const { data, error } = await supabase.functions.invoke("sec-firm-search", {
        body: {
          state, keyword,
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
      const rows: FirmResult[] = (data as any)?.results || [];
      setResults(rows);
      setMeta({ total: (data as any).total ?? rows.length, source: (data as any).source, note: (data as any).note });
      // Fire duplicate check in the background
      checkClaimsBatch(rows);
    } catch (e: any) {
      setError(`SEC fetch failed: ${e?.message || String(e)}`);
    } finally { setLoading(false); }
  }

  function toggleOne(crd: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(crd) ? next.delete(crd) : next.add(crd);
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
      website: r.iapd_url,
      crd: r.crd || null,
      notes: [
        `Sourced from SEC IAPD.`,
        r.sec_number ? `SEC #: ${r.sec_number}` : null,
        r.crd ? `CRD: ${r.crd}` : null,
        r.street ? `Address: ${r.street}` : null,
        r.branches != null ? `Branches: ${r.branches}` : null,
      ].filter(Boolean).join("\n"),
      list_name: cleanList,
    }));
    const { error } = await (supabase as any).from("nl_bdr_leads").insert(inserts);
    setImporting(false);
    if (error) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
      return;
    }
    setImported((prev) => {
      const next = new Set(prev);
      rows.forEach((r) => next.add(r.crd));
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
    const header = "Business Name | City | CRD";
    const sep = "--- | --- | ---";
    const body = eligible.map((r) => `${r.firm_name} | ${[r.city, r.state].filter(Boolean).join(", ") || "—"} | ${r.crd || "—"}`).join("\n");
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

  const selectedRows = results.filter((r) => selected.has(r.crd));
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
        <h1 className="text-2xl font-bold text-foreground">Lead Sourcing — SEC IAPD</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search state- and SEC-registered investment adviser firms in real time from adviserinfo.sec.gov, then push any row directly into your My Leads pipeline.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-3">
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
          <div className="md:col-span-2">
            <Label className="text-xs">Keyword</Label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="wealth, retirement, planning…" className="h-9" />
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
            <Input type="number" value={maxResults} min={1} max={50}
              onChange={(e) => setMaxResults(Math.max(1, Math.min(50, Number(e.target.value) || 25)))} className="h-9" />
          </div>
          <div className="md:col-span-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-[11px] text-muted-foreground max-w-xl">
              AUM filters accepted but not applied server-side yet — SEC's search index doesn't return AUM. Follow-up will pull Form ADV Part 1 filings for enrichment.
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
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    <Th className="w-8"></Th><Th>Firm</Th><Th>Location</Th><Th>CRD</Th><Th>SEC #</Th><Th>Branches</Th><Th>Status</Th><Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const isImported = imported.has(r.crd);
                    const claim = claimMap[rowKey(r)];
                    const isHard = claim?.match_type === "hard_crd";
                    const isSoft = claim?.match_type === "soft_name_city";
                    const dim = isImported || isHard;
                    return (
                      <motion.tr key={r.crd + "-" + i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        className="border-b border-white/[0.04] hover:bg-white/[0.03]"
                        style={dim ? { opacity: 0.55 } : undefined}>
                        <Td>
                          <input type="checkbox" checked={selected.has(r.crd)} onChange={() => toggleOne(r.crd)} disabled={isImported || isHard}
                            className="h-4 w-4 accent-primary" />
                        </Td>
                        <Td>
                          <div className="flex flex-col gap-0.5">
                            <span className={`font-medium ${dim ? "line-through text-muted-foreground" : "text-foreground"}`}>{r.firm_name}</span>
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
                        <Td className="text-muted-foreground">{[r.city, r.state].filter(Boolean).join(", ") || "—"}</Td>
                        <Td className="tabular-nums text-xs text-muted-foreground">{r.crd || "—"}</Td>
                        <Td className="tabular-nums text-xs text-muted-foreground">{r.sec_number || "—"}</Td>
                        <Td className="tabular-nums text-xs text-muted-foreground">{r.branches ?? "—"}</Td>
                        <Td>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: r.scope === "ACTIVE" ? "hsla(142,72%,42%,.15)" : "hsla(0,0%,50%,.15)",
                                     color: r.scope === "ACTIVE" ? "hsl(142,72%,55%)" : "hsl(0,0%,65%)" }}>
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
                            {isImported || isHard ? (
                              <span className="text-[11px] inline-flex items-center gap-1" style={{ color: "hsl(142,72%,55%)" }}>
                                <CheckCircle2 className="h-3 w-3" /> {isImported ? "Sent" : "In book"}
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

      {!loading && !error && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Enter a state and keyword, then Search SEC IAPD to fetch live firm records.
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
