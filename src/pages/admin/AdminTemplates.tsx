import { Card, CardContent } from "@/components/ui/card";
import { FileCode, Copy } from "lucide-react";
import { motion } from "framer-motion";

const templates = [
  { name: "Default Pipeline", desc: "Standard 5-stage sales pipeline", type: "Pipeline" },
  { name: "Review Request Sequence", desc: "Automated review collection workflow", type: "Automation" },
  { name: "Lead Nurture Series", desc: "6-email drip campaign for new leads", type: "Email" },
  { name: "Onboarding Checklist", desc: "New client setup task list", type: "Task Board" },
  { name: "Monthly Report", desc: "Performance report template", type: "Report" },
  { name: "Social Media Calendar", desc: "30-day posting schedule", type: "Social" },
];

export default function AdminTemplates() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Templates</h1>
        <p className="text-sm text-white/50 mt-1">Reusable templates for client workspace provisioning</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t, i) => (
          <motion.div key={t.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.06] transition-colors cursor-pointer group" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: "hsla(211,96%,60%,.1)" }}>
                    <FileCode className="h-4 w-4 text-[hsl(var(--nl-neon))]" />
                  </div>
                  <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all">
                    <Copy className="h-3.5 w-3.5 text-white/40" />
                  </button>
                </div>
                <p className="text-white font-medium mt-3 text-sm">{t.name}</p>
                <p className="text-xs text-white/40 mt-1">{t.desc}</p>
                <span className="inline-block mt-3 text-[10px] px-2 py-0.5 rounded-full bg-[hsla(211,96%,60%,.1)] text-[hsl(var(--nl-neon))]">{t.type}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
