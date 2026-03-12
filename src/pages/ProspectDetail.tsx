import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { StatusChip } from "@/components/StatusChip";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { User, Building2, Mail, Phone, Calendar, FileText, BarChart3, Globe, MessageSquare, Search, Eye } from "lucide-react";

const prospect = {
  name: "Lisa Park",
  company: "Bloom Agency",
  assignedSalesman: "Alex M.",
  currentStatus: "Audit Running" as const,
  meetingStatus: "Scheduled — Mar 14",
  proposalStatus: "Pending Audit Completion",
  email: "lisa@bloom.co",
  phone: "(555) 345-6789",
  businessType: "Agency",
  location: "Los Angeles, CA",
  reasonForInquiry: "Looking for comprehensive SEO and PPC management to scale lead generation for their clients.",
  timeline: "Within 1 Month",
  decisionMaker: "Yes",
  budgetRange: "$2,500 – $5,000/mo",
  proposalRecipient: "lisa@bloom.co",
};

const auditCards = [
  { name: "Website Audit", icon: Globe, status: "Ready" },
  { name: "Social Analysis", icon: MessageSquare, status: "Running" },
  { name: "CRM Bottleneck Analysis", icon: BarChart3, status: "Not Started" },
  { name: "Market Research", icon: Search, status: "Not Started" },
  { name: "Website Preview", icon: Eye, status: "Ready" },
];

const STATUS_DOT: Record<string, string> = {
  Ready: "bg-emerald-500",
  Running: "bg-amber-500 animate-pulse",
  "Not Started": "bg-muted-foreground",
  Failed: "bg-destructive",
};

export default function ProspectDetail() {
  return (
    <div>
      <PageHeader title={prospect.name} description={prospect.company} />

      {/* Top summary */}
      <div className="card-widget p-6 rounded-2xl mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <StatusChip status={prospect.currentStatus} />
          <div className="flex items-center gap-1.5 text-sm"><User className="h-3.5 w-3.5 text-muted-foreground" /> {prospect.assignedSalesman}</div>
          <div className="flex items-center gap-1.5 text-sm"><Calendar className="h-3.5 w-3.5 text-muted-foreground" /> {prospect.meetingStatus}</div>
          <div className="flex items-center gap-1.5 text-sm"><FileText className="h-3.5 w-3.5 text-muted-foreground" /> {prospect.proposalStatus}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Intake Summary */}
        <DataCard title="Intake Summary">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="metric-label">Email</p><p className="text-sm mt-1">{prospect.email}</p></div>
            <div><p className="metric-label">Phone</p><p className="text-sm mt-1">{prospect.phone}</p></div>
            <div><p className="metric-label">Business Type</p><p className="text-sm mt-1">{prospect.businessType}</p></div>
            <div><p className="metric-label">Location</p><p className="text-sm mt-1">{prospect.location}</p></div>
            <div><p className="metric-label">Timeline</p><p className="text-sm mt-1">{prospect.timeline}</p></div>
            <div><p className="metric-label">Decision Maker</p><p className="text-sm mt-1">{prospect.decisionMaker}</p></div>
            <div><p className="metric-label">Budget (Internal)</p><p className="text-sm mt-1 font-medium">{prospect.budgetRange}</p></div>
            <div><p className="metric-label">Proposal Recipient</p><p className="text-sm mt-1">{prospect.proposalRecipient}</p></div>
          </div>
        </DataCard>

        {/* Reason for Inquiry */}
        <DataCard title="Reason for Inquiry">
          <p className="text-sm text-muted-foreground">{prospect.reasonForInquiry}</p>

          <div className="mt-6">
            <p className="metric-label mb-2">Notes</p>
            <Textarea placeholder="Add internal notes…" className="min-h-[80px]" />
            <Button size="sm" className="mt-2">Save</Button>
          </div>
        </DataCard>

        {/* Audit Pack Status */}
        <DataCard title="Audit Pack Status" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {auditCards.map((a) => (
              <div key={a.name} className="flex items-center gap-3 bg-secondary rounded-xl p-4">
                <a.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.name}</p>
                </div>
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_DOT[a.status]}`} />
                <span className="text-xs text-muted-foreground">{a.status}</span>
              </div>
            ))}
          </div>
        </DataCard>

        {/* Timeline */}
        <DataCard title="Timeline Activity" className="lg:col-span-2">
          <div className="space-y-3">
            {[
              { text: "Proposal booking form submitted", time: "Mar 8, 2026" },
              { text: "Assigned to Alex M.", time: "Mar 8, 2026" },
              { text: "Intake form received", time: "Mar 9, 2026" },
              { text: "Audit pack started", time: "Mar 10, 2026" },
              { text: "Website Audit completed", time: "Mar 11, 2026" },
              { text: "Meeting scheduled for Mar 14", time: "Mar 11, 2026" },
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm">{item.text}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      </div>
    </div>
  );
}
