import { useMemo, useRef, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export interface ScriptDrillLine {
  prompt: string;
  answer: string;
}

interface ScriptDrillExerciseProps {
  lines: ScriptDrillLine[];
  trackId: string;
  moduleId: string;
  chapterId: string;
  onComplete: () => void;
  lockedPreview?: boolean;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[—–-]/g, " ")
    .replace(/[\[\]()]/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const similarity = (a: string, b: string) => {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return 0;
  const leftWords = left.split(" ");
  const rightWords = right.split(" ");
  const matches = leftWords.filter((word, index) => word === rightWords[index]).length;
  const wordOverlap = leftWords.filter((word) => rightWords.includes(word)).length;
  return Math.max(matches / rightWords.length, wordOverlap / rightWords.length);
};

export function ScriptDrillExercise({ lines, trackId, moduleId, chapterId, onComplete, lockedPreview = false }: ScriptDrillExerciseProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [incorrect, setIncorrect] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const current = lines[currentIndex];
  const progressValue = lines.length ? (completed.length / lines.length) * 100 : 0;
  const finished = completed.length === lines.length;

  const completedSet = useMemo(() => new Set(completed), [completed]);

  const focusInput = () => window.setTimeout(() => inputRef.current?.focus(), 40);

  const saveCompletion = async () => {
    if (lockedPreview) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");
      const { error } = await supabase.from("nl_training_progress").upsert(
        {
          user_id: user.id,
          track_id: trackId,
          module_id: moduleId,
          chapter_id: chapterId,
          status: "drill_completed",
          score: 100,
          attempts: 1,
          last_attempt_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        } as any,
        { onConflict: "user_id,module_id,chapter_id" } as any
      );
      if (error) throw error;
      onComplete();
    } catch (error) {
      toast({ title: "Drill completion was not saved", description: "Please try again before starting the quiz.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const submitLine = () => {
    if (lockedPreview) return;
    if (!current) return;
    if (similarity(answer, current.answer) >= 0.9) {
      const nextCompleted = [...completed, current.prompt];
      setCompleted(nextCompleted);
      setIncorrect(false);
      setAnswer("");
      if (nextCompleted.length < lines.length) {
        setCurrentIndex((idx) => idx + 1);
        focusInput();
      }
      return;
    }
    setIncorrect(true);
    focusInput();
  };

  if (finished) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/25 bg-primary/5 p-5 sm:p-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary mb-3" />
        <h2 className="text-2xl font-semibold text-foreground">Script Drilled ✓ — Quiz Now Unlocked</h2>
        <p className="mt-2 text-sm text-muted-foreground">Your memorization drill is complete. Start the chapter quiz while the script is fresh.</p>
        <Button onClick={saveCompletion} disabled={saving || lockedPreview} className="mt-5 gap-2">
          {saving ? "Saving…" : "Start Quiz"}
          <CheckCircle2 className="h-4 w-4" />
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-secondary/25 p-4 sm:p-6">
      <div className="mb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Script Drill — Type From Memory</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lockedPreview ? "Preview the script drill now. Completion unlocks after the previous module is complete." : "Type each line of the script exactly as written. You must complete all lines before the quiz unlocks."}</p>
          </div>
          <div className="rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary shrink-0">
            {completed.length} of {lines.length} lines completed
          </div>
        </div>
        <Progress value={progressValue} className="mt-4 h-1.5" />
      </div>

      <div className="mb-4 space-y-2">
        {lines.map((line, index) => (
          <div key={line.prompt} className={`rounded-lg border px-3 py-2 text-xs ${completedSet.has(line.prompt) ? "border-primary/30 bg-primary/10 text-foreground" : index === currentIndex ? "border-primary/40 bg-background/50 text-foreground" : "border-border/30 bg-background/20 text-muted-foreground"}`}>
            <span className="font-semibold text-primary">{line.prompt}</span>
            {completedSet.has(line.prompt) && <span className="ml-2">{line.answer}</span>}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-primary/25 bg-background/45 p-4">
        <div className="mb-3 text-sm font-semibold text-primary">{current.prompt}</div>
        <Textarea
          ref={inputRef}
          value={answer}
          onChange={(event) => {
            setAnswer(event.target.value);
            setIncorrect(false);
          }}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submitLine();
          }}
          className={`min-h-[120px] text-base leading-7 ${incorrect ? "border-destructive focus-visible:ring-destructive" : ""}`}
          placeholder="Type the full script line from memory…"
          disabled={lockedPreview}
          autoFocus
        />
        {incorrect && (
          <div className="mt-3 rounded-lg border border-primary/25 bg-primary/10 p-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-primary">Correct line</div>
            <p className="text-sm leading-relaxed text-foreground">{current.answer}</p>
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {incorrect && (
            <Button type="button" variant="outline" onClick={() => { setAnswer(""); setIncorrect(false); focusInput(); }} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          <Button type="button" onClick={submitLine} disabled={!answer.trim() || lockedPreview} className="gap-2">
            Submit Line
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
