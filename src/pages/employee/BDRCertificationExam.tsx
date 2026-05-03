import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Award, CheckCircle2, Clock, Lock, RotateCcw, ShieldCheck, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const PASS_THRESHOLD = 80;
const TOTAL_Q = 50;
const L1_COUNT = 20;
const L2_COUNT = 20;
const L3_COUNT = 10;
const BDR_TRACK_KEY = "bdr";

interface ModuleInfo { id: string; module_number: number; module_title: string; }
interface QuestionRaw { id: string; module_id: string; question_text: string; options: any; correct_index: number; explanation: string | null; quiz_level: number | null; }
interface ExamQuestion { id: string; module_id: string; question_text: string; options: string[]; correct_index: number; explanation: string | null; original_correct_index: number; }
interface CertRow { id: string; attempt_number: number; score: number; passed: boolean; questions_snapshot: any; answers_snapshot: any; weak_modules: any; completed_at: string; }

type Phase = "loading" | "locked" | "intro" | "exam" | "result";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function pick<T>(arr: T[], n: number): T[] {
  const shuffled = shuffle(arr);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function BDRCertificationExam() {
  const navigate = useNavigate();
  const { user } = useWorkspace();
  const [phase, setPhase] = useState<Phase>("loading");
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [completedModuleIds, setCompletedModuleIds] = useState<Set<string>>(new Set());
  const [pastAttempts, setPastAttempts] = useState<CertRow[]>([]);
  const [latestPass, setLatestPass] = useState<CertRow | null>(null);

  // Exam state
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timer, setTimer] = useState(0);

  // Result state
  const [resultScore, setResultScore] = useState(0);
  const [resultPassed, setResultPassed] = useState(false);
  const [resultWeakModules, setResultWeakModules] = useState<{ module_title: string; correct: number; total: number }[]>([]);
  const [resultWrongQuestions, setResultWrongQuestions] = useState<{ question_text: string; user_answer: string; correct_answer: string }[]>([]);
  const [resultAttemptNum, setResultAttemptNum] = useState(1);

  const allUnlocked = useMemo(() => {
    const realModules = modules.filter(m => m.module_number >= 1 && m.module_number <= 8);
    return realModules.length >= 8 && realModules.every(m => completedModuleIds.has(m.id));
  }, [modules, completedModuleIds]);

  // Load initial data
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: track } = await supabase.from("nl_training_tracks").select("id").eq("track_key", BDR_TRACK_KEY).maybeSingle();
      if (!track) { setPhase("locked"); return; }

      const [{ data: mods }, { data: progress }, { data: certs }] = await Promise.all([
        supabase.from("nl_training_modules").select("id, module_number, module_title").eq("track_id", track.id).order("module_number"),
        supabase.from("nl_training_progress").select("module_id, status, chapter_id").eq("user_id", user.id).eq("track_id", track.id),
        (supabase as any).from("nl_certifications").select("*").eq("user_id", user.id).order("completed_at", { ascending: false }),
      ]);

      const moduleList = (mods || []) as ModuleInfo[];
      setModules(moduleList);

      // A module is complete if it has a progress row with status=completed and chapter_id IS NULL (module-level completion)
      // OR if all chapters in it are completed. For simplicity, check module-level completion rows.
      const completedIds = new Set<string>();
      const progressRows = progress || [];
      
      // Check each module: completed if there's a module-level "completed" row OR all chapter progress is completed
      for (const mod of moduleList) {
        if (mod.module_number < 1) continue;
        const moduleProgress = progressRows.filter((p: any) => p.module_id === mod.id);
        const moduleLevel = moduleProgress.find((p: any) => !p.chapter_id && p.status === "completed");
        if (moduleLevel) {
          completedIds.add(mod.id);
          continue;
        }
        // For Module 8 (reflections, no quiz) — check if all chapters have completed progress
        const chapterRows = moduleProgress.filter((p: any) => p.chapter_id && p.status === "completed");
        if (chapterRows.length > 0) {
          // Get chapter count for this module
          const { count } = await supabase.from("nl_training_chapters").select("id", { count: "exact", head: true }).eq("module_id", mod.id);
          if (count && chapterRows.length >= count) completedIds.add(mod.id);
        }
      }
      setCompletedModuleIds(completedIds);

      const certRows = (certs?.data || certs || []) as CertRow[];
      setPastAttempts(certRows);
      const pass = certRows.find(c => c.passed);
      setLatestPass(pass || null);

      const realMods = moduleList.filter(m => m.module_number >= 1 && m.module_number <= 8);
      const unlocked = realMods.length >= 8 && realMods.every(m => completedIds.has(m.id));
      setPhase(unlocked ? "intro" : "locked");
    })();
  }, [user?.id]);

  // Timer
  useEffect(() => {
    if (phase !== "exam") return;
    const iv = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [phase]);

  const startExam = useCallback(async () => {
    if (!user?.id) return;
    const { data: track } = await supabase.from("nl_training_tracks").select("id").eq("track_key", BDR_TRACK_KEY).maybeSingle();
    if (!track) return;

    const { data: allQ } = await supabase
      .from("nl_training_questions")
      .select("id, module_id, question_text, options, correct_index, explanation, quiz_level")
      .eq("question_type", "chapter_quiz");

    if (!allQ || allQ.length === 0) return;

    const moduleIds = new Set(modules.filter(m => m.module_number >= 1 && m.module_number <= 7).map(m => m.id));
    const filtered = (allQ as QuestionRaw[]).filter(q => moduleIds.has(q.module_id));

    const l1 = filtered.filter(q => (q.quiz_level || 1) === 1);
    const l2 = filtered.filter(q => (q.quiz_level || 1) === 2);
    const l3 = filtered.filter(q => (q.quiz_level || 1) === 3);

    const selected = [...pick(l1, L1_COUNT), ...pick(l2, L2_COUNT), ...pick(l3, L3_COUNT)];
    const shuffled = shuffle(selected);

    // Randomize answer order for each question
    const examQs: ExamQuestion[] = shuffled.map(q => {
      const opts = Array.isArray(q.options) ? q.options : (typeof q.options === "string" ? JSON.parse(q.options) : []);
      const indices = opts.map((_: any, i: number) => i);
      const shuffledIndices = shuffle(indices);
      return {
        id: q.id,
        module_id: q.module_id,
        question_text: q.question_text,
        options: shuffledIndices.map((i: number) => opts[i]),
        correct_index: shuffledIndices.indexOf(q.correct_index),
        original_correct_index: q.correct_index,
        explanation: q.explanation,
      };
    });

    setQuestions(examQs);
    setQIdx(0);
    setSelected(null);
    setAnswers([]);
    setTimer(0);
    setPhase("exam");
  }, [user?.id, modules]);

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
  };

  const handleNext = () => {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);

    if (qIdx < questions.length - 1) {
      setQIdx(qIdx + 1);
    } else {
      submitExam(newAnswers);
    }
  };

  const submitExam = async (finalAnswers: number[]) => {
    if (!user?.id) return;
    let correct = 0;
    const wrongQs: { question_text: string; user_answer: string; correct_answer: string }[] = [];
    const moduleScores: Record<string, { correct: number; total: number }> = {};

    questions.forEach((q, i) => {
      const modId = q.module_id;
      if (!moduleScores[modId]) moduleScores[modId] = { correct: 0, total: 0 };
      moduleScores[modId].total++;
      if (finalAnswers[i] === q.correct_index) {
        correct++;
        moduleScores[modId].correct++;
      } else {
        wrongQs.push({
          question_text: q.question_text,
          user_answer: q.options[finalAnswers[i]] || "No answer",
          correct_answer: q.options[q.correct_index],
        });
      }
    });

    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= PASS_THRESHOLD;
    const attemptNum = pastAttempts.length + 1;

    const weakMods = modules
      .filter(m => moduleScores[m.id])
      .map(m => ({
        module_id: m.id,
        module_title: m.module_title,
        correct: moduleScores[m.id].correct,
        total: moduleScores[m.id].total,
        pct: moduleScores[m.id].total > 0 ? Math.round((moduleScores[m.id].correct / moduleScores[m.id].total) * 100) : 0,
      }))
      .sort((a, b) => a.pct - b.pct);

    await (supabase as any).from("nl_certifications").insert({
      user_id: user.id,
      attempt_number: attemptNum,
      score,
      passed,
      questions_snapshot: questions.map(q => q.id),
      answers_snapshot: finalAnswers,
      weak_modules: weakMods,
      completed_at: new Date().toISOString(),
    });

    setResultScore(score);
    setResultPassed(passed);
    setResultAttemptNum(attemptNum);
    setResultWeakModules(weakMods);
    setResultWrongQuestions(wrongQs);
    if (passed) setLatestPass({ score, passed, attempt_number: attemptNum, completed_at: new Date().toISOString() } as CertRow);
    setPhase("result");
  };

  const current = questions[qIdx];

  // ─── LOCKED STATE ───
  if (phase === "locked") {
    const realMods = modules.filter(m => m.module_number >= 1 && m.module_number <= 8);
    const doneCount = realMods.filter(m => completedModuleIds.has(m.id)).length;
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/employee/training")} className="gap-2 mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Training
        </Button>
        <div className="rounded-2xl p-8 text-center" style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}>
          <Lock className="mx-auto h-12 w-12 text-white/30 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">BDR Certification Exam</h1>
          <p className="text-sm text-white/50 mb-6">Complete all 8 training modules to unlock the certification exam.</p>
          <div className="text-left max-w-sm mx-auto space-y-2">
            <div className="flex justify-between text-sm text-white/60 mb-2">
              <span>Progress</span>
              <span>{doneCount} of 8 modules</span>
            </div>
            <Progress value={(doneCount / 8) * 100} className="h-2" />
            <div className="mt-4 space-y-1.5">
              {realMods.map(m => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  {completedModuleIds.has(m.id)
                    ? <CheckCircle2 className="h-4 w-4 text-[hsl(142,72%,42%)]" />
                    : <Lock className="h-4 w-4 text-white/25" />}
                  <span className={completedModuleIds.has(m.id) ? "text-white/70" : "text-white/40"}>
                    Module {m.module_number}: {m.module_title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── LOADING ───
  if (phase === "loading") {
    return <div className="max-w-2xl mx-auto py-20 text-center text-white/40 text-sm">Loading…</div>;
  }

  // ─── INTRO ───
  if (phase === "intro") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/employee/training")} className="gap-2 mb-2">
          <ArrowLeft className="h-4 w-4" /> Back to Training
        </Button>
        <div className="rounded-2xl p-8" style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}>
          <div className="text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "hsla(211,96%,60%,.15)" }}>
              <Award className="h-8 w-8" style={{ color: "hsl(211,96%,56%)" }} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">BDR Certification Exam</h1>
            <p className="text-sm text-white/50 mb-6">50 questions · {PASS_THRESHOLD}% to pass · Unlimited attempts</p>
          </div>

          <div className="rounded-xl p-4 mb-6 space-y-2 text-sm text-white/60" style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" }}>
            <p>◆ 50 randomized questions from all training modules</p>
            <p>◆ One question at a time — no going back</p>
            <p>◆ Each attempt generates a unique exam</p>
            <p>◆ No time limit — timer tracks duration only</p>
          </div>

          {pastAttempts.length > 0 && (
            <div className="rounded-xl p-4 mb-6 space-y-1.5 text-sm" style={{ background: "hsla(211,96%,60%,.04)", border: "1px solid hsla(211,96%,60%,.08)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Previous Attempts</p>
              {pastAttempts.slice(0, 5).map((a, i) => (
                <div key={i} className="flex justify-between text-white/60">
                  <span>Attempt {a.attempt_number}</span>
                  <span className={a.passed ? "text-[hsl(142,72%,42%)]" : "text-white/40"}>{a.score}% — {a.passed ? "Passed" : "Not passed"}</span>
                </div>
              ))}
            </div>
          )}

          {latestPass && (
            <div className="rounded-xl p-4 mb-6 text-center" style={{ background: "hsla(142,72%,42%,.08)", border: "1px solid hsla(142,72%,42%,.2)" }}>
              <ShieldCheck className="mx-auto h-6 w-6 text-[hsl(142,72%,42%)] mb-2" />
              <p className="text-sm font-semibold text-[hsl(142,72%,42%)]">BDR Certified</p>
              <p className="text-xs text-white/40 mt-1">Passed on attempt {latestPass.attempt_number} · {new Date(latestPass.completed_at).toLocaleDateString()}</p>
            </div>
          )}

          <Button onClick={startExam} className="w-full gap-2">
            {pastAttempts.length > 0 ? "Retake Exam" : "Start Exam"}
            <Award className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── EXAM ───
  if (phase === "exam" && current) {
    const progress = ((qIdx + (selected !== null ? 0.5 : 0)) / questions.length) * 100;
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
            Question {qIdx + 1} of {questions.length}
          </span>
          <div className="flex items-center gap-1.5 text-white/40">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs font-mono font-semibold">{formatTime(timer)}</span>
          </div>
        </div>

        <Progress value={progress} className="h-1.5" />

        <AnimatePresence mode="wait">
          <motion.div
            key={qIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl p-6"
            style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}
          >
            <h2 className="text-lg font-semibold text-white mb-6 leading-snug">{current.question_text}</h2>
            <div className="space-y-3">
              {current.options.map((opt: string, i: number) => {
                const isSelected = selected === i;
                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(i)}
                    disabled={selected !== null}
                    className="w-full text-left rounded-xl p-4 transition-all duration-200 flex items-center gap-3"
                    style={{
                      background: isSelected ? "hsla(211,96%,56%,.12)" : "hsla(211,96%,60%,.04)",
                      border: isSelected ? "1px solid hsl(211,96%,56%)" : "1px solid hsla(211,96%,60%,.1)",
                    }}
                  >
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{
                        background: isSelected ? "hsl(211,96%,56%)" : "hsla(211,96%,60%,.1)",
                        color: isSelected ? "#fff" : "hsla(211,96%,80%,.6)",
                      }}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-sm text-white/85 flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>

            {selected !== null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 flex justify-end">
                <Button onClick={handleNext} className="gap-2">
                  {qIdx < questions.length - 1 ? "Next Question" : "Submit Exam"}
                  {qIdx >= questions.length - 1 && <Award className="h-4 w-4" />}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ─── RESULT ───
  if (phase === "result") {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl p-8 text-center"
          style={{
            background: "hsla(215,35%,10%,.8)",
            border: resultPassed ? "1px solid hsla(142,72%,42%,.3)" : "1px solid hsla(211,96%,60%,.12)",
            boxShadow: resultPassed ? "0 0 60px hsla(142,72%,42%,.1)" : undefined,
          }}
        >
          <div className="mx-auto h-20 w-20 rounded-2xl flex items-center justify-center mb-4" style={{ background: resultPassed ? "hsla(142,72%,42%,.15)" : "hsla(211,96%,60%,.1)" }}>
            {resultPassed ? <Trophy className="h-10 w-10 text-[hsl(142,72%,42%)]" /> : <Award className="h-10 w-10 text-white/30" />}
          </div>

          <div className="text-5xl font-bold mb-2" style={{ color: resultPassed ? "hsl(142,72%,42%)" : "white" }}>
            {resultScore}%
          </div>

          {resultPassed ? (
            <>
              <h2 className="text-xl font-bold mb-1" style={{ color: "hsl(211,96%,56%)" }}>BDR CERTIFIED</h2>
              <p className="text-sm text-white/50">Certified on {new Date().toLocaleDateString()} · Attempt {resultAttemptNum}</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white/70 mb-1">Not Yet Certified</h2>
              <p className="text-sm text-white/40">You need {PASS_THRESHOLD}% to pass. You're getting closer — review the weak areas below and try again.</p>
            </>
          )}

          <p className="text-xs text-white/30 mt-2">Time: {formatTime(timer)}</p>
        </motion.div>

        {/* Module Breakdown */}
        <div className="rounded-2xl p-6" style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4">Performance by Module</h3>
          <div className="space-y-3">
            {resultWeakModules.map((m, i) => {
              const pct = m.total > 0 ? Math.round((m.correct / m.total) * 100) : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-white/70">{m.module_title}</span>
                    <span className={pct >= PASS_THRESHOLD ? "text-[hsl(142,72%,42%)]" : "text-white/40"}>{m.correct}/{m.total} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsla(211,96%,60%,.08)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: pct >= PASS_THRESHOLD ? "hsl(142,72%,42%)" : "hsl(211,96%,56%)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wrong Answers */}
        {resultWrongQuestions.length > 0 && (
          <div className="rounded-2xl p-6" style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4">
              Questions to Review ({resultWrongQuestions.length})
            </h3>
            <div className="space-y-4">
              {resultWrongQuestions.map((q, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: "hsla(211,96%,60%,.03)", border: "1px solid hsla(211,96%,60%,.06)" }}>
                  <p className="text-sm text-white/80 mb-2">{q.question_text}</p>
                  <div className="space-y-1 text-xs">
                    <p className="text-white/35">Your answer: <span className="text-white/50">{q.user_answer}</span></p>
                    <p className="text-[hsl(142,72%,42%)]/70">Correct: <span className="text-[hsl(142,72%,42%)]">{q.correct_answer}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => { setPhase("intro"); }} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Retake Exam
          </Button>
          {resultPassed && (
            <Button onClick={() => navigate("/employee/profile")} className="gap-2">
              <ShieldCheck className="h-4 w-4" /> View My Certification
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate("/employee/training")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Training
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
