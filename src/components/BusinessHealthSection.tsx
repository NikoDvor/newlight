import { motion } from "framer-motion";
import { Heart, Sparkles, Trophy, CheckCircle2, Circle, ArrowUpRight, Zap } from "lucide-react";

const MOCK_SCORE = 78;
const MOCK_STAGE = 6; // out of 7
const STAGES = ["Discovery", "Business Info", "Integrations", "Team Setup", "CRM Config", "Campaigns", "Launch", "Live"];
const MOCK_WINS = [
  { label: "Appointments booked this month", value: 42 },
  { label: "Deals closed", value: 18 },
  { label: "Revenue generated", value: "$26.8K" },
];
const MOCK_OPTIMIZATIONS = [
  { title: "Launch review autopilot", detail: "Your 5-star average is perfect for automated review requests.", priority: "high" as const },
  { title: "Upsell membership program", detail: "48% of your clients rebook — a membership fits.", priority: "med" as const },
];

const scoreColor = (s: number) =>
  s >= 70 ? "hsl(152 60% 55%)" : s >= 50 ? "hsl(38 92% 60%)" : "hsl(0 72% 61%)";
const scoreLabel = (s: number) => (s >= 70 ? "Healthy" : s >= 50 ? "Needs Attention" : "Critical");

export function BusinessHealthSection() {
  const col = scoreColor(MOCK_SCORE);
  const pct = Math.round((MOCK_STAGE / 7) * 100);

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, hsla(211,96%,62%,0.3), transparent)" }} />
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-2">
          <Heart className="h-3.5 w-3.5" /> Business Health
        </h2>
        <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, hsla(211,96%,62%,0.3), transparent)" }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Health Score */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="dash-card p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4" style={{ color: col }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsla(210,40%,80%,.7)" }}>Health Score</span>
          </div>
          <div className="flex items-center justify-center py-2">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
                <circle cx="64" cy="64" r="56" fill="none" stroke="hsla(211,96%,56%,.12)" strokeWidth="8" />
                <motion.circle
                  cx="64" cy="64" r="56" fill="none" stroke={col} strokeWidth="8" strokeLinecap="round"
                  initial={{ strokeDasharray: "0 352" }}
                  whileInView={{ strokeDasharray: `${MOCK_SCORE * 3.52} ${352 - MOCK_SCORE * 3.52}` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{MOCK_SCORE}</span>
                <span className="text-[10px]" style={{ color: col }}>{scoreLabel(MOCK_SCORE)}</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-center mt-1" style={{ color: "hsla(210,40%,70%,.6)" }}>
            Composite of engagement, activity & results
          </p>
        </motion.div>

        {/* Onboarding */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.05 }}
          className="dash-card p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[hsl(211,96%,68%)]" />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsla(210,40%,80%,.7)" }}>Onboarding</span>
            </div>
            <span className="text-sm font-bold text-[hsl(211,96%,68%)]">{pct}%</span>
          </div>
          <p className="text-xs mb-3" style={{ color: "hsla(210,40%,70%,.7)" }}>
            You're at <span className="font-semibold text-white">{STAGES[MOCK_STAGE]}</span>
          </p>
          <div className="space-y-1.5">
            {STAGES.slice(0, 7).map((s, i) => {
              const done = i <= MOCK_STAGE;
              return (
                <div key={s} className="flex items-center gap-2">
                  {done ? <CheckCircle2 className="h-3 w-3 text-[hsl(211,96%,68%)] shrink-0" /> : <Circle className="h-3 w-3 text-white/25 shrink-0" />}
                  <span className={`text-[11px] ${done ? "text-white/80" : "text-white/40"}`}>{s}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Wins + Optimizations */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
          className="dash-card p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsla(210,40%,80%,.7)" }}>Wins & Suggestions</span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {MOCK_WINS.map(w => (
              <div key={w.label} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-center">
                <p className="text-base font-bold text-emerald-400">{w.value}</p>
                <p className="text-[9px] text-white/50 leading-tight mt-0.5">{w.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {MOCK_OPTIMIZATIONS.map(o => (
              <div key={o.title} className="flex items-start gap-2 p-2 rounded-lg bg-[hsla(211,96%,62%,0.06)] border border-[hsla(211,96%,62%,0.12)]">
                <Sparkles className="h-3.5 w-3.5 text-[hsl(211,96%,68%)] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{o.title}</p>
                  <p className="text-[11px] text-white/60 mt-0.5">{o.detail}</p>
                </div>
                {o.priority === "high" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-semibold shrink-0">HIGH</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
