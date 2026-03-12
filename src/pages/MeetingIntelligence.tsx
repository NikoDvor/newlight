import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/MetricCard";
import { DataCard } from "@/components/DataCard";
import { WidgetGrid } from "@/components/WidgetGrid";
import { motion } from "framer-motion";
import { Calendar, MessageSquare, Target, TrendingUp, Star, ArrowUpRight, AlertTriangle } from "lucide-react";

const recentMeetings = [
  {
    title: "Discovery Call — ABC Corp",
    date: "Mar 10, 2026",
    duration: "32 min",
    summary: "Client interested in full-service marketing package. Budget: $3-5K/month. Key concerns: ROI tracking and reporting frequency.",
    objections: ["Worried about long-term commitment", "Wants to see case studies"],
    interests: ["SEO + Ads bundle", "Monthly reporting", "Social media management"],
    nextSteps: ["Send proposal by Mar 12", "Share 3 case studies", "Schedule follow-up Mar 14"],
    score: 82,
  },
  {
    title: "Strategy Review — XYZ Inc",
    date: "Mar 8, 2026",
    duration: "45 min",
    summary: "Existing client review. Performance up 28% QoQ. Client wants to expand into paid social. Discussed budget increase for Q2.",
    objections: ["Hesitant on TikTok ads", "Concerned about seasonal fluctuation"],
    interests: ["Facebook Ads expansion", "Landing page redesign", "More frequent reporting"],
    nextSteps: ["Draft Q2 expansion proposal", "Create TikTok pilot proposal", "Update reporting cadence"],
    score: 91,
  },
  {
    title: "Closing Call — Local Dental",
    date: "Mar 6, 2026",
    duration: "28 min",
    summary: "Follow-up on initial proposal. Client ready to proceed with SEO + Reviews package. Wants to start within 2 weeks.",
    objections: ["Pricing slightly above expectations"],
    interests: ["Local SEO focus", "Review automation", "Google Business optimization"],
    nextSteps: ["Send contract", "Schedule onboarding call", "Set up review automation"],
    score: 95,
  },
];

const coachingNotes = [
  { note: "Strong discovery questions — continue asking about pain points early", type: "positive" },
  { note: "Consider addressing pricing concerns earlier in the call", type: "improvement" },
  { note: "Excellent use of case studies to build credibility", type: "positive" },
  { note: "Follow-up timing could be faster — aim for same-day proposals", type: "improvement" },
];

export default function MeetingIntelligence() {
  return (
    <div>
      <PageHeader title="Meeting Intelligence" description="AI-powered meeting analysis and coaching insights" />

      <WidgetGrid columns="repeat(auto-fit, minmax(220px, 1fr))">
        <MetricCard label="Meetings This Month" value="8" change="+3 vs last month" changeType="positive" icon={Calendar} />
        <MetricCard label="Avg Meeting Score" value="89" change="Above target" changeType="positive" icon={Star} />
        <MetricCard label="Close Rate" value="62%" change="+8% improvement" changeType="positive" icon={Target} />
        <MetricCard label="Pipeline from Meetings" value="$18.4K" change="This month" changeType="positive" icon={TrendingUp} />
      </WidgetGrid>

      {/* Recent Meetings */}
      <div className="space-y-4 mt-6">
        {recentMeetings.map((m, i) => (
          <motion.div key={i} className="card-widget"
            initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
            <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{m.title}</p>
                <p className="text-xs text-muted-foreground">{m.date} · {m.duration}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: "hsla(211,96%,56%,.08)", color: "hsl(211 96% 46%)" }}>
                  Score: {m.score}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">{m.summary}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Objections</p>
                {m.objections.map((o, j) => (
                  <div key={j} className="flex items-start gap-1.5 mb-1">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "hsl(211 80% 65%)" }} />
                    <span className="text-[11px] text-foreground">{o}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Interests</p>
                {m.interests.map((int, j) => (
                  <div key={j} className="flex items-start gap-1.5 mb-1">
                    <Target className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "hsl(211 96% 56%)" }} />
                    <span className="text-[11px] text-foreground">{int}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Next Steps</p>
                {m.nextSteps.map((s, j) => (
                  <div key={j} className="flex items-start gap-1.5 mb-1">
                    <ArrowUpRight className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "hsl(197 92% 48%)" }} />
                    <span className="text-[11px] text-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Coaching Notes */}
      <DataCard title="AI Coaching Notes" className="mt-6">
        <div className="space-y-3">
          {coachingNotes.map((c, i) => (
            <motion.div key={i} className="flex items-start gap-3 py-2"
              initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
              <div className="mt-0.5 h-2 w-2 rounded-full shrink-0" style={{
                background: c.type === "positive" ? "hsl(211 96% 56%)" : "hsl(211 80% 65%)"
              }} />
              <p className="text-sm text-foreground">{c.note}</p>
            </motion.div>
          ))}
        </div>
      </DataCard>
    </div>
  );
}
