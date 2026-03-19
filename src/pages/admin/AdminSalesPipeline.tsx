import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { executeSalesIntake } from "@/lib/salesAutomation";
import {
  Plus, GripVertical, DollarSign, Users, Calendar, FileText,
  CheckCircle2, Target, UserPlus, Briefcase
} from "lucide-react";

const STAGES = [
  { key: "new_lead", label: "New Lead", color: "hsla(211,96%,60%,.6)" },
  { key: "contacted", label: "Contacted", color: "hsla(197,92%,68%,.6)" },
  { key: "booked_meeting", label: "Booked Meeting", color: "hsla(187,70%,58%,.6)" },
  { key: "meeting_completed", label: "Meeting Done", color: "hsla(160,70%,50%,.6)" },
  { key: "qualified", label: "Qualified", color: "hsla(140,60%,50%,.6)" },
  { key: "proposal_drafted", label: "Proposal Draft", color: "hsla(45,90%,55%,.6)" },
  { key: "proposal_sent", label: "Proposal Sent", color: "hsla(30,90%,55%,.6)" },
  { key: "negotiation", label: "Negotiation", color: "hsla(280,60%,60%,.6)" },
  { key: "closed_won", label: "Won", color: "hsla(140,70%,45%,.8)" },
  { key: "closed_lost", label: "Lost", color: "hsla(0,70%,50%,.6)" },
];

const STAGE_LABELS: Record<string, string> = {};
STAGES.forEach(s => { STAGE_LABELS[s.key] = s.label; });

export default function AdminSalesPipeline() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIntake, setShowIntake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    businessName: "", contactName: "", email: "", phone: "",
    website: "", industry: "", location: "", source: "admin_intake",
  });

  const fetchDeals = useCallback(async () => {
    const { data } = await supabase
      .from("crm_deals")
      .select("*, crm_contacts(full_name, email), crm_companies(company_name)")
      .order("created_at", { ascending: false })
      .limit(500);
    setDeals(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const moveDeal = async (dealId: string, stage: string) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, pipeline_stage: stage } : d));
    await supabase.from("crm_deals").update({ pipeline_stage: stage } as any).eq("id", dealId);
    toast.success(`Moved to ${STAGE_LABELS[stage] || stage}`);
  };

  const handleIntake = async () => {
    if (!form.businessName || !form.contactName || !form.email) {
      toast.error("Business name, contact name, and email are required");
      return;
    }
    setSubmitting(true);
    try {
      await executeSalesIntake(form);
      toast.success("Sales intake created");
      setShowIntake(false);
      setForm({ businessName: "", contactName: "", email: "", phone: "", website: "", industry: "", location: "", source: "admin_intake" });
      fetchDeals();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
    setSubmitting(false);
  };

  const totalPipeline = deals
    .filter(d => !["closed_won", "closed_lost"].includes(d.pipeline_stage))
    .reduce((s, d) => s + (Number(d.deal_value) || 0), 0);

  const wonValue = deals
    .filter(d => d.pipeline_stage === "closed_won")
    .reduce((s, d) => s + (Number(d.deal_value) || 0), 0);

  const stats = [
    { label: "Open Pipeline", value: `$${totalPipeline.toLocaleString()}`, icon: DollarSign },
    { label: "Won Revenue", value: `$${wonValue.toLocaleString()}`, icon: CheckCircle2 },
    { label: "Total Deals", value: String(deals.length), icon: Briefcase },
    { label: "Qualified", value: String(deals.filter(d => ["qualified", "proposal_drafted", "proposal_sent", "negotiation"].includes(d.pipeline_stage)).length), icon: Target },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales Pipeline</h1>
          <p className="text-sm text-white/50 mt-1">Lead → Meeting → Proposal → Close</p>
        </div>
        <Button className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white" onClick={() => setShowIntake(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> New Intake
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "hsla(211,96%,60%,.12)" }}>
                  <s.icon className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-[10px] text-white/40">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-2.5 overflow-x-auto pb-4 -mx-2 px-2">
        {STAGES.map(({ key, label, color }) => {
          const stageDeals = deals.filter(d => d.pipeline_stage === key);
          const stageValue = stageDeals.reduce((s, d) => s + (Number(d.deal_value) || 0), 0);
          return (
            <div key={key} className="min-w-[200px] flex-1 flex flex-col"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { const id = e.dataTransfer.getData("dealId"); if (id) moveDeal(id, key); }}>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06]" style={{ borderTopColor: color, borderTopWidth: 2 }}>
                <div className="px-3 py-2 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-white/70">{label}</h3>
                    <span className="text-[10px] text-white/30">{stageDeals.length}</span>
                  </div>
                  {stageValue > 0 && <p className="text-[10px] text-[hsl(var(--nl-sky))]">${stageValue.toLocaleString()}</p>}
                </div>
                <div className="p-1.5 space-y-1.5 min-h-[120px]">
                  {stageDeals.map(deal => (
                    <div key={deal.id} draggable
                      onDragStart={e => e.dataTransfer.setData("dealId", deal.id)}
                      onClick={() => navigate(`/admin/deals/${deal.id}`)}
                      className="p-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] cursor-grab active:cursor-grabbing transition-colors">
                      <p className="text-xs font-medium text-white truncate">{deal.deal_name}</p>
                      <p className="text-[10px] text-white/40 truncate mt-0.5">
                        {deal.crm_companies?.company_name || deal.crm_contacts?.full_name || "—"}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] font-medium text-[hsl(var(--nl-sky))]">
                          ${Number(deal.deal_value || 0).toLocaleString()}
                        </span>
                        <GripVertical className="h-3 w-3 text-white/20" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Intake Dialog */}
      <Dialog open={showIntake} onOpenChange={setShowIntake}>
        <DialogContent className="bg-[hsl(220,35%,10%)] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">New Sales Intake</DialogTitle>
            <DialogDescription className="text-white/50">Create a new lead with contact, company, and deal records.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[
              { k: "businessName", l: "Business Name *", span: true },
              { k: "contactName", l: "Contact Name *" },
              { k: "email", l: "Email *" },
              { k: "phone", l: "Phone" },
              { k: "website", l: "Website" },
              { k: "industry", l: "Industry" },
              { k: "location", l: "Location" },
            ].map(f => (
              <div key={f.k} className={`space-y-1 ${f.span ? "col-span-2" : ""}`}>
                <Label className="text-white/70 text-xs">{f.l}</Label>
                <Input value={(form as any)[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))} className="bg-white/5 border-white/10 text-white h-9 text-sm" />
              </div>
            ))}
          </div>
          <Button className="w-full mt-3 bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))]" onClick={handleIntake} disabled={submitting}>
            {submitting ? "Creating..." : "Create Sales Intake"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
