import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Rocket, Calendar, CheckCircle, Zap, Globe, Search, Megaphone, Share2, Users, Star,
  BarChart3, Brain, Shield, ArrowRight, Building2, TrendingUp
} from "lucide-react";

const features = [
  { icon: Globe, title: "Website & Landing Pages", desc: "AI-optimized pages that convert visitors into leads" },
  { icon: Search, title: "SEO & Content", desc: "Dominate local and organic search results" },
  { icon: Megaphone, title: "Paid Advertising", desc: "Google & Meta ads managed by AI with real-time optimization" },
  { icon: Share2, title: "Social Media", desc: "Automated posting, scheduling, and engagement tracking" },
  { icon: Users, title: "CRM & Pipeline", desc: "Lead management from first touch to closed deal" },
  { icon: Star, title: "Reputation Management", desc: "Automated review requests and response management" },
  { icon: BarChart3, title: "Revenue Tracking", desc: "Full attribution from marketing spend to revenue earned" },
  { icon: Brain, title: "AI Growth Advisor", desc: "Intelligent recommendations to accelerate your growth" },
];

const flow = [
  { step: "1", title: "Apply & Book", desc: "Submit your application and book a strategy call" },
  { step: "2", title: "Strategy Session", desc: "We audit your business and build a custom growth plan" },
  { step: "3", title: "Proposal & Approval", desc: "Review your enterprise setup proposal and approve" },
  { step: "4", title: "Workspace Created", desc: "Your dedicated AI workspace is automatically provisioned" },
  { step: "5", title: "Onboarding & Launch", desc: "Connect accounts, upload branding, and go live" },
];

export default function Enterprise() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="text-center max-w-4xl mx-auto pt-10 pb-16 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{
            background: "hsla(211,96%,56%,.08)", border: "1px solid hsla(211,96%,56%,.15)"
          }}>
            <Zap className="h-3.5 w-3.5" style={{ color: "hsl(211 96% 56%)" }} />
            <span className="text-xs font-semibold" style={{ color: "hsl(211 96% 46%)" }}>Enterprise Growth System</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            The AI-Powered Growth
            <br />
            <span className="metric-value">Operating System</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-8">
            One platform. Every growth lever. AI-driven strategy. Automated reporting.
            Built for businesses ready to scale.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="btn-gradient h-12 px-8 text-base">
              <Link to="/proposal-booking">
                <Calendar className="h-5 w-5 mr-2" />
                Book Strategy Call
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
              <Link to="/proposal-booking">
                <Rocket className="h-5 w-5 mr-2" />
                Apply for Enterprise Setup
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Everything You Need to Grow</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="card-widget text-center"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{
                background: "hsla(211,96%,56%,.08)"
              }}>
                <f.icon className="h-6 w-6" style={{ color: "hsl(211 96% 56%)" }} />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="space-y-4">
          {flow.map((s, i) => (
            <motion.div
              key={s.step}
              className="card-widget flex items-center gap-5"
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg" style={{
                background: "hsla(211,96%,56%,.1)", color: "hsl(211 96% 56%)"
              }}>
                {s.step}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              {i < flow.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground/30 ml-auto hidden sm:block" />}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center pb-16 px-4">
        <motion.div
          className="card-widget-glow max-w-lg mx-auto"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <Shield className="h-10 w-10 mx-auto mb-3" style={{ color: "hsl(211 96% 56%)" }} />
          <h3 className="text-xl font-bold mb-2">Ready to Scale?</h3>
          <p className="text-sm text-muted-foreground mb-5">Book a strategy call and discover how NewLight can grow your business.</p>
          <Button asChild size="lg" className="btn-gradient">
            <Link to="/proposal-booking">
              <Calendar className="h-4 w-4 mr-2" />
              Book Strategy Call
            </Link>
          </Button>
        </motion.div>
      </section>
    </div>
  );
}
