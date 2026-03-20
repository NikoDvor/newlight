import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DollarSign, TrendingUp, AlertTriangle, Users, Sparkles, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface ClientRec {
  id: string;
  clientName: string;
  clientId: string;
  serviceName: string;
  serviceKey: string;
  urgency: string;
  status: string;
  projectedMonthly: number;
  projectedAnnual: number;
  fitScore: number;
  reason: string;
}

const urgencyColor: Record<string, string> = {
  Critical: "hsl(0 70% 45%)",
  High: "hsl(25 95% 45%)",
  Medium: "hsl(var(--primary))",
  Low: "hsl(var(--muted-foreground))",
};

const statusColor: Record<string, string> = {
  Active: "hsl(var(--primary))",
  Viewed: "hsl(211 96% 50%)",
  "In Review": "hsl(38 92% 45%)",
  Approved: "hsl(142 72% 42%)",
  Implemented: "hsl(142 72% 35%)",
  Dismissed: "hsl(var(--muted-foreground))",
};

export default function AdminRevenueExpansion() {
  const [recs, setRecs] = useState<ClientRec[]>([]);
  const [clients, setClients] = useState<{ id: string; business_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      supabase.from("recommended_services").select("*").in("recommendation_status", ["Active", "Viewed", "In Review", "Approved"]).order("priority_rank"),
      supabase.from("clients").select("id, business_name"),
      supabase.from("recommendation_runs").select("created_at").order("created_at", { ascending: false }).limit(1),
    ]).then(([recsRes, clientsRes, runsRes]) => {
      const cl = clientsRes.data || [];
      setClients(cl);
      const clientMap = Object.fromEntries(cl.map((c: any) => [c.id, c.business_name]));
      setRecs(
        (recsRes.data || []).map((r: any) => ({
          id: r.id,
          clientName: clientMap[r.client_id] || "Unknown",
          clientId: r.client_id,
          serviceName: r.service_name,
          serviceKey: r.service_key,
          urgency: r.urgency_level,
          status: r.recommendation_status,
          projectedMonthly: r.projected_monthly_revenue_impact || 0,
          projectedAnnual: r.projected_annual_revenue_impact || 0,
          fitScore: r.fit_score || 0,
          reason: r.reason_summary || "",
        }))
      );
      if (runsRes.data?.[0]) {
        setLastRun(new Date(runsRes.data[0].created_at).toLocaleString());
      }
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const totalMonthly = recs.reduce((s, r) => s + r.projectedMonthly, 0);
  const totalAnnual = recs.reduce((s, r) => s + r.projectedAnnual, 0);
  const criticalCount = recs.filter((r) => r.urgency === "Critical" || r.urgency === "High").length;
  const uniqueClients = new Set(recs.map(r => r.clientId)).size;

  // Group by service
  const byService: Record<string, ClientRec[]> = {};
  recs.forEach((r) => {
    if (!byService[r.serviceName]) byService[r.serviceName] = [];
    byService[r.serviceName].push(r);
  });
  const serviceRanking = Object.entries(byService)
    .map(([name, items]) => ({ name, count: items.length, totalMonthly: items.reduce((s, i) => s + i.projectedMonthly, 0) }))
    .sort((a, b) => b.totalMonthly - a.totalMonthly);

  // Group by client
  const byClient: Record<string, ClientRec[]> = {};
  recs.forEach((r) => {
    if (!byClient[r.clientName]) byClient[r.clientName] = [];
    byClient[r.clientName].push(r);
  });
  const clientRanking = Object.entries(byClient)
    .map(([name, items]) => ({ name, count: items.length, totalMonthly: items.reduce((s, i) => s + i.projectedMonthly, 0), topUrgency: items[0]?.urgency }))
    .sort((a, b) => b.totalMonthly - a.totalMonthly);

  const hasData = recs.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Revenue Expansion" description="Cross-client upsell pipeline and revenue opportunity intelligence.">
        <div className="flex items-center gap-2">
          {lastRun && <span className="text-[10px] text-muted-foreground">Last scan: {lastRun}</span>}
          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </PageHeader>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Opportunities", value: hasData ? recs.length : "—", icon: Sparkles, color: "hsl(var(--primary))" },
          { label: "Active Clients", value: hasData ? uniqueClients : "—", icon: Users, color: "hsl(211 96% 50%)" },
          { label: "Est. Monthly Revenue", value: hasData ? `$${totalMonthly.toLocaleString()}` : "—", icon: DollarSign, color: "hsl(142 72% 42%)" },
          { label: "Est. Annual Revenue", value: hasData ? `$${totalAnnual.toLocaleString()}` : "—", icon: TrendingUp, color: "hsl(var(--primary))" },
          { label: "High/Critical Priority", value: hasData ? criticalCount : "—", icon: AlertTriangle, color: "hsl(25 95% 53%)" },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: `${c.color}15` }}>
                <c.icon className="h-5 w-5" style={{ color: c.color }} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{c.value}</p>
                <p className="text-[11px] text-muted-foreground">{c.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className="text-xs">All Opportunities</TabsTrigger>
          <TabsTrigger value="by-client" className="text-xs">By Client</TabsTrigger>
          <TabsTrigger value="by-service" className="text-xs">By Service</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {!hasData ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary/30" />
                <h3 className="text-sm font-semibold text-foreground mb-1">No recommendations yet</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Recommendations are generated when clients visit their dashboard. As workspaces are used, the engine will analyze conditions and surface upsell opportunities here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recs.map((rec, i) => (
                <motion.div key={rec.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <Card className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-bold text-foreground">{rec.clientName}</span>
                          <Badge variant="outline" className="text-[9px]" style={{ borderColor: urgencyColor[rec.urgency], color: urgencyColor[rec.urgency] }}>
                            {rec.urgency}
                          </Badge>
                          <Badge variant="outline" className="text-[9px]" style={{ borderColor: statusColor[rec.status], color: statusColor[rec.status] }}>
                            {rec.status}
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold text-primary">{rec.serviceName}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">{rec.reason}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-foreground">${rec.projectedMonthly.toLocaleString()}<span className="text-[10px] font-normal text-muted-foreground">/mo</span></p>
                        <p className="text-[10px] text-muted-foreground">Fit: {rec.fitScore}%</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-client" className="mt-4">
          {clientRanking.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No data yet.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {clientRanking.map((cl, i) => (
                <motion.div key={cl.name} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{cl.name}</h4>
                        <p className="text-xs text-muted-foreground">{cl.count} opportunit{cl.count !== 1 ? "ies" : "y"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-foreground">${cl.totalMonthly.toLocaleString()}<span className="text-[10px] font-normal text-muted-foreground">/mo</span></p>
                        <p className="text-[10px] text-muted-foreground">${(cl.totalMonthly * 12).toLocaleString()}/yr</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-service" className="mt-4">
          {serviceRanking.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No data yet.</CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {serviceRanking.map((svc, i) => (
                <motion.div key={svc.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card>
                    <CardContent className="p-4 space-y-2">
                      <h4 className="text-sm font-bold text-foreground">{svc.name}</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{svc.count} client{svc.count !== 1 ? "s" : ""}</span>
                        <span className="text-sm font-black text-foreground">${svc.totalMonthly.toLocaleString()}<span className="text-[10px] font-normal text-muted-foreground">/mo</span></span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
