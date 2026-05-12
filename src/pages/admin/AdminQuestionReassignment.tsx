import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, RefreshCw, Search, Wand2 } from "lucide-react";

interface Module {
  id: string;
  module_number: number;
  module_title: string;
}
interface Chapter {
  id: string;
  module_id: string;
  chapter_number: number;
  chapter_title: string;
}
interface Question {
  id: string;
  module_id: string;
  chapter_id: string | null;
  question_text: string;
  quiz_level: number;
}

type Filter = "all" | "mismatch" | "orphan" | "duplicate";

export default function AdminQuestionReassignment() {
  const [modules, setModules] = useState<Module[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("mismatch");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetModule, setTargetModule] = useState<string>("");
  const [targetChapter, setTargetChapter] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [m, c, q] = await Promise.all([
      supabase.from("nl_training_modules").select("id, module_number, module_title").order("module_number"),
      supabase.from("nl_training_chapters").select("id, module_id, chapter_number, chapter_title").order("chapter_number"),
      supabase.from("nl_training_questions").select("id, module_id, chapter_id, question_text, quiz_level"),
    ]);
    setModules((m.data ?? []) as Module[]);
    setChapters((c.data ?? []) as Chapter[]);
    setQuestions((q.data ?? []) as Question[]);
    setSelected(new Set());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const chapterMap = useMemo(() => new Map(chapters.map((c) => [c.id, c])), [chapters]);
  const moduleMap = useMemo(() => new Map(modules.map((m) => [m.id, m])), [modules]);

  const audit = useMemo(() => {
    const dupCounts = new Map<string, number>();
    questions.forEach((q) => {
      const key = q.question_text.trim().toLowerCase();
      dupCounts.set(key, (dupCounts.get(key) ?? 0) + 1);
    });

    return questions.map((q) => {
      const ch = q.chapter_id ? chapterMap.get(q.chapter_id) : null;
      const issues: Filter[] = [];
      if (!q.chapter_id || !ch) issues.push("orphan");
      else if (ch.module_id !== q.module_id) issues.push("mismatch");
      const dupKey = q.question_text.trim().toLowerCase();
      if ((dupCounts.get(dupKey) ?? 0) > 1) issues.push("duplicate");
      return { q, ch, issues };
    });
  }, [questions, chapterMap]);

  const filtered = useMemo(() => {
    return audit.filter(({ q, issues }) => {
      if (filter !== "all" && !issues.includes(filter)) return false;
      if (moduleFilter !== "all" && q.module_id !== moduleFilter) return false;
      if (search && !q.question_text.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [audit, filter, moduleFilter, search]);

  const counts = useMemo(() => {
    let mismatch = 0,
      orphan = 0,
      duplicate = 0;
    audit.forEach(({ issues }) => {
      if (issues.includes("mismatch")) mismatch++;
      if (issues.includes("orphan")) orphan++;
      if (issues.includes("duplicate")) duplicate++;
    });
    return { mismatch, orphan, duplicate, total: audit.length };
  }, [audit]);

  const targetChapters = useMemo(
    () => chapters.filter((c) => c.module_id === targetModule),
    [chapters, targetModule],
  );

  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(filtered.map((r) => r.q.id)));
    else setSelected(new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  function autoFix() {
    // For mismatches, set question.module_id = chapter.module_id
    const updates: Promise<any>[] = [];
    let count = 0;
    audit.forEach(({ q, ch, issues }) => {
      if (issues.includes("mismatch") && ch) {
        updates.push(
          supabase.from("nl_training_questions").update({ module_id: ch.module_id }).eq("id", q.id),
        );
        count++;
      }
    });
    if (!count) {
      toast.info("No mismatches to auto-fix");
      return;
    }
    setSaving(true);
    Promise.all(updates)
      .then(() => {
        toast.success(`Auto-fixed ${count} question(s) to match chapter's module`);
        return load();
      })
      .catch((e) => toast.error(`Auto-fix failed: ${e.message}`))
      .finally(() => setSaving(false));
  }

  async function applyReassignment() {
    if (!targetModule || !targetChapter || selected.size === 0) return;
    setSaving(true);
    const ids = Array.from(selected);
    const { error } = await supabase
      .from("nl_training_questions")
      .update({ module_id: targetModule, chapter_id: targetChapter })
      .in("id", ids);
    setSaving(false);
    if (error) {
      toast.error(`Update failed: ${error.message}`);
      return;
    }
    toast.success(`Reassigned ${ids.length} question(s)`);
    setConfirmOpen(false);
    setTargetModule("");
    setTargetChapter("");
    await load();
  }

  const targetModuleObj = modules.find((m) => m.id === targetModule);
  const targetChapterObj = chapters.find((c) => c.id === targetChapter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Reassignment"
        description="Audit and bulk-reassign mis-categorized quiz questions"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Questions" value={counts.total} />
        <StatCard label="Mismatches" value={counts.mismatch} tone={counts.mismatch ? "warn" : "ok"} />
        <StatCard label="Orphans" value={counts.orphan} tone={counts.orphan ? "warn" : "ok"} />
        <StatCard label="Duplicates" value={counts.duplicate} tone={counts.duplicate ? "warn" : "ok"} />
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All questions</SelectItem>
              <SelectItem value="mismatch">Mismatches only</SelectItem>
              <SelectItem value="orphan">Orphans only</SelectItem>
              <SelectItem value="duplicate">Duplicates only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules</SelectItem>
              {modules.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  M{m.module_number} — {m.module_title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search question text…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" onClick={autoFix} disabled={saving || counts.mismatch === 0}>
            <Wand2 className="h-4 w-4" /> Auto-fix mismatches
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 items-center p-3 rounded-lg border bg-muted/30">
          <span className="text-sm font-medium">Reassign selected ({selected.size}) to:</span>
          <Select
            value={targetModule}
            onValueChange={(v) => {
              setTargetModule(v);
              setTargetChapter("");
            }}
          >
            <SelectTrigger className="w-56"><SelectValue placeholder="Target module" /></SelectTrigger>
            <SelectContent>
              {modules.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  M{m.module_number} — {m.module_title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={targetChapter} onValueChange={setTargetChapter} disabled={!targetModule}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Target chapter" /></SelectTrigger>
            <SelectContent>
              {targetChapters.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  Ch{c.chapter_number} — {c.chapter_title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!targetModule || !targetChapter || selected.size === 0 || saving}
            onClick={() => setConfirmOpen(true)}
          >
            Apply
          </Button>
        </div>

        <div className="overflow-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-2 w-10">
                  <Checkbox
                    checked={filtered.length > 0 && filtered.every((r) => selected.has(r.q.id))}
                    onCheckedChange={(v) => toggleAll(!!v)}
                  />
                </th>
                <th className="p-2">Question</th>
                <th className="p-2">Current Module</th>
                <th className="p-2">Current Chapter</th>
                <th className="p-2">Issues</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">
                  <CheckCircle2 className="inline h-4 w-4 mr-1" /> No matching questions
                </td></tr>
              ) : (
                filtered.map(({ q, ch, issues }) => {
                  const mod = moduleMap.get(q.module_id);
                  const chMod = ch ? moduleMap.get(ch.module_id) : null;
                  return (
                    <tr key={q.id} className="border-t hover:bg-muted/30">
                      <td className="p-2">
                        <Checkbox
                          checked={selected.has(q.id)}
                          onCheckedChange={(v) => toggleOne(q.id, !!v)}
                        />
                      </td>
                      <td className="p-2 max-w-md">
                        <div className="line-clamp-2">{q.question_text}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">L{q.quiz_level} · {q.id.slice(0, 8)}</div>
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {mod ? `M${mod.module_number} — ${mod.module_title}` : <span className="text-destructive">missing</span>}
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {ch ? (
                          <>
                            Ch{ch.chapter_number} — {ch.chapter_title}
                            {chMod && chMod.id !== q.module_id && (
                              <div className="text-xs text-amber-600">belongs to M{chMod.module_number}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-destructive">no chapter</span>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {issues.length === 0 && <Badge variant="secondary">OK</Badge>}
                          {issues.includes("mismatch") && <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">mismatch</Badge>}
                          {issues.includes("orphan") && <Badge className="bg-red-500/15 text-red-700 border-red-500/30">orphan</Badge>}
                          {issues.includes("duplicate") && <Badge variant="outline">duplicate</Badge>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm bulk reassignment
            </DialogTitle>
            <DialogDescription>
              You are about to reassign <strong>{selected.size}</strong> question(s) to:
              <div className="mt-2 p-3 rounded border bg-muted/30 text-foreground">
                <div>Module: <strong>M{targetModuleObj?.module_number} — {targetModuleObj?.module_title}</strong></div>
                <div>Chapter: <strong>Ch{targetChapterObj?.chapter_number} — {targetChapterObj?.chapter_title}</strong></div>
              </div>
              This action will update <code>module_id</code> and <code>chapter_id</code> on each selected question. It cannot be undone automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={applyReassignment} disabled={saving}>
              {saving ? "Applying…" : "Confirm reassignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "ok" | "warn" | "neutral" }) {
  const color =
    tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : "text-foreground";
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </Card>
  );
}
