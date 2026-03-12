import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Phone, Mail, Calendar } from "lucide-react";
import { motion } from "framer-motion";

const mockProspects = [
  { id: 1, name: "Peak Fitness Studio", contact: "Sarah Johnson", email: "sarah@peakfit.com", phone: "(805) 555-0101", status: "Qualified", source: "Referral" },
  { id: 2, name: "Golden Coast Dental", contact: "Dr. Mike Chen", email: "mike@gcdentalcare.com", phone: "(805) 555-0202", status: "Discovery", source: "Website" },
  { id: 3, name: "Valley Auto Repair", contact: "Tom Williams", email: "tom@valleyauto.com", phone: "(805) 555-0303", status: "Proposal Sent", source: "Cold Outreach" },
  { id: 4, name: "Sunrise Bakery & Cafe", contact: "Maria Lopez", email: "maria@sunrisebake.com", phone: "(805) 555-0404", status: "New Lead", source: "Social Media" },
];

export default function AdminProspects() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Prospects</h1>
          <p className="text-sm text-white/50 mt-1">Potential clients in the sales pipeline</p>
        </div>
        <Button className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
          <UserPlus className="h-4 w-4 mr-1" /> Add Prospect
        </Button>
      </div>

      <div className="grid gap-4">
        {mockProspects.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-white font-medium">{p.name}</p>
                    <p className="text-xs text-white/40 mt-0.5">{p.contact} · {p.source}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      p.status === "Qualified" ? "bg-[hsla(197,92%,68%,.15)] text-[hsl(var(--nl-sky))]"
                        : p.status === "Proposal Sent" ? "bg-[hsla(211,96%,60%,.15)] text-[hsl(var(--nl-neon))]"
                        : "bg-white/5 text-white/40"
                    }`}>{p.status}</span>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <Phone className="h-3.5 w-3.5 text-white/40 hover:text-white" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <Mail className="h-3.5 w-3.5 text-white/40 hover:text-white" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <Calendar className="h-3.5 w-3.5 text-white/40 hover:text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
