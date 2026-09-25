import { useCallback, useEffect, useState } from "react";
import { Loader2, Copy, SkipForward, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useEmployeeClientId } from "@/hooks/useEmployeeClientId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface SourcedRow {
  id: string;
  business_name: string;
  city: string | null;
  crd: string | null;
  source: string | null;
  focus_label: string | null;
}

/** Research Queue: hands reps the next un-researched batch of sourced leads. */
export default function ResearchQueueCard() {
  const { activeClientId } = useWorkspace();
  const { clientId: employeeClientId } = useEmployeeClientId();
  const clientId = activeClientId || employeeClientId;

  const [count, setCount] = useState<number | null>(null);
  const [preview, setPreview] = useState<SourcedRow[]>([]);
  const [batchSize, setBatchSize] = useState(10);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!clientId) return;
    const [{ count: c }, { data }] = await Promise.all([
      (supabase as any).from("nl_sourced_leads").select("id", { count: "exact", head: true })
        .eq("client_id", clientId).eq("status", "sourced"),
      (supabase as any).from("nl_sourced_leads").select("id, business_name, city, crd, source, focus_label")
        .eq("client_id", clientId).eq("status", "sourced").order("created_at", { ascending: true }).limit(batchSize),
    ]);
    setCount(c ?? 0);
    setPreview((data as SourcedRow[]) || []);
  }, [clientId, batchSize]);

  useEffect(() => { refresh(); }, [refresh]);

  const copyNextBatch = async () => {
    if (!clientId || busy) return;
    setBusy(true);
    try {
      const n = Math.max(1, Math.min(500, Math.floor(batchSize) || 10));
      const { data, error } = await (supabase as any).from("nl_sourced_leads")
        .select("id, business_name, city, crd, source").eq("client_id", clientId).eq("status", "sourced")
        .order("created_at", { ascending: true }).limit(n);
      if (error) throw error;
      const rows = (data as SourcedRow[]) || [];
      if (!rows.length) { toast({ title: "Queue is empty", description: "Run a search on Lead Sourcing to add more." }); return; }
      const block = ["Business Name | City | CRD | Source",
        ...rows.map(r => `${r.business_name} | ${r.city || "—"} | ${r.crd || "—"} | ${r.source || "—"}`)].join("\n");
      await navigator.clipboard.writeText(block);
      const { error: upErr } = await (supabase as any).from("nl_sourced_leads")
        .update({ status: "queued", queued_at: new Date().toISOString() })
        .in("id", rows.map(r => r.id)).eq("status", "sourced");
      if (upErr) throw upErr;
      toast({ title: `Copied ${rows.length} lead${rows.length !== 1 ? "s" : ""}`, description: "Marked as queued — paste into your Master Prompt chat." });
    } catch (e: any) {
      toast({ title: "Couldn't copy batch", description: e?.message || String(e), variant: "destructive" });
    } finally { setBusy(false); refresh(); }
  };

  const skip = async (ids: string[]) => {
    if (!ids.length) return;
    const { error } = await (supabase as any).from("nl_sourced_leads").update({ status: "skipped" }).in("id", ids);
    if (error) toast({ title: "Skip failed", description: error.message, variant: "destructive" });
    else toast({ title: `Skipped ${ids.length}` });
    refresh();
  };

  return (
    <div className="rounded-xl p-4 min-w-0" style={{ background: "hsla(38,92%,55%,.06)", border: "1px solid hsla(38,92%,55%,.3)" }}>
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ background: "hsla(38,92%,55%,.2)", color: "hsl(38,92%,68%)" }}>Research Queue</span>
          <h3 className="text-sm font-semibold text-foreground">
            {count === null ? "…" : count.toLocaleString()} waiting to be researched
          </h3>
        </div>
      </div>
      <p className="text-xs text-foreground/80 mb-3">
        Every SEC / insurance search result is saved here automatically. Copy the next batch, paste it into the Master Prompt — the app remembers where you left off.
      </p>
      <div className="flex items-end gap-2 flex-wrap mb-3">
        <div>
          <Label className="text-[11px] text-muted-foreground">Batch size</Label>
          <Input type="number" min={1} max={500} value={batchSize}
            onChange={e => setBatchSize(Number(e.target.value) || 1)} className="h-8 w-20" />
        </div>
        <Button size="sm" onClick={copyNextBatch} disabled={busy || !count}>
          {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Copy className="h-3 w-3 mr-1" />}
          Copy Next Batch
        </Button>
        <Button size="sm" variant="outline" onClick={() => skip(preview.map(p => p.id))} disabled={!preview.length}>
          <SkipForward className="h-3 w-3 mr-1" />Skip these {preview.length}
        </Button>
      </div>
      {preview.length > 0 && (
        <div className="rounded border border-white/10 bg-white/[0.03] divide-y divide-white/[0.05] max-h-56 overflow-y-auto">
          {preview.map(r => (
            <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
              <span className="flex-1 min-w-0 truncate text-foreground/90">{r.business_name}</span>
              <span className="text-muted-foreground truncate max-w-[30%]">{r.city || "—"}</span>
              <span className="tabular-nums text-muted-foreground">{r.crd || "—"}</span>
              <button className="p-1 rounded hover:bg-white/10 text-muted-foreground" title="Skip — don't research this one"
                onClick={() => skip([r.id])} aria-label={`Skip ${r.business_name}`}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
