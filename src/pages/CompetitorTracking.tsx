import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { motion } from "framer-motion";
import { Eye, TrendingUp, Star, Megaphone, Share2, Globe, ArrowUpRight, BarChart3 } from "lucide-react";

const competitors = [
  {
    name: "Competitor A",
    reviewRating: 4.7, reviewCount: 189,
    socialPosts: 22, adActive: true,
    strengths: ["Strong social presence", "High review velocity"],
    weaknesses: ["Website speed issues", "No blog content"],
  },
  {
    name: "Competitor B",
    reviewRating: 4.5, reviewCount: 134,
    socialPosts: 15, adActive: true,
    strengths: ["Active Google Ads", "Good landing pages"],
    weaknesses: ["Low engagement rate", "Outdated website design"],
  },
  {
    name: "Competitor C",
    reviewRating: 4.3, reviewCount: 87,
    socialPosts: 8, adActive: false,
    strengths: ["Strong local SEO", "Good pricing strategy"],
    weaknesses: ["No social presence", "No paid ads"],
  },
];

const yourMetrics = { reviewRating: 4.2, reviewCount: 96, socialPosts: 6, adActive: false };

const opportunities = [
  { title: "Outperform Competitor C on social media", detail: "They only post 8x/month. Increase to 18 posts to dominate this channel.", impact: "+25% visibility" },
  { title: "Match Competitor A's review velocity", detail: "They get 12 reviews/month vs your 3. Automate review requests after service.", impact: "+0.4★ rating improvement" },
  { title: "Launch ads before Competitor C", detail: "They have no ad presence. Capture their audience with targeted campaigns.", impact: "+37 leads/month" },
  { title: "Create content Competitor B lacks", detail: "They have no blog. Publishing 4 articles/month would give you SEO advantage.", impact: "+18% organic traffic" },
];

export default function CompetitorTracking() {
  return (
    <div>
      <PageHeader title="Competitor Tracking" description="AI-powered competitive intelligence analysis" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Competitors Tracked" value="3" change="Active monitoring" changeType="positive" icon={Eye} />
        <MetricCard label="Your Market Position" value="#3" change="Room to improve" changeType="neutral" icon={BarChart3} />
        <MetricCard label="Opportunities Found" value="4" change="Actionable gaps" changeType="positive" icon={TrendingUp} />
        <MetricCard label="Your vs Top Rating" value="4.2 vs 4.7" change="Gap: 0.5 stars" changeType="neutral" icon={Star} />
      </WidgetGrid>

      {/* Competitor Comparison */}
      <DataCard title="Competitor Comparison" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "hsla(211,96%,56%,.06)" }}>
                <th className="text-left py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Business</th>
                <th className="text-center py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rating</th>
                <th className="text-center py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reviews</th>
                <th className="text-center py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Posts/mo</th>
                <th className="text-center py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Running Ads</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b" style={{ borderColor: "hsla(211,96%,56%,.06)", background: "hsla(211,96%,56%,.04)" }}>
                <td className="py-3 font-semibold" style={{ color: "hsl(211 96% 56%)" }}>Your Business</td>
                <td className="py-3 text-center font-medium">{yourMetrics.reviewRating}★</td>
                <td className="py-3 text-center">{yourMetrics.reviewCount}</td>
                <td className="py-3 text-center">{yourMetrics.socialPosts}</td>
                <td className="py-3 text-center">{yourMetrics.adActive ? "Yes" : "No"}</td>
              </tr>
              {competitors.map((c, i) => (
                <tr key={i} className="border-b last:border-0" style={{ borderColor: "hsla(211,96%,56%,.06)" }}>
                  <td className="py-3 font-medium text-foreground">{c.name}</td>
                  <td className="py-3 text-center">{c.reviewRating}★</td>
                  <td className="py-3 text-center">{c.reviewCount}</td>
                  <td className="py-3 text-center">{c.socialPosts}</td>
                  <td className="py-3 text-center">{c.adActive ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>

      <DataCard title="Competitive Opportunities" className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {opportunities.map((o, i) => (
            <motion.div key={i} className="rounded-xl p-4" style={{ background: "hsla(210,50%,99%,.6)", border: "1px solid hsla(211,96%,56%,.06)" }}
              initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} whileHover={{ y: -2 }}>
              <p className="text-sm font-semibold text-foreground mb-1">{o.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">{o.detail}</p>
              <div className="flex items-center gap-1.5">
                <ArrowUpRight className="h-3 w-3" style={{ color: "hsl(211 96% 56%)" }} />
                <span className="text-[10px] font-bold" style={{ color: "hsl(211 96% 56%)" }}>{o.impact}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </DataCard>
    </div>
  );
}
