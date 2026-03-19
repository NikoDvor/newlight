import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DollarSign, TrendingUp, AlertTriangle, Users, BarChart3,
  ArrowUpRight, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface ClientRec {
  clientName: string;
  clientId: string;
  serviceName: string;
  serviceKey: string;
  urgency: string;
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

export default function AdminRevenueExpansion() {
  const [recs, setRecs] = useState<ClientRec[]>([]);
  const [clients, setClients] = useState<{ id: string; business_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("recommended_services").select("*").eq("recommendation_status", "Active").order("priority_rank"),
      supabase.from("clients").select("id, business_name"),
    ]).then(([recsRes, clientsRes]) => {
      const cl = clientsRes.data || [];
      setClients(cl);
      const clientMap = Object.fromEntries(cl.map((c: any) => [c.id, c.business_name]));
      setRecs(
        (recsRes.data || []).map((r: any) => ({
          clientName: clientMap[r.client_id] || "Unknown",
          clientId: r.client_id,
          serviceName: r.service_name,
          serviceKey: r.service_key,
          urgency: r.urgency_level,
          projectedMonthly: r.projected_monthly_revenue_impact || 0,
          projectedAnnual: r.projected_annual_revenue_impact || 0,
          fitScore: r.fit_score || 0,
          reason: r.reason_summary || "",
        }))
      );
      setLoading(false);
    });
  }, []);

  const totalMonthly = recs.reduce((s, r) => s + r.projectedMonthly, 0);
  const totalAnnual = recs.reduce((s, r) => s + r.projectedAnnual, 0);
  const criticalCount = recs.filter((r) => r.urgency === "Critical" || r.urgency === "High").length;

  // Group by service
  const byService: Record<string, ClientRec[]> = {};
  recs.forEach((r) => {
    if (!byService[r.serviceName]) byService[r.serviceName] = [];
    byService[r.serviceName].push(r);
  });
  const serviceRanking = Object.entries(byService)
    .map(([name, items]) => ({ name, count: items.length, totalMonthly: items.reduce((s, i) => s + i.projectedMonthly, 0) }))
    .sort((a, b) => b.totalMonthly - a.totalMonthly);

  const hasData = recs.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Revenue Expansion" description="Cross-client recommended services and upsell pipeline." />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Opportunities", value: hasData ? recs.length : "—", icon: Sparkles, color: "hsl(var(--primary))" },
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
          <TabsTrigger value="by-service" className="text-xs">By Service</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {!hasData ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary/30" />
                <h3 className="text-sm font-semibold text-foreground mb-1">No recommendations yet</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  As clients use the platform, the recommendation engine will analyze their workspace and surface the highest-value services here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recs.map((rec, i) => (
                <motion.div key={`${rec.clientId}-${rec.serviceKey}`}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <Card className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-bold text-foreground">{rec.clientName}</span>
                          <Badge variant="outline" className="text-[9px]" style={{ borderColor: urgencyColor[rec.urgency], color: urgencyColor[rec.urgency] }}>
                            {rec.urgency}
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
