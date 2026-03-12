import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Send, FileText, AlertCircle } from "lucide-react";

const packages = [
  { name: "Starter", price: "$997/mo", features: ["Website Management", "Google Business", "Review Management", "Monthly Report"], recommended: false },
  { name: "Growth", price: "$1,997/mo", features: ["Everything in Starter", "SEO Optimization", "Social Media (2 platforms)", "Paid Ads Management", "Bi-weekly Reports"], recommended: true },
  { name: "Scale", price: "$3,497/mo", features: ["Everything in Growth", "Full Social Media Suite", "Content Marketing", "CRM Pipeline", "Weekly Strategy Calls", "Priority Support"], recommended: false },
];

export default function ProposalDraft() {
  return (
    <div>
      <PageHeader title="Proposal Draft" description="Review and approve the proposal before sending to the prospect">
        <div className="flex gap-2">
          <Button variant="outline" className="gap-1.5"><AlertCircle className="h-4 w-4" /> Request Changes</Button>
          <Button variant="outline" className="gap-1.5"><CheckCircle className="h-4 w-4" /> Approve</Button>
          <Button className="gap-1.5"><Send className="h-4 w-4" /> Send Proposal</Button>
        </div>
      </PageHeader>

      {/* Proposal version card */}
      <div className="card-widget p-5 rounded-2xl mb-6 flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-accent" />
          <div>
            <p className="text-sm font-semibold">Proposal v2.1 — Bloom Agency</p>
            <p className="text-xs text-muted-foreground">Created Mar 11, 2026 · Updated Mar 12, 2026</p>
          </div>
        </div>
        <Badge className="bg-amber-50 text-amber-700 border-amber-200">Needs Approval</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {packages.map((pkg) => (
          <div key={pkg.name} className={`card-widget p-6 rounded-2xl relative ${pkg.recommended ? "ring-2 ring-accent" : ""}`}>
            {pkg.recommended && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-medium px-3 py-1 rounded-full">
                Recommended
              </span>
            )}
            <h3 className="text-lg font-semibold mt-1">{pkg.name}</h3>
            <p className="text-2xl font-bold tabular-nums mt-2">{pkg.price}</p>
            <ul className="mt-4 space-y-2">
              {pkg.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DataCard title="Meeting Summary">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Primary Problem:</span> Low organic visibility and inconsistent lead generation.</p>
            <p><span className="font-medium text-foreground">Main Offer:</span> Growth Package with SEO + PPC focus.</p>
            <p><span className="font-medium text-foreground">Route of Action:</span> Start with website audit fixes, launch Google Ads in week 2, begin SEO content strategy in month 2.</p>
            <p><span className="font-medium text-foreground">Priority Channels:</span> SEO, PPC, Website</p>
          </div>
        </DataCard>

        <DataCard title="Audit Summary">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Website:</span> Score 68/100, 3.2s load time, 12 missing meta descriptions.</p>
            <p><span className="font-medium text-foreground">Reviews:</span> 4.2 avg (87 reviews), 3 negative in past 30 days.</p>
            <p><span className="font-medium text-foreground">SEO:</span> Ranking for 14 keywords, 0 in top 3. Estimated traffic: 420/mo.</p>
            <p><span className="font-medium text-foreground">Recommendation:</span> Website + Reviews bundle to start, upsell SEO/PPC after 90 days.</p>
          </div>
        </DataCard>
      </div>

      {/* Note: Budget is intentionally excluded from proposal content */}
    </div>
  );
}
