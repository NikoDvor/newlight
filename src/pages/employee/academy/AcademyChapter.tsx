import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAcademy } from "@/hooks/useAcademy";
import { useAcademyBase } from "@/hooks/useAcademyBase";
import { chapterDone, completeChapter, loadChapterContent, loadChapterQuiz, XP, type Question } from "@/lib/academy";
import { toSlides, SlideBody } from "@/components/academy/ContentBlocks";
import { QuizRunner, scoreOf } from "@/components/academy/QuizRunner";
import { AcademyStyles, AudienceTag } from "@/components/academy/ui";

type Phase = "read" | "quiz" | "done";

export default function AcademyChapter() {
  const { n, c } = useParams<{ n: string; c: string }>();
  const navigate = useNavigate();
  const { data, loading, refresh, userId } = useAcademy();
  const base = useAcademyBase();
  const [content, setContent] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
  const [dir, setDir] = useState(1);
  const [phase, setPhase] = useState<Phase>("read");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [result, setResult] = useState<{ pct: number; right: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const touch = useRef<{ x: number; y: number; skip: boolean } | null>(null);

  const mod = data?.modules.find((m) => m.module_number === Number(n));
  const chapters = useMemo(() => data && mod ? data.chapters.filter((x) => x.module_id === mod.id).sort((a, b) => a.chapter_number - b.chapter_number) : [], [data, mod]);
  const ch = chapters.find((x) => x.chapter_number === Number(c));
  const nextCh = ch ? chapters.find((x) => x.chapter_number > ch.chapter_number) : undefined;
  const prevDone = data && ch ? chapterDone(data.progress, ch.id) : undefined;

  useEffect(() => {
    if (!ch) return;
    setContent(null); setSlide(0); setPhase("read"); setResult(null); setQuestions(null);
    loadChapterContent(ch.id).then(setContent);
    if (mod?.has_quiz) loadChapterQuiz(ch.id).then(setQuestions);
  }, [ch?.id, mod?.has_quiz]);

  const slides = useMemo(() => toSlides(content || ""), [content]);
  const quizLoading = !!mod?.has_quiz && questions === null;
  const hasQuiz = !!mod?.has_quiz && (questions?.length ?? 0) > 0;
  const segments = slides.length + (hasQuiz ? 1 : 0);
  const atEnd = slide >= slides.length - 1;

  const scrollTop = () => document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
  const go = (d: number) => {
    const to = slide + d;
    if (to < 0 || to > slides.length - 1) return;
    setDir(d); setSlide(to); scrollTop();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "read" || (e.target as HTMLElement)?.closest("input,textarea")) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const finish = async (score: number | null) => {
    if (!data || !mod || !ch || !userId) return;
    setSaving(true);
    try {
      await completeChapter({ userId, trackId: data.trackId, moduleId: mod.id, chapterId: ch.id, score, prevScore: prevDone?.score ?? null });
      await refresh();
    } finally { setSaving(false); }
    setPhase("done");
    scrollTop();
  };

  if (loading || !data) return <div className="py-20 text-center text-sm text-white/40">Loading…</div>;
  if (!mod || !ch) return <div className="py-20 text-center text-sm text-white/40">Chapter not found. <Link className="underline" to={base}>Back</Link></div>;

  const xpGained = XP.chapter + (result ? Math.round((result.pct / 100) * XP.quizMax) : 0);

  return (
    <div className="mx-auto max-w-2xl">
      <AcademyStyles />
      {/* Top: back + segmented progress line */}
      <div className="sticky top-0 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 pt-1 pb-3 bg-gradient-to-b from-[hsl(222,38%,5%)] via-[hsla(222,38%,5%,.92)] to-transparent">
        <div className="flex items-center justify-between gap-2">
          <Link to={`${base}/m/${mod.module_number}`} className="inline-flex min-w-0 items-center gap-1 text-[12px] text-white/55 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{String(mod.module_number).padStart(2, "0")} · {mod.module_title}</span>
          </Link>
          <AudienceTag audience={ch.audience} />
        </div>
        <div className="mt-2.5 flex gap-1">
          {Array.from({ length: segments }).map((_, i) => {
            const quizSeg = hasQuiz && i === segments - 1;
            const lit = phase === "done" || (phase === "quiz" ? true : i <= slide && !quizSeg);
            return (
              <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/10">
                <motion.div className="h-full rounded-full" initial={false}
                  animate={{ width: lit ? "100%" : "0%" }} transition={{ duration: 0.35 }}
                  style={{ background: quizSeg ? "hsl(42,100%,60%)" : "linear-gradient(90deg, hsl(211,96%,55%), hsl(197,100%,60%))", boxShadow: lit ? "0 0 8px hsla(197,100%,55%,.7)" : undefined }} />
              </div>
            );
          })}
        </div>
      </div>

      {phase === "read" && (
        <div
          onTouchStart={(e) => {
            const t = e.touches[0];
            touch.current = { x: t.clientX, y: t.clientY, skip: !!(e.target as HTMLElement).closest("[data-noswipe],input,textarea,[role=slider]") };
          }}
          onTouchEnd={(e) => {
            const s = touch.current; touch.current = null;
            if (!s || s.skip) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - s.x, dy = t.clientY - s.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
          }}
        >
          {content === null ? (
            <div className="py-16 text-center text-sm text-white/40">Loading…</div>
          ) : (
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={slide} custom={dir}
                initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="pt-2">
                {slide === 0 && <div className="mb-1 text-[11px] text-white/40 tabular-nums">Chapter {ch.chapter_number} · {ch.est_minutes || 4} min</div>}
                <SlideBody slide={slides[slide] || ""} />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}

      {phase === "quiz" && questions && (
        <div className="pt-4">
          <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-[hsl(42,100%,62%)]">// Chapter quiz</div>
          <QuizRunner questions={questions} mode="practice" onFinish={(a) => { const r = scoreOf(questions, a); setResult(r); finish(r.pct); }} />
        </div>
      )}

      {phase === "done" && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="pt-10 text-center">
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="mx-auto inline-flex items-center gap-2 rounded-lg border border-[hsla(197,100%,55%,.4)] bg-[hsla(197,100%,55%,.08)] px-4 py-2 text-[15px] font-bold text-white">
            <Sparkles className="h-4 w-4 text-[hsl(197,100%,65%)]" /> +{xpGained} XP
          </motion.div>
          <h2 className="mt-5 text-2xl font-bold text-white">Chapter complete</h2>
          {result && (
            <p className="mt-2 text-sm text-white/65">
              Quiz: <span className="font-semibold text-white">{result.right}/{result.total}</span> ({result.pct}%)
              {result.pct === 100 && " — perfect."}
            </p>
          )}
          <div className="mx-auto mt-6 h-px w-40" style={{ background: "linear-gradient(90deg, transparent, hsl(197,100%,60%), transparent)" }} />
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2">
            {nextCh ? (
              <Button onClick={() => navigate(`${base}/m/${mod.module_number}/c/${nextCh.chapter_number}`)}>Next chapter<ArrowRight className="ml-1 h-4 w-4" /></Button>
            ) : (
              <Button onClick={() => navigate(`${base}/m/${mod.module_number}`)}>Back to module</Button>
            )}
            {result && result.pct < 100 && (
              <Button variant="ghost" onClick={() => { setPhase("quiz"); loadChapterQuiz(ch.id).then(setQuestions); }}><RotateCcw className="mr-1 h-4 w-4" />Retake quiz</Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Bottom bar (thumb reach) */}
      {phase === "read" && content !== null && (
        <div className="sticky bottom-0 z-30 -mx-4 sm:mx-0 mt-8 border-t border-white/[0.06] bg-[hsla(222,40%,6%,.96)] px-4 py-3 sm:rounded-t-xl">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <Button variant="ghost" size="sm" disabled={slide === 0} onClick={() => go(-1)}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
            <span className="text-[11px] tabular-nums text-white/40">{slide + 1} / {slides.length}</span>
            {!atEnd ? (
              <Button size="sm" onClick={() => go(1)}>Next<ArrowRight className="ml-1 h-4 w-4" /></Button>
            ) : quizLoading ? (
              <Button size="sm" disabled>Loading quiz…</Button>
            ) : hasQuiz ? (
              <Button size="sm" onClick={() => { setPhase("quiz"); scrollTop(); }} className="bg-[hsl(42,100%,55%)] text-black hover:bg-[hsl(42,100%,60%)]">Take the quiz</Button>
            ) : (
              <Button size="sm" disabled={saving} onClick={() => finish(null)}><Check className="mr-1 h-4 w-4" />{prevDone ? "Done" : "Complete"}</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
