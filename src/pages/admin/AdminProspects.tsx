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
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    business_name: "", website: "", primary_location: "", business_type: "",
    main_service: "", primary_goal: "", booking_link: "", logo_url: "",
    primary_color: "#3B82F6", secondary_color: "#06B6D4", social_links: "",
    notes: "", full_name: "", email: "", phone: "",
  });

  const setField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

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

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";

  const handleSubmit = async () => {
    if (!form.business_name || !form.full_name || !form.email) {
      toast.error("Business Name, Contact Name, and Email are required");
      return;
    }
    setSubmitting(true);
    try {
      const slug = generateSlug(form.business_name);
      let socialLinksJson = {};
      if (form.social_links.trim()) {
        try { socialLinksJson = JSON.parse(form.social_links); } catch {
          socialLinksJson = { raw: form.social_links };
        }
      }

      // Create prospect
      const { data: prospect, error: pErr } = await supabase.from("prospects").insert({
        business_name: form.business_name,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || null,
        website: form.website || null,
        primary_location: form.primary_location || null,
        business_type: form.business_type || null,
        notes: form.notes || null,
        source: "admin_form",
        stage: "new_submission",
        status: "new_lead",
      }).select().single();

      if (pErr) throw pErr;

      // Create demo build
      const { error: dErr } = await supabase.from("demo_builds").insert({
        business_name: form.business_name,
        website: form.website || null,
        primary_location: form.primary_location || null,
        business_type: form.business_type || null,
        main_service: form.main_service || null,
        primary_goal: form.primary_goal || null,
        booking_link: form.booking_link || null,
        logo_url: form.logo_url || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        social_links: socialLinksJson,
        notes: form.notes || null,
        workspace_slug: slug,
        prospect_id: prospect.id,
        status: "build_in_progress",
      });

      if (dErr) throw dErr;

      toast.success("Prospect created & demo build started");
      setShowForm(false);
      setForm({
        business_name: "", website: "", primary_location: "", business_type: "",
        main_service: "", primary_goal: "", booking_link: "", logo_url: "",
        primary_color: "#3B82F6", secondary_color: "#06B6D4", social_links: "",
        notes: "", full_name: "", email: "", phone: "",
      });
      fetchProspects();
    } catch (err: any) {
      toast.error(err.message || "Failed to create prospect");
    } finally {
      setSubmitting(false);
    }
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
        <Button className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white" onClick={() => setShowForm(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Add Prospect
        </Button>
      </div>

      {/* Add Prospect Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-[hsl(220,35%,10%)] border-white/10 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Pre-Closing App Build Form</DialogTitle>
            <DialogDescription className="text-white/50">Create a new prospect and start a tailored demo build.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-white/70 text-xs">Business Name *</Label>
              <Input value={form.business_name} onChange={e => setField("business_name", e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Contact Name *</Label>
              <Input value={form.full_name} onChange={e => setField("full_name", e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Email *</Label>
              <Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Phone</Label>
              <Input value={form.phone} onChange={e => setField("phone", e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Website</Label>
              <Input value={form.website} onChange={e => setField("website", e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Primary City / Location</Label>
              <Input value={form.primary_location} onChange={e => setField("primary_location", e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Business Type / Industry</Label>
              <Input value={form.business_type} onChange={e => setField("business_type", e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Main Service or Offer</Label>
              <Input value={form.main_service} onChange={e => setField("main_service", e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Primary Goal</Label>
              <Input value={form.primary_goal} onChange={e => setField("primary_goal", e.target.value)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Booking Link</Label>
              <Input value={form.booking_link} onChange={e => setField("booking_link", e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Logo URL</Label>
              <Input value={form.logo_url} onChange={e => setField("logo_url", e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Primary Brand Color</Label>
              <div className="flex gap-2">
                <Input type="color" value={form.primary_color} onChange={e => setField("primary_color", e.target.value)} className="w-10 h-10 p-1 bg-white/5 border-white/10" />
                <Input value={form.primary_color} onChange={e => setField("primary_color", e.target.value)} className="bg-white/5 border-white/10 text-white flex-1" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs">Secondary Brand Color</Label>
              <div className="flex gap-2">
                <Input type="color" value={form.secondary_color} onChange={e => setField("secondary_color", e.target.value)} className="w-10 h-10 p-1 bg-white/5 border-white/10" />
                <Input value={form.secondary_color} onChange={e => setField("secondary_color", e.target.value)} className="bg-white/5 border-white/10 text-white flex-1" />
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-white/70 text-xs">Social Links</Label>
              <Input value={form.social_links} onChange={e => setField("social_links", e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder='Optional — e.g. {"facebook":"url","instagram":"url"}' />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-white/70 text-xs">Notes for Tailoring</Label>
              <Textarea value={form.notes} onChange={e => setField("notes", e.target.value)} className="bg-white/5 border-white/10 text-white min-h-[60px]" placeholder="Optional" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setShowForm(false)} className="text-white/60">Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-[hsl(var(--nl-electric))] hover:bg-[hsl(var(--nl-deep))] text-white">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
              {submitting ? "Creating…" : "Create Prospect & Start Demo Build"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
