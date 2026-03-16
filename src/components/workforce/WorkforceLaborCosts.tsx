import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Coins, RefreshCw, TrendingUp } from "lucide-react";

interface Worker {
  id: string; full_name: string; hourly_rate: number | null; department: string | null;
}

interface LaborCostRecord {
  id: string; client_id: string; worker_id: string; time_entry_id: string | null;
  linked_module: string | null; linked_record_id: string | null; labor_category: string | null;
  hourly_cost_rate: number; hours: number; total_labor_cost: number; entry_date: string; created_at: string;
}

const fmtCurrency = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString() : "—";

export function WorkforceLaborCosts({ clientId, workers }: { clientId: string; workers: Worker[] }) {
  const [records, setRecords] = useState<LaborCostRecord[]>([]);
  const [generating, setGenerating] = useState(false);

  const workerMap = useMemo(() => Object.fromEntries(workers.map(w => [w.id, w])), [workers]);

  const fetchRecords = async () => {
    const { data } = await supabase.from("labor_cost_records").select("*")
      .eq("client_id", clientId).order("entry_date", { ascending: false }).limit(500);
    setRecords((data as any[]) || []);
  };

  useEffect(() => { fetchRecords(); }, [clientId]);

  const generateFromApprovedEntries = async () => {
    setGenerating(true);
    // Fetch approved time entries that don't have labor cost records yet
    const { data: approvedEntries } = await supabase.from("time_entries").select("*")
      .eq("client_id", clientId).eq("entry_status", "Approved").order("entry_date", { ascending: false }).limit(500);

    if (!approvedEntries || approvedEntries.length === 0) {
      toast({ title: "No approved entries", description: "Approve time entries first to generate labor cost records.", variant: "destructive" });
      setGenerating(false);
      return;
    }

    const existingEntryIds = new Set(records.map(r => r.time_entry_id));
    const newEntries = (approvedEntries as any[]).filter(e => !existingEntryIds.has(e.id));

    if (newEntries.length === 0) {
      toast({ title: "All up to date", description: "Labor cost records already exist for all approved entries." });
      setGenerating(false);
      return;
    }

    const inserts = newEntries.map(e => {
      const worker = workerMap[e.worker_id];
      const rate = worker?.hourly_rate || 0;
      const hours = (e.total_minutes || 0) / 60;
      return {
        client_id: clientId, worker_id: e.worker_id, time_entry_id: e.id,
        linked_module: e.linked_module || null, labor_category: e.labor_category || null,
        hourly_cost_rate: rate, hours: Math.round(hours * 100) / 100,
        total_labor_cost: Math.round(rate * hours * 100) / 100, entry_date: e.entry_date,
      };
    });

    const { error } = await supabase.from("labor_cost_records").insert(inserts as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: `${inserts.length} labor cost record(s) generated` }); }

    await supabase.from("audit_logs").insert({ client_id: clientId, action: "labor_costs_generated", module: "Workforce", metadata: { count: inserts.length } } as any);
    fetchRecords();
    setGenerating(false);
  };

  // Summary stats
  const totalCost = records.reduce((s, r) => s + r.total_labor_cost, 0);
  const totalHours = records.reduce((s, r) => s + r.hours, 0);
  const byWorker = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach(r => map.set(r.worker_id, (map.get(r.worker_id) || 0) + r.total_labor_cost));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [records]);
  const byDept = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach(r => {
      const dept = workerMap[r.worker_id]?.department || "Unassigned";
      map.set(dept, (map.get(dept) || 0) + r.total_labor_cost);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [records, workerMap]);
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach(r => {
      const cat = r.labor_category || "Uncategorized";
      map.set(cat, (map.get(cat) || 0) + r.total_labor_cost);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [records]);

  return (
    <div className="space-y-4">
      {/* Generate action */}
      <Card className="border-primary/20">
        <CardContent className="py-3 flex flex-wrap items-center gap-3">
          <Coins className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Generate labor cost records from approved time entries</span>
          <Button size="sm" onClick={generateFromApprovedEntries} disabled={generating} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} /> Generate
          </Button>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Total Labor Cost</p>
          <p className="text-xl font-bold">{fmtCurrency(totalCost)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Total Hours</p>
          <p className="text-xl font-bold">{totalHours.toFixed(1)}h</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Avg Cost/Hour</p>
          <p className="text-xl font-bold">{totalHours > 0 ? fmtCurrency(totalCost / totalHours) : "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Records</p>
          <p className="text-xl font-bold">{records.length}</p>
        </CardContent></Card>
      </div>

      {/* Breakdowns */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">By Worker</p>
          {byWorker.slice(0, 5).map(([wid, cost]) => (
            <div key={wid} className="flex justify-between text-sm">
              <span className="truncate">{workerMap[wid]?.full_name || "—"}</span>
              <span className="font-medium">{fmtCurrency(cost)}</span>
            </div>
          ))}
          {byWorker.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">By Department</p>
          {byDept.slice(0, 5).map(([dept, cost]) => (
            <div key={dept} className="flex justify-between text-sm">
              <span>{dept}</span>
              <span className="font-medium">{fmtCurrency(cost)}</span>
            </div>
          ))}
          {byDept.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">By Category</p>
          {byCategory.slice(0, 5).map(([cat, cost]) => (
            <div key={cat} className="flex justify-between text-sm">
              <span>{cat}</span>
              <span className="font-medium">{fmtCurrency(cost)}</span>
            </div>
          ))}
          {byCategory.length === 0 && <p className="text-sm text-muted-foreground">No data yet</p>}
        </CardContent></Card>
      </div>

      {/* Table */}
      {records.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-16 text-center space-y-3">
          <Coins className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-medium">No labor cost records yet</p>
          <p className="text-sm text-muted-foreground">Generate records from approved time entries to track labor costs.</p>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Worker</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="hidden md:table-cell">Module</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Labor Cost</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {records.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm font-medium">{workerMap[r.worker_id]?.full_name || "—"}</TableCell>
                  <TableCell className="text-sm">{fmt(r.entry_date)}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{r.linked_module || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{r.labor_category || "—"}</TableCell>
                  <TableCell className="text-sm">{r.hours.toFixed(1)}h</TableCell>
                  <TableCell className="text-sm">{fmtCurrency(r.hourly_cost_rate)}/hr</TableCell>
                  <TableCell className="text-sm font-bold">{fmtCurrency(r.total_labor_cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
