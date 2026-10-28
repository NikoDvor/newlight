import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MeetingOutcomeAnalytics from "@/components/admin/MeetingOutcomeAnalytics";
import MeetingEffortCard from "@/components/admin/MeetingEffortCard";
import { RANGE_OPTIONS, type RangeKey } from "@/components/insights/PipelineInsightsView";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { GenericPipelineDashboard } from "@/components/employee/GenericPipelineDashboard";

export default function BDRMyStats() {
  const { user } = useWorkspace();
  const [range, setRange] = useState<RangeKey>("90");

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">My Stats</h1>
          <p className="text-xs text-white/50">Your meeting outcomes, close rates, objections, training and activity.</p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <SelectTrigger className="w-[170px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key} className="text-xs">{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {user?.id ? (
        <>
          <MeetingEffortCard range={range} title="My meeting effort vs team average" />
          <MeetingOutcomeAnalytics range={range} repFilter={user.id} reps={[]} onRepSelect={() => {}} repUserId={user.id} />
          {/* Month stats, objections, outcomes, practice, training, activity (moved from the home page) */}
          <GenericPipelineDashboard section="stats" />
        </>
      ) : (
        <p className="text-sm text-white/50">Sign in to see your stats.</p>
      )}
    </div>
  );
}
