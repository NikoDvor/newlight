import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import newlightLogo from "@/assets/newlight-logo.jpg";

const steps = [
  { n: "01", title: "WE BUILD YOUR SYSTEM", desc: "A complete growth infrastructure tailored to your business — CRM, automations, site, and offers." },
  { n: "02", title: "WE IGNITE YOUR VISIBILITY", desc: "SEO, content, and paid channels working in unison to put you in front of buyers." },
  { n: "03", title: "WE LAUNCH THE ATTACK", desc: "Coordinated campaigns hit every channel where your customers already are." },
  { n: "04", title: "WE QUALIFY THE LEADS", desc: "AI filters, scores, and routes leads so your team only talks to real buyers." },
  { n: "05", title: "WE MAXIMIZE YOUR CLOSE RATE", desc: "Follow-ups, nurture, and revenue ops engineered to turn pipeline into payments." },
  { n: "06", title: "YOU RUN THE COMPANY", desc: "Your system runs the growth. You focus on what only you can do." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

export default function Landing() {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden text-white">
      {/* Cinematic background stack */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 nl-hero-bg" />
        <div className="absolute inset-0 nl-hero-grid" />
        <div className="absolute inset-0 nl-hero-orb nl-hero-orb--a" />
        <div className="absolute inset-0 nl-hero-orb nl-hero-orb--b" />
        <div className="absolute inset-0 nl-hero-shimmer" />
      </div>

      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
        style={{
          background: "hsla(218,38%,5%,.7)",
          borderBottom: "1px solid hsla(211,96%,60%,.08)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <img
            src={newlightLogo}
            alt="NewLight"
            className="h-8 w-auto object-contain"
            style={{ filter: "drop-shadow(0 0 14px hsla(211,96%,56%,.45))" }}
          />
          <button
            onClick={() => navigate("/auth")}
            className="text-xs font-semibold tracking-wider uppercase px-5 py-2 rounded-full transition-all"
            style={{
              color: "rgba(255,255,255,0.55)",
              border: "1px solid hsla(211,96%,60%,.2)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.95)";
              e.currentTarget.style.borderColor = "hsla(211,96%,60%,.45)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.55)";
              e.currentTarget.style.borderColor = "hsla(211,96%,60%,.2)";
            }}
          >
            Log In
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6 sm:px-10 pt-24 pb-16">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            className="nl-hero-badge inline-flex mb-8"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0}
          >
            // AI MODERN MARKETING SYSTEMS
          </motion.div>

          <motion.h1
            className="font-extrabold tracking-tight text-5xl sm:text-7xl lg:text-8xl leading-[0.95] mb-8"
            style={{ letterSpacing: "-0.04em" }}
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={1}
          >
            <span className="block text-white">WE BRING YOU</span>
            <span className="block bg-gradient-to-r from-[hsl(211,96%,60%)] to-[hsl(197,92%,68%)] bg-clip-text text-transparent">
              READY-TO-BUY CUSTOMERS.
            </span>
          </motion.h1>

          <motion.p
            className="text-base sm:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-10"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={2}
          >
            NewLight builds, automates, and scales your entire growth system — so you never miss revenue again.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={3}
          >
            <button
              onClick={() => navigate("/get-started")}
              className="btn-gradient px-8 py-4 text-base font-bold rounded-xl"
            >
              Get Started
            </button>
            <button
              onClick={() => scrollTo("how-it-works")}
              className="px-8 py-4 text-base font-semibold rounded-xl transition-all"
              style={{
                color: "rgba(255,255,255,0.6)",
                border: "1px solid hsla(0,0%,100%,.18)",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.95)";
                e.currentTarget.style.borderColor = "hsla(0,0%,100%,.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                e.currentTarget.style.borderColor = "hsla(0,0%,100%,.18)";
              }}
            >
              See How It Works
            </button>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 px-6 sm:px-10 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <motion.div
              className="nl-hero-badge inline-flex mb-6"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              // HOW WE DO IT
            </motion.div>
            <motion.h2
              className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white"
              style={{ letterSpacing: "-0.035em" }}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.1 }}
            >
              SIX STEPS. ONE OUTCOME.
            </motion.h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                className="card-glass p-6 sm:p-8 rounded-2xl"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
              >
                <div
                  className="text-3xl sm:text-4xl font-extrabold mb-4"
                  style={{ color: "hsl(211,96%,56%)" }}
                >
                  {s.n}
                </div>
                <h3 className="text-white font-bold text-sm sm:text-base mb-3 tracking-tight">
                  {s.title}
                </h3>
                <p className="text-white/50 text-xs sm:text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-6 sm:px-10 py-24">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="card-glass rounded-2xl p-10 sm:p-14 text-center"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="nl-hero-badge inline-flex mb-6">// ZERO RISK</div>
            <h3
              className="text-2xl sm:text-4xl font-extrabold text-white mb-8 leading-tight"
              style={{ letterSpacing: "-0.03em" }}
            >
              We make your money back in 90 days — or we work for free until we do.
            </h3>
            <button
              onClick={() => navigate("/get-started")}
              className="btn-gradient px-8 py-4 text-base font-bold rounded-xl"
            >
              Get Started →
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 sm:px-10 py-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img
            src={newlightLogo}
            alt="NewLight"
            className="h-7 w-auto object-contain opacity-70"
          />
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-xs text-white/30">
            <span>(805) 836-3557</span>
            <span>team@newlightgen.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
