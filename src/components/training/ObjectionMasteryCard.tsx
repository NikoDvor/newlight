import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UnlockRow {
  objection_category: string;
  foundation_passed: boolean;
  intermediate_passed: boolean;
  advanced_passed: boolean;
}

export function ObjectionMasteryCard() {
  const { user } = useWorkspace();
  const [unlocks, setUnlocks] = useState<UnlockRow[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("nl_objection_unlocks")
        .select("objection_category, foundation_passed, intermediate_passed, advanced_passed")
        .eq("user_id", user.id);
      setUnlocks((data || []) as UnlockRow[]);
    })();
  }, [user?.id]);

  if (unlocks.length === 0) return null;

  const latest = unlocks[unlocks.length - 1];
  const levels = [latest.foundation_passed, latest.intermediate_passed, latest.advanced_passed];
  const completedCount = levels.filter(Boolean).length;
  const pct = Math.round((completedCount / 3) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-2xl border bg-card/70 backdrop-blur-xl p-5 relative overflow-hidden"
      style={{
        borderColor: "hsla(211, 96%, 56%, 0.4)",
        animation: "objection-glow 3s ease-in-out infinite",
      }}
    >
      <style>{`
        @keyframes objection-glow {
          0%, 100% { box-shadow: 0 0 8px -2px hsla(211, 96%, 56%, 0.3), inset 0 0 0 1px hsla(211, 96%, 56%, 0.15); }
          50% { box-shadow: 0 0 20px -2px hsla(211, 96%, 56%, 0.5), inset 0 0 0 1px hsla(211, 96%, 56%, 0.3); }
        }
      `}</style>

      <div className="flex items-start gap-4">
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "hsla(211, 96%, 56%, 0.15)" }}
        >
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/80">
            Objection Mastery Unlocked
          </p>
          <h3 className="text-sm font-semibold text-foreground mt-1">
            You have faced the {latest.objection_category} objection 50 times.
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Advanced training has been generated for you. Time to master it.
          </p>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Progress</span>
              <span>{completedCount}/3 levels</span>
            </div>
            <Progress value={pct} className="h-1.5" />
            <div className="flex gap-2 mt-1">
              {["Foundation", "Intermediate", "Advanced"].map((label, i) => (
                <span
                  key={label}
                  className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                    levels[i]
                      ? "bg-[hsl(152,60%,50%)]/15 text-[hsl(152,60%,50%)]"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <Button asChild size="sm" className="mt-3 gap-2">
            <Link to="/employee/training/bdr">
              <Zap className="h-3.5 w-3.5" /> Start Training
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
