import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Zap, Users, Monitor, BarChart3, Settings, Shield, Rocket,
  ArrowRight, Layers, Bot, Server, Activity, Target, TrendingUp,
  Sparkles, CheckCircle2
} from "lucide-react";

const modules = [
  { icon: Users, label: "Client Management" },
  { icon: Monitor, label: "Workspace Monitoring" },
  { icon: BarChart3, label: "Growth Systems" },
  { icon: Bot, label: "AI Automation" },
  { icon: Layers, label: "Demo Builds" },
  { icon: Shield, label: "Security & Audit" },
  { icon: Server, label: "Provisioning" },
  { icon: Activity, label: "Live Activity" },
];

const capabilities = [
  "Manage client workspaces",
  "Monitor automations & health",
  "Track growth across all clients",
  "Run the NewLight platform",
];

export default function AdminWelcome() {
  const navigate = useNavigate();
  const [scene, setScene] = useState(0);

  useEffect(() => {
    const delays = [0, 1200, 3000, 5000, 7000, 9000, 11000];
    const timers = delays.map((d, i) => setTimeout(() => setScene(i), d));
    return () => timers.forEach(clearTimeout);
  }, []);

  const sceneVariants = {
    initial: { opacity: 0, y: 30, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{ background: "#030712" }}>
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full blur-[160px] opacity-20"
          style={{ background: "hsl(211 96% 56%)" }}
          animate={{ scale: [1, 1.3, 1], x: [0, 50, 0] }} transition={{ duration: 10, repeat: Infinity }} />
        <motion.div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[140px] opacity-15"
          style={{ background: "hsl(197 92% 68%)" }}
          animate={{ scale: [1.2, 1, 1.2], x: [0, -40, 0] }} transition={{ duration: 12, repeat: Infinity }} />
        <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[180px] opacity-10"
          style={{ background: "hsl(217 90% 62%)" }}
          animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 8, repeat: Infinity }} />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(hsla(211,96%,60%,.3) 1px, transparent 1px), linear-gradient(90deg, hsla(211,96%,60%,.3) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />

      <div className="relative z-10 max-w-2xl w-full px-6 text-center">
        <AnimatePresence mode="wait">
          {/* Scene 1: Logo */}
          {scene === 0 && (
            <motion.div key="a1" {...sceneVariants} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
              <motion.div className="h-24 w-24 rounded-2xl mx-auto flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(197 92% 68%))" }}
                animate={{ boxShadow: [
                  "0 0 40px hsla(211,96%,56%,.4)", "0 0 80px hsla(211,96%,56%,.6)", "0 0 40px hsla(211,96%,56%,.4)"
                ]}} transition={{ duration: 2, repeat: Infinity }}>
                <Zap className="h-10 w-10 text-white" />
              </motion.div>
              <motion.p className="mt-4 text-white/30 text-sm tracking-widest uppercase"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                Initializing control center
              </motion.p>
            </motion.div>
          )}

          {/* Scene 2: Welcome */}
          {scene === 1 && (
            <motion.div key="a2" {...sceneVariants} transition={{ duration: 0.7 }}>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-[hsl(197,92%,68%)] to-[hsl(211,96%,56%)] bg-clip-text text-transparent">
                  NewLight
                </span>
              </h1>
              <p className="text-lg text-white/40">Your Admin Control Center is ready.</p>
            </motion.div>
          )}

          {/* Scene 3: Platform intro */}
          {scene === 2 && (
            <motion.div key="a3" {...sceneVariants} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                style={{ background: "hsla(211,96%,56%,.1)", border: "1px solid hsla(211,96%,60%,.15)" }}>
                <Sparkles className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                <span className="text-sm text-white/60 font-medium">Full Platform Control</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">The AI-Powered Growth Engine</h2>
              <p className="text-sm text-white/40 max-w-md mx-auto">
                Manage every client workspace, monitor automations, and drive growth across your entire portfolio.
              </p>
            </motion.div>
          )}

          {/* Scene 4: Capabilities */}
          {scene === 3 && (
            <motion.div key="a4" {...sceneVariants} transition={{ duration: 0.7 }}>
              <Target className="h-10 w-10 mx-auto mb-4 text-[hsl(var(--nl-sky))]" />
              <h2 className="text-2xl font-bold text-white mb-6">What you can do</h2>
              <div className="space-y-3 max-w-sm mx-auto text-left">
                {capabilities.map((cap, i) => (
                  <motion.div key={cap} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "hsla(211,96%,56%,.06)", border: "1px solid hsla(211,96%,60%,.1)" }}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 * i }}>
                    <CheckCircle2 className="h-5 w-5 text-[hsl(var(--nl-sky))] shrink-0" />
                    <span className="text-sm text-white/80 font-medium">{cap}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Scene 5: Modules */}
          {scene === 4 && (
            <motion.div key="a5" {...sceneVariants} transition={{ duration: 0.7 }}>
              <h2 className="text-2xl font-bold text-white mb-6">Your admin toolkit</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {modules.map((mod, i) => (
                  <motion.div key={mod.label} className="rounded-xl p-3 text-center border"
                    style={{ background: "hsla(211,96%,56%,.06)", borderColor: "hsla(211,96%,60%,.1)" }}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }}
                    whileHover={{ scale: 1.04 }}>
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center mx-auto mb-2"
                      style={{ background: "hsla(211,96%,56%,.12)" }}>
                      <mod.icon className="h-5 w-5 text-[hsl(var(--nl-sky))]" />
                    </div>
                    <p className="text-[11px] font-semibold text-white leading-tight">{mod.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Scene 6: Security badge */}
          {scene === 5 && (
            <motion.div key="a6" {...sceneVariants} transition={{ duration: 0.7 }}>
              <Shield className="h-12 w-12 mx-auto mb-4 text-[hsl(var(--nl-neon))]" />
              <h2 className="text-2xl font-bold text-white mb-3">Enterprise-grade security</h2>
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                {["Role-Based Access", "Full Audit Trail", "Client Isolation", "Encrypted Data"].map((tag, i) => (
                  <motion.span key={tag} className="px-4 py-2 rounded-full text-xs font-medium text-white/70"
                    style={{ background: "hsla(211,96%,56%,.08)", border: "1px solid hsla(211,96%,60%,.12)" }}
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 * i }}>
                    {tag}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Scene 7: CTA */}
          {scene === 6 && (
            <motion.div key="a7" {...sceneVariants} transition={{ duration: 0.7 }}>
              <motion.div className="h-16 w-16 rounded-xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(197 92% 68%))" }}>
                <Zap className="h-8 w-8 text-white" />
              </motion.div>
              <h2 className="text-3xl font-bold text-white mb-2">NewLight is ready</h2>
              <p className="text-sm text-white/40 mb-8">Your admin control center awaits.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={() => navigate("/admin")}
                  className="gap-2 h-12 px-8 text-white font-semibold text-base"
                  style={{ background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(217 90% 62%))", boxShadow: "0 4px 24px -4px hsla(211,96%,56%,.5)" }}>
                  <Rocket className="h-5 w-5" /> Enter Admin Portal <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/admin/clients")}
                  className="gap-2 h-11 border-white/10 text-white/70 hover:text-white hover:bg-white/10">
                  <Settings className="h-4 w-4" /> Manage Clients
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scene indicators */}
        {scene < 6 && (
          <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <button key={i} onClick={() => setScene(i)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: scene === i ? 24 : 6, background: scene === i ? "hsl(211 96% 56%)" : "rgba(255,255,255,0.2)" }} />
            ))}
          </motion.div>
        )}

        {/* Skip */}
        {scene < 6 && (
          <motion.button onClick={() => setScene(6)}
            className="absolute top-6 right-6 text-xs text-white/30 hover:text-white/60 transition-colors"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
            Skip →
          </motion.button>
        )}
      </div>
    </div>
  );
}
