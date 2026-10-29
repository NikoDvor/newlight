import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, RotateCcw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { loadFinalExam, recordActivityDay, PASS_PCT, FINAL_QUESTION_COUNT, type AcademyData, type Question } from "@/lib/academy";
import { QuizRunner, scoreOf } from "./QuizRunner";
import { GlowBar, Kicker } from "./ui";

/**
 * Module 10 — Final Certification.
 * Random questions from the chapter quizzes of the quiz modules (5, 7, 8). Pass at 80%.
 * Unlimited retakes. Every attempt is saved to nl_certifications.
 */
export default function FinalExam({ data, onDone }: { data: AcademyData; onDone?: () => void }) {
  const { user } = useWorkspace();
  const [phase, setPhase] = useState<"intro" | "loading" | "exam" | "result">("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [result, setResult] = useState<{ pct: number; right: number; total: number; passed: boolean; weak: string[] } | null>(null);
  const passedBefore = data.certs.find((c) => c.passed);
  const best = data.certs.reduce((m, c) => Math.max(m, Number(c.score) || 0), 0);
  const quizMods = data.modules.filter((m) => m.has_quiz);

  const start = async () => {
    setPhase("loading");
    const qs = await loadFinalExam(quizMods.map((m) => m.id));
    setQuestions(qs);
    setPhase(qs.length ? "exam" : "intro");
  };

  const submit = async (answers: (number | null)[]) => {
    const r = scoreOf(questions, answers);
    const passed = r.pct >= PASS_PCT;
    // modules where the salesman missed more than a third
    const weak = quizMods.filter((m) => {
      const idx = questions.map((q, i) => (q.module_id === m.id ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) return false;
      const miss = idx.filter((i) => answers[i] !== questions[i].correct_index).length;
      return miss / idx.length > 1 / 3;
    }).map((m) => `${m.module_number} · ${m.module_title}`);
    setResult({ ...r, passed, weak });
    setPhase("result");
    if (user?.id) {
      await (supabase as any).from("nl_certifications").insert({
        user_id: user.id,
        attempt_number: data.certs.length + 1,
        score: r.pct,
        passed,
        questions_snapshot: questions.map((q) => ({ id: q.id, module_id: q.module_id, q: q.question_text, options: q.options, correct: q.correct_index })),
        answers_snapshot: answers,
        weak_modules: weak,
        completed_at: new Date().toISOString(),
      });
      await recordActivityDay(user.id);
      onDone?.();
    }
  };

  if (phase === "exam") return <QuizRunner questions={questions} mode="exam" onFinish={submit} />;

  if (phase === "result" && result) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
        <div className="text-[56px] font-bold leading-none tabular-nums" style={{ color: result.passed ? "hsl(152,70%,58%)" : "white", textShadow: result.passed ? "0 0 30px hsla(152,70%,50%,.5)" : undefined }}>{result.pct}%</div>
        <div className="mt-1 text-[12px] text-white/50">{result.right} of {result.total} · pass mark {PASS_PCT}%</div>
        {result.passed ? (
          <>
            <h3 className="mt-5 text-2xl font-bold text-white">You're certified.</h3>
            <div className="mx-auto mt-4 max-w-md rounded-xl border border-[hsla(197,100%,55%,.4)] bg-[hsla(197,100%,55%,.08)] p-4 text-left">
              <div className="flex gap-3">
                <Video className="h-5 w-5 shrink-0 text-[hsl(197,100%,65%)]" />
                <p className="text-[14px] leading-relaxed text-white">You'll now meet with your team leader over Zoom for the final step.</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <h3 className="mt-5 text-xl font-bold text-white">Not yet — you need {PASS_PCT}%.</h3>
            {result.weak.length > 0 && (
              <div className="mx-auto mt-3 max-w-md text-left">
                <div className="text-[11px] uppercase tracking-wider text-white/45">Review these first</div>
                {result.weak.map((w) => <div key={w} className="mt-1 border-l-2 border-[hsl(42,100%,60%)] pl-2 text-[13px] text-white/80">Module {w}</div>)}
              </div>
            )}
            <Button className="mt-5" onClick={start}><RotateCcw className="mr-1 h-4 w-4" />Retake now</Button>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <div>
      <Kicker>Final certification</Kicker>
      <div className="mt-3 flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 shrink-0" style={{ color: passedBefore ? "hsl(152,70%,55%)" : "hsl(197,100%,60%)" }} />
        <div>
          <div className="text-[17px] font-semibold text-white">{passedBefore ? "Certified" : "Ready when you are"}</div>
          <div className="text-[12px] text-white/55">{FINAL_QUESTION_COUNT} questions from the Module {quizMods.map((m) => m.module_number).join(", ")} quizzes · pass with {PASS_PCT}% · retake anytime</div>
        </div>
      </div>
      {data.certs.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-white/50 mb-1"><span>Best score</span><span className="tabular-nums">{best}% · {data.certs.length} attempt{data.certs.length === 1 ? "" : "s"}</span></div>
          <GlowBar pct={best} height={5} />
        </div>
      )}
      {passedBefore && (
        <p className="mt-4 text-[13px] text-white/75">You passed on {new Date(passedBefore.completed_at).toLocaleDateString()}. You'll meet with your team leader over Zoom for the final step.</p>
      )}
      <Button className="mt-5 w-full sm:w-auto" disabled={phase === "loading"} onClick={start}>
        {phase === "loading" ? "Building your test…" : passedBefore ? "Take it again" : data.certs.length ? "Retake the test" : "Start the test"}
      </Button>
    </div>
  );
}
