import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  PipelineInsightsView, RangeFilter, usePipelineInsights, type RangeKey,
} from "@/components/insights/PipelineInsightsView";

export default function SalesPipelineInsights() {
  const { activeClientId } = useWorkspace();
  const [range, setRange] = useState<RangeKey>("90");
  const { data, loading } = usePipelineInsights(activeClientId, range, !!activeClientId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Sales Pipeline Insights"
          description="Wins, losses, no-shows and objections across your sales pipeline."
        />
        <RangeFilter value={range} onChange={setRange} />
      </div>

      {!activeClientId ? (
        <div className="py-16 text-center text-sm text-white/40">No workspace selected.</div>
      ) : (
        <PipelineInsightsView data={data} loading={loading} />
      )}
    </div>
  );
}
