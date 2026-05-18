import { PageHeader } from "@/components/PageHeader";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="p-6 space-y-6">
      <PageHeader title={title} description={description ?? "Coming soon."} />
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center text-white/60">
        <p className="text-sm">This module is being set up. Configuration and data will appear here soon.</p>
      </div>
    </div>
  );
}
