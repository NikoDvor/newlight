import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { Gift, Users } from "lucide-react";

const metrics = [
  { label: "Active Referrers", value: "—", change: "Activating", changeType: "neutral" as const },
  { label: "Referrals Sent", value: "—", change: "Activating", changeType: "neutral" as const },
  { label: "Conversions", value: "—", change: "Activating", changeType: "neutral" as const },
  { label: "Revenue Generated", value: "—", change: "Activating", changeType: "neutral" as const },
];

export default function ReferralProgram() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Referral & Partner Program"
        description="Turn clients and partners into a growth channel with tracked referrals and rewards."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value}
            change={m.change}
            changeType={m.changeType}
            icon={Gift}
          />
        ))}
      </div>

      <div
        className="rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4 border"
        style={{
          background: "hsla(215,35%,10%,.8)",
          borderColor: "hsla(211,96%,60%,.12)",
        }}
      >
        <div
          className="p-4 rounded-full"
          style={{ background: "hsla(211,96%,60%,.12)" }}
        >
          <Users className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Referral Engine</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Partner tracking and referral rewards are being configured. Invite links and conversion metrics will be available soon.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          Activating
        </span>
      </div>
    </div>
  );
}
