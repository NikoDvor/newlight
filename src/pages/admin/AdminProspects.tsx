import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Phone, Mail, Calendar, MoreVertical, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Prospect {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  business_name: string;
  source: string | null;
  stage: string;
  status: string;
  meeting_date: string | null;
  assigned_to: string | null;
  created_at: string;
}

const stageLabels: Record<string, string> = {
  new_submission: "New Submission",
  booking_submitted: "Booking Submitted",
  audit_complete: "Audit Complete",
  proposal_drafted: "Proposal Drafted",
  ready_for_provisioning: "Ready for Provisioning",
  provisioned: "Provisioned",
};

const stageColors: Record<string, { bg: string; text: string }> = {
  new_submission: { bg: "bg-white/5", text: "text-white/40" },
  booking_submitted: { bg: "bg-[hsla(211,96%,60%,.15)]", text: "text-[hsl(var(--nl-neon))]" },
  audit_complete: { bg: "bg-[hsla(197,92%,68%,.15)]", text: "text-[hsl(var(--nl-sky))]" },
  proposal_drafted: { bg: "bg-[hsla(211,96%,60%,.15)]", text: "text-[hsl(var(--nl-neon))]" },
  ready_for_provisioning: { bg: "bg-[hsla(187,70%,58%,.15)]", text: "text-[hsl(var(--nl-cyan))]" },
  provisioned: { bg: "bg-[hsla(160,70%,50%,.15)]", text: "text-emerald-400" },
};

export default function AdminProspects() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProspects = async () => {
    const { data, error } = await supabase
      .from("prospects")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setProspects(data);
    if (error) console.error(error);
    setLoading(false);
  };

  useEffect(() => { fetchProspects(); }, []);

  const updateStage = async (id: string, stage: string) => {
    const { error } = await supabase.from("prospects").update({ stage }).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`Stage updated to ${stageLabels[stage] || stage}`);
    fetchProspects();
  };

  const pipelineCounts = {
    new: prospects.filter(p => p.stage === "new_submission").length,
    booked: prospects.filter(p => p.stage === "booking_submitted").length,
    proposed: prospects.filter(p => p.stage === "proposal_drafted").length,
    ready: prospects.filter(p => p.stage === "ready_for_provisioning").length,
  };

  const pipelineSummary = [
    { label: "New Leads", count: pipelineCounts.new, icon: UserPlus },
    { label: "Calls Booked", count: pipelineCounts.booked, icon: Calendar },
    { label: "Proposals Sent", count: pipelineCounts.proposed, icon: FileText },
    { label: "Ready to Provision", count: pipelineCounts.ready, icon: CheckCircle2 },
  ];

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
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
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
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-white/40" /></div>
      ) : prospects.length === 0 ? (
        <Card className="border-0 bg-white/[0.04]">
          <CardContent className="p-8 text-center">
            <p className="text-white/40 text-sm">No prospects yet. Submissions from the booking form will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {prospects.map((p, i) => {
            const stageStyle = stageColors[p.stage] || stageColors.new_submission;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-0 bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.06] transition-colors" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-white font-medium">{p.business_name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${stageStyle.bg} ${stageStyle.text}`}>
                            {stageLabels[p.stage] || p.stage}
                          </span>
                        </div>
                        <p className="text-xs text-white/40">{p.full_name} · {p.email} · {p.source || "Website"}</p>
                        {p.meeting_date && (
                          <p className="text-[10px] text-white/30 mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Meeting: {new Date(p.meeting_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {p.phone && (
                          <a href={`tel:${p.phone}`} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                            <Phone className="h-3.5 w-3.5 text-white/40 hover:text-white" />
                          </a>
                        )}
                        <a href={`mailto:${p.email}`} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                          <Mail className="h-3.5 w-3.5 text-white/40 hover:text-white" />
                        </a>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                              <MoreVertical className="h-3.5 w-3.5 text-white/40" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[hsl(220,35%,12%)] border-white/10 text-white">
                            <DropdownMenuItem className="text-xs hover:bg-white/10" onClick={() => updateStage(p.id, "booking_submitted")}>Mark as Booked</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs hover:bg-white/10" onClick={() => updateStage(p.id, "audit_complete")}>Mark Audit Complete</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs hover:bg-white/10" onClick={() => updateStage(p.id, "proposal_drafted")}>Draft Proposal</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs hover:bg-white/10" onClick={() => updateStage(p.id, "ready_for_provisioning")}>Ready for Provisioning</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs hover:bg-white/10" onClick={() => updateStage(p.id, "provisioned")}>Trigger Provisioning</DropdownMenuItem>
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
      )}
    </div>
  );
}
