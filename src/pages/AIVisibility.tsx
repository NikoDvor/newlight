import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Bot, Loader2, Plus, Trash2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type CitationCheck = {
  id: string;
  query_text: string;
  ai_model: string;
  cited: boolean;
  response_snippet: string | null;
  checked_at: string;
};

type CitationQuery = {
  id: string;
  query_text: string;
  is_active: boolean;
};

export default function AIVisibility() {
  const { activeClientId } = useWorkspace();
  const [checks, setChecks] = useState<CitationCheck[]>([]);
  const [queries, setQueries] = useState<CitationQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [newQuery, setNewQuery] = useState("");

  const fetchData = useCallback(async () => {
    if (!activeClientId) { setLoading(false); return; }
    setLoading(true);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [checkRes, qRes] = await Promise.all([
      supabase.from("ai_citation_checks")
        .select("id, query_text, ai_model, cited, response_snippet, checked_at")
        .eq("client_id", activeClientId)
        .gte("checked_at", since)
        .order("checked_at", { ascending: false })
        .limit(200),
      supabase.from("ai_citation_queries")
        .select("id, query_text, is_active")
        .eq("client_id", activeClientId)
        .order("created_at", { ascending: true }),
    ]);
    setChecks((checkRes.data as CitationCheck[]) || []);
    setQueries((qRes.data as CitationQuery[]) || []);
    setLoading(false);
  }, [activeClientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runCheck = async () => {
    if (!activeClientId) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-citation-check", {
        body: { client_id: activeClientId },
      });
      if (error) throw error;
      const cited = data?.cited_count ?? 0;
      const total = data?.checks_run ?? 0;
      toast({ title: "Citation check complete", description: `${cited} of ${total} queries returned a citation.` });
      await fetchData();
    } catch (e: any) {
      toast({ title: "Check failed", description: e?.message || "Unable to run citation check", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const addQuery = async () => {
    const text = newQuery.trim();
    if (!activeClientId || !text) return;
    const { error } = await supabase.from("ai_citation_queries").insert({
      client_id: activeClientId, query_text: text, is_active: true,
    });
    if (error) { toast({ title: "Add failed", description: error.message, variant: "destructive" }); return; }
    setNewQuery("");
    fetchData();
  };

  const toggleQuery = async (q: CitationQuery) => {
    await supabase.from("ai_citation_queries").update({ is_active: !q.is_active }).eq("id", q.id);
    fetchData();
  };

  const deleteQuery = async (id: string) => {
    await supabase.from("ai_citation_queries").delete().eq("id", id);
    fetchData();
  };

  const citedChecks = checks.filter((c) => c.cited);
  const totalChecks = checks.length;
  const sov = totalChecks > 0 ? Math.round((citedChecks.length / totalChecks) * 100) : 0;
  const sourceSet = new Set(citedChecks.map((c) => c.ai_model));
  const lastRun = checks[0]?.checked_at ? new Date(checks[0].checked_at).toLocaleString() : "—";

  const metrics = [
    { label: "AI Mentions (30d)", value: totalChecks === 0 ? "—" : String(citedChecks.length), change: totalChecks === 0 ? "No checks yet" : `of ${totalChecks} checks`, changeType: "neutral" as const },
    { label: "Share of Voice", value: totalChecks === 0 ? "—" : `${sov}%`, change: totalChecks === 0 ? "Run a check to populate" : `${citedChecks.length}/${totalChecks} cited`, changeType: sov >= 50 ? "positive" as const : "neutral" as const },
    { label: "Citation Sources", value: totalChecks === 0 ? "—" : String(sourceSet.size), change: totalChecks === 0 ? "—" : Array.from(sourceSet).join(", ") || "None cited yet", changeType: "neutral" as const },
    { label: "Last Run", value: totalChecks === 0 ? "—" : lastRun.split(",")[0], change: totalChecks === 0 ? "—" : lastRun.split(",")[1]?.trim() || "", changeType: "neutral" as const },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="AI Search Visibility"
        description="Track how often your brand appears, gets cited, and trends across AI search engines."
      >
        <Button onClick={runCheck} disabled={running || !activeClientId} size="sm">
          {running ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
          Run Citation Check Now
        </Button>
      </PageHeader>


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value}
            change={m.change}
            changeType={m.changeType}
            icon={Sparkles}
          />
        ))}
      </div>

      {!loading && totalChecks === 0 ? (
        <div
          className="rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4 border"
          style={{ background: "hsla(215,35%,10%,.8)", borderColor: "hsla(211,96%,60%,.12)" }}
        >
          <div className="p-4 rounded-full" style={{ background: "hsla(211,96%,60%,.12)" }}>
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">No citation checks yet</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Run your first check to send your prompt set to an AI model and record whether your brand is cited.
            </p>
          </div>
          <Button onClick={runCheck} disabled={running || !activeClientId}>
            {running ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
            Run Citation Check Now
          </Button>
        </div>
      ) : null}

      <DataCard title="Monitored Queries">
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Add a query, e.g. best fiduciary advisor in Austin"
            value={newQuery}
            onChange={(e) => setNewQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addQuery(); }}
          />
          <Button size="sm" onClick={addQuery} disabled={!newQuery.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
        {queries.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">No queries yet. Run a check to auto-seed based on your business profile, or add one above.</p>
        ) : (
          <div className="space-y-1">
            {queries.map((q) => (
              <div key={q.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-3">
                <p className="text-sm flex-1 truncate">{q.query_text}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={q.is_active} onCheckedChange={() => toggleQuery(q)} />
                  <Button size="icon" variant="ghost" onClick={() => deleteQuery(q.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DataCard>

      <DataCard title="Recent Citation Checks">
        {checks.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">Run a check to see results here.</p>
        ) : (
          <div className="space-y-2">
            {checks.slice(0, 50).map((c) => (
              <div key={c.id} className="p-3 rounded-lg border border-border">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <p className="text-sm font-medium">{c.query_text}</p>
                  <Badge className={`text-[10px] shrink-0 ${c.cited ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                    {c.cited ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Cited</> : <><XCircle className="h-3 w-3 mr-1" /> Not cited</>}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.ai_model} · {new Date(c.checked_at).toLocaleString()}
                </p>
                {c.response_snippet ? (
                  <p className="text-xs text-muted-foreground mt-2 italic">"{c.response_snippet}"</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </DataCard>
    </div>
  );
}
