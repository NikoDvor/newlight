import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Layers, RotateCcw, Search, Target, Trophy, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Difficulty = "beginner" | "intermediate" | "advanced";
type CardStatus = "new" | "learning" | "mastered";
type Mode = "browse" | "drill" | "test";

interface Flashcard {
  id: string;
  category: string;
  front: string;
  back: string;
  difficulty: Difficulty;
}

interface FlashcardProgress {
  flashcard_id: string;
  status: CardStatus;
  times_seen: number;
  times_correct: number;
  last_seen_at: string | null;
}

const difficultyClass: Record<Difficulty, string> = {
  beginner: "border-[hsl(152,60%,50%)]/30 bg-[hsl(152,60%,50%)]/10 text-[hsl(152,60%,65%)]",
  intermediate: "border-[hsl(var(--nl-gold))]/30 bg-[hsl(var(--nl-gold))]/10 text-[hsl(var(--nl-gold))]",
  advanced: "border-destructive/30 bg-destructive/10 text-destructive",
};

const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, "");
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

function approachOption(card: Flashcard) {
  const text = normalizeText(card.back);
  if (text.includes("what specifically") || text.includes("can i ask") || text.includes("what would")) {
    return "Ask a clarifying question, isolate the real concern, then guide the next step.";
  }
  if (text.includes("does [day]") || text.includes("book") || text.includes("follow-up")) {
    return "Acknowledge briefly, then secure a specific next appointment or follow-up time.";
  }
  if (text.includes("system") || text.includes("built")) {
    return "Reframe from price or marketing tactics to the complete system being built.";
  }
  return "Validate the concern, tie it back to business impact, and keep the conversation moving.";
}

const distractors = [
  "Defend NewLight immediately and explain every feature before asking another question.",
  "Offer a discount right away so the prospect feels less pressure.",
  "Send information without booking a next step and wait for them to reply.",
  "Accept the objection as final and mark the lead rejected immediately.",
  "Push past the concern without acknowledging what they said.",
];

function FlashcardFace({ card, flipped, onFlip }: { card: Flashcard; flipped: boolean; onFlip: () => void }) {
  return (
    <button type="button" onClick={onFlip} className="group w-full min-h-[300px] [perspective:1200px] text-left">
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative min-h-[300px] w-full [transform-style:preserve-3d]"
      >
        <div className="absolute inset-0 rounded-2xl border border-border/60 bg-secondary/80 p-5 shadow-2xl [backface-visibility:hidden] flex flex-col justify-between">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{card.category}</Badge>
            <Badge variant="outline" className={difficultyClass[card.difficulty]}>{card.difficulty}</Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold leading-tight text-foreground">“{card.front}”</p>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Tap to reveal response</span>
        </div>
        <div className="absolute inset-0 rounded-2xl border border-primary/40 bg-primary p-5 shadow-[0_24px_80px_-32px_hsl(var(--primary))] [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col justify-between">
          <Badge className="w-fit bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/15">NewLight response</Badge>
          <p className="text-base sm:text-lg leading-relaxed text-primary-foreground">{card.back}</p>
          <span className="text-xs uppercase tracking-wider text-primary-foreground/75">Tap to flip back</span>
        </div>
      </motion.div>
    </button>
  );
}

export default function AdminTrainingFlashcards() {
  const navigate = useNavigate();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [progress, setProgress] = useState<Record<string, FlashcardProgress>>({});
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("browse");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [query, setQuery] = useState("");
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [drillDeck, setDrillDeck] = useState<Flashcard[]>([]);
  const [drillIndex, setDrillIndex] = useState(0);
  const [testDeck, setTestDeck] = useState<Flashcard[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [testComplete, setTestComplete] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: cardData } = await (supabase as any)
        .from("nl_training_flashcards")
        .select("id, category, front, back, difficulty")
        .eq("track_key", "bdr")
        .order("category");
      const cardRows = (cardData || []) as Flashcard[];
      setCards(cardRows);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: progData } = await (supabase as any)
          .from("nl_training_flashcard_progress")
          .select("flashcard_id, status, times_seen, times_correct, last_seen_at")
          .eq("user_id", user.id);
        const now = Date.now();
        const mapped: Record<string, FlashcardProgress> = {};
        (progData || []).forEach((row: FlashcardProgress) => {
          const stale = row.status === "mastered" && row.last_seen_at && now - new Date(row.last_seen_at).getTime() > 7 * 24 * 60 * 60 * 1000;
          mapped[row.flashcard_id] = stale ? { ...row, status: "learning" } : row;
        });
        setProgress(mapped);
      }
      setLoading(false);
    };
    load();
  }, []);

  const categories = useMemo(() => Array.from(new Set(cards.map((card) => card.category))), [cards]);
  const masteredCount = cards.filter((card) => progress[card.id]?.status === "mastered").length;
  const masteryPct = cards.length ? Math.round((masteredCount / cards.length) * 100) : 0;
  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((card) =>
      (category === "all" || card.category === category) &&
      (difficulty === "all" || card.difficulty === difficulty) &&
      (!q || `${card.front} ${card.back} ${card.category}`.toLowerCase().includes(q))
    );
  }, [cards, category, difficulty, query]);

  const updateProgress = async (card: Flashcard, status: CardStatus, correct = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const current = progress[card.id];
    const next = {
      user_id: user.id,
      flashcard_id: card.id,
      status,
      times_seen: (current?.times_seen || 0) + 1,
      times_correct: (current?.times_correct || 0) + (correct || status === "mastered" ? 1 : 0),
      last_seen_at: new Date().toISOString(),
    };
    const { error } = await (supabase as any)
      .from("nl_training_flashcard_progress")
      .upsert(next, { onConflict: "user_id,flashcard_id" });
    if (error) {
      toast({ title: "Progress not saved", description: "Please try again.", variant: "destructive" });
      return;
    }
    setProgress((prev) => ({ ...prev, [card.id]: next }));
  };

  const startDrill = () => {
    const deck = shuffle(cards.filter((card) => progress[card.id]?.status !== "mastered"));
    setDrillDeck(deck);
    setDrillIndex(0);
    setFlipped({});
    setMode("drill");
  };

  const markDrill = async (status: CardStatus) => {
    const card = drillDeck[drillIndex];
    if (!card) return;
    await updateProgress(card, status, status === "mastered");
    setFlipped({});
    setDrillIndex((idx) => idx + 1);
  };

  const startTest = () => {
    setTestDeck(shuffle(cards).slice(0, 10));
    setAnswers({});
    setTestComplete(false);
    setMode("test");
  };

  const completeTest = async () => {
    for (const card of testDeck) {
      await updateProgress(card, answers[card.id] === approachOption(card) ? "mastered" : "learning", answers[card.id] === approachOption(card));
    }
    setTestComplete(true);
  };

  const score = testDeck.filter((card) => answers[card.id] === approachOption(card)).length;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/admin/training-center/bdr")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to BDR Track
      </Button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title">Objection Flashcards</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{cards.length} cards · {masteryPct}% mastered</p>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-border/40 bg-secondary/25 p-1">
          {(["browse", "drill", "test"] as Mode[]).map((item) => (
            <Button key={item} variant={mode === item ? "default" : "ghost"} size="sm" onClick={() => item === "drill" ? startDrill() : item === "test" ? startTest() : setMode("browse")} className="min-h-11 capitalize">
              {item}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Trophy className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Mastered</p><p className="text-xl font-semibold">{masteredCount}/{cards.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Zap className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Flashcard streak</p><p className="text-xl font-semibold">{Object.values(progress).some((p) => p.last_seen_at?.startsWith(new Date().toISOString().slice(0, 10))) ? "Active" : "Start today"}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-2">Mastery</p><Progress value={masteryPct} className="h-2" /><p className="mt-2 text-sm font-semibold">{masteryPct}%</p></CardContent></Card>
      </div>

      {mode === "browse" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_180px] gap-3">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search objections or responses…" className="pl-10 min-h-11" /></div>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="min-h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value="all">All categories</option>{categories.map((cat) => <option key={cat}>{cat}</option>)}</select>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="min-h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground"><option value="all">All difficulties</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select>
          </div>
          {categories.map((cat) => {
            const catCards = filteredCards.filter((card) => card.category === cat);
            if (!catCards.length) return null;
            return <section key={cat} className="space-y-3"><h2 className="section-title">{cat}</h2><div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{catCards.map((card) => <div key={card.id} className="space-y-3"><FlashcardFace card={card} flipped={!!flipped[card.id]} onFlip={() => setFlipped((prev) => ({ ...prev, [card.id]: !prev[card.id] }))} />{!!flipped[card.id] && <div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><Button variant="outline" onClick={() => updateProgress(card, "learning")}>Still Learning</Button><Button variant="outline" onClick={() => updateProgress(card, "learning", true)}>Getting It</Button><Button onClick={() => updateProgress(card, "mastered", true)}>Mastered</Button></div>}</div>)}</div></section>;
          })}
        </div>
      )}

      {mode === "drill" && (
        <div className="mx-auto max-w-3xl space-y-5">
          {drillIndex < drillDeck.length ? <>
            <div><div className="flex justify-between text-xs text-muted-foreground mb-2"><span>Card {drillIndex + 1} of {drillDeck.length}</span><span>{Math.max(drillDeck.length - drillIndex - 1, 0)} remaining</span></div><Progress value={drillDeck.length ? ((drillIndex + 1) / drillDeck.length) * 100 : 0} className="h-2" /></div>
            <FlashcardFace card={drillDeck[drillIndex]} flipped={!!flipped.drill} onFlip={() => setFlipped((prev) => ({ ...prev, drill: !prev.drill }))} />
            {!!flipped.drill && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Button variant="outline" onClick={() => markDrill("learning")}>Still Learning</Button><Button onClick={() => markDrill("mastered")}>Mastered</Button></div>}
          </> : <div className="rounded-2xl border border-border/40 bg-secondary/30 p-8 text-center"><CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary" /><h2 className="text-xl font-semibold">Drill complete</h2><p className="mt-2 text-sm text-muted-foreground">Mastered cards exited rotation. Review learning cards again tomorrow.</p><Button onClick={startDrill} className="mt-5 gap-2"><RotateCcw className="h-4 w-4" />Start another drill</Button></div>}
        </div>
      )}

      {mode === "test" && (
        <div className="space-y-4">
          {!testComplete ? <>
            {testDeck.map((card, index) => {
              const options = shuffle([approachOption(card), ...shuffle(distractors).slice(0, 3)]);
              return <Card key={card.id}><CardContent className="p-4 sm:p-5 space-y-3"><div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">Question {index + 1}</Badge><Badge variant="outline" className={difficultyClass[card.difficulty]}>{card.difficulty}</Badge></div><p className="text-lg font-semibold text-foreground">“{card.front}”</p><div className="grid grid-cols-1 gap-2">{options.map((option) => <button key={option} onClick={() => setAnswers((prev) => ({ ...prev, [card.id]: option }))} className={cn("min-h-11 rounded-lg border px-3 py-2 text-left text-sm transition-colors", answers[card.id] === option ? "border-primary bg-primary/10 text-foreground" : "border-border/50 hover:bg-secondary/50 text-foreground/85")}>{option}</button>)}</div></CardContent></Card>;
            })}
            <Button onClick={completeTest} disabled={Object.keys(answers).length < testDeck.length} className="w-full sm:w-auto gap-2"><Target className="h-4 w-4" />Score Test</Button>
          </> : <div className="rounded-2xl border border-border/40 bg-secondary/30 p-6"><h2 className="text-2xl font-semibold">Score: {Math.round((score / testDeck.length) * 100)}%</h2><p className="mt-1 text-sm text-muted-foreground">{score} of {testDeck.length} response approaches correct.</p><div className="mt-5 space-y-3">{testDeck.filter((card) => answers[card.id] !== approachOption(card)).map((card) => <div key={card.id} className="rounded-lg border border-border/40 p-4"><p className="font-medium">“{card.front}”</p><p className="mt-2 text-sm text-primary">Best approach: {approachOption(card)}</p></div>)}</div><Button onClick={startTest} className="mt-5">New Test</Button></div>}
        </div>
      )}

      {loading && <div className="text-sm text-muted-foreground">Loading flashcards…</div>}
    </div>
  );
}
