import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Award, BarChart3, CalendarClock, GraduationCap, PhoneCall, Sparkles, Target, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { getTrainingStatsForUser, type TrainingStats } from "@/lib/trainingStatsService";
import { YourForms } from "@/components/employee/YourForms";

const iso = (d: Date) => d.toISOString();
const startOfMonth = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); };

function formatRemaining(ms: number) {
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86400000);
  const hours = Math.floor((abs % 86400000) / 3600000);
  const minutes = Math.floor((abs % 3600000) / 60000);
  const seconds = Math.floor((abs % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

type Row = {
  id: string;
  kind: "Callback" | "Meeting";
  title: string;
  when: string; // ISO
  status: string;
};

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: typeof PhoneCall; tone?: "primary" | "success" | "warn" }) {
  const bg = tone === "success" ? "bg-emerald-500/15 text-emerald-400"
    : tone === "warn" ? "bg-amber-500/15 text-amber-400"
    : "bg-primary/15 text-primary";
  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${bg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function SectionCard({ title, icon: Icon, right, children }: { title: string; icon?: typeof PhoneCall; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="border-border/60 bg-card/70 backdrop-blur-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary" />} {title}
        </h2>
        {right}
      </div>
      {children}
    </Card>
  );
}

export function GenericPipelineDashboard() {
  const { user } = useWorkspace();
  const userId = user?.id;
  const [now, setNow] = useState(() => Date.now());
  const [rows, setRows] = useState<Row[]>([]);
  const [monthMeetings, setMonthMeetings] = useState(0);
  const [monthProposals, setMonthProposals] = useState<any[]>([]);
  const [monthObjections, setMonthObjections] = useState(0);
  const [monthCalls, setMonthCalls] = useState(0);
  const [objectionCounts, setObjectionCounts] = useState<{ category: string; count: number }[]>([]);
  const [unlocks, setUnlocks] = useState<any[]>([]);
  const [training, setTraining] = useState<TrainingStats | null>(null);
  const [dailyActivity, setDailyActivity] = useState<{ day: string; count: number }[]>([]);

  // live tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const monthStart = iso(startOfMonth());
      const fourteen = new Date(Date.now() - 13 * 86400000);
      fourteen.setHours(0, 0, 0, 0);

      const [
        { data: callbacks },
        { data: events },
        { data: monthEvents },
        { data: proposals },
        { data: objections },
        { data: outcomes },
        { data: unlockRows },
        { data: outcomes14 },
      ] = await Promise.all([
        (supabase as any).from("nl_bdr_leads").select("id, business_name, owner_name, callback_at, status").eq("user_id", userId).not("callback_at", "is", null),
        (supabase as any).from("bdr_calendar_events").select("id, title, starts_at, stage, outcome").eq("user_id", userId).gte("starts_at", new Date(Date.now() - 86400000).toISOString()),
        (supabase as any).from("bdr_calendar_events").select("id, starts_at").eq("user_id", userId).gte("starts_at", monthStart),
        (supabase as any).from("proposals").select("id, accepted_at, proposal_status, created_at").eq("assigned_salesman_user_id", userId).gte("created_at", monthStart),
        (supabase as any).from("nl_bdr_objections").select("objection_category, triggered_at").eq("user_id", userId),
        (supabase as any).from("bdr_call_outcomes").select("id, logged_at").eq("bdr_user_id", userId).gte("logged_at", monthStart),
        (supabase as any).from("nl_objection_unlocks").select("objection_category, foundation_unlocked, intermediate_unlocked, advanced_unlocked, foundation_passed, intermediate_passed, advanced_passed").eq("user_id", userId),
        (supabase as any).from("bdr_call_outcomes").select("logged_at").eq("bdr_user_id", userId).gte("logged_at", fourteen.toISOString()),
      ]);

      if (cancelled) return;

      const merged: Row[] = [];
      (callbacks || []).forEach((c: any) => {
        merged.push({
          id: `cb-${c.id}`,
          kind: "Callback",
          title: c.business_name || c.owner_name || "Lead",
          when: c.callback_at,
          status: c.status || "scheduled",
        });
      });
      (events || []).forEach((e: any) => {
        merged.push({
          id: `ev-${e.id}`,
          kind: "Meeting",
          title: e.title || "Meeting",
          when: e.starts_at,
          status: e.outcome || e.stage || "scheduled",
        });
      });
      merged.sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime());
      setRows(merged);

      setMonthMeetings((monthEvents || []).length);
      setMonthProposals(proposals || []);
      const monthObj = (objections || []).filter((o: any) => o.triggered_at && new Date(o.triggered_at) >= startOfMonth()).length;
      setMonthObjections(monthObj);
      setMonthCalls((outcomes || []).length);

      const counts = new Map<string, number>();
      (objections || []).forEach((o: any) => {
        const k = o.objection_category || "unknown";
        counts.set(k, (counts.get(k) ?? 0) + 1);
      });
      setObjectionCounts(Array.from(counts.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count));

      setUnlocks(unlockRows || []);

      // daily activity 14d
      const bucket = new Map<string, number>();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
        bucket.set(d.toISOString().slice(0, 10), 0);
      }
      (outcomes14 || []).forEach((o: any) => {
        if (!o.logged_at) return;
        const k = new Date(o.logged_at).toISOString().slice(0, 10);
        if (bucket.has(k)) bucket.set(k, (bucket.get(k) ?? 0) + 1);
      });
      setDailyActivity(Array.from(bucket.entries()).map(([day, count]) => ({ day: day.slice(5), count })));

      const stats = await getTrainingStatsForUser(userId);
      if (!cancelled) setTraining(stats);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const closedMonth = useMemo(
    () => monthProposals.filter((p) => p.accepted_at || p.proposal_status === "accepted").length,
    [monthProposals]
  );
  const closeRate = monthMeetings ? Math.round((closedMonth / monthMeetings) * 100) : 0;

  const topObjection = objectionCounts[0];
  const topUnlock = topObjection ? unlocks.find((u) => u.objection_category === topObjection.category) : null;
  const nextThreshold = topObjection ? (topObjection.count < 50 ? 50 : topObjection.count < 100 ? 100 : topObjection.count < 150 ? 150 : Math.ceil((topObjection.count + 1) / 50) * 50) : 50;
  const untilNext = topObjection ? Math.max(0, nextThreshold - topObjection.count) : 50;

  const activeModules = training?.moduleProgress.filter((m) => m.pct > 0).length ?? 0;
  const overallTrainingPct = training && training.moduleProgress.length
    ? Math.round(training.moduleProgress.reduce((s, m) => s + m.pct, 0) / training.moduleProgress.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* 0. YOUR FORMS — NewLight 5-form structure quick-links */}
      <YourForms />

      {/* 1. PIPELINE TABLE */}
      <SectionCard title="Pipeline — Upcoming Callbacks & Meetings" icon={CalendarClock} right={<span className="text-xs text-muted-foreground">{rows.length} items</span>}>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-6 text-sm text-muted-foreground text-center">No upcoming callbacks or meetings.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border/60">
                  <th className="text-left font-medium py-2 pr-3">Contact / Lead</th>
                  <th className="text-left font-medium py-2 pr-3">Type</th>
                  <th className="text-left font-medium py-2 pr-3">Date & Time</th>
                  <th className="text-left font-medium py-2 pr-3">Countdown</th>
                  <th className="text-left font-medium py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 25).map((r) => {
                  const target = new Date(r.when).getTime();
                  const diff = target - now;
                  const overdue = diff <= 0;
                  const withinHour = !overdue && diff <= 3600000;
                  const within24 = !overdue && !withinHour && diff <= 86400000;
                  const rowStyle = overdue || withinHour
                    ? { background: "hsla(0,72%,55%,.10)", borderLeft: "3px solid hsl(0,72%,55%)" }
                    : within24
                    ? { background: "hsla(45,95%,55%,.08)", borderLeft: "3px solid hsl(45,95%,55%)" }
                    : { borderLeft: "3px solid transparent" };
                  const countdownColor = overdue || withinHour
                    ? "text-[hsl(0,72%,65%)]"
                    : within24
                    ? "text-[hsl(45,95%,60%)]"
                    : "text-[hsl(190,90%,65%)]";
                  return (
                    <tr key={r.id} style={rowStyle} className="border-b border-border/40">
                      <td className="py-2.5 px-3 font-medium text-foreground truncate max-w-[220px]">{r.title}</td>
                      <td className="py-2.5 pr-3">
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {r.kind}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-muted-foreground whitespace-nowrap">
                        {new Date(r.when).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className={`py-2.5 pr-3 font-mono font-bold tabular-nums ${countdownColor}`}>
                        {overdue ? <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />Overdue {formatRemaining(diff)}</span> : formatRemaining(diff)}
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground capitalize">{r.status?.replace(/_/g, " ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* 2. STATS ROW */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Close Rate (Month)" value={`${closeRate}%`} icon={TrendingUp} tone="success" />
        <StatCard label="Deals Closed (Month)" value={closedMonth} icon={Target} tone="success" />
        <StatCard label="Objections Logged (Month)" value={monthObjections} icon={AlertTriangle} tone="warn" />
        <StatCard label="Calls / Meetings (Month)" value={monthCalls + monthMeetings} icon={PhoneCall} />
      </div>

      {/* 3. OBJECTIONS BREAKDOWN */}
      <SectionCard title="Objections Breakdown" icon={BarChart3}>
        {objectionCounts.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-6 text-sm text-muted-foreground text-center">No objections logged yet.</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={objectionCounts} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(190,90%,55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      {/* 4. RECOMMENDED PRACTICE */}
      {topObjection && (
        <Card className="border-2 p-5 relative overflow-hidden" style={{ borderColor: "hsl(190,90%,55%)", background: "linear-gradient(135deg, hsla(190,90%,55%,.08), hsla(230,90%,55%,.04))" }}>
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-20" style={{ background: "radial-gradient(circle, hsl(190,90%,55%) 0%, transparent 70%)" }} />
          <div className="flex items-start justify-between gap-4 relative">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[hsl(190,90%,65%)]">
                <Sparkles className="h-3.5 w-3.5" /> Recommended Practice Today
              </div>
              <h2 className="mt-2 text-2xl font-bold text-foreground capitalize">{topObjection.category.replace(/_/g, " ")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your most-heard objection — logged <span className="text-foreground font-semibold">{topObjection.count}×</span>. Reps who master their top objection close 2× more.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className={topUnlock?.foundation_unlocked ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground"}>Foundation {topUnlock?.foundation_passed ? "✓" : topUnlock?.foundation_unlocked ? "Unlocked" : "Locked"}</Badge>
                <Badge className={topUnlock?.intermediate_unlocked ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground"}>Intermediate {topUnlock?.intermediate_passed ? "✓" : topUnlock?.intermediate_unlocked ? "Unlocked" : "Locked"}</Badge>
                <Badge className={topUnlock?.advanced_unlocked ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground"}>Advanced {topUnlock?.advanced_passed ? "✓" : topUnlock?.advanced_unlocked ? "Unlocked" : "Locked"}</Badge>
              </div>
              {untilNext > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  <span className="text-[hsl(45,95%,60%)] font-semibold">{untilNext} more</span> logged instances until the next unlock threshold ({nextThreshold}).
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* 5. TRAINING PROGRESS */}
      <SectionCard title="Training Progress" icon={GraduationCap} right={training && (
        <span className="text-xs text-muted-foreground">
          Cert: <span className={training.certStatus === "passed" ? "text-emerald-400 font-semibold" : training.certStatus === "failed" ? "text-[hsl(0,72%,65%)] font-semibold" : "text-muted-foreground"}>{training.certStatus.replace("_", " ")}</span>
        </span>
      )}>
        {!training ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-foreground font-medium">Overall</span>
                <span className="text-muted-foreground">· {activeModules} of {training.moduleProgress.length} modules started</span>
              </div>
              <span className="text-xl font-bold text-primary">{overallTrainingPct}%</span>
            </div>
            <Progress value={overallTrainingPct} />
            <div className="h-52 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={training.moduleProgress} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="module" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Complete"]} />
                  <Bar dataKey="pct" fill="hsl(230,90%,60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </SectionCard>

      {/* 6. 14-DAY ACTIVITY */}
      <SectionCard title="Activity — Last 14 Days" icon={TrendingUp} right={<span className="text-xs text-muted-foreground">Calls logged</span>}>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyActivity} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(190,90%,55%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
