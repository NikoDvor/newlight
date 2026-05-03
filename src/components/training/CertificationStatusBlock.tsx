import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Lock, Star, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type CertState = "loading" | "not_started" | "attempted" | "certified";

export function CertificationStatusBlock() {
  const { user } = useWorkspace();
  const [state, setState] = useState<CertState>("loading");
  const [modulesComplete, setModulesComplete] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [certDate, setCertDate] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: track } = await supabase.from("nl_training_tracks").select("id").eq("track_key", "bdr").maybeSingle();
      if (!track) { setState("not_started"); return; }

      const [{ data: mods }, { data: progress }, { data: certs }] = await Promise.all([
        supabase.from("nl_training_modules").select("id, module_number").eq("track_id", track.id),
        supabase.from("nl_training_progress").select("module_id, status, chapter_id").eq("user_id", user.id).eq("track_id", track.id),
        (supabase as any).from("nl_certifications").select("score, passed, completed_at").eq("user_id", user.id).order("completed_at", { ascending: false }),
      ]);

      const realMods = (mods || []).filter((m: any) => m.module_number >= 1 && m.module_number <= 8);
      const completedIds = new Set<string>();
      for (const mod of realMods) {
        const mp = (progress || []).filter((p: any) => p.module_id === mod.id);
        if (mp.some((p: any) => !p.chapter_id && p.status === "completed")) { completedIds.add(mod.id); continue; }
        const chapterDone = mp.filter((p: any) => p.chapter_id && p.status === "completed");
        if (chapterDone.length > 0) {
          const { count } = await supabase.from("nl_training_chapters").select("id", { count: "exact", head: true }).eq("module_id", mod.id);
          if (count && chapterDone.length >= count) completedIds.add(mod.id);
        }
      }
      setModulesComplete(completedIds.size);

      const certRows = (certs?.data || certs || []) as any[];
      setAttemptCount(certRows.length);

      const passRow = certRows.find((c: any) => c.passed);
      if (passRow) {
        setState("certified");
        setCertDate(new Date(passRow.completed_at).toLocaleDateString());
        return;
      }
      if (certRows.length > 0) {
        setState("attempted");
        setBestScore(Math.max(...certRows.map((c: any) => Number(c.score))));
        return;
      }
      setState("not_started");
    })();
  }, [user?.id]);

  if (state === "loading") return null;

  // ── STATE 3: CERTIFIED ──
  if (state === "certified") {
    return (
      <div
        className="rounded-2xl p-6 relative overflow-hidden cert-glow-pulse"
        style={{
          background: "hsla(215,35%,10%,.8)",
          border: "1px solid hsla(211,96%,60%,.25)",
          boxShadow: "0 0 40px hsla(211,96%,56%,.1)",
        }}
      >
        <style>{`
          @keyframes certGlow {
            0%, 100% { box-shadow: 0 0 30px hsla(211,96%,56%,.08), inset 0 0 30px hsla(211,96%,56%,.02); }
            50% { box-shadow: 0 0 50px hsla(211,96%,56%,.15), inset 0 0 40px hsla(211,96%,56%,.04); }
          }
          .cert-glow-pulse { animation: certGlow 4s ease-in-out infinite; }
        `}</style>
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,60%,.15)" }}>
            <Star className="h-6 w-6" style={{ color: "hsl(45,93%,58%)" }} fill="hsl(45,93%,58%)" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold" style={{ color: "hsl(211,96%,56%)" }}>BDR CERTIFIED</p>
            <p className="text-sm text-white/45 mt-0.5">Certified on {certDate}</p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link to="/employee/certification/bdr">View Certification</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── STATE 2: ATTEMPTED ──
  if (state === "attempted") {
    return (
      <div
        className="rounded-2xl p-6"
        style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(38,92%,50%,.2)" }}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsla(38,92%,50%,.12)" }}>
            <Target className="h-6 w-6" style={{ color: "hsl(38,92%,50%)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(38,92%,50%)" }}>BDR Certification</p>
            <p className="text-sm text-white/70 mt-1">Keep going — you're {bestScore}% of the way there</p>
            <p className="text-xs text-white/35 mt-0.5">Best score: {bestScore}% · {attemptCount} attempt{attemptCount !== 1 ? "s" : ""}</p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link to="/employee/certification/bdr">Go to Exam</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── STATE 1: NOT STARTED ──
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "hsla(215,35%,10%,.8)", border: "1px solid hsla(211,96%,60%,.12)" }}
    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,60%,.06)" }}>
          <Lock className="h-6 w-6 text-white/25" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">BDR Certification</p>
          <p className="text-sm text-white/45 mt-1">Complete all 8 modules to unlock your certification exam</p>
          <div className="flex items-center gap-2 mt-2">
            <Progress value={(modulesComplete / 8) * 100} className="h-1 flex-1 max-w-[120px]" />
            <span className="text-[11px] text-white/30">{modulesComplete} of 8 modules</span>
          </div>
        </div>
      </div>
    </div>
  );
}
