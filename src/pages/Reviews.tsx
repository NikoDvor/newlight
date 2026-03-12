import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { Star, MessageSquare, TrendingUp, Send } from "lucide-react";

const reviews = [
  { author: "John D.", rating: 5, text: "Incredible service! Our marketing results have never been better.", platform: "Google", date: "2 days ago" },
  { author: "Amanda R.", rating: 5, text: "Professional team that delivers results. Highly recommended.", platform: "Google", date: "5 days ago" },
  { author: "Mark T.", rating: 4, text: "Great communication and solid strategy. Seeing real growth.", platform: "Yelp", date: "1 week ago" },
  { author: "Susan L.", rating: 5, text: "They transformed our online presence completely.", platform: "Google", date: "2 weeks ago" },
];

export default function Reviews() {
  return (
    <div>
      <PageHeader title="Reviews" description="Monitor and manage your online reputation" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Review Score" value="4.8" change="Based on 156 reviews" changeType="positive" icon={Star} />
        <MetricCard label="New Reviews" value="12" change="This month" changeType="positive" icon={MessageSquare} />
        <MetricCard label="Review Requests Sent" value="45" change="68% response rate" changeType="positive" icon={Send} />
        <MetricCard label="Review Growth" value="+24%" change="vs last quarter" changeType="positive" icon={TrendingUp} />
      </WidgetGrid>

      <DataCard title="Recent Reviews" className="mt-6">
        <div className="space-y-4">
          {reviews.map((r, i) => (
            <div key={i} className="py-4 border-b border-border last:border-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: r.rating }).map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{r.author}</span>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-secondary">{r.platform}</span>
                </div>
                <span className="text-xs text-muted-foreground">{r.date}</span>
              </div>
              <p className="text-sm text-muted-foreground">{r.text}</p>
            </div>
          ))}
        </div>
      </DataCard>
    </div>
  );
}
