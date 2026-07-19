import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, CheckCircle2, XCircle, Trophy, Clock, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { ScriptDrillExercise, ScriptDrillLine } from "@/components/training/ScriptDrillExercise";
import { TrainingContentRenderer } from "@/components/training/TrainingContentRenderer";
import { PracticeRecordingVault } from "@/components/training/PracticeRecordingVault";
import { ObjectionFlashcards, FlashcardData } from "@/components/training/ObjectionFlashcards";
import { ReflectionVault, ReflectionField } from "@/components/training/ReflectionVault";
import { ObjectionMasteryTrack } from "@/components/training/ObjectionMasteryTrack";
import { useModuleCompletion } from "@/hooks/useModuleCompletion";
import { shuffleQuestion } from "@/lib/quizShuffle";

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

interface ModuleLockCheckState {
  checked: boolean;
  locked: boolean;
  moduleNumber: number | null;
  previousModuleComplete: boolean;
  userId: string | null;
}

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

// CHAPTER_FLASHCARDS previously injected hardcoded flashcards keyed by
// "<moduleNumber>.<chapterNumber>". The Salesmen curriculum was restructured
// (Module 5 = Script Mastery, Module 6 = Objection Handling, Module 7 =
// Meeting Cadences), which desynced every entry — most visibly Module 6
// chapter 3 ("Objection — Not Interested") was rendering Assignment Close
// (a closing technique) cards from the old Module 6 = Closing curriculum.
//
// All objection-handling flashcards now come exclusively from the properly
// scoped DB unlock system (nl_training_questions where is_unlock_question =
// true, keyed to a specific objection_category). Cross-module content
// (closing techniques, discovery, ads/SEO) must NEVER be injected into
// objection-handling chapters. Do not repopulate this map with content that
// spans multiple curricular topics — if per-chapter static cards are needed
// again, they must be strictly scoped to the specific chapter's subject.
const CHAPTER_FLASHCARDS: Record<string, FlashcardData[]> = {};

const REFLECTION_FIELDS: Record<string, ReflectionField[]> = {
  "8.1": [
    { field_key: "real_reason", label: "I am here because...", placeholder: "Write your real reason. Go deeper than the surface answer. Take your time.", rows: 8 },
    { field_key: "what_changes", label: "What changes when I succeed at this?", placeholder: "Be specific. What looks different in your life?", rows: 6 },
    { field_key: "who_is_watching", label: "Who am I doing this for — including myself?", placeholder: "Name them. Say why.", rows: 5 },
  ],
  "8.2": [
    { field_key: "goal_1_month", label: "1 Month Goal — What I will achieve by then:", placeholder: "Be specific. Income, bookings, skills, habits. Put a number on it.", rows: 5 },
    { field_key: "goal_3_month", label: "3 Month Goal — What I will achieve by then:", placeholder: "What does three months of consistent execution produce?", rows: 5 },
    { field_key: "goal_6_month", label: "6 Month Goal — What I will achieve by then:", placeholder: "Half a year from now — where are you?", rows: 5 },
    { field_key: "goal_12_month", label: "12 Month Goal — What I will achieve by then:", placeholder: "One year. Full commitment. What does that produce?", rows: 5 },
    { field_key: "goal_why", label: "Why these goals and not smaller ones?", placeholder: "What made you choose these numbers?", rows: 4 },
  ],
  "8.3": [
    { field_key: "where_you_live", label: "Where I live and what it feels like:", placeholder: "Describe your home, your city, your environment.", rows: 5 },
    { field_key: "daily_life", label: "What a normal day looks like:", placeholder: "Walk through the day. Morning to night. What does it feel like?", rows: 6 },
    { field_key: "people_around", label: "Who is around me and what have I built for them:", placeholder: "Family, friends, the people who matter. What does your success mean for them?", rows: 5 },
    { field_key: "what_you_have", label: "What I have built and what I am able to do:", placeholder: "Financial freedom, experiences, opportunities, things you own, things you can give.", rows: 5 },
    { field_key: "feeling", label: "How it feels to be living this life:", placeholder: "One word or one sentence. What is the feeling underneath all of it?", rows: 3 },
  ],
  "8.4": [
    { field_key: "who_they_are", label: "The person I am becoming — how they think and how they show up:", placeholder: "Describe them. How do they handle rejection? How do they start their day? How do they respond when things go wrong?", rows: 7 },
    { field_key: "their_habits", label: "The habits and standards that person runs on:", placeholder: "What do they do consistently that most people do not?", rows: 5 },
    { field_key: "the_gap", label: "The gap between who I am today and who I am becoming:", placeholder: "Be honest. What is the distance? What needs to change?", rows: 5 },
    { field_key: "one_thing", label: "The one thing I am committing to change starting now:", placeholder: "One specific behavior, habit, or decision. Not a list — one thing.", rows: 3 },
  ],
  "8.5": [
    { field_key: "what_i_will", label: "What I will do — no matter what:", placeholder: "The non-negotiables. The things that happen regardless of how you feel.", rows: 6 },
    { field_key: "what_i_will_not", label: "What I will not accept from myself:", placeholder: "The behaviors, excuses, and patterns you are done with.", rows: 6 },
    { field_key: "my_standard", label: "My standard — written as a statement:", placeholder: "Write it in one paragraph. This is who you are.", rows: 5 },
  ],
  "8.6": [
    { field_key: "hard_day_letter", label: "What I will tell myself when I want to give up:", placeholder: "Write it to yourself. Be real. Be direct. Say what you will need to hear on the worst day.", rows: 10 },
    { field_key: "what_quitting_costs", label: "What quitting actually costs me:", placeholder: "Not abstract. Specific. What do you lose if you stop?", rows: 5 },
    { field_key: "what_i_choose", label: "What I choose — written as a statement:", placeholder: "One clear sentence. What do you choose when it gets hard?", rows: 3 },
  ],
  "8.7": [
    { field_key: "quote", label: "My quote:", placeholder: "The words you come back to. Write them exactly.", rows: 3 },
    { field_key: "quote_why", label: "Why this quote:", placeholder: "What does it mean to you specifically?", rows: 4 },
    { field_key: "anchor", label: "My anchor — the one thing I always come back to:", placeholder: "One image, one person, one feeling, one memory. Describe it.", rows: 5 },
    { field_key: "final_statement", label: "My final statement — who I am and what I am building:", placeholder: "One paragraph. This is your declaration. Write it like you mean it.", rows: 6 },
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
  modules?: { id: string; module_number: number }[];
  onClose: () => void;
  onCompleted: () => void;
  onModuleComplete?: () => void;
}

const LEVEL_LABELS: Record<QuizLevel, string> = {
  1: "Foundation",
  2: "Application",
  3: "Mastery",
};

export function ChapterRunner({
  mode,
  chapter,
  moduleId,
  trackId,
  passScore = 80,
  lockedPreview = false,
  unlockModuleNumber,
  modules: modulesList,
  onClose,
  onCompleted,
  onModuleComplete,
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
  const [unlockCategories, setUnlockCategories] = useState<string[]>([]);
  const [moduleCompleteTriggered, setModuleCompleteTriggered] = useState(false);
  const [attemptSeed, setAttemptSeed] = useState(() => Date.now());
  const { checkAndCompleteModule } = useModuleCompletion(trackId);
  const drillKey = mode === "chapter" && moduleNumber === 5 && chapter ? `5.${chapter.chapter_number}` : "";
  const drillLines = SCRIPT_DRILLS[drillKey] || [];
  const requiresDrill = drillLines.length > 0;
  const flashcardKey = mode === "chapter" && (moduleNumber === 5 || moduleNumber === 6 || moduleNumber === 7) && chapter ? `${moduleNumber}.${chapter.chapter_number}` : "";
  const flashcards = CHAPTER_FLASHCARDS[flashcardKey] || [];
  const reflectionKey = mode === "chapter" && moduleNumber === 8 && chapter ? `9.${chapter.chapter_number}` : "";
  const reflectionFields = REFLECTION_FIELDS[reflectionKey] || [];
  const isReflectionModule = moduleNumber === 8;
  // Modules 1 & 2 are info-only: no quizzes, no level system, just read + Mark Complete.
  const isInfoOnlyModule = moduleNumber === 1 || moduleNumber === 2;
  const [lockCheck, setLockCheck] = useState<ModuleLockCheckState>({
    checked: false,
    locked: true,
    moduleNumber: null,
    previousModuleComplete: false,
    userId: null,
  });
  const effectiveLocked = lockCheck.checked ? lockCheck.locked : lockedPreview;

  // Fresh DB check on every mount/module change. Module-locking gating is disabled:
  // every module resolves as unlocked so users can open any module directly.
  useEffect(() => {
    let cancelled = false;
    setLockCheck({ checked: false, locked: true, moduleNumber: null, previousModuleComplete: false, userId: null });
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setLockCheck({ checked: true, locked: false, moduleNumber: null, previousModuleComplete: true, userId: null });
        }
        return;
      }
      const { data: thisMod } = await supabase
        .from("nl_training_modules")
        .select("module_number, track_id")
        .eq("id", moduleId)
        .maybeSingle();
      const currentModuleNumber = thisMod?.module_number ?? null;
      if (!thisMod || currentModuleNumber === null) {
        if (!cancelled) {
          setLockCheck({ checked: true, locked: false, moduleNumber: currentModuleNumber, previousModuleComplete: true, userId: user.id });
        }
        return;
      }
      if (typeof window !== "undefined" && import.meta.env.DEV) {
        console.log(`ChapterRunner lock check: module=${moduleId} display_order=${currentModuleNumber} locked=false (gating disabled) user=${user.id}`);
      }
      if (!cancelled) {
        setLockCheck({ checked: true, locked: false, moduleNumber: currentModuleNumber, previousModuleComplete: true, userId: user.id });
      }
    })();
    return () => { cancelled = true; };
  }, [moduleId]);

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
        if (chapter.module_id !== moduleId && typeof window !== "undefined") {
          console.error("ChapterRunner chapter/module mismatch", { chapterId: chapter.id, chapterModuleId: chapter.module_id, moduleId });
        }
        q = await supabase
          .from("nl_training_questions")
          .select("*")
          .eq("chapter_id", chapter.id)
          .eq("module_id", moduleId)
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

      const rows = (q.data || [])
        .filter((r: any) => mode !== "chapter" || (r.chapter_id === chapter?.id && r.module_id === moduleId))
        .map((r: any) => ({
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
        // Pick the first level that is both incomplete AND has at least one question.
        // This avoids a "Take Level X Quiz" button that is silently disabled because
        // the level has no questions assigned.
        const levelHasQuestions = (lvl: QuizLevel) =>
          rows.some((r) => (r.quiz_level || 1) === lvl);
        const nextLevel =
          ([1, 2, 3] as QuizLevel[]).find(
            (level) =>
              !levelRows.some((row) => row.quiz_level === level && row.status === "completed") &&
              levelHasQuestions(level),
          ) ||
          ([1, 2, 3] as QuizLevel[]).find((level) => levelHasQuestions(level)) ||
          1;
        setCurrentLevel(nextLevel);
      }

      // Fetch unlock categories for this chapter (objection mastery)
      if (mode === "chapter" && chapter) {
        const { data: unlockQs } = await (supabase as any)
          .from("nl_training_questions")
          .select("unlock_category")
          .eq("chapter_id", chapter.id)
          .eq("is_unlock_question", true)
          .not("unlock_category", "is", null);
        const cats = [...new Set((unlockQs || []).map((r: any) => r.unlock_category).filter(Boolean))] as string[];
        setUnlockCategories(cats);
      }

      if (user && !effectiveLocked) {
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
  }, [mode, chapter?.id, moduleId, trackId, effectiveLocked]);

  const currentLevelQuestions = useMemo(
    () => mode === "chapter" ? questions.filter((q) => (q.quiz_level || 1) === currentLevel).slice(0, 3) : questions,
    [currentLevel, mode, questions]
  );
  const current = currentLevelQuestions[qIdx];
  const totalQ = currentLevelQuestions.length;
  const scorePct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
  const passed = mode === "chapter" ? lastPassed : scorePct >= passScore;

  // Shuffle options per question per attempt
  const shuffled = useMemo(
    () => current ? shuffleQuestion(current.options, current.correct_index, current.id, attemptSeed) : null,
    [current?.id, attemptSeed]
  );

  const levelHasQuestions = (level: QuizLevel) => questions.some((q) => (q.quiz_level || 1) === level);
  const isLevelComplete = (level: QuizLevel) => levelProgress.some((row) => row.quiz_level === level && row.status === "completed");
  const isLevelUnlocked = (_level: QuizLevel) => true; // Gating disabled: any quiz level is always accessible.
  const availableLevels = ([1, 2, 3] as QuizLevel[]).filter(levelHasQuestions);
  const completedLevels = availableLevels.filter(isLevelComplete).length;
  const totalAvailableLevels = availableLevels.length || 3;
  const showPracticeVault = mode === "chapter" && !!chapter && moduleNumber !== null && [3, 4, 5, 6].includes(moduleNumber);

  const resetQuiz = (level = currentLevel) => {
    if (effectiveLocked) return;
    setCurrentLevel(level);
    setQIdx(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setLastScorePct(0);
    setLastPassed(false);
    setAttemptSeed(Date.now());
    setPhase(requiresDrill && !drillCompleted ? "drill" : "quiz");
  };

  const handleDrillComplete = () => {
    setDrillCompleted(true);
    setPhase("quiz");
  };

  const handleSelect = (i: number) => {
    if (effectiveLocked || revealed) return;
    setSelected(i);
    setRevealed(true);
    // Map shuffled index back to original to check correctness
    if (shuffled && shuffled.indexMap[i] === current?.correct_index) {
      setCorrectCount((c) => c + 1);
    }
  };

  const persistLevelResult = async (finalPct: number, didPass: boolean) => {
    if (effectiveLocked || !userId || !chapter) return;
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

      // Check if all chapters in this module are now complete
      if (modulesList && modulesList.length > 0) {
        const completed = await checkAndCompleteModule(moduleId, modulesList);
        if (completed && !moduleCompleteTriggered) {
          setModuleCompleteTriggered(true);
          onModuleComplete?.();
        }
      }
    }
  };

  const persistModuleResult = async (finalPct: number, didPass: boolean) => {
    if (effectiveLocked || !userId) return;
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
    if (effectiveLocked) return;
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
    if (effectiveLocked) return;
    setSaving(true);
    try {
      if (mode === "chapter" && chapter && userId) {
        // For info-only modules (1 & 2), force a passing score so module-completion
        // checks (which require score >= 80) succeed without a quiz.
        const completionScore = isInfoOnlyModule ? 100 : lastScorePct;
        await supabase.from("nl_training_progress").upsert(
          {
            user_id: userId,
            track_id: trackId,
            module_id: moduleId,
            chapter_id: chapter.id,
            status: "completed",
            score: completionScore,
            attempts: 1,
            last_attempt_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,module_id,chapter_id" } as any
        );

        // For info-only modules, attempt to auto-complete the module once all
        // chapters have been marked complete.
        if (isInfoOnlyModule && modulesList && modulesList.length > 0) {
          const completed = await checkAndCompleteModule(moduleId, modulesList);
          if (completed && !moduleCompleteTriggered) {
            setModuleCompleteTriggered(true);
            onModuleComplete?.();
          }
        }
      }
      onCompleted();
      onClose();
    } catch (error) {
      toast({ title: "Could not mark complete", description: "Your chapter progress did not save. Try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const levelBadges = mode === "chapter" && availableLevels.length > 0 && (
    <div
      className="grid gap-2 mb-6"
      style={{ gridTemplateColumns: `repeat(${availableLevels.length}, minmax(0, 1fr))` }}
    >
      {availableLevels.map((level) => {
        const complete = isLevelComplete(level);
        const unlocked = isLevelUnlocked(level);
        const levelScore = levelProgress.find((row) => row.quiz_level === level && row.status === "completed")?.score;
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
            <div className="mt-1 text-xs font-medium text-foreground">
              {complete ? `${LEVEL_LABELS[level]} · ${levelScore != null ? `${levelScore}%` : "Passed"}` : LEVEL_LABELS[level]}
            </div>
          </button>
        );
      })}
    </div>
  );

  const lockedBanner = effectiveLocked && unlockModuleNumber ? (
    <div className="mb-5 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
      Complete Module {unlockModuleNumber} to unlock quizzes and progress tracking for this module
    </div>
  ) : null;

  const lockedQuizState = (
    <div className="mt-8 sm:mt-10 rounded-xl border border-primary/25 bg-primary/10 p-5 text-center">
      <Lock className="mx-auto mb-3 h-8 w-8 text-primary" />
      <h2 className="text-lg font-semibold text-foreground">Quiz Locked</h2>
      <p className="mt-2 text-sm font-medium text-primary">Complete the previous module to unlock this quiz.</p>
    </div>
  );

  const quizButton = currentLevelQuestions.length > 0 ? (
    <Button
      onClick={() => effectiveLocked && requiresDrill && !drillCompleted ? setPhase("drill") : resetQuiz(currentLevel)}
      disabled={effectiveLocked && !requiresDrill}
      className="gap-2"
    >
      {effectiveLocked && requiresDrill && !drillCompleted ? "Preview Script Drill" : requiresDrill && !drillCompleted ? "Start Script Drill" : `Take Level ${currentLevel} Quiz`}
      <CheckCircle2 className="h-4 w-4" />
    </Button>
  ) : null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-4xl mx-auto px-3 pb-10 pt-5 sm:px-4 sm:pb-14 sm:pt-8">
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
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full">
            {lockedBanner}
            <div className="mb-5 rounded-2xl border border-border/40 bg-card/60 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Reading</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3 leading-tight">{chapter.chapter_title}</h1>
              {!isReflectionModule && !isInfoOnlyModule && levelBadges}
              {!isReflectionModule && !isInfoOnlyModule && <Progress value={(completedLevels / totalAvailableLevels) * 100} className="h-1.5" />}
            </div>
            <TrainingContentRenderer content={chapter.content || ""} />
            {reflectionFields.length > 0 && <ReflectionVault chapterId={chapter.id} fields={reflectionFields} />}
            {flashcards.length > 0 && <ObjectionFlashcards cards={flashcards} />}
            {showPracticeVault && <PracticeRecordingVault chapterId={chapter.id} lockedPreview={effectiveLocked} />}
            {unlockCategories.map((cat) => (
              <ObjectionMasteryTrack key={cat} chapterId={chapter.id} unlockCategory={cat} />
            ))}
            {isReflectionModule || isInfoOnlyModule ? (
              <div className="mt-8 sm:mt-10 flex justify-stretch sm:justify-end">
                <Button onClick={handleMarkComplete} disabled={saving} className="gap-2">
                  {saving ? "Saving…" : "Mark Complete"}
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            ) : effectiveLocked ? lockedQuizState : <div className="mt-8 sm:mt-10 flex justify-stretch sm:justify-end">{quizButton}</div>}
          </motion.div>
        ) : phase === "drill" && chapter && requiresDrill ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="card-widget w-full p-4 sm:p-8">
            <ScriptDrillExercise
              lines={drillLines}
              trackId={trackId}
              moduleId={moduleId}
              chapterId={chapter.id}
              onComplete={handleDrillComplete}
              lockedPreview={effectiveLocked}
            />
          </motion.div>
        ) : effectiveLocked && phase === "quiz" ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="card-widget w-full p-4 sm:p-8">
            {lockedQuizState}
            <div className="mt-5 flex justify-center"><Button variant="outline" onClick={onClose}>Back to module</Button></div>
          </motion.div>
        ) : phase === "quiz" && current && shuffled ? (
          <motion.div key={`${current.id}-${currentLevel}-${attemptSeed}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="card-widget w-full p-4 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {mode === "chapter" ? `Level ${currentLevel} · ${LEVEL_LABELS[currentLevel]}` : "Module Test"} · Question {qIdx + 1} of {totalQ}
              </span>
              <span className="text-[11px] font-semibold text-foreground">Score: {correctCount} / {totalQ}</span>
            </div>
            <Progress value={((qIdx + (revealed ? 1 : 0)) / totalQ) * 100} className="h-1.5 mb-6" />
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-6 leading-snug">{current.question_text}</h2>
            <div className="space-y-3">
              {shuffled.options.map((opt, i) => {
                const isCorrect = i === shuffled.correctShuffledIndex;
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
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`mt-5 rounded-lg border p-4 ${selected !== null && shuffled.indexMap[selected] === current.correct_index ? "border-[hsl(152,60%,50%)]/40 bg-[hsl(152,60%,50%)]/[0.06]" : "border-[hsl(0,75%,60%)]/40 bg-[hsl(0,75%,60%)]/[0.06]"}`}>
                  <div className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 text-muted-foreground">{selected !== null && shuffled.indexMap[selected] === current.correct_index ? "Correct" : "Not quite"}</div>
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
              {!effectiveLocked && mode === "chapter" && passed && currentLevel === 3 && <Button onClick={handleMarkComplete} disabled={saving}>{saving ? "Saving…" : "Mark Complete"}</Button>}
              {!effectiveLocked && mode === "module_test" && passed && <Button onClick={handleMarkComplete} disabled={saving}>{saving ? "Saving…" : "Continue"}</Button>}
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
