import { motion } from "framer-motion";
import { Users, Activity, AlertTriangle, Heart, DollarSign, ExternalLink, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface ClientRow {
  id: string;
  business_name: string;
  industry: string | null;
  status: string;
  health?: number;
  alerts?: number;
  opportunity?: number;
}

export default function AdminMonitoring() {
  const navigate = useNavigate();
  const { setViewMode, setActiveClientId } = useWorkspace();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, alerts: 0, lowHealth: 0, automationErrors: 0, missedRevenue: 0 });

  useEffect(() => {
    supabase.from("clients").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      const rows = (data ?? []).map(c => ({
        id: c.id,
        business_name: c.business_name,
        industry: c.industry,
        status: c.status,
        health: Math.floor(Math.random() * 40 + 55), // mock
        alerts: Math.floor(Math.random() * 5),
        opportunity: Math.floor(Math.random() * 8000 + 2000),
      }));
      setClients(rows);
      setStats({
        total: rows.length,
        active: rows.filter(r => r.status === "active").length,
        alerts: rows.reduce((s, r) => s + (r.alerts || 0), 0),
        lowHealth: rows.filter(r => (r.health || 0) < 60).length,
        automationErrors: Math.floor(Math.random() * 5),
        missedRevenue: rows.reduce((s, r) => s + (r.opportunity || 0), 0),
      });
    });
  }, []);

  const openWorkspace = (id: string) => {
    setViewMode("workspace");
    setActiveClientId(id);
    navigate("/");
  };

  const healthColor = (s: number) => {
    if (s >= 80) return "hsl(var(--nl-sky))";
    if (s >= 60) return "hsl(var(--nl-neon))";
    return "hsl(var(--nl-deep))";
  };

  const statCards = [
    { label: "Total Clients", value: stats.total, icon: Users, color: "hsl(var(--nl-sky))" },
    { label: "Active Clients", value: stats.active, icon: Activity, color: "hsl(var(--nl-electric))" },
    { label: "Active Alerts", value: stats.alerts, icon: AlertTriangle, color: "hsl(var(--nl-neon))" },
    { label: "Low Health Score", value: stats.lowHealth, icon: Heart, color: "hsl(var(--nl-deep))" },
    { label: "Automation Errors", value: stats.automationErrors, icon: TrendingDown, color: "hsl(var(--nl-electric))" },
    { label: "Missed Revenue", value: `$${Math.round(stats.missedRevenue / 1000)}K`, icon: DollarSign, color: "hsl(var(--nl-cyan))" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Client Monitoring</h1>
        <p className="text-sm text-white/50 mt-1">Platform-wide health and alert monitoring</p>
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
          <CardTitle className="text-sm font-semibold text-white/80">Client Health Overview</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {["Business Name", "Industry", "Health Score", "Active Alerts", "Monthly Opportunity", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] text-white/40 uppercase tracking-wider font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{c.business_name}</td>
                  <td className="px-4 py-3 text-white/60">{c.industry || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${c.health}%`, background: healthColor(c.health!) }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: healthColor(c.health!) }}>{c.health}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(c.alerts || 0) > 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[hsla(211,96%,60%,.15)] text-[hsl(var(--nl-neon))]">{c.alerts} alerts</span>
                    ) : (
                      <span className="text-white/30 text-xs">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[hsl(var(--nl-sky))] font-semibold text-xs">${c.opportunity?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openWorkspace(c.id)} className="text-[hsl(var(--nl-sky))] hover:text-white transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
              {clients.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-white/30">No clients found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
