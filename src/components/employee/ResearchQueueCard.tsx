import { useCallback, useEffect, useState } from "react";
import { Loader2, Copy, Trash2, X, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useEmployeeClientId } from "@/hooks/useEmployeeClientId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface SourcedRow {
  id: string;
  business_name: string;
  city: string | null;
  crd: string | null;
  source: string | null;
  focus_label: string | null;
}

/**
 * Copy text to the clipboard with a fallback chain that works inside
 * short-lived mobile user gestures (async Clipboard API is often blocked
 * on iOS Safari by the time an await resolves).
 * Returns "clipboard" | "execCommand" | "failed".
 */
const copyWithFallback = async (text: string): Promise<"clipboard" | "execCommand" | "failed"> => {
  try {
    await navigator.clipboard.writeText(text);
    return "clipboard";
  } catch {
    // fall through to the textarea/execCommand fallback
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.left = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok ? "execCommand" : "failed";
  } catch {
    return "failed";
  }
};

/** Research Queue: hands reps the next un-researched batch of sourced leads. */
export default function ResearchQueueCard() {
  const { activeClientId } = useWorkspace();
  const { clientId: employeeClientId } = useEmployeeClientId();
  const clientId = activeClientId || employeeClientId;

  const [count, setCount] = useState<number | null>(null);
  const [preview, setPreview] = useState<SourcedRow[]>([]);
  const [batchSize, setBatchSize] = useState(10);
  const [busy, setBusy] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

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
      const method = await copyWithFallback(block);
      const { error: upErr } = await (supabase as any).from("nl_sourced_leads")
        .update({ status: "queued", queued_at: new Date().toISOString() })
        .in("id", rows.map(r => r.id)).eq("status", "sourced");
      if (upErr) throw upErr;
      if (method === "failed") {
        // Both copy paths blocked — surface the text so it can be copied manually.
        setManualText(block);
        toast({ title: "Automatic copy blocked", description: "Select the text in the window and copy it manually.", variant: "destructive" });
      } else {
        toast({ title: `Copied ${rows.length} lead${rows.length !== 1 ? "s" : ""}`, description: "Marked as queued — paste into your Master Prompt chat." });
      }
    } catch (e: any) {
      toast({ title: "Couldn't copy batch", description: e?.message || String(e), variant: "destructive" });
    } finally { setBusy(false); refresh(); }
  };

  const removeRows = async (ids: string[]) => {
    if (!ids.length) return;
    const { error } = await (supabase as any).from("nl_sourced_leads").delete().in("id", ids);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else toast({ title: `Deleted ${ids.length}` });
    refresh();
  };

  const deleteAllSourced = async () => {
    if (!clientId) return;
    const { error } = await (supabase as any).from("nl_sourced_leads")
      .delete().eq("client_id", clientId).eq("status", "sourced");
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else toast({ title: `Deleted ${count ?? "all"} leads`, description: "The research queue is now empty." });
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
        <Button size="sm" variant="outline" onClick={() => removeRows(preview.map(p => p.id))} disabled={!preview.length}>
          <Trash2 className="h-3 w-3 mr-1" />Delete These {preview.length}
        </Button>
        <Button size="sm" variant="outline" style={{ borderColor: "hsla(0,72%,51%,.4)", color: "hsl(0,72%,66%)" }}
          onClick={() => setConfirmDeleteAll(true)} disabled={busy || !count}>
          <AlertTriangle className="h-3 w-3 mr-1" />Delete All ({count ?? 0})
        </Button>
      </div>
      {preview.length > 0 && (
        <div className="rounded border border-white/10 bg-white/[0.03] divide-y divide-white/[0.05] max-h-56 overflow-y-auto">
          {preview.map(r => (
            <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
              <span className="flex-1 min-w-0 truncate text-foreground/90">{r.business_name}</span>
              <span className="text-muted-foreground truncate max-w-[30%]">{r.city || "—"}</span>
              <span className="tabular-nums text-muted-foreground">{r.crd || "—"}</span>
              <button className="p-1 rounded hover:bg-white/10 text-muted-foreground" title="Delete from queue"
                onClick={() => removeRows([r.id])} aria-label={`Delete ${r.business_name}`}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {manualText !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setManualText(null)}>
          <div className="w-full max-w-md rounded-xl bg-background border border-white/10 p-4 shadow-xl"
            onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-semibold text-foreground mb-1">Copy blocked — copy manually</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Your browser blocked automatic copying. Long-press inside the box below (or tap it) to select all, then copy.
            </p>
            <textarea readOnly value={manualText} onFocus={e => e.currentTarget.select()}
              className="w-full h-56 text-xs rounded border border-white/10 bg-white/[0.03] p-2 text-foreground/90 font-mono resize-none" />
            <div className="flex justify-end gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={async () => {
                const method = await copyWithFallback(manualText);
                if (method !== "failed") { setManualText(null); toast({ title: "Copied" }); }
              }}>
                <Copy className="h-3 w-3 mr-1" />Try Copy Again
              </Button>
              <Button size="sm" onClick={() => setManualText(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all {count ?? 0} queued leads?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes every lead still waiting to be researched ({count ?? 0}). Leads already
              queued, imported, or skipped are not touched. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAllSourced}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
