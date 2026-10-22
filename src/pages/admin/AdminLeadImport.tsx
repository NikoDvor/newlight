import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

type Kind = "firms" | "people";
const KEYS: Record<Kind, string[]> = {
  firms: "crd name alt_names is_advisor is_broker city state zip address main_phone general_email website linkedin_url facebook_url x_url aum aum_growth_1y_pct aum_growth_3y_pct employees total_reps advisory_clients avg_account_size fee_structures client_personas services crm_tags technology_tags custodians year_founded established_date team_avg_age description".split(" "),
  people: "firm_crd firm_name firm_city firm_state individual_crd full_name first_name last_name title titles is_owner is_advisor is_broker phone mobile_phone landline_phone email personal_email linkedin_url years_experience est_age designations prior_firm breakaway_date job_start_date hobbies education disclosure_count".split(" "),
};
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const COMMON: Record<string, string> = {
  "Mobile Phone": "mobile_phone", "Landline Phone": "landline_phone", Website: "website", "Website URL": "website",
  "Total Regulatory AUM": "aum", "Total AUM": "aum", AUM: "aum", "Number of Employees": "employees", "Total Employees": "employees",
  "Total Reps": "total_reps", "Fee Structure": "fee_structures", "Year Founded": "year_founded", "Established Date": "established_date",
  Owner: "is_owner", "Is Advisor": "is_advisor", "Is Broker": "is_broker", Titles: "titles", Title: "title",
  "Breakaway Date": "breakaway_date", "Primary Firm City": "firm_city", "Firm City": "firm_city",
  "Primary Firm State": "firm_state", "Firm State": "firm_state", "CAGR AUM Change 1Y Pct": "aum_growth_1y_pct",
  "CAGR AUM Change 3Y Pct": "aum_growth_3y_pct", "LinkedIn URL": "linkedin_url", "URL Linkedin": "linkedin_url",
};
const CRD_ALIASES = ["firm CRD", "Primary Firm CRD", "RIA Firm CRD", "BD Firm CRD"];
const NAME_ALIASES = ["Firm Name", "Name", "Primary Firm Name"];

function guess(h: string, kind: Kind): string {
  const n = norm(h);
  const a: Record<string, string> = {};
  Object.entries(COMMON).forEach(([k, v]) => (a[norm(k)] = v));
  CRD_ALIASES.forEach(k => (a[norm(k)] = kind === "firms" ? "crd" : "firm_crd"));
  NAME_ALIASES.forEach(k => (a[norm(k)] = kind === "firms" ? "name" : "firm_name"));
  a.phone = kind === "firms" ? "main_phone" : "phone";
  if (kind === "people") a.crd = "individual_crd";
  const v = a[n] || KEYS[kind].find(k => norm(k) === n) || "";
  return KEYS[kind].includes(v) ? v : "";
}

export default function AdminLeadImport() {
  const [kind, setKind] = useState<Kind>("firms");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState("");
  const [batches, setBatches] = useState<any[]>([]);

  const loadBatches = async () => {
    const { data } = await (supabase as any).from("nl_lead_import_batches").select("*").order("created_at", { ascending: false }).limit(10);
    setBatches(data || []);
  };
  useEffect(() => { loadBatches(); }, []);

  useEffect(() => {
    if (!headers.length) return;
    (async () => {
      const { data } = await (supabase as any).from("nl_lead_import_mappings").select("column_map").eq("export_kind", kind).maybeSingle();
      const saved = (data?.column_map || {}) as Record<string, string>;
      const m: Record<string, string> = {};
      headers.forEach(h => { m[h] = h in saved && (saved[h] === "" || KEYS[kind].includes(saved[h])) ? saved[h] : guess(h, kind); });
      setMap(m);
    })();
  }, [headers, kind]);

  const onFile = async (f?: File) => {
    if (!f) return;
    setFileName(f.name); setResult("");
    const wb = XLSX.read(await f.arrayBuffer());
    const data = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: false });
    const hdr = (XLSX.utils.sheet_to_json<any[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 })[0] || []).map(String);
    setRows(data); setHeaders(hdr);
  };

  const mapped = new Set(Object.values(map).filter(Boolean));
  const valid = kind === "firms" ? mapped.has("crd") && mapped.has("name")
    : mapped.has("firm_crd") && (mapped.has("full_name") || (mapped.has("first_name") && mapped.has("last_name")));

  const run = async () => {
    if (!valid || progress !== null) return;
    const { error: me } = await (supabase as any).from("nl_lead_import_mappings")
      .upsert({ export_kind: kind, column_map: map, updated_at: new Date().toISOString() }, { onConflict: "export_kind" });
    if (me) return toast({ title: me.message, variant: "destructive" });
    const out = rows.map(r => { const o: any = {}; headers.forEach(h => { if (map[h]) o[map[h]] = r[h]; }); return o; });
    const t = { firms_added: 0, firms_updated: 0, contacts: 0, skipped: 0 };
    setProgress(0);
    try {
      for (let i = 0; i < out.length; i += 500) {
        const { data, error } = await (supabase as any).rpc("nl_pool_import", { _kind: kind, _rows: out.slice(i, i + 500), _file_name: fileName });
        if (error) throw error;
        (Object.keys(t) as (keyof typeof t)[]).forEach(k => (t[k] += Number(data?.[k] || 0)));
        setProgress(Math.round(Math.min(100, ((i + 500) / out.length) * 100)));
      }
      setResult(`${t.firms_added} firms added, ${t.firms_updated} updated, ${t.contacts} people, ${t.skipped} skipped`);
    } catch (e: any) {
      toast({ title: e.message || "Import failed", variant: "destructive" });
    }
    setProgress(null); loadBatches();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Lead Import</h1>
      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-3 items-center">
          <Select value={kind} onValueChange={v => setKind(v as Kind)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="firms">Firms export</SelectItem><SelectItem value="people">People export</SelectItem></SelectContent>
          </Select>
          <Input type="file" accept=".csv,.xlsx" className="w-72" onChange={e => onFile(e.target.files?.[0])} />
          {rows.length > 0 && <span className="text-sm text-muted-foreground">{rows.length} rows</span>}
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Column mapping</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-[50vh] overflow-auto space-y-1">
              {headers.map(h => (
                <div key={h} className="flex items-center gap-3 text-sm">
                  <span className="w-64 truncate">{h}</span>
                  <Select value={map[h] || "__ignore"} onValueChange={v => setMap(m => ({ ...m, [h]: v === "__ignore" ? "" : v }))}>
                    <SelectTrigger className="w-56 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__ignore">(ignore)</SelectItem>
                      {KEYS[kind].map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            {!valid && <p className="text-sm text-destructive">
              {kind === "firms" ? "Map crd and name." : "Map firm_crd and full_name (or first_name + last_name)."}</p>}
            {progress !== null && <Progress value={progress} />}
            <Button onClick={run} disabled={!valid || progress !== null}>Save mapping & Import</Button>
            {result && <p className="text-sm font-medium">{result}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Recent imports</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground">
              <th>When</th><th>File</th><th>Type</th><th>Firms added</th><th>Updated</th><th>People</th><th>Skipped</th></tr></thead>
            <tbody>{batches.map(b => (
              <tr key={b.id ?? b.created_at}>
                <td>{new Date(b.created_at).toLocaleString()}</td><td>{b.file_name}</td><td>{b.export_kind}</td>
                <td>{b.firms_added}</td><td>{b.firms_updated}</td><td>{b.contacts_added}</td><td>{b.rows_skipped}</td>
              </tr>))}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
