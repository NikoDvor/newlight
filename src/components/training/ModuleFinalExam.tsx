import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle, Trophy, RotateCcw, BookOpen, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { shuffleQuestion } from "@/lib/quizShuffle";

interface QuestionRow {
  id: string;
  chapter_id: string | null;
  module_id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  quiz_level?: number;
}

interface ModuleFinalExamProps {
  moduleId: string;
  moduleName: string;
  trackId: string;
  modules: { id: string; module_number: number; module_title: string }[];
  onClose: () => void;
  onPassed: () => void;
}

type Phase = "exam" | "results";

interface AnswerRecord {
  questionId: string;
  chapterId: string | null;
  selectedIndex: number;
  correctIndex: number;
  correct: boolean;
}

export function ModuleFinalExam({ moduleId, moduleName, trackId, modules, onClose, onPassed }: ModuleFinalExamProps) {
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("exam");
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [attemptSeed] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [chapterMap, setChapterMap] = useState<Record<string, string>>({});

  // Timer
  useEffect(() => {
    if (phase !== "exam") return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Load questions
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Get all chapters for this module to build name map
      const { data: chapters } = await supabase
        .from("nl_training_chapters")
        .select("id, chapter_number, chapter_title")
        .eq("module_id", moduleId);
      const cMap: Record<string, string> = {};
      (chapters || []).forEach((c: any) => { cMap[c.id] = `${c.chapter_number}. ${c.chapter_title}`; });
      setChapterMap(cMap);

      // Get all chapter_quiz questions for this module
      const { data: allQ } = await supabase
        .from("nl_training_questions")
        .select("id, chapter_id, module_id, question_text, options, correct_index, explanation, quiz_level")
        .eq("module_id", moduleId)
        .eq("question_type", "chapter_quiz");

      const pool = (allQ || []) as QuestionRow[];

      // Split by level
      const l1 = pool.filter(q => (q.quiz_level || 1) === 1);
      const l2 = pool.filter(q => (q.quiz_level || 1) === 2);
      const l3 = pool.filter(q => (q.quiz_level || 1) === 3);

      // Pick randomly: 8 L1, 8 L2, 4 L3 — adjust if not enough
      const pick = (arr: QuestionRow[], n: number): QuestionRow[] => {
        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, n);
      };

      let selected = [
        ...pick(l1, Math.min(8, l1.length)),
        ...pick(l2, Math.min(8, l2.length)),
        ...pick(l3, Math.min(4, l3.length)),
      ];

      // If we have fewer than 20, fill from remaining pool
      if (selected.length < 20) {
        const usedIds = new Set(selected.map(q => q.id));
        const remaining = pool.filter(q => !usedIds.has(q.id)).sort(() => Math.random() - 0.5);
        selected = [...selected, ...remaining.slice(0, 20 - selected.length)];
      }

      // Randomize final order
      selected.sort(() => Math.random() - 0.5);

      setQuestions(selected.slice(0, 20));
      setLoading(false);
    };
    load();
  }, [moduleId]);

  const current = questions[qIdx];
  const totalQ = questions.length;
  const correctCount = answers.filter(a => a.correct).length;

  const shuffled = useMemo(
    () => current ? shuffleQuestion(current.options, current.correct_index, current.id, attemptSeed) : null,
    [current?.id, attemptSeed]
  );

  const handleSelect = (i: number) => {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
  };

  const handleNext = () => {
    if (selected === null || !shuffled || !current) return;

    const isCorrect = shuffled.indexMap[selected] === current.correct_index;
    const record: AnswerRecord = {
      questionId: current.id,
      chapterId: current.chapter_id,
      selectedIndex: shuffled.indexMap[selected],
      correctIndex: current.correct_index,
      correct: isCorrect,
    };

    const newAnswers = [...answers, record];
    setAnswers(newAnswers);

    if (qIdx < totalQ - 1) {
      setQIdx(i => i + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      // Exam complete
      submitExam(newAnswers);
    }
  };

  const submitExam = async (finalAnswers: AnswerRecord[]) => {
    setSaving(true);
    const score = Math.round((finalAnswers.filter(a => a.correct).length / finalAnswers.length) * 100);
    const passed = score >= 80;
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

    // Calculate weak chapters
    const chapterErrors: Record<string, number> = {};
    finalAnswers.filter(a => !a.correct).forEach(a => {
      const key = a.chapterId || "unknown";
      chapterErrors[key] = (chapterErrors[key] || 0) + 1;
    });
    const weakChapters = Object.entries(chapterErrors)
      .sort((a, b) => b[1] - a[1])
      .map(([chId, count]) => ({ chapter_id: chId, wrong_count: count, chapter_name: chapterMap[chId] || chId }));

    // Get attempt number
    const { data: prevExams } = await (supabase as any)
      .from("nl_module_exams")
      .select("attempt_number")
      .eq("user_id", userId)
      .eq("module_id", moduleId)
      .order("attempt_number", { ascending: false })
      .limit(1);
    const attemptNumber = ((prevExams || [])[0]?.attempt_number || 0) + 1;

    // Insert exam record
    await (supabase as any).from("nl_module_exams").insert({
      user_id: userId,
      module_id: moduleId,
      attempt_number: attemptNumber,
      score,
      passed,
      questions_snapshot: finalAnswers.map(a => a.questionId),
      answers_snapshot: finalAnswers.map(a => ({ questionId: a.questionId, selected: a.selectedIndex, correct: a.correctIndex, isCorrect: a.correct })),
      weak_chapters: weakChapters,
      started_at: new Date(startTimeRef.current).toISOString(),
      completed_at: new Date().toISOString(),
      duration_seconds: duration,
    });

    if (passed) {
      // Create nl_module_completion record
      await (supabase as any).from("nl_module_completion").upsert(
        {
          user_id: userId,
          module_id: moduleId,
          completed_at: new Date().toISOString(),
          score_average: score,
        },
        { onConflict: "user_id,module_id" }
      );

      // Unlock next module
      const currentModule = modules.find(m => m.id === moduleId);
      if (currentModule) {
        const nextModule = modules.find(m => m.module_number === currentModule.module_number + 1);
        if (nextModule) {
          await supabase.from("nl_training_modules").update({ is_locked: false }).eq("id", nextModule.id);
        }
      }

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    setSaving(false);
    setPhase("results");
  };

  const currentModule = modules.find(m => m.id === moduleId);
  const nextModule = currentModule ? modules.find(m => m.module_number === currentModule.module_number + 1) : null;
  const finalScore = answers.length > 0 ? Math.round((answers.filter(a => a.correct).length / answers.length) * 100) : 0;
  const didPass = finalScore >= 80;

  // Wrong answers for review
  const wrongAnswers = useMemo(() =>
    answers.filter(a => !a.correct).map(a => {
      const q = questions.find(qq => qq.id === a.questionId);
      return q ? { ...a, question: q } : null;
    }).filter(Boolean) as (AnswerRecord & { question: QuestionRow })[],
    [answers, questions]
  );

  // Weak chapters summary
  const weakChaptersSummary = useMemo(() => {
    const errors: Record<string, number> = {};
    answers.filter(a => !a.correct).forEach(a => {
      const key = a.chapterId || "unknown";
      errors[key] = (errors[key] || 0) + 1;
    });
    return Object.entries(errors)
      .sort((a, b) => b[1] - a[1])
      .map(([chId, count]) => ({ id: chId, name: chapterMap[chId] || "Unknown", count }));
  }, [answers, chapterMap]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "hsla(215,35%,10%,.95)" }}>
        <div className="text-center">
          <div className="animate-pulse text-foreground/60 text-sm">Loading exam…</div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "hsla(215,35%,10%,.95)" }}>
        <div className="text-center space-y-4">
          <p className="text-foreground/60 text-sm">No questions available for this module exam.</p>
          <Button variant="outline" onClick={onClose}>Back to module</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "hsla(215,35%,10%,.95)" }}>
      {/* Confetti / celebration glow */}
      {showConfetti && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, hsla(142,72%,42%,.12) 0%, transparent 70%)",
          }}
        />
      )}

      <div className="w-full max-w-3xl mx-auto px-4 py-6 sm:py-10">
        {phase === "exam" && current && shuffled ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <Button variant="ghost" size="sm" onClick={onClose} className="gap-2 text-foreground/60 hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Exit Exam
              </Button>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium text-foreground/50 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {formatTime(elapsed)}
                </span>
              </div>
            </div>

            {/* Module title + counter */}
            <div className="mb-3">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground">{moduleName} — Final Exam</h1>
              <p className="text-[13px] text-foreground/50 mt-1">Question {qIdx + 1} of {totalQ}</p>
            </div>

            {/* Progress bar */}
            <Progress value={((qIdx + (revealed ? 1 : 0)) / totalQ) * 100} className="h-1.5 mb-8" />

            {/* Question */}
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-6 leading-snug">
                {current.question_text}
              </h2>

              <div className="space-y-3">
                {shuffled.options.map((opt, i) => {
                  const isCorrect = i === shuffled.correctShuffledIndex;
                  const isSelected = selected === i;
                  let cardStyle = "border-[hsla(211,96%,60%,.12)] hover:border-[hsla(211,96%,60%,.3)] hover:bg-[hsla(211,96%,60%,.04)]";
                  if (selected === i && !revealed) {
                    cardStyle = "border-[hsl(211,96%,56%)] bg-[hsla(211,96%,56%,.08)]";
                  }
                  if (revealed) {
                    if (isCorrect) cardStyle = "border-[hsl(142,72%,42%)]/60 bg-[hsl(142,72%,42%)]/[0.08]";
                    else if (isSelected) cardStyle = "border-[hsl(0,75%,60%)]/60 bg-[hsl(0,75%,60%)]/[0.08]";
                    else cardStyle = "border-[hsla(211,96%,60%,.08)] opacity-50";
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(i)}
                      disabled={revealed}
                      className={`w-full text-left px-4 py-4 rounded-xl border transition-all duration-200 flex items-center gap-3 ${cardStyle}`}
                      style={{ background: revealed ? undefined : undefined }}
                    >
                      <div
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0"
                        style={{
                          background: isSelected && !revealed
                            ? "hsl(211,96%,56%)"
                            : "hsla(220,15%,20%,.6)",
                          color: isSelected && !revealed ? "#fff" : "hsl(var(--foreground)/.7)",
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-sm text-foreground/90 flex-1">{opt}</span>
                      {revealed && isCorrect && <CheckCircle2 className="h-4 w-4 text-[hsl(142,72%,42%)] shrink-0" />}
                      {revealed && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-[hsl(0,75%,60%)] shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation after reveal */}
              <AnimatePresence>
                {revealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mt-5 rounded-xl border p-4 ${
                      selected !== null && shuffled.indexMap[selected] === current.correct_index
                        ? "border-[hsl(142,72%,42%)]/40 bg-[hsl(142,72%,42%)]/[0.06]"
                        : "border-[hsl(0,75%,60%)]/40 bg-[hsl(0,75%,60%)]/[0.06]"
                    }`}
                  >
                    <p className="text-sm text-foreground/85 leading-relaxed">{current.explanation}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Next / Submit button */}
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleNext}
                  disabled={!revealed || saving}
                  className="gap-2 min-w-[140px]"
                >
                  {saving ? "Submitting…" : qIdx < totalQ - 1 ? (
                    <>Next <ChevronRight className="h-4 w-4" /></>
                  ) : "Submit Exam"}
                </Button>
              </div>
            </motion.div>
          </>
        ) : phase === "results" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Score hero */}
            <div className="text-center py-8">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className="mx-auto h-24 w-24 rounded-3xl flex items-center justify-center mb-5"
                style={{
                  background: didPass
                    ? "hsla(142,72%,42%,.15)"
                    : "hsla(220,15%,20%,.6)",
                  boxShadow: didPass
                    ? "0 0 40px -8px hsla(142,72%,42%,.4), inset 0 0 0 1px hsla(142,72%,42%,.2)"
                    : undefined,
                }}
              >
                {didPass ? (
                  <Trophy className="h-10 w-10 text-[hsl(142,72%,42%)]" />
                ) : (
                  <RotateCcw className="h-10 w-10 text-foreground/40" />
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <div className="text-5xl font-bold mb-2" style={{ color: didPass ? "hsl(142,72%,42%)" : "hsl(var(--foreground))" }}>
                  {finalScore}%
                </div>
                {didPass ? (
                  <>
                    <h2 className="text-xl font-bold" style={{ color: "hsl(211,96%,56%)" }}>MODULE COMPLETE</h2>
                    {nextModule && (
                      <p className="mt-2 text-sm text-foreground/60">Next Module Unlocked: {nextModule.module_title}</p>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold text-foreground/80">Not quite — you need 80% to pass</h2>
                    <p className="mt-2 text-sm text-foreground/50">
                      You got {answers.filter(a => a.correct).length} of {answers.length} correct · {formatTime(elapsed)}
                    </p>
                  </>
                )}
              </motion.div>
            </div>

            {/* Weak chapters (fail only) */}
            {!didPass && weakChaptersSummary.length > 0 && (
              <div className="rounded-2xl border p-5 space-y-3" style={{ borderColor: "hsla(211,96%,60%,.12)", background: "hsla(215,35%,10%,.8)" }}>
                <h3 className="text-sm font-semibold text-foreground/80">Chapters to Review</h3>
                {weakChaptersSummary.map(ch => (
                  <div key={ch.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/20 last:border-0">
                    <span className="text-sm text-foreground/70">{ch.name}</span>
                    <Badge variant="outline" className="text-[10px]">{ch.count} wrong</Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Wrong answers review (fail only) */}
            {!didPass && wrongAnswers.length > 0 && (
              <div className="rounded-2xl border p-5 space-y-4" style={{ borderColor: "hsla(211,96%,60%,.12)", background: "hsla(215,35%,10%,.8)" }}>
                <h3 className="text-sm font-semibold text-foreground/80">Questions You Missed</h3>
                {wrongAnswers.map((wa, idx) => (
                  <div key={wa.questionId} className="pb-4 border-b border-border/20 last:border-0 last:pb-0">
                    <p className="text-sm font-medium text-foreground/80 mb-2">{idx + 1}. {wa.question.question_text}</p>
                    <div className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(142,72%,42%)] shrink-0 mt-0.5" />
                      <span className="text-foreground/60">Correct: {wa.question.options[wa.correctIndex]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              {didPass ? (
                <>
                  {nextModule ? (
                    <Button
                      onClick={() => { onPassed(); onClose(); }}
                      className="gap-2"
                    >
                      Continue to {nextModule.module_title}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={() => { onPassed(); onClose(); }} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Done
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={onClose} className="gap-2">
                    <BookOpen className="h-4 w-4" />
                    Review Chapters
                  </Button>
                  <Button onClick={() => { window.location.reload(); }} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Retake Exam
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
