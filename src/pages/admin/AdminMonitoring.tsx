import { motion } from "framer-motion";
import { Users, Activity, AlertTriangle, Heart, DollarSign, ExternalLink, TrendingDown, Zap, Plug, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface ClientRow {
  id: string;
  business_name: string;
  industry: string | null;
  status: string;
  health: number;
  alerts: number;
  opportunity: number;
  onboardingPct: number;
  integrationsPct: number;
  automationErrors: number;
  revenue: number;
}

export default function AdminMonitoring() {
  const navigate = useNavigate();
  const { setViewMode, setActiveClientId } = useWorkspace();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, alerts: 0, lowHealth: 0, automationErrors: 0, totalRevenue: 0 });

  useEffect(() => {
    const load = async () => {
      const { data: allClients } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      const clientIds = (allClients || []).map(c => c.id);

      // Fetch health scores, integrations, onboarding, automation errors, and revenue in parallel
      const [healthRes, intgRes, onbRes, autoErrRes, revRes] = await Promise.all([
        supabase.from("client_health_scores").select("client_id, overall_score").in("client_id", clientIds),
        supabase.from("client_integrations").select("client_id, status").in("client_id", clientIds),
        supabase.from("onboarding_progress").select("*").in("client_id", clientIds),
        supabase.from("automation_runs").select("client_id, status").in("client_id", clientIds).eq("status", "failed"),
        supabase.from("financial_adjustments").select("client_id, amount").in("client_id", clientIds).eq("type", "revenue"),
      ]);

      const healthMap = new Map((healthRes.data || []).map(h => [h.client_id, h.overall_score]));
      const intgByClient = new Map<string, any[]>();
      (intgRes.data || []).forEach(i => {
        const arr = intgByClient.get(i.client_id) || [];
        arr.push(i);
        intgByClient.set(i.client_id, arr);
      });
      const onbMap = new Map((onbRes.data || []).map(o => [o.client_id, o]));
      const autoErrByClient = new Map<string, number>();
      (autoErrRes.data || []).forEach(a => autoErrByClient.set(a.client_id, (autoErrByClient.get(a.client_id) || 0) + 1));
      const revByClient = new Map<string, number>();
      (revRes.data || []).forEach(r => revByClient.set(r.client_id, (revByClient.get(r.client_id) || 0) + Number(r.amount)));

      const rows: ClientRow[] = (allClients || []).map(c => {
        const intgs = intgByClient.get(c.id) || [];
        const connectedIntgs = intgs.filter((i: any) => i.status === "connected").length;
        const onb = onbMap.get(c.id);
        const onbSteps = onb ? Object.values(onb).filter(v => v === true).length : 0;
        return {
          id: c.id,
          business_name: c.business_name,
          industry: c.industry,
          status: c.status,
          health: healthMap.get(c.id) || 0,
          alerts: autoErrByClient.get(c.id) || 0,
          opportunity: 0,
          onboardingPct: Math.round((onbSteps / 8) * 100),
          integrationsPct: intgs.length > 0 ? Math.round((connectedIntgs / intgs.length) * 100) : 0,
          automationErrors: autoErrByClient.get(c.id) || 0,
          revenue: revByClient.get(c.id) || 0,
        };
      });

      setClients(rows);
      setStats({
        total: rows.length,
        active: rows.filter(r => r.status === "active").length,
        alerts: rows.reduce((s, r) => s + r.alerts, 0),
        lowHealth: rows.filter(r => r.health < 60 && r.health > 0).length,
        automationErrors: rows.reduce((s, r) => s + r.automationErrors, 0),
        totalRevenue: rows.reduce((s, r) => s + r.revenue, 0),
      });
    };
    load();
  }, []);

  const openWorkspace = (id: string) => {
    setViewMode("workspace");
    setActiveClientId(id);
    navigate("/");
  };

  const healthColor = (s: number) => {
    if (s >= 80) return "hsl(var(--nl-sky))";
    if (s >= 60) return "hsl(var(--nl-neon))";
    if (s > 0) return "hsl(var(--nl-deep))";
    return "hsl(var(--nl-sky))";
  };

  const statCards = [
    { label: "Total Clients", value: stats.total, icon: Users, color: "hsl(var(--nl-sky))" },
    { label: "Active Clients", value: stats.active, icon: Activity, color: "hsl(var(--nl-electric))" },
    { label: "Active Alerts", value: stats.alerts, icon: AlertTriangle, color: "hsl(var(--nl-neon))" },
    { label: "Low Health Score", value: stats.lowHealth, icon: Heart, color: "hsl(var(--nl-deep))" },
    { label: "Automation Errors", value: stats.automationErrors, icon: TrendingDown, color: "hsl(var(--nl-electric))" },
    { label: "Total Revenue", value: `$${Math.round(stats.totalRevenue / 1000)}K`, icon: DollarSign, color: "hsl(var(--nl-cyan))" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Client Monitoring</h1>
        <p className="text-sm text-white/50 mt-1">Platform-wide health, onboarding, integrations, and automation monitoring</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border-0 bg-white/[0.04] backdrop-blur-sm overflow-hidden" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-white/80">Client Command Center</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Business", "Status", "Health", "Onboarding", "Integrations", "Auto Errors", "Revenue", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] text-white/40 uppercase tracking-wider font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{c.business_name}</p>
                    <p className="text-[10px] text-white/40">{c.industry || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={c.status === "active" ? "bg-emerald-500/20 text-emerald-300 border-0" : "bg-white/10 text-white/50 border-0"}>
                      {c.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${c.health}%`, background: healthColor(c.health) }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: healthColor(c.health) }}>{c.health || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-[hsl(var(--nl-sky))]" style={{ width: `${c.onboardingPct}%` }} />
                      </div>
                      <span className="text-xs text-white/60">{c.onboardingPct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Plug className="h-3 w-3 text-white/30" />
                      <span className="text-xs text-white/60">{c.integrationsPct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.automationErrors > 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">{c.automationErrors} errors</span>
                    ) : (
                      <span className="text-white/30 text-xs">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[hsl(var(--nl-sky))] font-semibold text-xs">${c.revenue.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openWorkspace(c.id)} className="text-[hsl(var(--nl-sky))] hover:text-white transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
              {clients.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-white/30">No clients found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
