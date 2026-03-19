import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { FileCode, Plus, DollarSign, Clock, Edit, Trash2 } from "lucide-react";

export default function AdminProposalTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    template_name: "", proposal_type: "service_proposal", industry_scope: "",
    service_package: "", default_setup_fee: 0, default_monthly_fee: 0, default_contract_term: "12 months",
  });

  const fetch = async () => {
    const { data } = await supabase.from("proposal_templates").select("*").order("created_at");
    setTemplates(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (!form.template_name) { toast.error("Template name required"); return; }
    const { error } = await supabase.from("proposal_templates").insert(form as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Template created");
    setShowForm(false);
    setForm({ template_name: "", proposal_type: "service_proposal", industry_scope: "", service_package: "", default_setup_fee: 0, default_monthly_fee: 0, default_contract_term: "12 months" });
    fetch();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("proposal_templates").update({ is_active: !active } as any).eq("id", id);
    fetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Proposal Templates</h1>
          <p className="text-sm text-white/50 mt-1">Reusable templates for proposal generation</p>
        </div>
        <Button className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Template
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="border-0 bg-white/[0.04] backdrop-blur-sm hover:bg-white/[0.06] transition-colors" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: "hsla(211,96%,60%,.1)" }}>
                    <FileCode className="h-4 w-4 text-[hsl(var(--nl-neon))]" />
                  </div>
                  <Badge className={`text-[9px] ${t.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"}`}>
                    {t.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-white font-medium text-sm">{t.template_name}</p>
                <p className="text-[10px] text-white/40 mt-1">{t.proposal_type?.replace(/_/g, " ")} · {t.service_package || "General"}</p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1 text-[10px] text-white/50">
                    <DollarSign className="h-3 w-3" /> ${Number(t.default_setup_fee || 0).toLocaleString()} setup
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-white/50">
                    <Clock className="h-3 w-3" /> ${Number(t.default_monthly_fee || 0).toLocaleString()}/mo
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="text-[10px] text-[hsl(var(--nl-neon))] hover:underline" onClick={() => toggleActive(t.id, t.is_active)}>
                    {t.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[hsl(220,35%,10%)] border-white/10 text-white max-w-md">
          <DialogHeader><DialogTitle className="text-white">New Proposal Template</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1"><Label className="text-white/70 text-xs">Template Name *</Label><Input value={form.template_name} onChange={e => setForm({ ...form, template_name: e.target.value })} className="bg-white/5 border-white/10 text-white" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-white/70 text-xs">Industry Scope</Label><Input value={form.industry_scope} onChange={e => setForm({ ...form, industry_scope: e.target.value })} className="bg-white/5 border-white/10 text-white" /></div>
              <div className="space-y-1"><Label className="text-white/70 text-xs">Service Package</Label><Input value={form.service_package} onChange={e => setForm({ ...form, service_package: e.target.value })} className="bg-white/5 border-white/10 text-white" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label className="text-white/70 text-xs">Setup Fee</Label><Input type="number" value={form.default_setup_fee} onChange={e => setForm({ ...form, default_setup_fee: Number(e.target.value) })} className="bg-white/5 border-white/10 text-white" /></div>
              <div className="space-y-1"><Label className="text-white/70 text-xs">Monthly Fee</Label><Input type="number" value={form.default_monthly_fee} onChange={e => setForm({ ...form, default_monthly_fee: Number(e.target.value) })} className="bg-white/5 border-white/10 text-white" /></div>
              <div className="space-y-1"><Label className="text-white/70 text-xs">Term</Label><Input value={form.default_contract_term} onChange={e => setForm({ ...form, default_contract_term: e.target.value })} className="bg-white/5 border-white/10 text-white" /></div>
            </div>
            <Button className="w-full bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))]" onClick={handleCreate}>Create Template</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
