import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Lock, CheckCircle2, Circle, PlayCircle, Award, BookOpen, TrendingUp, Star, Search, PlusCircle, Layers, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MetricCard } from "@/components/MetricCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ChapterRunner, ChapterRow } from "@/components/training/ChapterRunner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface Module {
  id: string;
  module_number: number;
  module_title: string;
  module_description: string | null;
  is_locked: boolean;
}

interface Chapter {
  id: string;
  chapter_number: number;
  chapter_title: string;
  content: string | null;
  module_id: string;
}

interface LevelProgressRow {
  chapter_id: string;
  quiz_level: 1 | 2 | 3;
  status: string;
}

interface ProgressRow {
  module_id: string;
  chapter_id: string | null;
  status: string;
  score?: number | null;
}

interface GlossaryTerm {
  id: string;
  module_id: string;
  category: string;
  term: string;
  definition: string;
  usage_example: string;
  sort_order: number;
}

interface FlashcardRow {
  id: string;
  category: string;
  front: string;
  back: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

interface FlashcardProgressRow {
  flashcard_id: string;
  status: string;
  times_seen: number;
  last_seen_at: string | null;
}

const GLOSSARY_CATEGORIES = [
  "Sales Fundamentals",
  "Sales Techniques",
  "NewLight-Specific Terms",
  "Metrics and Performance",
];

export default function AdminTrainingTrack() {
  const { trackKey } = useParams<{ trackKey: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [trackName, setTrackName] = useState("");
  const [modules, setModules] = useState<Module[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [levelProgress, setLevelProgress] = useState<LevelProgressRow[]>([]);
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardRow[]>([]);
  const [flashProgress, setFlashProgress] = useState<Record<string, FlashcardProgressRow>>({});
  const [flippedFlashcards, setFlippedFlashcards] = useState<Record<string, boolean>>({});
  const [flashcardStats, setFlashcardStats] = useState({ total: 0, mastered: 0 });
  const [glossarySearch, setGlossarySearch] = useState("");
  const [newTerm, setNewTerm] = useState({ category: "Sales Fundamentals", term: "", definition: "", usage_example: "" });
  const [savingGlossary, setSavingGlossary] = useState(false);
  const [canManageGlossary, setCanManageGlossary] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [runner, setRunner] = useState<
    | { mode: "chapter"; chapter: ChapterRow; moduleId: string }
    | { mode: "module_test"; moduleId: string }
    | null
  >(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [hasCertification, setHasCertification] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: track } = await supabase
        .from("nl_training_tracks")
        .select("id, track_name")
        .eq("track_key", trackKey || "bdr")
        .maybeSingle();

      if (!track) {
        setLoading(false);
        return;
      }
      setTrackName(track.track_name);
      setTrackId(track.id);

      const { data: mods } = await supabase
        .from("nl_training_modules")
        .select("id, module_number, module_title, module_description, is_locked")
        .eq("track_id", track.id)
        .order("module_number");

      const moduleList = (mods || []) as Module[];
      setModules(moduleList);
      if (moduleList.length > 0 && !selectedModuleId) {
        setSelectedModuleId(moduleList[0].id);
      }

      if (moduleList.length > 0) {
        const ids = moduleList.map((m) => m.id);
        const { data: chs } = await supabase
          .from("nl_training_chapters")
          .select("id, chapter_number, chapter_title, content, module_id")
          .in("module_id", ids)
          .order("chapter_number");
        setChapters((chs || []) as Chapter[]);

        const { data: terms } = await (supabase as any)
          .from("nl_training_glossary_terms")
          .select("id, module_id, category, term, definition, usage_example, sort_order")
          .in("module_id", ids)
          .order("category")
          .order("term");
        setGlossaryTerms((terms || []) as GlossaryTerm[]);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles } = await (supabase as any)
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "operator"]);
        setCanManageGlossary((roles || []).length > 0);

        const { data: prog } = await supabase
          .from("nl_training_progress")
          .select("module_id, chapter_id, status, score")
          .eq("user_id", user.id);
        setProgress((prog || []) as ProgressRow[]);

        const { data: levels } = await (supabase as any)
          .from("nl_training_chapter_level_progress")
          .select("chapter_id, quiz_level, status")
          .eq("user_id", user.id);
        setLevelProgress((levels || []) as LevelProgressRow[]);

        if (track.track_name && (trackKey || "bdr") === "bdr") {
          const { data: cards } = await (supabase as any)
            .from("nl_training_flashcards")
            .select("id, category, front, back, difficulty")
            .eq("track_key", "bdr")
            .order("category");
          const cardRows = (cards || []) as FlashcardRow[];
          setFlashcards(cardRows);
          const cardIds = cardRows.map((card) => card.id);
          let mastered = 0;
          const mappedProgress: Record<string, FlashcardProgressRow> = {};
          if (cardIds.length > 0) {
            const { data: flashProgress } = await (supabase as any)
              .from("nl_training_flashcard_progress")
              .select("flashcard_id, status, times_seen, last_seen_at")
              .eq("user_id", user.id)
              .in("flashcard_id", cardIds);
            const now = Date.now();
            (flashProgress || []).forEach((row: FlashcardProgressRow) => {
              const stale = row.status === "mastered" && row.last_seen_at && now - new Date(row.last_seen_at).getTime() > 7 * 24 * 60 * 60 * 1000;
              mappedProgress[row.flashcard_id] = stale ? { ...row, status: "learning" } : row;
            });
            mastered = Object.values(mappedProgress).filter((row) => row.status === "mastered").length;
          }
          setFlashProgress(mappedProgress);
          setFlashcardStats({ total: cardIds.length, mastered });

          const { data: cert } = await supabase
            .from("nl_training_certifications")
            .select("id")
            .eq("user_id", user.id)
            .eq("track_key", "bdr")
            .eq("passed", true)
            .limit(1)
            .maybeSingle();
          setHasCertification(!!cert);
        }
      }

      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackKey, reloadTick]);

  const moduleStatus = (moduleId: string): "completed" | "in_progress" | "not_started" => {
    const rows = progress.filter((p) => p.module_id === moduleId && !p.chapter_id);
    if (rows.some((r) => r.status === "completed")) return "completed";
    if (rows.some((r) => r.status === "in_progress")) return "in_progress";
    const chRows = progress.filter((p) => p.module_id === moduleId);
    if (chRows.some((r) => r.status === "in_progress" || r.status === "completed")) return "in_progress";
    return "not_started";
  };

  const glossaryModule = modules.find((m) => m.module_number === 0) || null;
  const numberedModules = modules.filter((m) => m.module_number > 0).sort((a, b) => a.module_number - b.module_number);
  const selectedModule = modules.find((m) => m.id === selectedModuleId) || null;
  const isGlossaryModule = selectedModule?.module_number === 0;
  const selectedChapters = useMemo(
    () => chapters.filter((c) => c.module_id === selectedModuleId),
    [chapters, selectedModuleId]
  );

  const getChapterLevelCount = (chapterId: string) =>
    levelProgress.filter((p) => p.chapter_id === chapterId && p.status === "completed").length;

  const isChapterComplete = (chapterId: string) =>
    progress.some((p) => p.chapter_id === chapterId && p.status === "completed") || getChapterLevelCount(chapterId) === 3;

  const getChapterDescription = (chapter: Chapter) => {
    const first = (chapter.content || "").split("\n\n").find((part) => part.trim().length > 60) || "";
    return first.replace(/\s+/g, " ").slice(0, 150) + (first.length > 150 ? "…" : "");
  };

  const markFlashcardReviewed = async (card: FlashcardRow) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const current = flashProgress[card.id];
    const next = {
      user_id: user.id,
      flashcard_id: card.id,
      status: current?.status === "mastered" ? "mastered" : "learning",
      times_seen: (current?.times_seen || 0) + 1,
      last_seen_at: new Date().toISOString(),
    };
    const { error } = await (supabase as any)
      .from("nl_training_flashcard_progress")
      .upsert(next, { onConflict: "user_id,flashcard_id" });
    if (!error) setFlashProgress((prev) => ({ ...prev, [card.id]: next }));
  };

  const completeModule6Drill = async () => {
    if (!trackId || !selectedModule || selectedModule.module_number !== 6) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("nl_training_progress").upsert({
      user_id: user.id,
      track_id: trackId,
      module_id: selectedModule.id,
      chapter_id: null,
      status: "in_progress",
      score: 100,
      attempts: 1,
      last_attempt_at: new Date().toISOString(),
    }, { onConflict: "user_id,module_id,chapter_id" } as any);
    setReloadTick((t) => t + 1);
    toast({ title: "Objection drill complete", description: "Module 6 test is now unlocked." });
  };

  const moduleChapterPct = (moduleId: string) => {
    const module = modules.find((m) => m.id === moduleId);
    const moduleChapters = chapters.filter((c) => c.module_id === moduleId);
    if (module?.module_number === 0) {
      return moduleChapters.some((c) => isChapterComplete(c.id)) || moduleStatus(moduleId) === "completed" ? 100 : 0;
    }
    const total = moduleChapters.length * 3;
    if (total === 0) return 0;
    const done = moduleChapters.reduce((sum, c) => sum + getChapterLevelCount(c.id), 0);
    return Math.round((done / total) * 100);
  };

  const selectedGlossaryTerms = useMemo(() => {
    const q = glossarySearch.trim().toLowerCase();
    return glossaryTerms
      .filter((term) => term.module_id === selectedModuleId)
      .filter((term) => !q || `${term.term} ${term.definition} ${term.usage_example}`.toLowerCase().includes(q))
      .sort((a, b) => a.category.localeCompare(b.category) || a.sort_order - b.sort_order || a.term.localeCompare(b.term));
  }, [glossarySearch, glossaryTerms, selectedModuleId]);

  const module6ReviewedCount = flashcards.filter((card) => (flashProgress[card.id]?.times_seen || 0) > 0).length;
  const module6DrillReady = flashcards.length > 0 && module6ReviewedCount >= flashcards.length;
  const isModule6 = trackKey === "bdr" && selectedModule?.module_number === 6;
  const module6DrillComplete = !!selectedModule && progress.some((p) => p.module_id === selectedModule.id && !p.chapter_id && p.status === "in_progress" && p.score === 100);
  const flashcardsByCategory = useMemo(() => {
    return flashcards.reduce<Record<string, FlashcardRow[]>>((acc, card) => {
      acc[card.category] = [...(acc[card.category] || []), card];
      return acc;
    }, {});
  }, [flashcards]);

  const markGlossaryReviewed = async () => {
    const chapter = selectedChapters[0];
    if (!trackId || !selectedModule || !chapter) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      user_id: user.id,
      track_id: trackId,
      module_id: selectedModule.id,
      status: "completed",
      score: 100,
      attempts: 1,
      last_attempt_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };
    await supabase.from("nl_training_progress").upsert({ ...payload, chapter_id: chapter.id }, { onConflict: "user_id,module_id,chapter_id" } as any);
    await supabase.from("nl_training_progress").upsert({ ...payload, chapter_id: null }, { onConflict: "user_id,module_id,chapter_id" } as any);
    setReloadTick((t) => t + 1);
    toast({ title: "Glossary reviewed", description: "Your review has been saved." });
  };

  const addGlossaryTerm = async () => {
    if (!trackId || !selectedModule || !selectedChapters[0] || !newTerm.term.trim() || !newTerm.definition.trim()) return;
    setSavingGlossary(true);
    try {
      const { error } = await (supabase as any).from("nl_training_glossary_terms").insert({
        track_id: trackId,
        module_id: selectedModule.id,
        chapter_id: selectedChapters[0].id,
        category: newTerm.category,
        term: newTerm.term.trim(),
        definition: newTerm.definition.trim(),
        usage_example: newTerm.usage_example.trim(),
        sort_order: glossaryTerms.length + 1,
      });
      if (error) throw error;
      setNewTerm({ category: "Sales Fundamentals", term: "", definition: "", usage_example: "" });
      setReloadTick((t) => t + 1);
      toast({ title: "Term added", description: "The glossary term is now available in training." });
    } catch (error) {
      toast({ title: "Could not add term", description: "Check for duplicate terms or missing fields.", variant: "destructive" });
    } finally {
      setSavingGlossary(false);
    }
  };

  const totalModules = numberedModules.length;
  const completedModules = numberedModules.filter((m) => moduleStatus(m.id) === "completed").length;
  const overallPct = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

  if (runner && trackId) {
    return (
      <ChapterRunner
        mode={runner.mode}
        chapter={runner.mode === "chapter" ? runner.chapter : undefined}
        moduleId={runner.moduleId}
        trackId={trackId}
        onClose={() => setRunner(null)}
        onCompleted={() => setReloadTick((t) => t + 1)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/training-center")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="page-title">{trackName || "Training Track"}</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Modules, chapters, and certification progress
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        {/* Module list */}
        <motion.div
          className="card-widget p-0 overflow-hidden"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="p-4 border-b border-border/40">
            <h3 className="section-title">Modules</h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <>
                {modules.map((m) => {
                  const status = moduleStatus(m.id);
                  const isSelected = selectedModuleId === m.id;
                    return (
                      <div key={m.id}>
                    <button
                      onClick={() => setSelectedModuleId(m.id)}
                      className={`w-full text-left px-4 py-3 border-b transition-all duration-200 flex items-start gap-3 ${
                        m.module_number === 0
                          ? isSelected
                            ? "bg-primary/10 border-primary/25"
                            : "bg-secondary/35 border-primary/10 hover:bg-primary/5"
                          : isSelected
                            ? "bg-primary/[0.08] border-border/30"
                            : "border-border/30 hover:bg-white/[0.03]"
                      }`}
                      style={
                        isSelected
                          ? {
                              boxShadow: "inset 3px 0 0 0 hsl(var(--nl-neon))",
                            }
                          : undefined
                      }
                    >
                      <div
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5"
                        style={{
                          background: isSelected
                            ? "hsla(211,96%,60%,.22)"
                            : "hsla(220,15%,20%,.5)",
                          color: isSelected ? "hsl(var(--nl-neon))" : "hsl(var(--muted-foreground))",
                        }}
                      >
                        {m.module_number === 0 ? "📖" : m.module_number}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-[13px] font-medium truncate ${isSelected ? "text-foreground" : "text-foreground/85"}`}>
                            {m.module_number === 0 ? "📖 Terminology & Glossary" : m.module_title}
                          </p>
                          {m.is_locked && (
                            <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {status === "completed" ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-[hsl(152,60%,50%)]" />
                              <span className="text-[10px] text-[hsl(152,60%,50%)] font-medium">Complete</span>
                            </>
                          ) : status === "in_progress" ? (
                            <>
                              <PlayCircle className="h-3 w-3 text-[hsl(var(--nl-neon))]" />
                              <span className="text-[10px] text-[hsl(var(--nl-neon))] font-medium">In progress</span>
                            </>
                          ) : (
                            <>
                              <Circle className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground font-medium">{m.module_number === 0 ? "Reference" : "Not started"}</span>
                            </>
                          )}
                        </div>
                      </div>
                      </button>
                      {trackKey === "bdr" && m.module_number === 0 && (
                        <button
                          onClick={() => navigate("/admin/training-center/bdr/flashcards")}
                          className="w-full text-left px-4 py-3 border-b border-primary/10 transition-all duration-200 flex items-start gap-3 bg-secondary/25 hover:bg-primary/5"
                        >
                          <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-primary/10">
                            <Layers className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-foreground/90 truncate">🃏 Flashcards</p>
                            <p className="mt-1 text-[10px] text-primary font-medium">{flashcardStats.mastered}/{flashcardStats.total || 28} cards mastered</p>
                          </div>
                        </button>
                      )}
                      </div>
                  );
                })}
                {trackKey === "bdr" && (
                  <>
                    <button
                      onClick={() => overallPct === 100 && navigate("/admin/training-center/bdr/certification")}
                      disabled={overallPct < 100}
                      className={`w-full text-left px-4 py-3 transition-all duration-200 flex items-start gap-3 ${
                        overallPct === 100 ? "hover:bg-white/[0.03]" : "opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-secondary">
                        {hasCertification ? (
                          <Star className="h-3.5 w-3.5 text-[hsl(var(--nl-gold))]" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground/85 truncate">Certification Exam</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          {hasCertification ? (
                            <Badge className="h-5 bg-[hsl(var(--nl-gold)/.16)] text-[hsl(var(--nl-gold))] border border-[hsl(var(--nl-gold)/.28)] hover:bg-[hsl(var(--nl-gold)/.16)] px-2 text-[10px]">
                              BDR Certified ✓
                            </Badge>
                          ) : overallPct === 100 ? (
                            <span className="text-[10px] text-[hsl(var(--nl-neon))] font-medium">Unlocked</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-medium">Certification Locked</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Module detail */}
        <motion.div
          className="card-widget"
          key={selectedModuleId || "empty"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {selectedModule ? (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="font-medium">
                      {isGlossaryModule ? "Reference" : `Module ${selectedModule.module_number}`}
                    </Badge>
                    {selectedModule.is_locked && (
                      <Badge variant="outline" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Locked
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {selectedModule.module_title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
                    {selectedModule.module_description ||
                      "Module content and chapters will appear here once authored."}
                  </p>
                </div>
              </div>

              {!isGlossaryModule && <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Chapter completion
                  </span>
                  <span className="text-[11px] font-semibold text-foreground">
                    {moduleChapterPct(selectedModule.id)}%
                  </span>
                </div>
                <Progress value={moduleChapterPct(selectedModule.id)} className="h-1.5" />
              </div>}

              {isGlossaryModule ? (
                <div className="space-y-5">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={glossarySearch}
                      onChange={(event) => setGlossarySearch(event.target.value)}
                      placeholder="Search terminology, definitions, or examples…"
                      className="pl-10 h-11"
                    />
                  </div>

                  {GLOSSARY_CATEGORIES.map((category) => {
                    const terms = selectedGlossaryTerms.filter((term) => term.category === category);
                    if (terms.length === 0) return null;
                    return (
                      <section key={category} className="space-y-3">
                        <div className="rounded-lg border border-primary/25 bg-primary/15 px-4 py-3 shadow-[0_0_24px_hsl(var(--primary)/0.08)]">
                          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-primary">{category}</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {terms.map((term) => (
                            <article key={term.id} className="rounded-lg border border-border/45 border-l-4 border-l-primary bg-card/70 p-4 shadow-sm">
                              <h4 className="text-base font-bold text-primary">{term.term}</h4>
                              <p className="mt-2 text-sm leading-relaxed text-foreground">{term.definition}</p>
                              {term.usage_example && (
                                <blockquote className="mt-3 border-l border-primary/35 pl-3 text-sm italic leading-relaxed text-muted-foreground">
                                  Example: {term.usage_example}
                                </blockquote>
                              )}
                            </article>
                          ))}
                        </div>
                      </section>
                    );
                  })}

                  {selectedGlossaryTerms.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
                      No glossary terms match your search.
                    </div>
                  )}

                  {canManageGlossary && <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                    <h3 className="section-title mb-3">Admin: Add glossary term</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        value={newTerm.category}
                        onChange={(event) => setNewTerm((prev) => ({ ...prev, category: event.target.value }))}
                        className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                      >
                        {GLOSSARY_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                      </select>
                      <Input value={newTerm.term} onChange={(event) => setNewTerm((prev) => ({ ...prev, term: event.target.value }))} placeholder="Term name" />
                      <Textarea value={newTerm.definition} onChange={(event) => setNewTerm((prev) => ({ ...prev, definition: event.target.value }))} placeholder="Definition" className="sm:col-span-2" />
                      <Textarea value={newTerm.usage_example} onChange={(event) => setNewTerm((prev) => ({ ...prev, usage_example: event.target.value }))} placeholder="Usage example" className="sm:col-span-2" />
                    </div>
                    <Button onClick={addGlossaryTerm} disabled={savingGlossary || !newTerm.term.trim() || !newTerm.definition.trim()} className="mt-3 gap-2">
                      <PlusCircle className="h-4 w-4" />
                      {savingGlossary ? "Adding…" : "Add Term"}
                    </Button>
                  </div>}

                  <div className="flex justify-end">
                    <Button onClick={markGlossaryReviewed} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Mark as Reviewed
                    </Button>
                  </div>
                </div>
              ) : <div className="space-y-2 mb-6">
                <h3 className="section-title mb-2">Chapters</h3>
                {selectedChapters.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/50 p-6 text-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No chapters authored yet for this module.
                    </p>
                  </div>
                ) : (
                  selectedChapters.map((c, idx) => {
                    const levelCount = getChapterLevelCount(c.id);
                    const done = isChapterComplete(c.id);
                    // A chapter is unlocked if it's the first one OR the previous chapter is complete
                    const prev = selectedChapters[idx - 1];
                    const prevDone = !prev || isChapterComplete(prev.id);
                    const unlocked = !selectedModule.is_locked && prevDone;
                    return (
                      <button
                        key={c.id}
                        onClick={() =>
                          unlocked && trackId && setRunner({
                            mode: "chapter",
                            chapter: c as ChapterRow,
                            moduleId: selectedModule.id,
                          })
                        }
                        disabled={!unlocked}
                        className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-lg border border-border/40 transition-colors ${
                          unlocked ? "hover:bg-white/[0.03] cursor-pointer" : "opacity-50 cursor-not-allowed"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="h-4 w-4 text-[hsl(152,60%,50%)] shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[13px] text-foreground/90 font-medium">
                              {c.chapter_number}. {c.chapter_title}
                            </span>
                            {unlocked && !done && (
                              <span className="text-[10px] text-primary font-medium shrink-0">Open</span>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            {getChapterDescription(c)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {[1, 2, 3].map((level) => {
                              const complete = levelProgress.some((p) => p.chapter_id === c.id && p.quiz_level === level && p.status === "completed");
                              const locked = level > levelCount + 1;
                              return (
                                <Badge
                                  key={level}
                                  variant={complete ? "default" : "outline"}
                                  className={`h-5 px-2 text-[10px] ${locked ? "opacity-50" : ""}`}
                                >
                                  L{level} {complete ? "Complete" : locked ? "Locked" : "Unlocked"}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>}

              {isModule6 && !isGlossaryModule && (
                <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="section-title">Objection Drill</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Complete Objection Drill before taking the Module 6 test.</p>
                    </div>
                    <Badge variant="outline" className="w-fit border-primary/30 text-primary">{module6ReviewedCount} of {flashcards.length || 28} cards reviewed</Badge>
                  </div>
                  <Progress value={flashcards.length ? (module6ReviewedCount / flashcards.length) * 100 : 0} className="h-1.5" />
                  <div className="max-h-[560px] overflow-y-auto pr-1 space-y-4">
                    {Object.entries(flashcardsByCategory).map(([category, cards]) => (
                      <section key={category} className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</h4>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                          {cards.map((card) => {
                            const reviewed = (flashProgress[card.id]?.times_seen || 0) > 0;
                            const flipped = !!flippedFlashcards[card.id];
                            return (
                              <button
                                key={card.id}
                                type="button"
                                onClick={() => {
                                  setFlippedFlashcards((prev) => ({ ...prev, [card.id]: !prev[card.id] }));
                                  markFlashcardReviewed(card);
                                }}
                                className="min-h-[180px] rounded-xl border border-border/50 bg-secondary/35 p-4 text-left transition-colors hover:bg-secondary/55"
                              >
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px]">{card.category}</Badge>
                                  <Badge variant="outline" className="text-[10px] capitalize">{card.difficulty}</Badge>
                                  {reviewed && <CheckCircle2 className="ml-auto h-4 w-4 text-[hsl(152,60%,50%)]" />}
                                </div>
                                <p className="text-base font-semibold leading-snug text-foreground">“{card.front}”</p>
                                {flipped ? (
                                  <p className="mt-3 text-sm leading-relaxed text-foreground/85">{card.back}</p>
                                ) : (
                                  <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Tap to reveal and mark reviewed</p>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    {module6DrillComplete ? (
                      <Badge className="gap-2 bg-[hsl(152,60%,50%)]/15 text-[hsl(152,60%,65%)] hover:bg-[hsl(152,60%,50%)]/15">
                        <CheckCircle2 className="h-4 w-4" /> Drill Complete
                      </Badge>
                    ) : module6DrillReady ? (
                      <Button onClick={completeModule6Drill} className="gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Complete Drill
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Review every card to unlock completion.</span>
                    )}
                  </div>
                </div>
              )}

              {!isGlossaryModule && (() => {
                const allChaptersDone =
                  selectedChapters.length > 0 &&
                  selectedChapters.every((c) => isChapterComplete(c.id));
                const moduleDone = moduleStatus(selectedModule.id) === "completed";
                const testUnlocked = allChaptersDone && (!isModule6 || module6DrillComplete);
                return (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={selectedModule.is_locked || selectedChapters.length === 0}
                      onClick={() => {
                        const firstUndone = selectedChapters.find(
                          (c) => !isChapterComplete(c.id)
                        ) || selectedChapters[0];
                        if (firstUndone) {
                          setRunner({
                            mode: "chapter",
                            chapter: firstUndone as ChapterRow,
                            moduleId: selectedModule.id,
                          });
                        }
                      }}
                      className="gap-2"
                    >
                      <PlayCircle className="h-4 w-4" />
                      {moduleStatus(selectedModule.id) === "in_progress" ? "Continue" : "Start Module"}
                    </Button>

                    <Button
                      variant={testUnlocked && !moduleDone ? "default" : "outline"}
                      disabled={!testUnlocked || selectedModule.is_locked}
                      onClick={() =>
                        setRunner({ mode: "module_test", moduleId: selectedModule.id })
                      }
                      className="gap-2"
                    >
                      <Award className="h-4 w-4" />
                      {moduleDone ? "Module Test Passed" : isModule6 && allChaptersDone && !module6DrillReady ? "Complete Objection Drill First" : "Take Module Test"}
                    </Button>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Select a module to view details
            </div>
          )}
        </motion.div>
      </div>

      {runner && trackId && (
        <ChapterRunner
          mode={runner.mode}
          chapter={runner.mode === "chapter" ? runner.chapter : undefined}
          moduleId={runner.moduleId}
          trackId={trackId}
          onClose={() => setRunner(null)}
          onCompleted={() => setReloadTick((t) => t + 1)}
        />
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Progress"
          value={`${overallPct}%`}
          icon={TrendingUp}
        />
        <MetricCard
          label="Modules Completed"
          value={`${completedModules} / ${totalModules}`}
          icon={BookOpen}
        />
        <MetricCard label="Current Streak" value="0 days" icon={Flame} />
        <MetricCard label="Flashcard Mastery" value={`${flashcardStats.mastered}/${flashcardStats.total || 28}`} icon={Layers} />
      </div>
    </div>
  );
}
