import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, ArrowLeft, CheckCircle2, Clock, Download, Lock, ShieldCheck, Star, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

type Phase = "intro" | "exam" | "pass" | "fail";

interface ModuleRow {
  id: string;
  module_number: number;
  module_title: string;
}

interface QuestionRow {
  id: string;
  module_id: string;
  created_at: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

interface CertificationRow {
  id: string;
  certificate_number: string | null;
  issued_at: string;
  rep_name: string | null;
  score: number;
  total_questions: number | null;
}

interface AttemptRow {
  attempted_at: string;
  passed: boolean;
  score: number;
  total_questions: number;
  module_scores: unknown;
}

interface StoredAttemptRow extends AttemptRow {
  id: string;
}

const PASSING_SCORE = 24;
const TOTAL_QUESTIONS = 30;
const RETAKE_HOURS = 48;

function parseOptions(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatDuration(ms: number) {
  if (ms <= 0) return "Available now";
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[char] || char));
}

export default function AdminBDRCertification() {
  const navigate = useNavigate();
  const { user } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [certification, setCertification] = useState<CertificationRow | null>(null);
  const [latestAttempt, setLatestAttempt] = useState<AttemptRow | null>(null);
  const [allModulesComplete, setAllModulesComplete] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [score, setScore] = useState(0);
  const [reviewModules, setReviewModules] = useState<ModuleRow[]>([]);
  const [now, setNow] = useState(() => Date.now());

  const repName =
    certification?.rep_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "NewLight Rep";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);

      const { data: track, error: trackError } = await supabase
        .from("nl_training_tracks")
        .select("id")
        .eq("track_key", "bdr")
        .maybeSingle();

      if (trackError) {
        toast({ title: "Certification track failed to load", description: trackError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (!track?.id) {
        setLoading(false);
        return;
      }

      setTrackId(track.id);

      const { data: moduleData, error: moduleError } = await supabase
        .from("nl_training_modules")
        .select("id, module_number, module_title")
        .eq("track_id", track.id)
        .order("module_number");

      if (moduleError) {
        toast({ title: "Training modules failed to load", description: moduleError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      const moduleRows = (moduleData || []) as ModuleRow[];
      setModules(moduleRows);

      const { data: progressData } = await supabase
        .from("nl_training_progress")
        .select("module_id, chapter_id, status")
        .eq("user_id", user.id)
        .eq("track_id", track.id)
        .is("chapter_id", null);

      const completed = moduleRows.length >= 10 && moduleRows.every((m) =>
        (progressData || []).some((p) => p.module_id === m.id && p.status === "completed")
      );
      setAllModulesComplete(completed);

      const { data: certData } = await supabase
        .from("nl_training_certifications")
        .select("id, certificate_number, issued_at, rep_name, score, total_questions")
        .eq("user_id", user.id)
        .eq("track_key", "bdr")
        .eq("passed", true)
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (certData) {
        setCertification(certData as CertificationRow);
        setScore(certData.score);
        setPhase("pass");
      }

      const { data: attemptData } = await supabase
        .from("nl_training_exam_attempts")
        .select("attempted_at, passed, score, total_questions, module_scores")
        .eq("user_id", user.id)
        .eq("track_id", track.id)
        .order("attempted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setLatestAttempt((attemptData as AttemptRow | null) || null);

      const { data: questionData, error: questionError } = await supabase
        .from("nl_training_questions")
        .select("id, module_id, question_text, options, correct_index, explanation, created_at")
        .in("module_id", moduleRows.map((m) => m.id))
        .eq("question_type", "certification")
        .order("created_at");

      if (questionError) {
        toast({ title: "Certification questions failed to load", description: questionError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      const orderedQuestions = ((questionData || []) as any[])
        .map((q) => ({ ...q, options: parseOptions(q.options) }))
        .sort((a, b) => {
          const modA = moduleRows.find((m) => m.id === a.module_id)?.module_number || 0;
          const modB = moduleRows.find((m) => m.id === b.module_id)?.module_number || 0;
          if (modA !== modB) return modA - modB;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }) as QuestionRow[];
      setQuestions(orderedQuestions.slice(0, TOTAL_QUESTIONS));
      if (orderedQuestions.length !== TOTAL_QUESTIONS) {
        toast({
          title: "Certification exam is incomplete",
          description: `Expected 30 questions, found ${orderedQuestions.length}.`,
          variant: "destructive",
        });
      }
      setLoading(false);
    };

    load();
  }, [user?.id]);

  const retakeAt = useMemo(() => {
    if (!latestAttempt || latestAttempt.passed) return null;
    return new Date(new Date(latestAttempt.attempted_at).getTime() + RETAKE_HOURS * 60 * 60 * 1000);
  }, [latestAttempt]);

  const retakeLocked = !!retakeAt && retakeAt.getTime() > now && !certification;
  const current = questions[currentIndex];
  const currentModule = current ? modules.find((m) => m.id === current.module_id) : null;
  const progressValue = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const scorePct = Math.round((score / TOTAL_QUESTIONS) * 100);
  const certificateNumber = certification?.certificate_number || (certification?.id ? `BDR-${certification.id.slice(0, 8).toUpperCase()}` : "Pending");

  const beginExam = () => {
    setAnswers({});
    setCurrentIndex(0);
    setSelected(null);
    setScore(0);
    setReviewModules([]);
    setPhase("exam");
  };

  const finishExam = async (finalAnswers: Record<string, number>) => {
    if (!user?.id || !trackId) return;
    let correct = 0;
    const wrongModuleIds = new Set<string>();

    questions.forEach((q) => {
      if (finalAnswers[q.id] === q.correct_index) {
        correct += 1;
      } else {
        wrongModuleIds.add(q.module_id);
      }
    });

    const passed = correct >= PASSING_SCORE;
    const moduleScores = modules.map((m) => {
      const moduleQuestions = questions.filter((q) => q.module_id === m.id);
      const moduleCorrect = moduleQuestions.filter((q) => finalAnswers[q.id] === q.correct_index).length;
      return {
        module_id: m.id,
        module_number: m.module_number,
        module_title: m.module_title,
        correct: moduleCorrect,
        total: moduleQuestions.length,
        missed: moduleQuestions.length - moduleCorrect,
      };
    });

    setScore(correct);
    setReviewModules(modules.filter((m) => wrongModuleIds.has(m.id)));

    const { data: attempt, error: attemptError } = await supabase
      .from("nl_training_exam_attempts")
      .insert({
        user_id: user.id,
        track_id: trackId,
        score: correct,
        total_questions: TOTAL_QUESTIONS,
        passed,
        module_scores: moduleScores as any,
      })
      .select("id, attempted_at, passed, score, total_questions, module_scores")
      .maybeSingle();

    if (attemptError || !attempt) {
      toast({
        title: "Exam attempt was not saved",
        description: attemptError?.message || "Please try submitting the exam again.",
        variant: "destructive",
      });
      return;
    }

    setLatestAttempt(attempt as StoredAttemptRow);

    if (passed) {
      const { data: existing } = await supabase
        .from("nl_training_certifications")
        .select("id, certificate_number, issued_at, rep_name, score, total_questions")
        .eq("user_id", user.id)
        .eq("track_key", "bdr")
        .eq("passed", true)
        .order("issued_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setCertification(existing as CertificationRow);
      } else {
        const { data: cert, error } = await supabase
          .from("nl_training_certifications")
          .insert({
            user_id: user.id,
            track_id: trackId,
            track_key: "bdr",
            score: correct,
            total_questions: TOTAL_QUESTIONS,
            passed: true,
            issued_at: new Date().toISOString(),
            rep_name: repName,
          })
          .select("id, certificate_number, issued_at, rep_name, score, total_questions")
          .maybeSingle();

        if (error || !cert) {
          toast({
            title: "Certification save failed",
            description: error?.message || "The exam attempt was saved, but the certificate was not issued.",
            variant: "destructive",
          });
          return;
        } else {
          const generatedNumber = cert.certificate_number || `BDR-${cert.id.slice(0, 8).toUpperCase()}`;
          if (!cert.certificate_number) {
            await supabase
              .from("nl_training_certifications")
              .update({ certificate_number: generatedNumber })
              .eq("id", cert.id);
          }
          setCertification({ ...(cert as CertificationRow), certificate_number: generatedNumber });
        }
      }
      setPhase("pass");
    } else {
      setPhase("fail");
    }
  };

  const nextQuestion = () => {
    if (!current || selected === null) return;
    const nextAnswers = { ...answers, [current.id]: selected };
    setAnswers(nextAnswers);
    setSelected(null);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((idx) => idx + 1);
    } else {
      finishExam(nextAnswers);
    }
  };

  const downloadCertificate = () => {
    const issued = certification?.issued_at ? formatDate(certification.issued_at) : formatDate(new Date());
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${certificateNumber}</title>
          <style>
            body { margin:0; min-height:100vh; display:grid; place-items:center; background:#07101f; font-family: Inter, Arial, sans-serif; color:#eef6ff; }
            .card { width:760px; min-height:460px; border:1px solid rgba(255,199,87,.55); border-radius:28px; padding:54px; background:linear-gradient(145deg,#0b1629,#07101f); box-shadow:0 30px 80px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.04); text-align:center; }
            .seal { color:#ffc857; font-size:58px; margin-bottom:18px; }
            .eyebrow { color:#74d9ff; font-size:13px; letter-spacing:.22em; text-transform:uppercase; font-weight:700; }
            h1 { margin:18px 0 8px; font-size:46px; letter-spacing:-.02em; }
            h2 { margin:0 0 28px; color:#ffc857; font-size:24px; }
            .name { font-size:32px; font-weight:800; margin:30px 0 10px; }
            .meta { margin-top:34px; display:flex; justify-content:space-between; gap:24px; color:#b8c6dc; font-size:14px; text-align:left; }
            .meta strong { display:block; color:#eef6ff; font-size:16px; margin-top:5px; }
            @media print { body { background:white; } .card { box-shadow:none; } }
          </style>
        </head>
        <body>
          <main class="card">
            <div class="seal">★</div>
            <div class="eyebrow">NewLight Marketing</div>
            <h1>BDR Certified</h1>
            <h2>Business Development Representative</h2>
            <p>This certifies that</p>
            <div class="name">${repName}</div>
            <p>has completed the BDR Training Track and passed the certification exam.</p>
            <div class="meta">
              <div>Date Issued<strong>${issued}</strong></div>
              <div>Score<strong>${score}/${TOTAL_QUESTIONS} — ${scorePct}%</strong></div>
              <div>Certificate<strong>${certificateNumber}</strong></div>
            </div>
          </main>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (!allModulesComplete && !certification) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/training-center/bdr")} className="gap-2 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Return to Training Center
        </Button>
        <div className="card-widget text-center py-14">
          <div className="h-14 w-14 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-5">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Certification Locked</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Complete all 10 BDR modules to unlock your certification exam.
          </p>
        </div>
      </div>
    );
  }

  if (phase === "exam" && current) {
    return (
      <div className="fixed inset-0 z-50 nl-dark-bg overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-5 sm:py-8 min-h-screen flex flex-col">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4 mb-3">
              <Badge variant="secondary" className="font-medium">Question {currentIndex + 1} of {questions.length}</Badge>
              {currentModule && (
                <Badge variant="outline" className="font-medium">
                  Module {currentModule.module_number} — {currentModule.module_title}
                </Badge>
              )}
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>

          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="card-widget flex-1 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-5">
              <ShieldCheck className="h-5 w-5 text-[hsl(var(--nl-neon))]" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Certification Exam</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold leading-tight text-foreground mb-8">
              {current.question_text}
            </h1>
            <div className="grid gap-3 mb-8">
              {current.options.map((option, index) => {
                const isSelected = selected === index;
                return (
                  <button
                    key={option}
                    onClick={() => setSelected(index)}
                    className={`w-full text-left rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-[0_0_24px_-10px_hsl(var(--primary))]"
                        : "border-border/50 bg-secondary/30 hover:bg-secondary/60 hover:border-primary/30"
                    }`}
                  >
                    <span className="text-sm sm:text-base font-medium text-foreground/90">{option}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-auto flex justify-end">
              <Button onClick={nextQuestion} disabled={selected === null} className="gap-2 min-w-40">
                {currentIndex === questions.length - 1 ? "Submit Exam" : "Next Question"}
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (phase === "pass" && certification) {
    const issued = formatDate(certification.issued_at);
    return (
      <div className="max-w-4xl mx-auto py-4 sm:py-8">
        <div className="card-widget text-center overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(ellipse_at_top,hsl(var(--nl-gold)/.24),transparent_70%)] pointer-events-none" />
          <div className="relative">
            <div className="mx-auto h-20 w-20 rounded-3xl flex items-center justify-center mb-5 border border-[hsl(var(--nl-gold)/.35)] bg-[hsl(var(--nl-gold)/.12)] shadow-[0_0_42px_-12px_hsl(var(--nl-gold))]">
              <Trophy className="h-10 w-10 text-[hsl(var(--nl-gold))]" />
            </div>
            <Badge className="mb-4 bg-[hsl(var(--nl-gold)/.16)] text-[hsl(var(--nl-gold))] border border-[hsl(var(--nl-gold)/.28)] hover:bg-[hsl(var(--nl-gold)/.16)]">
              <Star className="h-3.5 w-3.5 mr-1" />
              BDR Certified ✓
            </Badge>
            <h1 className="text-4xl font-bold text-foreground">BDR Certified</h1>
            <p className="text-lg text-[hsl(var(--nl-gold))] font-semibold mt-1">NewLight Marketing</p>
            <p className="text-2xl font-semibold text-foreground mt-8">{repName}</p>
            <p className="text-sm text-muted-foreground mt-3">You scored {score}/30 — {scorePct}%</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto mt-8 text-left">
              <div className="rounded-2xl bg-secondary/40 border border-border/40 p-4">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Date issued</p>
                <p className="text-sm font-semibold text-foreground mt-1">{issued}</p>
              </div>
              <div className="rounded-2xl bg-secondary/40 border border-border/40 p-4">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Score</p>
                <p className="text-sm font-semibold text-foreground mt-1">{score}/{TOTAL_QUESTIONS}</p>
              </div>
              <div className="rounded-2xl bg-secondary/40 border border-border/40 p-4">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Certificate</p>
                <p className="text-sm font-semibold text-foreground mt-1">{certificateNumber}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
              <Button onClick={downloadCertificate} className="gap-2">
                <Download className="h-4 w-4" />
                Download Certificate
              </Button>
              <Button variant="outline" onClick={() => navigate("/admin/training-center/bdr")} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Return to Training Center
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "fail") {
    const available = retakeAt || new Date(Date.now() + RETAKE_HOURS * 60 * 60 * 1000);
    return (
      <div className="max-w-4xl mx-auto py-4 sm:py-8 space-y-5">
        <div className="card-widget text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center mb-5">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-semibold text-foreground">Not Quite — Keep Going</h1>
          <p className="text-sm text-muted-foreground mt-3">You scored {score}/30 — {scorePct}%</p>
          <p className="text-sm text-muted-foreground mt-2">Retake available in 48 hours: {formatDateTime(available)}</p>
        </div>

        <div className="card-widget">
          <h2 className="section-title mb-4">Areas to Review</h2>
          <div className="space-y-2">
            {reviewModules.map((m) => (
              <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border/40 bg-secondary/25 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Module {m.module_number} — {m.module_title}</p>
                  <p className="text-xs text-muted-foreground mt-1">Review the module concepts before your next attempt.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/training-center/bdr`)}>
                  Review Module
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="outline" onClick={() => navigate("/admin/training-center/bdr")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Return to Training Center
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/training-center/bdr")} className="gap-2 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Return to Training Center
      </Button>
      <div className="card-widget text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
          <Award className="h-8 w-8 text-[hsl(var(--nl-neon))]" />
        </div>
        <h1 className="text-4xl font-bold text-foreground">BDR Certification Exam</h1>
        <p className="text-lg text-[hsl(var(--nl-neon))] font-semibold mt-1">NewLight Marketing</p>
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          <Badge variant="secondary">30 Questions</Badge>
          <Badge variant="secondary">80% to Pass</Badge>
          <Badge variant="secondary">48hr Retake on Fail</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-6 max-w-xl mx-auto leading-relaxed">
          This exam covers all 10 modules of the BDR Training Track. You must score 24 out of 30 or higher to earn your BDR Certification.
        </p>
        <div className="mt-8">
          {retakeLocked && retakeAt ? (
            <div className="rounded-2xl border border-border/40 bg-secondary/30 p-5 max-w-md mx-auto">
              <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Retake available in {formatDuration(retakeAt.getTime() - now)}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatDateTime(retakeAt)}</p>
            </div>
          ) : (
            <Button size="lg" onClick={beginExam} disabled={questions.length < TOTAL_QUESTIONS} className="gap-2 px-10">
              Begin Exam
              <ShieldCheck className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
