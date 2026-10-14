import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";

export default function AgencyDashboard() {
  return (
    <div>
      <PageHeader title="Agency Overview" description="Master dashboard across all clients" />
      <DataCard title="Client Leaderboard">
        <div className="py-10 text-center">
          <p className="text-base font-semibold text-foreground">No data yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Leads, appointments and conversion for each client will appear here once clients are live.</p>
        </div>
      </DataCard>
    </div>
  );
}
