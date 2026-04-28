import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, CheckCircle2, XCircle, Trophy, Clock, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { ScriptDrillExercise, ScriptDrillLine } from "@/components/training/ScriptDrillExercise";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface QuestionRow {
  id: string;
  chapter_id: string | null;
  module_id: string;
  question_type: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  quiz_level?: number;
}

export interface ChapterRow {
  id: string;
  chapter_number: number;
  chapter_title: string;
  content: string | null;
  module_id: string;
}

type Phase = "reading" | "drill" | "quiz" | "result";
type QuizLevel = 1 | 2 | 3;

const SCRIPT_DRILLS: Record<string, ScriptDrillLine[]> = {
  "5.1": [
    { prompt: "RAPPORT:", answer: "Build rapport first. Comment on the business, the vibe, something real and genuine." },
    { prompt: "OPENER:", answer: "Hey, quick question — if I lined up 25 new [customers/clients] for you next month, could you handle them?" },
    { prompt: "SILENCE RULE:", answer: "Let them respond. Don't fill the silence." },
    { prompt: "HOOK:", answer: "Here's what I mean — right now there are people in [city] searching for exactly what you offer. They're just finding your competition first. What we do is flip that. We make sure those people find you instead and come through your door." },
    { prompt: "REVEAL SETUP:", answer: "And honestly — I already put something together for you specifically." },
    { prompt: "REVEAL:", answer: "This is a system I built for your business. It organizes everything on the backend and opens up revenue you're probably sitting on right now but can't see yet. Give me 5 minutes and I'll walk you through it." },
    { prompt: "APP TIP:", answer: "It shows you exactly where your business is bleeding money and what to do about it." },
  ],
  "5.2": [
    { prompt: "STEP 1 — OWNER CONFIRM:", answer: "Hey, is this the owner?" },
    { prompt: "STEP 2 — OPENER:", answer: "Quick question — if I could line up 25 new [customers] for you next month, would you have the capacity to take them on?" },
    { prompt: "STEP 3 — HOOK:", answer: "So the way we do it — there are people in your area searching for [their service] right now, and they're landing on your competition's page. We redirect that traffic to you instead." },
    { prompt: "STEP 4 — REVEAL:", answer: "I actually spent time building something out for your business specifically. Do you mind if I send it over?" },
    { prompt: "WAIT RULE:", answer: "Wait for yes." },
    { prompt: "STEP 5 — BOOK:", answer: "I'd love just 20 minutes to walk you through it. Do mornings, afternoons, or evenings work better for you this week?" },
    { prompt: "CALENDAR RULE:", answer: "Perfect. I'll send you a calendar link right now while we're on the phone." },
    { prompt: "SHOW RATE RULE:", answer: "Do not hang up without a booked slot. Show rate drops significantly without this." },
  ],
};

interface LevelProgressRow {
  quiz_level: QuizLevel;
  status: string;
  score: number | null;
}

interface Props {
  mode: "chapter" | "module_test";
  chapter?: ChapterRow;
  moduleId: string;
  trackId: string;
  passScore?: number;
  lockedPreview?: boolean;
  unlockModuleNumber?: number;
  onClose: () => void;
  onCompleted: () => void;
}

const LEVEL_LABELS: Record<QuizLevel, string> = {
  1: "Foundation",
  2: "Application",
  3: "Mastery",
};

const MarkdownReadingContent = ({ content }: { content: string }) => <ReactMarkdown>{content}</ReactMarkdown>;

export function ChapterRunner({
  mode,
  chapter,
  moduleId,
  trackId,
  passScore = 70,
  lockedPreview = false,
  unlockModuleNumber,
  onClose,
  onCompleted,
}: Props) {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [levelProgress, setLevelProgress] = useState<LevelProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>(mode === "chapter" ? "reading" : "quiz");
  const [currentLevel, setCurrentLevel] = useState<QuizLevel>(1);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [lastScorePct, setLastScorePct] = useState(0);
  const [lastPassed, setLastPassed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [moduleNumber, setModuleNumber] = useState<number | null>(null);
  const [drillCompleted, setDrillCompleted] = useState(false);
  const drillKey = mode === "chapter" && moduleNumber === 5 && chapter ? `5.${chapter.chapter_number}` : "";
  const drillLines = SCRIPT_DRILLS[drillKey] || [];
  const requiresDrill = drillLines.length > 0;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setPhase(mode === "chapter" ? "reading" : "quiz");
      setCurrentLevel(1);
      setQIdx(0);
      setSelected(null);
      setRevealed(false);
      setCorrectCount(0);

      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const { data: moduleRow } = await supabase
        .from("nl_training_modules")
        .select("module_number")
        .eq("id", moduleId)
        .maybeSingle();
      setModuleNumber(moduleRow?.module_number ?? null);

      let q;
      if (mode === "chapter" && chapter) {
        q = await supabase
          .from("nl_training_questions")
          .select("*")
          .eq("chapter_id", chapter.id)
          .eq("question_type", "chapter_quiz")
          .order("quiz_level", { ascending: true } as any)
          .order("created_at", { ascending: true });
      } else {
        q = await supabase
          .from("nl_training_questions")
          .select("*")
          .eq("module_id", moduleId)
          .eq("question_type", "module_test")
          .is("chapter_id", null)
          .order("created_at");
      }

      const rows = (q.data || []).map((r: any) => ({
        ...r,
        quiz_level: (r.quiz_level || 1) as QuizLevel,
        options: Array.isArray(r.options) ? r.options : (typeof r.options === "string" ? JSON.parse(r.options) : []),
      })) as QuestionRow[];
      setQuestions(rows);

      if (user && mode === "chapter" && chapter) {
        const { data: levels } = await (supabase as any)
          .from("nl_training_chapter_level_progress")
          .select("quiz_level, status, score")
          .eq("user_id", user.id)
          .eq("chapter_id", chapter.id);
        const levelRows = (levels || []) as LevelProgressRow[];
        setLevelProgress(levelRows);
        const { data: drillRows } = await (supabase as any)
          .from("nl_training_progress")
          .select("status")
          .eq("user_id", user.id)
          .eq("module_id", moduleId)
          .eq("chapter_id", chapter.id)
          .eq("status", "drill_completed")
          .limit(1);
        setDrillCompleted((drillRows || []).length > 0);
        const nextLevel = ([1, 2, 3] as QuizLevel[]).find(
          (level) => !levelRows.some((row) => row.quiz_level === level && row.status === "completed")
        ) || 3;
        setCurrentLevel(nextLevel);
      }

      if (user && !lockedPreview) {
        const { data: existingProgress } = await supabase
          .from("nl_training_progress")
          .select("status")
          .eq("user_id", user.id)
          .eq("module_id", moduleId)
          .eq("chapter_id", mode === "chapter" && chapter ? chapter.id : null)
          .maybeSingle();
        if (!existingProgress || !["completed", "drill_completed"].includes(existingProgress.status)) {
          await supabase.from("nl_training_progress").upsert(
          {
            user_id: user.id,
            track_id: trackId,
            module_id: moduleId,
            chapter_id: mode === "chapter" && chapter ? chapter.id : null,
            status: "in_progress",
            last_attempt_at: new Date().toISOString(),
          },
          { onConflict: "user_id,module_id,chapter_id" } as any
          );
        }
      }
      setLoading(false);
    };
    load();
  }, [mode, chapter?.id, moduleId, trackId, lockedPreview]);

  const currentLevelQuestions = useMemo(
    () => mode === "chapter" ? questions.filter((q) => (q.quiz_level || 1) === currentLevel).slice(0, 3) : questions,
    [currentLevel, mode, questions]
  );
  const current = currentLevelQuestions[qIdx];
  const totalQ = currentLevelQuestions.length;
  const scorePct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
  const passed = mode === "chapter" ? lastPassed : scorePct >= passScore;

  const isLevelComplete = (level: QuizLevel) => levelProgress.some((row) => row.quiz_level === level && row.status === "completed");
  const isLevelUnlocked = (level: QuizLevel) => level === 1 || isLevelComplete((level - 1) as QuizLevel);
  const completedLevels = ([1, 2, 3] as QuizLevel[]).filter(isLevelComplete).length;

  const resetQuiz = (level = currentLevel) => {
    if (lockedPreview) return;
    setCurrentLevel(level);
    setQIdx(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setLastScorePct(0);
    setLastPassed(false);
    setPhase(requiresDrill && !drillCompleted ? "drill" : "quiz");
  };

  const handleDrillComplete = () => {
    if (lockedPreview) return;
    setDrillCompleted(true);
    setPhase("quiz");
  };

  const handleSelect = (i: number) => {
    if (lockedPreview || revealed) return;
    setSelected(i);
    setRevealed(true);
    if (current && i === current.correct_index) {
      setCorrectCount((c) => c + 1);
    }
  };

  const persistLevelResult = async (finalPct: number, didPass: boolean) => {
    if (lockedPreview || !userId || !chapter) return;
    await (supabase as any).from("nl_training_chapter_level_progress").upsert(
      {
        user_id: userId,
        track_id: trackId,
        module_id: moduleId,
        chapter_id: chapter.id,
        quiz_level: currentLevel,
        status: didPass ? "completed" : "in_progress",
        score: finalPct,
        attempts: 1,
        last_attempt_at: new Date().toISOString(),
        completed_at: didPass ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,chapter_id,quiz_level" }
    );

    const nextProgress = [
      ...levelProgress.filter((row) => row.quiz_level !== currentLevel),
      { quiz_level: currentLevel, status: didPass ? "completed" : "in_progress", score: finalPct } as LevelProgressRow,
    ];
    setLevelProgress(nextProgress);

    if (didPass && currentLevel === 3) {
      await supabase.from("nl_training_progress").upsert(
        {
          user_id: userId,
          track_id: trackId,
          module_id: moduleId,
          chapter_id: chapter.id,
          status: "completed",
          score: finalPct,
          attempts: 1,
          last_attempt_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,module_id,chapter_id" } as any
      );
    }
  };

  const persistModuleResult = async (finalPct: number, didPass: boolean) => {
    if (lockedPreview || !userId) return;
    await supabase.from("nl_training_progress").upsert(
      {
        user_id: userId,
        track_id: trackId,
        module_id: moduleId,
        chapter_id: null,
        status: didPass ? "completed" : "in_progress",
        score: finalPct,
        attempts: 1,
        last_attempt_at: new Date().toISOString(),
        completed_at: didPass ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,module_id,chapter_id" } as any
    );

    if (didPass) {
      const { data: thisMod } = await supabase
        .from("nl_training_modules")
        .select("module_number, track_id")
        .eq("id", moduleId)
        .maybeSingle();
      if (thisMod) {
        const { data: nextMod } = await supabase
          .from("nl_training_modules")
          .select("id")
          .eq("track_id", thisMod.track_id)
          .eq("module_number", thisMod.module_number + 1)
          .maybeSingle();
        if (nextMod?.id) {
          await supabase.from("nl_training_modules").update({ is_locked: false }).eq("id", nextMod.id);
        }
      }
    }
  };

  const handleNext = async () => {
    if (lockedPreview) return;
    if (qIdx < totalQ - 1) {
      setQIdx((i) => i + 1);
      setSelected(null);
      setRevealed(false);
      return;
    }

    const finalPct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
    const didPass = finalPct >= passScore;
    setLastScorePct(finalPct);
    setLastPassed(didPass);
    setPhase("result");
    try {
      if (mode === "chapter") {
        await persistLevelResult(finalPct, didPass);
      } else {
        await persistModuleResult(finalPct, didPass);
      }
    } catch (error) {
      toast({ title: "Progress was not saved", description: "Please try again before leaving this screen.", variant: "destructive" });
    }
  };

  const handleMarkComplete = async () => {
    if (lockedPreview) return;
    setSaving(true);
    try {
      if (mode === "chapter" && chapter && userId) {
        await supabase.from("nl_training_progress").upsert(
          {
            user_id: userId,
            track_id: trackId,
            module_id: moduleId,
            chapter_id: chapter.id,
            status: "completed",
            score: lastScorePct,
            attempts: 1,
            last_attempt_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,module_id,chapter_id" } as any
        );
      }
      onCompleted();
      onClose();
    } catch (error) {
      toast({ title: "Could not mark complete", description: "Your chapter progress did not save. Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const levelBadges = mode === "chapter" && (
    <div className="grid grid-cols-3 gap-2 mb-6">
      {([1, 2, 3] as QuizLevel[]).map((level) => {
        const complete = isLevelComplete(level);
        const unlocked = isLevelUnlocked(level);
        return (
          <button
            key={level}
            type="button"
            disabled={!unlocked || complete}
            onClick={() => unlocked && !complete && resetQuiz(level)}
            className={`rounded-lg border px-3 py-2 text-left transition-colors ${
              complete
                ? "border-[hsl(152,60%,50%)]/40 bg-[hsl(152,60%,50%)]/[0.08]"
                : unlocked
                  ? "border-primary/40 bg-primary/10 hover:bg-primary/15"
                  : "border-border/40 bg-secondary/40 opacity-60"
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {complete ? <CheckCircle2 className="h-3 w-3 text-[hsl(152,60%,50%)]" /> : unlocked ? <BookOpen className="h-3 w-3 text-primary" /> : <Lock className="h-3 w-3" />}
              Level {level}
            </div>
            <div className="mt-1 text-xs font-medium text-foreground">{LEVEL_LABELS[level]}</div>
          </button>
        );
      })}
    </div>
  );

  const lockedTooltip = `Unlock by completing Module ${unlockModuleNumber ?? "previous"} first`;
  const lockedBanner = lockedPreview && unlockModuleNumber ? (
    <div className="mb-5 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
      Complete Module {unlockModuleNumber} to unlock quizzes and progress tracking for this module
    </div>
  ) : null;

  const quizButton = (
    <Button onClick={() => resetQuiz(currentLevel)} disabled={lockedPreview || currentLevelQuestions.length === 0} className="gap-2">
      {requiresDrill && !drillCompleted ? "Start Script Drill" : `Take Level ${currentLevel} Quiz`}
      <CheckCircle2 className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-4xl mx-auto px-3 py-4 sm:px-4 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to module
          </Button>
          <Badge variant="secondary" className="font-medium">
            {mode === "chapter" ? `Chapter ${chapter?.chapter_number}` : "Module Test"}
          </Badge>
        </div>

        {loading ? (
          <div className="card-widget text-center py-16 text-muted-foreground text-sm">Loading…</div>
        ) : phase === "reading" && chapter ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="card-widget w-full p-4 sm:p-8">
            {lockedBanner}
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Reading</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3 leading-tight">{chapter.chapter_title}</h1>
            {levelBadges}
            <Progress value={(completedLevels / 3) * 100} className="h-1.5 mb-8" />
            <MarkdownReadingContent content={chapter.content || ""} />
            <div className="mt-8 sm:mt-10 flex justify-stretch sm:justify-end">
              {lockedPreview ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild><span>{quizButton}</span></TooltipTrigger>
                    <TooltipContent>{lockedTooltip}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : quizButton}
            </div>
          </motion.div>
        ) : phase === "drill" && chapter && requiresDrill ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="card-widget w-full p-4 sm:p-8">
            <ScriptDrillExercise
              lines={drillLines}
              trackId={trackId}
              moduleId={moduleId}
              chapterId={chapter.id}
              onComplete={handleDrillComplete}
              lockedPreview={lockedPreview}
            />
          </motion.div>
        ) : phase === "quiz" && current ? (
          <motion.div key={`${current.id}-${currentLevel}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="card-widget w-full p-4 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {mode === "chapter" ? `Level ${currentLevel} · ${LEVEL_LABELS[currentLevel]}` : "Module Test"} · Question {qIdx + 1} of {totalQ}
              </span>
              <span className="text-[11px] font-semibold text-foreground">Score: {correctCount} / {totalQ}</span>
            </div>
            <Progress value={((qIdx + (revealed ? 1 : 0)) / totalQ) * 100} className="h-1.5 mb-6" />
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-6 leading-snug">{current.question_text}</h2>
            <div className="space-y-3">
              {current.options.map((opt, i) => {
                const isCorrect = i === current.correct_index;
                const isSelected = selected === i;
                let stateClass = "border-border/40 hover:bg-white/[0.03]";
                if (revealed) {
                  if (isCorrect) stateClass = "border-[hsl(152,60%,50%)]/60 bg-[hsl(152,60%,50%)]/[0.08]";
                  else if (isSelected) stateClass = "border-[hsl(0,75%,60%)]/60 bg-[hsl(0,75%,60%)]/[0.08]";
                  else stateClass = "border-border/30 opacity-60";
                }
                return (
                  <button key={i} onClick={() => handleSelect(i)} disabled={revealed} className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 flex items-center gap-3 ${stateClass}`}>
                    <div className="h-6 w-6 rounded-md bg-secondary flex items-center justify-center text-[11px] font-semibold shrink-0">{String.fromCharCode(65 + i)}</div>
                    <span className="text-sm text-foreground/90 flex-1">{opt}</span>
                    {revealed && isCorrect && <CheckCircle2 className="h-4 w-4 text-[hsl(152,60%,50%)] shrink-0" />}
                    {revealed && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-[hsl(0,75%,60%)] shrink-0" />}
                  </button>
                );
              })}
            </div>
            <AnimatePresence>
              {revealed && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-5 rounded-lg border p-4 ${selected === current.correct_index ? "border-[hsl(152,60%,50%)]/40 bg-[hsl(152,60%,50%)]/[0.06]" : "border-[hsl(0,75%,60%)]/40 bg-[hsl(0,75%,60%)]/[0.06]"}`}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 text-muted-foreground">{selected === current.correct_index ? "Correct" : "Not quite"}</div>
                  <p className="text-sm text-foreground/85 leading-relaxed">{current.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-6 flex justify-stretch sm:justify-end">
              <Button onClick={handleNext} disabled={!revealed} className="gap-2">{qIdx < totalQ - 1 ? "Next question" : "Finish"}</Button>
            </div>
          </motion.div>
        ) : phase === "result" ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }} className="card-widget text-center p-5 sm:p-8">
            <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 bg-secondary">
              {passed ? <Trophy className="h-8 w-8 text-[hsl(152,60%,50%)]" /> : <Clock className="h-8 w-8 text-[hsl(0,75%,60%)]" />}
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-1.5">
              {mode === "chapter"
                ? passed && currentLevel === 3
                  ? "Chapter Complete"
                  : passed
                    ? `Level ${currentLevel} Complete`
                    : "Retake This Level"
                : passed
                  ? "Module Test Passed"
                  : "Not quite there"}
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              You scored {lastScorePct}% {mode === "module_test" && `· pass mark ${passScore}%`}
            </p>
            {mode === "module_test" && !passed && <p className="text-[13px] text-muted-foreground mb-5">Retake available in 24 hours. Review the chapters and try again.</p>}
            <div className="flex flex-col sm:flex-row justify-center gap-2">
              <Button variant="outline" onClick={onClose}>Close</Button>
              {mode === "chapter" && !passed && <Button onClick={() => resetQuiz(currentLevel)}>Retake Level</Button>}
              {mode === "chapter" && passed && currentLevel < 3 && <Button onClick={() => resetQuiz((currentLevel + 1) as QuizLevel)}>Continue to Level {currentLevel + 1}</Button>}
              {!lockedPreview && mode === "chapter" && passed && currentLevel === 3 && <Button onClick={handleMarkComplete} disabled={saving}>{saving ? "Saving…" : "Mark Complete"}</Button>}
              {!lockedPreview && mode === "module_test" && passed && <Button onClick={handleMarkComplete} disabled={saving}>{saving ? "Saving…" : "Continue"}</Button>}
            </div>
          </motion.div>
        ) : (
          <div className="card-widget text-center py-16 text-muted-foreground text-sm">
            No questions available yet.
            <div className="mt-4"><Button variant="outline" onClick={onClose}>Close</Button></div>
          </div>
        )}
      </div>
    </div>
  );
}
