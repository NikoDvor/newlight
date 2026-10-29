import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Question } from "@/lib/academy";
import { GlowBar } from "./ui";

/**
 * practice: instant right/wrong + explanation after each tap (chapter quizzes).
 * exam:     no feedback until the end; back/next; submit (final certification).
 */
export function QuizRunner({ questions, mode, onFinish }: {
  questions: Question[];
  mode: "practice" | "exam";
  onFinish: (answers: (number | null)[]) => void;
}) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const q = questions[i];
  const picked = answers[i];
  const revealed = mode === "practice" && picked != null;
  const last = i === questions.length - 1;
  const answeredCount = answers.filter((a) => a != null).length;

  const pick = (k: number) => {
    if (mode === "practice" && picked != null) return;
    setAnswers((a) => a.map((v, j) => (j === i ? k : v)));
  };

  if (!q) return null;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-white/55 mb-2">
        <span>Question {i + 1} of {questions.length}</span>
        {mode === "exam" && <span>{answeredCount} answered</span>}
      </div>
      <GlowBar pct={((i + (picked != null ? 1 : 0)) / questions.length) * 100} className="mb-5" />

      <AnimatePresence mode="wait">
        <motion.div key={q.id + i} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
          <h3 className="text-[18px] sm:text-xl font-semibold leading-snug text-white">{q.question_text}</h3>
          <div className="mt-4 space-y-2.5">
            {q.options.map((opt, k) => {
              const isPicked = picked === k;
              const isRight = revealed && k === q.correct_index;
              const isWrong = revealed && isPicked && k !== q.correct_index;
              return (
                <motion.button key={k} type="button" whileTap={{ scale: 0.985 }} onClick={() => pick(k)}
                  className="flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-[15px] leading-snug transition-colors"
                  style={{
                    borderColor: isRight ? "hsl(152,70%,50%)" : isWrong ? "hsl(0,85%,60%)" : isPicked ? "hsl(197,100%,58%)" : "hsla(211,96%,60%,.18)",
                    background: isRight ? "hsla(152,70%,45%,.12)" : isWrong ? "hsla(0,85%,55%,.1)" : isPicked ? "hsla(197,100%,55%,.1)" : "hsla(0,0%,100%,.025)",
                    color: "white",
                  }}>
                  <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center">
                    {isRight ? <Check className="h-4 w-4 text-[hsl(152,70%,55%)]" /> : isWrong ? <X className="h-4 w-4 text-[hsl(0,85%,65%)]" />
                      : <span className="h-[2px] w-3 rounded-full" style={{ background: isPicked ? "hsl(197,100%,60%)" : "hsla(0,0%,100%,.25)" }} />}
                  </span>
                  <span>{opt}</span>
                </motion.button>
              );
            })}
          </div>
          {revealed && q.explanation && (
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-lg border-l-2 border-[hsl(197,100%,58%)] bg-white/[0.03] px-3 py-2 text-[13px] leading-relaxed text-white/75">
              {q.explanation}
            </motion.p>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between gap-3">
        {mode === "exam" ? (
          <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        ) : <span />}
        {last ? (
          <Button disabled={mode === "practice" ? picked == null : answeredCount < questions.length} onClick={() => onFinish(answers)}>
            {mode === "exam" ? (answeredCount < questions.length ? `Answer all (${questions.length - answeredCount} left)` : "Submit") : "See score"}
          </Button>
        ) : (
          <Button disabled={picked == null} onClick={() => setI(i + 1)}>Next<ArrowRight className="h-4 w-4 ml-1" /></Button>
        )}
      </div>
      {mode === "exam" && last && answeredCount < questions.length && (
        <button type="button" className="mt-3 text-[12px] text-[hsl(197,100%,65%)] underline"
          onClick={() => setI(answers.findIndex((a) => a == null))}>Go to first unanswered</button>
      )}
    </div>
  );
}

export function scoreOf(questions: Question[], answers: (number | null)[]) {
  const right = questions.filter((q, i) => answers[i] === q.correct_index).length;
  return { right, total: questions.length, pct: questions.length ? Math.round((right / questions.length) * 100) : 0 };
}
