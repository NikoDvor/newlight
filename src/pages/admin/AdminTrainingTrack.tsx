import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Lock, CheckCircle2, Circle, PlayCircle, Award, BookOpen, TrendingUp, Star, Search, PlusCircle, Layers, Zap, Bug, FileCheck } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MetricCard } from "@/components/MetricCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ChapterRunner, ChapterRow } from "@/components/training/ChapterRunner";
import { ModuleFinalExam } from "@/components/training/ModuleFinalExam";
import { ScriptMemorizationVault } from "@/components/training/ScriptMemorizationVault";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useModuleCompletion } from "@/hooks/useModuleCompletion";
import { TrainingCenterSelfTest } from "@/components/training/TrainingCenterSelfTest";

interface Module {
  id: string;
  module_number: number;
  module_title: string;
  module_description: string | null;
  is_locked: boolean;
}

interface Chapter {
  id: string;
  chapter_number: number;
  chapter_title: string;
  content: string | null;
  module_id: string;
}

interface LevelProgressRow {
  chapter_id: string;
  quiz_level: 1 | 2 | 3;
  status: string;
}

interface ProgressRow {
  module_id: string;
  chapter_id: string | null;
  status: string;
  score?: number | null;
}

interface GlossaryTerm {
  id: string;
  module_id: string;
  category: string;
  term: string;
  definition: string;
  usage_example: string;
  sort_order: number;
}

interface FlashcardRow {
  id: string;
  category: string;
  front: string;
  back: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

interface FlashcardProgressRow {
  flashcard_id: string;
  status: string;
  times_seen: number;
  last_seen_at: string | null;
}

const GLOSSARY_CATEGORIES = [
  "Sales Fundamentals",
  "Sales Techniques",
  "NewLight-Specific Terms",
  "Metrics and Performance",
];

interface AdminTrainingTrackProps {
  basePath?: string;
}

export default function AdminTrainingTrack({ basePath = "/admin/training-center" }: AdminTrainingTrackProps) {
  const { trackKey } = useParams<{ trackKey: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [trackName, setTrackName] = useState("");
  const [modules, setModules] = useState<Module[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [levelProgress, setLevelProgress] = useState<LevelProgressRow[]>([]);
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardRow[]>([]);
  const [flashProgress, setFlashProgress] = useState<Record<string, FlashcardProgressRow>>({});
  const [flippedFlashcards, setFlippedFlashcards] = useState<Record<string, boolean>>({});
  const [flashcardStats, setFlashcardStats] = useState({ total: 0, mastered: 0 });
  const [glossarySearch, setGlossarySearch] = useState("");
  const [newTerm, setNewTerm] = useState({ category: "Sales Fundamentals", term: "", definition: "", usage_example: "" });
  const [savingGlossary, setSavingGlossary] = useState(false);
  const [canManageGlossary, setCanManageGlossary] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [showModule1Glossary, setShowModule1Glossary] = useState(false);
  const [runner, setRunner] = useState<
    | { mode: "chapter"; chapter: ChapterRow; moduleId: string }
    | { mode: "module_test"; moduleId: string }
    | null
  >(null);
  const [examRunner, setExamRunner] = useState<{ moduleId: string; moduleName: string } | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [hasCertification, setHasCertification] = useState(false);
  const [unlockedChapterIds, setUnlockedChapterIds] = useState<Set<string>>(new Set());
  const { isModuleCompleted, reload: reloadCompletions, forceCompleteModule, retroactiveScan, completions } = useModuleCompletion(trackId);
  const [showDebug, setShowDebug] = useState(false);
  const [forceCompleting, setForceCompleting] = useState(false);
  const [retroScanDone, setRetroScanDone] = useState(false);
  const [examHistory, setExamHistory] = useState<Record<string, { bestScore: number; passed: boolean; attempts: number }>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: track } = await supabase
        .from("nl_training_tracks")
        .select("id, track_name")
        .eq("track_key", trackKey || "bdr")
        .maybeSingle();

      if (!track) {
        setLoading(false);
        return;
      }
      setTrackName(track.track_name);
      setTrackId(track.id);

      const { data: mods } = await supabase
        .from("nl_training_modules")
        .select("id, module_number, module_title, module_description, is_locked")
        .eq("track_id", track.id)
        .order("module_number");

      const moduleList = (mods || []) as Module[];
      setModules(moduleList);
      if (moduleList.length > 0 && !selectedModuleId) {
        setSelectedModuleId((moduleList.find((m) => m.module_number > 0) || moduleList[0]).id);
      }

      if (moduleList.length > 0) {
        const ids = moduleList.map((m) => m.id);
        const { data: chs } = await supabase
          .from("nl_training_chapters")
          .select("id, chapter_number, chapter_title, content, module_id")
          .in("module_id", ids)
          .order("chapter_number");
        setChapters((chs || []) as Chapter[]);

        const { data: terms } = await (supabase as any)
          .from("nl_training_glossary_terms")
          .select("id, module_id, category, term, definition, usage_example, sort_order")
          .in("module_id", ids)
          .order("category")
          .order("term");
        setGlossaryTerms((terms || []) as GlossaryTerm[]);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await (supabase as any)
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "operator"]);
        setCanManageGlossary((roles || []).length > 0);

        const { data: prog } = await supabase
          .from("nl_training_progress")
          .select("module_id, chapter_id, status, score")
          .eq("user_id", user.id);
        setProgress((prog || []) as ProgressRow[]);

        const { data: levels } = await (supabase as any)
          .from("nl_training_chapter_level_progress")
          .select("chapter_id, quiz_level, status")
          .eq("user_id", user.id);
        setLevelProgress((levels || []) as LevelProgressRow[]);

        if (track.track_name && (trackKey || "bdr") === "bdr") {
          const { data: cards } = await (supabase as any)
            .from("nl_training_flashcards")
            .select("id, category, front, back, difficulty")
            .eq("track_key", "bdr")
            .order("category");
          const cardRows = (cards || []) as FlashcardRow[];
          setFlashcards(cardRows);
          const cardIds = cardRows.map((card) => card.id);
          let mastered = 0;
          const mappedProgress: Record<string, FlashcardProgressRow> = {};
          if (cardIds.length > 0) {
            const { data: flashProgress } = await (supabase as any)
              .from("nl_training_flashcard_progress")
              .select("flashcard_id, status, times_seen, last_seen_at")
              .eq("user_id", user.id)
              .in("flashcard_id", cardIds);
            const now = Date.now();
            (flashProgress || []).forEach((row: FlashcardProgressRow) => {
              const stale = row.status === "mastered" && row.last_seen_at && now - new Date(row.last_seen_at).getTime() > 7 * 24 * 60 * 60 * 1000;
              mappedProgress[row.flashcard_id] = stale ? { ...row, status: "learning" } : row;
            });
            mastered = Object.values(mappedProgress).filter((row) => row.status === "mastered").length;
          }
          setFlashProgress(mappedProgress);
          setFlashcardStats({ total: cardIds.length, mastered });

          const { data: cert } = await supabase
            .from("nl_training_certifications")
            .select("id")
            .eq("user_id", user.id)
            .eq("track_key", "bdr")
            .eq("passed", true)
            .limit(1)
            .maybeSingle();
          setHasCertification(!!cert);
        }

        // Fetch objection unlock chapter IDs
        const { data: unlockRows } = await (supabase as any)
          .from("nl_objection_unlocks")
          .select("objection_category")
          .eq("user_id", user.id);
        if (unlockRows && unlockRows.length > 0) {
          const categories = (unlockRows as any[]).map((r: any) => r.objection_category);
          const { data: unlockQs } = await (supabase as any)
            .from("nl_training_questions")
            .select("chapter_id, unlock_category")
            .eq("is_unlock_question", true)
            .in("unlock_category", categories);
          const chIds = new Set((unlockQs || []).map((r: any) => r.chapter_id).filter(Boolean));
          setUnlockedChapterIds(chIds as Set<string>);
        }

        // Load exam history
        const moduleIds = moduleList.map((m) => m.id);
        if (moduleIds.length > 0) {
          const { data: exams } = await (supabase as any)
            .from("nl_module_exams")
            .select("module_id, score, passed, attempt_number")
            .eq("user_id", user.id)
            .in("module_id", moduleIds);
          const hist: Record<string, { bestScore: number; passed: boolean; attempts: number }> = {};
          (exams || []).forEach((e: any) => {
            const prev = hist[e.module_id];
            if (!prev) {
              hist[e.module_id] = { bestScore: e.score, passed: e.passed, attempts: e.attempt_number };
            } else {
              hist[e.module_id] = {
                bestScore: Math.max(prev.bestScore, e.score),
                passed: prev.passed || e.passed,
                attempts: Math.max(prev.attempts, e.attempt_number),
              };
            }
          });
          setExamHistory(hist);
        }
      }
    };
    load();
    reloadCompletions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackKey, reloadTick]);

  // Retroactive scan: on load, check if any modules should be marked complete
  useEffect(() => {
    if (retroScanDone || !trackId || modules.length === 0 || loading) return;
    const numbered = modules.filter((m) => m.module_number > 0);
    if (numbered.length === 0) return;
    setRetroScanDone(true);
    const moduleMap = numbered.map((m) => ({ id: m.id, module_number: m.module_number }));
    retroactiveScan(moduleMap).then((changed) => {
      if (changed) {
        reloadCompletions();
        setReloadTick((t) => t + 1);
      }
    });
  }, [trackId, modules.length, loading, retroScanDone]);

  const moduleStatus = (moduleId: string): "completed" | "in_progress" | "not_started" => {
    if (isModuleCompleted(moduleId)) return "completed";
    const rows = progress.filter((p) => p.module_id === moduleId && !p.chapter_id);
    if (rows.some((r) => r.status === "completed")) return "completed";
    if (rows.some((r) => r.status === "in_progress")) return "in_progress";
    const chRows = progress.filter((p) => p.module_id === moduleId);
    if (chRows.some((r) => r.status === "in_progress" || r.status === "completed")) return "in_progress";
    return "not_started";
  };

  // Explicit unlock chain: Module 1 always unlocked. Module N unlocked iff
  // Module N-1 has a completion record (or is otherwise marked completed).
  const isModuleUnlocked = (mod: Module): boolean => {
    if (mod.module_number <= 1) return true;
    const prevModule = numberedModules.find((m) => m.module_number === mod.module_number - 1);
    if (!prevModule) return true; // gap in numbering — fail open so card stays interactive
    if (isModuleCompleted(prevModule.id)) return true;
    if (moduleStatus(prevModule.id) === "completed") return true;
    // Honor explicit DB unlock (admin-forced or migrations)
    if (!mod.is_locked) return true;
    return false;
  };

  const getModuleChapterProgress = (moduleId: string) => {
    const moduleChapters = chapters.filter((c) => c.module_id === moduleId);
    const completed = moduleChapters.filter((c) => isChapterComplete(c.id)).length;
    return { completed, total: moduleChapters.length };
  };

  const glossaryModule = modules.find((m) => m.module_number === 0) || null;
  const numberedModules = modules.filter((m) => m.module_number > 0).sort((a, b) => a.module_number - b.module_number);
  const selectedModule = modules.find((m) => m.id === selectedModuleId) || null;
  const isGlossaryModule = selectedModule?.module_number === 0;
  const isModule1 = selectedModule?.module_number === 1;
  const previousModuleNumber = selectedModule && selectedModule.module_number > 1 ? selectedModule.module_number - 1 : 0;
  const lockedModuleMessage = `Complete Module ${previousModuleNumber} to unlock quizzes and progress tracking for this module`;
  const selectedChapters = useMemo(
    () => chapters.filter((c) => c.module_id === selectedModuleId),
    [chapters, selectedModuleId]
  );
  const glossaryChapter = useMemo(
    () => chapters.find((c) => c.module_id === glossaryModule?.id) || null,
    [chapters, glossaryModule?.id]
  );

  const getChapterLevelCount = (chapterId: string) =>
    levelProgress.filter((p) => p.chapter_id === chapterId && p.status === "completed").length;

  const isChapterComplete = (chapterId: string) =>
    progress.some((p) => p.chapter_id === chapterId && p.status === "completed") || getChapterLevelCount(chapterId) === 3;

  const isChapterRead = (chapterId: string) =>
    progress.some((p) => p.chapter_id === chapterId);

  const getModuleChaptersRead = (moduleId: string) => {
    const moduleChapters = chapters.filter((c) => c.module_id === moduleId);
    const read = moduleChapters.filter((c) => isChapterRead(c.id)).length;
    return { read, total: moduleChapters.length };
  };
  const getChapterDescription = (chapter: Chapter) => {
    const first = (chapter.content || "").split("\n\n").find((part) => part.trim().length > 60) || "";
    return first.replace(/\s+/g, " ").slice(0, 150) + (first.length > 150 ? "…" : "");
  };

  const markFlashcardReviewed = async (card: FlashcardRow) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const current = flashProgress[card.id];
    const next = {
      user_id: user.id,
      flashcard_id: card.id,
      status: current?.status === "mastered" ? "mastered" : "learning",
      times_seen: (current?.times_seen || 0) + 1,
      last_seen_at: new Date().toISOString(),
    };
    const { error } = await (supabase as any)
      .from("nl_training_flashcard_progress")
      .upsert(next, { onConflict: "user_id,flashcard_id" });
    if (!error) setFlashProgress((prev) => ({ ...prev, [card.id]: next }));
  };

  const completeModule6Drill = async () => {
    if (!trackId || !selectedModule || selectedModule.module_number !== 6) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("nl_training_progress").upsert({
      user_id: user.id,
      track_id: trackId,
      module_id: selectedModule.id,
      chapter_id: null,
      status: "in_progress",
      score: 100,
      attempts: 1,
      last_attempt_at: new Date().toISOString(),
    }, { onConflict: "user_id,module_id,chapter_id" } as any);
    setReloadTick((t) => t + 1);
    toast({ title: "Objection drill complete", description: "Module 6 test is now unlocked." });
  };

  const moduleChapterPct = (moduleId: string) => {
    const module = modules.find((m) => m.id === moduleId);
    const moduleChapters = chapters.filter((c) => c.module_id === moduleId);
    if (module?.module_number === 0) {
      return moduleChapters.some((c) => isChapterComplete(c.id)) || moduleStatus(moduleId) === "completed" ? 100 : 0;
    }
    const total = moduleChapters.length * 3;
    if (total === 0) return 0;
    const done = moduleChapters.reduce((sum, c) => sum + getChapterLevelCount(c.id), 0);
    return Math.round((done / total) * 100);
  };

  const selectedGlossaryTerms = useMemo(() => {
    const q = glossarySearch.trim().toLowerCase();
    const sourceModuleId = glossaryModule?.id || selectedModuleId;
    return glossaryTerms
      .filter((term) => term.module_id === sourceModuleId)
      .filter((term) => !q || `${term.term} ${term.definition} ${term.usage_example}`.toLowerCase().includes(q))
      .sort((a, b) => a.category.localeCompare(b.category) || a.sort_order - b.sort_order || a.term.localeCompare(b.term));
  }, [glossaryModule?.id, glossarySearch, glossaryTerms, selectedModuleId]);

  const module6ReviewedCount = flashcards.filter((card) => (flashProgress[card.id]?.times_seen || 0) > 0).length;
  const module6DrillReady = flashcards.length > 0 && module6ReviewedCount >= flashcards.length;
  const isScriptMasteryModule = trackKey === "bdr" && selectedModule?.module_number === 4;
  const isModule6 = trackKey === "bdr" && selectedModule?.module_number === 6;
  const module6DrillComplete = !!selectedModule && progress.some((p) => p.module_id === selectedModule.id && !p.chapter_id && p.status === "in_progress" && p.score === 100);
  const flashcardsByCategory = useMemo(() => {
    return flashcards.reduce<Record<string, FlashcardRow[]>>((acc, card) => {
      acc[card.category] = [...(acc[card.category] || []), card];
      return acc;
    }, {});
  }, [flashcards]);

  const markGlossaryReviewed = async () => {
    const targetModule = isGlossaryModule ? selectedModule : glossaryModule;
    const chapter = isGlossaryModule ? selectedChapters[0] : glossaryChapter;
    if (!trackId || !targetModule || !chapter) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      user_id: user.id,
      track_id: trackId,
      module_id: targetModule.id,
      status: "completed",
      score: 100,
      attempts: 1,
      last_attempt_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
    await supabase.from("nl_training_progress").upsert({ ...payload, chapter_id: chapter.id }, { onConflict: "user_id,module_id,chapter_id" } as any);
    await supabase.from("nl_training_progress").upsert({ ...payload, chapter_id: null }, { onConflict: "user_id,module_id,chapter_id" } as any);
    setReloadTick((t) => t + 1);
    toast({ title: "Glossary reviewed", description: "Your review has been saved." });
  };

  const addGlossaryTerm = async () => {
    const targetModule = isGlossaryModule ? selectedModule : glossaryModule;
    const chapter = isGlossaryModule ? selectedChapters[0] : glossaryChapter;
    if (!trackId || !targetModule || !chapter || !newTerm.term.trim() || !newTerm.definition.trim()) return;
    setSavingGlossary(true);
    try {
      const { error } = await (supabase as any).from("nl_training_glossary_terms").insert({
        track_id: trackId,
        module_id: targetModule.id,
        chapter_id: chapter.id,
        category: newTerm.category,
        term: newTerm.term.trim(),
        definition: newTerm.definition.trim(),
        usage_example: newTerm.usage_example.trim(),
        sort_order: glossaryTerms.length + 1,
      });
      if (error) throw error;
      setNewTerm({ category: "Sales Fundamentals", term: "", definition: "", usage_example: "" });
      setReloadTick((t) => t + 1);
      toast({ title: "Term added", description: "The glossary term is now available in training." });
    } catch (error) {
      toast({ title: "Could not add term", description: "Check for duplicate terms or missing fields.", variant: "destructive" });
    } finally {
      setSavingGlossary(false);
    }
  };

  const totalModules = numberedModules.length;
  const completedModules = numberedModules.filter((m) => moduleStatus(m.id) === "completed").length;
  const overallPct = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  if (examRunner && trackId) {
    return (
      <ModuleFinalExam
        moduleId={examRunner.moduleId}
        moduleName={examRunner.moduleName}
        trackId={trackId}
        modules={modules.map((m) => ({ id: m.id, module_number: m.module_number, module_title: m.module_title }))}
        onClose={() => { setExamRunner(null); setReloadTick((t) => t + 1); }}
        onPassed={() => { reloadCompletions(); setReloadTick((t) => t + 1); }}
      />
    );
  }

  if (runner && trackId) {
    return (
      <ChapterRunner
        mode={runner.mode}
        chapter={runner.mode === "chapter" ? runner.chapter : undefined}
        moduleId={runner.moduleId}
        trackId={trackId}
        lockedPreview={modules.find((m) => m.id === runner.moduleId)?.is_locked || false}
        unlockModuleNumber={(modules.find((m) => m.id === runner.moduleId)?.module_number || 1) - 1}
        modules={modules.map((m) => ({ id: m.id, module_number: m.module_number }))}
        onClose={() => setRunner(null)}
        onCompleted={() => setReloadTick((t) => t + 1)}
        onModuleComplete={() => setReloadTick((t) => t + 1)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(basePath)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="page-title">{trackName || "Training Track"}</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Modules, chapters, and certification progress
        </p>
      </div>

      <TrainingCenterSelfTest trackKey={trackKey || "bdr"} />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        {/* Module list */}
        <motion.div
          className="card-widget p-0 overflow-hidden"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="p-4 border-b border-border/40">
            <h3 className="section-title">BDR Training Track</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">Numbered modules</p>
          </div>
          <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <>
                {numberedModules.map((m) => {
                  // Per-card defensive rendering: a single bad enrichment row
                  // must never blank out the entire list.
                  let status: ReturnType<typeof moduleStatus> = "not_started";
                  let unlocked = m.module_number <= 1;
                  let chaptersRead = { read: 0, total: 0 };
                  let exam: { bestScore: number; passed: boolean; attempts: number } | undefined;
                  let examPassed = false;
                  let examReady = false;
                  let examFailed = false;
                  try {
                    status = moduleStatus(m.id);
                    unlocked = isModuleUnlocked(m);
                    chaptersRead = getModuleChaptersRead(m.id);
                    exam = examHistory[m.id];
                    examPassed = !!exam?.passed || isModuleCompleted(m.id);
                    const allChaptersRead = chaptersRead.total > 0 && chaptersRead.read >= chaptersRead.total;
                    examReady = allChaptersRead && !examPassed && unlocked;
                    examFailed = !!(exam && !exam.passed);
                  } catch (err) {
                    console.error(`[TrainingTrack] enrichment failed for module ${m.module_number}`, err);
                  }
                  if (typeof window !== "undefined") {
                    console.debug(`[TrainingTrack] module ${m.module_number} "${m.module_title}" unlocked=${unlocked} status=${status} examPassed=${examPassed}`);
                  }
                  const isSelected = selectedModuleId === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModuleId(m.id);
                        setShowModule1Glossary(false);
                      }}
                      className={`w-full text-left px-4 py-3 border-b border-border/30 transition-all duration-200 flex items-start gap-3 hover:bg-white/[0.03] ${
                        isSelected ? "bg-primary/[0.08]" : ""
                      }`}
                      style={
                        isSelected
                          ? { boxShadow: "inset 3px 0 0 0 hsl(var(--nl-neon))" }
                          : undefined
                      }
                    >
                      <div
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5"
                        style={{
                          background: examPassed
                            ? "hsla(152,60%,50%,.22)"
                            : examReady
                              ? "hsla(45,90%,50%,.22)"
                              : !unlocked
                                ? "hsla(220,15%,20%,.5)"
                                : isSelected
                                  ? "hsla(211,96%,60%,.22)"
                                  : "hsla(220,15%,20%,.5)",
                          color: examPassed
                            ? "hsl(152,60%,50%)"
                            : examReady
                              ? "hsl(45,90%,50%)"
                              : !unlocked
                                ? "hsl(var(--muted-foreground))"
                                : isSelected
                                  ? "hsl(var(--nl-neon))"
                                  : "hsl(var(--muted-foreground))",
                          opacity: !unlocked ? 0.85 : 1,
                        }}
                      >
                        {examPassed ? <CheckCircle2 className="h-3.5 w-3.5" /> : !unlocked ? <Lock className="h-3.5 w-3.5" /> : examReady ? <FileCheck className="h-3.5 w-3.5" /> : m.module_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Title is ALWAYS rendered at full readable contrast — even when locked */}
                        <p className="text-[13px] font-medium truncate text-foreground">
                          {m.module_title || `Module ${m.module_number}`}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {examPassed ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-[hsl(152,60%,50%)]" />
                              <span className="text-[10px] text-[hsl(152,60%,50%)] font-medium">Complete · {exam?.bestScore || completions.find(c => c.module_id === m.id)?.score_average || 100}%</span>
                            </>
                          ) : !unlocked ? (
                            <>
                              <Lock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground font-medium">
                                Complete Module {Math.max(1, m.module_number - 1)} to unlock
                              </span>
                            </>
                          ) : examReady ? (
                            <>
                              <FileCheck className="h-3 w-3 text-[hsl(45,90%,50%)]" />
                              <span className="text-[10px] text-[hsl(45,90%,50%)] font-medium">Exam Ready</span>
                            </>
                          ) : examFailed && exam ? (
                            <>
                              <Award className="h-3 w-3 text-[hsl(45,90%,50%)]" />
                              <span className="text-[10px] text-[hsl(45,90%,50%)] font-medium">Retake Available · Best: {exam.bestScore}%</span>
                            </>
                          ) : status === "in_progress" ? (
                            <>
                              <PlayCircle className="h-3 w-3 text-[hsl(var(--nl-neon))]" />
                              <span className="text-[10px] text-[hsl(var(--nl-neon))] font-medium">{chaptersRead.read} of {chaptersRead.total} chapters read</span>
                            </>
                          ) : (
                            <>
                              <Circle className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground font-medium">Start Module</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {trackKey === "bdr" && (
                  <>
                    <button
                      onClick={() => overallPct === 100 && navigate(`${basePath}/bdr/certification`)}
                      disabled={overallPct < 100}
                      className={`w-full text-left px-4 py-3 transition-all duration-200 flex items-start gap-3 ${
                        overallPct === 100 ? "hover:bg-white/[0.03]" : "opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-secondary">
                        {hasCertification ? (
                          <Star className="h-3.5 w-3.5 text-[hsl(var(--nl-gold))]" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground/85 truncate">Certification Exam</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {hasCertification ? (
                            <Badge className="h-5 bg-[hsl(var(--nl-gold)/.16)] text-[hsl(var(--nl-gold))] border border-[hsl(var(--nl-gold)/.28)] hover:bg-[hsl(var(--nl-gold)/.16)] px-2 text-[10px]">
                              BDR Certified ✓
                            </Badge>
                          ) : overallPct === 100 ? (
                            <span className="text-[10px] text-[hsl(var(--nl-neon))] font-medium">Unlocked</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-medium">Certification Locked</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Module detail */}
        <motion.div
          className="card-widget"
          key={selectedModuleId || "empty"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {selectedModule ? (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="font-medium">
                      {isGlossaryModule ? "Reference" : `Module ${selectedModule.module_number}`}
                    </Badge>
                    {selectedModule.is_locked && (
                      <Badge variant="outline" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Locked
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {selectedModule.module_title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
                    {selectedModule.module_description ||
                      "Module content and chapters will appear here once authored."}
                  </p>
                </div>
              </div>

              {!isGlossaryModule && <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Chapter completion
                  </span>
                  <span className="text-[11px] font-semibold text-foreground">
                    {moduleChapterPct(selectedModule.id)}%
                  </span>
                </div>
                <Progress value={moduleChapterPct(selectedModule.id)} className="h-1.5" />
              </div>}

              {selectedModule.is_locked && !isGlossaryModule && (
                <div className="mb-5 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
                  {lockedModuleMessage}
                </div>
              )}

              {isGlossaryModule || (isModule1 && showModule1Glossary) ? (
                <div className="space-y-5">
                  {isModule1 && (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Badge variant="secondary" className="mb-2">Chapter 1.0</Badge>
                        <h3 className="section-title">Terminology & Glossary</h3>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setShowModule1Glossary(false)}>
                        Back to Module 1 Chapters
                      </Button>
                    </div>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={glossarySearch}
                      onChange={(event) => setGlossarySearch(event.target.value)}
                      placeholder="Search terminology, definitions, or examples…"
                      className="pl-10 h-11"
                    />
                  </div>

                  {GLOSSARY_CATEGORIES.map((category) => {
                    const terms = selectedGlossaryTerms.filter((term) => term.category === category);
                    if (terms.length === 0) return null;
                    return (
                      <section key={category} className="space-y-3">
                        <div className="rounded-lg border border-primary/25 bg-primary/15 px-4 py-3 shadow-[0_0_24px_hsl(var(--primary)/0.08)]">
                          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-primary">{category}</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {terms.map((term) => (
                            <article key={term.id} className="rounded-lg border border-border/45 border-l-4 border-l-primary bg-card/70 p-4 shadow-sm">
                              <h4 className="text-base font-bold text-primary">{term.term}</h4>
                              <p className="mt-2 text-sm leading-relaxed text-foreground">{term.definition}</p>
                              {term.usage_example && (
                                <blockquote className="mt-3 border-l border-primary/35 pl-3 text-sm italic leading-relaxed text-muted-foreground">
                                  Example: {term.usage_example}
                                </blockquote>
                              )}
                            </article>
                          ))}
                        </div>
                      </section>
                    );
                  })}

                  {selectedGlossaryTerms.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
                      No glossary terms match your search.
                    </div>
                  )}

                  {canManageGlossary && <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <h3 className="section-title mb-3">Admin: Add glossary term</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        value={newTerm.category}
                        onChange={(event) => setNewTerm((prev) => ({ ...prev, category: event.target.value }))}
                        className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                      >
                        {GLOSSARY_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                      </select>
                      <Input value={newTerm.term} onChange={(event) => setNewTerm((prev) => ({ ...prev, term: event.target.value }))} placeholder="Term name" />
                      <Textarea value={newTerm.definition} onChange={(event) => setNewTerm((prev) => ({ ...prev, definition: event.target.value }))} placeholder="Definition" className="sm:col-span-2" />
                      <Textarea value={newTerm.usage_example} onChange={(event) => setNewTerm((prev) => ({ ...prev, usage_example: event.target.value }))} placeholder="Usage example" className="sm:col-span-2" />
                    </div>
                    <Button onClick={addGlossaryTerm} disabled={savingGlossary || !newTerm.term.trim() || !newTerm.definition.trim()} className="mt-3 gap-2">
                      <PlusCircle className="h-4 w-4" />
                      {savingGlossary ? "Adding…" : "Add Term"}
                    </Button>
                  </div>}

                  <div className="flex justify-end">
                    <Button onClick={markGlossaryReviewed} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as Reviewed
                    </Button>
                  </div>
                </div>
              ) : <div className="space-y-2 mb-6">
                <h3 className="section-title mb-2">Chapters</h3>
                {selectedChapters.length === 0 && !(isModule1 && glossaryModule) ? (
                  <div className="rounded-xl border border-dashed border-border/50 p-6 text-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No chapters authored yet for this module.
                    </p>
                  </div>
                ) : (
                  <>
                    {isModule1 && glossaryModule && (
                      <button
                        type="button"
                        onClick={() => setShowModule1Glossary(true)}
                        className="w-full text-left flex items-start gap-3 px-3 py-3 rounded-lg border border-primary/30 bg-primary/5 transition-colors hover:bg-primary/10 cursor-pointer"
                      >
                        {glossaryChapter && isChapterComplete(glossaryChapter.id) ? (
                          <CheckCircle2 className="h-4 w-4 text-[hsl(152,60%,50%)] shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[13px] text-foreground/90 font-medium">1.0. Terminology & Glossary</span>
                            <span className="text-[10px] text-primary font-medium shrink-0">Open</span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            Review core BDR vocabulary before starting the module content.
                          </p>
                        </div>
                      </button>
                    )}
                    {selectedChapters.map((c, idx) => {
                    const levelCount = getChapterLevelCount(c.id);
                    const done = isChapterComplete(c.id);
                    const prev = selectedChapters[idx - 1];
                    const prevDone = !prev || isChapterComplete(prev.id);
                    const unlocked = true;
                    const isMasteryUnlocked = unlockedChapterIds.has(c.id);
                    const otherChaptersExist = selectedChapters.length > 1;
                    return (
                      <motion.button
                        key={c.id}
                        initial={isMasteryUnlocked ? { opacity: 0, y: -8, scale: 0.98 } : undefined}
                        animate={isMasteryUnlocked ? { opacity: 1, y: -4, scale: 1.02 } : undefined}
                        transition={isMasteryUnlocked ? { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } : undefined}
                        onClick={() =>
                          trackId && setRunner({
                            mode: "chapter",
                            chapter: c as ChapterRow,
                            moduleId: selectedModule.id,
                          })
                        }
                        className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-lg border transition-colors cursor-pointer relative ${
                          isMasteryUnlocked
                            ? "border-primary/50 bg-primary/[0.06] shadow-[0_0_16px_-4px_hsla(211,96%,56%,0.35)] z-10 hover:bg-primary/[0.08]"
                            : otherChaptersExist && unlockedChapterIds.size > 0
                              ? "border-border/40 opacity-60 hover:opacity-80 hover:bg-white/[0.03]"
                              : "border-border/40 hover:bg-white/[0.03]"
                        }`}
                        style={isMasteryUnlocked ? { animation: "objection-chapter-glow 3s ease-in-out infinite" } : undefined}
                      >
                        {isMasteryUnlocked && (
                          <Badge className="absolute -top-2.5 right-3 text-[9px] h-5 bg-primary/20 text-primary border-primary/30 border font-semibold tracking-wide">
                            MASTERY UNLOCKED — NEW CONTENT
                          </Badge>
                        )}
                        {done ? (
                          <CheckCircle2 className="h-4 w-4 text-[hsl(152,60%,50%)] shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[13px] text-foreground/90 font-medium">
                              {c.chapter_number}. {c.chapter_title}
                            </span>
                            {unlocked && !done && (
                              <span className="text-[10px] text-primary font-medium shrink-0">Open</span>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            {getChapterDescription(c)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {[1, 2, 3].map((level) => {
                              const complete = levelProgress.some((p) => p.chapter_id === c.id && p.quiz_level === level && p.status === "completed");
                              const locked = level > levelCount + 1;
                              return (
                                <Badge
                                  key={level}
                                  variant={complete ? "default" : "outline"}
                                  className={`h-5 px-2 text-[10px] ${locked ? "opacity-50" : ""}`}
                                >
                                  L{level} {complete ? "Complete" : locked ? "Locked" : "Unlocked"}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </motion.button>
                    );
                    })}
                  </>
                )}
              </div>}

              {isScriptMasteryModule && !isGlossaryModule && <ScriptMemorizationVault />}

              {isModule6 && !isGlossaryModule && (
                <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="section-title">Objection Drill</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Complete Objection Drill before taking the Module 6 test.</p>
                    </div>
                    <Badge variant="outline" className="w-fit border-primary/30 text-primary">{module6ReviewedCount} of {flashcards.length || 28} cards reviewed</Badge>
                  </div>
                  <Progress value={flashcards.length ? (module6ReviewedCount / flashcards.length) * 100 : 0} className="h-1.5" />
                  <div className="max-h-[560px] overflow-y-auto pr-1 space-y-4">
                    {Object.entries(flashcardsByCategory).map(([category, cards]) => (
                      <section key={category} className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</h4>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                          {cards.map((card) => {
                            const reviewed = (flashProgress[card.id]?.times_seen || 0) > 0;
                            const flipped = !!flippedFlashcards[card.id];
                            return (
                              <button
                                key={card.id}
                                type="button"
                                onClick={() => {
                                  setFlippedFlashcards((prev) => ({ ...prev, [card.id]: !prev[card.id] }));
                                  if (!selectedModule.is_locked) markFlashcardReviewed(card);
                                }}
                                className="min-h-[180px] rounded-xl border border-border/50 bg-secondary/35 p-4 text-left transition-colors hover:bg-secondary/55"
                              >
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px]">{card.category}</Badge>
                                  <Badge variant="outline" className="text-[10px] capitalize">{card.difficulty}</Badge>
                                  {reviewed && <CheckCircle2 className="ml-auto h-4 w-4 text-[hsl(152,60%,50%)]" />}
                                </div>
                                <p className="text-base font-semibold leading-snug text-foreground">“{card.front}”</p>
                                {flipped ? (
                                  <p className="mt-3 text-sm leading-relaxed text-foreground/85">{card.back}</p>
                                ) : (
                                  <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{selectedModule.is_locked ? "Tap to reveal preview" : "Tap to reveal and mark reviewed"}</p>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    {module6DrillComplete ? (
                      <Badge className="gap-2 bg-[hsl(152,60%,50%)]/15 text-[hsl(152,60%,65%)] hover:bg-[hsl(152,60%,50%)]/15">
                        <CheckCircle2 className="h-4 w-4" /> Drill Complete
                      </Badge>
                    ) : selectedModule.is_locked ? (
                      <span className="text-xs text-muted-foreground">Unlock Module 6 to submit this drill.</span>
                    ) : module6DrillReady ? (
                      <Button onClick={completeModule6Drill} className="gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Complete Drill
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Review every card to unlock completion.</span>
                    )}
                  </div>
                </div>
              )}

              {!isGlossaryModule && (() => {
                const chaptersReadInfo = getModuleChaptersRead(selectedModule.id);
                const allChaptersRead = chaptersReadInfo.total > 0 && chaptersReadInfo.read >= chaptersReadInfo.total;
                const moduleDone = isModuleCompleted(selectedModule.id) || moduleStatus(selectedModule.id) === "completed";
                const exam = examHistory[selectedModule.id];
                const examPassed = exam?.passed || moduleDone;
                return (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={selectedChapters.length === 0}
                        onClick={() => {
                          const firstUnread = selectedChapters.find(
                            (c) => !isChapterRead(c.id)
                          ) || selectedChapters.find(
                            (c) => !isChapterComplete(c.id)
                          ) || selectedChapters[0];
                          if (firstUnread) {
                            setRunner({
                              mode: "chapter",
                              chapter: firstUnread as ChapterRow,
                              moduleId: selectedModule.id,
                            });
                          }
                        }}
                        className="gap-2"
                      >
                        <PlayCircle className="h-4 w-4" />
                        {chaptersReadInfo.read > 0 ? "Continue" : "Start Module"}
                      </Button>
                    </div>

                    {/* Module Final Exam Section */}
                    <div className="rounded-2xl border p-5 space-y-3" style={{ borderColor: "hsla(211,96%,60%,.12)", background: "hsla(215,35%,10%,.8)" }}>
                      {examPassed ? (
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "hsla(142,72%,42%,.15)" }}>
                            <CheckCircle2 className="h-5 w-5 text-[hsl(142,72%,42%)]" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[hsl(142,72%,42%)]">Module Complete ✓</p>
                            <p className="text-[11px] text-foreground/50">Score: {exam?.bestScore || completions.find(c => c.module_id === selectedModule.id)?.score_average || 100}%</p>
                          </div>
                        </div>
                      ) : !allChaptersRead ? (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "hsla(220,15%,20%,.6)" }}>
                              <BookOpen className="h-5 w-5 text-foreground/40" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground/60">Complete all chapters to unlock the exam</p>
                              <p className="text-[11px] text-foreground/40">{chaptersReadInfo.read} of {chaptersReadInfo.total} chapters read</p>
                            </div>
                          </div>
                          <Progress value={(chaptersReadInfo.read / chaptersReadInfo.total) * 100} className="h-1.5" />
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,56%,.15)", boxShadow: "0 0 20px -4px hsla(211,96%,56%,.3)" }}>
                                <Award className="h-5 w-5 text-[hsl(211,96%,56%)]" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">Module Final Exam</p>
                                <p className="text-[11px] text-foreground/50">20 questions · 80% to pass</p>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => setExamRunner({ moduleId: selectedModule.id, moduleName: selectedModule.module_title })}
                            className="w-full gap-2"
                            disabled={selectedModule.is_locked}
                          >
                            <Award className="h-4 w-4" />
                            {exam && !exam.passed ? `Retake Module Exam · Best score: ${exam.bestScore}%` : "Take Module Final Exam"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Select a module to view details
            </div>
          )}
        </motion.div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Progress"
          value={`${overallPct}%`}
          icon={TrendingUp}
        />
        <MetricCard
          label="Modules Completed"
          value={`${completedModules} / ${totalModules}`}
          icon={BookOpen}
        />
        <MetricCard label="Certification Status" value={hasCertification ? "Certified" : overallPct === 100 ? "Ready" : "Locked"} icon={Star} />
        <MetricCard label="Flashcard Mastery" value={`${flashcardStats.mastered}/${flashcardStats.total || 28}`} icon={Layers} />
      </div>

      {/* Admin Debug Panel */}
      {canManageGlossary && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowDebug(!showDebug)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bug className="h-3 w-3" />
            {showDebug ? "Hide Debug Panel" : "Show Debug Panel"}
          </button>
          {showDebug && (
            <div className="mt-3 rounded-xl border border-border/40 bg-card/60 p-4 space-y-3 text-xs font-mono">
              <h4 className="text-sm font-semibold text-foreground mb-2">Module Completion Debug</h4>
              {numberedModules.map((m) => {
                const chapterProg = getModuleChapterProgress(m.id);
                const hasCompletion = isModuleCompleted(m.id);
                const status = moduleStatus(m.id);
                const unlocked = isModuleUnlocked(m);
                return (
                  <div key={m.id} className={`rounded-lg border p-2 ${hasCompletion ? "border-[hsl(152,60%,50%)]/40 bg-[hsl(152,60%,50%)]/[0.04]" : "border-border/30"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-foreground font-medium">M{m.module_number}: {m.module_title}</span>
                      <div className="flex gap-2">
                        <Badge variant={hasCompletion ? "default" : "outline"} className="text-[9px] h-4">
                          {hasCompletion ? "COMPLETION ✓" : "NO COMPLETION"}
                        </Badge>
                        <Badge variant={unlocked ? "default" : "secondary"} className="text-[9px] h-4">
                          {unlocked ? "UNLOCKED" : "LOCKED"}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      Status: {status} · Chapters: {chapterProg.completed}/{chapterProg.total} · is_locked: {String(m.is_locked)}
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      Chapters passed: {chapters.filter((c) => c.module_id === m.id && isChapterComplete(c.id)).map((c) => c.chapter_number).join(", ") || "none"}
                    </div>
                  </div>
                );
              })}
              <div className="mt-2 text-muted-foreground">
                Completion records: {completions.length > 0 ? completions.map((c) => {
                  const mod = modules.find((m) => m.id === c.module_id);
                  return `M${mod?.module_number || "?"}`;
                }).join(", ") : "none"}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="mt-8 pb-4 flex items-center justify-center gap-1.5 text-[10px] text-white/20">
        <Zap className="h-3 w-3" />
        <span>Powered by NewLight</span>
      </div>
    </div>
  );
}
