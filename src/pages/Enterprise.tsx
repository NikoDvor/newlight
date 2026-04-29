import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Rocket, Calendar, CheckCircle, Zap, Globe, Search, Megaphone, Share2, Users, Star,
  BarChart3, Brain, Shield, ArrowRight, TrendingUp, Eye, Phone
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
  { step: "1", title: "Apply & Get Your Custom Demo", desc: "Submit your information and we build a tailored demo app, website, and growth analysis for your business" },
  { step: "2", title: "Strategy Session", desc: "We walk through your custom demo, audit findings, and growth opportunities in a live meeting" },
  { step: "3", title: "Activate Your Workspace", desc: "Say yes and your demo becomes your real live enterprise growth platform — instantly" },
  { step: "4", title: "Connect & Configure", desc: "Connect your accounts, upload branding, and your workspace is customized to your business" },
  { step: "5", title: "Launch & Grow", desc: "Book your kickoff, go live, and start growing with AI-powered automation" },
];

export default function Enterprise() {
  return (
    <div className="min-h-screen" style={{
      background: "linear-gradient(135deg, hsl(218 35% 10%) 0%, hsl(220 40% 16%) 50%, hsl(218 35% 10%) 100%)",
    }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[800px] h-[800px] rounded-full" style={{
          top: "-200px", right: "-200px",
          background: "radial-gradient(circle, hsla(211,96%,62%,.1), transparent 70%)", filter: "blur(100px)",
        }} />
        <div className="absolute w-[600px] h-[600px] rounded-full" style={{
          bottom: "-150px", left: "-100px",
          background: "radial-gradient(circle, hsla(197,92%,68%,.08), transparent 70%)", filter: "blur(80px)",
        }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{
            background: "linear-gradient(135deg, hsl(197 92% 68%), hsl(217 90% 58%))",
            boxShadow: "0 4px 20px -4px hsla(211,96%,56%,.4)",
          }}>
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">NewLight</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 text-xs">Sign In</Button>
          </Link>
          <Link to="/proposal-booking">
            <Button size="sm" className="text-xs h-9" style={{
              background: "linear-gradient(135deg, hsl(217 90% 58%), hsl(211 96% 56%))",
              boxShadow: "0 4px 20px -4px hsla(211,96%,56%,.4)",
            }}>
              <Calendar className="h-3.5 w-3.5 mr-1" /> Book Strategy Call
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center max-w-4xl mx-auto pt-16 pb-20 px-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6" style={{
            background: "hsla(211,96%,56%,.08)", border: "1px solid hsla(211,96%,56%,.15)"
          }}>
            <Zap className="h-3.5 w-3.5 text-[hsl(var(--nl-neon))]" />
            <span className="text-xs font-semibold text-[hsl(var(--nl-sky))]">Enterprise Growth System</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-4">
            The AI-Powered Growth
            <br />
            <span className="bg-gradient-to-r from-[hsl(var(--nl-sky))] to-[hsl(var(--nl-neon))] bg-clip-text text-transparent">Operating System</span>
          </h1>
          <p className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto mb-10">
            One platform. Every growth lever. AI-driven strategy. Automated reporting.
            Built for businesses ready to scale.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/proposal-booking">
              <Button size="lg" className="h-12 px-8 text-base" style={{
                background: "linear-gradient(135deg, hsl(217 90% 58%), hsl(211 96% 56%))",
                boxShadow: "0 4px 20px -4px hsla(211,96%,56%,.4)",
              }}>
                <Rocket className="h-5 w-5 mr-2" />
                Get My Custom Growth Demo
              </Button>
            </Link>
            <Link to="/proposal-booking">
              <Button size="lg" variant="outline" className="h-12 px-8 text-base border-white/15 text-white hover:bg-white/10">
                <Calendar className="h-5 w-5 mr-2" />
                Book Strategy Call
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6">
            <Link to="/proposal-booking" className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1">
              <Shield className="h-3 w-3" /> Apply for Enterprise Setup
            </Link>
            <a href="#how-it-works" className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1">
              <Eye className="h-3 w-3" /> See How It Works
            </a>
            <a href="tel:+18058363557" className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1">
              <Phone className="h-3 w-3" /> (805) 836-3557
            </a>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-20 relative z-10">
        <h2 className="text-2xl font-bold text-center text-white mb-8">Everything You Need to Grow</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="rounded-2xl p-5 text-center"
              style={{
                background: "hsla(218,35%,14%,.6)", backdropFilter: "blur(12px)",
                border: "1px solid hsla(211,96%,60%,.08)",
              }}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4, boxShadow: "0 0 28px -6px hsla(211,96%,60%,.22)" }}
            >
              <div className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "hsla(211,96%,56%,.1)" }}>
                <f.icon className="h-6 w-6 text-[hsl(var(--nl-sky))]" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">{f.title}</p>
              <p className="text-xs text-white/40">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-4xl mx-auto px-4 pb-20 relative z-10">
        <h2 className="text-2xl font-bold text-center text-white mb-8">How It Works</h2>
        <div className="space-y-4">
          {flow.map((s, i) => (
            <motion.div
              key={s.step}
              className="rounded-2xl p-5 flex items-center gap-5"
              style={{
                background: "hsla(218,35%,14%,.6)", backdropFilter: "blur(12px)",
                border: "1px solid hsla(211,96%,60%,.08)",
              }}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg text-[hsl(var(--nl-sky))]" style={{ background: "hsla(211,96%,56%,.1)" }}>
                {s.step}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{s.title}</p>
                <p className="text-xs text-white/40 mt-0.5">{s.desc}</p>
              </div>
              {i < flow.length - 1 && <ArrowRight className="h-4 w-4 text-white/20 ml-auto hidden sm:block" />}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center pb-20 px-4 relative z-10">
        <motion.div
          className="max-w-lg mx-auto rounded-2xl p-8"
          style={{
            background: "hsla(218,35%,14%,.8)", backdropFilter: "blur(24px)",
            border: "1px solid hsla(211,96%,60%,.15)",
            boxShadow: "0 0 48px -6px hsla(211,96%,60%,.2)",
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <Shield className="h-10 w-10 mx-auto mb-3 text-[hsl(var(--nl-sky))]" />
          <h3 className="text-xl font-bold text-white mb-2">Ready to Scale?</h3>
          <p className="text-sm text-white/40 mb-5">Get your custom growth demo and see exactly how NewLight can transform your business.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/proposal-booking">
              <Button size="lg" style={{
                background: "linear-gradient(135deg, hsl(217 90% 58%), hsl(211 96% 56%))",
                boxShadow: "0 4px 20px -4px hsla(211,96%,56%,.4)",
              }}>
                <Rocket className="h-4 w-4 mr-2" /> Get My Custom Growth Demo
              </Button>
            </Link>
            <a href="tel:+18058363557">
              <Button size="lg" variant="outline" className="border-white/15 text-white hover:bg-white/10">
                <Phone className="h-4 w-4 mr-2" /> Call (805) 836-3557
              </Button>
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
