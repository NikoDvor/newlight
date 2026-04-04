import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Rocket, Globe, Users, Star, Megaphone, Search, BarChart3, Calendar,
  Shield, Zap, ChevronRight, CheckCircle2, ArrowRight, Brain, DollarSign,
  Target, TrendingUp, Sparkles
} from "lucide-react";

/* ── industry-specific copy ── */
const industryConfig: Record<string, { tagline: string; goals: string[]; modules: string[] }> = {
  "med_spa": { tagline: "More appointments. Stronger patient growth. Effortless follow-up.", goals: ["consultations", "patient retention", "review generation"], modules: ["Calendar", "CRM", "Reviews", "Website"] },
  "dental": { tagline: "Fill your chairs. Grow your practice. Automate recall.", goals: ["new patients", "appointment bookings", "recall campaigns"], modules: ["Calendar", "CRM", "Reviews", "Ads"] },
  "financial_services": { tagline: "Build trust. Win clients. Scale your practice.", goals: ["client acquisition", "consultations", "referral growth"], modules: ["CRM", "Calendar", "Website", "SEO"] },
  "ecommerce": { tagline: "More sales. Higher conversions. Repeat customers.", goals: ["conversions", "repeat purchases", "cart recovery"], modules: ["Website", "Ads", "SEO", "Social Media"] },
  "agency": { tagline: "Stronger pipeline. More proposals. Client growth.", goals: ["pipeline growth", "proposals sent", "client retention"], modules: ["CRM", "Calendar", "Reports", "Website"] },
  "restaurant": { tagline: "Full tables. Rave reviews. Loyal customers.", goals: ["reservations", "reviews", "local visibility"], modules: ["Reviews", "Social Media", "SEO", "Calendar"] },
  "real_estate": { tagline: "More listings. More closings. Dominant presence.", goals: ["lead generation", "closings", "market visibility"], modules: ["CRM", "Ads", "Website", "SEO"] },
  default: { tagline: "More leads. Stronger follow-up. Faster growth.", goals: ["lead generation", "bookings", "reviews", "follow-up"], modules: ["Dashboard", "CRM", "Calendar", "Reviews", "Website", "SEO", "Ads", "Reports"] },
};

const moduleIcons: Record<string, any> = {
  Dashboard: BarChart3, CRM: Users, Calendar: Calendar, Reviews: Star,
  Website: Globe, SEO: Search, Ads: Megaphone, "Social Media": Megaphone,
  Reports: BarChart3, "Ask AI": Brain, Finance: DollarSign,
};

const allModules = [
  { icon: Globe, label: "Website" }, { icon: Search, label: "SEO" },
  { icon: Megaphone, label: "Ads" }, { icon: Users, label: "CRM" },
  { icon: Star, label: "Reviews" }, { icon: Calendar, label: "Calendar" },
  { icon: BarChart3, label: "Reports" }, { icon: Brain, label: "Ask AI" },
];

export default function Welcome() {
  const { activeClientId, branding } = useWorkspace();
  const navigate = useNavigate();
  const [scene, setScene] = useState(0);
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

  // 8 scenes, timed
  useEffect(() => {
    const delays = [0, 1200, 3000, 5000, 7000, 9000, 11000, 13000];
    const timers = delays.map((d, i) => setTimeout(() => setScene(i), d));
    return () => timers.forEach(clearTimeout);
  }, []);

  const primaryColor = branding.primary_color || "#3B82F6";
  const secondaryColor = branding.secondary_color || "#06B6D4";
  const name = branding.company_name || clientData?.business_name || "Your Business";
  const logo = branding.logo_url;
  const welcomeMsg = branding.welcome_message || "";
  const industry = clientData?.industry || "default";
  const config = industryConfig[industry] || industryConfig.default;
  const mainService = clientData?.service_package || "";
  const location = clientData?.primary_location || "";

  const sceneVariants = {
    initial: { opacity: 0, y: 30, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" style={{ background: "#030712" }}>
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[160px] opacity-20"
          style={{ background: primaryColor }}
          animate={{ scale: [1, 1.3, 1], x: [0, 50, 0] }} transition={{ duration: 10, repeat: Infinity }} />
        <motion.div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[140px] opacity-15"
          style={{ background: secondaryColor }}
          animate={{ scale: [1.2, 1, 1.2], x: [0, -40, 0] }} transition={{ duration: 12, repeat: Infinity }} />
      </div>

      <div className="relative z-10 max-w-2xl w-full px-6 text-center">
        <AnimatePresence mode="wait">
          {/* Scene 1: Logo reveal */}
          {scene === 0 && (
            <motion.div key="s1" {...sceneVariants} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
              {logo ? (
                <motion.img src={logo} alt={name} className="h-24 w-24 mx-auto rounded-2xl object-contain"
                  animate={{ boxShadow: [`0 0 40px ${primaryColor}40`, `0 0 80px ${primaryColor}60`, `0 0 40px ${primaryColor}40`] }}
                  transition={{ duration: 2, repeat: Infinity }} />
              ) : (
                <motion.div className="h-24 w-24 rounded-2xl mx-auto flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                  animate={{ boxShadow: [`0 0 40px ${primaryColor}40`, `0 0 80px ${primaryColor}60`, `0 0 40px ${primaryColor}40`] }}
                  transition={{ duration: 2, repeat: Infinity }}>
                  <span className="text-3xl font-bold text-white">{name.substring(0, 2).toUpperCase()}</span>
                </motion.div>
              )}
              <motion.p className="mt-4 text-white/30 text-sm tracking-widest uppercase"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                Launching your workspace
              </motion.p>
            </motion.div>
          )}

          {/* Scene 2: Welcome text */}
          {scene === 1 && (
            <motion.div key="s2" {...sceneVariants} transition={{ duration: 0.7 }}>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Welcome to{" "}
                <span style={{ color: primaryColor }}>{name}</span>
              </h1>
              {welcomeMsg && <p className="text-lg text-white/50 max-w-md mx-auto">{welcomeMsg}</p>}
            </motion.div>
          )}

          {/* Scene 3: NewLight system intro */}
          {scene === 2 && (
            <motion.div key="s3" {...sceneVariants} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: `${primaryColor}15`, border: `1px solid ${primaryColor}20` }}>
                <Sparkles className="h-4 w-4" style={{ color: primaryColor }} />
                <span className="text-sm text-white/60 font-medium">Powered by NewLight Marketing</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">This is your Growth System</h2>
              <p className="text-base text-white/40 max-w-md mx-auto">
                An AI-powered operating system built to help {name} grow faster.
              </p>
            </motion.div>
          )}

          {/* Scene 4: Industry-tailored message */}
          {scene === 3 && (
            <motion.div key="s4" {...sceneVariants} transition={{ duration: 0.7 }}>
              <Target className="h-12 w-12 mx-auto mb-4" style={{ color: primaryColor }} />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">{config.tagline}</h2>
              <p className="text-sm text-white/40 max-w-md mx-auto">
                {location ? `Serving ${location} — w` : "W"}e're building systems to drive{" "}
                {config.goals.slice(0, 3).join(", ")} for {name}.
              </p>
            </motion.div>
          )}

          {/* Scene 5: What we're improving */}
          {scene === 4 && (
            <motion.div key="s5" {...sceneVariants} transition={{ duration: 0.7 }}>
              <TrendingUp className="h-10 w-10 mx-auto mb-4" style={{ color: secondaryColor }} />
              <h2 className="text-2xl font-bold text-white mb-6">What NewLight is building for you</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {config.goals.map((goal, i) => (
                  <motion.div key={goal} className="px-4 py-2 rounded-full text-sm font-medium text-white"
                    style={{ background: `${primaryColor}15`, border: `1px solid ${primaryColor}20` }}
                    initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 * i }}>
                    <CheckCircle2 className="h-3.5 w-3.5 inline mr-1.5" style={{ color: primaryColor }} />
                    {goal.charAt(0).toUpperCase() + goal.slice(1)}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Scene 6: Key modules */}
          {scene === 5 && (
            <motion.div key="s6" {...sceneVariants} transition={{ duration: 0.7 }}>
              <h2 className="text-2xl font-bold text-white mb-6">Your toolkit</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {allModules.map((mod, i) => (
                  <motion.div key={mod.label} className="rounded-xl p-3 text-center"
                    style={{ background: `${primaryColor}08`, border: `1px solid ${primaryColor}10` }}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }}>
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: `${primaryColor}15` }}>
                      <mod.icon className="h-5 w-5" style={{ color: primaryColor }} />
                    </div>
                    <p className="text-[11px] font-semibold text-white leading-tight">{mod.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Scene 7: Next steps */}
          {scene === 6 && (
            <motion.div key="s7" {...sceneVariants} transition={{ duration: 0.7 }}>
              <Zap className="h-10 w-10 mx-auto mb-4" style={{ color: secondaryColor }} />
              <h2 className="text-2xl font-bold text-white mb-6">What happens next</h2>
              <div className="space-y-3 max-w-sm mx-auto text-left">
                {["Connect your accounts", "Complete workspace setup", "Launch your growth system"].map((step, i) => (
                  <motion.div key={step} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: `${primaryColor}08`, border: `1px solid ${primaryColor}10` }}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 * i }}>
                    <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: primaryColor }}>
                      {i + 1}
                    </div>
                    <span className="text-sm text-white/80 font-medium">{step}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Scene 8: CTA */}
          {scene === 7 && (
            <motion.div key="s8" {...sceneVariants} transition={{ duration: 0.7 }}>
              {logo ? (
                <img src={logo} alt={name} className="h-16 w-16 mx-auto rounded-xl object-contain mb-4" />
              ) : (
                <div className="h-16 w-16 rounded-xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                  <span className="text-xl font-bold text-white">{name.substring(0, 2).toUpperCase()}</span>
                </div>
              )}
              <h2 className="text-3xl font-bold text-white mb-2">{name} is ready</h2>
              <p className="text-sm text-white/40 mb-8">
                {setupStats.integrations} integrations queued · {setupStats.tasks} setup tasks created
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button className="gap-2 h-12 px-8 text-white font-semibold text-base"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, boxShadow: `0 4px 24px -4px ${primaryColor}50` }}
                  onClick={() => navigate("/dashboard")}>
                  <Rocket className="h-5 w-5" /> Enter Workspace <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="gap-2 h-11 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => navigate("/integrations")}>
                  Connect Platforms <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scene indicators */}
        {scene < 7 && (
          <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <button key={i} onClick={() => setScene(i)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: scene === i ? 24 : 6, background: scene === i ? primaryColor : "rgba(255,255,255,0.2)" }} />
            ))}
          </motion.div>
        )}

        {/* Skip */}
        {scene < 7 && (
          <motion.button onClick={() => setScene(7)}
            className="absolute top-6 right-6 text-xs text-white/30 hover:text-white/60 transition-colors"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
            Skip →
          </motion.button>
        )}
      </div>
    </div>
  );
}
