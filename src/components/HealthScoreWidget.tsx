import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, CheckCircle, AlertTriangle, XCircle, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";

interface HealthScoreWidgetProps {
  score?: number;
  compact?: boolean;
}

const getLevel = (score: number) => {
  if (score >= 75) return { label: "Strong", color: "hsl(152 60% 44%)", icon: CheckCircle };
  if (score >= 50) return { label: "Needs Improvement", color: "hsl(38 92% 50%)", icon: AlertTriangle };
  return { label: "Critical", color: "hsl(0 72% 51%)", icon: XCircle };
};

export function HealthScoreWidget({ score: propScore, compact }: HealthScoreWidgetProps) {
  const { activeClientId } = useWorkspace();
  const [score, setScore] = useState(propScore ?? 0);

  useEffect(() => {
    if (propScore !== undefined) { setScore(propScore); return; }
    if (!activeClientId) return;
    supabase.from("client_health_scores").select("overall_score").eq("client_id", activeClientId).maybeSingle()
      .then(({ data }) => { if (data) setScore(data.overall_score); });
  }, [activeClientId, propScore]);

  const level = getLevel(score);
  const Icon = level.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative w-10 h-10">
          <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
            <circle cx="20" cy="20" r="16" fill="none" stroke="hsla(211,96%,56%,.1)" strokeWidth="3" />
            <motion.circle cx="20" cy="20" r="16" fill="none" stroke={level.color} strokeWidth="3"
              strokeDasharray={`${score * 1.005} ${100.5 - score * 1.005}`} strokeLinecap="round"
              initial={{ strokeDasharray: "0 100.5" }}
              animate={{ strokeDasharray: `${score * 1.005} ${100.5 - score * 1.005}` }}
              transition={{ duration: 1, ease: "easeOut" }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: level.color }}>{score}</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">{level.label}</p>
          <p className="text-[10px] text-muted-foreground">Growth Score</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div className="card-widget text-center"
      initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-28 h-28">
          <svg viewBox="0 0 128 128" className="w-full h-full">
            <circle cx="64" cy="64" r="56" fill="none" stroke="hsla(211,96%,56%,.1)" strokeWidth="8" />
            <motion.circle cx="64" cy="64" r="56" fill="none" stroke={level.color} strokeWidth="8"
              strokeDasharray={`${score * 3.52} ${352 - score * 3.52}`} strokeDashoffset="88" strokeLinecap="round"
              initial={{ strokeDasharray: "0 352" }}
              animate={{ strokeDasharray: `${score * 3.52} ${352 - score * 3.52}` }}
              transition={{ duration: 1.2, ease: "easeOut" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="metric-value text-3xl">{score}</span>
            <Heart className="h-3 w-3 mt-1" style={{ color: level.color }} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <Icon className="h-4 w-4" style={{ color: level.color }} />
        <span className="text-sm font-semibold" style={{ color: level.color }}>{level.label}</span>
      </div>
      <p className="text-xs text-muted-foreground">Growth Score</p>
      <Link to="/business-health" className="flex items-center justify-center gap-1 text-[11px] font-medium mt-3" style={{ color: "hsl(211 96% 56%)" }}>
        View Details <ArrowUpRight className="h-3 w-3" />
      </Link>
    </motion.div>
  );
}
