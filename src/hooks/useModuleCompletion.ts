import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ModuleCompletionRecord {
  module_id: string;
  completed_at: string;
  score_average: number;
}

interface ChapterQuizStatus {
  chapter_id: string;
  has_questions: boolean;
  is_passed: boolean;
}

export function useModuleCompletion(trackId: string | null) {
  const [completions, setCompletions] = useState<ModuleCompletionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!trackId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await (supabase as any)
      .from("nl_module_completion")
      .select("module_id, completed_at, score_average")
      .eq("user_id", user.id);
    setCompletions((data || []) as ModuleCompletionRecord[]);
    setLoading(false);
  }, [trackId]);

  useEffect(() => { reload(); }, [reload]);

  const isModuleCompleted = (moduleId: string) =>
    completions.some((c) => c.module_id === moduleId);

  /**
   * Check if all chapters in a module have passing quizzes (or no quiz questions).
   * If yes, create the completion record and unlock the next module.
   */
  const checkAndCompleteModule = async (
    moduleId: string,
    modules: { id: string; module_number: number }[]
  ): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Already completed?
    if (isModuleCompleted(moduleId)) return true;

    // Get all chapters in this module
    const { data: chapters } = await supabase
      .from("nl_training_chapters")
      .select("id")
      .eq("module_id", moduleId);
    const chapterIds = (chapters || []).map((c: any) => c.id);
    if (chapterIds.length === 0) return false;

    // For each chapter, check if it has quiz questions and if user passed
    const statuses: ChapterQuizStatus[] = [];
    for (const cid of chapterIds) {
      const { count } = await supabase
        .from("nl_training_questions")
        .select("id", { count: "exact", head: true })
        .eq("chapter_id", cid)
        .eq("question_type", "chapter_quiz");

      const hasQuestions = (count || 0) > 0;

      if (!hasQuestions) {
        // Auto-complete: no quiz questions
        statuses.push({ chapter_id: cid, has_questions: false, is_passed: true });
        continue;
      }

      // Check if all 3 levels are completed for this chapter
      const { data: levelRows } = await (supabase as any)
        .from("nl_training_chapter_level_progress")
        .select("quiz_level, status")
        .eq("user_id", user.id)
        .eq("chapter_id", cid)
        .eq("status", "completed");

      const completedLevels = (levelRows || []).length;
      // Consider passed if all 3 levels done OR if progress shows completed
      if (completedLevels >= 3) {
        statuses.push({ chapter_id: cid, has_questions: true, is_passed: true });
        continue;
      }

      // Also check nl_training_progress for completed status
      const { data: progRow } = await supabase
        .from("nl_training_progress")
        .select("status, score")
        .eq("user_id", user.id)
        .eq("module_id", moduleId)
        .eq("chapter_id", cid)
        .eq("status", "completed")
        .maybeSingle();

      statuses.push({
        chapter_id: cid,
        has_questions: true,
        is_passed: !!progRow && (progRow.score ?? 0) >= 70,
      });
    }

    const allPassed = statuses.every((s) => s.is_passed);
    if (!allPassed) return false;

    // Calculate average score from chapter level progress
    const scores: number[] = [];
    for (const cid of chapterIds) {
      const { data: levelRows } = await (supabase as any)
        .from("nl_training_chapter_level_progress")
        .select("score")
        .eq("user_id", user.id)
        .eq("chapter_id", cid)
        .eq("status", "completed");
      (levelRows || []).forEach((r: any) => {
        if (r.score != null) scores.push(r.score);
      });
    }
    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
      : 100;

    // Create completion record
    await (supabase as any).from("nl_module_completion").upsert(
      {
        user_id: user.id,
        module_id: moduleId,
        completed_at: new Date().toISOString(),
        score_average: avgScore,
      },
      { onConflict: "user_id,module_id" }
    );

    // Unlock next module
    const currentModule = modules.find((m) => m.id === moduleId);
    if (currentModule) {
      const nextModule = modules.find((m) => m.module_number === currentModule.module_number + 1);
      if (nextModule) {
        await supabase.from("nl_training_modules").update({ is_locked: false }).eq("id", nextModule.id);
      }
    }

    await reload();
    return true;
  };

  return {
    completions,
    loading,
    isModuleCompleted,
    checkAndCompleteModule,
    reload,
  };
}
