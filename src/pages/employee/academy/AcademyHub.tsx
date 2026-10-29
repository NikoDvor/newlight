import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Award, ArrowRight, Check, BookOpen, Map, Mic, Clock, Users } from "lucide-react";
import { useAcademy } from "@/hooks/useAcademy";
import { useAcademyBase } from "@/hooks/useAcademyBase";
import { badgesOf, moduleStats, nextUp, streakOf, xpOf, XP_PER_LEVEL, FINAL_MODULE, WHY_MODULE, type AcademyData } from "@/lib/academy";
import { AcademyStyles, AlivePanel, GlowBar, Kicker, ACADEMY } from "@/components/academy/ui";

const pad = (n: number) => String(n).padStart(2, "0");

export default function AcademyHub() {
  const { data, loading } = useAcademy();
  const base = useAcademyBase();
  const navigate = useNavigate();
  if (loading || !data) return <div className="py-20 text-center text-sm text-white/40">{loading ? "Loading training…" : "Training isn't set up yet."}</div>;

  const xp = xpOf(data);
  const streak = streakOf(data.days);
  const badges = badgesOf(data);
  const up = nextUp(data);
  const totalPct = Math.round(data.modules.reduce((s, m) => s + moduleStats(data, m).pct, 0) / Math.max(1, data.modules.length));

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <AcademyStyles />
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
        <Kicker>Sales training</Kicker>
        <h1 className="mt-2 text-[30px] sm:text-4xl font-bold leading-[1.05] text-white">Get certified to sell.</h1>
        <p className="mt-2 text-sm text-white/55">10 modules · read in any order · nothing is locked.</p>
      </motion.div>

      {/* Level / streak / badges */}
      <AlivePanel className="mt-6 p-4 sm:p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/45">Level</div>
            <div className="text-4xl font-bold tabular-nums text-white leading-none mt-1">{xp.level}</div>
          </div>
          <div className="flex gap-5 text-right">
            <div>
              <div className="flex items-center justify-end gap-1 text-2xl font-bold tabular-nums text-white"><Flame className="h-5 w-5" style={{ color: streak.current ? "hsl(28,100%,60%)" : "hsla(0,0%,100%,.3)" }} />{streak.current}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/45">day streak</div>
            </div>
            <div>
              <div className="flex items-center justify-end gap-1 text-2xl font-bold tabular-nums text-white"><Award className="h-5 w-5 text-[hsl(197,100%,60%)]" />{badges.filter((b) => b.earned).length}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/45">badges</div>
            </div>
          </div>
        </div>
        <GlowBar pct={xp.pctToNext} className="mt-4" height={6} />
        <div className="mt-1.5 flex justify-between text-[11px] text-white/45 tabular-nums">
          <span>{xp.xp.toLocaleString()} XP</span><span>{XP_PER_LEVEL - xp.into} XP to level {xp.level + 1}</span>
        </div>
        {!streak.today && streak.current > 0 && <p className="mt-2 text-[11px] text-[hsl(28,100%,65%)]">Finish a chapter today to keep your streak.</p>}
      </AlivePanel>

      {/* Continue */}
      {up && (
        <button type="button" onClick={() => navigate(up.chapter ? `${base}/m/${up.module.module_number}/c/${up.chapter.chapter_number}` : `${base}/m/${up.module.module_number}`)}
          className="group mt-3 flex w-full items-center gap-4 rounded-2xl border border-[hsla(197,100%,55%,.45)] p-4 text-left transition-all hover:shadow-[0_0_30px_-10px_hsl(197,100%,55%)]"
          style={{ background: "linear-gradient(110deg, hsla(211,96%,45%,.28), hsla(197,100%,50%,.10) 60%, transparent)" }}>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[hsl(197,100%,65%)]">{totalPct === 0 ? "Start here" : "Continue"}</div>
            <div className="mt-1 truncate text-[15px] font-semibold text-white">
              Module {up.module.module_number} · {up.chapter ? up.chapter.chapter_title : up.module.module_title}
            </div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-white transition-transform group-hover:translate-x-1" />
        </button>
      )}

      {/* Module path */}
      <div className="mt-8 flex items-center justify-between">
        <Kicker>Your path</Kicker>
        <span className="text-[11px] text-white/45 tabular-nums">{totalPct}% complete</span>
      </div>
      <ModulePath data={data} />

      {/* Badges */}
      <div className="mt-10"><Kicker>Badges</Kicker></div>
      <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
        {badges.map((b, i) => (
          <motion.div key={b.key} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}
            className="relative px-2.5 py-3 text-center"
            style={{
              clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)",
              background: b.earned ? "linear-gradient(140deg, hsla(197,100%,55%,.28), hsla(211,96%,45%,.12))" : "hsla(0,0%,100%,.03)",
              opacity: b.earned ? 1 : 0.55,
            }}>
            <Award className="mx-auto h-5 w-5" style={{ color: b.earned ? "hsl(197,100%,65%)" : "hsla(0,0%,100%,.3)", filter: b.earned ? "drop-shadow(0 0 6px hsl(197,100%,55%))" : undefined }} />
            <div className="mt-1.5 text-[11px] font-semibold text-white leading-tight">{b.label}</div>
            <div className="mt-0.5 text-[9.5px] leading-tight text-white/45">{b.earned ? "Earned" : b.hint}</div>
          </motion.div>
        ))}
      </div>

      {/* Resources */}
      <div className="mt-10"><Kicker>More</Kicker></div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Link to={`${base}/pipeline-guide`} className={`flex items-center gap-3 p-3 ${ACADEMY.panelSoft} hover:bg-white/[0.06]`}>
          <Map className="h-4 w-4 text-[hsl(197,100%,60%)]" /><span className="text-[13px] font-medium text-white">Pipeline Guide</span>
        </Link>
        <Link to={`${base}/vault`} className={`flex items-center gap-3 p-3 ${ACADEMY.panelSoft} hover:bg-white/[0.06]`}>
          <Mic className="h-4 w-4 text-[hsl(197,100%,60%)]" /><span className="text-[13px] font-medium text-white">Recording Vault</span>
        </Link>
        {base.startsWith("/admin") && (
          <Link to={`${base}/team`} className={`flex items-center gap-3 p-3 ${ACADEMY.panelSoft} hover:bg-white/[0.06]`}>
            <Users className="h-4 w-4 text-[hsl(197,100%,60%)]" /><span className="text-[13px] font-medium text-white">Team progress</span>
          </Link>
        )}
      </div>
    </div>
  );
}

function ModulePath({ data }: { data: AcademyData }) {
  const navigate = useNavigate();
  const base = useAcademyBase();
  const stats = data.modules.map((m) => moduleStats(data, m));
  const doneCount = stats.filter((s) => s.complete).length;
  const fill = data.modules.length ? (doneCount / data.modules.length) * 100 : 0;
  return (
    <div className="relative mt-3">
      {/* the rail: one continuous line, lit as modules complete */}
      <div aria-hidden className="absolute left-[19px] top-3 bottom-3 w-px bg-white/[0.08]" />
      <motion.div aria-hidden className="absolute left-[19px] top-3 w-px"
        style={{ background: "linear-gradient(180deg, hsl(197,100%,60%), hsl(211,96%,55%))", boxShadow: "0 0 10px hsl(197,100%,55%)" }}
        initial={{ height: 0 }} animate={{ height: `calc(${fill}% - 12px)` }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} />
      <div className="space-y-2.5">
        {data.modules.map((m, i) => {
          const s = stats[i];
          const chs = data.chapters.filter((c) => c.module_id === m.id);
          const mins = chs.reduce((t, c) => t + (c.est_minutes || 4), 0);
          const hasBdr = chs.some((c) => c.audience === "bdr"), hasSdr = chs.some((c) => c.audience === "sdr");
          const special = m.module_number === WHY_MODULE ? "Builder" : m.module_number === FINAL_MODULE ? "Exam" : null;
          return (
            <motion.button key={m.id} type="button" onClick={() => navigate(`${base}/m/${m.module_number}`)}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}
              className="group relative flex w-full items-stretch gap-3 text-left">
              {/* node on the rail: a short horizontal tick, lit when complete */}
              <div className="relative w-10 shrink-0 flex items-center">
                <span className="absolute left-[19px] h-px w-[21px]" style={{ background: s.complete ? "hsl(197,100%,60%)" : s.pct > 0 ? "hsla(197,100%,60%,.5)" : "hsla(0,0%,100%,.12)", boxShadow: s.complete ? "0 0 8px hsl(197,100%,55%)" : undefined }} />
              </div>
              <div className={`flex-1 min-w-0 rounded-xl border p-3.5 transition-all group-hover:border-[hsla(197,100%,55%,.5)] ${s.complete ? "border-[hsla(197,100%,55%,.35)]" : "border-white/[0.08]"}`}
                style={{ background: s.complete ? "linear-gradient(110deg, hsla(197,100%,50%,.10), hsla(222,40%,8%,.85) 55%)" : "hsla(222,40%,8%,.82)" }}>
                <div className="flex items-start gap-3">
                  <div className="font-mono text-[22px] font-bold leading-none tabular-nums" style={{ color: s.complete ? "hsl(197,100%,62%)" : "hsla(0,0%,100%,.28)" }}>{pad(m.module_number)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold text-white">{m.module_title}</span>
                      {s.complete && <Check className="h-4 w-4 shrink-0 text-[hsl(152,70%,55%)]" />}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/50">
                      {m.tagline && <span className="text-[hsl(197,100%,68%)]">{m.tagline}</span>}
                      {!special && <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" />{s.done}/{s.total}</span>}
                      {!special && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{mins} min</span>}
                      {m.has_quiz && <span className="rounded px-1 text-[9.5px] font-bold tracking-wider text-[hsl(42,100%,65%)] bg-[hsla(42,100%,60%,.1)]">QUIZ</span>}
                      {special && <span className="rounded px-1 text-[9.5px] font-bold tracking-wider text-[hsl(262,85%,78%)] bg-[hsla(262,85%,74%,.1)]">{special.toUpperCase()}</span>}
                      {hasBdr && <span className="text-[9.5px] font-bold tracking-wider" style={{ color: ACADEMY.electric }}>BDR</span>}
                      {hasSdr && <span className="text-[9.5px] font-bold tracking-wider" style={{ color: ACADEMY.sdr }}>SDR</span>}
                    </div>
                    {!special && <GlowBar pct={s.pct} className="mt-2.5" height={3} />}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
