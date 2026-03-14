import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Phone, Mail, Calendar, ArrowRight, Eye, MoreVertical, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const mockProspects = [
  { id: 1, name: "Peak Fitness Studio", contact: "Sarah Johnson", email: "sarah@peakfit.com", phone: "(805) 555-0101", status: "Qualified", source: "Referral", stage: "Audit Complete", assignedTo: "Mike R.", meetingDate: "Mar 18, 2026" },
  { id: 2, name: "Golden Coast Dental", contact: "Dr. Mike Chen", email: "mike@gcdentalcare.com", phone: "(805) 555-0202", status: "Discovery", source: "Website", stage: "Booking Submitted", assignedTo: "Unassigned", meetingDate: null },
  { id: 3, name: "Valley Auto Repair", contact: "Tom Williams", email: "tom@valleyauto.com", phone: "(805) 555-0303", status: "Proposal Sent", source: "Cold Outreach", stage: "Proposal Drafted", assignedTo: "Sarah K.", meetingDate: "Mar 15, 2026" },
  { id: 4, name: "Sunrise Bakery & Cafe", contact: "Maria Lopez", email: "maria@sunrisebake.com", phone: "(805) 555-0404", status: "New Lead", source: "Social Media", stage: "New Submission", assignedTo: "Unassigned", meetingDate: null },
  { id: 5, name: "Pacific Legal Group", contact: "James Park", email: "james@pacificlegal.com", phone: "(805) 555-0505", status: "Payment Received", source: "Referral", stage: "Ready for Provisioning", assignedTo: "Mike R.", meetingDate: "Mar 12, 2026" },
];

const stageColors: Record<string, { bg: string; text: string }> = {
  "New Submission": { bg: "bg-white/5", text: "text-white/40" },
  "Booking Submitted": { bg: "bg-[hsla(211,96%,60%,.15)]", text: "text-[hsl(var(--nl-neon))]" },
  "Audit Complete": { bg: "bg-[hsla(197,92%,68%,.15)]", text: "text-[hsl(var(--nl-sky))]" },
  "Proposal Drafted": { bg: "bg-[hsla(211,96%,60%,.15)]", text: "text-[hsl(var(--nl-neon))]" },
  "Ready for Provisioning": { bg: "bg-[hsla(187,70%,58%,.15)]", text: "text-[hsl(var(--nl-cyan))]" },
};

const pipelineSummary = [
  { label: "New Leads", count: 12, icon: UserPlus },
  { label: "Calls Booked", count: 8, icon: Calendar },
  { label: "Proposals Sent", count: 5, icon: FileText },
  { label: "Ready to Provision", count: 2, icon: CheckCircle2 },
];

export default function AdminProspects() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Enterprise Sales Pipeline</h1>
          <p className="text-sm text-white/50 mt-1">Prospect → Audit → Call → Proposal → Payment → Provisioning</p>
        </div>
        <Button className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
          <UserPlus className="h-4 w-4 mr-1" /> Add Prospect
        </Button>
      </div>

      {/* Pipeline summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {pipelineSummary.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border-0 bg-white/[0.04] backdrop-blur-sm" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,60%,.12)" }}>
                  <s.icon className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{s.count}</p>
                  <p className="text-[10px] text-white/40">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Prospect list */}
      <div className="space-y-3">
        {mockProspects.map((p, i) => {
          const stageStyle = stageColors[p.stage] || stageColors["New Submission"];
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-0 bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.06] transition-colors" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-white font-medium">{p.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${stageStyle.bg} ${stageStyle.text}`}>{p.stage}</span>
                      </div>
                      <p className="text-xs text-white/40">{p.contact} · {p.source} · Assigned: {p.assignedTo}</p>
                      {p.meetingDate && (
                        <p className="text-[10px] text-white/30 mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Meeting: {p.meetingDate}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <Phone className="h-3.5 w-3.5 text-white/40 hover:text-white" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <Mail className="h-3.5 w-3.5 text-white/40 hover:text-white" />
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                            <MoreVertical className="h-3.5 w-3.5 text-white/40" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[hsl(220,35%,12%)] border-white/10 text-white">
                          <DropdownMenuItem className="text-xs hover:bg-white/10">View Details</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs hover:bg-white/10">Assign Salesman</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs hover:bg-white/10">Create Audit</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs hover:bg-white/10">Draft Proposal</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs hover:bg-white/10">Trigger Provisioning</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs hover:bg-white/10">Resend Invite</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
