import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadAcademy, moduleStats, streakOf, xpOf, type AcademyData } from "@/lib/academy";
import { AcademyStyles, GlowBar, Kicker } from "@/components/academy/ui";

/**
 * Admin → Training → Team. Each salesman's progress (modules, quiz average, final test, streak, last active).
 * "Your Why" stays private — it is never shown here.
 */
interface Row { user_id: string; name: string; data: AcademyData | null; last: string | null; quizAvg: number | null }

export default function AdminTeamTraining() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    (async () => {
      const db = supabase as any;
      const { data: cals } = await db.from("bdr_calendars").select("user_id");
      const ids: string[] = Array.from(new Set((cals || []).map((c: any) => c.user_id)));
      const { data: emps } = ids.length ? await db.from("employee_profiles").select("user_id, full_name").in("user_id", ids) : { data: [] };
      const out: Row[] = [];
      for (const e of (emps || []) as any[]) {
        const d = await loadAcademy(e.user_id);
        const scored = (d?.progress || []).filter((p) => p.chapter_id && p.score != null);
        const last = (d?.progress || []).map((p) => p.last_attempt_at || p.completed_at).filter(Boolean).sort().pop() || null;
        out.push({
          user_id: e.user_id, name: e.full_name || "Salesman", data: d, last,
          quizAvg: scored.length ? Math.round(scored.reduce((s, p) => s + (p.score || 0), 0) / scored.length) : null,
        });
      }
      setRows(out.sort((a, b) => a.name.localeCompare(b.name)));
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <AcademyStyles />
      <Link to="/admin/training-center" className="inline-flex items-center gap-1 text-[12px] text-white/55 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Training</Link>
      <Kicker className="mt-4">Team training</Kicker>
      <h1 className="mt-1 text-2xl font-bold text-white">Where every salesman is</h1>
      <p className="mt-1 text-sm text-white/50">Their goals and "Why" are private and never shown here.</p>

      {!rows ? <p className="py-12 text-center text-sm text-white/40">Loading…</p> : rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/40">No salesmen yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((r) => {
            const d = r.data;
            if (!d) return null;
            const xp = xpOf(d), st = streakOf(d.days);
            const passed = d.certs.find((c) => c.passed);
            const best = d.certs.reduce((m, c) => Math.max(m, Number(c.score) || 0), 0);
            return (
              <div key={r.user_id} className="rounded-2xl border border-white/[0.08] bg-[hsla(222,40%,8%,.82)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[15px] font-semibold text-white">{r.name}</div>
                    <div className="text-[11px] text-white/45">Level {xp.level} · {xp.xp.toLocaleString()} XP · last active {r.last ? new Date(r.last).toLocaleDateString() : "never"}</div>
                  </div>
                  <div className="flex items-center gap-4 text-[12px]">
                    <span className="inline-flex items-center gap-1 text-white/70"><Flame className="h-3.5 w-3.5 text-[hsl(28,100%,60%)]" />{st.current}d</span>
                    <span className="text-white/70">Quiz avg <b className="text-white">{r.quizAvg != null ? `${r.quizAvg}%` : "—"}</b></span>
                    <span className={passed ? "text-[hsl(152,70%,58%)] font-semibold inline-flex items-center gap-1" : "text-white/60"}>
                      {passed ? <><Check className="h-3.5 w-3.5" />Certified</> : d.certs.length ? `Final: best ${best}% (${d.certs.length} tries)` : "Final: not taken"}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                  {d.modules.map((m) => {
                    const s = moduleStats(d, m);
                    return (
                      <div key={m.id} title={`${m.module_number}. ${m.module_title} — ${s.pct}%`}>
                        <div className="mb-1 text-[9px] font-mono text-white/40">{String(m.module_number).padStart(2, "0")}</div>
                        <GlowBar pct={s.complete ? 100 : s.pct} height={4} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
