import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Shield, Database, Globe, Play, Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const settingSections = [
  { title: "General", icon: Settings, desc: "Platform name, timezone, default settings" },
  { title: "Security", icon: Shield, desc: "Authentication, session policies, API keys" },
  { title: "Database", icon: Database, desc: "Backup schedules, data retention policies" },
  { title: "Domains", icon: Globe, desc: "Custom domains, SSL certificates, DNS" },
];

export default function AdminSettings() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">System Settings</h1>
        <p className="text-sm text-white/50 mt-1">Platform-wide configuration</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {settingSections.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="border-0 bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.06] transition-colors cursor-pointer" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,60%,.1)" }}>
                  <s.icon className="h-5 w-5 text-[hsl(var(--nl-neon))]" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{s.title}</p>
                  <p className="text-xs text-white/40 mt-0.5">{s.desc}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Intro Video Section */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsla(211,96%,60%,.1)" }}>
                <Sparkles className="h-5 w-5 text-[hsl(var(--nl-neon))]" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Intro Video / Welcome Experience</p>
                <p className="text-xs text-white/40 mt-0.5">Cinematic launch sequence for Admin and Client workspaces</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="rounded-xl p-4" style={{ background: "hsla(211,96%,56%,.06)", border: "1px solid hsla(211,96%,60%,.08)" }}>
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">Status</p>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                  <span className="text-sm font-semibold text-white">Enabled</span>
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: "hsla(211,96%,56%,.06)", border: "1px solid hsla(211,96%,60%,.08)" }}>
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">Admin Branding</p>
                <span className="text-sm font-semibold text-white">NewLight Default</span>
              </div>
              <div className="rounded-xl p-4" style={{ background: "hsla(211,96%,56%,.06)", border: "1px solid hsla(211,96%,60%,.08)" }}>
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">Client Video</p>
                <span className="text-sm font-semibold text-white">Form-Data Driven</span>
              </div>
              <div className="rounded-xl p-4" style={{ background: "hsla(211,96%,56%,.06)", border: "1px solid hsla(211,96%,60%,.08)" }}>
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-1">Scenes</p>
                <span className="text-sm font-semibold text-white">8 scenes (Admin: 7)</span>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ background: "hsla(211,96%,56%,.04)", border: "1px solid hsla(211,96%,60%,.06)" }}>
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2">Data Sources</p>
              <div className="flex flex-wrap gap-2">
                {["Business Name", "Logo", "Brand Colors", "Welcome Message", "Industry", "Location", "Primary Goal"].map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-md text-[10px] font-medium text-white/60"
                    style={{ background: "hsla(211,96%,56%,.08)" }}>{tag}</span>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => navigate("/admin/welcome")} variant="outline"
                className="border-white/10 text-white hover:bg-white/10 gap-2">
                <Play className="h-4 w-4" /> Replay Admin Intro
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
