import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

type Item = { key: string; label: string; auto: boolean; manual: boolean; done: boolean; can_tick: boolean };
type State = { items: Item[]; completed_at: string | null };
const db = supabase as any;

/** Per-salesman onboarding checklist. System-detectable steps tick themselves; the rest are ticked by hand. */
export default function RepOnboarding({ userId, name }: { userId: string; name: string }) {
  const [s, setS] = useState<State | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await db.rpc("nl_rep_onboarding", { p_user: userId });
    if (!error) setS(data as State);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const done = s?.items.filter((i) => i.done).length ?? 0;
  const total = s?.items.length ?? 0;
  const all = !!s && done === total;

  const tick = async (i: Item) => {
    setBusy(true);
    const { error } = await db.rpc("nl_rep_onboarding_set", { p_user: userId, p_key: i.key, p_done: !i.manual });
    setBusy(false);
    if (error) return toast.error(error.message);
    load();
  };
  const complete = async () => {
    setBusy(true);
    const { error } = await db.rpc("nl_rep_onboarding_complete", { p_user: userId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${name || "Rep"} is fully onboarded`);
    load();
  };

  return (
    <>
      <button onClick={() => setOpen(true)} title="Onboarding checklist"
        className="inline-flex items-center gap-1 text-white/40 hover:text-[hsl(var(--nl-electric))] transition-colors">
        <ClipboardCheck className="h-3.5 w-3.5" />
        {s && <span className={`text-[10px] tabular-nums ${s.completed_at ? "text-emerald-300" : "text-white/50"}`}>{s.completed_at ? "Done" : `${done}/${total}`}</span>}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" style={{ background: "hsl(218 35% 12%)", border: "1px solid hsla(211,96%,60%,.15)", color: "white" }}>
          <DialogHeader><DialogTitle className="text-white">Onboarding · {name || "Rep"}</DialogTitle></DialogHeader>
          {!s ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-white/60" /> : (
            <div className="space-y-1.5">
              {s.items.map((i) => (
                <div key={i.key} className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
                  {i.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <Circle className="h-4 w-4 shrink-0 text-white/30" />}
                  <span className={`flex-1 ${i.done ? "text-white/90" : "text-white/70"}`}>{i.label}</span>
                  {i.auto
                    ? <span className="text-[10px] uppercase tracking-wider text-emerald-300/80">Automatic</span>
                    : i.can_tick && <button disabled={busy} onClick={() => tick(i)} className="text-xs font-semibold text-[hsl(var(--nl-electric))] disabled:opacity-50">{i.manual ? "Undo" : "Mark done"}</button>}
                </div>
              ))}
              <div className="pt-3">
                {s.completed_at ? (
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Onboarding completed {new Date(s.completed_at).toLocaleDateString()}</p>
                ) : all ? (
                  <Button className="w-full" onClick={complete} disabled={busy}>{busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Completed</Button>
                ) : (
                  <p className="text-xs text-white/55">{total - done} left. The Completed button appears when every step is done.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
