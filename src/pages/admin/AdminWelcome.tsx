import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Zap, Users, Monitor, BarChart3, Settings, Shield, Rocket,
  ArrowRight, Layers, Bot, Server, Activity
} from "lucide-react";

const modules = [
  { icon: Users, label: "Client Management", desc: "Provision & manage workspaces" },
  { icon: Monitor, label: "Workspace Monitoring", desc: "Real-time system health" },
  { icon: BarChart3, label: "Growth Systems", desc: "Track client performance" },
  { icon: Bot, label: "AI Automation", desc: "Intelligent workflow engine" },
  { icon: Layers, label: "Demo Builds", desc: "Create prospect experiences" },
  { icon: Shield, label: "Security & Audit", desc: "Full audit trail & RBAC" },
  { icon: Server, label: "Provisioning", desc: "Automated workspace setup" },
  { icon: Activity, label: "Live Activity", desc: "Platform-wide monitoring" },
];

export default function AdminWelcome() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3200),
      setTimeout(() => setPhase(4), 4600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full blur-[140px] opacity-20"
          style={{ background: "hsl(211 96% 56%)" }}
          animate={{ scale: [1, 1.3, 1], x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[120px] opacity-15"
          style={{ background: "hsl(197 92% 68%)" }}
          animate={{ scale: [1.2, 1, 1.2], x: [0, -40, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[160px] opacity-10"
          style={{ background: "hsl(217 90% 62%)" }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(hsla(211,96%,60%,.3) 1px, transparent 1px), linear-gradient(90deg, hsla(211,96%,60%,.3) 1px, transparent 1px)", backgroundSize: "60px 60px" }}
      />

      <div className="relative z-10 max-w-2xl w-full px-6">
        {/* Phase 0: Logo mark */}
        <AnimatePresence>
          {phase >= 0 && (
            <motion.div className="text-center mb-6"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className="h-20 w-20 rounded-2xl mx-auto flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(197 92% 68%))",
                  boxShadow: "0 12px 40px -8px hsla(211,96%,56%,.5), 0 0 60px -10px hsla(211,96%,60%,.3)"
                }}
                animate={{ boxShadow: [
                  "0 12px 40px -8px hsla(211,96%,56%,.5), 0 0 60px -10px hsla(211,96%,60%,.3)",
                  "0 12px 50px -8px hsla(211,96%,56%,.7), 0 0 80px -10px hsla(211,96%,60%,.5)",
                  "0 12px 40px -8px hsla(211,96%,56%,.5), 0 0 60px -10px hsla(211,96%,60%,.3)",
                ]}}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Zap className="h-9 w-9 text-white" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 1: Title */}
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div className="text-center mb-8"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-[hsl(197,92%,68%)] to-[hsl(211,96%,56%)] bg-clip-text text-transparent">
                  NewLight
                </span>
              </h1>
              <p className="text-base text-white/50 max-w-md mx-auto">
                Your Admin Control Center is ready. Manage clients, monitor automations, and drive growth across every workspace.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 2: Module cards */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {modules.map((mod, i) => (
                  <motion.div
                    key={mod.label}
                    className="rounded-xl p-3 text-center border"
                    style={{
                      background: "hsla(211,96%,56%,.06)",
                      borderColor: "hsla(211,96%,60%,.1)",
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 * i, duration: 0.4 }}
                    whileHover={{ scale: 1.04, borderColor: "hsla(211,96%,60%,.25)" }}
                  >
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center mx-auto mb-2"
                      style={{ background: "hsla(211,96%,56%,.12)" }}
                    >
                      <mod.icon className="h-5 w-5 text-[hsl(var(--nl-sky))]" />
                    </div>
                    <p className="text-[11px] font-semibold text-white leading-tight">{mod.label}</p>
                    <p className="text-[9px] text-white/35 mt-0.5">{mod.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 3: Tagline + stats */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{
                background: "hsla(211,96%,56%,.08)",
                border: "1px solid hsla(211,96%,60%,.12)"
              }}>
                <Shield className="h-3.5 w-3.5 text-[hsl(var(--nl-neon))]" />
                <span className="text-xs text-white/60 font-medium">Full Platform Control · Role-Based Access · Audit Trail</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 4: CTA */}
        <AnimatePresence>
          {phase >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Button
                onClick={() => navigate("/admin")}
                className="gap-2 h-11 px-6 text-white font-semibold"
                style={{
                  background: "linear-gradient(135deg, hsl(211 96% 56%), hsl(217 90% 62%))",
                  boxShadow: "0 4px 20px -4px hsla(211,96%,56%,.4)"
                }}
              >
                <Rocket className="h-4 w-4" /> Enter Admin Portal <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/admin/clients")}
                className="gap-2 h-11 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
              >
                <Settings className="h-4 w-4" /> Manage Clients
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
