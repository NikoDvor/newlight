import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { TrendingUp, RefreshCw, DollarSign } from "lucide-react";

interface Worker {
  id: string; full_name: string; commission_rate: number | null; pay_type: string;
}

interface CommissionRecord {
  id: string; client_id: string; worker_id: string; linked_deal_id: string | null;
  revenue_source_amount: number; commission_rate: number; commission_earned: number;
  status: string; created_at: string;
}

const fmtCurrency = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt = (d: string) => new Date(d).toLocaleDateString();

const statusColor = (s: string) => {
  switch (s?.toLowerCase()) {
    case "paid": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "approved": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "pending": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

export function WorkforceCommissions({ clientId, workers }: { clientId: string; workers: Worker[] }) {
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);

  const workerMap = useMemo(() => Object.fromEntries(workers.map(w => [w.id, w])), [workers]);
  const commissionWorkers = useMemo(() => workers.filter(w =>
    w.pay_type?.toLowerCase().includes("commission") && (w.commission_rate || 0) > 0
  ), [workers]);

  const fetchData = async () => {
    const [cRes, dRes] = await Promise.all([
      supabase.from("commission_records").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(500),
      supabase.from("crm_deals").select("*").eq("client_id", clientId).eq("status", "won").order("close_date", { ascending: false }).limit(200),
    ]);
    setRecords((cRes.data as any[]) || []);
    setDeals(dRes.data || []);
  };

  useEffect(() => { fetchData(); }, [clientId]);

  const generateFromWonDeals = async () => {
    if (commissionWorkers.length === 0) {
      toast({ title: "No commission workers", description: "Set commission rate on workers with Commission pay type first.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    const existingDealIds = new Set(records.map(r => r.linked_deal_id));
    const newDeals = deals.filter(d => !existingDealIds.has(d.id) && (d.deal_value || 0) > 0);

    if (newDeals.length === 0) {
      toast({ title: "No new won deals to process" });
      setGenerating(false);
      return;
    }

    const inserts: any[] = [];
    for (const deal of newDeals) {
      // Assign to deal's assigned_user if they're a commission worker, otherwise first commission worker
      const assignedWorker = commissionWorkers.find(w => w.id === deal.assigned_user) || commissionWorkers[0];
      if (!assignedWorker) continue;
      const rate = assignedWorker.commission_rate || 0;
      const revenue = deal.deal_value || 0;
      inserts.push({
        client_id: clientId, worker_id: assignedWorker.id, linked_deal_id: deal.id,
        revenue_source_amount: revenue, commission_rate: rate,
        commission_earned: Math.round(revenue * (rate / 100) * 100) / 100,
        status: "Pending",
      });
    }

    if (inserts.length > 0) {
      const { error } = await supabase.from("commission_records").insert(inserts as any);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
      else { toast({ title: `${inserts.length} commission record(s) generated` }); }
      await supabase.from("audit_logs").insert({ client_id: clientId, action: "commissions_generated", module: "Workforce", metadata: { count: inserts.length } } as any);
    }

    fetchData();
    setGenerating(false);
  };

  const totalEarned = records.reduce((s, r) => s + r.commission_earned, 0);
  const totalRevenue = records.reduce((s, r) => s + r.revenue_source_amount, 0);
  const pendingCount = records.filter(r => r.status === "Pending").length;

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardContent className="py-3 flex flex-wrap items-center gap-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Generate commissions from won deals</span>
          <Button size="sm" onClick={generateFromWonDeals} disabled={generating} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} /> Generate
          </Button>
          {commissionWorkers.length === 0 && <span className="text-xs text-muted-foreground">No commission workers configured</span>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Total Commissions</p>
          <p className="text-xl font-bold">{fmtCurrency(totalEarned)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Revenue Sources</p>
          <p className="text-xl font-bold">{fmtCurrency(totalRevenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-xl font-bold">{pendingCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground">Effective Rate</p>
          <p className="text-xl font-bold">{totalRevenue > 0 ? `${((totalEarned / totalRevenue) * 100).toFixed(1)}%` : "—"}</p>
        </CardContent></Card>
      </div>

      {records.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-16 text-center space-y-3">
          <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-medium">No commission records yet</p>
          <p className="text-sm text-muted-foreground">Set commission rates on workers and close deals to generate commissions.</p>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Worker</TableHead>
              <TableHead>Revenue Source</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Earned</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {records.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm font-medium">{workerMap[r.worker_id]?.full_name || "—"}</TableCell>
                  <TableCell className="text-sm">{fmtCurrency(r.revenue_source_amount)}</TableCell>
                  <TableCell className="text-sm">{r.commission_rate}%</TableCell>
                  <TableCell className="text-sm font-bold">{fmtCurrency(r.commission_earned)}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${statusColor(r.status)}`}>{r.status}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{fmt(r.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
