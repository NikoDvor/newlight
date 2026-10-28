import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { NewLightHero } from "@/components/admin/NewLightHero";
import { supabase } from "@/integrations/supabase/client";
import { RevenueByPeriod } from "@/components/pipeline/RevenueByPeriod";
import { PipelineRevenueOpportunity } from "@/components/pipeline/PipelineRevenueOpportunity";
import PipelineBoard from "@/components/pipeline/PipelineBoard";
import AdminPipelineMeetings from "@/components/admin/AdminPipelineMeetings";
import AdminBdrMeetingAnalytics from "@/pages/admin/AdminBdrMeetingAnalytics";
import { NEWLIGHT_INTERNAL_CLIENT_ID } from "@/hooks/useEmployeeClientId";

/**
 * Admin home: NewLight's sales pipeline (every salesman's leads, meetings,
 * Forms 1–3 and outcomes), in four tabs:
 *   Overview — revenue opportunity panel + won revenue by period
 *   Board    — every lead by stage
 *   Meetings — meetings needing an outcome + upcoming
 *   Results  — Sales Team Results (close rates, losses, effort, discovery numbers)
 */
const TABS = [
  { key: "overview", label: "Overview", to: "/admin" },
  { key: "board", label: "Board", to: "/admin/pipeline/board" },
  { key: "meetings", label: "Meetings", to: "/admin/pipeline/meetings" },
  { key: "results", label: "Results", to: "/admin/pipeline/results" },
] as const;

export default function AdminPipeline() {
  const { tab = "overview" } = useParams<{ tab?: string }>();
  const [reps, setReps] = useState<{ user_id: string; full_name: string }[]>([]);
  const [rep, setRep] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: leadsReps } = await (supabase as any).from("bdr_calendars").select("user_id");
      const ids = Array.from(new Set((leadsReps || []).map((r: any) => r.user_id)));
      if (!ids.length) return;
      const { data: emps } = await (supabase as any).from("employee_profiles").select("user_id, full_name").in("user_id", ids);
      setReps((emps || []).filter((e: any) => e.full_name).sort((a: any, b: any) => a.full_name.localeCompare(b.full_name)));
    })();
  }, []);

  const showRepFilter = tab === "board" || tab === "meetings";

  return (
    <div className="space-y-5 sm:space-y-6">
      {tab !== "results" && (
        <NewLightHero title="Pipeline" subtitle="Every lead, meeting and form across your salesmen — Cold → Warm → Hot → Won" />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl p-1 bg-white/[0.04] border border-white/10">
          {TABS.map((t) => (
            <NavLink key={t.key} to={t.to} end
              className={() => `px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === t.key ? "bg-[hsla(211,96%,60%,.2)] text-white" : "text-white/55 hover:text-white"}`}>
              {t.label}
            </NavLink>
          ))}
        </div>
        {showRepFilter && (
          <select value={rep} onChange={(e) => setRep(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white">
            <option value="" className="bg-[hsl(215,35%,12%)]">All salesmen</option>
            {reps.map((r) => <option key={r.user_id} value={r.user_id} className="bg-[hsl(215,35%,12%)]">{r.full_name}</option>)}
          </select>
        )}
      </div>

      {tab === "overview" && (
        <>
          <PipelineRevenueOpportunity clientId={NEWLIGHT_INTERNAL_CLIENT_ID} variant="admin" source="bdr" />
          <RevenueByPeriod clientId={NEWLIGHT_INTERNAL_CLIENT_ID} />
        </>
      )}
      {tab === "board" && <PipelineBoard scope="team" repUserId={rep || undefined} />}
      {tab === "meetings" && <AdminPipelineMeetings repUserId={rep || undefined} />}
      {tab === "results" && <AdminBdrMeetingAnalytics />}
    </div>
  );
}
