import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Zap, BarChart3, CalendarCheck, DollarSign, CheckCircle2, Activity } from "lucide-react";
import newlightLogo from "@/assets/newlight-logo.jpg";

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } }) };

const stats = [
  { label: "Leads Captured", value: "127", icon: BarChart3, color: "from-blue-500 to-cyan-400" },
  { label: "Calls Booked", value: "34", icon: CalendarCheck, color: "from-emerald-500 to-teal-400" },
  { label: "Revenue Tracked", value: "$48.2k", icon: DollarSign, color: "from-amber-500 to-orange-400" },
  { label: "Automations Active", value: "12", icon: Zap, color: "from-violet-500 to-purple-400" },
];

const features = [
  { icon: Zap, title: "Smart Automations", desc: "Follow-ups, reminders, and workflows run without you lifting a finger." },
  { icon: BarChart3, title: "Lead Tracking", desc: "Every lead captured, scored, and routed — no one falls through the cracks." },
  { icon: CalendarCheck, title: "Appointment Engine", desc: "Booking pages, calendars, and confirmations — all automated." },
  { icon: DollarSign, title: "Revenue Visibility", desc: "See exactly where your money is coming from and what's on the table." },
];

const steps = [
  { num: "01", title: "We Build It", desc: "Our team configures your entire system — CRM, automations, pipelines, and more." },
  { num: "02", title: "You Get Access", desc: "Log in to a fully operational command center built around your business." },
  { num: "03", title: "System Runs", desc: "Leads flow in, appointments book, follow-ups fire — revenue grows on autopilot." },
];

export default function Landing() {
  const navigate = useNavigate();
  const go = () => navigate("/auth");

  return (
    <div className="min-h-screen bg-[hsl(218,38%,6%)] text-white overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(ellipse 80% 60% at 50% 20%, hsla(211,96%,60%,.08), transparent 70%)",
      }} />
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(hsla(211,96%,60%,.06) 1px, transparent 1px), linear-gradient(90deg, hsla(211,96%,60%,.06) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        maskImage: "radial-gradient(ellipse 70% 50% at 50% 30%, black, transparent)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 50% at 50% 30%, black, transparent)",
      }} />

      {/* Nav */}
      <motion.nav
        className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <img src={newlightLogo} alt="NewLight" className="h-8 sm:h-9 w-auto object-contain" />
        <button
          onClick={go}
          className="text-xs font-semibold tracking-wider uppercase px-5 py-2.5 rounded-full border transition-all duration-200 hover:bg-white/10"
          style={{ borderColor: "hsla(211,96%,60%,.3)", color: "hsla(211,96%,70%,.9)" }}
        >
          Sign In
        </button>
      </motion.nav>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-16 sm:pt-24 pb-12 text-center">
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase mb-8"
          style={{ background: "hsla(211,96%,60%,.1)", border: "1px solid hsla(211,96%,60%,.2)", color: "hsl(197,92%,68%)" }}
          custom={0} initial="hidden" animate="visible" variants={fadeUp}
        >
          <Activity className="h-3.5 w-3.5" />
          Your system is already live and tracking data
        </motion.div>

        <motion.h1
          className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6"
          custom={1} initial="hidden" animate="visible" variants={fadeUp}
        >
          Your Entire Business,{" "}
          <span className="bg-gradient-to-r from-[hsl(211,96%,60%)] to-[hsl(197,92%,68%)] bg-clip-text text-transparent">
            Automated & Tracked
          </span>{" "}
          in One System
        </motion.h1>

        <motion.p
          className="text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: "hsla(0,0%,100%,.5)" }}
          custom={2} initial="hidden" animate="visible" variants={fadeUp}
        >
          We build, track, and optimize everything for you — so you never miss revenue again.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
          custom={3} initial="hidden" animate="visible" variants={fadeUp}
        >
          <button
            onClick={go}
            className="group flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm tracking-wide text-white transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, hsl(211,96%,56%), hsl(197,92%,58%))",
              boxShadow: "0 4px 24px -4px hsla(211,96%,56%,.5)",
            }}
          >
            Access My System
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={go}
            className="flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm tracking-wide transition-all duration-200 hover:bg-white/5"
            style={{ border: "1px solid hsla(0,0%,100%,.12)", color: "hsla(0,0%,100%,.7)" }}
          >
            See My Dashboard
          </button>
        </motion.div>
      </section>

      {/* Live snapshot */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        >
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: "hsl(197,92%,68%)" }}>
            Live Business Snapshot
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold">Your Numbers, Right Now</h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              className="rounded-2xl p-5 sm:p-6 border backdrop-blur-sm"
              style={{ background: "hsla(0,0%,100%,.03)", borderColor: "hsla(0,0%,100%,.06)" }}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.1 }}
            >
              <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${s.color} mb-3`}>
                <s.icon className="h-4 w-4 text-white" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold">{s.value}</p>
              <p className="text-xs mt-1" style={{ color: "hsla(0,0%,100%,.4)" }}>{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        >
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: "hsl(197,92%,68%)" }}>
            Built For Growth
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold">What This System Does For You</h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="rounded-2xl p-6 border group hover:border-[hsla(211,96%,60%,.25)] transition-colors"
              style={{ background: "hsla(0,0%,100%,.02)", borderColor: "hsla(0,0%,100%,.06)" }}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            >
              <f.icon className="h-5 w-5 mb-3 transition-colors" style={{ color: "hsl(211,96%,68%)" }} />
              <h3 className="font-bold text-sm mb-1">{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "hsla(0,0%,100%,.45)" }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        >
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: "hsl(197,92%,68%)" }}>
            Simple Process
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold">How It Works</h2>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              className="text-center"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.12 }}
            >
              <div
                className="inline-flex items-center justify-center h-12 w-12 rounded-2xl text-lg font-black mb-4"
                style={{ background: "hsla(211,96%,60%,.12)", color: "hsl(211,96%,68%)", border: "1px solid hsla(211,96%,60%,.2)" }}
              >
                {s.num}
              </div>
              <h3 className="font-bold text-sm mb-2">{s.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "hsla(0,0%,100%,.4)" }}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pt-8 pb-20 text-center">
        <motion.div
          className="rounded-3xl p-8 sm:p-12 border"
          style={{ background: "hsla(211,96%,60%,.04)", borderColor: "hsla(211,96%,60%,.12)" }}
          initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <CheckCircle2 className="h-8 w-8 mx-auto mb-4" style={{ color: "hsl(197,92%,68%)" }} />
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Your System is Ready</h2>
          <p className="text-sm mb-6" style={{ color: "hsla(0,0%,100%,.45)" }}>
            Everything is built, configured, and already tracking. Just log in.
          </p>
          <button
            onClick={go}
            className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm text-white transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, hsl(211,96%,56%), hsl(197,92%,58%))",
              boxShadow: "0 4px 24px -4px hsla(211,96%,56%,.5)",
            }}
          >
            Access My System
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>

        <p className="mt-8 text-[10px] tracking-wider uppercase" style={{ color: "hsla(0,0%,100%,.2)" }}>
          Powered by <span className="font-semibold">NewLight</span>
        </p>
      </section>
    </div>
  );
}
