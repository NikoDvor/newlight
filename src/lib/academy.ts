import { supabase } from "@/integrations/supabase/client";

/**
 * Sales Training ("academy") — data + game rules.
 * One track (track_key "salesmen"), 10 modules. Nothing is locked.
 * XP, levels, streaks and badges are all DERIVED from:
 *   nl_training_progress (chapter rows: status, score),
 *   nl_training_activity_days (one row per day trained),
 *   nl_certifications (final exam attempts),
 *   nl_my_why (Module 9).
 */

export const TRACK_KEY = "salesmen";
export const FINAL_MODULE = 10;
export const WHY_MODULE = 9;
export const PASS_PCT = 80;
export const FINAL_QUESTION_COUNT = 50;
export const CHAPTER_QUIZ_COUNT = 9;

export type Audience = "all" | "bdr" | "sdr";

export interface AcademyModule {
  id: string;
  module_number: number;
  module_title: string;
  module_description: string | null;
  tagline: string | null;
  has_quiz: boolean;
}
export interface AcademyChapter {
  id: string;
  module_id: string;
  chapter_number: number;
  chapter_title: string;
  chapter_description: string | null;
  content: string | null;
  audience: Audience;
  est_minutes: number | null;
}
export interface ProgressRow {
  module_id: string;
  chapter_id: string | null;
  status: string;
  score: number | null;
  completed_at: string | null;
  last_attempt_at: string | null;
}
export interface CertRow { id: string; attempt_number: number; score: number; passed: boolean; completed_at: string }
export interface Question {
  id: string;
  chapter_id: string | null;
  module_id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

export interface AcademyData {
  trackId: string;
  modules: AcademyModule[];
  chapters: AcademyChapter[];
  progress: ProgressRow[];
  days: string[];
  certs: CertRow[];
  hasWhy: boolean;
}

const db = supabase as any;

export async function loadAcademy(userId: string): Promise<AcademyData | null> {
  const { data: track } = await db.from("nl_training_tracks").select("id").eq("track_key", TRACK_KEY).maybeSingle();
  if (!track) return null;
  const [mods, chs, prog, days, certs, why] = await Promise.all([
    db.from("nl_training_modules").select("id, module_number, module_title, module_description, tagline, has_quiz").eq("track_id", track.id).order("module_number"),
    db.from("nl_training_chapters").select("id, module_id, chapter_number, chapter_title, chapter_description, audience, est_minutes").order("chapter_number"),
    db.from("nl_training_progress").select("module_id, chapter_id, status, score, completed_at, last_attempt_at").eq("user_id", userId).eq("track_id", track.id),
    db.from("nl_training_activity_days").select("day").eq("user_id", userId).order("day", { ascending: false }).limit(400),
    db.from("nl_certifications").select("id, attempt_number, score, passed, completed_at").eq("user_id", userId).order("completed_at", { ascending: false }),
    db.from("nl_my_why").select("id").eq("user_id", userId).eq("is_current", true).maybeSingle(),
  ]);
  const modules: AcademyModule[] = (mods.data || []).filter((m: any) => m.module_number >= 1 && m.module_number <= 10);
  const modIds = new Set(modules.map((m) => m.id));
  return {
    trackId: track.id,
    modules,
    chapters: (chs.data || []).filter((c: any) => modIds.has(c.module_id)),
    progress: prog.data || [],
    days: (days.data || []).map((d: any) => d.day),
    certs: certs.data || [],
    hasWhy: !!why.data,
  };
}

export async function loadChapterContent(chapterId: string): Promise<string> {
  const { data } = await db.from("nl_training_chapters").select("content").eq("id", chapterId).maybeSingle();
  return (data?.content as string) || "";
}

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle a question's options and remap the correct index (stored answers are mostly index 0). */
export function shuffleQuestion(q: Question): Question {
  const order = shuffle(q.options.map((_, i) => i));
  return { ...q, options: order.map((i) => q.options[i]), correct_index: order.indexOf(q.correct_index) };
}

export async function loadChapterQuiz(chapterId: string): Promise<Question[]> {
  const { data } = await db.from("nl_training_questions")
    .select("id, chapter_id, module_id, question_text, options, correct_index, explanation")
    .eq("chapter_id", chapterId).eq("question_type", "chapter_quiz");
  const qs = ((data || []) as Question[]).filter((q) => Array.isArray(q.options) && q.options.length >= 2);
  return shuffle(qs).slice(0, CHAPTER_QUIZ_COUNT).map(shuffleQuestion);
}

export async function loadFinalExam(quizModuleIds: string[]): Promise<Question[]> {
  if (!quizModuleIds.length) return [];
  const { data } = await db.from("nl_training_questions")
    .select("id, chapter_id, module_id, question_text, options, correct_index, explanation")
    .in("module_id", quizModuleIds).eq("question_type", "chapter_quiz");
  const qs = ((data || []) as Question[]).filter((q) => Array.isArray(q.options) && q.options.length >= 2);
  return shuffle(qs).slice(0, FINAL_QUESTION_COUNT).map(shuffleQuestion);
}

function localDay(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function recordActivityDay(userId: string) {
  await db.from("nl_training_activity_days").upsert({ user_id: userId, day: localDay() }, { onConflict: "user_id,day", ignoreDuplicates: true });
}

/** Saves a chapter as completed. Keeps the best quiz score. */
export async function completeChapter(opts: { userId: string; trackId: string; moduleId: string; chapterId: string; score?: number | null; prevScore?: number | null }) {
  const now = new Date().toISOString();
  const best = opts.score == null ? opts.prevScore ?? null : Math.max(opts.score, opts.prevScore ?? 0);
  await db.from("nl_training_progress").upsert({
    user_id: opts.userId, track_id: opts.trackId, module_id: opts.moduleId, chapter_id: opts.chapterId,
    status: "completed", score: best, completed_at: now, last_attempt_at: now,
  }, { onConflict: "user_id,module_id,chapter_id" });
  await recordActivityDay(opts.userId);
}

// ─── Game rules ────────────────────────────────────────────────────────────
export const XP = { chapter: 40, quizMax: 60, module: 150, why: 100, certified: 1000 } as const;
export const XP_PER_LEVEL = 500;

export function chapterDone(p: ProgressRow[], chapterId: string) {
  return p.find((r) => r.chapter_id === chapterId && r.status === "completed");
}

export function moduleStats(d: AcademyData, m: AcademyModule) {
  const chs = d.chapters.filter((c) => c.module_id === m.id);
  const done = chs.filter((c) => chapterDone(d.progress, c.id)).length;
  let complete = chs.length > 0 && done === chs.length;
  if (m.module_number === WHY_MODULE) complete = complete && d.hasWhy;
  if (m.module_number === FINAL_MODULE) complete = d.certs.some((c) => c.passed);
  const pct = m.module_number === FINAL_MODULE
    ? (complete ? 100 : 0)
    : chs.length ? Math.round((done / chs.length) * 100) : 0;
  return { total: chs.length, done, complete, pct };
}

export function streakOf(days: string[]): { current: number; best: number; today: boolean } {
  const set = new Set(days);
  const today = localDay();
  const yest = localDay(new Date(Date.now() - 86400_000));
  let current = 0;
  const start = set.has(today) ? new Date() : set.has(yest) ? new Date(Date.now() - 86400_000) : null;
  if (start) {
    const d = new Date(start);
    while (set.has(localDay(d))) { current++; d.setDate(d.getDate() - 1); }
  }
  // best streak over history
  const sorted = Array.from(set).sort();
  let best = 0, run = 0, prev: string | null = null;
  for (const s of sorted) {
    if (prev) {
      const p = new Date(prev + "T12:00:00"); p.setDate(p.getDate() + 1);
      run = localDay(p) === s ? run + 1 : 1;
    } else run = 1;
    best = Math.max(best, run); prev = s;
  }
  return { current, best: Math.max(best, current), today: set.has(today) };
}

export function xpOf(d: AcademyData) {
  let xp = 0;
  for (const r of d.progress) {
    if (!r.chapter_id || r.status !== "completed") continue;
    xp += XP.chapter;
    if (r.score != null) xp += Math.round((Math.min(100, r.score) / 100) * XP.quizMax);
  }
  for (const m of d.modules) if (m.module_number !== FINAL_MODULE && moduleStats(d, m).complete) xp += XP.module;
  if (d.hasWhy) xp += XP.why;
  if (d.certs.some((c) => c.passed)) xp += XP.certified;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const into = xp % XP_PER_LEVEL;
  return { xp, level, into, pctToNext: Math.round((into / XP_PER_LEVEL) * 100) };
}

export interface Badge { key: string; label: string; hint: string; earned: boolean }

export function badgesOf(d: AcademyData): Badge[] {
  const byNum = (n: number) => d.modules.find((m) => m.module_number === n);
  const modDone = (n: number) => { const m = byNum(n); return !!m && moduleStats(d, m).complete; };
  const anyChapter = d.progress.some((r) => r.chapter_id && r.status === "completed");
  const perfect = d.progress.some((r) => r.chapter_id && (r.score ?? 0) >= 100);
  const s = streakOf(d.days);
  return [
    { key: "first", label: "First Step", hint: "Finish any chapter", earned: anyChapter },
    { key: "m1", label: "Onboarded", hint: "Finish Module 1", earned: modDone(1) },
    { key: "m2", label: "Knows the App", hint: "Finish Module 2", earned: modDone(2) },
    { key: "m34", label: "Product Pro", hint: "Finish Modules 3 and 4", earned: modDone(3) && modDone(4) },
    { key: "m5", label: "Craftsman", hint: "Finish Module 5", earned: modDone(5) },
    { key: "m6", label: "Script Ready", hint: "Finish Module 6", earned: modDone(6) },
    { key: "m7", label: "Objection Slayer", hint: "Finish Module 7", earned: modDone(7) },
    { key: "m8", label: "Closer", hint: "Finish Module 8", earned: modDone(8) },
    { key: "why", label: "Found My Why", hint: "Set your goal in Module 9", earned: d.hasWhy },
    { key: "perfect", label: "Perfect Quiz", hint: "Score 100% on a quiz", earned: perfect },
    { key: "streak5", label: "On Fire", hint: "Train 5 days in a row", earned: s.best >= 5 },
    { key: "cert", label: "Certified", hint: "Pass the Final Certification", earned: d.certs.some((c) => c.passed) },
  ];
}

/** The next chapter to read: first unfinished chapter in module order. */
export function nextUp(d: AcademyData): { module: AcademyModule; chapter: AcademyChapter | null } | null {
  for (const m of d.modules) {
    if (m.module_number === FINAL_MODULE) {
      if (!d.certs.some((c) => c.passed)) return { module: m, chapter: null };
      continue;
    }
    const chs = d.chapters.filter((c) => c.module_id === m.id).sort((a, b) => a.chapter_number - b.chapter_number);
    const c = chs.find((x) => !chapterDone(d.progress, x.id));
    if (c) return { module: m, chapter: c };
    if (m.module_number === WHY_MODULE && !d.hasWhy) return { module: m, chapter: null };
  }
  return null;
}

export const AUDIENCE_LABEL: Record<Audience, string | null> = { all: null, bdr: "BDR", sdr: "SDR" };

// ─── Module 9: Your Why ────────────────────────────────────────────────────
export interface WhyRow {
  id: string;
  goal: string;
  goal_amount: number | null;
  deadline: string;
  dream_life: string | null;
  quotes: string[];
  favorite_quotes: string[];
  is_current: boolean;
  created_at: string;
}

/** Built-in daily quotes (original lines — no attributions to get wrong). */
export const BUILT_IN_QUOTES: { id: string; text: string }[] = [
  { id: "q1", text: "The dial you don't make is the meeting you never get." },
  { id: "q2", text: "Discipline today buys freedom later." },
  { id: "q3", text: "Every no is one call closer to the yes." },
  { id: "q4", text: "Activity you control. Results follow activity." },
  { id: "q5", text: "Be the calmest person on the call." },
  { id: "q6", text: "Nobody remembers the easy days. Win the hard ones." },
  { id: "q7", text: "Your goal doesn't care how you feel. Pick up the phone." },
  { id: "q8", text: "Small wins, stacked daily, become a big year." },
  { id: "q9", text: "Ask one more question than feels comfortable." },
  { id: "q10", text: "Momentum is built before lunch." },
  { id: "q11", text: "You are one conversation away from a different month." },
  { id: "q12", text: "Do the boring things with energy." },
  { id: "q13", text: "Pressure is a privilege. It means it matters." },
  { id: "q14", text: "Say less. Listen more. Close more." },
  { id: "q15", text: "The deadline is real. So is the dream behind it." },
  { id: "q16", text: "Confidence is preparation you can hear." },
  { id: "q17", text: "Log it, learn from it, dial again." },
  { id: "q18", text: "Be so consistent they can set a clock by you." },
  { id: "q19", text: "Rejection is just data. Use it." },
  { id: "q20", text: "Win the morning, win the day." },
  { id: "q21", text: "Today's effort is next month's paycheck." },
  { id: "q22", text: "The best closers are the best listeners." },
  { id: "q23", text: "Bet on yourself. Then make the dials to back it." },
  { id: "q24", text: "Hard calls make easy years." },
];

export const DREAM_PROMPTS = [
  "Where do you live? Describe the place.",
  "What does a normal Tuesday look like?",
  "Who is with you, and what do you do for them?",
  "What did you buy, pay off, or give away?",
  "How do you feel when you wake up?",
  "What will you never have to worry about again?",
];

export async function loadWhy(userId: string): Promise<{ current: WhyRow | null; history: WhyRow[] }> {
  const { data } = await db.from("nl_my_why").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  const rows: WhyRow[] = (data || []).map((r: any) => ({ ...r, quotes: r.quotes || [], favorite_quotes: r.favorite_quotes || [] }));
  return { current: rows.find((r) => r.is_current) || null, history: rows.filter((r) => !r.is_current) };
}

/** Changing the goal or deadline keeps the old goal in history; other edits update in place. */
export async function saveWhy(userId: string, current: WhyRow | null, next: Omit<WhyRow, "id" | "is_current" | "created_at">) {
  const payload = { ...next, user_id: userId, updated_at: new Date().toISOString() };
  const goalChanged = current && (current.goal.trim() !== next.goal.trim() || current.deadline !== next.deadline || (current.goal_amount ?? null) !== (next.goal_amount ?? null));
  if (current && !goalChanged) {
    const { error } = await db.from("nl_my_why").update(payload).eq("id", current.id);
    if (error) throw error;
    return;
  }
  if (current) {
    const { error } = await db.from("nl_my_why").update({ is_current: false, updated_at: payload.updated_at }).eq("id", current.id);
    if (error) throw error;
  }
  const { error } = await db.from("nl_my_why").insert({ ...payload, is_current: true });
  if (error) throw error;
  await recordActivityDay(userId);
}

export function daysLeft(deadline: string): number {
  const end = new Date(deadline + "T23:59:59");
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400_000));
}

/** Same quote all day, a new one tomorrow. Uses the user's own + kept quotes, else all built-ins. */
export function quoteOfTheDay(why: WhyRow | null): string {
  const kept = BUILT_IN_QUOTES.filter((q) => why?.favorite_quotes?.includes(q.id)).map((q) => q.text);
  const pool = [...(why?.quotes || []).filter((q) => q.trim()), ...kept];
  const list = pool.length ? pool : BUILT_IN_QUOTES.map((q) => q.text);
  const dayNum = Math.floor(new Date(localDay() + "T12:00:00").getTime() / 86400_000);
  return list[dayNum % list.length];
}
