import { PageHeader } from "@/components/PageHeader";
import { DataCard } from "@/components/DataCard";
import { mockAuditItems } from "@/lib/salesData";
import { Globe, MessageSquare, BarChart3, Star, Search, FlaskConical, Eye, Clock, User, Send } from "lucide-react";

const ICONS: Record<string, typeof Globe> = {
  "Website Audit": Globe,
  "Social Analysis": MessageSquare,
  "CRM Bottleneck Analysis": BarChart3,
  "Reviews / Reputation Analysis": Star,
  "SEO / Local Visibility Analysis": Search,
  "Market Research": FlaskConical,
  "Website Preview": Eye,
};

const STATUS_STYLE: Record<string, { dot: string; bg: string }> = {
  "Not Started": { dot: "bg-muted-foreground", bg: "bg-secondary" },
  Running: { dot: "bg-amber-500 animate-pulse", bg: "bg-amber-50" },
  Ready: { dot: "bg-emerald-500", bg: "bg-emerald-50" },
  Failed: { dot: "bg-destructive", bg: "bg-red-50" },
};

export default function AuditPack() {
  return (
    <div>
      <PageHeader title="Audit Pack" description="Internal audit status for the active prospect" />

      {/* Top summary bar */}
      <div className="card-widget p-5 rounded-2xl mb-6">
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-muted-foreground" /><span className="metric-label mr-1">First Reminder:</span> Mar 13, 2026</div>
          <div className="flex items-center gap-2 text-sm"><Send className="h-4 w-4 text-muted-foreground" /><span className="metric-label mr-1">Send Timing:</span> 24h before meeting</div>
          <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4 text-muted-foreground" /><span className="metric-label mr-1">Salesman:</span> Alex M.</div>
          <div className="flex items-center gap-2 text-sm"><span className="metric-label mr-1">Delivery:</span><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Pending</span></div>
        </div>
      </div>

      {/* Audit cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
        {mockAuditItems.map((item) => {
          const Icon = ICONS[item.name] || Globe;
          const style = STATUS_STYLE[item.status];
          return (
            <div key={item.name} className={`card-widget rounded-2xl p-5 ${style.bg}`}>
              <div className="flex items-start justify-between mb-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                  <span className="text-xs font-medium">{item.status}</span>
                </div>
              </div>
              <p className="text-sm font-semibold">{item.name}</p>
            </div>
          );
        })}
      </div>

      {/* Pre-Meeting Audit Summary */}
      <DataCard title="Pre-Meeting Audit Summary">
        <div className="space-y-4">
          <div className="bg-secondary rounded-xl p-4">
            <p className="text-sm font-medium mb-1">Website</p>
            <p className="text-xs text-muted-foreground">Site loads in 3.2s, missing meta descriptions on 12 pages. Mobile score: 68/100. Recommend performance overhaul and SEO meta pass.</p>
          </div>
          <div className="bg-secondary rounded-xl p-4">
            <p className="text-sm font-medium mb-1">Reviews / Reputation</p>
            <p className="text-xs text-muted-foreground">4.2 avg rating across 87 reviews. 3 negative reviews in last 30 days. Recommend review response strategy and automated review request flow.</p>
          </div>
          <div className="bg-secondary rounded-xl p-4">
            <p className="text-sm font-medium mb-1">Overall Recommendation</p>
            <p className="text-xs text-muted-foreground">High-value prospect with clear pain points in website performance and reputation management. Suggest leading with website + reviews bundle as entry, upselling SEO and PPC after 90 days.</p>
          </div>
        </div>
      </DataCard>
    </div>
  );
}
