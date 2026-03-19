import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap, Play, CheckCircle2, XCircle, Clock, Activity, AlertTriangle, RotateCcw, Power, Copy, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PROFILES, EVENT_REGISTRY } from "@/lib/automationEngine";
import { toast } from "@/hooks/use-toast";

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
  Active: "bg-emerald-500/20 text-emerald-400",
  Disabled: "bg-white/10 text-white/40",
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

  const fetchData = useCallback(() => {
    Promise.all([
      supabase.from("automations").select("*").order("created_at", { ascending: false }).then(r => {
        const data = r.data ?? [];
        setAutomations(data);
        setMetrics(prev => ({ ...prev, total: data.length, active: data.filter((a: any) => a.enabled).length }));
      }),
      supabase.from("automation_runs").select("*").order("started_at", { ascending: false }).limit(100).then(r => {
        const data = r.data ?? [];
        setRuns(data);
        setMetrics(prev => ({
          ...prev,
          failed: data.filter((r: any) => r.status === "failed").length,
          completed: data.filter((r: any) => r.status === "completed").length,
        }));
      }),
      supabase.from("automation_action_logs").select("*").order("created_at", { ascending: false }).limit(100).then(r => setActionLogs(r.data ?? [])),
      supabase.from("automation_events").select("*").order("created_at", { ascending: false }).limit(100).then(r => setEvents(r.data ?? [])),
    ]);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const autoNameMap = Object.fromEntries(automations.map((a: any) => [a.id, a.name]));

  const toggleEnabled = async (id: string, currentEnabled: boolean) => {
    await supabase.from("automations").update({ enabled: !currentEnabled } as any).eq("id", id);
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled: !currentEnabled } : a));
    setMetrics(prev => ({ ...prev, active: prev.active + (currentEnabled ? -1 : 1) }));
    toast({ title: currentEnabled ? "Automation disabled" : "Automation enabled" });
  };

  const duplicateAutomation = async (auto: any) => {
    const { id, created_at, updated_at, ...rest } = auto;
    await supabase.from("automations").insert({ ...rest, name: `${rest.name} (Copy)`, enabled: false } as any);
    toast({ title: "Automation duplicated" });
    fetchData();
  };

  const failedRuns = runs.filter((r: any) => r.status === "failed");

  const stats = [
    { label: "Total Automations", value: metrics.total.toString(), icon: Zap, color: "hsl(var(--nl-electric))" },
    { label: "Active", value: metrics.active.toString(), icon: Play, color: "hsl(var(--nl-neon))" },
    { label: "Completed Runs", value: metrics.completed.toString(), icon: CheckCircle2, color: "hsl(var(--nl-sky))" },
    { label: "Failed Runs", value: metrics.failed.toString(), icon: AlertTriangle, color: metrics.failed > 0 ? "#ef4444" : "hsl(var(--nl-sky))" },
  ];

  const hCls = "text-[10px] text-white/40 uppercase tracking-wider font-semibold py-3 px-4 text-left";
  const cCls = "text-sm text-white/70 py-3 px-4";

  const renderRunsTable = (data: any[], emptyMsg: string) => (
    data.length === 0 ? (
      <div className="text-center py-12">
        <Activity className="h-10 w-10 text-white/20 mx-auto mb-3" />
        <p className="text-xs text-white/30">{emptyMsg}</p>
      </div>
    ) : (
      <table className="w-full">
        <thead><tr className="border-b border-white/[0.06]">
          <th className={hCls}>Automation</th><th className={hCls}>Related</th><th className={hCls}>Status</th><th className={hCls}>Started</th><th className={hCls}>Finished</th><th className={hCls}>Error</th>
        </tr></thead>
        <tbody>
          {data.map((r: any) => (
            <tr key={r.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
              <td className={cCls + " font-medium text-white"}>{autoNameMap[r.automation_id] || r.automation_id?.slice(0, 8) + "…"}</td>
              <td className={cCls}>{(r as any).related_type || "—"}</td>
              <td className={cCls}><SBadge status={r.status} /></td>
              <td className={cCls}>{r.started_at ? new Date(r.started_at).toLocaleString() : "—"}</td>
              <td className={cCls}>{r.completed_at ? new Date(r.completed_at).toLocaleString() : "—"}</td>
              <td className={cCls + " text-red-400 text-xs max-w-48 truncate"}>{r.error || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  );

  // Compute last run and success rate per automation
  const autoStats = (autoId: string) => {
    const autoRuns = runs.filter((r: any) => r.automation_id === autoId);
    const lastRun = autoRuns[0];
    const total = autoRuns.length;
    const succeeded = autoRuns.filter((r: any) => r.status === "completed").length;
    const rate = total > 0 ? Math.round((succeeded / total) * 100) : null;
    return { lastRun, rate, totalRuns: total };
  };

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
        <TabsList className="bg-white/[0.04] border border-white/[0.06] flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="automations" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10 text-xs">All Automations</TabsTrigger>
          <TabsTrigger value="profiles" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10 text-xs">Trigger Profiles</TabsTrigger>
          <TabsTrigger value="runs" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10 text-xs">Recent Runs</TabsTrigger>
          <TabsTrigger value="failed" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10 text-xs">
            Failed Runs {metrics.failed > 0 && <span className="ml-1 bg-red-500/30 text-red-300 text-[9px] px-1.5 py-0.5 rounded-full">{metrics.failed}</span>}
          </TabsTrigger>
          <TabsTrigger value="events" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10 text-xs">Events</TabsTrigger>
          <TabsTrigger value="logs" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10 text-xs">Action Logs</TabsTrigger>
          <TabsTrigger value="registry" className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/10 text-xs">Event Registry</TabsTrigger>
        </TabsList>

        {/* ALL AUTOMATIONS */}
        <TabsContent value="automations">
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">All Automations</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              {automations.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="h-10 w-10 text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/40 mb-1">No automations configured yet</p>
                  <p className="text-xs text-white/25">Use the Trigger Profiles tab to seed default automation workflows.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead><tr className="border-b border-white/[0.06]">
                    <th className={hCls}>Name</th><th className={hCls}>Category</th><th className={hCls}>Scope</th><th className={hCls}>Trigger</th><th className={hCls}>Last Run</th><th className={hCls}>Success Rate</th><th className={hCls}>Status</th><th className={hCls}>Actions</th>
                  </tr></thead>
                  <tbody>
                    {automations.map((a: any) => {
                      const { lastRun, rate, totalRuns } = autoStats(a.id);
                      return (
                        <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          <td className={cCls + " font-medium text-white"}>{a.name}</td>
                          <td className={cCls}>{(a as any).automation_category || "—"}</td>
                          <td className={cCls}><Badge variant="outline" className="border-0 text-[9px] bg-white/[0.06] text-white/50">{(a as any).workspace_scope_type || "—"}</Badge></td>
                          <td className={cCls}><code className="text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded text-white/60">{a.trigger_event}</code></td>
                          <td className={cCls + " text-xs"}>{lastRun ? new Date(lastRun.started_at).toLocaleDateString() : "Never"}</td>
                          <td className={cCls + " text-xs"}>{rate !== null ? `${rate}% (${totalRuns})` : "—"}</td>
                          <td className={cCls}>
                            <div className="flex items-center gap-2">
                              <Switch checked={a.enabled} onCheckedChange={() => toggleEnabled(a.id, a.enabled)} className="scale-75" />
                              <SBadge status={a.enabled ? "Active" : "Disabled"} />
                            </div>
                          </td>
                          <td className={cCls}>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10" onClick={() => duplicateAutomation(a)} title="Duplicate">
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRIGGER PROFILES */}
        <TabsContent value="profiles">
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-white/80">Default Automation Profiles</CardTitle>
              <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/10"
                onClick={async () => {
                  let seeded = 0;
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
                      seeded++;
                    }
                  }
                  toast({ title: seeded > 0 ? `${seeded} profiles seeded` : "All profiles already exist" });
                  fetchData();
                }}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Seed All Profiles
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {DEFAULT_PROFILES.map((p, i) => {
                  const seeded = automations.some((a: any) => (a as any).automation_key === p.automation_key);
                  return (
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
                      <div className="flex items-center gap-2">
                        {seeded && <Badge variant="outline" className="border-0 text-[9px] bg-emerald-500/20 text-emerald-400">Seeded</Badge>}
                        <Badge variant="outline" className="border-0 text-[10px] bg-white/[0.06] text-white/50">{p.workspace_scope_type}</Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECENT RUNS */}
        <TabsContent value="runs">
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Recent Automation Runs</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              {renderRunsTable(runs, "No automation runs recorded yet.")}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAILED RUNS */}
        <TabsContent value="failed">
          <Card className="border-0 bg-white/[0.04]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/80 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" /> Failed Runs
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              {renderRunsTable(failedRuns, "No failed runs — all clear.")}
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
            <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Supported Event Triggers ({Object.keys(EVENT_REGISTRY).length})</CardTitle></CardHeader>
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
