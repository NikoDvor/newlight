import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Quote } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { daysLeft, loadWhy, quoteOfTheDay, WHY_MODULE, type WhyRow } from "@/lib/academy";

/**
 * My Pipeline: the salesman's own goal countdown (small, top-center) and today's quote (small, corner).
 * Both come from Training Module 9. Private to the salesman.
 */
export default function WhyStrip() {
  const { user } = useWorkspace();
  const [why, setWhy] = useState<WhyRow | null | undefined>(undefined);
  useEffect(() => {
    if (!user?.id) return;
    loadWhy(user.id).then((r) => setWhy(r.current)).catch(() => setWhy(null));
  }, [user?.id]);
  if (why === undefined) return <div className="h-7" />;

  const left = why ? daysLeft(why.deadline) : null;
  return (
    <div className="relative flex flex-col items-center gap-1.5 sm:block sm:h-8">
      <div className="flex justify-center">
        {why ? (
          <Link to={`/employee/training/m/${WHY_MODULE}`} title={why.goal}
            className="inline-flex items-baseline gap-1.5 rounded-md border border-[hsla(197,100%,55%,.3)] bg-[hsla(197,100%,55%,.07)] px-2.5 py-1">
            <span className="text-[15px] font-bold tabular-nums text-white">{left}</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-[hsl(197,100%,68%)]">days left</span>
            <span className="hidden sm:inline max-w-[220px] truncate text-[11px] text-white/50">· {why.goal}</span>
          </Link>
        ) : (
          <Link to={`/employee/training/m/${WHY_MODULE}`} className="text-[11px] text-white/45 hover:text-white">Set your goal and deadline →</Link>
        )}
      </div>
      <div className="flex max-w-[280px] items-start gap-1.5 text-[11px] italic leading-snug text-white/50 sm:absolute sm:right-0 sm:top-0 sm:text-right">
        <Quote className="h-3 w-3 shrink-0 mt-0.5 text-[hsl(197,100%,60%)] sm:order-2" />
        <span>{quoteOfTheDay(why)}</span>
      </div>
    </div>
  );
}
