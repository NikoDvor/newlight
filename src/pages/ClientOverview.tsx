import { Eye } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export default function ClientOverview() {
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