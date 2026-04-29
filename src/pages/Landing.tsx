import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Zap, BarChart3, CalendarCheck, DollarSign, CheckCircle2, Activity } from "lucide-react";
import newlightLogo from "@/assets/newlight-logo.jpg";
import { useRef } from "react";
import { useCountUp } from "@/hooks/useCountUp";
import { SessionGate } from "@/components/SessionGate";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.13, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const stats = [
  { label: "Leads Captured", value: 127, prefix: "", icon: BarChart3, color: "from-blue-500 to-cyan-400" },
  { label: "Calls Booked", value: 34, prefix: "", icon: CalendarCheck, color: "from-emerald-500 to-teal-400" },
  { label: "Revenue Tracked", value: 48200, prefix: "$", icon: DollarSign, color: "from-amber-500 to-orange-400" },
  { label: "Automations Active", value: 12, prefix: "", icon: Zap, color: "from-violet-500 to-purple-400" },
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

function StatCard({ stat, index }: { stat: typeof stats[0]; index: number }) {
  const count = useCountUp(stat.value, 1800);
  const display = stat.prefix === "$" ? `$${count.toLocaleString()}` : String(count);

  return (
    <motion.div
      className="relative rounded-2xl p-5 sm:p-6 border backdrop-blur-md group overflow-hidden"
      style={{ background: "hsla(0,0%,100%,.03)", borderColor: "hsla(0,0%,100%,.06)" }}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{
        y: -6,
        borderColor: "hsla(211,96%,60%,.25)",
        boxShadow: "0 20px 60px -12px hsla(211,96%,56%,.25), 0 0 0 1px hsla(211,96%,56%,.15)",
        transition: { duration: 0.3 },
      }}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: "radial-gradient(circle at 50% 0%, hsla(211,96%,60%,.08), transparent 70%)" }} />
      <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${stat.color} mb-3 transition-transform duration-300 group-hover:scale-110`}>
        <stat.icon className="h-4 w-4 text-white" />
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold tabular-nums">{display}</p>
      <p className="text-xs mt-1" style={{ color: "hsla(0,0%,100%,.4)" }}>{stat.label}</p>
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const go = () => navigate("/auth");
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <SessionGate>
    <div className="min-h-screen bg-[hsl(218,38%,6%)] text-white overflow-x-hidden">
      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 700, height: 700, top: "-10%", left: "20%",
            background: "radial-gradient(circle, hsla(211,96%,60%,.10), transparent 65%)",
            filter: "blur(80px)",
          }}
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 500, height: 500, bottom: "5%", right: "10%",
            background: "radial-gradient(circle, hsla(270,80%,60%,.06), transparent 65%)",
            filter: "blur(60px)",
          }}
          animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(hsla(211,96%,60%,.04) 1px, transparent 1px), linear-gradient(90deg, hsla(211,96%,60%,.04) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
        maskImage: "radial-gradient(ellipse 70% 50% at 50% 30%, black, transparent)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 50% at 50% 30%, black, transparent)",
      }} />

      {/* Nav */}
      <motion.nav
        className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <img src={newlightLogo} alt="NewLight" className="h-8 sm:h-9 w-auto object-contain" />
        <motion.button
          onClick={go}
          className="text-xs font-semibold tracking-wider uppercase px-5 py-2.5 rounded-full border transition-all duration-200"
          style={{ borderColor: "hsla(211,96%,60%,.3)", color: "hsla(211,96%,70%,.9)" }}
          whileHover={{ scale: 1.05, borderColor: "hsla(211,96%,60%,.5)", boxShadow: "0 0 20px -4px hsla(211,96%,60%,.3)" }}
          whileTap={{ scale: 0.97 }}
        >
          Sign In
        </motion.button>
      </motion.nav>

      {/* Hero — with parallax */}
      <section ref={heroRef} className="relative z-10 max-w-4xl mx-auto px-6 pt-16 sm:pt-24 pb-12 text-center">
        <motion.div style={{ y: heroY, opacity: heroOpacity }}>
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold tracking-widest uppercase mb-8"
            style={{ background: "hsla(211,96%,60%,.1)", border: "1px solid hsla(211,96%,60%,.2)", color: "hsl(197,92%,68%)" }}
            custom={0} initial="hidden" animate="visible" variants={fadeUp}
          >
            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}>
              <Activity className="h-3.5 w-3.5" />
            </motion.div>
            Your system is already live and tracking data
          </motion.div>

          <motion.h1
            className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight mb-6"
            custom={1} initial="hidden" animate="visible" variants={fadeUp}
          >
            Your Entire Business,{" "}
            <span className="bg-gradient-to-r from-[hsl(211,96%,60%)] via-[hsl(250,80%,68%)] to-[hsl(197,92%,68%)] bg-clip-text text-transparent">
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
            <motion.button
              onClick={go}
              className="group flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm tracking-wide text-white transition-colors"
              style={{
                background: "linear-gradient(135deg, hsl(211,96%,56%), hsl(197,92%,58%))",
                boxShadow: "0 4px 28px -4px hsla(211,96%,56%,.5)",
              }}
              whileHover={{ scale: 1.04, boxShadow: "0 8px 40px -4px hsla(211,96%,56%,.6)" }}
              whileTap={{ scale: 0.97 }}
            >
              Access My System
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </motion.button>
            <motion.button
              onClick={go}
              className="flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm tracking-wide"
              style={{ border: "1px solid hsla(0,0%,100%,.12)", color: "hsla(0,0%,100%,.7)" }}
              whileHover={{ scale: 1.04, borderColor: "hsla(0,0%,100%,.25)", backgroundColor: "hsla(0,0%,100%,.05)" }}
              whileTap={{ scale: 0.97 }}
            >
              See My Dashboard
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* Live snapshot — with count-up */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <motion.div className="text-center mb-10"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: "hsl(197,92%,68%)" }}>
            Live Business Snapshot
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold">Your Numbers, Right Now</h2>
        </motion.div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={s.label}>
              <StatCard stat={s} index={i} />
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <motion.div className="text-center mb-12"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: "hsl(197,92%,68%)" }}>
            Built For Growth
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold">What This System Does For You</h2>
        </motion.div>
        <div className="grid sm:grid-cols-2 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="relative rounded-2xl p-6 border group overflow-hidden"
              style={{ background: "hsla(0,0%,100%,.02)", borderColor: "hsla(0,0%,100%,.06)" }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              whileHover={{
                y: -4,
                borderColor: "hsla(211,96%,60%,.25)",
                boxShadow: "0 16px 48px -12px hsla(211,96%,56%,.2)",
                transition: { duration: 0.3 },
              }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: "radial-gradient(circle at 30% 0%, hsla(211,96%,60%,.06), transparent 60%)" }} />
              <motion.div whileHover={{ rotate: 8, scale: 1.15 }} transition={{ type: "spring", stiffness: 300 }}>
                <f.icon className="h-5 w-5 mb-3" style={{ color: "hsl(211,96%,68%)" }} />
              </motion.div>
              <h3 className="font-bold text-sm mb-1">{f.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "hsla(0,0%,100%,.45)" }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <motion.div className="text-center mb-12"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: "hsl(197,92%,68%)" }}>
            Simple Process
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold">How It Works</h2>
        </motion.div>
        <div className="grid sm:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              className="text-center group"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
            >
              <motion.div
                className="inline-flex items-center justify-center h-14 w-14 rounded-2xl text-lg font-black mb-4"
                style={{ background: "hsla(211,96%,60%,.12)", color: "hsl(211,96%,68%)", border: "1px solid hsla(211,96%,60%,.2)" }}
                whileHover={{ scale: 1.1, boxShadow: "0 0 30px -6px hsla(211,96%,60%,.35)" }}
              >
                {s.num}
              </motion.div>
              <h3 className="font-bold text-sm mb-2">{s.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "hsla(0,0%,100%,.4)" }}>{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pt-8 pb-20 text-center">
        <motion.div
          className="relative rounded-3xl p-8 sm:p-12 border overflow-hidden"
          style={{ background: "hsla(211,96%,60%,.04)", borderColor: "hsla(211,96%,60%,.12)" }}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(circle at 50% 0%, hsla(211,96%,60%,.06), transparent 50%)" }} />
          <CheckCircle2 className="h-8 w-8 mx-auto mb-4 relative z-10" style={{ color: "hsl(197,92%,68%)" }} />
          <h2 className="text-xl sm:text-2xl font-bold mb-2 relative z-10">Your System is Ready</h2>
          <p className="text-sm mb-6 relative z-10" style={{ color: "hsla(0,0%,100%,.45)" }}>
            Everything is built, configured, and already tracking. Just log in.
          </p>
          <motion.button
            onClick={go}
            className="group relative z-10 inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm text-white"
            style={{
              background: "linear-gradient(135deg, hsl(211,96%,56%), hsl(197,92%,58%))",
              boxShadow: "0 4px 24px -4px hsla(211,96%,56%,.5)",
            }}
            whileHover={{ scale: 1.04, boxShadow: "0 8px 40px -4px hsla(211,96%,56%,.6)" }}
            whileTap={{ scale: 0.97 }}
          >
            Access My System
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </motion.button>
        </motion.div>

      </section>
    </div>
    </SessionGate>
  );
}
