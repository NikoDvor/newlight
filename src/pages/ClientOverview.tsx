import { Eye } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { isNewLightInternal } from "@/lib/newlightInternal";
import BusinessHealth from "@/pages/BusinessHealth";
import RevenueOpportunities from "@/pages/RevenueOpportunities";
import PriorityActions from "@/pages/PriorityActions";
import LiveActivity from "@/pages/LiveActivity";

const internalViews = {
  health: BusinessHealth,
  revenue: RevenueOpportunities,
  actions: PriorityActions,
  activity: LiveActivity,
} as const;

export default function ClientOverview() {
  const { activeClientId } = useWorkspace();
  const [searchParams] = useSearchParams();

  if (isNewLightInternal(activeClientId)) {
    const requestedView = searchParams.get("view") ?? "health";
    const view = requestedView in internalViews
      ? requestedView as keyof typeof internalViews
      : "health";
    const ActiveView = internalViews[view];
    return <ActiveView />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <PageHeader
        title="Client Overview"
        description="Performance and monitoring across your client base."
      />

      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-border bg-card/60 px-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Eye className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Client Overview is coming soon</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Your client-wide performance and monitoring tools will appear here in a future update.
        </p>
      </div>
    </div>
  );
}