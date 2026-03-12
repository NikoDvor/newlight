import { motion } from "framer-motion";
import { Users, Activity, DollarSign, AlertTriangle, Zap, Server, Plus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const mockActivity = [
  { id: 1, text: "New client 'Bright Dental' created", time: "2m ago", icon: Users },
  { id: 2, text: "Lead generated for 'AutoPro Motors'", time: "5m ago", icon: Zap },
  { id: 3, text: "Automation triggered: Review request", time: "12m ago", icon: Activity },
  { id: 4, text: "Fix Now: Integration disconnected", time: "18m ago", icon: AlertTriangle },
  { id: 5, text: "Client 'Sunrise Café' provisioned", time: "25m ago", icon: Server },
  { id: 6, text: "New prospect added: 'Peak Fitness'", time: "32m ago", icon: Plus },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [clientCount, setClientCount] = useState(0);
  const [fixCount, setFixCount] = useState(0);

  useEffect(() => {
    supabase.from("clients").select("id", { count: "exact", head: true }).then(({ count }) => setClientCount(count ?? 0));
    supabase.from("fix_now_items").select("id", { count: "exact", head: true }).eq("status", "open").then(({ count }) => setFixCount(count ?? 0));
  }, []);

  const stats = [
    { label: "Total Clients", value: clientCount.toString(), icon: Users, color: "hsl(var(--nl-sky))" },
    { label: "Active Workspaces", value: clientCount.toString(), icon: Server, color: "hsl(var(--nl-electric))" },
    { label: "Leads Generated", value: "247", icon: Zap, color: "hsl(var(--nl-neon))" },
    { label: "Revenue Alerts", value: "12", icon: DollarSign, color: "hsl(var(--nl-cyan))" },
    { label: "System Health", value: "98%", icon: Activity, color: "hsl(var(--nl-sky))" },
    { label: "Fix Now Items", value: fixCount.toString(), icon: AlertTriangle, color: "hsl(var(--nl-electric))" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-sm text-white/50 mt-1">Platform overview and system monitoring</p>
        </div>
        <Button onClick={() => navigate("/admin/clients")} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
          <Plus className="h-4 w-4 mr-1" /> New Client
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
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

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/80">Live Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockActivity.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.25 }}
                className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0"
              >
                <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "hsla(211,96%,60%,.1)" }}>
                  <a.icon className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
                </div>
                <span className="text-sm text-white/70 flex-1">{a.text}</span>
                <span className="text-[10px] text-white/30">{a.time}</span>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/80">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Create New Client", path: "/admin/clients" },
              { label: "View Provision Queue", path: "/admin/provision" },
              { label: "Review Fix Now Items", path: "/admin/fix-now" },
              { label: "System Audit Logs", path: "/admin/audit-logs" },
              { label: "Manage Packages", path: "/admin/packages" },
            ].map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                onClick={() => navigate(action.path)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200 group"
              >
                <span>{action.label}</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
