import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, CheckCircle2, XCircle, Trophy, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

export interface QuestionRow {
  id: string;
  chapter_id: string | null;
  module_id: string;
  question_type: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface ChapterRow {
  id: string;
  chapter_number: number;
  chapter_title: string;
  content: string | null;
  module_id: string;
}

type Phase = "reading" | "quiz" | "result";

interface Props {
  mode: "chapter" | "module_test";
  chapter?: ChapterRow;
  moduleId: string;
  trackId: string;
  passScore?: number; // 0..100, used for module_test
  onClose: () => void;
  onCompleted: () => void;
}

export function ChapterRunner({
  mode,
  chapter,
  moduleId,
  trackId,
  passScore = 70,
  onClose,
  onCompleted,
}: Props) {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>(mode === "chapter" ? "reading" : "quiz");
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      let q;
      if (mode === "chapter" && chapter) {
        q = await supabase
          .from("nl_training_questions")
          .select("*")
          .eq("chapter_id", chapter.id)
          .eq("question_type", "chapter_quiz")
          .order("created_at");
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
        options: Array.isArray(r.options) ? r.options : (typeof r.options === "string" ? JSON.parse(r.options) : []),
      })) as QuestionRow[];
      setQuestions(rows);

      // Mark in_progress
      if (user) {
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
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, chapter?.id, moduleId, trackId]);

  const current = questions[qIdx];
  const totalQ = questions.length;
  const scorePct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
  const passed = scorePct >= passScore;

  const handleSelect = (i: number) => {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
    if (current && i === current.correct_index) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = async () => {
    if (qIdx < totalQ - 1) {
      setQIdx((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      // finished
      setPhase("result");
      await persistResult();
    }
  };

  const persistResult = async () => {
    if (!userId) return;
    const finalCorrect = correctCount + (revealed && selected === current?.correct_index ? 0 : 0);
    const finalPct = totalQ > 0 ? Math.round((finalCorrect / totalQ) * 100) : 0;
    const didPass = mode === "chapter" ? true : finalPct >= passScore;

    if (mode === "chapter" && chapter) {
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
    } else {
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
        // Unlock next module
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
            await supabase
              .from("nl_training_modules")
              .update({ is_locked: false })
              .eq("id", nextMod.id);
          }
        }
      }
    }
  };

  const handleMarkComplete = () => {
    onCompleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to module
          </Button>
          <Badge variant="secondary" className="font-medium">
            {mode === "chapter"
              ? `Chapter ${chapter?.chapter_number}`
              : "Module Test"}
          </Badge>
        </div>

        {loading ? (
          <div className="card-widget text-center py-16 text-muted-foreground text-sm">
            Loading…
          </div>
        ) : phase === "reading" && chapter ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="card-widget"
          >
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-[hsl(var(--nl-neon))]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Reading
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-4">
              {chapter.chapter_title}
            </h1>
            <div className="prose prose-invert max-w-none">
              {(chapter.content || "").split("\n\n").map((para, i) => (
                <p
                  key={i}
                  className="text-[14.5px] leading-relaxed text-foreground/85 whitespace-pre-line mb-4"
                >
                  {para}
                </p>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <Button
                onClick={() => setPhase("quiz")}
                disabled={questions.length === 0}
                className="gap-2"
              >
                Take Quiz
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ) : phase === "quiz" && current ? (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="card-widget"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Question {qIdx + 1} of {totalQ}
              </span>
              <span className="text-[11px] font-semibold text-foreground">
                Score: {correctCount} / {totalQ}
              </span>
            </div>
            <Progress value={((qIdx + (revealed ? 1 : 0)) / totalQ) * 100} className="h-1.5 mb-5" />
            <h2 className="text-lg font-semibold text-foreground mb-5 leading-snug">
              {current.question_text}
            </h2>
            <div className="space-y-2">
              {current.options.map((opt, i) => {
                const isCorrect = i === current.correct_index;
                const isSelected = selected === i;
                let stateClass = "border-border/40 hover:bg-white/[0.03]";
                if (revealed) {
                  if (isCorrect) {
                    stateClass = "border-[hsl(152,60%,50%)]/60 bg-[hsl(152,60%,50%)]/[0.08]";
                  } else if (isSelected) {
                    stateClass = "border-[hsl(0,75%,60%)]/60 bg-[hsl(0,75%,60%)]/[0.08]";
                  } else {
                    stateClass = "border-border/30 opacity-60";
                  }
                } else if (isSelected) {
                  stateClass = "border-[hsl(var(--nl-neon))]/60 bg-[hsl(var(--nl-neon))]/[0.08]";
                }
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    disabled={revealed}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-center gap-3 ${stateClass}`}
                  >
                    <div
                      className="h-6 w-6 rounded-md flex items-center justify-center text-[11px] font-semibold shrink-0"
                      style={{ background: "hsla(220,15%,20%,.5)" }}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-[13px] text-foreground/90 flex-1">{opt}</span>
                    {revealed && isCorrect && (
                      <CheckCircle2 className="h-4 w-4 text-[hsl(152,60%,50%)] shrink-0" />
                    )}
                    {revealed && isSelected && !isCorrect && (
                      <XCircle className="h-4 w-4 text-[hsl(0,75%,60%)] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mt-5 rounded-xl border p-4 ${
                    selected === current.correct_index
                      ? "border-[hsl(152,60%,50%)]/40 bg-[hsl(152,60%,50%)]/[0.06]"
                      : "border-[hsl(0,75%,60%)]/40 bg-[hsl(0,75%,60%)]/[0.06]"
                  }`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 text-muted-foreground">
                    {selected === current.correct_index ? "Correct" : "Not quite"}
                  </div>
                  <p className="text-[13px] text-foreground/85 leading-relaxed">
                    {current.explanation}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 flex justify-end">
              <Button onClick={handleNext} disabled={!revealed} className="gap-2">
                {qIdx < totalQ - 1 ? "Next question" : "Finish"}
              </Button>
            </div>
          </motion.div>
        ) : phase === "result" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="card-widget text-center"
          >
            <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background:
                  mode === "chapter" || passed
                    ? "hsla(152,60%,50%,.15)"
                    : "hsla(0,75%,60%,.15)",
              }}
            >
              {mode === "chapter" || passed ? (
                <Trophy className="h-8 w-8 text-[hsl(152,60%,50%)]" />
              ) : (
                <Clock className="h-8 w-8 text-[hsl(0,75%,60%)]" />
              )}
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-1.5">
              {mode === "chapter"
                ? "Chapter Complete"
                : passed
                ? "Module Test Passed"
                : "Not quite there"}
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              You scored {correctCount} of {totalQ} ({scorePct}%)
              {mode === "module_test" && ` · pass mark ${passScore}%`}
            </p>

            {mode === "module_test" && !passed && (
              <p className="text-[13px] text-muted-foreground mb-5">
                Retake available in 24 hours. Review the chapters and try again.
              </p>
            )}

            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {(mode === "chapter" || passed) && (
                <Button onClick={handleMarkComplete}>
                  {mode === "chapter" ? "Mark Complete" : "Continue"}
                </Button>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="card-widget text-center py-16 text-muted-foreground text-sm">
            No questions available yet.
            <div className="mt-4">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
