import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";

export default function AdminGrowthAdvisor() {
  return (
    <div>
      <PageHeader
        title="AI Growth Advisor — All Clients"
        description="Cross-client growth intelligence and opportunity analysis"
      />
      <DataCard title="Client Growth Opportunities">
        <div className="py-10 text-center">
          <p className="text-base font-semibold text-foreground">No data yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Growth scores and recommended actions for each client will appear here once clients are live.</p>
        </div>
      </DataCard>
    </div>
  );
}
