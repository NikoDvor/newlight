import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Plus, X, History, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { BUILT_IN_QUOTES, DREAM_PROMPTS, daysLeft, loadWhy, saveWhy, type WhyRow } from "@/lib/academy";
import { Kicker } from "./ui";

/**
 * Module 9 — Your "Why". Private to the salesman (RLS: owner only, no admin read).
 * Goal + deadline → countdown on My Pipeline. Quotes → one per day on My Pipeline.
 * Changing the goal or deadline keeps the old one in history.
 */
export default function WhyBuilder({ onSaved }: { onSaved?: () => void }) {
  const { user } = useWorkspace();
  const { toast } = useToast();
  const [loaded, setLoaded] = useState(false);
  const [current, setCurrent] = useState<WhyRow | null>(null);
  const [history, setHistory] = useState<WhyRow[]>([]);
  const [goal, setGoal] = useState("");
  const [amount, setAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [dream, setDream] = useState("");
  const [mine, setMine] = useState<string[]>([]);
  const [kept, setKept] = useState<string[]>([]);
  const [newQuote, setNewQuote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    const r = await loadWhy(user.id);
    setCurrent(r.current); setHistory(r.history);
    if (r.current) {
      setGoal(r.current.goal); setAmount(r.current.goal_amount != null ? String(r.current.goal_amount) : "");
      setDeadline(r.current.deadline); setDream(r.current.dream_life || "");
      setMine(r.current.quotes || []); setKept(r.current.favorite_quotes || []);
    }
    setLoaded(true);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const addPrompt = (p: string) => setDream((d) => (d.trim() ? d.trimEnd() + "\n\n" : "") + p + " ");
  const toggleKept = (id: string) => setKept((k) => (k.includes(id) ? k.filter((x) => x !== id) : [...k, id]));

  const save = async () => {
    if (!user?.id) return;
    if (!goal.trim() || !deadline) { toast({ title: "Add your goal and a deadline", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const num = Number(amount.replace(/[^0-9.]/g, ""));
      await saveWhy(user.id, current, {
        goal: goal.trim(), goal_amount: amount.trim() && Number.isFinite(num) ? num : null, deadline,
        dream_life: dream.trim() || null, quotes: mine.filter((q) => q.trim()), favorite_quotes: kept,
      });
      toast({ title: "Saved", description: "Your countdown and daily quote are on My Pipeline." });
      await load();
      onSaved?.();
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e?.message || "Try again.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (!loaded) return <div className="py-8 text-center text-sm text-white/40">Loading…</div>;
  const left = deadline ? daysLeft(deadline) : null;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Kicker>Your why builder</Kicker>
        <span className="inline-flex items-center gap-1 text-[11px] text-white/50"><Lock className="h-3 w-3" />Only you can see this</span>
      </div>

      {/* 1. Goal */}
      <section className="mt-5">
        <h3 className="text-[15px] font-semibold text-white">1 · Your goal and deadline</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_160px]">
          <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Earn $150,000 this year" />
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="$ amount (optional)" />
          <Input type="date" min={today} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        {left != null && (
          <motion.div key={left} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 inline-flex items-baseline gap-2 rounded-lg border border-[hsla(197,100%,55%,.35)] bg-[hsla(197,100%,55%,.07)] px-3 py-1.5">
            <span className="text-xl font-bold tabular-nums text-white">{left}</span>
            <span className="text-[11px] uppercase tracking-wider text-[hsl(197,100%,68%)]">days left</span>
          </motion.div>
        )}
      </section>

      {/* 2. Quotes */}
      <section className="mt-7">
        <h3 className="text-[15px] font-semibold text-white">2 · Your quotes</h3>
        <p className="mt-1 text-[12px] text-white/50">Keep the ones that hit. Add your own. One shows each day. Keep none and they all rotate.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {BUILT_IN_QUOTES.map((q) => {
            const on = kept.includes(q.id);
            return (
              <button key={q.id} type="button" onClick={() => toggleKept(q.id)}
                className="rounded-lg border px-2.5 py-1.5 text-left text-[12px] transition-colors"
                style={{ borderColor: on ? "hsl(197,100%,58%)" : "hsla(0,0%,100%,.1)", background: on ? "hsla(197,100%,55%,.1)" : "transparent", color: on ? "white" : "hsla(0,0%,100%,.6)" }}>
                {on && <Check className="mr-1 inline h-3 w-3 text-[hsl(197,100%,65%)]" />}{q.text}
              </button>
            );
          })}
        </div>
        <div className="mt-3 space-y-1.5">
          <AnimatePresence initial={false}>
            {mine.map((q, i) => (
              <motion.div key={i + q} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 rounded-lg border border-[hsla(262,85%,74%,.3)] bg-[hsla(262,85%,74%,.06)] px-3 py-1.5 text-[13px] text-white">
                <span className="flex-1">{q}</span>
                <button type="button" aria-label="Remove" onClick={() => setMine(mine.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5 text-white/50" /></button>
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="flex gap-2">
            <Input value={newQuote} onChange={(e) => setNewQuote(e.target.value)} placeholder="Add your own quote"
              onKeyDown={(e) => { if (e.key === "Enter" && newQuote.trim()) { setMine([...mine, newQuote.trim()]); setNewQuote(""); } }} />
            <Button type="button" variant="outline" size="icon" disabled={!newQuote.trim()} onClick={() => { setMine([...mine, newQuote.trim()]); setNewQuote(""); }}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
      </section>

      {/* 3. Dream life */}
      <section className="mt-7">
        <h3 className="text-[15px] font-semibold text-white">3 · Your dream life</h3>
        <p className="mt-1 text-[12px] text-white/50">Write it like it already happened. Tap a prompt to start.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {DREAM_PROMPTS.map((p) => (
            <button key={p} type="button" onClick={() => addPrompt(p)} className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/65 hover:border-[hsla(197,100%,55%,.5)] hover:text-white">{p}</button>
          ))}
        </div>
        <Textarea value={dream} onChange={(e) => setDream(e.target.value)} rows={7} className="mt-3 text-[14px] leading-relaxed" placeholder="It's a year from now. I…" />
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : current ? "Save changes" : "Save my why"}</Button>
        {history.length > 0 && (
          <button type="button" onClick={() => setShowHistory(!showHistory)} className="inline-flex items-center gap-1 text-[12px] text-white/55 hover:text-white">
            <History className="h-3.5 w-3.5" />Past goals ({history.length})
          </button>
        )}
      </div>
      {current && <p className="mt-2 text-[11px] text-white/40">Changing the goal or deadline keeps the old one in Past goals.</p>}

      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 space-y-1.5 overflow-hidden">
            {history.map((h) => (
              <div key={h.id} className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
                <div className="text-[13px] text-white">{h.goal}{h.goal_amount != null ? ` · $${Number(h.goal_amount).toLocaleString()}` : ""}</div>
                <div className="text-[11px] text-white/45">Deadline {new Date(h.deadline + "T12:00:00").toLocaleDateString()} · set {new Date(h.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
