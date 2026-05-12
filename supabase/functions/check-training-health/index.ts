// Nightly Training Health Check
// Audits chapters, questions, and lock chain integrity. Logs result to nl_health_check_log.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const [chaptersRes, questionsRes, modulesRes] = await Promise.all([
      supabase.from("nl_training_chapters").select("id, chapter_title, module_id, chapter_number"),
      supabase.from("nl_training_questions").select("id, chapter_id, module_id, quiz_level, question_text, question_type"),
      supabase.from("nl_training_modules").select("id, module_number, module_title").order("module_number"),
    ]);

    if (chaptersRes.error) throw chaptersRes.error;
    if (questionsRes.error) throw questionsRes.error;
    if (modulesRes.error) throw modulesRes.error;

    const chapters = chaptersRes.data || [];
    const questions = questionsRes.data || [];
    const modules = modulesRes.data || [];

    const chapterIds = new Set(chapters.map((c) => c.id));

    // CHECK 1: chapters under threshold (need >=2 questions per level L1, L2, L3)
    const chaptersUnderThreshold: Array<{ id: string; title: string; module_id: string; missing: string[] }> = [];
    for (const c of chapters) {
      const qs = questions.filter((q) => q.chapter_id === c.id && q.question_type === "chapter_quiz");
      const levelCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
      qs.forEach((q) => { levelCounts[q.quiz_level || 1] = (levelCounts[q.quiz_level || 1] || 0) + 1; });
      const missing: string[] = [];
      [1, 2, 3].forEach((lvl) => { if ((levelCounts[lvl] || 0) < 2) missing.push(`L${lvl}(${levelCounts[lvl] || 0})`); });
      if (missing.length > 0) chaptersUnderThreshold.push({ id: c.id, title: c.chapter_title, module_id: c.module_id, missing });
    }

    // CHECK 2: orphan questions
    const orphans = questions.filter((q) => !q.chapter_id || !chapterIds.has(q.chapter_id));

    // CHECK 3: duplicate question_text across different chapter_ids
    const textMap = new Map<string, Set<string>>();
    for (const q of questions) {
      const t = (q.question_text || "").trim();
      if (!t) continue;
      if (!textMap.has(t)) textMap.set(t, new Set());
      if (q.chapter_id) textMap.get(t)!.add(q.chapter_id);
    }
    const duplicateTexts = Array.from(textMap.entries()).filter(([, set]) => set.size > 1);

    // CHECK 4: lock chain integrity (modules 1..8 contiguous)
    const moduleNumbers = modules.map((m) => m.module_number).sort((a, b) => a - b);
    let lockChainOk = moduleNumbers.length >= 8;
    for (let i = 0; i < Math.min(8, moduleNumbers.length); i++) {
      if (moduleNumbers[i] !== i + 1) { lockChainOk = false; break; }
    }

    // CHECK 5 & 6: table accessibility
    const tableChecks: Record<string, boolean> = {};
    for (const t of ["nl_module_exams", "nl_module_completion", "nl_training_progress"]) {
      const { error } = await supabase.from(t).select("*", { count: "exact", head: true }).limit(1);
      tableChecks[t] = !error;
    }

    const critical = orphans.length > 0 || chaptersUnderThreshold.some((c) => c.missing.some((m) => m.endsWith("(0)"))) || !lockChainOk || Object.values(tableChecks).some((v) => !v);
    const warnings = chaptersUnderThreshold.length > 0 || duplicateTexts.length > 0;
    const overall_status = critical ? "critical" : warnings ? "warnings" : "healthy";

    const details = {
      table_checks: tableChecks,
      module_numbers: moduleNumbers,
      duplicate_texts_sample: duplicateTexts.slice(0, 20).map(([text, set]) => ({ text: text.slice(0, 120), chapter_count: set.size })),
      orphans_sample: orphans.slice(0, 20).map((o) => ({ id: o.id, chapter_id: o.chapter_id, text: (o.question_text || "").slice(0, 120) })),
    };

    const { data: log, error: logErr } = await supabase.from("nl_health_check_log").insert({
      total_chapters: chapters.length,
      total_questions: questions.length,
      chapters_under_threshold: chaptersUnderThreshold,
      orphan_count: orphans.length,
      duplicate_count: duplicateTexts.length,
      lock_chain_ok: lockChainOk,
      overall_status,
      details,
    }).select().single();

    if (logErr) throw logErr;

    return new Response(JSON.stringify({ ok: true, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-training-health error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
