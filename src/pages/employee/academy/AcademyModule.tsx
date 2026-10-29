import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Clock, ChevronRight } from "lucide-react";
import { useAcademy } from "@/hooks/useAcademy";
import { chapterDone, moduleStats, FINAL_MODULE, WHY_MODULE, type Audience } from "@/lib/academy";
import { AcademyStyles, AlivePanel, AudienceTag, GlowBar, Kicker } from "@/components/academy/ui";
import WhyBuilder from "@/components/academy/WhyBuilder";
import FinalExam from "@/components/academy/FinalExam";

const pad = (n: number) => String(n).padStart(2, "0");

export default function AcademyModule() {
  const { n } = useParams<{ n: string }>();
  const num = Number(n);
  const { data, loading, refresh } = useAcademy();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | Audience>("all");

  if (loading || !data) return <div className="py-20 text-center text-sm text-white/40">Loading…</div>;
  const m = data.modules.find((x) => x.module_number === num);
  if (!m) return <div className="py-20 text-center text-sm text-white/40">Module not found. <Link className="underline" to="/employee/training">Back</Link></div>;

  const s = moduleStats(data, m);
  const all = data.chapters.filter((c) => c.module_id === m.id).sort((a, b) => a.chapter_number - b.chapter_number);
  const labeled = all.some((c) => c.audience !== "all");
  const chapters = filter === "all" ? all : all.filter((c) => c.audience === filter || c.audience === "all");
  const prev = data.modules.find((x) => x.module_number === num - 1);
  const next = data.modules.find((x) => x.module_number === num + 1);

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <AcademyStyles />
      <Link to="/employee/training" className="inline-flex items-center gap-1 text-[12px] text-white/55 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Training</Link>

      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-start gap-4">
        <div className="font-mono text-5xl font-bold leading-none tabular-nums" style={{ color: "hsl(197,100%,60%)", textShadow: "0 0 24px hsla(197,100%,55%,.5)" }}>{pad(m.module_number)}</div>
        <div className="min-w-0">
          {m.tagline && <Kicker>{m.tagline}</Kicker>}
          <h1 className="mt-1 text-[26px] sm:text-3xl font-bold leading-tight text-white">{m.module_title}</h1>
          {m.module_description && <p className="mt-1.5 text-sm text-white/60">{m.module_description}</p>}
        </div>
      </motion.div>

      {m.module_number !== FINAL_MODULE && (
        <div className="mt-5">
          <GlowBar pct={s.pct} height={5} />
          <div className="mt-1.5 flex justify-between text-[11px] text-white/45"><span>{s.done} of {s.total} chapters</span>{m.has_quiz && <span>Each chapter ends with a quiz</span>}</div>
        </div>
      )}

      {labeled && (
        <div className="mt-5 inline-flex rounded-lg border border-white/10 p-0.5">
          {(["all", "bdr", "sdr"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1 text-[11px] font-semibold ${filter === f ? "bg-white/10 text-white" : "text-white/50"}`}>
              {f === "all" ? "All" : f.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {chapters.map((c, i) => {
          const done = chapterDone(data.progress, c.id);
          return (
            <motion.button key={c.id} type="button" onClick={() => navigate(`/employee/training/m/${num}/c/${c.chapter_number}`)}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-[hsla(222,40%,8%,.82)] p-3.5 text-left transition-colors hover:border-[hsla(197,100%,55%,.45)]">
              <div className="w-1 self-stretch rounded-full" style={{ background: done ? "hsl(197,100%,58%)" : "hsla(0,0%,100%,.08)", boxShadow: done ? "0 0 8px hsl(197,100%,55%)" : undefined }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-white/35 tabular-nums">{pad(c.chapter_number)}</span>
                  <AudienceTag audience={c.audience} />
                </div>
                <div className="mt-0.5 text-[14.5px] font-semibold leading-snug text-white">{c.chapter_title}</div>
                {c.chapter_description && <div className="mt-0.5 text-[12px] text-white/50 line-clamp-1">{c.chapter_description}</div>}
              </div>
              <div className="flex shrink-0 items-center gap-2 text-[11px] text-white/45">
                {done ? <span className="inline-flex items-center gap-1 text-[hsl(152,70%,58%)]"><Check className="h-4 w-4" />{done.score != null ? `${done.score}%` : ""}</span>
                  : <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{c.est_minutes || 4}m</span>}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </motion.button>
          );
        })}
      </div>

      {m.module_number === WHY_MODULE && (
        <AlivePanel className="mt-6 p-4 sm:p-6">
          <WhyBuilder onSaved={refresh} />
        </AlivePanel>
      )}

      {m.module_number === FINAL_MODULE && (
        <AlivePanel className="mt-6 p-4 sm:p-6">
          <FinalExam data={data} onDone={refresh} />
        </AlivePanel>
      )}

      <div className="mt-10 flex justify-between gap-3 text-[12px]">
        {prev ? <Link to={`/employee/training/m/${prev.module_number}`} className="text-white/55 hover:text-white">← {pad(prev.module_number)} {prev.module_title}</Link> : <span />}
        {next ? <Link to={`/employee/training/m/${next.module_number}`} className="text-right text-white/55 hover:text-white">{pad(next.module_number)} {next.module_title} →</Link> : <span />}
      </div>
    </div>
  );
}
