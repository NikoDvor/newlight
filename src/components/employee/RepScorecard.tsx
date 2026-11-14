import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { DAILY_DIAL_GOAL } from "@/lib/bdrCalendar";

const db = supabase as any;
type Card = { dials: number; booked: number; held: number; no_shows: number; closed: number };
type NoShow = { event_id: string; title: string; starts_at: string; link_sent: boolean };
type Note = { id: string; note: string; created_at: string };
const RANGES = [{ d: 1, label: "Today" }, { d: 7, label: "7 days" }, { d: 30, label: "30 days" }];
const card = { background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" };

/** The salesman's scoreboard, their no-shows still waiting on a rebook, and the coach's notes. */
export function RepScorecard() {
  const { user } = useWorkspace();
  const [days, setDays] = useState(1);
  const [c, setC] = useState<Card | null>(null);
  const [ns, setNs] = useState<NoShow[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let live = true;
    db.rpc("nl_rep_scorecard", { p_user: user.id, p_days: days }).then(({ data }: any) => { if (live && data) setC(data as Card); });
    return () => { live = false; };
  }, [user?.id, days]);

  useEffect(() => {
    if (!user?.id) return;
    db.rpc("nl_noshows_to_rebook", { p_user: user.id }).then(({ data }: any) => setNs((data as NoShow[]) || []));
    db.from("nl_coaching_notes").select("id, note, created_at").eq("rep_user_id", user.id).order("created_at", { ascending: false }).limit(3)
      .then(({ data }: any) => setNotes((data as Note[]) || []));
  }, [user?.id]);

  if (!user?.id) return null;
  const showRate = c && c.held + c.no_shows > 0 ? Math.round((c.held / (c.held + c.no_shows)) * 100) : null;
  const tiles = c ? [
    { k: "Dials", v: days === 1 ? `${c.dials} / ${DAILY_DIAL_GOAL}` : String(c.dials) },
    { k: "Meetings booked", v: String(c.booked) },
    { k: "Held", v: String(c.held) },
    { k: "Show rate", v: showRate === null ? "—" : `${showRate}%` },
    { k: "Closed", v: String(c.closed) },
  ] : [];

  return (
    <div className="space-y-3">
      <div className="rounded-xl p-4" style={card}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">My scorecard</h3>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button key={r.d} onClick={() => setDays(r.d)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${days === r.d ? "bg-white/15 text-white" : "text-white/55 hover:text-white"}`}>{r.label}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {tiles.map((t) => (
            <div key={t.k} className="rounded-lg bg-white/[0.04] px-3 py-2">
              <p className="text-[11px] text-white/55">{t.k}</p>
              <p className="text-lg font-semibold tabular-nums text-white">{t.v}</p>
            </div>
          ))}
        </div>
      </div>

      {ns.length > 0 && (
        <div className="rounded-xl p-4" style={{ ...card, border: "1px solid hsla(38,92%,55%,.35)" }}>
          <h3 className="mb-2 text-sm font-semibold text-amber-200">No-shows to rebook ({ns.length})</h3>
          <div className="space-y-1.5">
            {ns.map((n) => (
              <div key={n.event_id} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
                <span className="truncate text-white/85">{n.title || "Meeting"} · {new Date(n.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                <span className={`ml-3 shrink-0 text-xs ${n.link_sent ? "text-emerald-300" : "text-amber-300"}`}>{n.link_sent ? "Link sent" : "Not rebooked"}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/50">Call them back or <Link to="/employee/calendar" className="underline">book a new time</Link>. Each one drops off once a new meeting is on the calendar.</p>
        </div>
      )}

      {notes.length > 0 && (
        <div className="rounded-xl p-4" style={card}>
          <h3 className="mb-2 text-sm font-semibold text-white">Coaching notes</h3>
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg bg-white/[0.04] px-3 py-2">
                <p className="whitespace-pre-wrap text-sm text-white/90">{n.note}</p>
                <p className="mt-1 text-[11px] text-white/45">{new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
