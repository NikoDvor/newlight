import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { onDealClosedWon, onDealClosedLost, createProposalDraft } from "@/lib/salesAutomation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Building2, User, DollarSign, Calendar, FileText,
  CheckCircle2, XCircle, Target, Clock, MessageSquare, Plus
} from "lucide-react";

const STAGES = [
  "new_lead", "contacted", "booked_meeting", "meeting_completed",
  "qualified", "proposal_drafted", "proposal_sent", "negotiation",
  "closed_won", "closed_lost",
];
const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead", contacted: "Contacted", booked_meeting: "Booked Meeting",
  meeting_completed: "Meeting Done", qualified: "Qualified", proposal_drafted: "Proposal Draft",
  proposal_sent: "Proposal Sent", negotiation: "Negotiation", closed_won: "Won", closed_lost: "Lost",
};
const QUAL_LABELS: Record<string, string> = {
  unqualified: "Unqualified", needs_review: "Needs Review", qualified: "Qualified",
  proposal_ready: "Proposal Ready", closed_won: "Closed Won", closed_lost: "Closed Lost",
};

export default function AdminDealDetail() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<any>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealId) return;
    Promise.all([
      supabase.from("crm_deals").select("*, crm_contacts(id, full_name, email, phone), crm_companies(id, company_name, website, industry)").eq("id", dealId).single(),
      supabase.from("sales_meetings").select("*").eq("deal_id", dealId).order("start_time", { ascending: false }),
      supabase.from("proposals").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
      supabase.from("crm_tasks").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
      supabase.from("audit_logs").select("*").eq("module", "sales").order("created_at", { ascending: false }).limit(20),
    ]).then(([dRes, mRes, pRes, tRes, aRes]) => {
      setDeal(dRes.data);
      setMeetings(mRes.data || []);
      setProposals(pRes.data || []);
      setTasks(tRes.data || []);
      setActivities(aRes.data || []);
      setLoading(false);
    });
  }, [dealId]);

  if (loading) return <div className="p-8 text-center text-white/40">Loading…</div>;
  if (!deal) return <div className="p-8 text-center text-white/40">Deal not found</div>;

  const moveStage = async (stage: string) => {
    await supabase.from("crm_deals").update({ pipeline_stage: stage } as any).eq("id", deal.id);
    setDeal({ ...deal, pipeline_stage: stage });
    toast.success(`Stage → ${STAGE_LABELS[stage]}`);
  };

  const handleClosedWon = async () => {
    await onDealClosedWon(deal.id, deal);
    setDeal({ ...deal, pipeline_stage: "closed_won", status: "won" });
    toast.success("Deal marked as Won — setup tasks created");
  };

  const handleClosedLost = async () => {
    await onDealClosedLost(deal.id, deal);
    setDeal({ ...deal, pipeline_stage: "closed_lost", status: "lost" });
    toast.success("Deal marked as Lost");
  };

  const handleCreateProposal = async () => {
    const proposal = await createProposalDraft({
      dealId: deal.id,
      contactId: deal.contact_id,
      companyId: deal.company_id,
      title: `Proposal — ${deal.crm_companies?.company_name || deal.deal_name}`,
    });
    if (proposal) {
      toast.success("Proposal draft created");
      navigate(`/admin/proposals/${proposal.id}`);
    }
  };

  const contact = deal.crm_contacts;
  const company = deal.crm_companies;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate("/admin/sales-pipeline")} className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Pipeline
      </button>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{deal.deal_name}</h1>
          <p className="text-sm text-white/40 mt-1">
            {company?.company_name || "No company"} · {contact?.full_name || "No contact"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/10" onClick={handleCreateProposal}>
            <FileText className="h-3.5 w-3.5 mr-1" /> Create Proposal
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleClosedWon}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Won
          </Button>
          <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={handleClosedLost}>
            <XCircle className="h-3.5 w-3.5 mr-1" /> Mark Lost
          </Button>
        </div>
      </div>

      {/* Key Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Value", value: `$${Number(deal.deal_value || 0).toLocaleString()}`, icon: DollarSign },
          { label: "Stage", value: STAGE_LABELS[deal.pipeline_stage] || deal.pipeline_stage, icon: Target },
          { label: "Qualification", value: QUAL_LABELS[deal.qualification_status] || deal.qualification_status || "—", icon: CheckCircle2 },
          { label: "Probability", value: `${deal.close_probability || 0}%`, icon: Clock },
        ].map((s, i) => (
          <Card key={s.label} className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="h-3.5 w-3.5 text-[hsl(var(--nl-sky))]" />
                <span className="text-[10px] text-white/40 uppercase">{s.label}</span>
              </div>
              <p className="text-sm font-semibold text-white">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stage Selector */}
      <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
        <CardContent className="p-4">
          <p className="text-[10px] text-white/40 uppercase mb-2">Move Stage</p>
          <Select value={deal.pipeline_stage} onValueChange={moveStage}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[hsl(220,35%,12%)] border-white/10 text-white">
              {STAGES.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Contact & Company */}
        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Contact & Company</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {contact && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03]">
                <User className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                <div>
                  <p className="text-sm text-white">{contact.full_name}</p>
                  <p className="text-[10px] text-white/40">{contact.email} · {contact.phone || "No phone"}</p>
                </div>
              </div>
            )}
            {company && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03]">
                <Building2 className="h-4 w-4 text-[hsl(var(--nl-sky))]" />
                <div>
                  <p className="text-sm text-white">{company.company_name}</p>
                  <p className="text-[10px] text-white/40">{company.industry || "—"} · {company.website || "—"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meetings */}
        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-white/80">Meetings</CardTitle>
              <Button size="sm" variant="ghost" className="text-[hsl(var(--nl-neon))] text-xs h-7" onClick={() => navigate(`/admin/meetings/new?dealId=${deal.id}`)}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {meetings.length === 0 ? (
              <p className="text-xs text-white/30 py-4 text-center">No meetings yet</p>
            ) : meetings.map(m => (
              <div key={m.id} onClick={() => navigate(`/admin/meetings/${m.id}`)}
                className="p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white font-medium">{m.title}</p>
                  <Badge className="text-[9px] bg-white/10 text-white/60">{m.status}</Badge>
                </div>
                <p className="text-[10px] text-white/30 mt-0.5">{m.start_time ? new Date(m.start_time).toLocaleDateString() : "No date"} · {m.meeting_type}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Proposals */}
        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Proposals</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {proposals.length === 0 ? (
              <p className="text-xs text-white/30 py-4 text-center">No proposals yet</p>
            ) : proposals.map(p => (
              <div key={p.id} onClick={() => navigate(`/admin/proposals/${p.id}`)}
                className="p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] cursor-pointer transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-white font-medium">{p.proposal_title}</p>
                  <Badge className="text-[9px] bg-white/10 text-white/60">{p.proposal_status}</Badge>
                </div>
                <p className="text-[10px] text-white/30 mt-0.5">${Number(p.monthly_fee || 0).toLocaleString()}/mo · {p.contract_term}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card className="border-0 bg-white/[0.04]" style={{ borderColor: "hsla(211,96%,60%,.08)" }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-white/80">Tasks</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {tasks.length === 0 ? (
              <p className="text-xs text-white/30 py-4 text-center">No tasks yet</p>
            ) : tasks.map(t => (
              <div key={t.id} className="p-2.5 rounded-lg bg-white/[0.03] flex items-center justify-between">
                <div>
                  <p className="text-xs text-white font-medium">{t.title}</p>
                  <p className="text-[10px] text-white/30">{t.task_category || "general"} · {t.priority}</p>
                </div>
                <Badge className={`text-[9px] ${t.status === "open" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>{t.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
