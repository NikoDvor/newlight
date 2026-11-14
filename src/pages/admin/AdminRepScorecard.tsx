import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchRepNames } from "@/lib/repNames";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DAILY_DIAL_GOAL } from "@/lib/bdrCalendar";

const db = supabase as any;
type Row = { user_id: string; dials: number; booked: number; held: number; no_shows: number; closed: number; last_note: string | null };
type Note = { id: string; note: string; created_at: string };
const RANGES = [{ d: 1, label: "Today" }, { d: 7, label: "7 days" }, { d: 30, label: "30 days" }];
const cell = "px-3 py-2.5 text-right tabular-nums";

export default function AdminRepScorecard() {
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [coach, setCoach] = useState<Row | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setRows(null);
    const { data, error } = await db.rpc("nl_rep_scorecard_all", { p_days: days });
    if (error) { toast.error(error.message); setRows([]); return; }
    const list = ((data as Row[]) || []).map((r) => ({ ...r, dials: +r.dials, booked: +r.booked, held: +r.held, no_shows: +r.no_shows, closed: +r.closed }));
    setNames(await fetchRepNames(list.map((r) => r.user_id)));
    list.sort((a, b) => b.dials - a.dials);
    setRows(list);
  }, [days]);
  useEffect(() => { load(); }, [load]);

  const loadNotes = async (uid: string) => {
    const { data } = await db.from("nl_coaching_notes").select("id, note, created_at").eq("rep_user_id", uid).order("created_at", { ascending: false }).limit(20);
    setNotes((data as Note[]) || []);
  };
  const openCoach = (r: Row) => { setCoach(r); setText(""); setNotes([]); loadNotes(r.user_id); };
  const addNote = async () => {
    if (!coach || !text.trim()) return;
    setBusy(true);
    const { error } = await db.from("nl_coaching_notes").insert({ rep_user_id: coach.user_id, note: text.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    setText(""); loadNotes(coach.user_id); load();
    toast.success("Note saved. They'll see it on their dashboard.");
  };

  const goal = days === 1 ? DAILY_DIAL_GOAL : null;
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Rep Scorecard</h1>
          <p className="text-xs text-white/50">Every salesman side by side. Click Coach to leave a note they see on their dashboard.</p>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button key={r.d} onClick={() => setDays(r.d)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${days === r.d ? "bg-white/15 text-white" : "text-white/55 hover:text-white"}`}>{r.label}</button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl" style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}>
        {!rows ? <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin text-white/60" /> : rows.length === 0 ? (
          <p className="p-6 text-sm text-white/55">No salesmen yet.</p>
        ) : (
          <table className="w-full text-sm text-white/90">
            <thead className="text-[11px] uppercase tracking-wider text-white/45">
              <tr><th className="px-3 py-2 text-left">Rep</th><th className={cell}>Dials</th><th className={cell}>Booked</th><th className={cell}>Held</th><th className={cell}>No-shows</th><th className={cell}>Show rate</th><th className={cell}>Closed</th><th className={cell}>Last note</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const sr = r.held + r.no_shows > 0 ? Math.round((r.held / (r.held + r.no_shows)) * 100) : null;
                return (
                  <tr key={r.user_id} className="border-t border-white/5">
                    <td className="px-3 py-2.5 font-medium">{names[r.user_id] || "Unnamed rep"}</td>
                    <td className={cell}>{r.dials}{goal ? <span className="text-white/40"> / {goal}</span> : null}</td>
                    <td className={cell}>{r.booked}</td>
                    <td className={cell}>{r.held}</td>
                    <td className={`${cell} ${r.no_shows ? "text-amber-300" : ""}`}>{r.no_shows}</td>
                    <td className={cell}>{sr === null ? "—" : `${sr}%`}</td>
                    <td className={cell}>{r.closed}</td>
                    <td className={`${cell} text-xs text-white/45`}>{r.last_note ? new Date(r.last_note).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}</td>
                    <td className="px-3 py-2.5 text-right"><button onClick={() => openCoach(r)} className="inline-flex items-center gap-1 text-xs font-semibold text-[hsl(var(--nl-electric))]"><MessageSquarePlus className="h-3.5 w-3.5" />Coach</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <Dialog open={!!coach} onOpenChange={(o) => !o && setCoach(null)}>
        <DialogContent className="max-w-md" style={{ background: "hsl(218 35% 12%)", border: "1px solid hsla(211,96%,60%,.15)", color: "white" }}>
          <DialogHeader><DialogTitle className="text-white">Coaching · {coach ? names[coach.user_id] || "Rep" : ""}</DialogTitle></DialogHeader>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="What should they do differently, or keep doing?" rows={3} />
          <Button onClick={addNote} disabled={busy || !text.trim()}>{busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Save note</Button>
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg bg-white/[0.05] px-3 py-2">
                <p className="whitespace-pre-wrap text-sm">{n.note}</p>
                <p className="mt-1 text-[11px] text-white/45">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
