import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Lock, CheckCircle2, Circle, PlayCircle, Award, Flame, BookOpen, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MetricCard } from "@/components/MetricCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ChapterRunner, ChapterRow } from "@/components/training/ChapterRunner";

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
  module_id: string;
}

interface ProgressRow {
  module_id: string;
  chapter_id: string | null;
  status: string;
}

export default function AdminTrainingTrack() {
  const { trackKey } = useParams<{ trackKey: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [trackName, setTrackName] = useState("");
  const [modules, setModules] = useState<Module[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

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
          .select("id, chapter_number, chapter_title, module_id")
          .in("module_id", ids)
          .order("chapter_number");
        setChapters((chs || []) as Chapter[]);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prog } = await supabase
          .from("nl_training_progress")
          .select("module_id, chapter_id, status")
          .eq("user_id", user.id);
        setProgress((prog || []) as ProgressRow[]);
      }

      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackKey]);

  const moduleStatus = (moduleId: string): "completed" | "in_progress" | "not_started" => {
    const rows = progress.filter((p) => p.module_id === moduleId && !p.chapter_id);
    if (rows.some((r) => r.status === "completed")) return "completed";
    if (rows.some((r) => r.status === "in_progress")) return "in_progress";
    const chRows = progress.filter((p) => p.module_id === moduleId);
    if (chRows.some((r) => r.status === "in_progress" || r.status === "completed")) return "in_progress";
    return "not_started";
  };

  const selectedModule = modules.find((m) => m.id === selectedModuleId) || null;
  const selectedChapters = useMemo(
    () => chapters.filter((c) => c.module_id === selectedModuleId),
    [chapters, selectedModuleId]
  );

  const moduleChapterPct = (moduleId: string) => {
    const total = chapters.filter((c) => c.module_id === moduleId).length;
    if (total === 0) return 0;
    const done = progress.filter(
      (p) => p.module_id === moduleId && p.chapter_id && p.status === "completed"
    ).length;
    return Math.round((done / total) * 100);
  };

  const totalModules = modules.length;
  const completedModules = modules.filter((m) => moduleStatus(m.id) === "completed").length;
  const overallPct = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

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
              modules.map((m) => {
                const status = moduleStatus(m.id);
                const isSelected = selectedModuleId === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModuleId(m.id)}
                    className={`w-full text-left px-4 py-3 border-b border-border/30 transition-all duration-200 flex items-start gap-3 ${
                      isSelected ? "bg-primary/[0.08]" : "hover:bg-white/[0.03]"
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
                      {m.module_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-[13px] font-medium truncate ${isSelected ? "text-foreground" : "text-foreground/85"}`}>
                          {m.module_title}
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
                            <span className="text-[10px] text-muted-foreground font-medium">Not started</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
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
                      Module {selectedModule.module_number}
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

              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Chapter completion
                  </span>
                  <span className="text-[11px] font-semibold text-foreground">
                    {moduleChapterPct(selectedModule.id)}%
                  </span>
                </div>
                <Progress value={moduleChapterPct(selectedModule.id)} className="h-1.5" />
              </div>

              <div className="space-y-2 mb-6">
                <h3 className="section-title mb-2">Chapters</h3>
                {selectedChapters.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/50 p-6 text-center">
                    <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No chapters authored yet for this module.
                    </p>
                  </div>
                ) : (
                  selectedChapters.map((c) => {
                    const done = progress.some(
                      (p) => p.chapter_id === c.id && p.status === "completed"
                    );
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/40 hover:bg-white/[0.03] transition-colors"
                      >
                        {done ? (
                          <CheckCircle2 className="h-4 w-4 text-[hsl(152,60%,50%)] shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-[13px] text-foreground/85 flex-1">
                          {c.chapter_number}. {c.chapter_title}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <Button disabled={selectedModule.is_locked} className="gap-2">
                <PlayCircle className="h-4 w-4" />
                {moduleStatus(selectedModule.id) === "in_progress" ? "Continue" : "Start Module"}
              </Button>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Select a module to view details
            </div>
          )}
        </motion.div>
      </div>

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
        <MetricCard label="Certification" value="Not Issued" icon={Award} />
      </div>
    </div>
  );
}
