import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Rocket, Globe, Users, Star, Megaphone, Search, BarChart3, Calendar,
  Shield, Zap, ChevronRight, CheckCircle2, ArrowRight
} from "lucide-react";

const modules = [
  { icon: Globe, label: "Website & Landing Pages", desc: "Track performance, optimize conversions" },
  { icon: Search, label: "SEO & Search Visibility", desc: "Keyword tracking, competitor analysis" },
  { icon: Megaphone, label: "Paid Ads & ROI", desc: "Campaign management, spend optimization" },
  { icon: Users, label: "CRM & Pipeline", desc: "Contacts, leads, deals, and tasks" },
  { icon: Star, label: "Reviews & Reputation", desc: "Collect feedback, build trust" },
  { icon: Calendar, label: "Calendar & Scheduling", desc: "Bookings, reminders, availability" },
  { icon: BarChart3, label: "Reports & Analytics", desc: "Business intelligence dashboards" },
  { icon: Shield, label: "Finance & Tax Ops", desc: "Revenue tracking, payroll, compliance" },
];

export default function Welcome() {
  const { activeClientId, branding } = useWorkspace();
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);
  const [clientData, setClientData] = useState<any>(null);
  const [setupStats, setSetupStats] = useState({ integrations: 0, tasks: 0 });

  useEffect(() => {
    if (!activeClientId) return;
    supabase.from("clients").select("*").eq("id", activeClientId).maybeSingle()
      .then(({ data }) => setClientData(data));
    supabase.from("client_integrations").select("status").eq("client_id", activeClientId)
      .then(({ data }) => {
        if (data) setSetupStats(prev => ({ ...prev, integrations: data.filter(d => d.status !== "not_needed").length }));
      });
    supabase.from("crm_tasks").select("id", { count: "exact", head: true }).eq("client_id", activeClientId).eq("status", "open")
      .then(({ count }) => setSetupStats(prev => ({ ...prev, tasks: count || 0 })));
  }, [activeClientId]);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2200),
      setTimeout(() => setPhase(3), 3800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const primaryColor = branding.primary_color || "#3B82F6";
  const secondaryColor = branding.secondary_color || "#06B6D4";
  const name = branding.company_name || clientData?.business_name || "Your Business";
  const logo = branding.logo_url;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-20"
          style={{ background: primaryColor }}
          animate={{ scale: [1, 1.3, 1], x: [0, 40, 0] }} transition={{ duration: 8, repeat: Infinity }} />
        <motion.div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px] opacity-15"
          style={{ background: secondaryColor }}
          animate={{ scale: [1.2, 1, 1.2], x: [0, -30, 0] }} transition={{ duration: 10, repeat: Infinity }} />
      </div>

      <div className="relative z-10 max-w-2xl w-full px-6">
        {/* Phase 0: Logo reveal */}
        <AnimatePresence>
          {phase >= 0 && (
            <motion.div className="text-center mb-8" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: "easeOut" }}>
              {logo ? (
                <motion.img src={logo} alt={name} className="h-20 w-20 mx-auto rounded-2xl object-contain mb-4"
                  initial={{ y: 20 }} animate={{ y: 0 }} transition={{ delay: 0.3 }} />
              ) : (
                <motion.div className="h-20 w-20 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, boxShadow: `0 8px 32px -8px ${primaryColor}60` }}
                  initial={{ y: 20 }} animate={{ y: 0 }} transition={{ delay: 0.3 }}>
                  <span className="text-2xl font-bold text-white">{name.substring(0, 2).toUpperCase()}</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 1: Welcome text */}
        <AnimatePresence>
          {phase >= 1 && (
            <motion.div className="text-center mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
                Welcome to <span style={{ color: primaryColor }}>{name}</span>
              </h1>
              <p className="text-base text-muted-foreground max-w-md mx-auto">
                {branding.welcome_message || "Your growth operating system is being configured. Here's what we're preparing for you."}
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
                  <motion.div key={mod.label}
                    className="rounded-xl p-3 text-center"
                    style={{ background: "hsla(210,40%,94%,.5)", border: "1px solid hsla(211,96%,56%,.08)" }}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: `${primaryColor}15` }}>
                      <mod.icon className="h-5 w-5" style={{ color: primaryColor }} />
                    </div>
                    <p className="text-[11px] font-semibold text-foreground leading-tight">{mod.label}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{mod.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase 3: Status + CTA */}
        <AnimatePresence>
          {phase >= 3 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              {/* Setup stats */}
              <div className="flex justify-center gap-6 mb-8">
                <div className="text-center">
                  <div className="flex items-center gap-1.5 justify-center">
                    <CheckCircle2 className="h-4 w-4" style={{ color: primaryColor }} />
                    <span className="text-lg font-bold text-foreground">{setupStats.integrations}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Integrations Queued</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1.5 justify-center">
                    <Zap className="h-4 w-4" style={{ color: secondaryColor }} />
                    <span className="text-lg font-bold text-foreground">{setupStats.tasks}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Setup Tasks Created</p>
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button className="btn-gradient gap-2 h-11 px-6" onClick={() => navigate("/")}>
                  <Rocket className="h-4 w-4" /> Enter Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="gap-2 h-11" onClick={() => navigate("/integrations")}>
                  Connect Platforms <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
