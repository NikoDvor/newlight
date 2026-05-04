import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CheckCircle2, Zap, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string;
  unlock_level: string;
}

interface UnlockRow {
  foundation_passed: boolean;
  intermediate_passed: boolean;
  advanced_passed: boolean;
}

const LEVELS = [
  { key: "foundation", label: "Foundation", quiz_level: 1 },
  { key: "intermediate", label: "Intermediate", quiz_level: 2 },
  { key: "advanced", label: "Advanced", quiz_level: 3 },
] as const;

interface Props {
  chapterId: string;
  unlockCategory: string;
}

export function ObjectionMasteryTrack({ chapterId, unlockCategory }: Props) {
  const { user } = useWorkspace();
  const [unlock, setUnlock] = useState<UnlockRow | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeLevel, setActiveLevel] = useState<string | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [phase, setPhase] = useState<"idle" | "quiz" | "result">("idle");
  const [lastScore, setLastScore] = useState(0);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data: row } = await (supabase as any)
      .from("nl_objection_unlocks")
      .select("foundation_passed, intermediate_passed, advanced_passed")
      .eq("user_id", user.id)
      .eq("objection_category", unlockCategory)
      .maybeSingle();
    setUnlock(row as UnlockRow | null);

    const { data: qs } = await (supabase as any)
      .from("nl_training_questions")
      .select("id, question_text, options, correct_index, explanation, unlock_level")
      .eq("chapter_id", chapterId)
      .eq("is_unlock_question", true)
      .eq("unlock_category", unlockCategory)
      .order("quiz_level");
    setQuestions((qs || []) as Question[]);
  }, [user?.id, chapterId, unlockCategory]);

  useEffect(() => { load(); }, [load]);

  if (!unlock) return null;

  const isLevelUnlocked = (key: string) => {
    if (key === "foundation") return true;
    if (key === "intermediate") return !!unlock.foundation_passed;
    if (key === "advanced") return !!unlock.intermediate_passed;
    return false;
  };

  const isLevelPassed = (key: string) => {
    if (key === "foundation") return !!unlock.foundation_passed;
    if (key === "intermediate") return !!unlock.intermediate_passed;
    if (key === "advanced") return !!unlock.advanced_passed;
    return false;
  };

  const prevLevelLabel = (key: string) => {
    if (key === "intermediate") return "Foundation";
    if (key === "advanced") return "Intermediate";
    return "";
  };

  const levelQuestions = questions.filter((q) => q.unlock_level === activeLevel);
  const current = levelQuestions[qIdx] || null;
  const totalQ = levelQuestions.length;

  const startQuiz = (levelKey: string) => {
    setActiveLevel(levelKey);
    setQIdx(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setPhase("quiz");
  };

  const handleSelect = (idx: number) => {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
    if (current && idx === current.correct_index) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = async () => {
    if (qIdx < totalQ - 1) {
      setQIdx((i) => i + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      const score = Math.round(((correctCount + (selected === current?.correct_index ? 0 : 0)) / totalQ) * 100);
      // recalculate: correctCount already includes last if correct
      const finalCorrect = correctCount;
      const finalScore = Math.round((finalCorrect / totalQ) * 100);
      setLastScore(finalScore);
      setPhase("result");

      if (finalScore >= 80 && user?.id && activeLevel) {
        const field = `${activeLevel}_passed` as keyof UnlockRow;
        await (supabase as any)
          .from("nl_objection_unlocks")
          .update({ [field]: true })
          .eq("user_id", user.id)
          .eq("objection_category", unlockCategory);

        if (activeLevel === "foundation") {
          await (supabase as any)
            .from("nl_objection_unlocks")
            .update({ intermediate_unlocked: true })
            .eq("user_id", user.id)
            .eq("objection_category", unlockCategory);
        } else if (activeLevel === "intermediate") {
          await (supabase as any)
            .from("nl_objection_unlocks")
            .update({ advanced_unlocked: true })
            .eq("user_id", user.id)
            .eq("objection_category", unlockCategory);
        }
        load();
      }
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-primary/25 bg-primary/[0.04] p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-4 w-4 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          Objection Mastery Track — {unlockCategory}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div key="levels" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {LEVELS.map((level) => {
              const unlocked = isLevelUnlocked(level.key);
              const passed = isLevelPassed(level.key);
              return (
                <div
                  key={level.key}
                  className={`rounded-xl border p-4 transition-colors ${
                    passed
                      ? "border-[hsl(152,60%,50%)]/40 bg-[hsl(152,60%,50%)]/[0.06]"
                      : unlocked
                        ? "border-primary/30 bg-primary/[0.06]"
                        : "border-border/40 bg-secondary/30 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    {passed ? (
                      <CheckCircle2 className="h-4 w-4 text-[hsl(152,60%,50%)]" />
                    ) : unlocked ? (
                      <Zap className="h-4 w-4 text-primary" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-xs font-semibold text-foreground">{level.label}</span>
                  </div>

                  {passed ? (
                    <Badge variant="default" className="text-[10px] bg-[hsl(152,60%,50%)]/20 text-[hsl(152,60%,50%)] border-0">
                      Passed
                    </Badge>
                  ) : unlocked ? (
                    <Button size="sm" variant="outline" className="text-xs h-7 mt-1" onClick={() => startQuiz(level.key)}>
                      Start Quiz
                    </Button>
                  ) : (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Complete {prevLevelLabel(level.key)} to unlock
                    </p>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {phase === "quiz" && current && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {activeLevel && activeLevel.charAt(0).toUpperCase() + activeLevel.slice(1)} · Q{qIdx + 1}/{totalQ}
              </span>
              <span className="text-[10px] font-semibold text-foreground">Score: {correctCount}/{totalQ}</span>
            </div>
            <Progress value={((qIdx + (revealed ? 1 : 0)) / totalQ) * 100} className="h-1.5 mb-4" />
            <h3 className="text-sm font-semibold text-foreground mb-4 leading-snug">{current.question_text}</h3>
            <div className="space-y-2">
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
                  <button key={i} onClick={() => handleSelect(i)} disabled={revealed} className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-200 flex items-center gap-2.5 ${stateClass}`}>
                    <div className="h-5 w-5 rounded-md bg-secondary flex items-center justify-center text-[10px] font-semibold shrink-0">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-xs text-foreground/90 flex-1">{opt}</span>
                    {revealed && isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(152,60%,50%)] shrink-0" />}
                    {revealed && isSelected && !isCorrect && <XCircle className="h-3.5 w-3.5 text-[hsl(0,75%,60%)] shrink-0" />}
                  </button>
                );
              })}
            </div>
            {revealed && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 rounded-lg border p-3 text-xs leading-relaxed ${selected === current.correct_index ? "border-[hsl(152,60%,50%)]/40 bg-[hsl(152,60%,50%)]/[0.06] text-foreground/85" : "border-[hsl(0,75%,60%)]/40 bg-[hsl(0,75%,60%)]/[0.06] text-foreground/85"}`}>
                {current.explanation}
              </motion.div>
            )}
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={handleNext} disabled={!revealed}>
                {qIdx < totalQ - 1 ? "Next" : "Finish"}
              </Button>
            </div>
          </motion.div>
        )}

        {phase === "result" && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
            <div className="mx-auto h-12 w-12 rounded-xl flex items-center justify-center mb-3 bg-secondary">
              {lastScore >= 80 ? <CheckCircle2 className="h-6 w-6 text-[hsl(152,60%,50%)]" /> : <XCircle className="h-6 w-6 text-[hsl(0,75%,60%)]" />}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {lastScore >= 80 ? "Level Passed!" : "Not quite — try again"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">Score: {lastScore}% {lastScore < 80 && "· Need 80% to pass"}</p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPhase("idle")}>Back</Button>
              {lastScore < 80 && activeLevel && (
                <Button size="sm" onClick={() => startQuiz(activeLevel)}>Retake</Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
