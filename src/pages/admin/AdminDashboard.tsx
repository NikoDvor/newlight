import { motion } from "framer-motion";
import { Users, Activity, DollarSign, AlertTriangle, Zap, Server, Plus, ArrowRight, Hammer, Clock, CheckCircle2, Play, Target, FileText, Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [clientCount, setClientCount] = useState(0);
  const [fixCount, setFixCount] = useState(0);
  const [prospectCount, setProspectCount] = useState(0);
  const [demoInProgress, setDemoInProgress] = useState(0);
  const [awaitingClosing, setAwaitingClosing] = useState(0);
  const [provisioningCount, setProvisioningCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [autoActive, setAutoActive] = useState(0);
  const [autoFailed, setAutoFailed] = useState(0);
  const [autoTotal, setAutoTotal] = useState(0);
  const [pipelineStages, setPipelineStages] = useState<Record<string, number>>({});
  const [templateCount, setTemplateCount] = useState(0);
  const [deploymentCount, setDeploymentCount] = useState(0);

  useEffect(() => {
    Promise.all([
      supabase.from("clients").select("id", { count: "exact", head: true }).then(({ count }) => setClientCount(count ?? 0)),
      supabase.from("fix_now_items").select("id", { count: "exact", head: true }).eq("status", "open").then(({ count }) => setFixCount(count ?? 0)),
      supabase.from("prospects").select("id", { count: "exact", head: true }).then(({ count }) => setProspectCount(count ?? 0)),
      supabase.from("demo_builds").select("id", { count: "exact", head: true }).eq("status", "build_in_progress").then(({ count }) => setDemoInProgress(count ?? 0)),
      supabase.from("demo_builds").select("id", { count: "exact", head: true }).eq("status", "awaiting_closing").then(({ count }) => setAwaitingClosing(count ?? 0)),
      supabase.from("provision_queue").select("id", { count: "exact", head: true }).eq("provision_status", "provisioning").then(({ count }) => setProvisioningCount(count ?? 0)),
      supabase.from("audit_logs").select("action, module, created_at, metadata").order("created_at", { ascending: false }).limit(8).then(({ data }) => setRecentActivity(data ?? [])),
      supabase.from("automations").select("id, enabled").then(({ data }) => {
        const d = data ?? [];
        setAutoTotal(d.length);
        setAutoActive(d.filter((a: any) => a.enabled).length);
      }),
      supabase.from("automation_runs").select("id, status").order("started_at", { ascending: false }).limit(200).then(({ data }) => {
        setAutoFailed((data ?? []).filter((r: any) => r.status === "failed").length);
      }),
      supabase.from("crm_deals").select("pipeline_stage").then(({ data }) => {
        const stages: Record<string, number> = {};
        (data ?? []).forEach((d: any) => { stages[d.pipeline_stage] = (stages[d.pipeline_stage] || 0) + 1; });
        setPipelineStages(stages);
      }),
      supabase.from("workspace_templates" as any).select("id", { count: "exact", head: true }).then(({ count }: any) => setTemplateCount(count ?? 0)),
      supabase.from("template_deployments" as any).select("id", { count: "exact", head: true }).then(({ count }: any) => setDeploymentCount(count ?? 0)),
    ]);
  }, []);

  const stats = [
    { label: "Total Clients", value: clientCount.toString(), icon: Users, color: "hsl(var(--nl-sky))" },
    { label: "Prospects", value: prospectCount.toString(), icon: Zap, color: "hsl(var(--nl-neon))" },
    { label: "Demo Builds", value: demoInProgress.toString(), icon: Hammer, color: "hsl(var(--nl-cyan))" },
    { label: "Awaiting Closing", value: awaitingClosing.toString(), icon: Clock, color: "hsl(var(--nl-electric))" },
    { label: "Provisioning", value: provisioningCount.toString(), icon: Server, color: "hsl(var(--nl-sky))" },
    { label: "Fix Now Items", value: fixCount.toString(), icon: AlertTriangle, color: "hsl(var(--nl-electric))" },
  ];

  const actionIconMap: Record<string, typeof Zap> = {
    client_activated: CheckCircle2,
    client_activated_from_demo: CheckCircle2,
    demo_build_created: Hammer,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-sm text-white/50 mt-1">Platform overview and system monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/admin/welcome")} variant="outline" className="border-white/10 text-white hover:bg-white/10">
            <Play className="h-4 w-4 mr-1" /> Replay Intro
          </Button>
          <Button onClick={() => navigate("/admin/demo-builds")} variant="outline" className="border-white/10 text-white hover:bg-white/10">
            <Hammer className="h-4 w-4 mr-1" /> New Demo Build
          </Button>
          <Button onClick={() => navigate("/admin/clients")} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
            <Plus className="h-4 w-4 mr-1" /> New Client
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}>
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

      {/* Automation Health */}
      <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white/80">Automation Health</CardTitle>
          <Button variant="ghost" size="sm" className="text-white/40 hover:text-white text-xs" onClick={() => navigate("/admin/automations")}>
            View All <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{autoActive}</p>
              <p className="text-[10px] text-white/40 mt-1">Active Automations</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{autoTotal}</p>
              <p className="text-[10px] text-white/40 mt-1">Total Configured</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${autoFailed > 0 ? "text-red-400" : "text-white"}`}>{autoFailed}</p>
              <p className="text-[10px] text-white/40 mt-1">Failed Runs</p>
            </div>
          </div>
          {autoFailed > 0 && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
              <p className="text-xs text-red-300">{autoFailed} failed automation run{autoFailed > 1 ? "s" : ""} require attention</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline Health + Templates */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-white/80">Pipeline Health</CardTitle>
            <Button variant="ghost" size="sm" className="text-white/40 hover:text-white text-xs" onClick={() => navigate("/admin/sales-pipeline")}>
              View Pipeline <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.keys(pipelineStages).length === 0 ? (
              <p className="text-xs text-white/30 py-4 text-center">No deals in pipeline</p>
            ) : (
              Object.entries(pipelineStages).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-3 w-3 text-[hsl(var(--nl-neon))]" />
                    <span className="text-xs text-white/70 capitalize">{stage.replace(/_/g, " ")}</span>
                  </div>
                  <Badge className="bg-white/10 text-white border-0 text-[10px]">{count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-white/80">Templates & Deployment</CardTitle>
            <Button variant="ghost" size="sm" className="text-white/40 hover:text-white text-xs" onClick={() => navigate("/admin/templates")}>
              Manage <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{templateCount}</p>
                <p className="text-[10px] text-white/40 mt-1">Active Templates</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{deploymentCount}</p>
                <p className="text-[10px] text-white/40 mt-1">Deployments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/80">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-white/30 py-4 text-center">No recent activity</p>
            ) : recentActivity.map((a, i) => {
              const Icon = actionIconMap[a.action] || Activity;
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06, duration: 0.25 }}
                  className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: "hsla(211,96%,60%,.1)" }}>
                    <Icon className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
                  </div>
                  <span className="text-sm text-white/70 flex-1">{a.action.replace(/_/g, " ")}{a.module ? ` · ${a.module}` : ""}</span>
                  <span className="text-[10px] text-white/30">{new Date(a.created_at).toLocaleDateString()}</span>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-white/80">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "New Demo Build", path: "/admin/demo-builds" },
              { label: "Client Activation", path: "/admin/activation" },
              { label: "View Prospects", path: "/admin/prospects" },
              { label: "Provision Queue", path: "/admin/provision" },
              { label: "Deploy Template", path: "/admin/templates" },
              { label: "Review Fix Now Items", path: "/admin/fix-now" },
              { label: "Executive Dashboard", path: "/admin/executive" },
            ].map((action, i) => (
              <motion.button key={action.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.05 }}
                onClick={() => navigate(action.path)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200 group">
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
