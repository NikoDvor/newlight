import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, Flame, RotateCcw, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

interface ScriptDefinition {
  key: string;
  name: string;
  lines: string[];
  quiz: QuizQuestion[];
}

interface QuizQuestion {
  question: string;
  answer: string;
  wrong: string[];
}

type LineStatus = "mastered" | "revealed";

type ProgressRecord = {
  mastered_count?: number | null;
  revealed_count?: number | null;
  attempts?: number | null;
  streak_days?: number | null;
  last_practiced_at?: string | null;
  line_statuses?: Record<string, LineStatus> | null;
};

const SCRIPTS: ScriptDefinition[] = [
  {
    key: "in_person_bdr",
    name: "In-Person BDR Script",
    lines: [
      "Hey, quick question — if I lined up 25 new [customers/clients] for you next month, you be able to take them ok?",
      "Here's what I mean — right now there are people in [city] searching for exactly what you offer. They're just finding your competition first. What we do is flip that. We make sure those people find you instead and come through your door.",
      "And honestly — I already put something together for you specifically.",
      "I would love to steal you for 20 mins this week. Does mornings, afternoons or evenings work for you?",
    ],
    quiz: [
      {
        question: "What is the strategic purpose of the opener question \"if I lined up 25 new customers, you be able to take them ok?\"",
        answer: "It puts the owner in an abundance mindset instantly — they are thinking about handling growth not defending against a sales pitch",
        wrong: [
          "It qualifies whether the business has capacity before pitching",
          "It establishes rapport before introducing the product",
          "It is a compliance technique that gets the owner to say yes before the pitch",
        ],
      },
      {
        question: "Why do you never fill the silence after the opener question?",
        answer: "Silence after the opener lets the owner process and respond genuinely — filling it breaks the pattern interrupt and removes the pressure that makes them engage",
        wrong: [
          "Silence gives you time to prepare your next line",
          "It is a politeness technique that shows respect",
          "Silence makes the conversation feel more natural and less scripted",
        ],
      },
      {
        question: "What does \"they're just finding your competition first\" do psychologically?",
        answer: "It activates loss aversion — the owner feels the pain of customers going to competitors right now, before you have offered anything",
        wrong: [
          "It establishes credibility by showing you know the market",
          "It creates urgency by implying the competition is growing",
          "It is a rapport-building line that shows you understand their business",
        ],
      },
      {
        question: "What is the purpose of saying \"I already put something together for you specifically\" before showing the app?",
        answer: "It creates a sense of exclusive investment — you did work specifically for them, which makes what you are about to show feel personalized not generic",
        wrong: [
          "It is a transition line that moves from the hook to the reveal",
          "It builds anticipation so they pay more attention to the app",
          "It establishes that the next step is a demonstration not a pitch",
        ],
      },
      {
        question: "Why does \"steal you for 20 mins\" work better than \"can I have 20 minutes of your time\"?",
        answer: "\"Steal\" is self-aware and disarming — it acknowledges you are asking for something while making it feel light, which lowers resistance compared to a formal time request",
        wrong: [
          "It is shorter and easier to say under pressure",
          "It makes the meeting feel casual so the owner does not prepare objections",
          "It mirrors the language business owners use when they are busy",
        ],
      },
      {
        question: "What makes the option close \"mornings, afternoons or evenings\" more effective than asking \"when works for you\"?",
        answer: "Option closes remove the escape hatch — the owner chooses between times instead of choosing between yes and no, which assumes the meeting is happening",
        wrong: [
          "It gives the owner a sense of control which builds trust",
          "It is faster to say which keeps the momentum going",
          "Three options statistically produce more yeses than open-ended questions",
        ],
      },
    ],
  },
  {
    key: "cold_calling",
    name: "Cold Calling Script",
    lines: [
      "Hey, is this the owner?",
      "Quick question — if I could line up 25 new [customers] for you next month, you be able to take them ok?",
      "So the way we do it — there are people in your area searching for [their service] right now, and they're landing on your competition's page. We redirect that traffic to you instead.",
      "I would love to steal you this week, to show you how we would do that and show you the app we made you. Does mornings, afternoons or evenings work for you?",
      "Perfect. I'll send you a calendar link right now while we're on the phone.",
    ],
    quiz: [
      {
        question: "Why do you confirm \"is this the owner\" before saying anything else on a cold call?",
        answer: "Every second of your pitch delivered to a non-decision maker is wasted — confirming owner status first means every word after it has a chance of producing a booking",
        wrong: [
          "It is a legal requirement before pitching",
          "It establishes rapport by showing you are looking for them specifically",
          "It is a compliance technique that gets them to confirm their identity",
        ],
      },
      {
        question: "What is the tone you should use when asking the opener question on a cold call?",
        answer: "Casual and genuinely curious — not urgent or excited — so it sounds like a real question not the opening of a sales call",
        wrong: [
          "Confident and direct to establish authority immediately",
          "Enthusiastic to create energy and engagement",
          "Professional and formal to signal you are a serious company",
        ],
      },
      {
        question: "Why does \"redirect that traffic to you\" work better than \"take traffic from your competitors\"?",
        answer: "Redirect frames it as giving something to the owner — their customers coming to them — while \"steal\" or \"take\" frames it as aggression which creates friction",
        wrong: [
          "Redirect is a marketing term prospects understand better",
          "It is more accurate technically to what the service does",
          "Redirect sounds more passive which is less threatening to skeptical owners",
        ],
      },
      {
        question: "What does \"I actually spent time building something out for your business specifically\" accomplish on a cold call where they cannot see anything yet?",
        answer: "It creates curiosity and perceived investment — they want to know what you built, and the word \"specifically\" signals this is not a generic pitch",
        wrong: [
          "It transitions from the hook to the booking ask",
          "It establishes credibility by showing you have done research",
          "It is a compliance line that gets them to agree to receive something",
        ],
      },
      {
        question: "Why do you send the calendar link while still on the phone instead of after hanging up?",
        answer: "Show rate drops significantly without an immediate link — the booking is only real when it is on the calendar, and momentum exists only while you are still talking",
        wrong: [
          "It is faster and more efficient for your workflow",
          "It shows you are organized and prepared",
          "It prevents the owner from forgetting the conversation after hanging up",
        ],
      },
      {
        question: "What is the correct response if the owner says \"I don't really have time right now\" after you ask for the 20-minute meeting?",
        answer: "Acknowledge and anchor to a specific time — \"totally, what does your schedule look like later this week\" — do not withdraw the ask, redirect it to a future time slot",
        wrong: [
          "Apologize and offer to call back at a more convenient time",
          "Ask them what time would work and wait for them to suggest something",
          "Thank them for their time and end the call professionally",
        ],
      },
    ],
  },
];

const normalizeForMatch = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "—")
    .replace(/\s+/g, " ");

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const lineMatches = (input: string, template: string) => {
  const normalizedTemplate = normalizeForMatch(template);
  const normalizedInput = normalizeForMatch(input);
  const parts = normalizedTemplate.split(/(\[[^\]]+\])/g);
  const pattern = parts
    .map((part) => (part.startsWith("[") && part.endsWith("]") ? ".+" : escapeRegex(part)))
    .join("");
  return new RegExp(`^${pattern}$`, "i").test(normalizedInput);
};

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const calculateStreak = (currentStreak: number, lastPracticedAt?: string | null) => {
  const today = getTodayKey();
  const last = lastPracticedAt ? new Date(lastPracticedAt).toISOString().slice(0, 10) : null;
  if (last === today) return Math.max(currentStreak, 1);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (last === yesterday.toISOString().slice(0, 10)) return currentStreak + 1;
  return 1;
};

function TechniqueQuiz({ script }: { script: ScriptDefinition }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const quizOptions = useMemo(
    () => script.quiz.map((q) => [q.answer, ...q.wrong]),
    [script.quiz]
  );
  const correctCount = script.quiz.reduce((sum, _, idx) => sum + (answers[idx] === 0 ? 1 : 0), 0);

  return (
    <div className="mt-5 rounded-xl border border-primary/15 bg-background/30 p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Technique Quiz</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">6 questions on why each line works and how to deliver it.</p>
        </div>
        {submitted && <Badge variant="outline" className="w-fit border-primary/30 text-primary">{correctCount}/6 correct</Badge>}
      </div>
      <div className="space-y-4">
        {script.quiz.map((q, qIndex) => (
          <div key={q.question} className="rounded-lg border border-border/45 bg-secondary/20 p-3 sm:p-4">
            <p className="text-sm font-medium leading-snug text-foreground">{qIndex + 1}. {q.question}</p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {quizOptions[qIndex].map((option, optionIndex) => {
                const selected = answers[qIndex] === optionIndex;
                const isCorrect = optionIndex === 0;
                const showState = submitted;
                const state = showState && isCorrect
                  ? "border-[hsl(var(--success))]/50 bg-[hsl(var(--success))]/10"
                  : showState && selected && !isCorrect
                    ? "border-[hsl(var(--destructive))]/60 bg-[hsl(var(--destructive))]/10"
                    : selected
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/35 bg-background/35 hover:bg-primary/5";
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={submitted}
                    onClick={() => setAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }))}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left text-xs leading-relaxed text-foreground/85 transition-colors ${state}`}
                  >
                    <span className="mr-2 font-semibold text-primary">{String.fromCharCode(65 + optionIndex)}</span>{option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant={submitted ? "outline" : "default"}
          onClick={() => submitted ? (setSubmitted(false), setAnswers({})) : setSubmitted(true)}
          disabled={!submitted && Object.keys(answers).length < script.quiz.length}
        >
          {submitted ? "Reset Quiz" : "Submit Quiz"}
        </Button>
      </div>
    </div>
  );
}

function ScriptCard({ script, userId }: { script: ScriptDefinition; userId: string | null }) {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState("");
  const [lineStatuses, setLineStatuses] = useState<Record<number, LineStatus>>({});
  const [attemptsByLine, setAttemptsByLine] = useState<Record<number, number>>({});
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [lastPracticedAt, setLastPracticedAt] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const masteredCount = Object.values(lineStatuses).filter((status) => status === "mastered").length;
  const revealedCount = Object.values(lineStatuses).filter((status) => status === "revealed").length;
  const completedCount = masteredCount + revealedCount;
  const complete = completedCount >= script.lines.length;
  const currentAttempts = attemptsByLine[currentIndex] || 0;

  useEffect(() => {
    const loadProgress = async () => {
      if (!userId) return;
      const { data, error: loadError } = await (supabase as any)
        .from("nl_script_progress")
        .select("mastered_count,revealed_count,attempts,streak_days,last_practiced_at,line_statuses")
        .eq("user_id", userId)
        .eq("script_key", script.key)
        .maybeSingle();

      if (loadError || !data) return;
      const record = data as ProgressRecord;
      const savedStatuses = record.line_statuses || {};
      const mappedStatuses = Object.entries(savedStatuses).reduce<Record<number, LineStatus>>((acc, [key, value]) => {
        if (value === "mastered" || value === "revealed") acc[Number(key)] = value;
        return acc;
      }, {});
      setLineStatuses(mappedStatuses);
      setTotalAttempts(record.attempts || 0);
      setStreakDays(record.streak_days || 0);
      setLastPracticedAt(record.last_practiced_at || null);
      const nextIndex = script.lines.findIndex((_, idx) => !mappedStatuses[idx]);
      setCurrentIndex(nextIndex === -1 ? script.lines.length : nextIndex);
    };
    loadProgress();
  }, [script.key, script.lines, userId]);

  const persist = async (nextStatuses: Record<number, LineStatus>, nextAttempts: number, reset = false) => {
    if (!userId) return;
    const nextMastered = Object.values(nextStatuses).filter((status) => status === "mastered").length;
    const nextRevealed = Object.values(nextStatuses).filter((status) => status === "revealed").length;
    const now = new Date().toISOString();
    const nextStreak = reset ? streakDays : calculateStreak(streakDays, lastPracticedAt);
    setSaving(true);
    const { error: saveError } = await (supabase as any).from("nl_script_progress").upsert(
      {
        user_id: userId,
        script_key: script.key,
        mastered_count: nextMastered,
        revealed_count: nextRevealed,
        attempts: nextAttempts,
        streak_days: nextStreak,
        last_practiced_at: now,
        line_statuses: nextStatuses,
        updated_at: now,
      },
      { onConflict: "user_id,script_key" }
    );
    setSaving(false);
    if (saveError) {
      toast({ title: "Script progress was not saved", description: "Your practice still works, but the database save failed.", variant: "destructive" });
      return;
    }
    setStreakDays(nextStreak);
    setLastPracticedAt(now);
  };

  const completeLine = async (status: LineStatus) => {
    const nextStatuses = { ...lineStatuses, [currentIndex]: status };
    const nextIndex = currentIndex + 1;
    setLineStatuses(nextStatuses);
    setInput("");
    setError(false);
    setCurrentIndex(nextIndex);
    await persist(nextStatuses, totalAttempts);
  };

  const submitLine = async () => {
    if (complete || !script.lines[currentIndex]) return;
    const nextAttempts = totalAttempts + 1;
    setTotalAttempts(nextAttempts);
    setAttemptsByLine((prev) => ({ ...prev, [currentIndex]: (prev[currentIndex] || 0) + 1 }));
    if (lineMatches(input, script.lines[currentIndex])) {
      await completeLine("mastered");
      await persist({ ...lineStatuses, [currentIndex]: "mastered" }, nextAttempts);
      return;
    }
    setError(true);
    setShakeKey((key) => key + 1);
    await persist(lineStatuses, nextAttempts);
  };

  const revealLine = async () => {
    await completeLine("revealed");
  };

  const resetPractice = async () => {
    setStarted(true);
    setCurrentIndex(0);
    setInput("");
    setLineStatuses({});
    setAttemptsByLine({});
    setTotalAttempts(0);
    setError(false);
    await persist({}, 0, true);
  };

  return (
    <div className="rounded-2xl border border-primary/15 bg-card/70 p-4 shadow-[0_0_32px_hsl(var(--primary)/0.06)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{script.name}</h3>
            <Badge variant="outline" className="border-primary/30 text-primary"><Flame className="mr-1 h-3 w-3" /> {Math.max(streakDays, 0)} day streak</Badge>
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>{masteredCount} / {script.lines.length} lines mastered</span>
            <span>{revealedCount} revealed</span>
          </div>
          <Progress value={(masteredCount / script.lines.length) * 100} className="mt-2 h-1.5" />
        </div>
        <Button type="button" onClick={() => setStarted(true)} className="w-full gap-2 sm:w-auto">
          Start Practicing
          <CheckCircle2 className="h-4 w-4" />
        </Button>
      </div>

      <AnimatePresence>
        {started && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-5 space-y-4">
            <div className="rounded-xl border border-primary/20 bg-background/35 p-4 sm:p-5">
              {complete ? (
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h4 className="text-xl font-semibold text-foreground">{masteredCount}/{script.lines.length} Mastered</h4>
                  <p className="mt-2 text-sm text-muted-foreground">Mastered: {masteredCount} · Revealed: {revealedCount} · Streak: {Math.max(streakDays, 0)} days</p>
                  <Button type="button" onClick={resetPractice} disabled={saving} className="mt-5 gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Practice Again
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-xs font-bold text-primary">{currentIndex + 1}</span>
                      <span className="text-sm font-semibold text-foreground">Line {currentIndex + 1}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{completedCount} of {script.lines.length} complete</Badge>
                  </div>

                  {Object.entries(lineStatuses).length > 0 && (
                    <div className="mb-4 space-y-2">
                      {Object.entries(lineStatuses).map(([idx, status]) => (
                        <div key={idx} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${status === "mastered" ? "border-[hsl(var(--success))]/45 bg-[hsl(var(--success))]/10 text-foreground" : "border-primary/35 bg-primary/10 text-primary"}`}>
                          {status === "mastered" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--success))]" /> : <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                          <span className="font-semibold">Line {Number(idx) + 1}</span>
                          <span className="ml-auto shrink-0 uppercase tracking-wider">{status === "mastered" ? "Mastered" : "Revealed"}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <motion.div key={shakeKey} animate={error ? { x: [0, -8, 8, -5, 5, 0] } : { x: 0 }} transition={{ duration: 0.32 }}>
                    <Input
                      value={input}
                      onChange={(event) => {
                        setInput(event.target.value);
                        setError(false);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") submitLine();
                      }}
                      placeholder="Type Line from memory…"
                      className={`h-12 w-full border-primary/20 bg-background/70 text-base text-foreground placeholder:text-muted-foreground ${error ? "border-[hsl(var(--destructive))] focus-visible:ring-[hsl(var(--destructive))]" : ""}`}
                      autoFocus
                    />
                  </motion.div>

                  {error && <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-[hsl(var(--warning))]"><XCircle className="h-4 w-4" /> Not quite — try again</p>}

                  {currentAttempts >= 3 && (
                    <div className="mt-3 rounded-lg border border-primary/25 bg-primary/10 p-3">
                      <Button type="button" variant="outline" size="sm" onClick={revealLine} className="gap-2">
                        <Eye className="h-4 w-4" /> Reveal this line
                      </Button>
                      <p className="mt-2 text-sm leading-relaxed text-primary">{script.lines[currentIndex]}</p>
                      <Badge variant="outline" className="mt-2 border-primary/30 text-primary">Revealed</Badge>
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" onClick={submitLine} disabled={!input.trim() || saving} className="gap-2">
                      Submit Line
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TechniqueQuiz script={script} />
    </div>
  );
}

export function ScriptMemorizationVault() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  return (
    <section className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-2 border-primary/30 text-primary">Script Mastery</Badge>
          <h2 className="text-xl font-semibold text-foreground">Script Memorization Vault</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Practice the exact BDR scripts line by line, then test the technique behind each move.</p>
        </div>
        {!userId && <Badge variant="outline" className="w-fit border-[hsl(var(--warning))]/40 text-[hsl(var(--warning))]">Sign in to save progress</Badge>}
      </div>
      <div className="grid grid-cols-1 gap-5">
        {SCRIPTS.map((script) => <ScriptCard key={script.key} script={script} userId={userId} />)}
      </div>
    </section>
  );
}
