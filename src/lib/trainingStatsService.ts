// Shared training data service.
// Mirrors the EXACT same data sources used by the BDR Training Track page
// (src/pages/admin/AdminTrainingTrack.tsx) and useModuleCompletion hook,
// so admin views and the employee portal always agree.
//
// Canonical sources:
//  - nl_training_modules            -> module_id <-> module_number map
//  - nl_module_completion           -> module is 100% complete (score_average)
//  - nl_module_exams                -> latest module exam score + attempt count
//  - nl_training_chapters           -> chapters belonging to each module
//  - nl_training_chapter_level_progress -> per-chapter L1/L2/L3 quiz progress
//  - nl_certifications              -> overall BDR certification status

import { supabase } from "@/integrations/supabase/client";

export interface ModuleProgress {
  module: string; // "M1" ... "M10"
  pct: number;    // 0-100
}

export interface QuizAttemptCell {
  module: string; // "M1" ... "M10"
  level: "L1" | "L2" | "L3";
  count: number;
}

export interface TrainingStats {
  moduleProgress: ModuleProgress[];
  quizAttempts: QuizAttemptCell[];
  certStatus: "passed" | "failed" | "not_started";
}

const EMPTY: TrainingStats = {
  moduleProgress: Array.from({ length: 10 }, (_, i) => ({ module: `M${i + 1}`, pct: 0 })),
  quizAttempts: Array.from({ length: 10 }).flatMap((_, i) =>
    (["L1", "L2", "L3"] as const).map((lv) => ({ module: `M${i + 1}`, level: lv, count: 0 }))
  ),
  certStatus: "not_started",
};

export async function getTrainingStatsForUser(userId: string): Promise<TrainingStats> {
  if (!userId) return EMPTY;

  // 1. Modules (id -> module_number)
  const { data: mods } = await (supabase as any)
    .from("nl_training_modules")
    .select("id, module_number")
    .order("module_number");
  const moduleRows: Array<{ id: string; module_number: number }> = mods ?? [];
  const idToNum = new Map<string, number>();
  const numToId = new Map<number, string>();
  moduleRows.forEach((m) => {
    idToNum.set(m.id, m.module_number);
    if (!numToId.has(m.module_number)) numToId.set(m.module_number, m.id);
  });

  // 2. nl_module_completion (presence -> module is complete)
  const { data: completions } = await (supabase as any)
    .from("nl_module_completion")
    .select("module_id, score_average")
    .eq("user_id", userId);
  const completedByNum = new Map<number, number>(); // module_number -> score_average
  (completions ?? []).forEach((c: any) => {
    const num = idToNum.get(c.module_id);
    if (!num) return;
    completedByNum.set(num, Math.min(100, Math.round(c.score_average ?? 100)));
  });

  // 3. nl_module_exams (latest attempt per module)
  const moduleIds = moduleRows.map((m) => m.id);
  const latestExamByNum = new Map<number, { score: number; passed: boolean; attempts: number }>();
  if (moduleIds.length > 0) {
    const { data: exams } = await (supabase as any)
      .from("nl_module_exams")
      .select("module_id, score, passed, attempt_number")
      .eq("user_id", userId)
      .in("module_id", moduleIds);
    (exams ?? []).forEach((e: any) => {
      const num = idToNum.get(e.module_id);
      if (!num) return;
      const prev = latestExamByNum.get(num);
      if (!prev || (e.attempt_number ?? 0) > prev.attempts) {
        latestExamByNum.set(num, {
          score: e.score ?? 0,
          passed: !!e.passed,
          attempts: e.attempt_number ?? 1,
        });
      }
    });
  }

  // 4. Module % — same precedence the portal uses:
  //    completion record => 100% (or stored score_average)
  //    else => latest module-exam score
  //    else => 0
  const moduleProgress: ModuleProgress[] = Array.from({ length: 10 }, (_, i) => {
    const num = i + 1;
    if (completedByNum.has(num)) {
      const v = completedByNum.get(num)!;
      return { module: `M${num}`, pct: v > 0 ? v : 100 };
    }
    const ex = latestExamByNum.get(num);
    return { module: `M${num}`, pct: ex ? Math.min(100, Math.round(ex.score)) : 0 };
  });

  // 5. Quiz attempts per module/level — derive from nl_training_chapter_level_progress
  //    exactly like AdminTrainingTrack renders its per-chapter L1/L2/L3 progress.
  //    "Attempts" = number of chapter-level rows touched at that level
  //    (each row represents a completed attempt of that level for one chapter).
  let quizAttempts = EMPTY.quizAttempts;
  if (moduleIds.length > 0) {
    const { data: chapters } = await (supabase as any)
      .from("nl_training_chapters")
      .select("id, module_id")
      .in("module_id", moduleIds);
    const chapterToModuleNum = new Map<string, number>();
    (chapters ?? []).forEach((c: any) => {
      const num = idToNum.get(c.module_id);
      if (num) chapterToModuleNum.set(c.id, num);
    });

    const chapterIds = Array.from(chapterToModuleNum.keys());
    if (chapterIds.length > 0) {
      const { data: levels } = await (supabase as any)
        .from("nl_training_chapter_level_progress")
        .select("chapter_id, quiz_level, status")
        .eq("user_id", userId)
        .in("chapter_id", chapterIds);
      const bucket = new Map<string, number>();
      (levels ?? []).forEach((r: any) => {
        const num = chapterToModuleNum.get(r.chapter_id);
        if (!num) return;
        const lvl = r.quiz_level === 1 ? "L1" : r.quiz_level === 2 ? "L2" : r.quiz_level === 3 ? "L3" : null;
        if (!lvl) return;
        const k = `M${num}-${lvl}`;
        bucket.set(k, (bucket.get(k) ?? 0) + 1);
      });
      quizAttempts = Array.from({ length: 10 }).flatMap((_, i) =>
        (["L1", "L2", "L3"] as const).map((lv) => ({
          module: `M${i + 1}`,
          level: lv,
          count: bucket.get(`M${i + 1}-${lv}`) ?? 0,
        }))
      );
    }
  }

  // 6. Certification status (latest attempt)
  let certStatus: TrainingStats["certStatus"] = "not_started";
  try {
    const { data: cert } = await (supabase as any)
      .from("nl_certifications")
      .select("passed, completed_at")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cert) certStatus = cert.passed ? "passed" : "failed";
  } catch { /* ignore */ }

  return { moduleProgress, quizAttempts, certStatus };
}
