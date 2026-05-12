import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, RefreshCw, Wand2, Trash2, Download, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Module = { id: string; module_number: number; module_title: string; is_locked: boolean };
type Chapter = { id: string; module_id: string; chapter_number: number; chapter_title: string };
type Question = {
  id: string; chapter_id: string | null; module_id: string;
  quiz_level: number; question_text: string; question_type: string;
};
type LogRow = {
  id: string; checked_at: string; total_chapters: number; total_questions: number;
  orphan_count: number; duplicate_count: number; lock_chain_ok: boolean; overall_status: string;
  chapters_under_threshold: any; details: any;
};

const statusColor = (s: string) =>
  s === "critical" ? "destructive" : s === "warnings" ? "secondary" : "default";

export default function AdminTrainingHealth() {
  const { toast } = useToast();
  const [modules, setModules] = useState<Module[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [examCounts, setExamCounts] = useState<Record<string, { attempts: number; passed: number }>>({});

  const load = async () => {
    setLoading(true);
    const [m, c, q, l, ex] = await Promise.all([
      supabase.from("nl_training_modules").select("*").order("module_number"),
      supabase.from("nl_training_chapters").select("*").order("chapter_number"),
      supabase.from("nl_training_questions").select("id, chapter_id, module_id, quiz_level, question_text, question_type"),
      supabase.from("nl_health_check_log").select("*").order("checked_at", { ascending: false }).limit(30),
      supabase.from("nl_module_completion").select("module_id, score").limit(10000),
    ]);
    setModules((m.data as any) || []);
    setChapters((c.data as any) || []);
    setQuestions((q.data as any) || []);
    setLogs((l.data as any) || []);
    const counts: Record<string, { attempts: number; passed: number }> = {};
    ((ex.data as any[]) || []).forEach((r) => {
      const k = r.module_id;
      if (!counts[k]) counts[k] = { attempts: 0, passed: 0 };
      counts[k].attempts++;
      if ((r.score || 0) >= 80) counts[k].passed++;
    });
    setExamCounts(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const chapterIds = useMemo(() => new Set(chapters.map((c) => c.id)), [chapters]);

  const moduleStats = useMemo(() => {
    return modules.map((m) => {
      const mChapters = chapters.filter((c) => c.module_id === m.id);
      const mQuestions = questions.filter((q) => q.module_id === m.id && q.question_type === "chapter_quiz");
      const levels = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
      mQuestions.forEach((q) => { levels[q.quiz_level || 1] = (levels[q.quiz_level || 1] || 0) + 1; });
      const chapterDetail = mChapters.map((c) => {
        const qs = questions.filter((q) => q.chapter_id === c.id && q.question_type === "chapter_quiz");
        const lc = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
        qs.forEach((q) => { lc[q.quiz_level || 1] = (lc[q.quiz_level || 1] || 0) + 1; });
        const total = qs.length;
        const lowLevels = [1, 2, 3].filter((l) => (lc[l] || 0) < 2);
        return { ...c, total, levels: lc, empty: total === 0, low: lowLevels };
      });
      const empty = chapterDetail.filter((c) => c.empty).length;
      const low = chapterDetail.filter((c) => !c.empty && c.low.length > 0).length;
      const ex = examCounts[m.id] || { attempts: 0, passed: 0 };
      return {
        ...m, mChapters: chapterDetail, totalQuestions: mQuestions.length, levels,
        empty, low, attempts: ex.attempts, passRate: ex.attempts ? Math.round((ex.passed / ex.attempts) * 100) : 0,
      };
    });
  }, [modules, chapters, questions, examCounts]);

  const orphans = useMemo(() => questions.filter((q) => !q.chapter_id || !chapterIds.has(q.chapter_id)), [questions, chapterIds]);
  const duplicates = useMemo(() => {
    const map = new Map<string, Question[]>();
    questions.forEach((q) => {
      const t = (q.question_text || "").trim();
      if (!t) return;
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(q);
    });
    return Array.from(map.values()).filter((arr) => new Set(arr.map((a) => a.chapter_id)).size > 1);
  }, [questions]);

  const chaptersUnderThreshold = useMemo(() =>
    moduleStats.flatMap((m) => m.mChapters.filter((c) => c.empty || c.low.length > 0)),
  [moduleStats]);

  const moduleNumbers = modules.map((m) => m.module_number).sort((a, b) => a - b);
  let lockChainOk = moduleNumbers.length >= 8;
  for (let i = 0; i < Math.min(8, moduleNumbers.length); i++) {
    if (moduleNumbers[i] !== i + 1) { lockChainOk = false; break; }
  }

  const overallStatus = orphans.length > 0 || moduleStats.some((m) => m.empty > 0) || !lockChainOk
    ? "critical"
    : (chaptersUnderThreshold.length > 0 || duplicates.length > 0 ? "warnings" : "healthy");

  const runAudit = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("check-training-health");
      if (error) throw error;
      toast({ title: "Audit complete", description: "Latest health log saved." });
      await load();
    } catch (e: any) {
      toast({ title: "Audit failed", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const autoFixOrphans = async () => {
    if (orphans.length === 0) { toast({ title: "No orphans" }); return; }
    let fixed = 0;
    for (const o of orphans) {
      const sameModuleChapters = chapters.filter((c) => c.module_id === o.module_id);
      const target = sameModuleChapters[0];
      if (target) {
        const { error } = await supabase.from("nl_training_questions").update({ chapter_id: target.id }).eq("id", o.id);
        if (!error) fixed++;
      }
    }
    toast({ title: `Reassigned ${fixed} orphans` });
    await load();
  };

  const removeDuplicates = async () => {
    if (duplicates.length === 0) { toast({ title: "No duplicates" }); return; }
    let removed = 0;
    for (const grp of duplicates) {
      const sorted = [...grp].sort((a, b) => a.id.localeCompare(b.id));
      const toDelete = sorted.slice(1).map((q) => q.id);
      if (toDelete.length) {
        const { error } = await supabase.from("nl_training_questions").delete().in("id", toDelete);
        if (!error) removed += toDelete.length;
      }
    }
    toast({ title: `Removed ${removed} duplicate questions` });
    await load();
  };

  const exportCsv = () => {
    const rows = [
      ["module", "chapter", "total_questions", "L1", "L2", "L3", "issue"],
      ...moduleStats.flatMap((m) =>
        m.mChapters.map((c) => [
          `M${m.module_number} ${m.module_title}`,
          `Ch${c.chapter_number} ${c.chapter_title}`,
          String(c.total),
          String(c.levels[1] || 0), String(c.levels[2] || 0), String(c.levels[3] || 0),
          c.empty ? "EMPTY" : c.low.length ? `LOW:${c.low.map((l) => "L" + l).join(",")}` : "OK",
        ])
      ),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `training-health-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Training Health"
        description="Real-time integrity dashboard for all training modules, chapters, and questions"
      />

      <div className="flex flex-wrap gap-2">
        <Button onClick={runAudit} disabled={running} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${running ? "animate-spin" : ""}`} /> Run Full Audit
        </Button>
        <Button variant="outline" onClick={autoFixOrphans} className="gap-2"><Wand2 className="h-4 w-4" /> Auto-fix Orphans</Button>
        <Button variant="outline" onClick={removeDuplicates} className="gap-2"><Trash2 className="h-4 w-4" /> Remove Duplicates</Button>
        <Button variant="outline" onClick={exportCsv} className="gap-2"><Download className="h-4 w-4" /> Export Health Report</Button>
      </div>

      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="Modules" value={modules.length} />
        <StatCard label="Chapters" value={chapters.length} />
        <StatCard label="Questions" value={questions.length} />
        <StatCard label="Under Threshold" value={chaptersUnderThreshold.length} tone={chaptersUnderThreshold.length ? "amber" : "green"} />
        <StatCard label="Orphans" value={orphans.length} tone={orphans.length ? "red" : "green"} />
        <StatCard label="Duplicates" value={duplicates.length} tone={duplicates.length ? "amber" : "green"} />
        <StatCard label="Lock Chain" value={lockChainOk ? "PASS" : "FAIL"} tone={lockChainOk ? "green" : "red"} />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Overall:</span>
        <Badge variant={statusColor(overallStatus) as any} className="uppercase">{overallStatus}</Badge>
      </div>

      {/* Module breakdown */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Chapters</TableHead>
              <TableHead>Questions</TableHead>
              <TableHead>L1 / L2 / L3</TableHead>
              <TableHead>Empty</TableHead>
              <TableHead>Low</TableHead>
              <TableHead>Lock</TableHead>
              <TableHead>Attempts</TableHead>
              <TableHead>Pass %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
            ) : moduleStats.map((m) => {
              const tone = m.empty > 0 ? "red" : m.low > 0 ? "amber" : "green";
              return (
                <>
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => toggle(m.id)}>
                    <TableCell><ChevronDown className={`h-4 w-4 transition-transform ${expanded[m.id] ? "" : "-rotate-90"}`} /></TableCell>
                    <TableCell className="font-medium">M{m.module_number} — {m.module_title}</TableCell>
                    <TableCell>{m.mChapters.length}</TableCell>
                    <TableCell>{m.totalQuestions}</TableCell>
                    <TableCell className="font-mono text-xs">{m.levels[1] || 0} / {m.levels[2] || 0} / {m.levels[3] || 0}</TableCell>
                    <TableCell>{m.empty > 0 ? <Badge variant="destructive">{m.empty}</Badge> : <span className="text-muted-foreground">0</span>}</TableCell>
                    <TableCell>{m.low > 0 ? <Badge variant="secondary">{m.low}</Badge> : <span className="text-muted-foreground">0</span>}</TableCell>
                    <TableCell><Badge variant={m.is_locked ? "secondary" : "outline"}>{m.is_locked ? "locked" : "unlocked"}</Badge></TableCell>
                    <TableCell>{m.attempts}</TableCell>
                    <TableCell>
                      <span className={tone === "red" ? "text-destructive" : tone === "amber" ? "text-amber-500" : "text-emerald-500"}>
                        {m.passRate}%
                      </span>
                    </TableCell>
                  </TableRow>
                  {expanded[m.id] && (
                    <TableRow key={m.id + "-x"}>
                      <TableCell colSpan={10} className="bg-muted/30">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Chapter</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>L1</TableHead>
                              <TableHead>L2</TableHead>
                              <TableHead>L3</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {m.mChapters.map((c) => (
                              <TableRow key={c.id}>
                                <TableCell>Ch{c.chapter_number} — {c.chapter_title}</TableCell>
                                <TableCell>{c.total}</TableCell>
                                <TableCell className={c.levels[1] < 2 ? "text-amber-500" : ""}>{c.levels[1] || 0}</TableCell>
                                <TableCell className={c.levels[2] < 2 ? "text-amber-500" : ""}>{c.levels[2] || 0}</TableCell>
                                <TableCell className={c.levels[3] < 2 ? "text-amber-500" : ""}>{c.levels[3] || 0}</TableCell>
                                <TableCell>
                                  {c.empty ? <Badge variant="destructive">Needs Questions</Badge>
                                    : c.low.length ? <Badge variant="secondary">Low: {c.low.map((l) => "L" + l).join(", ")}</Badge>
                                    : <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">Healthy</Badge>}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Logs */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Recent Health Checks (last 30)</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No health checks logged yet. Run an audit to create the first log.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chapters</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Orphans</TableHead>
                <TableHead>Duplicates</TableHead>
                <TableHead>Under Thresh.</TableHead>
                <TableHead>Lock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{new Date(l.checked_at).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={statusColor(l.overall_status) as any}>{l.overall_status}</Badge></TableCell>
                  <TableCell>{l.total_chapters}</TableCell>
                  <TableCell>{l.total_questions}</TableCell>
                  <TableCell>{l.orphan_count}</TableCell>
                  <TableCell>{l.duplicate_count}</TableCell>
                  <TableCell>{Array.isArray(l.chapters_under_threshold) ? l.chapters_under_threshold.length : 0}</TableCell>
                  <TableCell>{l.lock_chain_ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone = "neutral" }: { label: string; value: any; tone?: "neutral" | "green" | "amber" | "red" }) {
  const color = tone === "red" ? "text-destructive" : tone === "amber" ? "text-amber-500" : tone === "green" ? "text-emerald-500" : "text-foreground";
  return (
    <Card className="p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </Card>
  );
}
