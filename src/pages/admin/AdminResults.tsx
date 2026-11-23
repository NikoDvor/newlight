import { useEffect, useMemo, useState } from "react";
import { NavLink, Navigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminBdrMeetingAnalytics from "@/pages/admin/AdminBdrMeetingAnalytics";
import AdminRepScorecard from "@/pages/admin/AdminRepScorecard";
import { RANGE_OPTIONS, type RangeKey } from "@/components/insights/PipelineInsightsView";

// Same remembered filter as the Pipeline page, so the rep and date range carry over.
const FILTER_KEY = "nl_admin_pipeline_filter";
function loadFilter(): { rep: string; range: RangeKey } {
  try {
    const v = JSON.parse(sessionStorage.getItem(FILTER_KEY) || "{}");
    return { rep: typeof v.rep === "string" ? v.rep : "", range: ["30", "90", "365", "all"].includes(v.range) ? v.range : "90" };
  } catch { return { rep: "", range: "90" }; }
}

/**
 * Results: the sales team's numbers in one module, in pages.
 *   Team Results   — close rates, losses, meeting effort, discovery numbers (team or one salesman)
 *   Rep Scorecard  — every salesman side by side, with coaching notes
 */
const TABS = [
  { key: "team", label: "Team Results", to: "/admin/results" },
  { key: "scorecard", label: "Rep Scorecard", to: "/admin/results/scorecard" },
] as const;

export default function AdminResults() {
  const { tab = "team" } = useParams<{ tab?: string }>();
  const [reps, setReps] = useState<{ user_id: string; full_name: string }[]>([]);
  const [rep, setRep] = useState<string>(() => loadFilter().rep);
  const [range, setRange] = useState<RangeKey>(() => loadFilter().range);
  useEffect(() => {
    try { sessionStorage.setItem(FILTER_KEY, JSON.stringify({ rep, range })); } catch { /* per-viewer convenience only */ }
  }, [rep, range]);
  useEffect(() => {
    (async () => {
      const { data: leadsReps } = await (supabase as any).from("bdr_calendars").select("user_id");
      const ids = Array.from(new Set((leadsReps || []).map((r: any) => r.user_id)));
      if (!ids.length) return;
      const { data: emps } = await (supabase as any).from("employee_profiles").select("user_id, full_name").in("user_id", ids);
      setReps((emps || []).filter((e: any) => e.full_name).sort((a: any, b: any) => a.full_name.localeCompare(b.full_name)));
    })();
  }, []);
  const known = useMemo(() => TABS.some((t) => t.key === tab), [tab]);
  if (!known) return <Navigate to="/admin/results" replace />;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl p-1 bg-white/[0.04] border border-white/10">
          {TABS.map((t) => (
            <NavLink key={t.key} to={t.to} end
              className={() => `px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === t.key ? "bg-[hsla(211,96%,60%,.2)] text-white" : "text-white/55 hover:text-white"}`}>
              {t.label}
            </NavLink>
          ))}
        </div>
        {tab === "team" && (
          <div className="flex items-center gap-2">
            <select value={rep} onChange={(e) => setRep(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white">
              <option value="" className="bg-[hsl(215,35%,12%)]">All salesmen</option>
              {reps.map((r) => <option key={r.user_id} value={r.user_id} className="bg-[hsl(215,35%,12%)]">{r.full_name}</option>)}
            </select>
            <select value={range} onChange={(e) => setRange(e.target.value as RangeKey)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white">
              {RANGE_OPTIONS.map((o) => <option key={o.key} value={o.key} className="bg-[hsl(215,35%,12%)]">{o.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {tab === "team" && <AdminBdrMeetingAnalytics embedded range={range} repUserId={rep} onRepChange={setRep} />}
      {tab === "scorecard" && <AdminRepScorecard />}
    </div>
  );
}
