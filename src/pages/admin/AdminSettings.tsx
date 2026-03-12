import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Shield, Database, Globe } from "lucide-react";
import { motion } from "framer-motion";

const settingSections = [
  { title: "General", icon: Settings, desc: "Platform name, timezone, default settings" },
  { title: "Security", icon: Shield, desc: "Authentication, session policies, API keys" },
  { title: "Database", icon: Database, desc: "Backup schedules, data retention policies" },
  { title: "Domains", icon: Globe, desc: "Custom domains, SSL certificates, DNS" },
];

export default function AdminSettings() {
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
    </div>
  );
}
