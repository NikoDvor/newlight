import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { motion } from "framer-motion";
import { Globe, TrendingUp, Users, Calendar, Lightbulb, BarChart3, ArrowUpRight } from "lucide-react";

const trends = [
  { title: "Video content dominates engagement", detail: "Short-form video posts get 3.2x more engagement than static images. Reels and TikTok driving majority of new audience reach.", category: "Content" },
  { title: "Local search volume surging", detail: "'Near me' searches increased 28% in your market area. Mobile local searches converting at 18% higher rate.", category: "SEO" },
  { title: "AI-powered chat becoming standard", detail: "42% of competitors now use chatbots. Businesses with chat see 35% more lead captures from website visitors.", category: "Technology" },
  { title: "Review velocity matters more than ever", detail: "Google algorithm now weighs recency heavily. Businesses with 5+ monthly reviews rank 23% higher in local results.", category: "Reviews" },
];

const seasonalOpportunities = [
  { title: "Spring Home Services Push", timing: "Mar-May", description: "Home improvement searches peak. Launch targeted campaigns for seasonal services.", impact: "+32% lead volume" },
  { title: "Back-to-School Campaign", timing: "Jul-Aug", description: "Family-oriented services see 2x demand. Pre-schedule content and promotions.", impact: "+28% revenue" },
  { title: "Holiday Season Prep", timing: "Oct-Nov", description: "Start holiday promotions early. Competitors who launch in October capture 40% more market share.", impact: "+45% bookings" },
  { title: "New Year Momentum", timing: "Jan-Feb", description: "Resolution-driven demand spike. Position offerings around fresh starts and improvements.", impact: "+22% conversions" },
];

const buyerInsights = [
  { insight: "78% of your customers research online before calling", action: "Strengthen website content and reviews" },
  { insight: "Average buyer reads 4.2 reviews before choosing", action: "Increase review generation velocity" },
  { insight: "Mobile traffic accounts for 72% of your visits", action: "Prioritize mobile experience optimization" },
  { insight: "Customers prefer text over phone calls by 3:1", action: "Enable SMS booking and follow-up" },
];

export default function MarketResearch() {
  return (
    <div>
      <PageHeader title="Market Research" description="AI-powered market intelligence and trend analysis" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Market Trends" value="4" change="New this month" changeType="positive" icon={TrendingUp} />
        <MetricCard label="Buyer Insights" value="4" change="Actionable findings" changeType="positive" icon={Users} />
        <MetricCard label="Seasonal Opportunities" value="4" change="Upcoming windows" changeType="positive" icon={Calendar} />
        <MetricCard label="Competitive Position" value="#3" change="In local market" changeType="neutral" icon={BarChart3} />
      </WidgetGrid>

      <DataCard title="Market Trends" className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {trends.map((t, i) => (
            <motion.div key={i} className="rounded-xl p-4" style={{ background: "hsla(210,50%,99%,.6)", border: "1px solid hsla(211,96%,56%,.06)" }}
              initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} whileHover={{ y: -2 }}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "hsla(211,96%,56%,.08)", color: "hsl(211 96% 46%)" }}>{t.category}</span>
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{t.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{t.detail}</p>
            </motion.div>
          ))}
        </div>
      </DataCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <DataCard title="Seasonal Opportunities">
          <div className="space-y-3">
            {seasonalOpportunities.map((s, i) => (
              <motion.div key={i} className="py-3 border-b last:border-0" style={{ borderColor: "hsla(211,96%,56%,.06)" }}
                initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "hsla(197,92%,58%,.1)", color: "hsl(197 80% 42%)" }}>{s.timing}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{s.description}</p>
                <p className="text-[10px] font-bold" style={{ color: "hsl(211 96% 56%)" }}>{s.impact}</p>
              </motion.div>
            ))}
          </div>
        </DataCard>

        <DataCard title="Buyer Behavior Insights">
          <div className="space-y-3">
            {buyerInsights.map((b, i) => (
              <motion.div key={i} className="py-3 border-b last:border-0" style={{ borderColor: "hsla(211,96%,56%,.06)" }}
                initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: "hsl(211 96% 56%)" }} />
                  <div>
                    <p className="text-sm text-foreground">{b.insight}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <ArrowUpRight className="h-3 w-3" style={{ color: "hsl(197 92% 48%)" }} />
                      <span className="text-[10px] font-medium" style={{ color: "hsl(197 92% 48%)" }}>{b.action}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </DataCard>
      </div>
    </div>
  );
}
