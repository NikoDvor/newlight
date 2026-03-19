import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Play, CheckCircle2, XCircle, Clock, Activity, AlertTriangle, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PROFILES, EVENT_REGISTRY } from "@/lib/automationEngine";

const statusColor: Record<string, string> = {
  completed: "bg-emerald-500/20 text-emerald-400",
  Completed: "bg-emerald-500/20 text-emerald-400",
  running: "bg-sky-500/20 text-sky-400",
  Running: "bg-sky-500/20 text-sky-400",
  failed: "bg-red-500/20 text-red-400",
  Failed: "bg-red-500/20 text-red-400",
  queued: "bg-amber-500/20 text-amber-400",
  Queued: "bg-amber-500/20 text-amber-400",
  Pending: "bg-amber-500/20 text-amber-400",
  Skipped: "bg-white/10 text-white/40",
  cancelled: "bg-white/10 text-white/40",
};

function SBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={`border-0 text-[10px] font-semibold ${statusColor[status] || "bg-white/10 text-white/50"}`}>{status}</Badge>;
}

export default function AdminAutomations() {
  const [automations, setAutomations] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ total: 0, active: 0, failed: 0, completed: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from("automations").select("*").order("created_at", { ascending: false }).then(r => {
        const data = r.data ?? [];
        setAutomations(data);
        setMetrics(prev => ({ ...prev, total: data.length, active: data.filter((a: any) => a.enabled).length }));
      }),
      supabase.from("automation_runs").select("*").order("started_at", { ascending: false }).limit(50).then(r => {
        const data = r.data ?? [];
        setRuns(data);
        setMetrics(prev => ({
          ...prev,
          failed: data.filter((r: any) => r.status === "failed").length,
          completed: data.filter((r: any) => r.status === "completed").length,
        }));
      }),
      supabase.from("automation_action_logs").select("*").order("created_at", { ascending: false }).limit(50).then(r => setActionLogs(r.data ?? [])),
      supabase.from("automation_events").select("*").order("created_at", { ascending: false }).limit(50).then(r => setEvents(r.data ?? [])),
    ]);
  }, []);

  const stats = [
    { label: "Total Automations", value: metrics.total.toString(), icon: Zap, color: "hsl(var(--nl-electric))" },
    { label: "Active", value: metrics.active.toString(), icon: Play, color: "hsl(var(--nl-neon))" },
    { label: "Completed Runs", value: metrics.completed.toString(), icon: CheckCircle2, color: "hsl(var(--nl-sky))" },
    { label: "Failed Runs", value: metrics.failed.toString(), icon: AlertTriangle, color: metrics.failed > 0 ? "#ef4444" : "hsl(var(--nl-sky))" },
  ];

  const hCls = "text-[10px] text-white/40 uppercase tracking-wider font-semibold py-3 px-4 text-left";
  const cCls = "text-sm text-white/70 py-3 px-4";

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Automations & Workflows</h1>
          <p className="text-sm text-white/50 mt-1">Orchestration engine connecting all platform systems</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 bg-white/[0.04] backdrop-blur-sm">
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

      <Tabs defaultValue="automations" className="space-y-4">
        <TabsList className="bg-white/[0.04] border border-white/[0.06]">
          <TabsTrigger value="automations" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10">Automations</TabsTrigger>
          <TabsTrigger value="profiles" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10">Profiles</TabsTrigger>
          <TabsTrigger value="runs" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10">Recent Runs</TabsTrigger>
          <TabsTrigger value="events" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10">Events</TabsTrigger>
          <TabsTrigger value="logs" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10">Action Logs</TabsTrigger>
          <TabsTrigger value="registry" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10">Event Registry</TabsTrigger>
        </TabsList>

        {/* AUTOMATIONS */}
        <TabsContent value="automations">
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">All Automations</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              {automations.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="h-10 w-10 text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/40 mb-1">No automations configured yet</p>
                  <p className="text-xs text-white/25">Automations are created from profiles or manually. Use the Profiles tab to seed defaults.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead><tr className="border-b border-white/[0.06]">
                    <th className={hCls}>Name</th><th className={hCls}>Category</th><th className={hCls}>Scope</th><th className={hCls}>Trigger</th><th className={hCls}>Status</th>
                  </tr></thead>
                  <tbody>
                    {automations.map((a: any) => (
                      <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className={cCls + " font-medium text-white"}>{a.name}</td>
                        <td className={cCls}>{(a as any).automation_category || "—"}</td>
                        <td className={cCls}>{(a as any).workspace_scope_type || "—"}</td>
                        <td className={cCls}><code className="text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded text-white/60">{a.trigger_event}</code></td>
                        <td className={cCls}>{a.enabled ? <SBadge status="Active" /> : <SBadge status="Disabled" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROFILES */}
        <TabsContent value="profiles">
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-white/80">Default Automation Profiles</CardTitle>
              <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/10"
                onClick={async () => {
                  for (const p of DEFAULT_PROFILES) {
                    const exists = automations.find((a: any) => (a as any).automation_key === p.automation_key);
                    if (!exists) {
                      await supabase.from("automations").insert({
                        name: p.automation_name,
                        trigger_event: p.trigger_event,
                        action_type: "multi_action",
                        action_config: p.action_config,
                        enabled: true,
                        client_id: null as any,
                        automation_key: p.automation_key,
                        automation_category: p.automation_category,
                        workspace_scope_type: p.workspace_scope_type,
                      } as any);
                    }
                  }
                  window.location.reload();
                }}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Seed All Profiles
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {DEFAULT_PROFILES.map((p, i) => (
                  <motion.div key={p.automation_key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div>
                      <p className="text-sm font-medium text-white">{p.automation_name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] text-white/40">{p.automation_category}</span>
                        <span className="text-[10px] text-white/30">•</span>
                        <code className="text-[10px] text-white/40">{p.trigger_event}</code>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-0 text-[10px] bg-white/[0.06] text-white/50">{p.workspace_scope_type}</Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RUNS */}
        <TabsContent value="runs">
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Recent Automation Runs</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              {runs.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-8">No automation runs recorded yet.</p>
              ) : (
                <table className="w-full">
                  <thead><tr className="border-b border-white/[0.06]">
                    <th className={hCls}>Automation</th><th className={hCls}>Related</th><th className={hCls}>Status</th><th className={hCls}>Started</th><th className={hCls}>Finished</th><th className={hCls}>Error</th>
                  </tr></thead>
                  <tbody>
                    {runs.map((r: any) => (
                      <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className={cCls + " font-medium text-white"}>{r.automation_id?.slice(0, 8)}…</td>
                        <td className={cCls}>{(r as any).related_type || "—"}</td>
                        <td className={cCls}><SBadge status={r.status} /></td>
                        <td className={cCls}>{r.started_at ? new Date(r.started_at).toLocaleString() : "—"}</td>
                        <td className={cCls}>{r.completed_at ? new Date(r.completed_at).toLocaleString() : "—"}</td>
                        <td className={cCls + " text-red-400 text-xs max-w-48 truncate"}>{r.error || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVENTS */}
        <TabsContent value="events">
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Recent Events</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              {events.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-8">No events emitted yet.</p>
              ) : (
                <table className="w-full">
                  <thead><tr className="border-b border-white/[0.06]">
                    <th className={hCls}>Event</th><th className={hCls}>Name</th><th className={hCls}>Related</th><th className={hCls}>Created</th>
                  </tr></thead>
                  <tbody>
                    {events.map((e: any) => (
                      <tr key={e.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className={cCls}><code className="text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded text-white/60">{e.event_type}</code></td>
                        <td className={cCls}>{(e as any).event_name || "—"}</td>
                        <td className={cCls}>{(e as any).related_type || "—"}</td>
                        <td className={cCls}>{new Date(e.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACTION LOGS */}
        <TabsContent value="logs">
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Action Logs</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              {actionLogs.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-8">No action logs yet.</p>
              ) : (
                <table className="w-full">
                  <thead><tr className="border-b border-white/[0.06]">
                    <th className={hCls}>Action</th><th className={hCls}>Type</th><th className={hCls}>Status</th><th className={hCls}>Result</th><th className={hCls}>Error</th><th className={hCls}>Time</th>
                  </tr></thead>
                  <tbody>
                    {actionLogs.map((l: any) => (
                      <tr key={l.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className={cCls + " font-medium text-white"}>{l.action_key}</td>
                        <td className={cCls}>{l.action_type}</td>
                        <td className={cCls}><SBadge status={l.action_status} /></td>
                        <td className={cCls + " text-xs max-w-48 truncate"}>{l.result_summary || "—"}</td>
                        <td className={cCls + " text-red-400 text-xs max-w-32 truncate"}>{l.error_message || "—"}</td>
                        <td className={cCls}>{new Date(l.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EVENT REGISTRY */}
        <TabsContent value="registry">
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Supported Event Triggers</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(EVENT_REGISTRY).map(([key, val], i) => (
                  <motion.div key={key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                    <Zap className="h-3 w-3 text-[hsl(var(--nl-electric))] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white/70 truncate">{val.name}</p>
                      <code className="text-[9px] text-white/30">{key}</code>
                    </div>
                    <Badge variant="outline" className="border-0 text-[9px] bg-white/[0.04] text-white/40 ml-auto shrink-0">{val.category}</Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
